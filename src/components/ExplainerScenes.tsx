import React from 'react';
import { interpolate, spring, type SpringConfig, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  DISPLAY_FONT,
  SPRINGS,
  clamp,
  glowPulse,
  heavyStroke,
  neonText,
} from '../kit/animationPresets';

// ─────────────────────────────────────────────────────────────────────────────
// ExplainerScenes — motion-graphics que EXPLICAM CONCEITOS (não só cards de texto).
// Pedido do Diego: "animações realmente CRIADAS explicando o que está sendo feito".
//
// 4 cenas parametrizadas, irmãs dos EditorialCards (mesma estética: spring punchy,
// glow neon, paleta accent, stroke preto pra legibilidade sobre b-roll). Cada cena
// preenche a janela em que é montada (de inicio_s a fim_s do plano), entra com
// construção animada — o desenho se MONTA na frente do espectador — segura, e some
// por fade. Janelas-alvo de 4-8s (mais longas que os cards, porque CONSTROEM algo).
//
// O Diretor de EDL invoca estas cenas com `dados` extraídos do que é DITO:
//   - FlowDiagram  → processo/etapas descritas na fala
//   - CompareAB    → comparação explícita (X vs Y)
//   - GrowChart    → série de números / evolução
//   - TimelineScene→ datas/fases (2024 → 2025 → 2026)
//
// Convenção de fundo idêntica aos EditorialCards: a cena NÃO pinta fundo opaco por
// padrão (fica sobre o plano anterior escurecido, continuidade visual); `fundoSolido`
// força um backdrop da paleta. As animações são RELATIVAS à <Sequence> (frame local
// começa em 0).
// ─────────────────────────────────────────────────────────────────────────────

// janela: opacity (fade-in 0.4s / fade-out 0.4s) — saída um pouco mais longa que os
// cards porque a cena tem mais "peso" visual e merece um respiro ao sair.
const useSceneWindow = (durSec: number) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const d = Math.max(0.8, durSec);
  const opacity = interpolate(t, [0, 0.4, d - 0.4, d], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return { frame, fps, t, d, opacity };
};

// progresso 0..1 de um "passo" da construção que começa em startSec e dura durSec.
const stepProgress = (t: number, startSec: number, durSec = 0.5): number =>
  clamp((t - startSec) / Math.max(0.0001, durSec), 0, 1);

// mola 0..1 a partir de um frame de início (construção dos elementos).
const springStep = (frame: number, fps: number, startFrame: number, config: Partial<SpringConfig> = SPRINGS.punchy): number =>
  spring({ frame: frame - startFrame, fps, config });

const Backdrop: React.FC<{ accent: string; intensidade?: number }> = ({ accent, intensidade = 0.84 }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: `radial-gradient(120% 90% at 50% 40%, ${accent}22 0%, rgba(5,6,10,${intensidade}) 58%, rgba(5,6,10,${Math.min(0.98, intensidade + 0.12)}) 100%)`,
    }}
  />
);

const SceneTitle: React.FC<{ titulo: string; accent: string; appear: number; offsetY?: number }> = ({ titulo, accent, appear, offsetY = 0 }) => (
  <div
    style={{
      position: 'absolute',
      top: 150 + offsetY,
      left: 0,
      right: 0,
      textAlign: 'center',
      padding: '0 70px',
      opacity: interpolate(appear, [0, 1], [0, 1], { extrapolateRight: 'clamp' }),
      transform: `translateY(${interpolate(appear, [0, 1], [-18, 0])}px)`,
    }}
  >
    <span
      style={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 900,
        fontSize: 52,
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: '0.01em',
        ...heavyStroke(6),
        textShadow: `0 0 24px ${accent}66, 0 3px 14px rgba(0,0,0,0.8)`,
      }}
    >
      {titulo}
    </span>
  </div>
);

// ── 1. FlowDiagram — fluxo de 3-5 nós que se conectam em sequência ────────────
// Cada nó aparece com spring → a seta cresce até o próximo → o próximo nó aparece.
// Highlight progressivo: o nó "ativo" no momento brilha mais forte.
export type FlowStep = { label: string; emoji?: string };
export type FlowDiagramProps = {
  etapas: FlowStep[];
  titulo?: string;
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
  orientacao?: 'horizontal' | 'vertical'; // default: auto (>=4 nós → vertical no 9:16)
};

export const FlowDiagram: React.FC<FlowDiagramProps> = ({ etapas, titulo, accent, durSec, offsetY = 0, fundoSolido, orientacao }) => {
  const { frame, fps, t, opacity } = useSceneWindow(durSec);
  const passos = (etapas || []).filter((e) => e && e.label).slice(0, 5);
  const n = Math.max(1, passos.length);
  const titleAppear = springStep(frame, fps, 0, SPRINGS.soft);
  // orçamento de tempo: cada nó+seta consome uma fatia do começo da janela (deixa ~30% de respiro).
  const buildEnd = Math.max(1.4, durSec * 0.66);
  const perStep = buildEnd / n;
  const vertical = orientacao ? orientacao === 'vertical' : n >= 4;

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 37 }}>
      {fundoSolido ? <Backdrop accent={accent} /> : null}
      {titulo ? <SceneTitle titulo={titulo} accent={accent} appear={titleAppear} offsetY={offsetY} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY + (titulo ? 80 : 0),
          display: 'flex',
          flexDirection: vertical ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 0,
          padding: vertical ? '0 90px' : '0 56px',
        }}
      >
        {passos.map((e, i) => {
          const startSec = 0.2 + i * perStep;
          const s = springStep(frame, fps, Math.round(startSec * fps), SPRINGS.punchy);
          const sc = interpolate(s, [0, 1], [0.45, 1]);
          const nodeOp = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
          // highlight: o nó é "ativo" enquanto sua seta de saída cresce (passo i → i+1).
          const ativo = clamp((t - startSec) / Math.max(0.0001, perStep), 0, 1) > 0 && (t - startSec) < perStep * 1.4;
          const glow = ativo ? glowPulse(frame, 22, 0.7, 1) : 0.4;
          // seta DESTE nó pro próximo (cresce 0..1 logo após o nó aparecer).
          const arrowP = i < n - 1 ? stepProgress(t, startSec + perStep * 0.45, perStep * 0.55) : 0;
          return (
            <React.Fragment key={i}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  opacity: nodeOp,
                  transform: `scale(${sc})`,
                }}
              >
                <div
                  style={{
                    minWidth: vertical ? 420 : 200,
                    maxWidth: vertical ? 560 : 240,
                    padding: vertical ? '22px 30px' : '26px 18px',
                    borderRadius: 22,
                    background: `${accent}1a`,
                    border: `3px solid ${accent}`,
                    boxShadow: `0 0 ${Math.round(34 * glow)}px ${accent}${ativo ? 'aa' : '55'}, 0 14px 36px rgba(0,0,0,0.5)`,
                    textAlign: 'center',
                  }}
                >
                  {e.emoji ? <div style={{ fontSize: vertical ? 56 : 48, lineHeight: 1, marginBottom: 8 }}>{e.emoji}</div> : null}
                  <div
                    style={{
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 800,
                      fontSize: vertical ? 40 : 30,
                      lineHeight: 1.08,
                      color: '#fff',
                      textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                    }}
                  >
                    {e.label}
                  </div>
                </div>
              </div>
              {i < n - 1 ? (
                <FlowArrow accent={accent} progress={arrowP} vertical={vertical} />
              ) : null}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

const FlowArrow: React.FC<{ accent: string; progress: number; vertical: boolean }> = ({ accent, progress, vertical }) => {
  const len = vertical ? 56 : 74;
  const grown = Math.max(2, len * progress);
  const headOp = progress > 0.7 ? interpolate(progress, [0.7, 1], [0, 1], { extrapolateLeft: 'clamp' }) : 0;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: vertical ? '100%' : len + 18,
        height: vertical ? len + 18 : '100%',
        margin: vertical ? '4px 0' : '0 6px',
      }}
    >
      <div
        style={{
          background: accent,
          borderRadius: 4,
          boxShadow: `0 0 12px ${accent}aa`,
          width: vertical ? 6 : grown,
          height: vertical ? grown : 6,
        }}
      />
      <div
        style={{
          width: 0,
          height: 0,
          opacity: headOp,
          borderStyle: 'solid',
          ...(vertical
            ? { borderWidth: '16px 11px 0 11px', borderColor: `${accent} transparent transparent transparent` }
            : { borderWidth: '11px 0 11px 16px', borderColor: `transparent transparent transparent ${accent}` }),
          filter: `drop-shadow(0 0 8px ${accent}aa)`,
        }}
      />
    </div>
  );
};

// ── 2. CompareAB — duas colunas que entram em slide opostos + selo no vencedor ─
export type CompareSide = { label: string; pontos: string[] };
export type CompareABProps = {
  a: CompareSide;
  b: CompareSide;
  vencedor?: 'a' | 'b';
  titulo?: string;
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
};

export const CompareAB: React.FC<CompareABProps> = ({ a, b, vencedor, titulo, accent, durSec, offsetY = 0, fundoSolido }) => {
  const { frame, fps, t, opacity } = useSceneWindow(durSec);
  const titleAppear = springStep(frame, fps, 0, SPRINGS.soft);
  // colunas entram opostas (A da esquerda, B da direita).
  const colA = springStep(frame, fps, Math.round(0.15 * fps), SPRINGS.soft);
  const colB = springStep(frame, fps, Math.round(0.25 * fps), SPRINGS.soft);
  // selo do vencedor entra perto do fim da construção.
  const seloStart = Math.max(1.2, durSec * 0.6);
  const selo = springStep(frame, fps, Math.round(seloStart * fps), SPRINGS.bouncy);
  const neutro = '#9aa3b2';

  const Coluna: React.FC<{ side: CompareSide; appear: number; dir: number; venceu: boolean }> = ({ side, appear, dir, venceu }) => {
    const tx = interpolate(appear, [0, 1], [dir * 120, 0]);
    const cor = venceu ? accent : neutro;
    const pontos = (side.pontos || []).slice(0, 4);
    return (
      <div
        style={{
          flex: 1,
          maxWidth: 460,
          opacity: interpolate(appear, [0, 1], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${tx}px)`,
        }}
      >
        <div
          style={{
            borderRadius: 22,
            border: `3px solid ${cor}`,
            background: venceu ? `${accent}1f` : 'rgba(255,255,255,0.04)',
            boxShadow: venceu ? `0 0 ${Math.round(34 * glowPulse(frame, 30, 0.5, 1))}px ${accent}88, 0 14px 36px rgba(0,0,0,0.5)` : '0 10px 28px rgba(0,0,0,0.45)',
            padding: '26px 24px',
          }}
        >
          <div
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 900,
              fontSize: 46,
              color: cor,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              marginBottom: 18,
              ...(venceu ? neonText(accent, glowPulse(frame, 30, 0.5, 1)) : {}),
            }}
          >
            {side.label}
          </div>
          {pontos.map((p, i) => {
            const ps = stepProgress(t, 0.5 + i * 0.18, 0.32);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  marginTop: i === 0 ? 0 : 14,
                  opacity: ps,
                  transform: `translateX(${interpolate(ps, [0, 1], [16, 0])}px)`,
                }}
              >
                <span style={{ color: cor, fontSize: 28, lineHeight: 1.2, fontWeight: 900 }}>{venceu ? '✓' : '•'}</span>
                <span
                  style={{
                    fontFamily: DISPLAY_FONT,
                    fontWeight: 600,
                    fontSize: 30,
                    lineHeight: 1.22,
                    color: '#fff',
                    textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                  }}
                >
                  {p}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 37 }}>
      {fundoSolido ? <Backdrop accent={accent} /> : null}
      {titulo ? <SceneTitle titulo={titulo} accent={accent} appear={titleAppear} offsetY={offsetY} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY + (titulo ? 70 : 0),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 22,
          padding: '0 50px',
        }}
      >
        <Coluna side={a} appear={colA} dir={-1} venceu={vencedor === 'a'} />
        {/* VS no meio */}
        <div
          style={{
            fontFamily: DISPLAY_FONT,
            fontWeight: 900,
            fontSize: 56,
            color: accent,
            opacity: interpolate(Math.min(colA, colB), [0.4, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            ...heavyStroke(7),
            ...neonText(accent, glowPulse(frame, 26, 0.5, 1)),
          }}
        >
          VS
        </div>
        <Coluna side={b} appear={colB} dir={1} venceu={vencedor === 'b'} />
      </div>
      {/* selo no vencedor */}
      {vencedor ? (
        <div
          style={{
            position: 'absolute',
            top: offsetY + (titulo ? 70 : 0),
            left: vencedor === 'a' ? '6%' : 'auto',
            right: vencedor === 'b' ? '6%' : 'auto',
            bottom: 0,
            margin: 'auto',
            height: 96,
            width: 96,
            zIndex: 40,
            opacity: interpolate(selo, [0, 1], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${interpolate(selo, [0, 1], [0.2, 1])}) rotate(${interpolate(selo, [0, 1], [-30, -12])}deg)`,
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: accent,
              color: '#05060a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: DISPLAY_FONT,
              fontWeight: 900,
              fontSize: 28,
              textAlign: 'center',
              lineHeight: 1,
              boxShadow: `0 0 30px ${accent}aa, 0 10px 26px rgba(0,0,0,0.5)`,
            }}
          >
            VENCE
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ── 3. GrowChart — gráfico que CRESCE animado (barras / linha) + count-up ──────
export type GrowDatum = { label: string; valor: number };
export type GrowChartProps = {
  tipo: 'barras' | 'linha';
  valores: GrowDatum[];
  destaque_idx?: number;
  titulo?: string;
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
};

export const GrowChart: React.FC<GrowChartProps> = ({ tipo, valores, destaque_idx, titulo, accent, durSec, offsetY = 0, fundoSolido }) => {
  const { frame, fps, t, opacity } = useSceneWindow(durSec);
  const titleAppear = springStep(frame, fps, 0, SPRINGS.soft);
  const dados = (valores || []).filter((d) => d && typeof d.valor === 'number' && Number.isFinite(d.valor)).slice(0, 7);
  const n = Math.max(1, dados.length);
  const maxV = Math.max(1, ...dados.map((d) => Math.abs(d.valor)));
  const neutro = '#9aa3b2';
  const chartW = 880;
  const chartH = 520;
  const buildEnd = Math.max(1.4, durSec * 0.6);
  const perStep = buildEnd / n;

  const fmt = (v: number): string => {
    const r = Math.round(v);
    return Math.abs(v) >= 1000 ? r.toLocaleString('pt-BR') : String(r);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 37 }}>
      {fundoSolido ? <Backdrop accent={accent} /> : null}
      {titulo ? <SceneTitle titulo={titulo} accent={accent} appear={titleAppear} offsetY={offsetY} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY + (titulo ? 70 : 0),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: chartW, height: chartH, position: 'relative' }}>
          {/* eixo base */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 78, height: 3, background: 'rgba(255,255,255,0.18)' }} />
          {tipo === 'barras' ? (
            <div style={{ position: 'absolute', inset: 0, bottom: 78, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 18 }}>
              {dados.map((d, i) => {
                const grow = stepProgress(t, 0.2 + i * perStep, perStep * 0.8);
                const hFull = (Math.abs(d.valor) / maxV) * (chartH - 150);
                const h = Math.max(4, hFull * grow);
                const isDest = destaque_idx === i;
                const cor = isDest ? accent : `${accent}88`;
                const numShown = Math.round(d.valor * grow);
                return (
                  <div key={i} style={{ flex: 1, maxWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                    <div
                      style={{
                        fontFamily: DISPLAY_FONT,
                        fontWeight: 900,
                        fontSize: isDest ? 50 : 36,
                        color: isDest ? accent : '#fff',
                        opacity: grow > 0.15 ? interpolate(grow, [0.15, 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0,
                        marginBottom: 8,
                        ...(isDest ? neonText(accent, glowPulse(frame, 26, 0.5, 1)) : {}),
                        textShadow: isDest ? undefined : '0 2px 8px rgba(0,0,0,0.7)',
                      }}
                    >
                      {fmt(numShown)}
                    </div>
                    <div
                      style={{
                        width: '78%',
                        height: h,
                        background: `linear-gradient(180deg, ${cor} 0%, ${accent}33 100%)`,
                        border: `2px solid ${cor}`,
                        borderRadius: '8px 8px 0 0',
                        boxShadow: isDest ? `0 0 ${Math.round(28 * glowPulse(frame, 28, 0.4, 1))}px ${accent}aa` : 'none',
                      }}
                    />
                    <div style={{ position: 'absolute', bottom: 32, fontFamily: DISPLAY_FONT, fontWeight: 700, fontSize: 26, color: isDest ? '#fff' : 'rgba(255,255,255,0.7)', textAlign: 'center', maxWidth: 150, lineHeight: 1.1 }}>
                      {d.label}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <LineChart dados={dados} maxV={maxV} chartW={chartW} chartH={chartH} t={t} frame={frame} accent={accent} destaqueIdx={destaque_idx} buildEnd={buildEnd} fmt={fmt} neutro={neutro} />
          )}
        </div>
      </div>
    </div>
  );
};

const LineChart: React.FC<{
  dados: GrowDatum[];
  maxV: number;
  chartW: number;
  chartH: number;
  t: number;
  frame: number;
  accent: string;
  destaqueIdx?: number;
  buildEnd: number;
  fmt: (v: number) => string;
  neutro: string;
}> = ({ dados, maxV, chartW, chartH, t, frame, accent, destaqueIdx, buildEnd, fmt }) => {
  const n = dados.length;
  if (n === 0) return null;
  const padX = 40;
  const usableW = chartW - padX * 2;
  const usableH = chartH - 150;
  const baseY = chartH - 78;
  const pts = dados.map((d, i) => {
    const x = padX + (n === 1 ? usableW / 2 : (i / (n - 1)) * usableW);
    const y = baseY - (Math.abs(d.valor) / maxV) * usableH;
    return { x, y, d };
  });
  // desenho da linha: progresso 0..1 ao longo de buildEnd. Revela ponto a ponto.
  const draw = clamp((t - 0.2) / buildEnd, 0, 1);
  const segShown = draw * (n - 1); // até onde a linha chegou (em índice fracionário)
  // monta o path até o ponto atual.
  let d = '';
  for (let i = 0; i < n; i++) {
    if (i > segShown) {
      // ponto parcial entre i-1 e i
      const prev = pts[i - 1];
      const frac = segShown - (i - 1);
      if (frac > 0 && prev) {
        const cx = prev.x + (pts[i].x - prev.x) * frac;
        const cy = prev.y + (pts[i].y - prev.y) * frac;
        d += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      }
      break;
    }
    d += `${i === 0 ? 'M' : ' L'} ${pts[i].x.toFixed(1)} ${pts[i].y.toFixed(1)}`;
  }
  return (
    <svg width={chartW} height={chartH} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <path d={d} fill="none" stroke={accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 10px ${accent}aa)` }} />
      {pts.map((p, i) => {
        const reveal = clamp(segShown - i + 1, 0, 1);
        if (reveal <= 0) return null;
        const isDest = destaqueIdx === i;
        return (
          <g key={i} opacity={reveal}>
            <circle cx={p.x} cy={p.y} r={isDest ? 14 : 9} fill={isDest ? accent : '#fff'} stroke={accent} strokeWidth={4} style={{ filter: isDest ? `drop-shadow(0 0 ${Math.round(16 * glowPulse(frame, 26, 0.5, 1))}px ${accent})` : undefined }} />
            <text x={p.x} y={p.y - (isDest ? 30 : 22)} fill={isDest ? accent : '#fff'} fontFamily={DISPLAY_FONT} fontWeight={900} fontSize={isDest ? 44 : 30} textAnchor="middle" style={{ paintOrder: 'stroke', stroke: '#000', strokeWidth: 4 } as React.CSSProperties}>
              {fmt(p.d.valor * reveal)}
            </text>
            <text x={p.x} y={baseY + 36} fill="rgba(255,255,255,0.72)" fontFamily={DISPLAY_FONT} fontWeight={700} fontSize={26} textAnchor="middle">
              {p.d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// ── 4. TimelineScene — linha do tempo horizontal, marcos acendendo em sequência ─
export type TimelineEvento = { ano: string; texto: string };
export type TimelineSceneProps = {
  eventos: TimelineEvento[];
  titulo?: string;
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
};

export const TimelineScene: React.FC<TimelineSceneProps> = ({ eventos, titulo, accent, durSec, offsetY = 0, fundoSolido }) => {
  const { frame, fps, t, opacity } = useSceneWindow(durSec);
  const titleAppear = springStep(frame, fps, 0, SPRINGS.soft);
  const evs = (eventos || []).filter((e) => e && (e.ano || e.texto)).slice(0, 5);
  const n = Math.max(1, evs.length);
  const buildEnd = Math.max(1.4, durSec * 0.66);
  const perStep = buildEnd / n;
  // a linha cresce primeiro, depois os marcos acendem em sequência.
  const lineGrow = clamp((t - 0.2) / Math.max(0.5, buildEnd * 0.5), 0, 1);

  return (
    <div style={{ position: 'absolute', inset: 0, opacity, zIndex: 37 }}>
      {fundoSolido ? <Backdrop accent={accent} /> : null}
      {titulo ? <SceneTitle titulo={titulo} accent={accent} appear={titleAppear} offsetY={offsetY} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          top: offsetY + (titulo ? 60 : 0),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ position: 'relative', width: 920, height: 420 }}>
          {/* trilho base (cinza) */}
          <div style={{ position: 'absolute', top: '50%', left: 30, right: 30, height: 5, background: 'rgba(255,255,255,0.14)', borderRadius: 3 }} />
          {/* trilho que cresce (accent) */}
          <div style={{ position: 'absolute', top: '50%', left: 30, width: `calc((100% - 60px) * ${lineGrow})`, height: 5, background: accent, borderRadius: 3, boxShadow: `0 0 14px ${accent}aa` }} />
          {evs.map((e, i) => {
            const cx = n === 1 ? 0.5 : i / (n - 1);
            const startSec = 0.3 + buildEnd * 0.5 + i * perStep * 0.6;
            const s = springStep(frame, fps, Math.round(startSec * fps), SPRINGS.bouncy);
            const op = interpolate(s, [0, 1], [0, 1], { extrapolateRight: 'clamp' });
            const sc = interpolate(s, [0, 1], [0.2, 1]);
            const acima = i % 2 === 0; // alterna acima/abaixo do trilho
            const glow = glowPulse(frame - Math.round(startSec * fps), 26, 0.4, 1);
            return (
              <div key={i} style={{ position: 'absolute', top: '50%', left: `calc(30px + (100% - 60px) * ${cx})`, transform: 'translate(-50%, -50%)' }}>
                {/* nó */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: accent,
                    border: '4px solid #05060a',
                    boxShadow: `0 0 ${Math.round(22 * glow)}px ${accent}`,
                    opacity: op,
                    transform: `translate(-50%,-50%) scale(${sc})`,
                    position: 'absolute',
                    left: 0,
                    top: 0,
                  }}
                />
                {/* haste + cartão */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    [acima ? 'bottom' : 'top']: 26,
                    transform: `translateX(-50%) translateY(${acima ? -1 : 1}px)`,
                    opacity: op,
                    width: 200,
                    textAlign: 'center',
                  } as React.CSSProperties}
                >
                  <div style={{ width: 3, height: 36, background: `${accent}99`, margin: acima ? '0 auto 8px' : '8px auto 0', order: acima ? 0 : 2 }} />
                  <div
                    style={{
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 900,
                      fontSize: 52,
                      color: accent,
                      lineHeight: 1,
                      transform: `scale(${sc})`,
                      ...neonText(accent, glow),
                    }}
                  >
                    {e.ano}
                  </div>
                  {e.texto ? (
                    <div
                      style={{
                        fontFamily: DISPLAY_FONT,
                        fontWeight: 600,
                        fontSize: 28,
                        color: '#fff',
                        marginTop: 8,
                        lineHeight: 1.18,
                        textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                      }}
                    >
                      {e.texto}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Tipos / despacho ──────────────────────────────────────────────────────────
export type ExplainerTipo = 'fluxo' | 'compara' | 'grafico' | 'timeline';

export const isExplainerTipo = (tp?: string): tp is ExplainerTipo =>
  tp === 'fluxo' || tp === 'compara' || tp === 'grafico' || tp === 'timeline';

// shape do campo `dados` por tipo (o que o Diretor de EDL extrai da fala).
export type ExplainerDados =
  | { etapas: FlowStep[]; titulo?: string; orientacao?: 'horizontal' | 'vertical' }            // fluxo
  | { a: CompareSide; b: CompareSide; vencedor?: 'a' | 'b'; titulo?: string }                  // compara
  | { tipo: 'barras' | 'linha'; valores: GrowDatum[]; destaque_idx?: number; titulo?: string } // grafico
  | { eventos: TimelineEvento[]; titulo?: string };                                            // timeline

// Despacha a cena certa conforme `tipo`. `dados` é o objeto bruto vindo do plano.
// Retorna null se o tipo não for explicativo ou dados forem insuficientes (o caller
// — CaptionClip/Wide — já tolera null e cai no comportamento de mídia/legado).
export const ExplainerSceneForPlano: React.FC<{
  tipo?: string;
  dados?: unknown;
  accent: string;
  durSec: number;
  offsetY?: number;
  fundoSolido?: boolean;
}> = ({ tipo, dados, accent, durSec, offsetY = 0, fundoSolido }) => {
  const d = (dados || {}) as Record<string, unknown>;
  switch (tipo) {
    case 'fluxo': {
      const etapas = (Array.isArray(d.etapas) ? d.etapas : []) as FlowStep[];
      if (!etapas.length) return null;
      return <FlowDiagram etapas={etapas} titulo={d.titulo as string | undefined} orientacao={d.orientacao as 'horizontal' | 'vertical' | undefined} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={fundoSolido} />;
    }
    case 'compara': {
      const a = d.a as CompareSide | undefined;
      const b = d.b as CompareSide | undefined;
      if (!a || !b) return null;
      return <CompareAB a={a} b={b} vencedor={d.vencedor as 'a' | 'b' | undefined} titulo={d.titulo as string | undefined} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={fundoSolido} />;
    }
    case 'grafico': {
      const valores = (Array.isArray(d.valores) ? d.valores : []) as GrowDatum[];
      if (!valores.length) return null;
      const gtipo = d.tipo === 'linha' ? 'linha' : 'barras';
      return <GrowChart tipo={gtipo} valores={valores} destaque_idx={d.destaque_idx as number | undefined} titulo={d.titulo as string | undefined} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={fundoSolido} />;
    }
    case 'timeline': {
      const eventos = (Array.isArray(d.eventos) ? d.eventos : []) as TimelineEvento[];
      if (!eventos.length) return null;
      return <TimelineScene eventos={eventos} titulo={d.titulo as string | undefined} accent={accent} durSec={durSec} offsetY={offsetY} fundoSolido={fundoSolido} />;
    }
    default:
      return null;
  }
};
