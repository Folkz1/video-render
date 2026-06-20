import React from 'react';
import {
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { GUYFOLKZ_ACCENT, BG_DARK } from './kit/animationPresets';
import { MONO_FONT } from './kit/fonts';

// ─────────────────────────────────────────────────────────────────────────────
// BrowserFrame — moldura "Terminal-Noir" de navegador estilizado em volta de um
// SCREENCAST (footage SCREEN-OP gravado por record-page.screencast). Chrome de
// browser near-black: barra superior com 3 dots (semáforo) + campo de URL
// `guyfolkz:~$` em MONOSPACE verde. As faixas pretas do fit:'pad' do screencast
// assentam DENTRO desta moldura (o vídeo é 1080x1920 com barras em cima/baixo).
//
// Opcional: punch-in/zoom suave (respira, igual ao PlanoMedia) e cursor verde
// extra animado por cima (caso o footage não tenha cursor — normalmente já tem,
// injetado pelo screencast). 100% aditivo: usado SÓ quando um Plano é tipo
// 'screen' / tem screencast_url. Legenda karaokê compõe por cima sem mudança.
// ─────────────────────────────────────────────────────────────────────────────

const resolveSrc = (src?: string): string =>
  !src ? '' : src.startsWith('http') || src.startsWith('data:') ? src : staticFile(src);

const isVideoUrl = (u?: string): boolean =>
  !!u && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);

export type BrowserFrameProps = {
  src: string; // url do screencast (mp4/webm) OU imagem (screenshot) — preenche a "viewport"
  dur: number; // frames desta janela (pra punch-in/cursor)
  accent?: string; // cor do chrome/URL (default verde-terminal)
  urlLabel?: string; // texto da barra de endereço (default 'guyfolkz:~$')
  punch?: boolean; // punch-in/zoom suave (default true)
  showCursor?: boolean; // cursor verde extra animado (default false; o footage já traz)
  muted?: boolean; // muta o vídeo do screencast (default true; áudio vem da narração)
};

// chrome do navegador (barra superior). Altura fixa; o resto da moldura é o vídeo.
const CHROME_H = 96;

const TrafficDot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 22, height: 22, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}55` }} />
);

// cursor verde extra (opcional): desenha um SVG de seta que "respira" no centro-baixo.
const GhostCursor: React.FC<{ accent: string; dur: number }> = ({ accent, dur }) => {
  const frame = useCurrentFrame();
  // pequena oscilação de posição (parece vivo) — não precisa bater com nada no footage.
  const dx = interpolate(frame % 90, [0, 45, 90], [0, 18, 0]);
  const dy = interpolate(frame % 120, [0, 60, 120], [0, 12, 0]);
  const op = interpolate(frame, [0, 8, dur - 8, dur], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 540 + dx, top: 1140 + dy, zIndex: 40, opacity: op, pointerEvents: 'none', filter: `drop-shadow(0 0 5px ${accent}cc)` }}>
      <svg width={34} height={34} viewBox="0 0 24 24">
        <path d="M3 2l7 18 2.5-7L20 10.5z" fill={accent} stroke="#04140a" strokeWidth={1.4} strokeLinejoin="round" />
      </svg>
    </div>
  );
};

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  src,
  dur,
  accent = GUYFOLKZ_ACCENT,
  urlLabel = 'guyfolkz:~$',
  punch = true,
  showCursor = false,
  muted = true,
}) => {
  const frame = useCurrentFrame();
  // punch-in sutil (1 -> 1.05) — respira igual aos planos-mídia, sem competir com a legenda.
  const scale = punch ? interpolate(frame, [0, dur], [1.0, 1.05], { extrapolateRight: 'clamp' }) : 1;
  const cyc = frame % 30;
  const cursorBlink = cyc < 17 ? 1 : 0; // cursor block do prompt (cara de TTY)

  const mediaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain', // mantém o site legível; as faixas do fit:'pad' viram a moldura
    transform: `scale(${scale})`,
    background: '#000',
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: BG_DARK,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ── CHROME do navegador: barra superior near-black com 3 dots + URL mono ── */}
      <div
        style={{
          height: CHROME_H,
          flex: `0 0 ${CHROME_H}px`,
          background: 'linear-gradient(180deg, #0c0f15 0%, #070a0f 100%)',
          borderBottom: `1px solid ${accent}33`,
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          padding: '0 30px',
        }}
      >
        <div style={{ display: 'flex', gap: 14, flex: '0 0 auto' }}>
          <TrafficDot color="#ff5f56" />
          <TrafficDot color="#ffbd2e" />
          <TrafficDot color="#27c93f" />
        </div>
        {/* campo de URL: prompt de shell em monospace verde */}
        <div
          style={{
            flex: 1,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'rgba(6,9,14,0.9)',
            border: `1px solid ${accent}44`,
            borderRadius: 10,
            padding: '0 20px',
            fontFamily: MONO_FONT,
            fontWeight: 500,
            fontSize: 34,
            letterSpacing: '0.01em',
            boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: accent }}>{urlLabel}</span>
          {/* cursor block piscando no fim do prompt */}
          <span
            style={{
              display: 'inline-block',
              width: 16,
              height: 34,
              marginLeft: 10,
              transform: 'translateY(2px)',
              background: accent,
              opacity: cursorBlink,
              boxShadow: `0 0 10px ${accent}88`,
            }}
          />
        </div>
      </div>

      {/* ── VIEWPORT: o screencast (vídeo) ou screenshot (imagem) ── */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#000' }}>
        {isVideoUrl(src) ? (
          <OffthreadVideo src={resolveSrc(src)} muted={muted} style={mediaStyle} />
        ) : (
          <Img src={resolveSrc(src)} style={mediaStyle} />
        )}
        {showCursor ? <GhostCursor accent={accent} dur={dur} /> : null}
      </div>
    </div>
  );
};
