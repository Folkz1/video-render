import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// Dossie — formato "DOCUMENTARIO ANIMADO" (faceless + voz real do criador).
// Narracao por cima de um RETRATO escurecido do personagem da vez + cards de
// motion-graphics que constroem a narrativa: ano/quote, timeline, stat gigante,
// banner de tensao, e fecho editorial. Codigo de cor: entidade(azul) / heroi(teal)
// / tensao(coral). 9:16 (vertical) — escala p/ long-form so com mais segmentos.
// Comprovado no canal GuyFolkz (ref Short "O Google tinha o ChatGPT em 2017").

const FPS = 30;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Montserrat, Inter, "Segoe UI", sans-serif';
const MONO = 'JetBrains Mono, Consolas, monospace';

type SegBase = { tipo: string; inicio_s: number; fim_s: number; retrato_url?: string };
export type SegAno = SegBase & { tipo: 'ano'; ano: string; quote?: string; entidade?: string; entidade_sub?: string };
export type SegTimeline = SegBase & { tipo: 'timeline'; itens: { ano: string; label: string; destaque?: boolean }[] };
export type SegStat = SegBase & { tipo: 'stat'; numero: string; label?: string };
export type SegBanner = SegBase & { tipo: 'banner'; texto: string; sub?: string };
export type SegFecho = SegBase & { tipo: 'fecho'; linha1: string; linha2?: string; quote?: string };
export type Segmento = SegAno | SegTimeline | SegStat | SegBanner | SegFecho;

export type DossieProps = {
  segmentos: Segmento[];
  narration_url?: string; // voz real do criador (ou TTS) — data-uri/url
  durTotalSec?: number; // duracao total (override; senao usa o ultimo fim_s)
  paleta?: { entidade?: string; heroi?: string; tensao?: string };
  handle?: string;
  tagline?: string;
  music_url?: string;
};

const DEF_PAL = { entidade: '#3B82F6', heroi: '#2FD4C4', tensao: '#FF5A5F' };

export const dossieParaFrames = (props: DossieProps): number => {
  const last = (props.segmentos ?? []).reduce((m, s) => Math.max(m, s.fim_s ?? 0), 0);
  const sec = props.durTotalSec && props.durTotalSec > 0 ? props.durTotalSec : last || 8;
  return Math.max(1, Math.round((sec + 0.3) * FPS));
};

export const dossieDefaultProps: DossieProps = {
  handle: '@GuyFolkz',
  tagline: 'Automação B2B | IA na Prática',
  paleta: DEF_PAL,
  durTotalSec: 14,
  segmentos: [
    { tipo: 'ano', inicio_s: 0.4, fim_s: 4.5, ano: '2017', quote: 'Attention Is All You Need', entidade: 'Google Brain', entidade_sub: '8 cientistas publicaram o paper' },
    { tipo: 'timeline', inicio_s: 4.5, fim_s: 8, itens: [{ ano: '2017', label: 'Paper' }, { ano: '2018', label: 'GPT-1' }, { ano: '2022', label: 'ChatGPT', destaque: true }] },
    { tipo: 'stat', inicio_s: 8, fim_s: 10.5, numero: '100M', label: 'usuários em 2 meses' },
    { tipo: 'banner', inicio_s: 9, fim_s: 11.5, texto: 'GOOGLE: PARALISADO DE MEDO', sub: 'Medo de errar. De ser cancelado. De soltar algo imperfeito.' },
    { tipo: 'fecho', inicio_s: 11.5, fim_s: 14, linha1: 'Altman não inventou nada.', linha2: 'Ele teve coragem.', quote: 'A diferença entre o fracasso e a revolução é só apertar o botão.' },
  ],
};

// fade-in nos primeiros 0.4s da janela + fade-out nos ultimos 0.3s
const useSegAnim = (inicio_s: number, fim_s: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const inEnd = inicio_s + 0.4;
  const outStart = fim_s - 0.3;
  const opacity = interpolate(t, [inicio_s, inEnd, outStart, fim_s], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const appear = spring({ frame: Math.max(0, frame - Math.round(inicio_s * fps)), fps, config: { damping: 16, mass: 0.7 } });
  return { opacity, appear };
};

// ── RETRATO de fundo (escurecido, Ken Burns lento, vinheta + textura) ──
const RetratoBg: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 240], [1.06, 1.16], { extrapolateRight: 'extend' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {src ? (
        <Img src={resolveSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`, filter: 'brightness(0.34) saturate(0.85) contrast(1.05)' }} />
      ) : null}
      {/* vinheta + escurecimento pesado pro texto respirar */}
      <AbsoluteFill style={{ background: 'radial-gradient(120% 80% at 50% 30%, rgba(5,6,10,0.15) 0%, rgba(5,6,10,0.72) 60%, rgba(5,6,10,0.96) 100%)' }} />
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(5,6,10,0.5) 0%, rgba(5,6,10,0) 30%, rgba(5,6,10,0) 64%, rgba(5,6,10,0.85) 100%)' }} />
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ children: React.ReactNode; accent: string }> = ({ children, accent }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 18px', borderRadius: 999, background: 'rgba(255,255,255,0.06)', border: `1px solid ${accent}55`, color: '#fff', fontFamily: SANS, fontSize: 26, fontWeight: 700 }}>
    {children}
  </span>
);

const AnoCard: React.FC<{ seg: SegAno; pal: typeof DEF_PAL }> = ({ seg, pal }) => {
  const { opacity, appear } = useSegAnim(seg.inicio_s, seg.fim_s);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity }}>
      <div style={{ textAlign: 'center', transform: `translateY(${(1 - appear) * 24}px)`, padding: '0 60px' }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 150, lineHeight: 1, color: pal.entidade, textShadow: `0 0 40px ${pal.entidade}66`, letterSpacing: '-0.02em' }}>{seg.ano}</div>
        {seg.quote ? <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 44, color: '#fff', marginTop: 18, lineHeight: 1.25 }}>{`"${seg.quote}"`}</div> : null}
        {seg.entidade ? <div style={{ marginTop: 26 }}><Chip accent={pal.entidade}><span style={{ display: 'inline-flex', gap: 5 }}><i style={dot('#4285F4')} /><i style={dot('#EA4335')} /><i style={dot('#FBBC05')} /><i style={dot('#34A853')} /></span>{seg.entidade}</Chip></div> : null}
        {seg.entidade_sub ? <div style={{ fontFamily: SANS, fontSize: 27, color: 'rgba(255,255,255,0.66)', marginTop: 18 }}>{seg.entidade_sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};
const dot = (c: string): React.CSSProperties => ({ width: 13, height: 13, borderRadius: '50%', background: c, display: 'inline-block' });

const TimelineCard: React.FC<{ seg: SegTimeline; pal: typeof DEF_PAL }> = ({ seg, pal }) => {
  const { opacity, appear } = useSegAnim(seg.inicio_s, seg.fim_s);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity }}>
      <div style={{ display: 'flex', gap: 26, transform: `translateY(${(1 - appear) * 24}px)`, alignItems: 'flex-end' }}>
        {(seg.itens ?? []).map((it, i) => (
          <div key={i} style={{ textAlign: 'center', padding: it.destaque ? '20px 26px' : '6px 8px', borderRadius: 18, background: it.destaque ? `${pal.heroi}22` : 'transparent', border: it.destaque ? `2px solid ${pal.heroi}` : 'none', boxShadow: it.destaque ? `0 0 28px ${pal.heroi}55` : 'none' }}>
            <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: it.destaque ? 84 : 70, color: it.destaque ? pal.heroi : 'rgba(255,255,255,0.55)', lineHeight: 1 }}>{it.ano}</div>
            <div style={{ fontFamily: SANS, fontSize: 26, color: it.destaque ? '#fff' : 'rgba(255,255,255,0.45)', marginTop: 6, fontWeight: 600 }}>{it.label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const StatCard: React.FC<{ seg: SegStat; pal: typeof DEF_PAL }> = ({ seg, pal }) => {
  const { opacity, appear } = useSegAnim(seg.inicio_s, seg.fim_s);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity }}>
      <div style={{ textAlign: 'center', transform: `scale(${interpolate(appear, [0, 1], [0.7, 1])})` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 200, lineHeight: 1, color: pal.heroi, textShadow: `0 0 50px ${pal.heroi}88` }}>{seg.numero}</div>
        {seg.label ? <div style={{ fontFamily: SANS, fontSize: 36, color: '#fff', marginTop: 12, fontWeight: 700 }}>{seg.label}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

const BannerCard: React.FC<{ seg: SegBanner; pal: typeof DEF_PAL }> = ({ seg, pal }) => {
  const { opacity, appear } = useSegAnim(seg.inicio_s, seg.fim_s);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 360, opacity }}>
      <div style={{ width: '84%', transform: `translateX(${(1 - appear) * -40}px)` }}>
        <div style={{ background: pal.tensao, color: '#fff', fontFamily: SANS, fontWeight: 900, fontSize: 38, padding: '16px 24px', borderRadius: 12, textAlign: 'center', boxShadow: `0 0 34px ${pal.tensao}66` }}>{seg.texto}</div>
        {seg.sub ? <div style={{ fontFamily: SANS, fontSize: 27, color: 'rgba(255,255,255,0.78)', marginTop: 14, textAlign: 'center', lineHeight: 1.35 }}>{seg.sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

const FechoCard: React.FC<{ seg: SegFecho; pal: typeof DEF_PAL; handle?: string; tagline?: string }> = ({ seg, pal, handle, tagline }) => {
  const { opacity, appear } = useSegAnim(seg.inicio_s, seg.fim_s);
  return (
    <AbsoluteFill style={{ background: '#000', alignItems: 'center', justifyContent: 'center', opacity }}>
      <div style={{ textAlign: 'center', padding: '0 70px', transform: `translateY(${(1 - appear) * 20}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 60, color: '#fff', lineHeight: 1.15 }}>{seg.linha1}</div>
        {seg.linha2 ? <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: 60, color: pal.heroi, lineHeight: 1.15, marginTop: 6 }}>{seg.linha2}</div> : null}
        <div style={{ width: 90, height: 2, background: 'rgba(255,255,255,0.25)', margin: '34px auto' }} />
        {seg.quote ? <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 38, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{`"${seg.quote}"`}</div> : null}
        {handle ? <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 44, color: '#fff', marginTop: 44 }}>{handle}</div> : null}
        {tagline ? <div style={{ fontFamily: SANS, fontSize: 24, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>{tagline}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

export const Dossie: React.FC<DossieProps> = (props) => {
  const { segmentos = [], narration_url, paleta, handle = '@GuyFolkz', tagline, music_url } = props;
  const pal = { ...DEF_PAL, ...(paleta || {}) };
  const total = dossieParaFrames(props);

  // spans de retrato: cada segmento com retrato_url vale do seu inicio ate o proximo retrato.
  const retSegs = segmentos.filter((s) => s.retrato_url);
  const retSpans = retSegs.map((s, i) => ({ url: s.retrato_url as string, from: Math.round(s.inicio_s * FPS), to: i + 1 < retSegs.length ? Math.round(retSegs[i + 1].inicio_s * FPS) : total }));
  const firstRetrato = retSegs[0]?.retrato_url || '';

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* fundo: retrato do 1o personagem desde o frame 0; troca nos spans seguintes */}
      <RetratoBg src={firstRetrato} />
      {retSpans.slice(1).map((sp, i) => (
        <Sequence key={`ret${i}`} from={sp.from} durationInFrames={Math.max(1, sp.to - sp.from)}>
          <RetratoBg src={sp.url} />
        </Sequence>
      ))}

      {/* cards por segmento (cada um animado na sua janela) */}
      {segmentos.map((seg, i) => {
        const from = Math.round(seg.inicio_s * FPS);
        const dur = Math.max(1, Math.round((seg.fim_s - seg.inicio_s) * FPS));
        return (
          <Sequence key={`seg${i}`} from={from} durationInFrames={dur} layout="none">
            {seg.tipo === 'ano' ? <AnoCard seg={seg as SegAno} pal={pal} /> : null}
            {seg.tipo === 'timeline' ? <TimelineCard seg={seg as SegTimeline} pal={pal} /> : null}
            {seg.tipo === 'stat' ? <StatCard seg={seg as SegStat} pal={pal} /> : null}
            {seg.tipo === 'banner' ? <BannerCard seg={seg as SegBanner} pal={pal} /> : null}
            {seg.tipo === 'fecho' ? <FechoCard seg={seg as SegFecho} pal={pal} handle={handle} tagline={tagline} /> : null}
          </Sequence>
        );
      })}

      {/* branding watermark */}
      <div style={{ position: 'absolute', left: 28, bottom: 26, display: 'flex', alignItems: 'center', gap: 10, zIndex: 50 }}>
        <span style={{ background: pal.tensao, color: '#fff', fontFamily: SANS, fontWeight: 900, fontSize: 18, padding: '3px 8px', borderRadius: 5 }}>DIEGO</span>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontFamily: SANS, fontSize: 18, fontWeight: 600 }}>{handle}</span>
      </div>

      {/* audio: narracao (voz real) + trilha opcional baixa */}
      {narration_url ? <Audio src={resolveSrc(narration_url)} volume={1} /> : null}
      {music_url ? <Audio src={resolveSrc(music_url)} volume={0.08} loop /> : null}
    </AbsoluteFill>
  );
};
