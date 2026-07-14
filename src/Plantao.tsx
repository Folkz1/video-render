import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { WordCaptions, WordTiming } from './components/WordCaptions';

// Plantao — formato PLANTÃO GuyFolkz (news híbrido de lançamento). UMA composition,
// renderizada em 2 geometrias (16:9 = 1920x1080 YouTube; 9:16 = 1080x1920 TikTok/IG). O
// backend (plantao_montador) manda width/height/orientation nas props; o resto é o MESMO EDL.
//
// A timeline INTERCALA dois tipos de segmento (montador E5 / contrato-plantao-edl.md):
//   - vo   → LOCUÇÃO da voz clonada (TTS): fundo paleta + b-roll (Diretor entidade→asset)
//            quando houver + título grande + karaokê word-level + <Audio> do mp3 narrado.
//   - clip → CORTE REAL do apresentador (Diego), <OffthreadVideo> com áudio nativo. No
//            portrait reenquadra pelo focusY (padrão VerticalLong creator_focus_y) pra não
//            cortar o rosto (clipe 16:9 dentro de um canvas 9:16).
//
// Cada segmento vira um <Sequence from={frameAcumulado} durationInFrames={round(durSec*fps)}>.
// Limpo e profissional: fonte grande, alto contraste, karaokê. NÃO barroco.

const FPS = 30;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export type Broll = {
  assetUrl?: string; // imagem OU vídeo do acervo/entidade
  startSec?: number; // início relativo ao segmento VO
  durSec?: number;
  label?: string; // etiqueta (ex: "OpenAI", "SWE-bench")
};

export type VoSegment = {
  type: 'vo';
  audioUrl?: string; // mp3 da narração (URL pública; NUNCA data-uri — props enxutas)
  durSec: number; // = words[-1].end
  words?: WordTiming[]; // karaokê word-level do TTS
  texto?: string; // fallback da legenda quando words vazio
  title?: string; // título grande opcional
  broll?: Broll[]; // b-roll resolvido pelas entidades citadas
};

export type ClipSegment = {
  type: 'clip';
  videoUrl: string; // {render_base}/api/v1/bank/{key}/video
  durSec: number; // clip.duration_s
  focusY?: number; // 0..1 object-position vertical (portrait reframe; default 0.5)
  caption?: string; // legenda pequena opcional
};

export type Segment = VoSegment | ClipSegment;

export type PlantaoProps = {
  orientation?: 'landscape' | 'portrait';
  width?: number;
  height?: number;
  fps?: number;
  paleta?: string[]; // [fundo, destaque, texto]
  handle?: string;
  logoUrl?: string;
  lowerThird?: string; // etiqueta fixa (ex: "PLANTÃO")
  segments: Segment[];
};

const DEFAULT_PALETA = ['#0A0F1C', '#12E29A', '#FFFFFF'];

export const plantaoDefaultProps: PlantaoProps = {
  orientation: 'landscape',
  width: 1920,
  height: 1080,
  fps: 30,
  paleta: DEFAULT_PALETA,
  handle: '@guyfolkz',
  logoUrl: '',
  lowerThird: 'PLANTÃO',
  segments: [
    {
      type: 'vo',
      audioUrl: '',
      durSec: 6,
      words: [],
      texto: 'Saiu o modelo novo. Trinta por cento mais barato e mais rápido no benchmark de código.',
      title: 'O QUE ACONTECEU',
      broll: [{ assetUrl: 'https://picsum.photos/1280/720?11', startSec: 1, durSec: 4, label: 'LANÇAMENTO' }],
    },
    { type: 'clip', videoUrl: '', durSec: 4, focusY: 0.42, caption: '' },
    {
      type: 'vo',
      audioUrl: '',
      durSec: 6,
      words: [],
      texto: 'Mas tem um detalhe que ninguém está comentando — e muda o que vale a pena pra ti.',
      title: 'NA PRÁTICA',
      broll: [],
    },
  ],
};

export const PlantaoParaFrames = (p: PlantaoProps): number => {
  const fps = p?.fps ?? FPS;
  const segs = p?.segments ?? [];
  const total = segs.reduce((acc, s) => acc + Math.max(1, Math.round((s?.durSec ?? 1) * fps)), 0);
  return Math.max(1, total);
};

// ─────────────────────────── B-roll (dentro de um VO) ───────────────────────────
const BrollWindow: React.FC<{ item: Broll; accent: string; portrait: boolean }> = ({ item, accent, portrait }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const op = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, durationInFrames], [1.03, 1.1], { extrapolateRight: 'clamp' });
  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(item.assetUrl || '');
  const src = resolveSrc(item.assetUrl);
  // b-roll ocupa a metade/terço superior; a legenda karaokê fica embaixo (lower-third).
  const frameStyle: React.CSSProperties = portrait
    ? { position: 'absolute', top: 190, left: 60, right: 60, height: 900 }
    : { position: 'absolute', top: 70, left: 90, right: 90, bottom: 260 };
  return (
    <AbsoluteFill style={{ opacity: op, zIndex: 20 }}>
      <div style={{ ...frameStyle, overflow: 'hidden', borderRadius: 18, backgroundColor: '#05060a', border: `4px solid ${accent}`, boxShadow: `0 20px 60px rgba(0,0,0,0.5), inset 0 0 40px ${accent}22` }}>
        {src ? (
          isVideo ? (
            <OffthreadVideo src={src} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }} />
          ) : (
            <>
              <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(28px) brightness(0.45)', transform: `scale(${(scale + 0.08).toFixed(4)})` }} />
              <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', transform: `scale(${scale})` }} />
            </>
          )
        ) : null}
      </div>
      {item.label ? (
        <div style={{ ...(portrait ? { top: 220, left: 90 } : { top: 100, left: 120 }), position: 'absolute', padding: '8px 20px', borderRadius: 8, background: 'rgba(5,6,10,0.82)', border: `2px solid ${accent}`, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: portrait ? 30 : 26, letterSpacing: 2, textTransform: 'uppercase', zIndex: 25 }}>
          {item.label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ─────────────────────────── Título grande do VO ───────────────────────────
const VoTitle: React.FC<{ text: string; accent: string; textColor: string; portrait: boolean }> = ({ text, accent, textColor, portrait }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.9, 1]);
  const op = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', ...(portrait ? { top: 96, left: 60, right: 60 } : { top: 44, left: 90, right: 90 }), zIndex: 30, opacity: op, transform: `scale(${scale})`, transformOrigin: 'left center' }}>
      <div style={{ display: 'inline-block', background: 'rgba(6,8,12,0.82)', border: `3px solid ${accent}`, borderRadius: 12, padding: portrait ? '10px 26px' : '8px 22px' }}>
        <span style={{ fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: portrait ? 52 : 46, color: textColor, letterSpacing: 1, textTransform: 'uppercase' }}>{text}</span>
      </div>
    </div>
  );
};

// ─────────────────────────── Segmento VO ───────────────────────────
const VoScene: React.FC<{ seg: VoSegment; paleta: string[]; portrait: boolean; width: number; height: number }> = ({ seg, paleta, portrait, width, height }) => {
  const [bg, accent, textColor] = [paleta?.[0] ?? DEFAULT_PALETA[0], paleta?.[1] ?? DEFAULT_PALETA[1], paleta?.[2] ?? DEFAULT_PALETA[2]];
  const anchorY = portrait ? height - 320 : height - 150;
  const fontSize = portrait ? 80 : 60;
  const maxWidth = portrait ? 900 : 1500;
  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* leve textura de fundo (radial) pra não ser chapado */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${accent}18 0%, transparent 60%)` }} />

      {seg.title ? <VoTitle text={seg.title} accent={accent} textColor={textColor} portrait={portrait} /> : null}

      {(seg.broll ?? []).map((b, i) => {
        const from = Math.max(0, Math.round((b.startSec ?? 0) * FPS));
        const durFrames = Math.max(1, Math.round((b.durSec ?? seg.durSec) * FPS));
        return (
          <Sequence key={`br${i}`} from={from} durationInFrames={durFrames}>
            <BrollWindow item={b} accent={accent} portrait={portrait} />
          </Sequence>
        );
      })}

      {/* gradiente de legibilidade na base (área da legenda) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(4,6,10,0.9) 100%)', zIndex: 35 }} />

      {(seg.words && seg.words.length > 0) || seg.texto ? (
        <WordCaptions
          words={seg.words}
          text={seg.texto}
          durSec={seg.durSec}
          fromSec={0}
          anchorY={anchorY}
          accent={accent}
          fontSize={fontSize}
          maxWidth={maxWidth}
          maxWordsPerGroup={1}
          variant="solta"
          plate
          numberPop
        />
      ) : null}

      {seg.audioUrl ? <Audio src={resolveSrc(seg.audioUrl)} /> : null}
    </AbsoluteFill>
  );
};

// ─────────────────────────── Enquadramento dinâmico do clipe (jump-cuts) ───────────────────────────
const CLIP_FRAMING: { scale: number; ox: number }[] = [
  { scale: 1.0, ox: 50 },
  { scale: 1.06, ox: 50 },
  { scale: 1.03, ox: 47 },
  { scale: 1.08, ox: 53 },
];
const CLIP_BEAT_SEC = 3.2;

// ─────────────────────────── Segmento CLIP (corte real do Diego) ───────────────────────────
const ClipScene: React.FC<{ seg: ClipSegment; paleta: string[]; portrait: boolean }> = ({ seg, paleta, portrait }) => {
  const frame = useCurrentFrame();
  const accent = paleta?.[1] ?? DEFAULT_PALETA[1];
  const focusY = typeof seg.focusY === 'number' ? seg.focusY : 0.5;
  const beatLen = Math.max(1, Math.round(CLIP_BEAT_SEC * FPS));
  const idx = Math.floor(frame / beatLen);
  const f = CLIP_FRAMING[idx % CLIP_FRAMING.length];
  const local = frame - idx * beatLen;
  const punch = interpolate(local, [0, beatLen], [1, 1.015], { extrapolateRight: 'clamp' });
  const scale = f.scale * punch;
  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      <OffthreadVideo
        src={resolveSrc(seg.videoUrl)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          // portrait: reenquadra pelo focusY (clipe 16:9 num canvas 9:16 → evita cortar o rosto).
          objectPosition: `${f.ox}% ${Math.round(focusY * 100)}%`,
          transform: `scale(${scale.toFixed(4)})`,
          transformOrigin: `${f.ox}% ${Math.round(focusY * 100)}%`,
        }}
      />
      {/* moldura sutil pra casar com o VO (identidade do formato) */}
      <AbsoluteFill style={{ border: `4px solid ${accent}`, boxShadow: `inset 0 0 60px ${accent}22`, pointerEvents: 'none' }} />
      {seg.caption ? (
        <div style={{ position: 'absolute', bottom: portrait ? 180 : 90, left: 0, right: 0, textAlign: 'center', zIndex: 40 }}>
          <span style={{ display: 'inline-block', background: 'rgba(8,10,16,0.82)', border: `2px solid ${accent}`, borderRadius: 12, padding: '8px 24px', color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: portrait ? 40 : 34 }}>
            {seg.caption}
          </span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ─────────────────────────── Branding fixo (logo + handle + lowerThird) ───────────────────────────
const Branding: React.FC<{ handle: string; logoUrl: string; lowerThird: string; accent: string; portrait: boolean }> = ({ handle, logoUrl, lowerThird, accent, portrait }) => {
  return (
    <>
      <div style={{ position: 'absolute', top: portrait ? 40 : 30, right: portrait ? 48 : 60, zIndex: 60, display: 'flex', alignItems: 'center', gap: 12 }}>
        {logoUrl ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: '5px 10px', display: 'flex', alignItems: 'center' }}>
            <Img src={resolveSrc(logoUrl)} style={{ height: portrait ? 40 : 34, width: 'auto', objectFit: 'contain' }} />
          </div>
        ) : null}
        {handle ? (
          <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: portrait ? 28 : 24, textShadow: '0 2px 10px rgba(0,0,0,0.85)' }}>{handle}</span>
        ) : null}
      </div>
      {lowerThird ? (
        <div style={{ position: 'absolute', top: portrait ? 40 : 30, left: portrait ? 48 : 60, zIndex: 60, background: accent, borderRadius: 8, padding: portrait ? '6px 18px' : '5px 14px' }}>
          <span style={{ color: '#05060a', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: portrait ? 28 : 24, letterSpacing: 2, textTransform: 'uppercase' }}>{lowerThird}</span>
        </div>
      ) : null}
    </>
  );
};

export const Plantao: React.FC<PlantaoProps> = (props) => {
  const { width, height } = useVideoConfig();
  const paleta = props.paleta ?? DEFAULT_PALETA;
  const accent = paleta?.[1] ?? DEFAULT_PALETA[1];
  const portrait = (props.orientation ?? (height > width ? 'portrait' : 'landscape')) === 'portrait';
  const segments = props.segments ?? [];

  let acc = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: paleta?.[0] ?? DEFAULT_PALETA[0] }}>
      {segments.map((seg, i) => {
        const from = acc;
        const durFrames = Math.max(1, Math.round((seg.durSec ?? 1) * FPS));
        acc += durFrames;
        return (
          <Sequence key={`seg${i}`} from={from} durationInFrames={durFrames}>
            {seg.type === 'clip' ? (
              <ClipScene seg={seg as ClipSegment} paleta={paleta} portrait={portrait} />
            ) : (
              <VoScene seg={seg as VoSegment} paleta={paleta} portrait={portrait} width={width} height={height} />
            )}
          </Sequence>
        );
      })}

      {/* branding acompanha todo o vídeo (por cima dos segmentos) */}
      <Branding handle={props.handle ?? ''} logoUrl={props.logoUrl ?? ''} lowerThird={props.lowerThird ?? ''} accent={accent} portrait={portrait} />
    </AbsoluteFill>
  );
};
