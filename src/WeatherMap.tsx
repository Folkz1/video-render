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

// ─────────────────────────────────────────────────────────────────────────────
// WeatherMap v3 — PREVISÃO DO TEMPO com MAPA DE SATÉLITE REAL do Rio Grande do Sul
// (canal "Pulso do Tempo RS"). Estilo TV-weather / BaroClima: basemap de satélite
// de verdade (Esri World Imagery — litoral atlântico, Lagoa dos Patos/Mirim,
// estuário do Guaíba, Serra) baixado OFFLINE e servido como staticFile (ZERO fetch
// no render), com cards de ícone + temperatura por cidade projetados por lat/lon
// via WEB MERCATOR (EPSG:3857) exatamente sobre o basemap.
//
// O basemap é SÓ geografia; TODO dado de clima (ícone/temp/chuva) vem da nossa fonte
// oficial (Open-Meteo/INMET via weather_daily). Movimento contínuo (Ken Burns lento
// no satélite) dá cinematografia E derrota o detector técnico de frame-repetido.
//
// Atribuição obrigatória no rodapé: "Esri, Maxar, Earthstar Geographics".
// Projeção validada (6 cidades): Porto Alegre(-30.0346,-51.2177) -> (0.808·W, 0.387·H).
// ─────────────────────────────────────────────────────────────────────────────

const FPS = 30;
const FRAME_W = 1080;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

// ── PROJEÇÃO WEB MERCATOR sobre o basemap Esri (bbox RS: lon[-57.65,-49.69],
// lat[-33.75,-27.08], imageSR=3857). Constantes em metros já resolvidas. ──
const MERC = { xmin: -6417568.644, xmax: -5531465.498, ymin: -3995282.33, ymax: -3133470.252 };
const R = 6378137;
const projRS = (lat: number, lon: number, W: number, H: number): { x: number; y: number } => {
  const mx = (R * lon * Math.PI) / 180;
  const my = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return {
    x: ((mx - MERC.xmin) / (MERC.xmax - MERC.xmin)) * W,
    y: ((MERC.ymax - my) / (MERC.ymax - MERC.ymin)) * H,
  };
};

// ── ÍCONES DE CLIMA (SVG inline) ──
export type WeatherIconKind = 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'rain' | 'shower' | 'snow' | 'storm';

export const weatherCodeToIcon = (code: number): WeatherIconKind => {
  if (code <= 1) return 'sun';
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
const CloudIcon: React.FC<{ size: number; fill?: string }> = ({ size, fill = '#EEF3F8' }) => (
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
    <path d="M16 38c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8 1.8-4.6 6.3-7.9 11.6-7.9.6 0 1.2 0 1.8.1-1.6 2-2.5 4.5-2.5 7.3 0 3 1.1 5.8 2.9 7.9 3.9 1.2 6.7 4.8 6.7 9.1 0 1.1-.2 2.1-.5 3.1H16z" fill="#F4F8FC" />
  </svg>
);
const RainIcon: React.FC<{ size: number; heavy?: boolean }> = ({ size, heavy }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path d="M14 28c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8 1.8-4.6 6.3-7.9 11.6-7.9 6.2 0 11.4 4.5 12.4 10.4 4.5 1 7.9 5 7.9 9.7 0 5.5-4.5 9.9-10.1 9.9H14z" fill="#CBD6E3" />
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
    <path d="M14 28c-5.5 0-10-4.4-10-9.8 0-5.2 4-9.4 9.1-9.8 1.8-4.6 6.3-7.9 11.6-7.9 6.2 0 11.4 4.5 12.4 10.4 4.5 1 7.9 5 7.9 9.7 0 5.5-4.5 9.9-10.1 9.9H14z" fill="#E8F1FA" />
    {[13, 24, 35].map((x, i) => (
      <g key={i} stroke="#BFE3FA" strokeWidth="2.4" strokeLinecap="round">
        <line x1={x} y1="32" x2={x} y2="42" /><line x1={x - 4} y1="34" x2={x + 4} y2="40" /><line x1={x - 4} y1="40" x2={x + 4} y2="34" />
      </g>
    ))}
  </svg>
);
const FogIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    {[14, 21, 28, 35].map((y, i) => (
      <line key={i} x1={i % 2 === 0 ? 5 : 9} y1={y} x2={i % 2 === 0 ? 43 : 39} y2={y} stroke="#CBD3DD" strokeWidth="4.6" strokeLinecap="round" />
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
    case 'shower': return 'Pancadas';
    case 'snow': return 'Neve';
    case 'storm': return 'Temporal';
    default: return 'Nublado';
  }
};

// ── PROPS ──
export type CidadeClima = {
  nome: string; lat: number; lon: number; regiao?: string;
  temp_max: number; temp_min?: number; chuva_pct?: number; weather_code: number; aviso?: string;
};
export type CityHighlight = { cidade: string; inicio_s: number; fim_s: number };
export type BrollItem = {
  url: string; inicio_s: number; fim_s: number; cidade?: string;
  weather_code?: number; temp_max?: number; temp_min?: number; chuva_pct?: number;
};
export type WeatherMapProps = {
  cidades: CidadeClima[];
  words?: WordTiming[];
  audio_url?: string;
  texto?: string;
  duracao_s: number;
  paleta_hex: string;
  logo_url?: string;
  handle?: string;
  titulo_topo?: string;
  data_label?: string;              // ex.: "HOJE • QUI 02/07" (subtítulo do header)
  basemap_url?: string;             // default: staticFile do satélite Esri do RS
  city_highlights?: CityHighlight[];
  broll?: BrollItem[];
};

export const weatherMapParaFrames = (p: { duracao_s?: number }) =>
  Math.max(1, Math.round((p?.duracao_s ?? 20) * FPS));

export const weatherMapDefaultProps: WeatherMapProps = {
  titulo_topo: 'PREVISÃO DO TEMPO',
  data_label: 'RIO GRANDE DO SUL',
  handle: '@pulsodotemporrs',
  logo_url: '',
  paleta_hex: '#0EA5E9',
  duracao_s: 22,
  texto: 'Hoje o litoral gaúcho amanhece com sol entre nuvens; a serra pode pegar neblina de manhã. Atenção pra Caxias do Sul: risco de temporal à tarde.',
  words: [],
  cidades: [
    { nome: 'Porto Alegre', lat: -30.0346, lon: -51.2177, regiao: 'Grande POA', temp_max: 24, temp_min: 17, chuva_pct: 20, weather_code: 1 },
    { nome: 'Caxias do Sul', lat: -29.1634, lon: -51.1794, regiao: 'Serra', temp_max: 19, temp_min: 12, chuva_pct: 85, weather_code: 95, aviso: 'Temporal' },
    { nome: 'Pelotas', lat: -31.7654, lon: -52.3376, regiao: 'Sul', temp_max: 22, temp_min: 14, chuva_pct: 40, weather_code: 61 },
    { nome: 'Santa Maria', lat: -29.6842, lon: -53.8007, regiao: 'Central', temp_max: 26, temp_min: 15, chuva_pct: 10, weather_code: 2 },
    { nome: 'Uruguaiana', lat: -29.7539, lon: -57.0882, regiao: 'Fronteira', temp_max: 28, temp_min: 16, chuva_pct: 5, weather_code: 0 },
    { nome: 'Torres', lat: -29.3311, lon: -49.7267, regiao: 'Litoral', temp_max: 23, temp_min: 18, chuva_pct: 65, weather_code: 80 },
    { nome: 'Passo Fundo', lat: -28.2576, lon: -52.4091, regiao: 'Norte', temp_max: 21, temp_min: 13, chuva_pct: 70, weather_code: 63 },
  ],
  city_highlights: undefined,
  broll: undefined,
};

// ── LAYOUT ──
const HEADER_H = 300;
const MAP_TOP = 300;
const MAP_W = FRAME_W;              // sangra nas laterais (imersivo)
const MAP_H = Math.round(MAP_W / 1.0282); // = 1050 (mantém a proporção do basemap)

// pulso senoidal p/ cidade em foco
const pulseAt = (frame: number): number => 1 + (Math.sin((frame / 16) * Math.PI * 2) * 0.5 + 0.5) * 0.12;

// ── CARD DE CIDADE (BaroClima: ícone + temp máx/mín + nome, com pino no ponto) ──
const CityCard: React.FC<{
  c: CidadeClima; x: number; y: number; index: number; active: boolean; accent: string;
}> = ({ c, x, y, index, active, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale: rs, opacity } = popIn(frame, fps, index * 3, 0.3, SPRINGS.soft);
  const pulse = active ? pulseAt(frame) : 1;
  const kind = weatherCodeToIcon(c.weather_code);
  const alert = !!c.aviso;
  const s = (active ? 1.16 : 1) * rs * pulse;

  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -100%) scale(${s})`, transformOrigin: 'bottom center', opacity, zIndex: active ? 60 : alert ? 40 : 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: active ? 'rgba(8,16,32,0.94)' : 'rgba(8,16,32,0.82)', border: `2px solid ${active ? accent : alert ? '#FFB000' : 'rgba(255,255,255,0.35)'}`, borderRadius: 13, padding: '5px 9px', boxShadow: active ? `0 0 22px ${accent}cc, 0 6px 16px rgba(0,0,0,0.6)` : '0 4px 12px rgba(0,0,0,0.55)' }}>
        <WeatherIconView kind={kind} size={active ? 40 : 30} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
          <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: active ? 26 : 22, color: '#FF6A3D' }}>{Math.round(c.temp_max)}°</span>
          {c.temp_min != null ? <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: active ? 18 : 15, color: '#5AB6FF' }}>{Math.round(c.temp_min)}°</span> : null}
        </div>
      </div>
      <div style={{ marginTop: 2, fontFamily: DISPLAY_FONT, fontWeight: active ? 900 : 800, fontSize: active ? 20 : 16, color: '#fff', whiteSpace: 'nowrap', WebkitTextStroke: '3px rgba(4,10,22,0.92)', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>{c.nome}</div>
      {/* pino no ponto exato */}
      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `10px solid ${active ? accent : '#fff'}`, marginTop: -1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
    </div>
  );
};

// ── SPOTLIGHT da cidade em foco (readout grande embaixo do mapa) ──
const SpotlightBar: React.FC<{ c: CidadeClima; enteredFrame: number; accent: string }> = ({ c, enteredFrame, accent }) => {
  const frame = useCurrentFrame();
  const local = Math.max(0, frame - enteredFrame);
  const enter = interpolate(local, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const kind = weatherCodeToIcon(c.weather_code);
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: MAP_TOP + MAP_H + 24, transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`, opacity: enter, zIndex: 55 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'linear-gradient(180deg, rgba(10,20,40,0.95), rgba(6,12,26,0.97))', border: `2px solid ${accent}`, borderRadius: 24, padding: '18px 24px', boxShadow: `0 0 34px ${accent}55, 0 14px 36px rgba(0,0,0,0.6)` }}>
        <WeatherIconView kind={kind} size={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 40, color: '#fff', letterSpacing: '-0.02em' }}>{c.nome}</span>
            {c.regiao ? <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 18, color: accent, background: `${accent}22`, border: `1px solid ${accent}66`, borderRadius: 999, padding: '2px 10px' }}>{c.regiao}</span> : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 4 }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 58, color: '#FF6A3D', lineHeight: 0.9 }}>{Math.round(c.temp_max)}°</span>
            {c.temp_min != null ? <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 30, color: '#5AB6FF' }}>mín {Math.round(c.temp_min)}°</span> : null}
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 26, color: 'rgba(255,255,255,0.85)' }}>{iconLabel(kind)}</span>
            {c.chuva_pct != null ? <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 24, color: '#5AC8FA' }}>💧{Math.round(c.chuva_pct)}%</span> : null}
          </div>
          {c.aviso ? <div style={{ marginTop: 8, display: 'inline-block', fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 20, color: '#1a1205', background: '#FFB000', borderRadius: 10, padding: '4px 12px' }}>⚠ {c.aviso}</div> : null}
        </div>
      </div>
    </div>
  );
};

// ── CUTAWAY DE B-ROLL (footage MUTADO, sobre o mapa; vazio -> nada) ──
const BrollCutaway: React.FC<{ item: BrollItem; c?: CidadeClima; accent: string; durationInFrames: number }> = ({ item, c, accent, durationInFrames }) => {
  const frame = useCurrentFrame();
  const kb = interpolate(frame, [0, durationInFrames], [1.06, 1.14]);
  const op = Math.min(interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }), interpolate(frame, [durationInFrames - 9, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const kind = weatherCodeToIcon(c?.weather_code ?? item.weather_code ?? 3);
  const nome = item.cidade || c?.nome;
  const tmax = c?.temp_max ?? item.temp_max;
  return (
    <AbsoluteFill style={{ opacity: op, zIndex: 70 }}>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#050b16' }}>
        <OffthreadVideo src={resolveSrc(item.url)} muted playbackRate={1} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${kb})` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,10,22,0.42) 0%, rgba(4,10,22,0) 26%, rgba(4,10,22,0.05) 58%, rgba(4,10,22,0.86) 100%)' }} />
      {nome ? (
        <div style={{ position: 'absolute', left: 48, right: 48, bottom: 190, display: 'flex', alignItems: 'center', gap: 16, zIndex: 72 }}>
          <div style={{ background: 'rgba(6,12,26,0.7)', borderRadius: 18, padding: 10, border: `2px solid ${accent}` }}><WeatherIconView kind={kind} size={64} /></div>
          <div>
            <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 42, color: '#fff', WebkitTextStroke: '4px rgba(4,10,22,0.7)', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'] }}>{nome}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
              <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 28, color: accent }}>{iconLabel(kind)}</span>
              {tmax != null ? <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 38, color: '#fff' }}>{Math.round(tmax)}°</span> : null}
            </div>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// foco: city_highlights manda; senão ciclo uniforme
type Focus = { idx: number; enteredFrame: number };
const resolveFocus = (cidades: CidadeClima[], hl: CityHighlight[] | undefined, t: number, fps: number, total: number): Focus => {
  const n = cidades.length || 1;
  if (hl && hl.length) {
    for (const h of hl) if (t >= h.inicio_s && t < h.fim_s) {
      const i = cidades.findIndex((c) => c.nome === h.cidade); if (i >= 0) return { idx: i, enteredFrame: Math.round(h.inicio_s * fps) };
    }
    const past = hl.filter((h) => t >= h.fim_s);
    if (past.length) { const l = past[past.length - 1]; const i = cidades.findIndex((c) => c.nome === l.cidade); if (i >= 0) return { idx: i, enteredFrame: Math.round(l.inicio_s * fps) }; }
    const f = cidades.findIndex((c) => c.nome === hl[0].cidade); return { idx: f >= 0 ? f : 0, enteredFrame: 0 };
  }
  const wf = Math.max(1, Math.floor(total / n)); const fr = Math.round(t * fps);
  const i = Math.min(n - 1, Math.floor(fr / wf)); return { idx: i, enteredFrame: i * wf };
};

// ── COMPONENTE PRINCIPAL ──
export const WeatherMap: React.FC<WeatherMapProps> = (props) => {
  const { cidades = [], audio_url, duracao_s, paleta_hex, logo_url, handle = '@pulsodotemporrs', titulo_topo, data_label, basemap_url, city_highlights, broll } = props;
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const accent = paleta_hex || '#0EA5E9';
  const basemap = basemap_url && basemap_url.trim() ? basemap_url : staticFile('pulso/rs-basemap.jpg');

  const focus = resolveFocus(cidades, city_highlights, t, fps, durationInFrames);
  const focusCidade = cidades[focus.idx];

  // Ken Burns lento no MAPA INTEIRO (satélite + cards juntos, alinhados): cinema +
  // garante pixel diferente todo frame (derrota frame-repetido). ~5% num ciclo longo.
  const kb = 1 + (Math.sin((frame / (fps * 7)) * Math.PI * 2) * 0.5 + 0.5) * 0.05;
  const panX = Math.sin((frame / (fps * 9)) * Math.PI * 2) * 10;

  const projected = useMemo(() => cidades.map((c) => projRS(c.lat, c.lon, MAP_W, MAP_H)), [JSON.stringify(cidades.map((c) => [c.lat, c.lon]))]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#06101f' }}>
      {/* ── MAPA (satélite + cards) com Ken Burns ── */}
      <div style={{ position: 'absolute', left: 0, top: MAP_TOP, width: MAP_W, height: MAP_H, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${kb}) translateX(${panX}px)`, transformOrigin: 'center center' }}>
          <Img src={basemap} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          {/* leve escurecida pras bordas pro card ler melhor */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 45%, rgba(4,10,22,0.4) 100%)' }} />
          {cidades.map((c, i) => (
            <CityCard key={`${c.nome}-${i}`} c={c} x={projected[i].x} y={projected[i].y} index={i} active={i === focus.idx} accent={accent} />
          ))}
        </div>
      </div>

      {/* ── HEADER (faixa com título + data) ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H, background: `linear-gradient(180deg, ${accent}f0 0%, ${accent}cc 55%, ${accent}00 100%)`, zIndex: 80 }} />
      <div style={{ position: 'absolute', top: 56, left: 44, right: 44, zIndex: 82, display: 'flex', alignItems: 'center', gap: 16 }}>
        {logo_url ? (
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.4)', flexShrink: 0 }}>
            <Img src={resolveSrc(logo_url)} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
          </div>
        ) : null}
        <div>
          <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 50, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.02, textShadow: '0 3px 12px rgba(0,0,0,0.55)' }}>{titulo_topo}</div>
          {data_label ? <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 26, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.04em', marginTop: 2 }}>{data_label}</div> : null}
        </div>
      </div>

      {/* ── SPOTLIGHT da cidade em foco ── */}
      {focusCidade ? <SpotlightBar c={focusCidade} enteredFrame={focus.enteredFrame} accent={accent} /> : null}

      {/* ── CUTAWAYS DE FOOTAGE (híbrido; vazio -> mapa puro) ── */}
      {(broll || []).map((b, i) => {
        const from = Math.max(0, Math.round(b.inicio_s * fps));
        const dur = Math.max(1, Math.round((b.fim_s - b.inicio_s) * fps));
        const c = cidades.find((x) => x.nome === b.cidade);
        return <Sequence key={`broll-${i}`} from={from} durationInFrames={dur}><BrollCutaway item={b} c={c} accent={accent} durationInFrames={dur} /></Sequence>;
      })}

      {/* ── RODAPÉ: fonte + atribuição Esri (obrigatória) + handle ── */}
      <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, textAlign: 'center', zIndex: 80 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 20, color: 'rgba(255,255,255,0.6)' }}>Dados: INMET · Open-Meteo</span>
      </div>
      <div style={{ position: 'absolute', bottom: 40, left: 0, right: 0, textAlign: 'center', zIndex: 80 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 26, color: '#fff', opacity: 0.92 }}>{handle}</span>
      </div>
      <div style={{ position: 'absolute', bottom: 14, left: 0, right: 0, textAlign: 'center', zIndex: 80 }}>
        <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 600, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Imagem: Esri, Maxar, Earthstar Geographics</span>
      </div>

      {audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
    </AbsoluteFill>
  );
};

export default WeatherMap;
