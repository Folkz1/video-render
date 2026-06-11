import React from 'react';
import { interpolate, spring, type SpringConfig, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  DISPLAY_FONT,
  SPRINGS,
  clamp,
  glowPulse,
  heavyStroke,
  neonText,
  popIn,
} from '../kit/animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// EditorialCards — cards de motion-graphics REUTILIZÁVEIS pro CaptionClip (narração
// longa). Unificam a estética da Dossie (cards ano/timeline/stat/banner/fecho,
// entrada spring + saída fade via janela) e do ShortTech (números gigantes, stagger,
// glow neon), mas parametrizados por UMA cor de accent (= paleta_hex do clip) pra
// servir qualquer nicho.
//
// Cada card preenche a janela em que é montado (de inicio_s a fim_s do plano). A
// animação é RELATIVA à <Sequence> (frame local começa em 0): entra com spring sutil
// (~0.4s), segura, e some por fade (~0.3s). Janelas-alvo de 3-6s.
//
// Convenção de fundo: o CaptionClip mantém o plano anterior ESCURECIDO por baixo do
// card (continuidade visual); estes componentes só desenham o overlay editorial e
// não pintam fundo opaco — exceto o ChapterCard, que é um "respiro" de capítulo e
// pode escurecer mais. Use `fundoSolido` pra forçar um backdrop opaco da paleta.
// ─────────────────────────────────────────────────────────────────────────────

const SERIF = 'Georgia, "Times New Roman", serif';

// janela: opacity (fade-in 0.4s / fade-out 0.3s) + spring de entrada (appear 0..1).
// Idêntico em espírito ao useSegAnim da Dossie, mas mola configurável.
const useCardWindow = (durSec: number, config: Partial<SpringConfig> = SPRINGS.soft) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = Math.max(0.8, durSec);
  const opacity = interpolate(t, [0, 0.4, d - 0.3, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const appear = spring({ frame, fps, config });
  return { frame, fps, opacity, appear };
};

// micro-impact: shake sutil de 1-2 frames na ENTRADA (sinaliza "batida"). Determinístico.
const impactShake = (frame: number, ampPx = 9): number => {
  if (frame > 6) return 0;
  const decay = interpolate(frame, [0, 6], [1, 0], { extrapolateRight: 'clamp' });
  return Math.sin(frame * 1.7) * ampPx * decay;
};

// backdrop opcional (escurece/tinge o que está por baixo) — usado quando o card
// pede `fundoSolido` ou quando o ChapterCard quer um respiro mais limpo.
const Backdrop: React.FC<{ accent: string; intensidade?: number }> = ({ accent, intensidade = 0.82 }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(120% 90% at 50% 38%, ${accent}1f 0%, rgba(5,6,10,${intensidade}) 58%, rgba(5,6,10,${Math.min(0.98, intensidade + 0.12)}) 100%)`,
    }}
  />
);

// ── StatCard — número GIGANTE com count-up + label ───────────────────────────
export type StatCardProps = {
  valor: string; // ex.: "700", "R$40M", "100M", "3x"
  texto?: string; // label abaixo do número
  accent: string;
  durSec: number;
  offsetY?: number; // empurra pra metade de baixo no split universal
  fundoSolido?: boolean;
};

export const StatCard: React.FC<StatCardProps> = ({ valor, texto, accent, durSec, offsetY = 0, fundoSolido }) => {
  const { frame, opacity, appear } = useCardWindow(durSec, SPRINGS.punchy);
  // count-up: anima só a parte numérica, preservando prefixo/sufixo (R$, M, x, %).
  const m = valor.match(/[\d.,]+/);
  let display = valor;
  if (m) {
    const target = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
    if (!Number.isNaN(target) && target >= 1) {
      const cur = Math.round(interpolate(appear, [0, 1], [0, target], { extrapolateRight: 'clamp' }));
      display = valor.replace(/[\d.,]+/, cur.toLocaleString('pt-BR'));
    }
  }
  const scale = interpolate(appear, [0, 1], [0.55, 1]);
  const glow = glowPulse(frame, 30, 0.5, 1);
  const shake = impactShake(frame, 7);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 36 }}>
      {fundoSolido ? <Backdrop accent={accent} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateX(${shake}px)`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 900,
            fontSize: 210,
            lineHeight: 1,
            color: accent,
            letterSpacing: '-0.03em',
            transform: `scale(${scale})`,
            ...heavyStroke(10),
            ...neonText(accent, glow),
          }}
        >
          {display}
        </div>
        {texto ? (
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: 42,
              color: '#fff',
              marginTop: 18,
              textAlign: 'center',
              maxWidth: 880,
              padding: '0 60px',
              opacity: interpolate(appear, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              textShadow: '0 3px 14px rgba(0,0,0,0.8)',
            }}
          >
            {texto}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── KeywordCard — palavra-chave estourando (stagger por palavra + glow) ──────
export type KeywordCardProps = {
  texto: string; // 1-4 palavras idealmente
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
};

export const KeywordCard: React.FC<KeywordCardProps> = ({ texto, accent, durSec, offsetY = 0, fundoSolido }) => {
  const { frame, fps, opacity } = useCardWindow(durSec, SPRINGS.punchy);
  const glow = glowPulse(frame, 26, 0.55, 1);
  const palavras = texto.trim().split(/\s+/).filter(Boolean);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 37 }}>
      {fundoSolido ? <Backdrop accent={accent} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          alignContent: 'center',
          gap: '0 28px',
          padding: '0 70px',
        }}
      >
        {palavras.map((w, i) => {
          // stagger: cada palavra entra ~3 frames depois da anterior, com overshoot.
          const s = spring({ frame: frame - 2 - i * 3, fps, config: SPRINGS.punchy });
          const sc = interpolate(s, [0, 1], [0.4, 1]);
          const ty = interpolate(s, [0, 1], [44, 0]);
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: DISPLAY_FONT,
                fontWeight: 900,
                fontSize: 138,
                lineHeight: 1.02,
                color: accent,
                textTransform: 'uppercase',
                letterSpacing: '-0.02em',
                opacity: interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${ty}px) scale(${sc})`,
                ...heavyStroke(9),
                ...neonText(accent, glow),
              }}
            >
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ── BannerCard — faixa de tensão/afirmação (slide lateral + barra de accent) ─
export type BannerCardProps = {
  texto: string;
  sub?: string;
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
};

export const BannerCard: React.FC<BannerCardProps> = ({ texto, sub, accent, durSec, offsetY = 0, fundoSolido }) => {
  const { frame, opacity, appear } = useCardWindow(durSec, SPRINGS.soft);
  const slideX = interpolate(appear, [0, 1], [-48, 0]);
  const shake = impactShake(frame, 6);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 36 }}>
      {fundoSolido ? <Backdrop accent={accent} intensidade={0.7} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 56px',
          transform: `translateX(${slideX + shake}px)`,
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 920,
            background: accent,
            color: '#05060a',
            fontFamily: DISPLAY_FONT,
            fontWeight: 900,
            fontSize: 56,
            lineHeight: 1.08,
            padding: '24px 34px',
            borderRadius: 14,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            boxShadow: `0 0 ${Math.round(40 * glowPulse(frame, 34, 0.5, 1))}px ${accent}88, 0 14px 40px rgba(0,0,0,0.5)`,
          }}
        >
          {texto}
        </div>
        {sub ? (
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 600,
              fontSize: 34,
              color: 'rgba(255,255,255,0.9)',
              marginTop: 20,
              textAlign: 'center',
              maxWidth: 880,
              lineHeight: 1.32,
              opacity: interpolate(appear, [0.35, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              textShadow: '0 3px 14px rgba(0,0,0,0.85)',
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── QuoteCard — citação com aspas grandes (fade + sobe) ──────────────────────
export type QuoteCardProps = {
  texto: string; // a citação (sem aspas — o card desenha)
  autor?: string; // atribuição opcional
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
};

export const QuoteCard: React.FC<QuoteCardProps> = ({ texto, autor, accent, durSec, offsetY = 0, fundoSolido }) => {
  const { opacity, appear } = useCardWindow(durSec, SPRINGS.soft);
  const ty = interpolate(appear, [0, 1], [26, 0]);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 36 }}>
      {fundoSolido ? <Backdrop accent={accent} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 80px',
          transform: `translateY(${ty}px)`,
        }}
      >
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 180,
            lineHeight: 0.6,
            color: accent,
            opacity: 0.85,
            marginBottom: 8,
            textShadow: `0 0 26px ${accent}66`,
          }}
        >
          {'“'}
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 58,
            lineHeight: 1.3,
            color: '#fff',
            textAlign: 'center',
            maxWidth: 920,
            textShadow: '0 4px 18px rgba(0,0,0,0.85)',
          }}
        >
          {texto}
        </div>
        {autor ? (
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 700,
              fontSize: 32,
              color: accent,
              marginTop: 28,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              opacity: interpolate(appear, [0.4, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            }}
          >
            {`— ${autor}`}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ── ChapterCard — capítulo numerado (respiro/transição de bloco) ─────────────
export type ChapterCardProps = {
  texto: string; // título do capítulo
  valor?: string; // número do capítulo (ex.: "01", "1", "PARTE 2") — opcional
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean; // default TRUE (capítulo é um respiro limpo)
};

export const ChapterCard: React.FC<ChapterCardProps> = ({ texto, valor, accent, durSec, offsetY = 0, fundoSolido = true }) => {
  const { frame, fps, opacity, appear } = useCardWindow(durSec, SPRINGS.soft);
  // linha que cresce do centro pros lados
  const lineW = interpolate(appear, [0, 1], [0, 220]);
  const numScale = popIn(frame, fps, 0, 0.5, SPRINGS.punchy).scale;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 38 }}>
      {fundoSolido ? <Backdrop accent={accent} intensidade={0.9} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 70px',
        }}
      >
        {valor ? (
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 900,
              fontSize: 120,
              lineHeight: 1,
              color: accent,
              transform: `scale(${numScale})`,
              ...neonText(accent, glowPulse(frame, 32, 0.5, 1)),
            }}
          >
            {valor}
          </div>
        ) : null}
        <div style={{ width: lineW, height: 3, background: accent, margin: '24px 0', borderRadius: 2, boxShadow: `0 0 14px ${accent}` }} />
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 800,
            fontSize: 58,
            lineHeight: 1.12,
            color: '#fff',
            textAlign: 'center',
            maxWidth: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.01em',
            opacity: interpolate(appear, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            textShadow: '0 3px 16px rgba(0,0,0,0.8)',
          }}
        >
          {texto}
        </div>
      </div>
    </div>
  );
};

// tipos de plano que estes cards atendem (consumido pelo CaptionClip).
export type EditorialCardTipo = 'stat' | 'keyword' | 'banner' | 'quote' | 'capitulo';

export const isEditorialCardTipo = (t?: string): t is EditorialCardTipo =>
  t === 'stat' || t === 'keyword' || t === 'banner' || t === 'quote' || t === 'capitulo';

// helper de clamp re-exportado pra quem só importa este módulo
export { clamp };
