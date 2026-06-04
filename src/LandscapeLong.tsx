import React from 'react';
import {
  AbsoluteFill,
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

// LandscapeLong — composition 16:9 (1920x1080) pro formato de vídeo LONGO (YouTube, 10min+)
// do Creative-Autopost. Plano base = gravação HORIZONTAL do criador em FULLSCREEN com áudio
// real (OffthreadVideo). Por cima: cold-open com a tese, marcadores de capítulo (ChapterTitle
// reusado do VideoLongBase), cutaways de b-roll temporários, legenda karaokê word-level no
// rodapé (WordCaptions reusado) e handle discreto no canto. Genérico por paleta/handle.

const FPS = 30;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type { WordTiming };

export type LandscapeLongProps = {
  creatorVideoUrl: string; // gravação horizontal do criador (fullscreen, áudio real)
  creatorLiveAudio?: boolean; // default true (toca o áudio do vídeo)
  words: WordTiming[]; // transcrição absoluta (legenda karaokê, cobre o vídeo todo)
  capitulos: { titulo: string; startSec: number }[]; // lower-third/ChapterTitle nos pontos
  cutaways: {
    startSec: number;
    durSec: number;
    videoUrl?: string;
    imageUrl?: string;
    label?: string;
  }[]; // b-roll por cima
  paleta?: string[]; // [fundo, destaque, texto]
  handle?: string; // ex "@GuyFolks" no canto
  faixaTese?: string; // título/tese opcional no cold-open
  durTotalSec: number; // duração total (define durationInFrames = durTotalSec*30)
};

const DEFAULT_PALETA = ['#0A0F1C', '#00E5FF', '#FFFFFF'];

export const landscapeLongDefaultProps: LandscapeLongProps = {
  creatorVideoUrl: '2026-03-07_17-20-29_limpo.mp4',
  creatorLiveAudio: true,
  words: [],
  capitulos: [
    { titulo: 'O Problema', startSec: 2 },
    { titulo: 'A Virada', startSec: 8 },
  ],
  cutaways: [{ startSec: 5, durSec: 3, imageUrl: 'https://picsum.photos/1920/1080?7', label: 'EXEMPLO' }],
  paleta: DEFAULT_PALETA,
  handle: '@GuyFolkz',
  faixaTese: 'A IA é descentralização — e ninguém te contou.',
  durTotalSec: 14,
};

export const landscapeLongParaFrames = (durTotalSec: number) =>
  Math.max(1, Math.round((durTotalSec ?? 1) * FPS));

// ── Cold open: tese sobreposta nos primeiros ~3s, com fade out ──────────────
const ColdOpenTitle: React.FC<{ text: string; accent: string; textColor: string }> = ({
  text,
  accent,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  // entra 0-12, segura, some 75-90 (~3s a 30fps)
  const opacity = interpolate(frame, [0, 12, 75, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const lineWidth = interpolate(frame, [6, 36], [0, 520], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        opacity,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)',
        zIndex: 70,
      }}
    >
      <div
        style={{
          width: lineWidth,
          height: 4,
          background: accent,
          borderRadius: 2,
          marginBottom: 28,
          boxShadow: `0 0 22px ${accent}`,
        }}
      />
      <div
        style={{
          maxWidth: 1400,
          textAlign: 'center',
          fontFamily: 'Montserrat, Poppins, Inter, Segoe UI, sans-serif',
          fontWeight: 900,
          fontSize: 72,
          lineHeight: 1.08,
          color: textColor,
          transform: `scale(${scale})`,
          textShadow: '0 4px 22px rgba(0,0,0,0.7)',
          padding: '0 60px',
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
};

// ── Marcador de capítulo: lower-third entrando no startSec (3-4s na tela) ───
const ChapterMarker: React.FC<{ titulo: string; number: number; accent: string; textColor: string }> = ({
  titulo,
  number,
  accent,
  textColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15, mass: 0.5 } });
  const slideX = interpolate(s, [0, 1], [-80, 0]);
  // visível ~3.5s (105 frames): in 0-12, out 90-105
  const opacity = interpolate(frame, [0, 12, 90, 105], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 150,
        left: 70,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        opacity,
        transform: `translateX(${slideX}px)`,
        zIndex: 65,
      }}
    >
      <div
        style={{
          fontFamily: 'Montserrat, Inter, sans-serif',
          fontWeight: 900,
          fontSize: 56,
          color: accent,
          textShadow: `0 0 18px ${accent}`,
        }}
      >
        {String(number).padStart(2, '0')}
      </div>
      <div style={{ width: 4, height: 56, background: accent, borderRadius: 2 }} />
      <div
        style={{
          fontFamily: 'Montserrat, Inter, sans-serif',
          fontWeight: 800,
          fontSize: 40,
          color: textColor,
          textTransform: 'uppercase',
          letterSpacing: 2,
          textShadow: '0 3px 14px rgba(0,0,0,0.6)',
        }}
      >
        {titulo}
      </div>
    </div>
  );
};

// ── Cutaway: b-roll cobrindo a tela por cima do criador, com entrada/saída suave ──
const Cutaway: React.FC<{
  videoUrl?: string;
  imageUrl?: string;
  label?: string;
  durFrames: number;
  accent: string;
}> = ({ videoUrl, imageUrl, label, durFrames, accent }) => {
  const frame = useCurrentFrame();
  // fade/scale de entrada (0-10) e saída (durFrames-10..durFrames)
  const opacity = interpolate(frame, [0, 10, durFrames - 10, durFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const scale = interpolate(frame, [0, 10], [1.06, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity, zIndex: 30 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          backgroundColor: '#05060a',
          transform: `scale(${scale})`,
        }}
      >
        {videoUrl ? (
          <OffthreadVideo
            src={resolveSrc(videoUrl)}
            muted
            loop
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : imageUrl ? (
          <Img src={resolveSrc(imageUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : null}
        {/* vinheta sutil pra integrar com o plano base */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, transparent 55%, rgba(5,6,10,0.45) 100%)',
          }}
        />
        {/* moldura neon discreta — sinaliza "insert" por cima do criador */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            border: `4px solid ${accent}`,
            boxShadow: `inset 0 0 40px ${accent}55`,
            pointerEvents: 'none',
          }}
        />
      </div>
      {label ? (
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 60,
            padding: '10px 22px',
            borderRadius: 8,
            background: 'rgba(5,6,10,0.78)',
            border: `2px solid ${accent}`,
            color: '#fff',
            fontFamily: 'Montserrat, Inter, sans-serif',
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const LandscapeLong: React.FC<LandscapeLongProps> = (props) => {
  const {
    creatorVideoUrl,
    creatorLiveAudio = true,
    words,
    capitulos,
    cutaways,
    paleta,
    handle,
    faixaTese,
    durTotalSec,
  } = props;

  const [bg, accent, textColor] = [
    paleta?.[0] ?? DEFAULT_PALETA[0],
    paleta?.[1] ?? DEFAULT_PALETA[1],
    paleta?.[2] ?? DEFAULT_PALETA[2],
  ];

  const total = landscapeLongParaFrames(durTotalSec);

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* PLANO BASE: gravação horizontal do criador, FULLSCREEN, áudio real */}
      {creatorVideoUrl ? (
        <OffthreadVideo
          src={resolveSrc(creatorVideoUrl)}
          muted={!creatorLiveAudio}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      {/* CUTAWAYS: b-roll cobrindo a tela por cima do criador (corte temporário) */}
      {(cutaways ?? []).map((cw, i) => {
        const from = Math.max(0, Math.round((cw.startSec ?? 0) * FPS));
        const durFrames = Math.max(1, Math.round((cw.durSec ?? 1) * FPS));
        return (
          <Sequence key={`cw${i}`} from={from} durationInFrames={durFrames}>
            <Cutaway
              videoUrl={cw.videoUrl}
              imageUrl={cw.imageUrl}
              label={cw.label}
              durFrames={durFrames}
              accent={accent}
            />
          </Sequence>
        );
      })}

      {/* CAPÍTULOS: marcador (lower-third) entrando em cada startSec ~3.5s na tela */}
      {(capitulos ?? []).map((cap, i) => {
        const from = Math.max(0, Math.round((cap.startSec ?? 0) * FPS));
        return (
          <Sequence key={`cap${i}`} from={from} durationInFrames={105}>
            <ChapterMarker
              titulo={cap.titulo}
              number={i + 1}
              accent={accent}
              textColor={textColor}
            />
          </Sequence>
        );
      })}

      {/* COLD OPEN: tese sobreposta nos primeiros ~3s */}
      {faixaTese ? (
        <Sequence from={0} durationInFrames={90}>
          <ColdOpenTitle text={faixaTese} accent={accent} textColor={textColor} />
        </Sequence>
      ) : null}

      {/* LEGENDA karaokê word-level no rodapé (transcrição absoluta, cobre o vídeo todo) */}
      <Sequence from={0} durationInFrames={total}>
        <WordCaptions
          words={words}
          fromSec={0}
          anchorY={1000}
          accent={accent}
          fontSize={64}
          maxWidth={1600}
          maxWordsPerGroup={4}
          variant="solta"
          allCaps
        />
      </Sequence>

      {/* HANDLE discreto no canto inferior direito */}
      {handle ? (
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            right: 48,
            zIndex: 80,
            color: accent,
            opacity: 0.85,
            fontFamily: 'Montserrat, Inter, sans-serif',
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: 2,
            textShadow: '0 2px 10px rgba(0,0,0,0.7)',
          }}
        >
          {handle}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
