import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import {
  ACCENT_DEFAULT,
  DISPLAY_FONT,
  SPRINGS,
  clamp,
  fadeOut,
  glowPulse,
  heavyStroke,
  neonGlow,
  sec,
  slideIn,
} from '../kit/animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// Kit do Editor — FRENTE B — LowerThird.tsx
//
// Faixa inferior animada (título + subtítulo). Entra com slide+fade pela
// esquerda, segura, e sai com fade. Estilo neon GuyFolkz parametrizável por
// accent e posição. Sem assets externos — barra de accent + glow em CSS.
//
// Montar dentro de uma <Sequence> ou direto numa cena: ele se posiciona
// sozinho via fromSec/durSec relativos ao frame local.
// ─────────────────────────────────────────────────────────────────────────────

export type LowerThirdProps = {
  titulo: string;
  subtitulo?: string;
  /** cor neon (= paleta do brand). Default teal GuyFolkz. */
  accent?: string;
  /** quando aparece, em segundos a partir do frame local 0. Default 0.3. */
  fromSec?: number;
  /** quanto tempo fica na tela, em segundos. Default 3.5. */
  durSec?: number;
  /** ancoragem vertical. 'bottom' (default) | 'top'. */
  position?: 'bottom' | 'top';
  /** distância da borda (px). Default 150 (acima da zona de legenda). */
  marginPx?: number;
};

export const lowerThirdDefaultProps: LowerThirdProps = {
  titulo: 'Diego — GuyFolkz',
  subtitulo: 'IA, agentes e soberania técnica',
  accent: ACCENT_DEFAULT,
  fromSec: 0.3,
  durSec: 3.5,
  position: 'bottom',
  marginPx: 150,
};

export const LowerThird: React.FC<LowerThirdProps> = ({
  titulo,
  subtitulo,
  accent = ACCENT_DEFAULT,
  fromSec = 0.3,
  durSec = 3.5,
  position = 'bottom',
  marginPx = 150,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  const startFrame = sec(fromSec, fps);
  const endFrame = sec(fromSec + durSec, fps);
  if (frame < startFrame - 1) return null;

  // entrada: slide pela esquerda + fade
  const enter = slideIn(frame, fps, 'left', startFrame, 220, SPRINGS.soft);
  // saída: fade nos últimos 10 frames da janela
  const exit = fadeOut(frame, endFrame, 10);
  const opacity = clamp(enter.opacity * exit, 0, 1);

  if (opacity <= 0 && frame > startFrame) return null;

  const glow = glowPulse(frame, 40, 0.45, 0.95);
  const anchor =
    position === 'bottom'
      ? { bottom: marginPx }
      : { top: marginPx };

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        ...anchor,
        zIndex: 55,
        transform: `translateX(${enter.translateX}px)`,
        opacity,
        fontFamily: DISPLAY_FONT,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 6,
          maxWidth: '100%',
        }}
      >
        {/* título */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'stretch',
            background: 'rgba(8,12,22,0.86)',
            borderRadius: 14,
            padding: '16px 26px 16px 22px',
            border: `2px solid ${accent}`,
            ...neonGlow(accent, glow, 26),
          }}
        >
          {/* barra de accent vertical à esquerda */}
          <div
            style={{
              width: 8,
              borderRadius: 6,
              background: accent,
              marginRight: 18,
              boxShadow: `0 0 ${Math.round(16 * glow)}px ${accent}`,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span
              style={{
                color: '#fff',
                fontWeight: 900,
                fontSize: 52,
                lineHeight: 1.02,
                letterSpacing: '0.01em',
                ...heavyStroke(2),
              }}
            >
              {titulo}
            </span>
          </div>
        </div>

        {/* subtítulo: pílula menor, levemente deslocada */}
        {subtitulo ? (
          <div
            style={{
              marginLeft: 12,
              background: accent,
              color: BG_TEXT_ON_ACCENT,
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              padding: '8px 18px',
              borderRadius: 10,
              boxShadow: `0 4px 18px rgba(0,0,0,0.5)`,
            }}
          >
            {subtitulo}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// texto escuro sobre a pílula de accent (contraste garantido em accents claros)
const BG_TEXT_ON_ACCENT = '#05060a';

export default LowerThird;
