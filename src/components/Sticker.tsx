import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import {
  ACCENT_DEFAULT,
  SPRINGS,
  floatY,
  glowPulse,
  popIn,
  wobble,
} from '../kit/animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// Kit do Editor — FRENTE B — Sticker.tsx
//
// Sticker/emoji/badge animado: pop-in com mola + float contínuo + glow neon.
// Parametrizável por accent, tamanho e posição. Acompanha um StickerLibrary
// com presets desenhados em SVG inline (seta, fogo, alerta, check) — sem
// nenhum asset externo. Tudo escala com o accent do brand.
// ─────────────────────────────────────────────────────────────────────────────

export type StickerGlyph = (props: { accent: string; size: number }) => React.ReactElement;

export type StickerProps = {
  /** SVG inline a renderizar. Use StickerLibrary.seta / .fogo / .alerta / .check. */
  glyph: StickerGlyph;
  accent?: string;
  /** lado do sticker em px. Default 180. */
  size?: number;
  /** posição absoluta no canvas. Default centro-direita. */
  x?: number;
  y?: number;
  /** quando entra, em segundos (frame local). Default 0. */
  fromSec?: number;
  /** rotação base em graus (o wobble soma por cima). Default 0. */
  rotateDeg?: number;
  /** liga o balanço contínuo. Default true. */
  wobbleOn?: boolean;
  /** liga o float vertical. Default true. */
  floatOn?: boolean;
};

export const Sticker: React.FC<StickerProps> = ({
  glyph,
  accent = ACCENT_DEFAULT,
  size = 180,
  x = 760,
  y = 520,
  fromSec = 0,
  rotateDeg = 0,
  wobbleOn = true,
  floatOn = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = Math.round(fromSec * fps);
  if (frame < startFrame - 1) return null;

  const { scale, opacity } = popIn(frame, fps, startFrame, 0.2, SPRINGS.bouncy);
  const fy = floatOn ? floatY(frame, 8, 48) : 0;
  const rot = rotateDeg + (wobbleOn ? wobble(frame, 5, 70) : 0);
  const glow = glowPulse(frame, 34, 0.4, 1);

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size,
        zIndex: 50,
        transform: `translate(-50%, -50%) translateY(${fy}px) scale(${scale}) rotate(${rot}deg)`,
        transformOrigin: 'center',
        opacity,
        filter: `drop-shadow(0 0 ${Math.round(22 * glow)}px ${accent}) drop-shadow(0 6px 14px rgba(0,0,0,0.55))`,
        pointerEvents: 'none',
      }}
    >
      {glyph({ accent, size })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// StickerLibrary — presets SVG inline. Cada um é uma StickerGlyph pura.
// Acento aplicado no fill/stroke; contorno escuro pra legibilidade sobre b-roll.
// ─────────────────────────────────────────────────────────────────────────────

const STROKE = '#05060a';

const Seta: StickerGlyph = ({ accent, size }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <g transform="rotate(-35 50 50)">
      <path
        d="M20 52 H66 L52 34 L62 30 L84 50 L62 70 L52 66 L66 52 H20 Z"
        fill={accent}
        stroke={STROKE}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </g>
  </svg>
);

const Fogo: StickerGlyph = ({ accent, size }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <path
      d="M50 6 C58 26 74 32 70 54 C68 66 78 64 78 76 C78 90 64 96 50 96 C36 96 22 90 22 76 C22 60 36 56 38 44 C40 56 46 50 46 40 C46 28 40 22 50 6 Z"
      fill={accent}
      stroke={STROKE}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    <path
      d="M50 50 C56 60 58 66 54 74 C52 80 46 80 44 74 C42 68 46 60 50 50 Z"
      fill="#fff"
      opacity={0.85}
    />
  </svg>
);

const Alerta: StickerGlyph = ({ accent, size }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <path
      d="M50 8 L94 86 H6 Z"
      fill={accent}
      stroke={STROKE}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    <rect x={44} y={36} width={12} height={28} rx={6} fill={STROKE} />
    <circle cx={50} cy={74} r={7} fill={STROKE} />
  </svg>
);

const Check: StickerGlyph = ({ accent, size }) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <circle cx={50} cy={50} r={42} fill={accent} stroke={STROKE} strokeWidth={5} />
    <path
      d="M30 52 L44 66 L72 36"
      fill="none"
      stroke={STROKE}
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const StickerLibrary = {
  seta: Seta,
  fogo: Fogo,
  alerta: Alerta,
  check: Check,
} as const;

export type StickerPresetName = keyof typeof StickerLibrary;

export default Sticker;
