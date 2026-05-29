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

// Resolve URL http(s) direta OU arquivo em public/ (staticFile).
const resolveSrc = (src: string): string =>
  !src ? src : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

// Composição de SHORT vertical (1080x1920) 100% parametrizável via props (--props).
// Pensada para o Creative-Autopost: cenas com imagem de acervo (Ken Burns) + texto
// animado + narração ElevenLabs + branding (logo/handle). Duração derivada das cenas.

export type Cena = {
  texto: string;
  imagem_url: string;
  duracao_s: number;
  kicker?: string;
};

export type ShortParametrizavelProps = {
  cenas: Cena[];
  audio_url: string;
  paleta_hex: string; // cor de destaque (accent)
  logo_url: string;
  handle: string;
};

const FPS = 30;

export const shortDefaultProps: ShortParametrizavelProps = {
  cenas: [
    { texto: 'Primeira cena', imagem_url: 'https://picsum.photos/1080/1920?1', duracao_s: 4 },
    { texto: 'Segunda cena', imagem_url: 'https://picsum.photos/1080/1920?2', duracao_s: 5 },
  ],
  audio_url: '',
  paleta_hex: '#2FD4C4',
  logo_url: '',
  handle: '@dentaly.manaus',
};

export const cenasParaFrames = (cenas: Cena[]) =>
  (cenas ?? []).reduce((acc, c) => acc + Math.max(1, Math.round((c.duracao_s ?? 3) * FPS)), 0);

const CenaView: React.FC<{ cena: Cena; accent: string; durationFrames: number }> = ({
  cena,
  accent,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Ken Burns: zoom-in suave + pan vertical ao longo da cena
  const scale = interpolate(frame, [0, durationFrames], [1.04, 1.16], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [0, durationFrames], [-14, 14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const reveal = spring({ frame, fps, config: { damping: 18, mass: 0.7 } });
  const opacity = interpolate(
    frame,
    [0, 8, Math.max(16, durationFrames - 10), durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#06181b' }}>
      <Img
        src={resolveSrc(cena.imagem_url)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale}) translateY(${translateY}px)`,
        }}
      />
      {/* gradiente p/ legibilidade do texto inferior */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(4,12,14,0.30) 0%, rgba(4,12,14,0.05) 28%, rgba(4,12,14,0.50) 64%, rgba(4,12,14,0.94) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 230,
          zIndex: 20,
          opacity,
          transform: `translateY(${(1 - reveal) * 22}px)`,
        }}
      >
        {cena.kicker ? (
          <div
            style={{
              color: accent,
              fontFamily: 'Inter, Segoe UI, sans-serif',
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: 16,
              textShadow: '0 2px 10px rgba(0,0,0,0.7)',
            }}
          >
            {cena.kicker}
          </div>
        ) : null}
        <div
          style={{
            color: '#fff',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: 72,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
            textShadow: '0 3px 18px rgba(0,0,0,0.6)',
          }}
        >
          {cena.texto}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const ShortParametrizavel: React.FC<ShortParametrizavelProps> = ({
  cenas,
  audio_url,
  paleta_hex,
  logo_url,
  handle,
}) => {
  let cursor = 0;
  const cenasBuild = (cenas ?? []).map((cena) => {
    const durationFrames = Math.max(1, Math.round((cena.duracao_s ?? 3) * FPS));
    const item = { cena, from: cursor, durationFrames };
    cursor += durationFrames;
    return item;
  });
  const total = Math.max(1, cursor);

  return (
    <AbsoluteFill style={{ backgroundColor: '#06181b' }}>
      {audio_url ? (
        <Sequence from={0} durationInFrames={total}>
          <Audio src={resolveSrc(audio_url)} volume={1} />
        </Sequence>
      ) : null}

      {cenasBuild.map((b, i) => (
        <Sequence key={i} from={b.from} durationInFrames={b.durationFrames}>
          <CenaView cena={b.cena} accent={paleta_hex} durationFrames={b.durationFrames} />
        </Sequence>
      ))}

      {/* branding: logo (pill branco) + handle */}
      <div
        style={{
          position: 'absolute',
          top: 70,
          left: 56,
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        {logo_url ? (
          <div
            style={{
              background: '#fff',
              borderRadius: 18,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
            }}
          >
            <Img src={resolveSrc(logo_url)} style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
          </div>
        ) : null}
        <span
          style={{
            color: '#fff',
            fontFamily: 'Inter, Segoe UI, sans-serif',
            fontSize: 34,
            fontWeight: 800,
            textShadow: '0 2px 12px rgba(0,0,0,0.7)',
          }}
        >
          {handle}
        </span>
      </div>

      <ProgressBar total={total} accent={paleta_hex} />
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC<{ total: number; accent: string }> = ({ total, accent }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, total], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 10,
        background: 'rgba(255,255,255,0.08)',
        zIndex: 40,
      }}
    >
      <div style={{ width: `${progress}%`, height: '100%', background: accent }} />
    </div>
  );
};
