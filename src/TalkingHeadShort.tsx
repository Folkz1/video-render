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
import { buildMusicVolume, type SilenceWindow, type VoiceWindow } from './kit/musicTrack';

// TalkingHeadShort — formato SHORT 9:16 (1080x1920): o criador grava em RETRATO e fala em
// TELA CHEIA (OffthreadVideo, áudio real). Como o vídeo já é 9:16, objectFit:cover NÃO corta
// (mesma proporção do canvas) — a cabeça fica inteira. As IMAGENS/b-roll entram em CUTAWAY:
// cobrem a tela em janelas pontuais pra contextualizar a fala e SOMEM (volta pro rosto). A voz
// do criador continua tocando durante o cutaway (só o visual é coberto). Legenda karaokê
// word-by-word lower-third. É o gêmeo vertical "fullscreen+cutaway" do LandscapeLong (que é o
// 16:9) — ao contrário do split (VerticalLong/SplitReaction), aqui NÃO há painel que espreme
// o 9:16 e corta o topo da cabeça.

const FPS = 30;
const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export type WordTimingT = WordTiming;

export type TalkingHeadShortProps = {
  creatorVideoUrl: string; // gravação 9:16 do criador (fullscreen, áudio real)
  creatorLiveAudio?: boolean; // default true (toca o áudio do vídeo)
  creatorFocusY?: number; // 0..1 object-position vertical (default 0.28 = headroom; topo do frame)
  words?: WordTiming[]; // legenda karaokê word-by-word; vazio ⇒ sem legenda
  texto?: string; // fallback da legenda quando words vazio
  cutaways?: {
    startSec: number;
    durSec: number;
    videoUrl?: string;
    imageUrl?: string;
    label?: string;
  }[]; // b-roll por cima do criador (corte temporário)
  enfases?: { texto: string; startSec: number; durSec?: number }[]; // destaques pontuais
  paleta?: string[]; // [fundo, destaque, texto]
  handle?: string; // @ no topo
  logoUrl?: string; // logo badge no topo
  faixaTese?: string; // tese no cold-open (~3s)
  // ── Áudio (trilha + SFX): dá o acabamento "editado". Todos opcionais — ausentes = só a voz. ──
  music_url?: string;            // trilha de fundo (loop, volume baixo + DUCKING sob a voz)
  sfx_whoosh?: string;           // whoosh tocado na entrada de cada cutaway
  voice_windows?: VoiceWindow[]; // janelas (s) com fala → a trilha abaixa (ducking)
  silence_windows?: SilenceWindow[]; // janelas (s) de silêncio estratégico (trilha → 0)
  room_tone?: boolean;           // leito de presença ~-44dB sob a voz (default true)
  durTotalSec: number; // duração total (durationInFrames = durTotalSec*30)
};

const DEFAULT_PALETA = ['#0A0F1C', '#FFD400', '#FFFFFF'];

export const talkingHeadShortDefaultProps: TalkingHeadShortProps = {
  creatorVideoUrl: '',
  creatorLiveAudio: true,
  creatorFocusY: 0.28,
  words: [],
  texto: 'o silêncio da AIMA não está jogando a teu favor',
  cutaways: [
    { startSec: 8, durSec: 4, imageUrl: 'https://picsum.photos/1080/1920?31', label: 'AIMA' },
    { startSec: 20, durSec: 4, imageUrl: 'https://picsum.photos/1080/1920?32' },
  ],
  enfases: [{ texto: 'AIMA', startSec: 2, durSec: 1.6 }],
  paleta: DEFAULT_PALETA,
  handle: '@advocaciadeguerrilha.pt',
  logoUrl: '',
  faixaTese: '',
  durTotalSec: 30,
};

export const talkingHeadShortParaFrames = (p: { durTotalSec?: number }) =>
  Math.max(1, Math.round((p?.durTotalSec ?? 1) * FPS));

// ── Cutaway: b-roll cobrindo a tela por cima do criador, entrada/saída suave + moldura ──
const Cutaway: React.FC<{
  videoUrl?: string;
  imageUrl?: string;
  label?: string;
  durFrames: number;
  accent: string;
}> = ({ videoUrl, imageUrl, label, durFrames, accent }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, durFrames - 8, durFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // leve Ken Burns no cutaway (vida)
  const scale = interpolate(frame, [0, durFrames], [1.04, 1.12], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ opacity, zIndex: 30 }}>
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: '#05060a' }}>
        {videoUrl ? (
          <OffthreadVideo src={resolveSrc(videoUrl)} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }} />
        ) : imageUrl ? (
          <Img src={resolveSrc(imageUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})` }} />
        ) : null}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 52%, rgba(5,6,10,0.5) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, border: `5px solid ${accent}`, boxShadow: `inset 0 0 50px ${accent}55`, pointerEvents: 'none' }} />
      </div>
      {label ? (
        <div style={{ position: 'absolute', top: 150, left: 56, padding: '10px 22px', borderRadius: 8, background: 'rgba(5,6,10,0.78)', border: `2px solid ${accent}`, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 30, letterSpacing: 2, textTransform: 'uppercase' }}>
          {label}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ── Ênfase pontual: palavra-chave que estoura acima da legenda (não tampa o rosto) ──
const EnfasePop: React.FC<{ texto: string; accent: string }> = ({ texto, accent }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 0.6 } });
  const scale = interpolate(appear, [0, 1], [0.55, 1]);
  const op = interpolate(frame, [0, 5, Math.max(6, durationInFrames - 8), durationInFrames], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 560, zIndex: 45 }}>
      <div style={{ opacity: op, transform: `scale(${scale}) rotate(-3deg)`, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 104, lineHeight: 1, color: accent, WebkitTextStroke: '4px rgba(5,6,10,0.7)', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: `0 0 26px ${accent}, 0 6px 20px rgba(0,0,0,0.6)`, textTransform: 'uppercase', textAlign: 'center', whiteSpace: 'nowrap' }}>
        {texto}
      </div>
    </AbsoluteFill>
  );
};

// ── Criador DINÂMICO: jump-cuts de enquadramento (simula multi-câmera com 1 vídeo) +
// punch-in suave dentro de cada beat. A cada ~3s o enquadramento TROCA em corte seco
// (wide→close→médio→close-apertado) e dá um leve zoom — mata o "cheiro de IA" do plano
// estático. Como o vídeo é 9:16 em 9:16, scale=1 mostra o corpo todo (cabeça inteira) e os
// closes dão zoom no rosto (transformOrigin no terço superior = headroom preservado). ──
const FRAMING: { scale: number; ox: number; oy: number }[] = [
  { scale: 1.0, ox: 50, oy: 30 }, // wide — corpo inteiro (estabelece)
  { scale: 1.34, ox: 50, oy: 22 }, // close no rosto
  { scale: 1.14, ox: 45, oy: 26 }, // médio, leve lado
  { scale: 1.44, ox: 54, oy: 20 }, // close apertado (outro lado)
  { scale: 1.22, ox: 50, oy: 25 }, // médio-close
];
const BEAT_SEC = 3.0; // troca de enquadramento (corte seco) a cada 3s

const CreatorDynamic: React.FC<{ src: string; live: boolean; baseFocusY: number; total: number }> = ({ src, live, baseFocusY, total }) => {
  const frame = useCurrentFrame();
  const beatLen = Math.max(1, Math.round(BEAT_SEC * FPS));
  const idx = Math.floor(frame / beatLen);
  const f = FRAMING[idx % FRAMING.length];
  const local = frame - idx * beatLen;
  // punch-in interno do beat: zoom lento +4% → "respira" e sinaliza vida
  const punch = interpolate(local, [0, beatLen], [1, 1.04], { extrapolateRight: 'clamp' });
  const scale = f.scale * punch;
  return (
    <OffthreadVideo
      src={resolveSrc(src)}
      muted={!live}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: `50% ${Math.round(baseFocusY * 100)}%`,
        transform: `scale(${scale.toFixed(4)})`,
        transformOrigin: `${f.ox}% ${f.oy}%`,
      }}
    />
  );
};

// ── Progress bar (mais um elemento "vivo" na tela) ──
const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, total], [0, 100], { extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.12)', zIndex: 60 }}>
      <div style={{ width: `${p}%`, height: '100%', background: accent, boxShadow: `0 0 12px ${accent}` }} />
    </div>
  );
};

// ── Cold open: tese sobreposta nos primeiros ~3s ──
const ColdOpenTitle: React.FC<{ text: string; accent: string; textColor: string }> = ({ text, accent, textColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, mass: 0.6 } });
  const scale = interpolate(s, [0, 1], [0.92, 1]);
  const opacity = interpolate(frame, [0, 12, 75, 90], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', opacity, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.62) 100%)', zIndex: 70 }}>
      <div style={{ maxWidth: 960, textAlign: 'center', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 78, lineHeight: 1.1, color: textColor, transform: `scale(${scale})`, textShadow: '0 4px 22px rgba(0,0,0,0.75)', padding: '0 60px' }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const TalkingHeadShort: React.FC<TalkingHeadShortProps> = (props) => {
  const {
    creatorVideoUrl,
    creatorLiveAudio = true,
    creatorFocusY = 0.28,
    words = [],
    texto,
    cutaways = [],
    enfases = [],
    paleta,
    handle = '',
    logoUrl = '',
    faixaTese = '',
    music_url,
    sfx_whoosh,
    voice_windows,
    silence_windows,
    room_tone = true,
    durTotalSec,
  } = props;

  const [bg, accent, textColor] = [paleta?.[0] ?? DEFAULT_PALETA[0], paleta?.[1] ?? DEFAULT_PALETA[1], paleta?.[2] ?? DEFAULT_PALETA[2]];
  const total = talkingHeadShortParaFrames(props);

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      {/* PLANO BASE: criador 9:16 FULLSCREEN, áudio real + JUMP-CUTS de enquadramento + zoom
          dinâmico (CreatorDynamic). 9:16 em 9:16 NÃO corta no wide (cabeça inteira); os closes
          dão zoom no rosto com headroom. A cada beat o enquadramento troca em corte seco. */}
      {creatorVideoUrl ? (
        <CreatorDynamic src={creatorVideoUrl} live={creatorLiveAudio} baseFocusY={creatorFocusY} total={total} />
      ) : null}

      {/* CUTAWAYS: b-roll cobre a tela nas janelas; fora delas, mostra o criador */}
      {(cutaways ?? []).map((cw, i) => {
        const from = Math.max(0, Math.round((cw.startSec ?? 0) * FPS));
        const durFrames = Math.max(1, Math.round((cw.durSec ?? 1) * FPS));
        return (
          <Sequence key={`cw${i}`} from={from} durationInFrames={durFrames}>
            <Cutaway videoUrl={cw.videoUrl} imageUrl={cw.imageUrl} label={cw.label} durFrames={durFrames} accent={accent} />
          </Sequence>
        );
      })}

      {/* gradiente de legibilidade (topo p/ branding, base p/ legenda) */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,6,10,0.45) 0%, transparent 20%, transparent 58%, rgba(4,6,10,0.9) 100%)', zIndex: 8 }} />

      {/* COLD OPEN: tese nos ~3s iniciais */}
      {faixaTese ? (
        <Sequence from={0} durationInFrames={90}>
          <ColdOpenTitle text={faixaTese} accent={accent} textColor={textColor} />
        </Sequence>
      ) : null}

      {/* ÊNFASES pontuais */}
      {(enfases ?? []).map((enf, i) => {
        const from = Math.max(0, Math.round((enf.startSec ?? 0) * FPS));
        const durFrames = Math.max(1, Math.round((enf.durSec ?? 1.6) * FPS));
        return (
          <Sequence key={`enf${i}`} from={from} durationInFrames={durFrames}>
            <EnfasePop texto={enf.texto} accent={accent} />
          </Sequence>
        );
      })}

      {/* LEGENDA karaokê word-by-word (lower-third, amarelo, estilo Reel) */}
      {(words.length > 0 || texto) ? (
        <WordCaptions
          words={words}
          text={texto}
          durSec={durTotalSec}
          fromSec={0}
          anchorY={1380}
          accent={accent}
          fontSize={86}
          maxWordsPerGroup={1}
          variant="solta"
          numberPop
        />
      ) : null}

      {/* BRANDING: logo + handle no topo esquerdo */}
      <div style={{ position: 'absolute', top: 64, left: 56, zIndex: 50, display: 'flex', alignItems: 'center', gap: 14 }}>
        {logoUrl ? (
          <div style={{ background: '#fff', borderRadius: 14, padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
            <Img src={resolveSrc(logoUrl)} style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
          </div>
        ) : null}
        {handle ? (
          <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: 30, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}>{handle}</span>
        ) : null}
      </div>

      {/* ÁUDIO: a VOZ vem do próprio vídeo do criador (CreatorDynamic). Por baixo: trilha de fundo
          (loop) com DUCKING sob a fala (voice_windows) + room-tone leve + whoosh na entrada de cada
          cutaway — o acabamento que faz parecer editado, sem competir com a voz. */}
      {music_url ? (
        <Audio
          src={resolveSrc(music_url)}
          loop
          volume={buildMusicVolume({
            fps: FPS,
            totalFrames: total,
            voiceWindows: voice_windows,
            silenceWindows: silence_windows,
            duckVoice: 0.07, // talking-head: voz é quase contínua → trilha um pouco mais presente sob a fala
            duckPause: 0.17, // respira mais alto nas pausas (acabamento sem competir com a voz)
          })}
        />
      ) : null}
      {room_tone ? (
        <Sequence from={0} durationInFrames={total} layout="none">
          <Audio src={resolveSrc('roomtone.mp3')} volume={0.006} loop />
        </Sequence>
      ) : null}
      {sfx_whoosh
        ? (cutaways ?? []).map((cw, i) => (
            <Sequence
              key={`wh${i}`}
              from={Math.max(0, Math.round((cw.startSec ?? 0) * FPS) - 4)}
              durationInFrames={16}
              layout="none"
            >
              <Audio src={resolveSrc(sfx_whoosh)} volume={0.4} />
            </Sequence>
          ))
        : null}

      <ProgressBar total={total} accent={accent} />
    </AbsoluteFill>
  );
};
