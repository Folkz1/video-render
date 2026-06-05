import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { WordCaptions } from './components/WordCaptions';
import {
  type CaptionClipProps,
  captionClipParaFrames,
} from './CaptionClip';

// QuoteCard — formato FRASE/CITAÇÃO em movimento (MESMO contrato de props do CaptionClip).
// Minimalista, SEM b-roll: fundo gradiente ANIMADO (dois orbs de cor respirando) +
// a frase-chave grande aparecendo PALAVRA A PALAVRA, sincronizada por `words` (a mesma
// legenda karaokê dos outros formatos), com a tese (`tema_linhas`) como kicker no topo.
// Usa só words + tema_linhas/paleta/handle/logo; ignora planos/b-roll/imagem.
// Bom pra citações, hot-takes e "frase de efeito" — visual clean estilo card de quote.

const FPS = 30;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export { captionClipDefaultProps as quoteCardDefaultProps } from './CaptionClip';
export const quoteCardParaFrames = captionClipParaFrames;

// mistura hex accent com preto pra um segundo tom do gradiente (sem dep externa)
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(v.slice(0, 6) || '2fd4c4', 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (hex: string, withBlack: number): string => {
  const [r, g, b] = hexToRgb(hex);
  const k = 1 - withBlack;
  return `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
};

// fundo gradiente animado: dois orbs de cor flutuando + grão sutil. Respira devagar
// pra não cansar — a estrela é a frase, não o fundo.
const AnimatedGradient: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const c1 = accent;
  const c2 = mix(accent, 0.55);
  const ax = interpolate(Math.sin(frame / 70), [-1, 1], [20, 62]);
  const ay = interpolate(Math.cos(frame / 90), [-1, 1], [18, 50]);
  const bx = interpolate(Math.cos(frame / 80), [-1, 1], [40, 86]);
  const by = interpolate(Math.sin(frame / 64), [-1, 1], [55, 92]);
  const pulse = interpolate(Math.sin(frame / 50), [-1, 1], [0.26, 0.4]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      <AbsoluteFill style={{ background: `radial-gradient(60% 50% at ${ax}% ${ay}%, ${c1}${Math.round(pulse * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(55% 48% at ${bx}% ${by}%, ${c2}cc 0%, transparent 58%)` }} />
      {/* grão/scanline muito sutil pra textura */}
      <AbsoluteFill style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.10) 0px, rgba(0,0,0,0.10) 1px, transparent 2px, transparent 5px)', opacity: 0.25, mixBlendMode: 'multiply' }} />
      {/* vinheta suave */}
      <AbsoluteFill style={{ boxShadow: 'inset 0 0 320px 70px rgba(0,0,0,0.6)' }} />
    </AbsoluteFill>
  );
};

// aspas decorativas gigantes (símbolo de citação) flutuando atrás da frase.
const QuoteMark: React.FC<{ accent: string }> = ({ accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, mass: 0.8 } });
  const op = interpolate(s, [0, 1], [0, 0.18]);
  const y = interpolate(Math.sin(frame / 60), [-1, 1], [-10, 10]);
  return (
    <div style={{ position: 'absolute', top: 360, left: 0, width: 1080, textAlign: 'center', zIndex: 10, transform: `translateY(${y}px)`, opacity: op, color: accent, fontFamily: 'Georgia, serif', fontWeight: 900, fontSize: 420, lineHeight: 1 }}>
      &ldquo;
    </div>
  );
};

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'rgba(255,255,255,0.06)', zIndex: 60 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};

export const QuoteCard: React.FC<CaptionClipProps> = (props) => {
  const { audio_url, words, texto, paleta_hex, logo_url, handle, duracao_s, mute_video = true, music_url, tema_linhas, titulo_topo } = props;
  const total = quoteCardParaFrames(props);
  const frame0Accent = paleta_hex || '#2FD4C4';

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      <AnimatedGradient accent={frame0Accent} />
      <QuoteMark accent={frame0Accent} />

      {/* kicker: tese (faixaTese) como "etiqueta" no topo da citação */}
      {tema_linhas && tema_linhas.length ? (
        <Kicker linhas={tema_linhas} accent={frame0Accent} />
      ) : titulo_topo ? (
        <Kicker linhas={[titulo_topo]} accent={frame0Accent} />
      ) : null}

      {/* a FRASE grande, palavra a palavra (mesmo motor karaokê) — centralizada, minimalista */}
      <WordCaptions
        words={words}
        text={texto}
        durSec={duracao_s}
        fromSec={0}
        anchorY={960}
        accent={frame0Accent}
        fontSize={96}
        maxWordsPerGroup={4}
        variant="solta"
        numberPop
        maxWidth={900}
      />

      {/* assinatura: handle embaixo, estilo atribuição de citação */}
      <Attribution handle={handle} logo_url={logo_url} accent={frame0Accent} />

      {/* ÁUDIO: narração + trilha (a frase é falada; sem b-roll/whoosh) */}
      {mute_video && audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
      {music_url ? (
        <Audio
          src={resolveSrc(music_url)}
          volume={(f) => interpolate(f, [0, 12, total - 24, total], [0, 0.14, 0.14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}
        />
      ) : null}

      <ProgressBar total={total} accent={frame0Accent} />
    </AbsoluteFill>
  );
};

const Kicker: React.FC<{ linhas: string[]; accent: string }> = ({ linhas, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16, mass: 0.7 } });
  const op = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [-18, 0]);
  return (
    <div style={{ position: 'absolute', top: 520, left: 60, right: 60, textAlign: 'center', zIndex: 30, opacity: op, transform: `translateY(${y}px)` }}>
      <span style={{ display: 'inline-block', padding: '10px 26px', background: accent, color: '#05060a', borderRadius: 999, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: 34, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
        {linhas.join(' · ')}
      </span>
    </div>
  );
};

const Attribution: React.FC<{ handle: string; logo_url?: string; accent: string }> = ({ handle, logo_url, accent }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [18, 34], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 240, left: 0, width: 1080, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, zIndex: 40, opacity: op }}>
      <div style={{ width: 60, height: 3, background: accent, borderRadius: 2 }} />
      {logo_url ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
          <Img src={resolveSrc(logo_url)} style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
        </div>
      ) : null}
      <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: 36, letterSpacing: '0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>{handle}</span>
      <div style={{ width: 60, height: 3, background: accent, borderRadius: 2 }} />
    </div>
  );
};
