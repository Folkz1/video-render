import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  ACCENT_DEFAULT,
  DISPLAY_FONT,
  SPRINGS,
  clamp,
  fadeOut,
  glowPulse,
  heavyStroke,
  neonText,
  popIn,
  sec,
  springAt,
} from '../kit/animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// Kit do Editor — FRENTE B — KeywordPop.tsx
//
// Palavra-chave que "estoura" na tela pra destacar um termo: scale spring com
// overshoot + glow neon pulsante + leve shake no impacto. Coerente com o
// karaokê do WordCaptions (mesma fonte 900, mesmo stroke), mas é um beat de
// ênfase autônomo — você dispara no instante em que a fala bate a palavra.
//
// Variantes: 'fill' (texto na cor accent) | 'pill' (cápsula accent com texto
// escuro) | 'outline' (texto branco com contorno accent). Default 'fill'.
// ─────────────────────────────────────────────────────────────────────────────

export type KeywordPopVariant = 'fill' | 'pill' | 'outline';

export type KeywordPopProps = {
  text: string;
  accent?: string;
  /** quando estoura, em segundos (frame local). Default 0. */
  fromSec?: number;
  /** quanto fica na tela, em segundos. Default 1.4. */
  durSec?: number;
  /** centro do bloco no canvas (px). Default centro 540 / 760. */
  x?: number;
  y?: number;
  fontSize?: number;
  variant?: KeywordPopVariant;
  /** rotação base em graus pra dar atitude. Default -3. */
  tiltDeg?: number;
};

export const keywordPopDefaultProps: KeywordPopProps = {
  text: 'DESCENTRALIZA',
  accent: ACCENT_DEFAULT,
  fromSec: 0,
  durSec: 1.4,
  x: 540,
  y: 760,
  fontSize: 120,
  variant: 'fill',
  tiltDeg: -3,
};

export const KeywordPop: React.FC<KeywordPopProps> = ({
  text,
  accent = ACCENT_DEFAULT,
  fromSec = 0,
  durSec = 1.4,
  x = 540,
  y = 760,
  fontSize = 120,
  variant = 'fill',
  tiltDeg = -3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const startFrame = sec(fromSec, fps);
  const endFrame = sec(fromSec + durSec, fps);
  if (frame < startFrame - 1) return null;

  // estouro: overshoot agressivo de 0.3 -> 1
  const { scale: baseScale } = popIn(frame, fps, startFrame, 0.3, SPRINGS.punchy);
  // shake horizontal só no impacto (primeiros ~6 frames)
  const s = springAt(frame, fps, startFrame, SPRINGS.punchy);
  const impact = interpolate(s, [0, 0.35, 1], [1, 0.25, 0], { extrapolateRight: 'clamp' });
  const shakeX = Math.sin((frame - startFrame) * 1.6) * 10 * impact;

  // saída por fade nos últimos 8 frames
  const exit = fadeOut(frame, endFrame, 8);
  const opacity = clamp(exit, 0, 1);
  if (opacity <= 0 && frame > startFrame) return null;

  const glow = glowPulse(frame, 28, 0.55, 1);

  const variantStyle: React.CSSProperties =
    variant === 'pill'
      ? {
          background: accent,
          color: '#05060a',
          padding: '14px 34px',
          borderRadius: 18,
          boxShadow: `0 0 ${Math.round(34 * glow)}px ${accent}, 0 8px 22px rgba(0,0,0,0.55)`,
          ...heavyStroke(0),
        }
      : variant === 'outline'
      ? {
          color: '#fff',
          WebkitTextStroke: `5px ${accent}`,
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          ...neonText(accent, glow),
        }
      : {
          // 'fill'
          color: accent,
          ...heavyStroke(7),
          ...neonText(accent, glow),
        };

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: 58,
        transform: `translate(-50%, -50%) translateX(${shakeX}px) scale(${baseScale}) rotate(${tiltDeg}deg)`,
        transformOrigin: 'center',
        opacity,
        fontFamily: DISPLAY_FONT,
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        letterSpacing: '0.01em',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        pointerEvents: 'none',
        ...variantStyle,
      }}
    >
      {text.toUpperCase()}
    </div>
  );
};

export default KeywordPop;
