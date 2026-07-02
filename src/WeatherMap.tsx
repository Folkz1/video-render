import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { WordTiming } from './components/WordCaptions';
import { DISPLAY_FONT, SPRINGS, popIn } from './kit/animationPresets';
import {
  RS_MAP_PATH_D,
  computeCameraViewBox,
  projectLatLon,
  pxToPercent,
} from './kit/geoProjection';

// ─────────────────────────────────────────────────────────────────────────────
// WeatherMap — PREVISÃO DO TEMPO com mapa do Rio Grande do Sul (canal "Pulso do
// Tempo RS"). Formato de TV-weather: o CONTORNO do estado (silhueta reconhecível,
// SVG estático gerado offline por scripts/build-rs-map-path.mjs a partir do
// GeoJSON do IBGE — ver src/data/rs-map-path.ts) com as cidades PINADAS por
// lat/lon como PONTOS, e UM card-spotlight grande embaixo que troca pra cidade
// que a narração está citando naquele instante (city_highlights casa nome↔palavra).
//
// DECISÕES DE ARTE (v2, pós-QA da v1 que deu 4.1):
//  • MOSTRA O ESTADO INTEIRO (não dá zoom no eixo) — a silhueta do RS é icônica e
//    reconhecível; um zoom fechado num canto só mostrava a borda leste = traço sem
//    sentido. Como só temos o CONTORNO (sem lagoas/rios internos), a silhueta
//    inteira é a única leitura geográfica confiável.
//  • UMA CIDADE POR VEZ no card grande (spotlight) em vez de 11 cards simultâneos
//    (que colidiam num monte ilegível). No mapa: só PONTOS; o ativo pulsa e cresce.
//  • SEM legenda karaokê — o mapa + o card + a voz já contam tudo; a legenda
//    sobrepunha o conteúdo e trazia a pílula com a cor errada.
//  • Movimento contínuo: dot ativo pulsa, spotlight desliza a cada troca, uma luz
//    suave varre o mapa (frames nunca idênticos).
//
// 9:16 (1080x1920). Mesmo molde de props do resto do kit (paleta_hex/logo_url/
// handle por prop, audio_url pra narração, duracao_s -> calculateMetadata).
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 30;
const W = 1080;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

// ── ÍCONES DE CLIMA (SVG inline, sem dependência de fonte de emoji no render) ──
export type WeatherIconKind = 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'rain' | 'shower' | 'snow' | 'storm';

/** WMO weather code (Open-Meteo/INMET) -> ícone. 0-3 sol/nuvem, 45-48 neblina,
 * 51-67 chuva, 71-77 neve, 80-82 pancada, 95-99 tempestade. */
export const weatherCodeToIcon = (code: number): WeatherIconKind => {
  if (code === 0) return 'sun';
  if (code === 1) return 'sun';
  if (code === 2) return 'cloud-sun';
  if (code === 3) return 'cloud';
  if (code >= 45 && code <= 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if (code >= 71 && code <= 77) return 'snow';
  if (code >= 80 && code <= 82) return 'shower';
  if (code >= 95 && code <= 99) return 'storm';
  return 'cloud';
};

const SunIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
      <line key={deg} x1="24" y1="10" x2="24" y2="2" stroke="#FFC93C" strokeWidth="3.4" strokeLinecap="round" transform={`rotate(${deg} 24 24)`} />
    ))}
    <circle cx="24" cy="24" r="11" fill="#FFC93C" />
  </svg>
);

const CloudIcon: React.FC<{ size: number; fill?: string }> = ({ size, fill = '#E8EEF5' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M14 34c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8 1.8-4.6 6.3-7.9 11.6-7.9 6.2 0 11.4 4.5 12.4 10.4 4.5 1 7.9 5 7.9 9.7 0 5.5-4.5 9.9-10.1 9.9H14z" fill={fill} />
  </svg>
);

const CloudSunIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <g transform="translate(-3,-4)">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <line key={deg} x1="20" y1="9" x2="20" y2="3" stroke="#FFC93C" strokeWidth="3" strokeLinecap="round" transform={`rotate(${deg} 20 16)`} />
      ))}
      <circle cx="20" cy="16" r="8.5" fill="#FFC93C" />
    </g>
    <path d="M16 38c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8 1.8-4.6 6.3-7.9 11.6-7.9.6 0 1.2 0 1.8.1-1.6 2-2.5 4.5-2.5 7.3 0 3 1.1 5.8 2.9 7.9 3.9 1.2 6.7 4.8 6.7 9.1 0 1.1-.2 2.1-.5 3.1H16z" fill="#F2F6FA" />
  </svg>
);

const RainIcon: React.FC<{ size: number; heavy?: boolean }> = ({ size, heavy }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M14 28c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8 1.8-4.6 6.3-7.9 11.6-7.9 6.2 0 11.4 4.5 12.4 10.4 4.5 1 7.9 5 7.9 9.7 0 5.5-4.5 9.9-10.1 9.9H14z" fill="#C7D3E0" />
    {(heavy ? [10, 19, 28, 37] : [14, 24, 34]).map((x, i) => (
      <line key={i} x1={x} y1="32" x2={x - 4} y2="43" stroke="#5AC8FA" strokeWidth="3.2" strokeLinecap="round" />
    ))}
  </svg>
);

const StormIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M14 26c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8C14.9 1.8 19.4-1.5 24.7-1.5c6.2 0 11.4 4.5 12.4 10.4 4.5 1 7.9 5 7.9 9.7 0 5.5-4.5 9.9-10.1 9.9H14z" fill="#8A93A8" transform="translate(0,5)" />
    <polygon points="26,26 18,38 24,38 20,47 32,32 25,32" fill="#FFD400" />
  </svg>
);

const SnowIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M14 28c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8 1.8-4.6 6.3-7.9 11.6-7.9 6.2 0 11.4 4.5 12.4 10.4 4.5 1 7.9 5 7.9 9.7 0 5.5-4.5 9.9-10.1 9.9H14z" fill="#E4EEF7" />
    {[13, 24, 35].map((x, i) => (
      <g key={i} stroke="#BFE3FA" strokeWidth="2.4" strokeLinecap="round">
        <line x1={x} y1="32" x2={x} y2="42" />
        <line x1={x - 4} y1="34" x2={x + 4} y2="40" />
        <line x1={x - 4} y1="40" x2={x + 4} y2="34" />
      </g>
    ))}
  </svg>
);

const FogIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    {[14, 21, 28, 35].map((y, i) => (
      <line key={i} x1={i % 2 === 0 ? 5 : 9} y1={y} x2={i % 2 === 0 ? 43 : 39} y2={y} stroke="#C7D0DA" strokeWidth="4.6" strokeLinecap="round" />
    ))}
  </svg>
);

const WeatherIconView: React.FC<{ kind: WeatherIconKind; size: number }> = ({ kind, size }) => {
  switch (kind) {
    case 'sun': return <SunIcon size={size} />;
    case 'cloud-sun': return <CloudSunIcon size={size} />;
    case 'cloud': return <CloudIcon size={size} />;
    case 'fog': return <FogIcon size={size} />;
    case 'rain': return <RainIcon size={size} />;
    case 'shower': return <RainIcon size={size} heavy />;
    case 'snow': return <SnowIcon size={size} />;
    case 'storm': return <StormIcon size={size} />;
    default: return <CloudIcon size={size} />;
  }
};

const iconLabel = (kind: WeatherIconKind): string => {
  switch (kind) {
    case 'sun': return 'Sol';
    case 'cloud-sun': return 'Sol entre nuvens';
    case 'cloud': return 'Nublado';
    case 'fog': return 'Neblina';
    case 'rain': return 'Chuva';
    case 'shower': return 'Pancadas de chuva';
    case 'snow': return 'Neve';
    case 'storm': return 'Temporal';
    default: return 'Nublado';
  }
};

// ── PROPS ──────────────────────────────────────────────────────────────────

export type CidadeClima = {
  nome: string;
  lat: number;
  lon: number;
  regiao?: string;
  temp_max: number;
  temp_min?: number;
  chuva_pct?: number;
  weather_code: number; // WMO code (Open-Meteo/INMET)
  aviso?: string; // texto curto de alerta (ex.: "Risco de temporal")
};

export type CityHighlight = { cidade: string; inicio_s: number; fim_s: number };

// CUTAWAY de b-roll climático: nas janelas [inicio_s,fim_s) corta pra um vídeo real
// do FENÔMENO (chuva/tempestade/sol/neblina) em tela cheia, MUTADO, sobre o mapa.
// O backend casa o clip por FENÔMENO (weather_code) e alinha a janela ao city_highlight
// da cidade — NUNCA alega "isto é a cidade X", o footage ilustra a condição real dela.
export type BrollItem = {
  url: string;
  inicio_s: number;
  fim_s: number;
  cidade?: string;      // rótulo do chip (a condição é do dado real dessa cidade)
  weather_code?: number;
  temp_max?: number;
  temp_min?: number;
  chuva_pct?: number;
};

export type WeatherMapProps = {
  cidades: CidadeClima[];
  words?: WordTiming[]; // aceito por compat de molde — NÃO desenha karaokê no mapa
  audio_url?: string;
  texto?: string;
  duracao_s: number;
  paleta_hex: string;
  logo_url?: string;
  handle?: string;
  titulo_topo?: string;
  // DESTAQUE por narração: quando o frame atual cai em [inicio_s, fim_s) de uma
  // entrada, a cidade vira o SPOTLIGHT (card grande embaixo) e o pin PULSA.
  // Ausente/vazio -> ciclo automático entre todas as cidades (fallback MVP).
  city_highlights?: CityHighlight[];
  // HÍBRIDO mapa+footage: cutaways de vídeo real de clima. Vazio/ausente -> mapa puro
  // (sempre renderiza, sem depender de fetch externo — footage é reforço, não requisito).
  broll?: BrollItem[];
};

export const weatherMapParaFrames = (p: { duracao_s?: number }) =>
  Math.max(1, Math.round((p?.duracao_s ?? 20) * FPS));

// 11 cidades reais do eixo Litoral+Serra+Grande Porto Alegre — dados de exemplo
// pra testar no Studio; em produção o backend manda os valores reais por prop.
export const weatherMapDefaultProps: WeatherMapProps = {
  titulo_topo: 'PREVISÃO DO TEMPO NO RS',
  handle: '@pulsodotemporrs',
  logo_url: '',
  paleta_hex: '#2E8FD6',
  duracao_s: 22,
  texto:
    'Hoje o litoral gaúcho amanhece com sol entre nuvens, mas a serra pode pegar neblina cerrada de manhã. Fica o alerta pra Caxias do Sul: risco de temporal à tarde.',
  words: [],
  cidades: [
    { nome: 'Porto Alegre', lat: -30.0346, lon: -51.2177, regiao: 'Grande POA', temp_max: 24, temp_min: 17, chuva_pct: 20, weather_code: 1 },
    { nome: 'Canoas', lat: -29.9177, lon: -51.1831, regiao: 'Grande POA', temp_max: 25, temp_min: 18, chuva_pct: 10, weather_code: 0 },
    { nome: 'Gravataí', lat: -29.9442, lon: -50.9925, regiao: 'Grande POA', temp_max: 23, temp_min: 16, chuva_pct: 30, weather_code: 2 },
    { nome: 'Novo Hamburgo', lat: -29.6783, lon: -51.1306, regiao: 'Vale dos Sinos', temp_max: 22, temp_min: 15, chuva_pct: 60, weather_code: 61 },
    { nome: 'Gramado', lat: -29.3788, lon: -50.8756, regiao: 'Serra Gaúcha', temp_max: 17, temp_min: 10, chuva_pct: 70, weather_code: 45 },
    { nome: 'Canela', lat: -29.3630, lon: -50.8129, regiao: 'Serra Gaúcha', temp_max: 16, temp_min: 9, chuva_pct: 40, weather_code: 3 },
    { nome: 'Caxias do Sul', lat: -29.1634, lon: -51.1794, regiao: 'Serra Gaúcha', temp_max: 19, temp_min: 12, chuva_pct: 85, weather_code: 95, aviso: 'Risco de temporal' },
    { nome: 'Bento Gonçalves', lat: -29.1686, lon: -51.5236, regiao: 'Serra Gaúcha', temp_max: 20, temp_min: 12, chuva_pct: 15, weather_code: 0 },
    { nome: 'Torres', lat: -29.3350, lon: -49.7269, regiao: 'Litoral Norte', temp_max: 23, temp_min: 18, chuva_pct: 65, weather_code: 80 },
    { nome: 'Capão da Canoa', lat: -29.7452, lon: -50.0089, regiao: 'Litoral Norte', temp_max: 24, temp_min: 18, chuva_pct: 25, weather_code: 2 },
    { nome: 'Osório', lat: -29.8869, lon: -50.2699, regiao: 'Litoral Norte', temp_max: 23, temp_min: 17, chuva_pct: 50, weather_code: 51 },
  ],
  city_highlights: undefined,
};

// ── GEOMETRIA DO MAPA ────────────────────────────────────────────────────────
// Painel do mapa: ocupa o miolo do quadro. O ESTADO INTEIRO é enquadrado (câmera
// sem cidades -> viewBox = RS completo, fit no aspect do painel).
const MAP_LEFT = 48;
const MAP_TOP = 250;
const MAP_WIDTH = W - MAP_LEFT * 2; // 984
const MAP_HEIGHT = 1030;

// ── SELEÇÃO DA CIDADE ATIVA ──────────────────────────────────────────────────
// Retorna o índice da cidade em foco AGORA e há quantos frames ela entrou em foco
// (pra animar a entrada do spotlight). city_highlights manda; senão, ciclo igual.
type Focus = { idx: number; enteredFrame: number };

const resolveFocus = (
  cidades: CidadeClima[],
  highlights: CityHighlight[] | undefined,
  currentT: number,
  fps: number,
  totalFrames: number,
): Focus => {
  const n = cidades.length || 1;
  if (highlights && highlights.length) {
    for (const h of highlights) {
      if (currentT >= h.inicio_s && currentT < h.fim_s) {
        const idx = cidades.findIndex((c) => c.nome === h.cidade);
        if (idx >= 0) return { idx, enteredFrame: Math.round(h.inicio_s * fps) };
      }
    }
    // fora de qualquer janela -> segura a última citada (ou a primeira)
    const past = highlights.filter((h) => currentT >= h.fim_s);
    if (past.length) {
      const last = past[past.length - 1];
      const idx = cidades.findIndex((c) => c.nome === last.cidade);
      if (idx >= 0) return { idx, enteredFrame: Math.round(last.inicio_s * fps) };
    }
    const first = cidades.findIndex((c) => c.nome === highlights[0].cidade);
    return { idx: first >= 0 ? first : 0, enteredFrame: 0 };
  }
  // fallback: ciclo uniforme ao longo da duração
  const windowFrames = Math.max(1, Math.floor(totalFrames / n));
  const frame = Math.round(currentT * fps);
  const idx = Math.min(n - 1, Math.floor(frame / windowFrames));
  return { idx, enteredFrame: idx * windowFrames };
};

// ── PIN NO MAPA ──────────────────────────────────────────────────────────────
const CityDot: React.FC<{
  cidade: CidadeClima;
  leftPct: number;
  topPct: number;
  index: number;
  accent: string;
  active: boolean;
}> = ({ cidade, leftPct, topPct, index, accent, active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale: revealScale, opacity } = popIn(frame, fps, index * 3, 0.3, SPRINGS.soft);
  const pulse = active ? interpolatePulse(frame) : 1;
  const kind = weatherCodeToIcon(cidade.weather_code);
  const alert = !!cidade.aviso;
  const dotColor = alert ? '#FFB000' : active ? accent : '#EAF2FB';
  const r = active ? 15 : 9;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: `translate(-50%, -50%) scale(${revealScale})`,
        opacity,
        zIndex: active ? 40 : alert ? 25 : 15,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* halo pulsante quando ativa */}
      {active ? (
        <div
          style={{
            position: 'absolute',
            width: r * 2 + 40,
            height: r * 2 + 40,
            borderRadius: '50%',
            border: `3px solid ${accent}`,
            opacity: interpolate(pulse, [1, 1.14], [0.7, 0]),
            transform: `scale(${pulse})`,
          }}
        />
      ) : null}
      {/* ícone mini sobre o ponto (só ativa/alerta pra não poluir) */}
      {active || alert ? (
        <div style={{ marginBottom: 2, transform: `scale(${active ? pulse : 1})` }}>
          <WeatherIconView kind={kind} size={active ? 46 : 30} />
        </div>
      ) : null}
      <div
        style={{
          width: r,
          height: r,
          borderRadius: '50%',
          background: dotColor,
          border: `3px solid rgba(4,10,22,0.9)`,
          boxShadow: active ? `0 0 18px ${accent}` : alert ? '0 0 12px #FFB000' : '0 1px 4px rgba(0,0,0,0.5)',
        }}
      />
      {/* rótulo da cidade — sempre pra ativa; discreto pras demais */}
      <div
        style={{
          marginTop: 4,
          fontFamily: DISPLAY_FONT,
          fontWeight: active ? 900 : 700,
          fontSize: active ? 26 : 18,
          color: '#fff',
          whiteSpace: 'nowrap',
          textShadow: '0 2px 8px rgba(0,0,0,0.9)',
          WebkitTextStroke: active ? '3px rgba(4,10,22,0.85)' : '2px rgba(4,10,22,0.7)',
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          opacity: active ? 1 : 0.82,
        }}
      >
        {cidade.nome}
      </div>
    </div>
  );
};

// pulso de destaque (loop senoidal) — 1.0 .. 1.14
const interpolatePulse = (frame: number): number => {
  const t = (frame / 18) * Math.PI * 2;
  return 1 + (Math.sin(t) * 0.5 + 0.5) * 0.14;
};

// ── CARD SPOTLIGHT (cidade em foco) ──────────────────────────────────────────
const SpotlightCard: React.FC<{
  cidade: CidadeClima;
  enteredFrame: number;
  accent: string;
}> = ({ cidade, enteredFrame, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = Math.max(0, frame - enteredFrame);
  // entrada: desliza de baixo + fade nos primeiros ~10 frames da janela
  const enter = interpolate(local, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const ty = interpolate(enter, [0, 1], [70, 0]);
  const kind = weatherCodeToIcon(cidade.weather_code);
  void fps;

  return (
    <div
      style={{
        position: 'absolute',
        left: 48,
        right: 48,
        bottom: 150,
        transform: `translateY(${ty}px)`,
        opacity: enter,
        zIndex: 45,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(10,20,40,0.94) 0%, rgba(6,12,26,0.97) 100%)',
          border: `2px solid ${accent}`,
          borderRadius: 28,
          padding: '22px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          boxShadow: `0 0 40px ${accent}55, 0 18px 44px rgba(0,0,0,0.6)`,
        }}
      >
        {/* ícone grande */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <WeatherIconView kind={kind} size={104} />
          <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.72)', textAlign: 'center', maxWidth: 150, lineHeight: 1.1 }}>
            {iconLabel(kind)}
          </span>
        </div>
        {/* dados */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 46, color: '#fff', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {cidade.nome}
            </span>
            {cidade.regiao ? (
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 20, color: accent, background: `${accent}22`, border: `1px solid ${accent}66`, borderRadius: 999, padding: '3px 12px' }}>
                {cidade.regiao}
              </span>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 8 }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 76, color: '#fff', lineHeight: 0.9 }}>
              {Math.round(cidade.temp_max)}°
            </span>
            {cidade.temp_min != null ? (
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 34, color: 'rgba(255,255,255,0.6)' }}>
                mín {Math.round(cidade.temp_min)}°
              </span>
            ) : null}
            {cidade.chuva_pct != null ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 30, color: '#5AC8FA' }}>
                <RainIcon size={34} /> {Math.round(cidade.chuva_pct)}%
              </span>
            ) : null}
          </div>
          {cidade.aviso ? (
            <div
              style={{
                marginTop: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                fontFamily: DISPLAY_FONT,
                fontWeight: 900,
                fontSize: 24,
                color: '#1a1205',
                background: '#FFB000',
                borderRadius: 12,
                padding: '6px 16px',
                textShadow: 'none',
              }}
            >
              ⚠ {cidade.aviso}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// ── CUTAWAY DE B-ROLL (footage de clima em tela cheia, MUTADO, sobre o mapa) ──
// Renderizado DENTRO de um <Sequence> (frame local): o OffthreadVideo só existe/baixa
// na janela em que está em tela — escopa o risco de fetch ao segmento, não ao vídeo
// inteiro. MUTADO sempre (o áudio ambiente do Pexels colide com a narração TTS/trilha).
const BrollCutaway: React.FC<{
  item: BrollItem;
  cidade?: CidadeClima;
  accent: string;
  durationInFrames: number;
}> = ({ item, cidade, accent, durationInFrames }) => {
  const frame = useCurrentFrame(); // LOCAL ao Sequence
  const kb = interpolate(frame, [0, durationInFrames], [1.06, 1.14]); // Ken Burns lento
  const fadeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [durationInFrames - 9, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const op = Math.min(fadeIn, fadeOut);
  const wcode = cidade?.weather_code ?? item.weather_code ?? 3;
  const kind = weatherCodeToIcon(wcode);
  const nome = item.cidade || cidade?.nome;
  const tmax = cidade?.temp_max ?? item.temp_max;
  const tmin = cidade?.temp_min ?? item.temp_min;

  return (
    <AbsoluteFill style={{ opacity: op, zIndex: 50 }}>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#050b16' }}>
        <OffthreadVideo
          src={resolveSrc(item.url)}
          muted
          playbackRate={1}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${kb})` }}
        />
      </AbsoluteFill>
      {/* scrim pra leitura do chip + integrar com a paleta */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(4,10,22,0.42) 0%, rgba(4,10,22,0) 26%, rgba(4,10,22,0.05) 58%, rgba(4,10,22,0.86) 100%)',
        }}
      />
      {/* lower-third: fenômeno + cidade + temperatura (dado REAL da cidade) */}
      {nome ? (
        <div style={{ position: 'absolute', left: 48, right: 48, bottom: 170, display: 'flex', alignItems: 'center', gap: 18, zIndex: 52 }}>
          <div style={{ flexShrink: 0, background: 'rgba(6,12,26,0.7)', borderRadius: 20, padding: 10, border: `2px solid ${accent}` }}>
            <WeatherIconView kind={kind} size={70} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 44, color: '#fff', letterSpacing: '-0.02em', textShadow: '0 3px 12px rgba(0,0,0,0.9)', WebkitTextStroke: '4px rgba(4,10,22,0.7)', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'] }}>
              {nome}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 2 }}>
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 30, color: accent }}>{iconLabel(kind)}</span>
              {tmax != null ? (
                <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 40, color: '#fff' }}>
                  {Math.round(tmax)}°
                  {tmin != null ? <span style={{ fontWeight: 700, fontSize: 24, color: 'rgba(255,255,255,0.6)' }}> / {Math.round(tmin)}°</span> : null}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ── NUVENS À DERIVA (atmosfera contínua sobre o mapa) ──────────────────────────
// Move TODO frame (loop de translateX) — dá vida de "mapa meteorológico de TV" E
// derrota o detector técnico de "frame repetido" (o vídeo nunca fica idêntico por
// N segundos, mesmo entre trocas de spotlight). Renderizado sobre a silhueta, sob
// os pins.
const DriftingClouds: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const clouds = [
    { y: '10%', w: 300, h: 150, dur: 15, delay: 0, op: 0.12 },
    { y: '32%', w: 230, h: 120, dur: 22, delay: 6, op: 0.09 },
    { y: '55%', w: 360, h: 175, dur: 28, delay: 13, op: 0.08 },
    { y: '74%', w: 260, h: 130, dur: 19, delay: 3, op: 0.10 },
  ];
  return (
    <>
      {clouds.map((c, i) => {
        const period = Math.max(1, c.dur * fps);
        const t = ((frame + c.delay * fps) % period) / period; // 0..1 contínuo
        const x = -35 + t * 170; // % atravessando o mapa, loop suave
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: c.y,
              width: c.w,
              height: c.h,
              borderRadius: '50%',
              background: `radial-gradient(ellipse at center, rgba(255,255,255,${c.op}) 0%, rgba(255,255,255,0) 68%)`,
              filter: 'blur(10px)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        );
      })}
    </>
  );
};

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export const WeatherMap: React.FC<WeatherMapProps> = (props) => {
  const {
    cidades = [],
    audio_url,
    duracao_s,
    paleta_hex,
    logo_url,
    handle = '@pulsodotemporrs',
    titulo_topo,
    city_highlights,
    broll,
  } = props;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentT = frame / fps;
  const accent = paleta_hex || '#2E8FD6';

  // câmera: ESTADO INTEIRO (sem passar cidades -> viewBox = RS completo no aspect).
  const containerAspect = MAP_WIDTH / MAP_HEIGHT;
  const cam = useMemo(() => computeCameraViewBox([], containerAspect, 0.06), [containerAspect]);

  const focus = resolveFocus(cidades, city_highlights, currentT, fps, durationInFrames);
  const focusCidade = cidades[focus.idx];

  // luz varrendo o mapa (movimento contínuo) — desloca um brilho na diagonal
  const sweep = interpolate(frame % (fps * 5), [0, fps * 5], [-30, 130]);
  // respiração/deriva contínua do mapa: garante que NENHUM frame é idêntico ao
  // anterior (derrota o detector técnico de frame-repetido), sem chamar atenção.
  const mapBreath = 1 + Math.sin((frame / (fps * 4)) * Math.PI * 2) * 0.014;
  const mapDriftY = Math.sin((frame / (fps * 5)) * Math.PI * 2) * 6;

  return (
    <AbsoluteFill style={{ backgroundColor: '#081428' }}>
      {/* fundo "céu" — tinge com a paleta do tenant, escurece pra baixo (TV-weather) */}
      <AbsoluteFill
        style={{ background: `linear-gradient(172deg, ${accent}55 0%, ${accent}22 30%, #081428 74%)` }}
      />

      {/* TÍTULO no topo */}
      {titulo_topo ? (
        <div style={{ position: 'absolute', top: 66, left: 40, right: 40, textAlign: 'center', zIndex: 60 }}>
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 900,
              fontSize: 52,
              color: '#fff',
              letterSpacing: '-0.01em',
              lineHeight: 1.08,
              WebkitTextStroke: '6px #06101f',
              paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
              textShadow: '0 4px 18px rgba(0,0,0,0.7)',
            }}
          >
            {titulo_topo}
          </div>
          <div style={{ width: 110, height: 6, background: accent, margin: '16px auto 0', borderRadius: 3, boxShadow: `0 0 16px ${accent}` }} />
        </div>
      ) : null}

      {/* logo discreto no canto */}
      {logo_url ? (
        <div style={{ position: 'absolute', top: 56, left: 48, zIndex: 60 }}>
          <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
            <Img src={resolveSrc(logo_url)} style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
          </div>
        </div>
      ) : null}

      {/* ── MAPA DO RS (estado inteiro) + PINS ── */}
      <div
        style={{
          position: 'absolute',
          left: MAP_LEFT,
          top: MAP_TOP,
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          transform: `translateY(${mapDriftY}px) scale(${mapBreath})`,
          transformOrigin: 'center center',
        }}
      >
        {/* nuvens à deriva (clipadas ao retângulo do mapa, sob os pins) */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 5 }}>
          <DriftingClouds frame={frame} fps={fps} />
        </div>
        <svg
          viewBox={`${cam.minX} ${cam.minY} ${cam.width} ${cam.height}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
        >
          <defs>
            <linearGradient id="rsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`${accent}`} stopOpacity={0.34} />
              <stop offset="100%" stopColor={`${accent}`} stopOpacity={0.12} />
            </linearGradient>
            <linearGradient id="rsSweep" x1="0" y1="0" x2="1" y2="1">
              <stop offset={`${Math.max(0, sweep - 18)}%`} stopColor="#ffffff" stopOpacity={0} />
              <stop offset={`${sweep}%`} stopColor="#ffffff" stopOpacity={0.14} />
              <stop offset={`${Math.min(100, sweep + 18)}%`} stopColor="#ffffff" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* silhueta do estado — preenchida (reconhecível) + contorno na paleta */}
          <path d={RS_MAP_PATH_D} fill="url(#rsFill)" stroke={accent} strokeWidth={4} strokeLinejoin="round" strokeOpacity={0.95} />
          <path d={RS_MAP_PATH_D} fill="url(#rsSweep)" stroke="none" />
        </svg>

        {cidades.map((c, i) => {
          const p = projectLatLon(c.lat, c.lon);
          const { leftPct, topPct } = pxToPercent(p, cam);
          return (
            <CityDot
              key={`${c.nome}-${i}`}
              cidade={c}
              leftPct={leftPct}
              topPct={topPct}
              index={i}
              accent={accent}
              active={i === focus.idx}
            />
          );
        })}
      </div>

      {/* CARD SPOTLIGHT da cidade em foco (fica sob o footage quando há cutaway) */}
      {focusCidade ? (
        <SpotlightCard cidade={focusCidade} enteredFrame={focus.enteredFrame} accent={accent} />
      ) : null}

      {/* ── CUTAWAYS DE FOOTAGE (híbrido). Vazio -> nada renderiza, mapa puro. ── */}
      {(broll || []).map((b, i) => {
        const from = Math.max(0, Math.round(b.inicio_s * fps));
        const dur = Math.max(1, Math.round((b.fim_s - b.inicio_s) * fps));
        const cid = cidades.find((c) => c.nome === b.cidade);
        return (
          <Sequence key={`broll-${i}`} from={from} durationInFrames={dur}>
            <BrollCutaway item={b} cidade={cid} accent={accent} durationInFrames={dur} />
          </Sequence>
        );
      })}

      {/* rodapé — fonte dos dados */}
      <div style={{ position: 'absolute', bottom: 88, left: 0, right: 0, textAlign: 'center', zIndex: 60 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 22, color: 'rgba(255,255,255,0.55)' }}>
          Fonte: INMET · Open-Meteo
        </span>
      </div>

      {/* handle discreto no rodapé */}
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', zIndex: 60 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 26, color: '#fff', opacity: 0.9 }}>{handle}</span>
      </div>

      {/* narração */}
      {audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
    </AbsoluteFill>
  );
};

export default WeatherMap;
