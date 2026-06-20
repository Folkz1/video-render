import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

// ─────────────────────────────────────────────────────────────────────────────
// FilmGrainScanline — IDENTIDADE VISUAL "Terminal-Noir"
//
// Overlay GLOBAL (zIndex alto, renderizado SEMPRE no fim do CaptionClip) que mata
// o aspecto "AI slop" / digital-limpo-demais do render: dá textura de película e
// um leve look CRT/terminal, em intensidade DISCRETA (premium, não exagerado).
//
// Três camadas:
//  1) FILM GRAIN ~3-6%: ruído via SVG feTurbulence (fractalNoise) → 100% determinístico,
//     sem asset externo, sem @keyframes. O grão "vive" um pouco animando o baseFrequency
//     com interpolate(frame) (não é @keyframes — Remotion-safe; cada frame é estático).
//  2) SCANLINE CRT: repeating-linear-gradient 1px transparente / 1px rgba(0,0,0,0.03).
//  3) VIGNETTE radial suave: escurece os cantos, foca o centro.
//
// REGRA DURA: SÓ CSS estático / interpolate — ZERO @keyframes (não suportados no
// render do Remotion). mixBlendMode garante que o grão module a imagem sem lavá-la.
// ─────────────────────────────────────────────────────────────────────────────

export type FilmGrainScanlineProps = {
  /** Opacidade do grão (0..1). Default 0.05 (~5%, dentro da faixa 3-6% pedida). */
  grainOpacity?: number;
  /** zIndex do overlay. Alto pra ficar por cima de tudo. Default 80. */
  zIndex?: number;
};

export const FilmGrainScanline: React.FC<FilmGrainScanlineProps> = ({
  grainOpacity = 0.05,
  zIndex = 80,
}) => {
  const frame = useCurrentFrame();

  // baseFrequency oscila MUITO de leve pra o grão "respirar" (sem @keyframes):
  // cada frame escolhe um valor estático no range — leitura determinística do frame.
  const bf = interpolate(frame % 6, [0, 5], [0.85, 0.92], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // SVG de ruído (fractalNoise) como data-URI → background-image tileável e nítido.
  const grainSvg =
    `data:image/svg+xml;utf8,` +
    encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>` +
        `<filter id='n'>` +
        `<feTurbulence type='fractalNoise' baseFrequency='${bf.toFixed(3)}' numOctaves='2' stitchTiles='stitch'/>` +
        `<feColorMatrix type='saturate' values='0'/>` +
        `</filter>` +
        `<rect width='100%' height='100%' filter='url(%23n)'/>` +
      `</svg>`,
    );

  return (
    <AbsoluteFill style={{ zIndex, pointerEvents: 'none' }}>
      {/* 1) FILM GRAIN — ruído monocromático, blend overlay pra modular a imagem */}
      <AbsoluteFill
        style={{
          backgroundImage: `url("${grainSvg}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
          opacity: grainOpacity,
          mixBlendMode: 'overlay',
        }}
      />
      {/* 2) SCANLINE CRT — linhas horizontais sutilíssimas (1px on / 1px off) */}
      <AbsoluteFill
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0,0,0,0.03) 1px, rgba(0,0,0,0.03) 2px)',
        }}
      />
      {/* 3) VIGNETTE radial suave — escurece os cantos, foca o centro */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(120% 100% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.16) 82%, rgba(0,0,0,0.42) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
