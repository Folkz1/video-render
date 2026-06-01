import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { WordCaptions, WordTiming } from './components/WordCaptions';

// CaptionClip — formato A (monolayer fullscreen): clip real ocupa a tela toda, narração
// (voz off) por cima, legenda karaokê word-by-word lower-third. Destaques opcionais de alto
// engajamento: faixa-tese fixa, título topo, keyword-hero (palavra-selo), círculo de marcação,
// e numeral gigante (via numberPop da legenda). Cena única. Genérico por nicho (accent do brand).

const FPS = 30;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export type CaptionClipProps = {
  video_url?: string; // clip real fullscreen (http) → OffthreadVideo
  imagem_url?: string; // fallback: imagem AI 1080x1920 + Ken Burns
  audio_url?: string; // narração (data-uri/url). Usada quando mute_video=true
  words: WordTiming[]; // timestamps por palavra (ElevenLabs)
  texto?: string; // fala crua (fallback legenda se words vazio)
  paleta_hex: string; // accent da legenda ativa / números
  logo_url: string;
  handle: string;
  duracao_s: number;
  mute_video?: boolean; // true → muta o clip e usa audio_url (narração)
  music_url?: string;
  tema_linhas?: string[]; // faixa-tese manchete (itálico black)
  tema_y?: number;
  titulo_topo?: string; // título fixo no topo
  keyword_hero?: string; // palavra-selo gigante
  circulo_em?: { start: number; end: number }[]; // janelas (s) p/ círculo vermelho
};

export const captionClipDefaultProps: CaptionClipProps = {
  video_url: '',
  imagem_url: 'https://picsum.photos/1080/1920?7',
  audio_url: '',
  words: [],
  texto: 'caraca esse cara vale trinta milhões agora',
  paleta_hex: '#FFD400',
  logo_url: '',
  handle: '@fiel.ia',
  duracao_s: 8,
  mute_video: true,
};

export const captionClipParaFrames = (p: { duracao_s?: number }) =>
  Math.max(1, Math.round((p?.duracao_s ?? 8) * FPS));

const BgKenBurns: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 240], [1.05, 1.18], { extrapolateRight: 'clamp' });
  const panX = interpolate(frame, [0, 240], [-10, 10], { extrapolateRight: 'clamp' });
  return <Img src={resolveSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${panX}px)` }} />;
};

const KeywordHero: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < 18) return null;
  const s = spring({ frame: frame - 18, fps, config: { damping: 13, mass: 0.7 } });
  const scale = interpolate(s, [0, 1], [0.55, 1.0]);
  return (
    <div style={{ position: 'absolute', top: 640, left: 0, width: 1080, textAlign: 'center', zIndex: 35, transform: `scale(${scale})`, transformOrigin: 'center' }}>
      <span style={{ color: accent, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 150, WebkitTextStroke: '10px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textTransform: 'uppercase', letterSpacing: '-0.02em' }}>{text}</span>
    </div>
  );
};

const CircleMark: React.FC<{ janela: { start: number; end: number } }> = ({ janela }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < janela.start || t > janela.end) return null;
  const localF = frame - Math.round(janela.start * fps);
  const r = 280;
  const circ = 2 * Math.PI * r;
  const draw = interpolate(localF, [0, 12], [circ, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0, zIndex: 38 }}>
      <circle cx={540} cy={440} r={r} fill="none" stroke="#E61E1E" strokeWidth={10} strokeDasharray={circ} strokeDashoffset={draw} transform="rotate(-90 540 440)" />
    </svg>
  );
};

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'rgba(255,255,255,0.08)', zIndex: 60 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};

export const CaptionClip: React.FC<CaptionClipProps> = (props) => {
  const { video_url, imagem_url, audio_url, words, texto, paleta_hex, logo_url, handle, duracao_s, mute_video = true, music_url, tema_linhas, tema_y = 900, titulo_topo, keyword_hero, circulo_em } = props;
  const total = captionClipParaFrames(props);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* fundo fullscreen */}
      {video_url ? (
        <OffthreadVideo src={resolveSrc(video_url)} muted={mute_video} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <BgKenBurns src={imagem_url || ''} />
      )}

      {/* gradiente de legibilidade */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(4,6,10,0.5) 0%, rgba(4,6,10,0.06) 24%, rgba(4,6,10,0.48) 62%, rgba(4,6,10,0.92) 100%)', zIndex: 5 }} />

      {/* círculo vermelho de marcação (terço superior) */}
      {(circulo_em ?? []).map((j, i) => (
        <CircleMark key={`c${i}`} janela={j} />
      ))}

      {/* keyword-hero (palavra-selo gigante) */}
      {keyword_hero ? <KeywordHero text={keyword_hero} accent={paleta_hex} /> : null}

      {/* faixa-tese manchete (itálico black) */}
      {tema_linhas && tema_linhas.length ? (
        <div style={{ position: 'absolute', top: tema_y, left: 60, right: 60, textAlign: 'center', zIndex: 32 }}>
          {tema_linhas.map((l, i) => (
            <div key={`t${i}`} style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontStyle: 'italic', fontSize: 64, lineHeight: 1.1, WebkitTextStroke: '6px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 3px 14px rgba(0,0,0,0.6)' }}>{l}</div>
          ))}
        </div>
      ) : null}

      {/* título fixo no topo */}
      {titulo_topo ? (
        <div style={{ position: 'absolute', top: 150, left: 60, right: 60, textAlign: 'center', zIndex: 30, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 700, fontSize: 46, lineHeight: 1.1, WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'], textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>{titulo_topo}</div>
      ) : null}

      {/* legenda karaokê lower-third (~74%) */}
      <WordCaptions words={words} text={texto} durSec={duracao_s} fromSec={0} anchorY={1427} accent={paleta_hex} fontSize={88} maxWordsPerGroup={1} variant="solta" numberPop />

      {/* áudio: narração quando o clip está mutado */}
      {mute_video && audio_url ? <Audio src={resolveSrc(audio_url)} volume={1} /> : null}
      {music_url ? <Audio src={resolveSrc(music_url)} volume={0.1} loop /> : null}

      {/* branding */}
      <div style={{ position: 'absolute', top: 70, left: 56, zIndex: 50, display: 'flex', alignItems: 'center', gap: 16 }}>
        {logo_url ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: '8px 14px', display: 'flex', alignItems: 'center' }}>
            <Img src={resolveSrc(logo_url)} style={{ height: 48, width: 'auto', objectFit: 'contain' }} />
          </div>
        ) : null}
        <span style={{ color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 800, fontSize: 32, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{handle}</span>
      </div>

      <ProgressBar total={total} accent={paleta_hex} />
    </AbsoluteFill>
  );
};
