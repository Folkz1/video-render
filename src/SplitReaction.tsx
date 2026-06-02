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

// SplitReaction — formato B (split 50/50 permanente): TOPO = rosto do criador (fixo,
// retenção facial + autoridade); BAIXO = b-roll/clip do tema que troca a cada cena;
// legenda karaokê word-by-word na costura. Genérico por nicho (paleta/handle/logo do brand).

const FPS = 30;

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type CenaSplit = {
  kicker?: string;
  texto: string; // fala crua (fallback p/ legenda se words vazio)
  video_url?: string; // b-roll do tema (clip real via /api/v1/clip)
  imagem_url?: string; // fallback: imagem AI 1080x1920
  audio_url: string; // narração da cena (data-uri ou url)
  duracao_s: number;
  words?: WordTiming[]; // timestamps por palavra (relativos ao áudio da cena)
  broll_cta?: string; // overlay opcional no rodapé do b-roll
  logo_url?: string; // logo do nicho p/ "exemplificar" (entra animado quando a fala cita a ferramenta)
};

export type SplitReactionProps = {
  cenas: CenaSplit[];
  creator_url?: string; // clip do criador (topo, contínuo) — OffthreadVideo
  creator_avatar?: string; // fallback: imagem do criador (topo)
  creator_live_audio?: boolean; // gravação real: topo toca o áudio (não muta, não loopa)
  paleta_hex: string;
  logo_url: string;
  handle: string;
  split_ratio?: number; // fração da altura do painel TOPO (0.42-0.62)
  faixa_tese?: string; // título-tese fixo opcional
  sfx_url?: string;
  music_url?: string;
};

export const splitReactionDefaultProps: SplitReactionProps = {
  cenas: [
    { kicker: 'REAGINDO', texto: 'Olha o que a IA fez agora', imagem_url: 'https://picsum.photos/1080/1080?10', audio_url: '', duracao_s: 4, words: [] },
  ],
  creator_avatar: 'https://picsum.photos/1080/1080?99',
  paleta_hex: '#2FD4C4',
  logo_url: '',
  handle: '@guyfolkz',
  split_ratio: 0.5,
};

export const cenasSplitParaFrames = (cenas: CenaSplit[]) =>
  (cenas ?? []).reduce((acc, c) => acc + Math.max(1, Math.round((c.duracao_s ?? 3) * FPS)), 0);

const KenBurns: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 120], [1.05, 1.14], { extrapolateRight: 'clamp' });
  const panX = interpolate(frame, [0, 120], [-8, 8], { extrapolateRight: 'clamp' });
  return <Img src={resolveSrc(src)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${panX}px)` }} />;
};

// assinatura anti-repost: handle repetido em diagonal, bem sutil, atrás do criador
const HandleTile: React.FC<{ handle: string }> = ({ handle }) => {
  const row = (handle + '   ').repeat(8);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.045, zIndex: 1, transform: 'rotate(-30deg) scale(1.7)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 64, pointerEvents: 'none' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ whiteSpace: 'nowrap', color: '#fff', fontFamily: 'monospace', fontSize: 40, fontWeight: 700 }}>{row}</div>
      ))}
    </div>
  );
};

// logo do nicho "exemplificando" a fala: entra com mola, glow pulsante e leve float
const LogoBadge: React.FC<{ src: string; accent: string }> = ({ src, accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = spring({ frame, fps, config: { damping: 13, mass: 0.6 } });
  const scale = interpolate(appear, [0, 1], [0.4, 1]);
  const float = Math.sin(frame / 22) * 6;
  const glow = interpolate(Math.sin(frame / 18), [-1, 1], [0.35, 0.85]);
  return (
    <div style={{ position: 'absolute', top: 28, right: 28, width: 156, height: 156, borderRadius: 30, zIndex: 30, background: 'rgba(8,12,22,0.80)', border: `2px solid ${accent}`, boxShadow: `0 0 ${Math.round(22 * glow)}px ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${scale}) translateY(${float}px)`, opacity: appear }}>
      <Img src={resolveSrc(src)} style={{ width: '62%', height: '62%', objectFit: 'contain' }} />
    </div>
  );
};

const BottomBroll: React.FC<{ cena: CenaSplit; splitY: number; accent: string }> = ({ cena, splitY, accent }) => (
  <>
    <div style={{ position: 'absolute', top: splitY, left: 0, width: 1080, height: 1920 - splitY, overflow: 'hidden', backgroundColor: '#05060a' }}>
      {cena.video_url ? (
        <OffthreadVideo src={resolveSrc(cena.video_url)} muted loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <KenBurns src={cena.imagem_url || ''} />
      )}
      {cena.logo_url ? <LogoBadge src={cena.logo_url} accent={accent} /> : null}
      {cena.broll_cta ? (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 44, textAlign: 'center', color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 38, letterSpacing: '0.04em', WebkitTextStroke: '5px #000', paintOrder: 'stroke fill' }}>{cena.broll_cta.toUpperCase()}</div>
      ) : null}
    </div>
    <WordCaptions words={cena.words} text={cena.texto} durSec={cena.duracao_s} fromSec={0} anchorY={splitY} accent={accent} fontSize={72} maxWordsPerGroup={2} variant="solta" allCaps />
  </>
);

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 10, background: 'rgba(255,255,255,0.08)', zIndex: 60 }}>
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};

export const SplitReaction: React.FC<SplitReactionProps> = (props) => {
  const { cenas, creator_url, creator_avatar, creator_live_audio, paleta_hex, logo_url, handle, split_ratio = 0.5, faixa_tese, sfx_url, music_url } = props;
  const splitY = Math.round(clamp(split_ratio, 0.42, 0.62) * 1920);

  let cursor = 0;
  const build = (cenas ?? []).map((cena) => {
    const dur = Math.max(1, Math.round((cena.duracao_s ?? 3) * FPS));
    const item = { cena, from: cursor, dur };
    cursor += dur;
    return item;
  });
  const total = Math.max(1, cursor);

  return (
    <AbsoluteFill style={{ backgroundColor: '#05060a' }}>
      {/* TOPO criador (contínuo, fixo) */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 1080, height: splitY, overflow: 'hidden', backgroundColor: '#0a0f1c' }}>
        {creator_url ? (
          <OffthreadVideo src={resolveSrc(creator_url)} muted={!creator_live_audio} loop={!creator_live_audio} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : creator_avatar ? (
          <KenBurns src={creator_avatar} />
        ) : null}
        <HandleTile handle={handle} />
        {logo_url ? (
          <div style={{ position: 'absolute', top: 40, right: 40, width: 96, height: 96, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.3)', zIndex: 50 }}>
            <Img src={resolveSrc(logo_url)} style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
          </div>
        ) : null}
      </div>

      {/* linha divisória neon */}
      <div style={{ position: 'absolute', top: splitY - 3, left: 0, width: 1080, height: 6, background: paleta_hex, opacity: 0.95, zIndex: 35, boxShadow: `0 0 18px ${paleta_hex}` }} />

      {/* música de fundo */}
      {music_url ? (
        <Sequence from={0} durationInFrames={total}>
          <Audio src={resolveSrc(music_url)} volume={0.12} loop />
        </Sequence>
      ) : null}

      {/* narração por cena */}
      {build.map((b, i) => (
        <Sequence key={`a${i}`} from={b.from} durationInFrames={b.dur}>
          {b.cena.audio_url ? <Audio src={resolveSrc(b.cena.audio_url)} volume={1} /> : null}
        </Sequence>
      ))}

      {/* SFX whoosh nos cortes (exceto 1ª cena) */}
      {sfx_url
        ? build.slice(1).map((b, i) => (
            <Sequence key={`s${i}`} from={Math.max(0, b.from - 5)} durationInFrames={18}>
              <Audio src={resolveSrc(sfx_url)} volume={0.3} />
            </Sequence>
          ))
        : null}

      {/* BAIXO: b-roll + legenda por cena */}
      {build.map((b, i) => (
        <Sequence key={`v${i}`} from={b.from} durationInFrames={b.dur}>
          <BottomBroll cena={b.cena} splitY={splitY} accent={paleta_hex} />
        </Sequence>
      ))}

      {/* handle badge — canto superior esquerdo (fora da costura: não colide com a legenda karaokê) */}
      <div style={{ position: 'absolute', top: 30, left: 30, zIndex: 41, color: paleta_hex, fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 30, letterSpacing: '0.04em', WebkitTextStroke: '4px #000', paintOrder: 'stroke fill' }}>
        {handle.toUpperCase()}
      </div>

      {/* faixa-tese fixa opcional */}
      {faixa_tese ? (
        <div style={{ position: 'absolute', top: 36, left: 60, right: 60, textAlign: 'center', zIndex: 45, color: '#fff', fontFamily: 'Montserrat, Inter, sans-serif', fontWeight: 900, fontSize: 46, lineHeight: 1.05, fontStyle: 'italic', WebkitTextStroke: '6px #000', paintOrder: 'stroke fill', textShadow: '0 3px 14px rgba(0,0,0,0.6)' }}>
          {faixa_tese}
        </div>
      ) : null}

      <ProgressBar total={total} accent={paleta_hex} />
    </AbsoluteFill>
  );
};
