import { interpolate, spring, type SpringConfig } from 'remotion';
import type { CSSProperties } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Kit do Editor — FRENTE B — animationPresets.ts
//
// Curvas, timings e helpers REUTILIZÁVEIS, todos funções PURAS (sem hooks).
// Coerência visual GuyFolkz: dark/cyber/tech, fundo #05060a, accent neon
// configurável. Esses helpers não decidem cor — recebem `accent` quando precisam
// dela — pra servir qualquer nicho (GuyFolkz teal, Fiel IA, Dentaly, etc).
//
// Convenção: helpers que dependem de mola recebem (frame, fps); helpers de
// interpolação simples recebem (frame) e assumem fps=30 quando não informado.
// Tudo retorna number | CSSProperties — nunca toca em hooks, então é seguro
// chamar dentro de qualquer componente Remotion ou em testes.
// ─────────────────────────────────────────────────────────────────────────────

export const ACCENT_DEFAULT = '#2FD4C4'; // teal GuyFolkz
export const BG_DARK = '#05060a';
export const FPS_DEFAULT = 30;

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

/** Converte segundos -> frames usando o fps informado (default 30). */
export const sec = (s: number, fps: number = FPS_DEFAULT): number =>
  Math.round(s * fps);

// ─── Spring configs nomeados ────────────────────────────────────────────────
// Reutilizáveis em spring({ frame, fps, config: SPRINGS.punchy }).
export const SPRINGS = {
  /** Entrada agressiva com leve overshoot — bom pra KeywordPop/Sticker. */
  punchy: { damping: 11, mass: 0.6, stiffness: 140 } satisfies Partial<SpringConfig>,
  /** Entrada suave, sem overshoot perceptível — lower thirds, textos. */
  soft: { damping: 18, mass: 0.8, stiffness: 90 } satisfies Partial<SpringConfig>,
  /** Bounce marcado — badges/stickers de impacto (fogo, alerta). */
  bouncy: { damping: 8, mass: 0.7, stiffness: 130 } satisfies Partial<SpringConfig>,
  /** Snap quase instantâneo — cortes secos, glitch. */
  snappy: { damping: 200, mass: 0.4, stiffness: 200 } satisfies Partial<SpringConfig>,
} as const;

export type SpringName = keyof typeof SPRINGS;

// ─── Easings nomeados (Bézier cubic params) ─────────────────────────────────
// Use com Easing.bezier(...EASINGS.x) ou interpolate({ easing }).
export const EASINGS = {
  /** Padrão Material-ish, entra rápido e desacelera. */
  standard: [0.4, 0.0, 0.2, 1] as const,
  /** Acelera no fim — saídas (exit). */
  accel: [0.4, 0.0, 1, 1] as const,
  /** Desacelera no início — entradas (enter). */
  decel: [0.0, 0.0, 0.2, 1] as const,
  /** Anticipation/overshoot leve — energia tech. */
  overshoot: [0.34, 1.56, 0.64, 1] as const,
} as const;

export type EasingName = keyof typeof EASINGS;

// ─── Helpers de progresso (puros) ───────────────────────────────────────────

/**
 * Mola normalizada 0..1 a partir de um frame de início. Açúcar sobre spring()
 * pra não repetir config em todo componente.
 */
export const springAt = (
  frame: number,
  fps: number,
  startFrame = 0,
  config: Partial<SpringConfig> = SPRINGS.punchy,
): number =>
  spring({ frame: frame - startFrame, fps, config, durationInFrames: undefined });

/**
 * Fade linear de entrada. Retorna opacity 0..1 ao longo de `durFrames`
 * a partir de `startFrame`.
 */
export const fadeIn = (frame: number, startFrame = 0, durFrames = 8): number =>
  interpolate(frame, [startFrame, startFrame + durFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/** Fade linear de saída — opacity 1..0 nos últimos `durFrames` antes de `endFrame`. */
export const fadeOut = (frame: number, endFrame: number, durFrames = 8): number =>
  interpolate(frame, [endFrame - durFrames, endFrame], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

/**
 * Pop-in com mola: retorna { scale, opacity } prontos pra transform/opacity.
 * Entra de `fromScale` -> 1 com leve overshoot (config punchy por default).
 */
export const popIn = (
  frame: number,
  fps: number,
  startFrame = 0,
  fromScale = 0.4,
  config: Partial<SpringConfig> = SPRINGS.punchy,
): { scale: number; opacity: number } => {
  const s = springAt(frame, fps, startFrame, config);
  return {
    scale: interpolate(s, [0, 1], [fromScale, 1]),
    opacity: interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' }),
  };
};

export type SlideDir = 'left' | 'right' | 'up' | 'down';

/**
 * Slide-in direcional com mola. Retorna o translate em px + opacity.
 * `dist` = distância de partida em px (default 120).
 */
export const slideIn = (
  frame: number,
  fps: number,
  dir: SlideDir = 'up',
  startFrame = 0,
  dist = 120,
  config: Partial<SpringConfig> = SPRINGS.soft,
): { translateX: number; translateY: number; opacity: number } => {
  const s = springAt(frame, fps, startFrame, config);
  const off = interpolate(s, [0, 1], [dist, 0]);
  const opacity = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
  switch (dir) {
    case 'left':
      return { translateX: -off, translateY: 0, opacity };
    case 'right':
      return { translateX: off, translateY: 0, opacity };
    case 'up':
      return { translateX: 0, translateY: off, opacity };
    case 'down':
      return { translateX: 0, translateY: -off, opacity };
  }
};

/**
 * Pulso de glow contínuo (loop senoidal). Retorna intensidade 0..1 — multiplique
 * pelo raio do boxShadow. `periodFrames` controla a velocidade da respiração.
 */
export const glowPulse = (
  frame: number,
  periodFrames = 36,
  min = 0.35,
  max = 0.9,
): number =>
  interpolate(Math.sin((frame / periodFrames) * Math.PI * 2), [-1, 1], [min, max]);

/** Float vertical suave (loop senoidal) em px — pra stickers/badges flutuando. */
export const floatY = (frame: number, ampPx = 6, periodFrames = 44): number =>
  Math.sin((frame / periodFrames) * Math.PI * 2) * ampPx;

/** Rotação contínua leve (gira/balança) em graus. */
export const wobble = (frame: number, ampDeg = 4, periodFrames = 60): number =>
  Math.sin((frame / periodFrames) * Math.PI * 2) * ampDeg;

// ─── Estilos compostos prontos ──────────────────────────────────────────────

/**
 * boxShadow neon pulsante já montado. Combine com glowPulse pra animar a
 * intensidade ao longo do tempo (chame glowPulse e passe em `intensity`).
 */
export const neonGlow = (accent: string, intensity = 0.8, spreadPx = 28): CSSProperties => ({
  boxShadow: `0 0 ${Math.round(spreadPx * intensity)}px ${accent}, 0 0 ${Math.round(
    spreadPx * intensity * 1.8,
  )}px ${accent}55`,
});

/** textShadow neon pulsante pra texto (KeywordPop / títulos). */
export const neonText = (accent: string, intensity = 0.8): CSSProperties => ({
  textShadow: `0 0 ${Math.round(14 * intensity)}px ${accent}, 0 0 ${Math.round(
    34 * intensity,
  )}px ${accent}aa`,
});

/** Stroke preto grosso padrão do canal (legibilidade sobre b-roll). */
export const heavyStroke = (px = 8): CSSProperties => ({
  WebkitTextStroke: `${px}px #000`,
  paintOrder: 'stroke fill' as CSSProperties['paintOrder'],
  textShadow: '0 4px 12px rgba(0,0,0,0.6)',
});

/** Fonte display padrão GuyFolkz. */
export const DISPLAY_FONT = 'Montserrat, Poppins, Inter, Segoe UI, sans-serif';
