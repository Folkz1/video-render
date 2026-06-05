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

// Ênfase pontual ROBUSTA (inline, sem depender do kit KeywordPop que não renderizava aqui):
// palavra/frase-chave que estoura no rodapé, accent neon, scale spring + fade. Coração do
// "modo ênfase" do formato longo (você fala mostrando a tela; o destaque marca o ponto-chave).
const EnfasePop: React.FC<{ texto: string; accent: string }> = ({ texto, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const scale = interpolate(appear, [0, 1], [0.55, 1]);
  const op = interpolate(
    frame,
    [0, 5, Math.max(6, durationInFrames - 8), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 130 }}>
      <div
        style={{
          opacity: op,
          transform: `scale(${scale}) rotate(-3deg)`,
          fontFamily: 'Inter, Arial, sans-serif',
          fontWeight: 900,
          fontSize: 112,
          lineHeight: 1,
          color: accent,
          WebkitTextStroke: '3px rgba(5,6,10,0.65)',
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          textShadow: `0 0 26px ${accent}, 0 6px 20px rgba(0,0,0,0.6)`,
          letterSpacing: '0.01em',
          textTransform: 'uppercase',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};

// LandscapeLong — composition 16:9 (1920x1080) pro formato de vídeo LONGO (YouTube, 10min+)
// do Creative-Autopost. Plano base = gravação HORIZONTAL do criador em FULLSCREEN com áudio
// real (OffthreadVideo). O dono grava mostrando tudo na tela e falando, então o DEFAULT é o
// MODO ÊNFASE (edição simples): SEM legenda karaokê contínua cobrindo o vídeo — em vez disso,
// destaques PONTUAIS de palavra/frase ("ênfases") que estouram só nos momentos importantes,
// num terço inferior/central que não tampa o rosto. A legenda karaokê (WordCaptions) é
// OPCIONAL — só aparece se `words` tiver conteúdo (modo legendado clássico).
//
// Contrato das props:
//   creatorVideoUrl   (string)   gravação horizontal do criador, fullscreen
//   creatorLiveAudio? (boolean)  default true — toca o áudio real do vídeo
//   words?            (WordTiming[]) default [] — legenda karaokê CONTÍNUA; vazio ⇒ sem legenda
//   enfases           (Enfase[]) default [] — destaques PONTUAIS (KeywordPop) em momentos-chave
//   capitulos?        (Capitulo[]) default [] — lower-thirds de capítulo; vazio ⇒ não renderiza
//   cutaways?         (Cutaway[])  default [] — b-roll por cima; vazio ⇒ não renderiza
//   paleta?           (string[])  [fundo, destaque, texto]
//   handle?           (string)    default "" — @ no canto; vazio ⇒ não renderiza
//   faixaTese?        (string)    default "" — tese no cold-open; vazio ⇒ não renderiza
//   durTotalSec       (number)    duração total (durationInFrames = durTotalSec*30)
//   overlayOnly?      (boolean)   default false — MODO SÓ-OVERLAYS pro pipeline FFmpeg-compose.
//                                 Quando true: fundo TRANSPARENTE (alpha), NÃO renderiza o
//                                 OffthreadVideo do criador NEM os cutaways de vídeo (o FFmpeg
//                                 sobrepõe os overlays no vídeo do criador depois, evitando que
//                                 o Remotion decodifique o vídeo-fonte quadro a quadro = render
//                                 muito mais leve/rápido). Mantém todos os overlays de texto/
//                                 gráfico (ColdOpenTitle, ChapterMarker, EnfasePop, handle e a
//                                 legenda WordCaptions). O short-server renderiza esse modo com
//                                 codec vp8 (canal alpha). Default false ⇒ comportamento atual
//                                 intacto (vídeo + tudo).

const FPS = 30;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type { WordTiming };

export type Enfase = {
  texto: string; // palavra/frase-chave que estoura
  startSec: number; // instante (absoluto) em que a fala bate o termo
  durSec?: number; // quanto fica na tela; default ~1.8s
};

export type LandscapeLongProps = {
  creatorVideoUrl: string; // gravação horizontal do criador (fullscreen, áudio real)
  creatorLiveAudio?: boolean; // default true (toca o áudio do vídeo)
  words?: WordTiming[]; // legenda karaokê CONTÍNUA; default [] — vazio ⇒ sem legenda contínua
  enfases?: Enfase[]; // destaques PONTUAIS (KeywordPop) nos momentos-chave; default []
  capitulos?: { titulo: string; startSec: number }[]; // lower-third nos pontos; default []
  cutaways?: {
    startSec: number;
    durSec: number;
    videoUrl?: string;
    imageUrl?: string;
    label?: string;
  }[]; // b-roll por cima; default []
  paleta?: string[]; // [fundo, destaque, texto]
  handle?: string; // ex "@GuyFolks" no canto; default ""
  faixaTese?: string; // título/tese opcional no cold-open; default ""
  durTotalSec: number; // duração total (define durationInFrames = durTotalSec*30)
  overlayOnly?: boolean; // default false — só overlays sobre fundo transparente (FFmpeg-compose)
};

const DEFAULT_PALETA = ['#0A0F1C', '#00E5FF', '#FFFFFF'];

export const landscapeLongDefaultProps: LandscapeLongProps = {
  creatorVideoUrl: '2026-03-07_17-20-29_limpo.mp4',
  creatorLiveAudio: true,
  // MODO ÊNFASE: sem legenda karaokê contínua (words vazio ⇒ WordCaptions não renderiza)
  words: [],
  // destaques PONTUAIS que estouram só nos momentos-chave (preview mostra o beat de ênfase)
  enfases: [
    { texto: 'SOBERANIA', startSec: 3, durSec: 1.8 },
    { texto: 'DESCENTRALIZA', startSec: 7, durSec: 1.8 },
    { texto: 'SEM PERMISSÃO', startSec: 11, durSec: 1.8 },
  ],
  // edição simples: capítulos/cutaways/handle vazios não renderizam; só o cold-open da tese
  capitulos: [],
  cutaways: [],
  paleta: DEFAULT_PALETA,
  handle: '@GuyFolkz',
  faixaTese: 'A IA é descentralização — e ninguém te contou.',
  durTotalSec: 14,
  // preview mostra o vídeo do criador + tudo (modo normal); overlayOnly é só pro FFmpeg-compose
  overlayOnly: false,
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
    words = [],
    enfases = [],
    capitulos = [],
    cutaways = [],
    paleta,
    handle = '',
    faixaTese = '',
    durTotalSec,
    overlayOnly = false,
  } = props;

  const [bg, accent, textColor] = [
    paleta?.[0] ?? DEFAULT_PALETA[0],
    paleta?.[1] ?? DEFAULT_PALETA[1],
    paleta?.[2] ?? DEFAULT_PALETA[2],
  ];

  const total = landscapeLongParaFrames(durTotalSec);

  return (
    // overlayOnly: fundo TRANSPARENTE (alpha) — nada opaco cobre a tela toda, só os overlays.
    // Modo normal: fundo sólido `bg` (atrás do vídeo fullscreen).
    <AbsoluteFill style={{ backgroundColor: overlayOnly ? 'transparent' : bg }}>
      {/* PLANO BASE: gravação horizontal do criador, FULLSCREEN, áudio real.
          overlayOnly ⇒ NÃO renderiza o vídeo (o FFmpeg-compose sobrepõe os overlays no
          vídeo do criador depois; assim o Remotion não decodifica o vídeo-fonte). */}
      {!overlayOnly && creatorVideoUrl ? (
        <OffthreadVideo
          src={resolveSrc(creatorVideoUrl)}
          muted={!creatorLiveAudio}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      {/* CUTAWAYS: b-roll cobrindo a tela por cima do criador (corte temporário).
          overlayOnly ⇒ pulamos TODOS os cutaways: os de vídeo dependem do vídeo base (que o
          FFmpeg cuida) e, por simplicidade, os de imagem também são omitidos neste modo. */}
      {!overlayOnly &&
        (cutaways ?? []).map((cw, i) => {
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

      {/* ÊNFASES PONTUAIS: palavra/frase-chave que estoura no startSec (KeywordPop reusado),
          posicionada no terço inferior/central (y≈840) pra NÃO tampar o rosto do criador.
          Cada uma vive numa Sequence própria (fromSec=0 local → o pop inicia no frame 0 dela). */}
      {enfases.map((enf, i) => {
        const from = Math.max(0, Math.round((enf.startSec ?? 0) * FPS));
        const durSec = enf.durSec ?? 1.8;
        const durFrames = Math.max(1, Math.round(durSec * FPS));
        return (
          <Sequence key={`enf${i}`} from={from} durationInFrames={durFrames}>
            <EnfasePop texto={enf.texto} accent={accent} />
          </Sequence>
        );
      })}

      {/* LEGENDA karaokê contínua — OPCIONAL: só renderiza se houver transcrição (words).
          No MODO ÊNFASE words=[] ⇒ esta Sequence nem monta, e nada de legenda contínua aparece. */}
      {words.length > 0 ? (
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
      ) : null}

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
