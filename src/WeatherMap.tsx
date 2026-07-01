import React, { useMemo } from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { WordCaptions, WordTiming } from './components/WordCaptions';
import { DISPLAY_FONT, SPRINGS, popIn } from './kit/animationPresets';
import { RS_MAP_PATH_D, computeCameraViewBox, projectLatLon, pxToPercent } from './kit/geoProjection';

// ─────────────────────────────────────────────────────────────────────────────
// WeatherMap — PREVISÃO DO TEMPO com mapa estilizado do Rio Grande do Sul.
// Formato pro canal "Pulso do Tempo RS": contorno do estado (SVG estático, gerado
// OFFLINE por scripts/build-rs-map-path.mjs a partir do GeoJSON oficial do IBGE —
// ver src/data/rs-map-path.ts) + cidades pinadas por lat/lon (ícone de clima +
// temperatura) sobre a narração. 9:16 (1080x1920), MESMO molde de props do resto
// do kit (paleta_hex/logo_url/handle por prop, words[] pra legenda, audio_url pra
// narração, duracao_s -> calculateMetadata via weatherMapParaFrames).
//
// Sem lib de mapa (mapbox/leaflet/d3-geo — não tem no package.json): o contorno é
// UM <path> SVG estático (projeção linear equiretangular com correção de cosseno
// de latitude, calculada offline). O runtime só faz aritmética simples
// (projectLatLon) — nada de geo-processing pesado no render headless.
//
// "Câmera": em vez de recalibrar a projeção por vídeo (o que distorceria o
// contorno do estado conforme as cidades passadas), o mapa ENQUADRA a região das
// cidades da vez via viewBox do <svg> (computeCameraViewBox, calculado do bbox
// REAL de props.cidades, com padding) — path e pins vivem no MESMO espaço de
// pixels fixo, então ficam sempre alinhados, e o "zoom" no eixo é só um recorte.
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 30;

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

export type WeatherMapProps = {
  cidades: CidadeClima[];
  words?: WordTiming[]; // legenda karaokê (opcional) — timestamps da narração
  audio_url?: string;
  texto?: string;
  duracao_s: number;
  paleta_hex: string;
  logo_url?: string;
  handle?: string;
  titulo_topo?: string;
  // DESTAQUE por narração: quando o frame atual cai em [inicio_s, fim_s) de uma
  // entrada, o pin da cidade PULSA. Ausente/vazio -> ciclo automático entre todas
  // as cidades (fallback MVP), pra sempre ter alguma leitura de "foco" na tela.
  city_highlights?: CityHighlight[];
};

export const weatherMapParaFrames = (p: { duracao_s?: number }) =>
  Math.max(1, Math.round((p?.duracao_s ?? 20) * FPS));

// 11 cidades reais do eixo Litoral+Serra+Grande Porto Alegre (bbox aprox.
// lat -30.03..-29.17, lon -51.52..-49.68 — a região que dá nome ao "eixo" citado
// no brief). Dados de exemplo pra testar no Studio; em produção o backend manda
// os valores reais (Open-Meteo/INMET) por prop.
export const weatherMapDefaultProps: WeatherMapProps = {
  titulo_topo: 'PREVISÃO RS — LITORAL & SERRA',
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
  // sem city_highlights por default -> demonstra o fallback cíclico (o hook
  // "narração destaca a cidade" já está pronto: basta passar city_highlights).
  city_highlights: undefined,
};

// ── MAPA + PINS ──────────────────────────────────────────────────────────────

const MAP_LEFT = 60;
const MAP_TOP = 210;
const MAP_WIDTH = 960;
const MAP_HEIGHT = 1330;

const CityPin: React.FC<{
  cidade: CidadeClima;
  leftPct: number;
  topPct: number;
  index: number;
  accent: string;
  active: boolean;
}> = ({ cidade, leftPct, topPct, index, accent, active }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const revealDelay = index * 4; // reveal escalonado por cidade
  const { scale: revealScale, opacity } = popIn(frame, fps, revealDelay, 0.3, SPRINGS.soft);
  const pulse = active ? interpolatePulse(frame) : 1;
  const kind = weatherCodeToIcon(cidade.weather_code);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        top: `${topPct}%`,
        transform: `translate(-50%, -100%) scale(${revealScale * pulse})`,
        transformOrigin: 'bottom center',
        opacity,
        zIndex: active ? 40 : 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: active ? 'rgba(6,10,20,0.9)' : 'rgba(6,10,20,0.74)',
          border: `2px solid ${active ? accent : 'rgba(255,255,255,0.32)'}`,
          borderRadius: 16,
          padding: '10px 16px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          minWidth: 110,
          boxShadow: active ? `0 0 26px ${accent}aa, 0 8px 22px rgba(0,0,0,0.5)` : '0 6px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 21, color: '#fff', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
          {cidade.nome}
        </div>
        <WeatherIconView kind={kind} size={40} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 30, color: active ? accent : '#fff' }}>
            {Math.round(cidade.temp_max)}°
          </span>
          {cidade.temp_min != null ? (
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 18, color: 'rgba(255,255,255,0.62)' }}>
              {Math.round(cidade.temp_min)}°
            </span>
          ) : null}
        </div>
        {cidade.aviso ? (
          <div style={{ marginTop: 2, fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 13, color: '#FFB000', textAlign: 'center', maxWidth: 130 }}>
            {cidade.aviso}
          </div>
        ) : null}
      </div>
      {/* dot exatamente na coordenada projetada */}
      <div
        style={{
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: active ? accent : '#fff',
          border: '3px solid rgba(6,10,20,0.92)',
          marginTop: -2,
          boxShadow: active ? `0 0 16px ${accent}` : 'none',
        }}
      />
    </div>
  );
};

// pulso de destaque (loop senoidal) — cresce um pouco enquanto a cidade está "no ar"
const interpolatePulse = (frame: number): number => {
  const t = (frame / 16) * Math.PI * 2;
  return 1 + (Math.sin(t) * 0.5 + 0.5) * 0.14; // 1.0 .. 1.14
};

// ── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export const WeatherMap: React.FC<WeatherMapProps> = (props) => {
  const {
    cidades = [],
    words,
    audio_url,
    texto,
    duracao_s,
    paleta_hex,
    logo_url,
    handle = '@pulsodotemporrs',
    titulo_topo,
    city_highlights,
  } = props;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const currentT = frame / fps;
  const total = durationInFrames;

  const containerAspect = MAP_WIDTH / MAP_HEIGHT;
  const cam = useMemo(
    () => computeCameraViewBox(cidades.map((c) => ({ lat: c.lat, lon: c.lon })), containerAspect, 0.3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(cidades.map((c) => [c.lat, c.lon]))],
  );

  // DESTAQUE: janela explícita (city_highlights) OU ciclo automático entre as
  // cidades ao longo da duração total (fallback MVP — hook pronto pra narração).
  const isActive = (cidade: CidadeClima, idx: number): boolean => {
    if (city_highlights && city_highlights.length) {
      return city_highlights.some((h) => h.cidade === cidade.nome && currentT >= h.inicio_s && currentT < h.fim_s);
    }
    const n = cidades.length || 1;
    const windowDur = (duracao_s || total / fps) / n;
    if (!Number.isFinite(windowDur) || windowDur <= 0) return false;
    const idx2 = Math.min(n - 1, Math.floor(currentT / windowDur));
    return idx2 === idx;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: '#0b1830' }}>
      {/* fundo "céu" suave — tinge com a paleta do tenant, escurece pra baixo (TV-weather) */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(168deg, ${paleta_hex}55 0%, ${paleta_hex}22 32%, #0b1830 78%)`,
        }}
      />

      {/* TÍTULO no topo */}
      {titulo_topo ? (
        <div style={{ position: 'absolute', top: 58, left: 40, right: 40, textAlign: 'center', zIndex: 30 }}>
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 900,
              fontSize: 46,
              color: '#fff',
              letterSpacing: '-0.01em',
              lineHeight: 1.12,
              WebkitTextStroke: '5px #000',
              paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
              textShadow: '0 4px 16px rgba(0,0,0,0.6)',
            }}
          >
            {titulo_topo}
          </div>
          <div style={{ width: 96, height: 5, background: paleta_hex, margin: '14px auto 0', borderRadius: 3, boxShadow: `0 0 14px ${paleta_hex}` }} />
        </div>
      ) : null}

      {/* logo/handle discreto no canto */}
      <div style={{ position: 'absolute', top: 48, left: 44, display: 'flex', alignItems: 'center', gap: 10, zIndex: 32 }}>
        {logo_url ? (
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
            <Img src={resolveSrc(logo_url)} style={{ width: '76%', height: '76%', objectFit: 'contain' }} />
          </div>
        ) : null}
      </div>

      {/* ── MAPA DO RS (SVG estático, gerado offline) + PINS das cidades ── */}
      <div
        style={{
          position: 'absolute',
          left: MAP_LEFT,
          top: MAP_TOP,
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          borderRadius: 32,
          overflow: 'hidden',
          border: '2px solid rgba(255,255,255,0.22)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          background: `radial-gradient(120% 90% at 50% 20%, ${paleta_hex}30 0%, rgba(6,10,20,0.55) 70%)`,
        }}
      >
        <svg
          viewBox={`${cam.minX} ${cam.minY} ${cam.width} ${cam.height}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0 }}
        >
          <path
            d={RS_MAP_PATH_D}
            fill="rgba(255,255,255,0.12)"
            stroke={paleta_hex}
            strokeWidth={5}
            strokeLinejoin="round"
            strokeOpacity={0.9}
          />
        </svg>

        {cidades.map((c, i) => {
          const p = projectLatLon(c.lat, c.lon);
          const { leftPct, topPct } = pxToPercent(p, cam);
          return (
            <CityPin
              key={`${c.nome}-${i}`}
              cidade={c}
              leftPct={leftPct}
              topPct={topPct}
              index={i}
              accent={paleta_hex}
              active={isActive(c, i)}
            />
          );
        })}
      </div>

      {/* legenda karaokê (OPCIONAL) — mesmo motor do CaptionClip/Dossie */}
      {words && words.length ? (
        <WordCaptions words={words} text={texto} durSec={duracao_s} fromSec={0} anchorY={1700} accent={paleta_hex} fontSize={54} maxWordsPerGroup={1} variant="solta" numberPop plate />
      ) : null}

      {/* rodapé — fonte dos dados */}
      <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0, textAlign: 'center', zIndex: 30 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 22, color: 'rgba(255,255,255,0.55)' }}>
          Fonte: INMET/Open-Meteo
        </span>
      </div>

      {/* handle discreto no rodapé */}
      <div style={{ position: 'absolute', bottom: 34, left: 0, right: 0, textAlign: 'center', zIndex: 30 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 24, color: '#fff', opacity: 0.85 }}>{handle}</span>
      </div>

      {/* narração */}
      {audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
    </AbsoluteFill>
  );
};

export default WeatherMap;
