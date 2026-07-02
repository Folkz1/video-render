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

// ── LAYOUT (aproveitamento total do 9:16: header compacto, mapa hero, spotlight,
// ticker de todas as cidades, rodapé — sem espaço morto) ──
const HEADER_H = 216;
const MAP_TOP = 216;
const MAP_W = FRAME_W;              // sangra nas laterais (imersivo)
const MAP_H = Math.round(MAP_W / 1.0282); // = 1050 (mantém a proporção do basemap)
const SPOT_TOP = MAP_TOP + MAP_H + 22;    // ~1288
const TICKER_TOP = SPOT_TOP + 208;        // ~1496

// pulso senoidal p/ cidade em foco
const pulseAt = (frame: number): number => 1 + (Math.sin((frame / 16) * Math.PI * 2) * 0.5 + 0.5) * 0.12;

// half-width aproximado do card (ícone+temp) — usado pro clamp de borda e pro declutter
const CARD_HALF_W = 105;
const CARD_H = 132; // bubble + rótulo + pino

/** Clamp de borda: quanto deslocar o BALÃO pra dentro do mapa (o pino fica no ponto). */
const edgeShift = (x: number): number => Math.min(Math.max(x, CARD_HALF_W + 8), MAP_W - CARD_HALF_W - 8) - x;

// ── CÂMERA REGIONAL (TV de verdade): enquadra o bbox das cidades no painel do mapa.
// Cidades espalhadas -> estado inteiro (s=1). Cidades concentradas (eixo metro) -> zoom
// no eixo (s até ~2.1; o satélite 2048px segura o crop sem pixelar). Pins/cards ficam em
// coordenadas de TELA (tamanho constante); só o basemap é recortado/ampliado.
type Cam = { ox: number; oy: number; s: number };
const computeCam = (pts: { x: number; y: number }[]): Cam => {
  if (!pts.length) return { ox: 0, oy: 0, s: 1 };
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  const PAD = 150;
  minX -= PAD; maxX += PAD; minY -= PAD + 70; maxY += PAD; // +70 no topo (cards ficam acima do ponto)
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);
  const s = Math.min(2.1, Math.max(1, Math.min(MAP_W / bw, MAP_H / bh)));
  const cw = MAP_W / s, ch = MAP_H / s;
  let ox = (minX + maxX) / 2 - cw / 2;
  let oy = (minY + maxY) / 2 - ch / 2;
  ox = Math.min(Math.max(ox, 0), Math.max(0, MAP_W - cw));
  oy = Math.min(Math.max(oy, 0), Math.max(0, MAP_H - ch));
  return { ox, oy, s };
};
const toScreen = (p: { x: number; y: number }, cam: Cam): { x: number; y: number } => ({
  x: (p.x - cam.ox) * cam.s,
  y: (p.y - cam.oy) * cam.s,
});

/** DECLUTTER 3 níveis (metrô POA): 'card' (cheio) > 'label' (ponto+nome+temp) > 'pin'
 * (só ponto). Determinístico e independente do foco (modos estáveis o vídeo todo; a
 * cidade ATIVA sempre vira card por cima). Prioridade: alertas primeiro. */
const LABEL_HALF_W = 88;
const LABEL_H = 42;
const computeModes = (pts: { x: number; y: number }[], cidades: CidadeClima[]): ('card' | 'label' | 'pin')[] => {
  const modes: ('card' | 'label' | 'pin')[] = new Array(pts.length).fill('pin');
  const rects: { x: number; y: number; hw: number; hh: number }[] = [];
  const collides = (x: number, y: number, hw: number, hh: number) =>
    rects.some((r) => Math.abs(r.x - x) < r.hw + hw && Math.abs(r.y - y) < r.hh + hh);
  const order = pts.map((_, i) => i).sort((a, b) => Number(!!cidades[b]?.aviso) - Number(!!cidades[a]?.aviso) || a - b);
  // passada 1: cards cheios onde couber
  for (const i of order) {
    const cx = pts[i].x + edgeShift(pts[i].x);
    const cy = pts[i].y - CARD_H / 2;
    if (!collides(cx, cy, CARD_HALF_W, CARD_H / 2)) {
      modes[i] = 'card';
      rects.push({ x: cx, y: cy, hw: CARD_HALF_W, hh: CARD_H / 2 });
    }
  }
  // passada 2: label compacto onde ainda couber
  for (const i of order) {
    if (modes[i] !== 'pin') continue;
    const cx = pts[i].x;
    const cy = pts[i].y + LABEL_H / 2 + 6; // label fica abaixo do ponto
    if (!collides(cx, cy, LABEL_HALF_W, LABEL_H / 2)) {
      modes[i] = 'label';
      rects.push({ x: cx, y: cy, hw: LABEL_HALF_W, hh: LABEL_H / 2 });
    }
  }
  return modes;
};

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
  const shift = edgeShift(x); // borda: balão desliza pra dentro, pino fica no lugar exato

  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -100%) scale(${s})`, transformOrigin: 'bottom center', opacity, zIndex: active ? 60 : alert ? 40 : 20, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ transform: `translateX(${shift}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: active ? 'rgba(8,16,32,0.94)' : 'rgba(8,16,32,0.82)', border: `2px solid ${active ? accent : alert ? '#FFB000' : 'rgba(255,255,255,0.35)'}`, borderRadius: 13, padding: '5px 9px', boxShadow: active ? `0 0 22px ${accent}cc, 0 6px 16px rgba(0,0,0,0.6)` : '0 4px 12px rgba(0,0,0,0.55)' }}>
          <WeatherIconView kind={kind} size={active ? 40 : 30} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
            <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: active ? 28 : 25, color: '#FF6A3D' }}>{Math.round(c.temp_max)}°</span>
            {c.temp_min != null ? <span style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: active ? 19 : 17, color: '#5AB6FF' }}>{Math.round(c.temp_min)}°</span> : null}
          </div>
        </div>
        <div style={{ marginTop: 2, fontFamily: DISPLAY_FONT, fontWeight: active ? 900 : 800, fontSize: active ? 21 : 18, color: '#fff', whiteSpace: 'nowrap', WebkitTextStroke: '3px rgba(4,10,22,0.92)', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>{alert ? '⚠ ' : ''}{c.nome}</div>
      </div>
      {/* pino no ponto exato (não desloca com o clamp) */}
      <div style={{ width: 0, height: 0, borderLeft: '8px solid transparent', borderRight: '8px solid transparent', borderTop: `13px solid ${active ? accent : alert ? '#FFB000' : '#fff'}`, marginTop: -1, filter: 'drop-shadow(0 0 3px rgba(4,10,22,0.95)) drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }} />
    </div>
  );
};

// ── PONTO COMPACTO (declutter: 'label' = ponto+nome+temp; 'pin' = só o ponto —
// a cidade continua marcada no mapa e os números dela vivem no TICKER) ──
const CityDotMini: React.FC<{ c: CidadeClima; x: number; y: number; index: number; showLabel: boolean }> = ({ c, x, y, index, showLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { scale: rs, opacity } = popIn(frame, fps, index * 3, 0.3, SPRINGS.soft);
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${rs})`, opacity, zIndex: 15, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 11, height: 11, borderRadius: '50%', background: c.aviso ? '#FFB000' : '#fff', border: '3px solid rgba(4,10,22,0.9)', boxShadow: '0 1px 4px rgba(0,0,0,0.6)' }} />
      {showLabel ? (
        <div style={{ marginTop: 2, fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 16, color: '#fff', whiteSpace: 'nowrap', WebkitTextStroke: '2.5px rgba(4,10,22,0.92)', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'] }}>
          {c.aviso ? '⚠ ' : ''}{c.nome} <span style={{ color: '#FFD9A0' }}>{Math.round(c.temp_max)}°</span>
        </div>
      ) : null}
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
    <div style={{ position: 'absolute', left: 40, right: 40, top: SPOT_TOP, transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`, opacity: enter, zIndex: 55 }}>
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

// ── TICKER DE CIDADES (faixa TV-crawl com TODAS as cidades + temp, preenche o
// rodapé do frame e devolve o "mapa cheio de números" que o declutter tira do
// cluster metro; rolagem lenta contínua = movimento constante anti-frame-repetido) ──
const CityTicker: React.FC<{ cidades: CidadeClima[]; accent: string }> = ({ cidades, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!cidades.length) return null;
  const CHIP_W = 300; // largura aproximada por chip (ícone + nome + temps)
  const rowW = cidades.length * CHIP_W;
  const speed = 55; // px/s — rolagem de TV, lenta
  const x = -((frame / fps) * speed) % rowW;
  const chips = (off: number, key: string) => (
    <div key={key} style={{ position: 'absolute', left: off, top: 0, display: 'flex', gap: 0 }}>
      {cidades.map((c, i) => {
        const kind = weatherCodeToIcon(c.weather_code);
        return (
          <div key={`${c.nome}-${i}`} style={{ width: CHIP_W, display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 26 }}>
            <WeatherIconView kind={kind} size={44} />
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 22, color: 'rgba(255,255,255,0.92)', whiteSpace: 'nowrap' }}>{c.aviso ? '⚠ ' : ''}{c.nome}</div>
              <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 26, whiteSpace: 'nowrap' }}>
                <span style={{ color: '#FF6A3D' }}>{Math.round(c.temp_max)}°</span>
                {c.temp_min != null ? <span style={{ color: '#5AB6FF', fontWeight: 800, fontSize: 21 }}> {Math.round(c.temp_min)}°</span> : null}
                {c.chuva_pct != null && c.chuva_pct >= 40 ? <span style={{ color: '#5AC8FA', fontWeight: 800, fontSize: 19 }}> 💧{Math.round(c.chuva_pct)}%</span> : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 40, right: 40, top: TICKER_TOP, height: 108, zIndex: 55 }}>
      <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 17, letterSpacing: '0.14em', color: accent, marginBottom: 6 }}>TEMPERATURAS PELO ESTADO</div>
      <div style={{ position: 'relative', height: 76, overflow: 'hidden', background: 'rgba(8,16,32,0.72)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 18 }}>
        <div style={{ position: 'absolute', top: 12, left: 0, right: 0, height: 56 }}>
          {chips(x, 'a')}
          {chips(x + rowW, 'b')}
          {rowW < 1000 ? chips(x + rowW * 2, 'c') : null}
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
  const { cidades = [], audio_url, paleta_hex, logo_url, handle = '@pulsodotemporrs', titulo_topo, data_label, basemap_url, city_highlights, broll } = props;
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
  // câmera regional: zoom no bbox das cidades (metrô concentrado -> zoom; espalhado -> estado)
  const cam = useMemo(() => computeCam(projected), [projected]);
  const screenPts = useMemo(() => projected.map((p) => toScreen(p, cam)), [projected, cam]);
  // declutter 3 níveis em coordenadas de TELA: card > label > pin; a cidade ATIVA sempre
  // ganha card cheio por cima, seja qual for o modo base.
  const modes = useMemo(() => computeModes(screenPts, cidades), [screenPts, cidades]);

  return (
    <AbsoluteFill style={{ backgroundColor: '#06101f' }}>
      {/* ── MAPA (satélite com câmera regional + cards em coords de tela) com Ken Burns ── */}
      <div style={{ position: 'absolute', left: 0, top: MAP_TOP, width: MAP_W, height: MAP_H, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${kb}) translateX(${panX}px)`, transformOrigin: 'center center' }}>
          {/* basemap recortado pela câmera (crop/zoom no eixo das cidades) */}
          <Img
            src={basemap}
            style={{
              position: 'absolute',
              left: -cam.ox * cam.s,
              top: -cam.oy * cam.s,
              width: MAP_W * cam.s,
              height: MAP_H * cam.s,
            }}
          />
          {/* leve escurecida pras bordas pro card ler melhor */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 45%, rgba(0,0,0,0) 45%, rgba(4,10,22,0.4) 100%)' }} />
          {cidades.map((c, i) => {
            const active = i === focus.idx;
            const pt = screenPts[i];
            if (active || modes[i] === 'card') {
              return <CityCard key={`${c.nome}-${i}`} c={c} x={pt.x} y={pt.y} index={i} active={active} accent={accent} />;
            }
            // label some enquanto o card da cidade ATIVA (overlay temporário) está por
            // cima dele — evita texto atrás do card (ex.: "Gramado" sob o card do NH)
            const ap = screenPts[focus.idx];
            const nearActive = !!ap
              && Math.abs(pt.x - (ap.x + edgeShift(ap.x))) < CARD_HALF_W + LABEL_HALF_W
              && pt.y > ap.y - CARD_H - LABEL_H && pt.y < ap.y + LABEL_H + 14;
            return (
              <CityDotMini key={`${c.nome}-${i}`} c={c} x={pt.x} y={pt.y} index={i} showLabel={modes[i] === 'label' && !nearActive} />
            );
          })}
        </div>
      </div>

      {/* ── HEADER (faixa com título + data) ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_H, background: `linear-gradient(180deg, ${accent}f0 0%, ${accent}cc 55%, ${accent}00 100%)`, zIndex: 80 }} />
      <div style={{ position: 'absolute', top: 42, left: 44, right: 44, zIndex: 82, display: 'flex', alignItems: 'center', gap: 16 }}>
        {logo_url ? (
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.4)', flexShrink: 0 }}>
            <Img src={resolveSrc(logo_url)} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
          </div>
        ) : null}
        <div>
          <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 900, fontSize: 47, color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.0, textShadow: '0 3px 12px rgba(0,0,0,0.55)' }}>{titulo_topo}</div>
          {data_label ? <div style={{ fontFamily: DISPLAY_FONT, fontWeight: 800, fontSize: 24, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.04em', marginTop: 2 }}>{data_label}</div> : null}
        </div>
      </div>

      {/* ── SPOTLIGHT da cidade em foco ── */}
      {focusCidade ? <SpotlightBar c={focusCidade} enteredFrame={focus.enteredFrame} accent={accent} /> : null}

      {/* ── TICKER: todas as cidades + temperaturas (preenche o rodapé, TV-crawl) ── */}
      <CityTicker cidades={cidades} accent={accent} />

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
