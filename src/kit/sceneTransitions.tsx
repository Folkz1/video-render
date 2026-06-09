import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { popIn, slideIn, fadeIn, type SlideDir, SPRINGS } from './animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// Kit do Editor — sceneTransitions.tsx
//
// <TransitionScene>: envelope LEVE que aplica uma ANIMAÇÃO DE ENTRADA sutil
// (transform/opacity via CSS) no conteúdo de uma cena, usando os presets puros
// de animationPresets.ts (popIn / slideIn / fadeIn). É 100% ADITIVO: se não
// passar nada, o default é um slideIn de baixo bem discreto (~12 frames).
//
// Como funciona: lê o frame LOCAL da Sequence (useCurrentFrame começa em 0 no
// início da Sequence/cena), calcula a entrada com mola/interpolate e devolve um
// wrapper com transform+opacity. Nenhuma lib nova, só os kits que já existem.
//
// Uso típico (ShortV2 / SplitReaction):
//   <TransitionScene entryAnim={cena.entrada_anim ?? 'slideIn'} entryDir="up">
//     ...conteúdo de texto/visual da cena...
//   </TransitionScene>
//
// IMPORTANTE: o componente envolve só o CONTEÚDO que deve "entrar" (texto/faixa),
// não o vídeo/imagem de fundo — pra não brigar com Ken Burns / crossfade da cena.
// ─────────────────────────────────────────────────────────────────────────────

export type EntryAnim = 'popIn' | 'slideIn' | 'fade' | 'none';

export type TransitionSceneProps = {
  /** Tipo de entrada. Default 'slideIn' (sutil, de baixo). 'none' = sem animação. */
  entryAnim?: EntryAnim;
  /** Direção do slideIn (default 'up' = entra de baixo subindo). */
  entryDir?: SlideDir;
  /** Duração da entrada em frames (default 12 — tasteful, rápido). */
  entryDurFrames?: number;
  /** Distância do slide em px (default 40 — discreto). */
  entryDistPx?: number;
  /** Escala inicial do popIn (default 0.86 — pop leve, não chamativo). */
  entryFromScale?: number;
  /** Frame local em que a entrada começa (default 0 = início da Sequence). */
  startFrame?: number;
  /** Estilos extras no wrapper (ex.: position/inset herdados do call-site). */
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

/**
 * Envelope de entrada animada para o conteúdo de uma cena.
 * Defaults TASTEFUL: slideIn de baixo, ~12 frames, mola suave (SPRINGS.soft),
 * 40px de deslocamento. Sutil o bastante pra melhorar QUALQUER vídeo sem
 * "poluir". Override por cena via props.
 */
export const TransitionScene: React.FC<TransitionSceneProps> = ({
  entryAnim = 'slideIn',
  entryDir = 'up',
  entryDurFrames = 12,
  entryDistPx = 40,
  entryFromScale = 0.86,
  startFrame = 0,
  style,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 'none' = passthrough total (zero overhead visual; mantém compat exata).
  if (entryAnim === 'none') {
    return <div style={style}>{children}</div>;
  }

  let transform = 'none';
  let opacity = 1;

  if (entryAnim === 'popIn') {
    // mola suave (não punchy) pra um pop discreto — fromScale alto = pouco zoom.
    const { scale, opacity: op } = popIn(frame, fps, startFrame, entryFromScale, SPRINGS.soft);
    transform = `scale(${scale})`;
    opacity = op;
  } else if (entryAnim === 'slideIn') {
    const { translateX, translateY, opacity: op } = slideIn(
      frame,
      fps,
      entryDir,
      startFrame,
      entryDistPx,
      SPRINGS.soft,
    );
    transform = `translate(${translateX}px, ${translateY}px)`;
    opacity = op;
  } else {
    // 'fade' — só opacity, linear, ao longo de entryDurFrames.
    opacity = fadeIn(frame, startFrame, entryDurFrames);
  }

  return (
    <div
      style={{
        ...style,
        transform: transform === 'none' ? style?.transform : transform,
        opacity,
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
};
