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

// Short vertical v2 (alta qualidade): áudio POR CENA (sincronizado), crossfade entre
// cenas, texto animado, SFX opcional, branding. Cada cena dura o tempo da sua narração.

const FPS = 30;
const OVERLAP = 12; // frames de crossfade visual entre cenas

const resolveSrc = (src: string): string =>
  !src ? src : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

export type CenaV2 = {
  kicker?: string;
  texto: string;
  imagem_url: string;
  audio_url: string;
  duracao_s: number;
};

export type ShortV2Props = {
  cenas: CenaV2[];
  paleta_hex: string;
  logo_url: string;
  handle: string;
  sfx_url?: string; // whoosh tocado no corte de cada cena
  music_url?: string; // trilha de fundo (volume baixo)
};

export const shortV2DefaultProps: ShortV2Props = {
  cenas: [
    { kicker: 'DEMO', texto: 'Cena 1', imagem_url: 'https://picsum.photos/1080/1920?1', audio_url: '', duracao_s: 4 },
    { kicker: 'DEMO', texto: 'Cena 2', imagem_url: 'https://picsum.photos/1080/1920?2', audio_url: '', duracao_s: 4 },
  ],
  paleta_hex: '#2FD4C4',
  logo_url: '',
  handle: '@dentaly.manaus',
};

export const cenasV2ParaFrames = (cenas: CenaV2[]) =>
  (cenas ?? []).reduce((acc, c) => acc + Math.max(1, Math.round((c.duracao_s ?? 3) * FPS)), 0);

const CenaVisual: React.FC<{ cena: CenaV2; accent: string; dur: number }> = ({ cena, accent, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken Burns
  const scale = interpolate(frame, [0, dur], [1.05, 1.18], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const panX = interpolate(frame, [0, dur], [-10, 10], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // crossfade da cena: fade-in nos primeiros OVERLAP, fade-out nos últimos OVERLAP
  const sceneOpacity = interpolate(frame, [0, OVERLAP, dur - OVERLAP, dur], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // texto: slide-up + fade
  const reveal = spring({ frame: frame - OVERLAP, fps, config: { damping: 18, mass: 0.6 } });
  const textOpacity = interpolate(frame, [OVERLAP, OVERLAP + 8, dur - OVERLAP - 6, dur - OVERLAP], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity: sceneOpacity, backgroundColor: '#06181b' }}>
      <Img
        src={resolveSrc(cena.imagem_url)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateX(${panX}px)` }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(4,12,14,0.32) 0%, rgba(4,12,14,0.04) 30%, rgba(4,12,14,0.52) 66%, rgba(4,12,14,0.95) 100%)',
        }}
      />
      <div style={{ position: 'absolute', left: 64, right: 64, bottom: 240, opacity: textOpacity, transform: `translateY(${(1 - reveal) * 26}px)` }}>
        {cena.kicker ? (
          <div style={{ color: accent, fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: 34, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16, textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}>
            {cena.kicker}
          </div>
        ) : null}
        <div style={{ color: '#fff', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: 76, fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.01em', textShadow: '0 3px 20px rgba(0,0,0,0.65)' }}>
          {cena.texto}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Branding: React.FC<{ logo_url: string; handle: string }> = ({ logo_url, handle }) => (
  <div style={{ position: 'absolute', top: 70, left: 56, zIndex: 50, display: 'flex', alignItems: 'center', gap: 18 }}>
    {logo_url ? (
      <div style={{ background: '#fff', borderRadius: 18, padding: '10px 16px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
        <Img src={resolveSrc(logo_url)} style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
      </div>
    ) : null}
    <span style={{ color: '#fff', fontFamily: 'Inter, Segoe UI, sans-serif', fontSize: 34, fontWeight: 800, textShadow: '0 2px 12px rgba(0,0,0,0.7)' }}>{handle}</span>
  </div>
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

export const ShortV2: React.FC<ShortV2Props> = ({ cenas, paleta_hex, logo_url, handle, sfx_url, music_url }) => {
  let cursor = 0;
  const build = (cenas ?? []).map((cena) => {
    const dur = Math.max(1, Math.round((cena.duracao_s ?? 3) * FPS));
    const item = { cena, from: cursor, dur };
    cursor += dur;
    return item;
  });
  const total = Math.max(1, cursor);

  return (
    <AbsoluteFill style={{ backgroundColor: '#06181b' }}>
      {/* trilha de fundo (volume baixo) cobrindo tudo */}
      {music_url ? (
        <Sequence from={0} durationInFrames={total}>
          <Audio src={resolveSrc(music_url)} volume={0.12} loop />
        </Sequence>
      ) : null}

      {/* narração POR CENA (sequencial, sincronizada) */}
      {build.map((b, i) => (
        <Sequence key={`a${i}`} from={b.from} durationInFrames={b.dur}>
          {b.cena.audio_url ? <Audio src={resolveSrc(b.cena.audio_url)} volume={1} /> : null}
        </Sequence>
      ))}

      {/* SFX (whoosh) no corte de cada cena, exceto a primeira */}
      {sfx_url
        ? build.slice(1).map((b, i) => (
            <Sequence key={`s${i}`} from={Math.max(0, b.from - 6)} durationInFrames={20}>
              <Audio src={resolveSrc(sfx_url)} volume={0.35} />
            </Sequence>
          ))
        : null}

      {/* VISUAL com crossfade (overlap) — próxima cena entra por cima */}
      {build.map((b, i) => (
        <Sequence key={`v${i}`} from={Math.max(0, b.from - (i === 0 ? 0 : OVERLAP))} durationInFrames={b.dur + (i === 0 ? 0 : OVERLAP)}>
          <CenaVisual cena={b.cena} accent={paleta_hex} dur={b.dur + (i === 0 ? 0 : OVERLAP)} />
        </Sequence>
      ))}

      <Branding logo_url={logo_url} handle={handle} />
      <ProgressBar total={total} accent={paleta_hex} />
    </AbsoluteFill>
  );
};
