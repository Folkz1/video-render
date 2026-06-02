import { interpolate } from 'remotion';
import type { CSSProperties } from 'react';
import { clamp, EASINGS } from './animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// Kit do Editor — FRENTE B — transitions.ts
//
// Transições ALÉM do crossfade, pensadas pro corte entre 2 cenas (A -> B).
// Cada transição é uma função PURA que recebe `progress` (0..1, 0 = só A,
// 1 = só B) e devolve um par de estilos { outgoing, incoming } pra aplicar nas
// duas camadas que você está cruzando. O componente que consome empilha A e B
// (A embaixo / B em cima) e aplica os estilos.
//
// Algumas transições (glitchCut) precisam do `accent` neon — passam por opts.
// Nenhuma usa hooks: o frame->progress é responsabilidade de quem chama
// (geralmente interpolate(frame, [cut-N, cut+N], [0,1])).
// ─────────────────────────────────────────────────────────────────────────────

export type TransitionDir = 'left' | 'right' | 'up' | 'down';

export type TransitionPair = {
  /** Estilo aplicado na cena que SAI (A). */
  outgoing: CSSProperties;
  /** Estilo aplicado na cena que ENTRA (B). */
  incoming: CSSProperties;
};

export type TransitionOpts = {
  dir?: TransitionDir;
  accent?: string;
  /** dimensão do canvas no eixo da transição (px). Default 1080 (largura vertical). */
  size?: number;
};

const p = (v: number) => clamp(v, 0, 1);

// Easing manual (sem precisar de Easing.bezier no call-site): suaviza o progress.
const ease = (t: number, k: readonly [number, number, number, number] = EASINGS.standard): number => {
  // aproximação cúbica de bézier 1D (controle y) — suficiente p/ transições visuais
  const [, y1, , y2] = k;
  const u = p(t);
  return 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
};

// ─── 1. WIPE — cena B revela por trás de uma máscara que abre na direção ─────
export const wipe = (progress: number, opts: TransitionOpts = {}): TransitionPair => {
  const t = p(progress);
  const dir = opts.dir ?? 'left';
  const pct = Math.round(t * 100);
  // clip-path: B vai sendo revelada conforme a borda avança
  const inset: Record<TransitionDir, string> = {
    left: `inset(0 0 0 ${100 - pct}%)`,
    right: `inset(0 ${100 - pct}% 0 0)`,
    up: `inset(${100 - pct}% 0 0 0)`,
    down: `inset(0 0 ${100 - pct}% 0)`,
  };
  return {
    outgoing: { opacity: 1 },
    incoming: { clipPath: inset[dir], opacity: 1 },
  };
};

// ─── 2. SLIDE PUSH — A sai empurrada e B entra ocupando o lugar ──────────────
export const slidePush = (progress: number, opts: TransitionOpts = {}): TransitionPair => {
  const t = ease(progress, EASINGS.standard);
  const dir = opts.dir ?? 'left';
  const d = opts.size ?? 1080;
  const map: Record<TransitionDir, { out: string; in: string }> = {
    left: {
      out: `translateX(${-d * t}px)`,
      in: `translateX(${d * (1 - t)}px)`,
    },
    right: {
      out: `translateX(${d * t}px)`,
      in: `translateX(${-d * (1 - t)}px)`,
    },
    up: {
      out: `translateY(${-d * t}px)`,
      in: `translateY(${d * (1 - t)}px)`,
    },
    down: {
      out: `translateY(${d * t}px)`,
      in: `translateY(${-d * (1 - t)}px)`,
    },
  };
  return {
    outgoing: { transform: map[dir].out },
    incoming: { transform: map[dir].in },
  };
};

// ─── 3. ZOOM BLUR — A dá zoom-in + blur saindo, B entra de zoom-out nítida ───
export const zoomBlur = (progress: number): TransitionPair => {
  const t = ease(progress, EASINGS.accel);
  const outScale = interpolate(t, [0, 1], [1, 1.6]);
  const outBlur = interpolate(t, [0, 1], [0, 18]);
  const inScale = interpolate(t, [0, 1], [1.4, 1]);
  const inBlur = interpolate(t, [0, 1], [16, 0]);
  return {
    outgoing: {
      transform: `scale(${outScale})`,
      filter: `blur(${outBlur}px)`,
      opacity: interpolate(t, [0, 0.7, 1], [1, 0.4, 0]),
    },
    incoming: {
      transform: `scale(${inScale})`,
      filter: `blur(${inBlur}px)`,
      opacity: interpolate(t, [0, 0.3, 1], [0, 0.6, 1]),
    },
  };
};

// ─── 4. GLITCH CUT — corte cyber: jitter, RGB split e flash de accent ────────
export const glitchCut = (progress: number, opts: TransitionOpts = {}): TransitionPair => {
  const t = p(progress);
  const accent = opts.accent ?? '#2FD4C4';
  // pico de glitch no meio da transição
  const intensity = Math.sin(t * Math.PI); // 0 -> 1 -> 0
  // jitter pseudo-aleatório determinístico (sem random pra render reprodutível)
  const jitterX = Math.round(Math.sin(t * 90) * 14 * intensity);
  const jitterY = Math.round(Math.cos(t * 70) * 8 * intensity);
  const rgbSplit = 6 * intensity;
  const flash = intensity > 0.85 ? 0.35 : 0;
  const sharedFilter = `drop-shadow(${rgbSplit}px 0 0 ${accent}) drop-shadow(${-rgbSplit}px 0 0 #ff2d6f)`;
  return {
    outgoing: {
      opacity: t < 0.5 ? 1 : 0,
      transform: `translate(${jitterX}px, ${jitterY}px)`,
      filter: sharedFilter,
    },
    incoming: {
      opacity: t < 0.5 ? 0 : 1,
      transform: `translate(${-jitterX}px, ${-jitterY}px)`,
      filter: sharedFilter,
      // flash neon no auge do corte
      boxShadow: flash ? `inset 0 0 240px ${accent}` : undefined,
    },
  };
};

// ─── 5. WHIP PAN — movimento rápido + motion blur lateral (estilo MrBeast) ───
export const whipPan = (progress: number, opts: TransitionOpts = {}): TransitionPair => {
  const t = p(progress);
  const dir = opts.dir ?? 'left';
  const d = opts.size ?? 1080;
  // velocidade pico no meio -> blur direcional forte só no cruzamento
  const speed = Math.sin(t * Math.PI);
  const blur = Math.round(speed * 40);
  const horizontal = dir === 'left' || dir === 'right';
  const sign = dir === 'left' || dir === 'up' ? -1 : 1;
  const outShift = sign * d * ease(t, EASINGS.accel);
  const inShift = sign * -d * (1 - ease(t, EASINGS.decel));
  const axis = horizontal ? 'translateX' : 'translateY';
  const blurDir = horizontal ? `blur(${blur}px)` : `blur(${blur}px)`;
  return {
    outgoing: {
      transform: `${axis}(${outShift}px)`,
      filter: blurDir,
      opacity: interpolate(t, [0, 0.6, 1], [1, 0.5, 0]),
    },
    incoming: {
      transform: `${axis}(${inShift}px)`,
      filter: blurDir,
      opacity: interpolate(t, [0, 0.4, 1], [0, 0.6, 1]),
    },
  };
};

// ─── Registro nomeado pra consumo dinâmico (ex.: diretor automático) ─────────
export type TransitionFn = (progress: number, opts?: TransitionOpts) => TransitionPair;

export const TRANSITIONS: Record<string, TransitionFn> = {
  wipe,
  slidePush,
  zoomBlur,
  glitchCut,
  whipPan,
};

export type TransitionName = keyof typeof TRANSITIONS;
