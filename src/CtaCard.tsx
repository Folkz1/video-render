import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { GUYFOLKZ_ACCENT, MONO_FONT } from './kit/animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// CtaCard — CARD DE CTA VISUAL no FECHO do vídeo (Reel/Short).
//
// O problema (Diego): o CTA já flui pra FALA (TTS) + caption, mas NÃO tinha
// overlay na tela → passava batido. Este card resolve: aparece SÓ no fecho
// (últimos ~3-5s, quando a fala do CTA toca), entrada sutil (fade + slide-up),
// fica FIXO até o fim. CLARO/impossível de não ver, mas on-brand (não rouba o
// conteúdo, que é 90% do valor).
//
// On-brand Terminal-Noir: verde #3DF07A (GUYFOLKZ_ACCENT), card de fundo escuro
// translúcido + borda/glow verde + mono JetBrains — consistente com o lower-third.
//
// USO: montar dentro de uma <Sequence> que cobre SÓ a janela do fecho. O frame é
// LOCAL (reseta a 0 no `from`), então a entrada anima a partir do início do fecho.
// Posicionado por `anchorY` (centro vertical, default no terço final ACIMA da
// legenda karaokê e do lower-third 'guyfolkz', pra não colidir).
// ─────────────────────────────────────────────────────────────────────────────

export type CtaCardProps = {
  /** linha principal do CTA — curta/legível/GRANDE. Default on-brand. */
  ctaText?: string;
  /** handle do canal (ex '@guyfolkz') — vira a 2ª linha mono. */
  handle?: string;
  /** cor neon (= accent do brand). Default verde-terminal GuyFolkz. */
  accent?: string;
  /** centro vertical do card em px (canvas 1920). Default 1380 (terço final,
   *  ACIMA da legenda karaokê ~1640 e do lower-third ~1894). */
  anchorY?: number;
  /** escala da fonte (px da linha principal). Default 56. */
  fontSize?: number;
};

const DEF_TEXT = 'Me chama no inbox';

const handleSlug = (handle?: string): string => {
  const s = (handle || '').trim();
  if (!s) return '@guyfolkz';
  return s.startsWith('@') ? s : '@' + s.replace(/^@+/, '');
};

// remove emojis do texto vindo do backend: o render headless (cap-render) NÃO tem
// fonte de emoji colorida (só noto-cjk/freefont/liberation) → '📩' viraria tofu (□).
// O ícone de envelope é DESENHADO em CSS abaixo (sempre legível, on-brand).
const stripEmoji = (s: string): string =>
  s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/gu, '').trim();

// ENVELOPE desenhado em CSS (verde accent) — substitui o emoji 📩 (sem dependência de
// fonte de emoji no render). Retângulo + a "aba" triangular via clip-path.
const EnvelopeIcon: React.FC<{ accent: string; size?: number }> = ({ accent, size = 44 }) => {
  const w = size;
  const h = Math.round(size * 0.72);
  return (
    <div style={{ position: 'relative', width: w, height: h, flex: '0 0 auto' }}>
      {/* corpo do envelope */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: `3px solid ${accent}`,
          borderRadius: 6,
          background: 'rgba(0,0,0,0.25)',
          boxShadow: `0 0 12px ${accent}55`,
        }}
      />
      {/* aba (V) do envelope */}
      <div
        style={{
          position: 'absolute',
          left: 3,
          right: 3,
          top: 3,
          height: h * 0.56,
          borderBottom: `3px solid ${accent}`,
          clipPath: 'polygon(0 0, 50% 100%, 100% 0)',
        }}
      />
    </div>
  );
};

export const CtaCard: React.FC<CtaCardProps> = ({
  ctaText,
  handle,
  accent = GUYFOLKZ_ACCENT,
  anchorY = 1380,
  fontSize = 56,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // entrada SUTIL: spring soft → slide-up + fade nos primeiros ~0.5s; depois FIXO.
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.8, stiffness: 90 } });
  const opacity = interpolate(enter, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = interpolate(enter, [0, 1], [34, 0]);

  // glow verde respirando (sutil) — sinaliza "vivo" sem competir com a legenda.
  const glow = interpolate(
    Math.sin((frame / 38) * Math.PI * 2),
    [-1, 1],
    [0.5, 1.0],
  );

  const text = stripEmoji((ctaText || '').trim()) || DEF_TEXT;
  const slug = handleSlug(handle);

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: anchorY,
        transform: `translateY(${translateY}px)`,
        opacity,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 58, // ACIMA da legenda karaokê (40) e dos cards; ABAIXO de grain/scanline (alto)
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          // card escuro TRANSLÚCIDO + borda/glow verde (Terminal-Noir, casa o lower-third).
          background: 'rgba(8,10,16,0.82)',
          border: `2px solid ${accent}`,
          borderRadius: 18,
          padding: '20px 40px',
          maxWidth: 900,
          boxShadow: `0 0 ${Math.round(30 * glow)}px ${accent}, 0 0 ${Math.round(
            56 * glow,
          )}px ${accent}44, 0 12px 36px rgba(0,0,0,0.6)`,
        }}
      >
        {/* linha principal — envelope DESENHADO (verde) + texto GRANDE branco com stroke */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'center' }}>
          <EnvelopeIcon accent={accent} size={Math.round(fontSize * 0.86)} />
          <span
            style={{
              color: '#fff',
              fontFamily: 'Montserrat, Poppins, Inter, Segoe UI, sans-serif',
              fontWeight: 900,
              fontSize,
              lineHeight: 1.05,
              textAlign: 'center',
              letterSpacing: '-0.01em',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
              textShadow: '0 3px 12px rgba(0,0,0,0.7)',
            }}
          >
            {text}
          </span>
        </div>
        {/* handle — prompt mono verde (assinatura terminal, ecoa o lower-third) */}
        <span
          style={{
            color: accent,
            fontFamily: MONO_FONT,
            fontWeight: 700,
            fontSize: Math.round(fontSize * 0.62),
            letterSpacing: '0.01em',
            textShadow: `0 0 12px ${accent}66`,
          }}
        >
          {slug}
        </span>
      </div>
    </div>
  );
};

export default CtaCard;
