import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { GUYFOLKZ_ACCENT, BG_DARK } from './kit/animationPresets';
import { MONO_FONT } from './kit/fonts';

// ─────────────────────────────────────────────────────────────────────────────
// TerminalBeat — B-ROLL DE TELA TÉCNICA "on-brand" (IDENTIDADE "Terminal-Noir").
//
// O juiz de visão pede VER a coisa quando o tema é técnico (comando/erro/saída);
// Pexels abstrato não resolve. Este componente DESENHA um terminal animado: o
// usuário "digita" comandos char-a-char com cursor piscando, a saída aparece
// depois de um beat e os erros entram em vermelho suave. Sem asset externo, 100%
// determinístico (lê só o frame), seguro no render headless do Remotion.
//
// CONTRATO (combinado com o backend): um Plano pode ter
//   tipo='terminal' e terminal_lines=[{type:'cmd'|'out'|'err', text:'...'}]
// O CaptionClip detecta isso e renderiza TerminalBeat NO LUGAR do b-roll/Img,
// com a legenda karaokê (WordCaptions) compondo POR CIMA (mesma camada de hoje).
//
// Preenche a área de b-roll 9:16 (1080x1920). Fundo near-black #0a0e0a, header
// com 3 dots + prompt `guyfolkz:~$`, fonte JetBrains Mono (MONO_FONT), texto
// verde-terminal #3DF07A, erro vermelho suave #ff5c5c. Grain/scanline sutil
// consistente com a identidade (o CaptionClip já tem o FilmGrainScanline global;
// aqui há só um leve scanline local pra dar textura mesmo em still).
// ─────────────────────────────────────────────────────────────────────────────

export type TerminalLineType = 'cmd' | 'out' | 'err';

export type TerminalLine = {
  type?: TerminalLineType | string; // 'cmd' (default) | 'out' | 'err'
  text?: string;
};

export type TerminalBeatProps = {
  lines: TerminalLine[];
  durationInFrames: number; // janela deste plano (distribui a digitação por ela)
  accent?: string; // cor do verde-terminal (default #3DF07A)
  prompt?: string; // prompt antes de cada linha 'cmd' (default 'guyfolkz:~$')
  fps?: number; // override opcional; senão usa useVideoConfig
  topSafe?: number; // px reservados no topo (safe-area do título) — corpo começa abaixo
  bottomSafe?: number; // px reservados embaixo (safe-area da legenda karaokê)
};

const TERM_BG = '#0a0e0a'; // near-black levemente esverdeado (pedido)
const ERR_COLOR = '#ff5c5c'; // vermelho suave (erros)
const OUT_COLOR = '#b8c2bb'; // saída neutra (cinza-esverdeado, menos brilho que cmd)
const HEADER_H = 96; // barra de janela (3 dots) — SEM prompt repetido aqui
const SIDE_PAD = 64;
// Safe-areas default: título no topo (~290px até o fim de 2 linhas) e legenda
// karaokê embaixo (ancorada ~1440 + altura da palavra). O corpo do terminal vive
// ENTRE elas e é centralizado verticalmente nesse vão, pra não colidir com nenhum.
const TOP_SAFE_DEFAULT = 300;
const BOTTOM_SAFE_DEFAULT = 560;
const LINE_FS = 56; // tamanho da fonte do corpo do terminal (maior = preenche a tela 9:16)
const LINE_LH = 1.55;

const normType = (t?: string): TerminalLineType =>
  t === 'out' ? 'out' : t === 'err' ? 'err' : 'cmd';

const TrafficDot: React.FC<{ color: string }> = ({ color }) => (
  <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, boxShadow: `0 0 9px ${color}55` }} />
);

export const TerminalBeat: React.FC<TerminalBeatProps> = ({
  lines,
  durationInFrames,
  accent = GUYFOLKZ_ACCENT,
  prompt = 'guyfolkz:~$',
  fps: fpsProp,
  topSafe = TOP_SAFE_DEFAULT,
  bottomSafe = BOTTOM_SAFE_DEFAULT,
}) => {
  const frame = useCurrentFrame();
  const cfg = useVideoConfig();
  const fps = fpsProp || cfg.fps || 30;

  const safeLines: TerminalLine[] = (Array.isArray(lines) ? lines : [])
    .filter((l) => l && typeof l.text === 'string' && l.text.length > 0)
    .map((l) => ({ type: normType(l.type), text: l.text as string }));

  // ── ORÇAMENTO DE TEMPO ──────────────────────────────────────────────────────
  // Distribui a digitação/aparição pela janela do plano. Reserva um respiro no fim
  // (HOLD) pra a última linha não cortar no corte. As linhas 'cmd' "digitam"
  // char-a-char; 'out'/'err' aparecem inteiras após um beat curto (como num TTY
  // real: você digita o comando, dá enter, a saída cai de uma vez).
  const dur = Math.max(1, durationInFrames);
  const holdFrames = Math.min(Math.round(0.9 * fps), Math.round(dur * 0.18)); // respiro final
  const budget = Math.max(1, dur - holdFrames);

  // peso de cada linha no orçamento: cmd custa por caractere (digitação) +
  // overhead; out/err custam um beat fixo (aparecem de uma vez).
  const CMD_CHAR = 1.0; // unidade por char digitado
  const CMD_OVERHEAD = 10; // enter + beat após digitar o comando
  const OUT_BEAT = 16; // beat fixo pra saída/erro aparecer e "ler"
  const weights = safeLines.map((l) =>
    l.type === 'cmd' ? CMD_OVERHEAD + (l.text as string).length * CMD_CHAR : OUT_BEAT,
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  const scale = budget / totalWeight; // frames por unidade de peso

  // frame de início (acumulado) de cada linha
  const starts: number[] = [];
  let acc = 0;
  for (let i = 0; i < safeLines.length; i++) {
    starts.push(acc);
    acc += weights[i] * scale;
  }

  // cursor piscando (~2Hz): bloco verde estilo TTY
  const cyc = frame % Math.max(1, Math.round(fps * 0.5));
  const cursorOn = cyc < Math.round(fps * 0.3) ? 1 : 0;

  // ── RENDER de cada linha conforme o frame atual ──────────────────────────────
  // a linha que está "ativa" (digitando ou acabou de cair) ganha o cursor.
  let activeIdx = 0;
  for (let i = 0; i < safeLines.length; i++) {
    if (frame >= starts[i]) activeIdx = i;
  }

  const renderLine = (l: TerminalLine, i: number) => {
    const start = starts[i];
    if (frame < start) return null; // ainda não chegou a vez desta linha

    const t = l.type as TerminalLineType;
    const txt = l.text as string;
    const isActive = i === activeIdx;

    if (t === 'cmd') {
      // digitação char-a-char ao longo do peso desta linha (menos o overhead final).
      const typeFrames = Math.max(1, weights[i] * scale - CMD_OVERHEAD * scale);
      const typedChars = Math.round(
        interpolate(frame, [start, start + typeFrames], [0, txt.length], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        }),
      );
      const shown = txt.slice(0, typedChars);
      const stillTyping = typedChars < txt.length;
      // cursor: enquanto digita (sempre on) ou piscando no fim se é a linha ativa
      const showCursor = stillTyping ? 1 : isActive ? cursorOn : 0;
      return (
        <div key={i} style={{ marginBottom: 18, lineHeight: LINE_LH }}>
          <span style={{ color: accent, opacity: 0.7 }}>{prompt} </span>
          <span style={{ color: accent }}>{shown}</span>
          <span
            style={{
              display: 'inline-block',
              width: 24,
              height: LINE_FS * 0.92,
              marginLeft: 4,
              transform: 'translateY(6px)',
              background: accent,
              opacity: showCursor,
              boxShadow: `0 0 10px ${accent}88`,
            }}
          />
        </div>
      );
    }

    // out / err: aparecem inteiras após o beat, com fade-in curto.
    const op = interpolate(frame, [start, start + Math.round(fps * 0.18)], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    const color = t === 'err' ? ERR_COLOR : OUT_COLOR;
    const prefix = t === 'err' ? 'ERROR: ' : '';
    return (
      <div
        key={i}
        style={{
          marginBottom: 18,
          lineHeight: LINE_LH,
          color,
          opacity: op,
          textShadow: t === 'err' ? `0 0 12px ${ERR_COLOR}55` : undefined,
        }}
      >
        {prefix}
        {txt}
      </div>
    );
  };

  // scanline local sutil (textura mesmo em still; o grain global vem do CaptionClip).
  const scanline =
    'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 3px)';

  return (
    <div style={{ position: 'absolute', inset: 0, background: BG_DARK, overflow: 'hidden' }}>
      {/* moldura do terminal: ocupa a viewport com leve margem; near-black esverdeado */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: TERM_BG,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: `inset 0 0 200px rgba(0,0,0,0.55), inset 0 0 0 1px ${accent}22`,
        }}
      >
        {/* ── HEADER: SÓ os 3 dots (semáforo) da janela. O prompt `guyfolkz:~$`
            NÃO se repete aqui — ele vive DENTRO da linha de comando ($ comando) e
            a assinatura da marca é o BrandLowerThird (badge com avatar). Uma fonte
            só do prompt → acaba o header-fantasma duplicado no topo. ── */}
        <div
          style={{
            height: HEADER_H,
            flex: `0 0 ${HEADER_H}px`,
            background: 'linear-gradient(180deg, #0d120d 0%, #080b08 100%)',
            borderBottom: `1px solid ${accent}33`,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: `0 ${SIDE_PAD - 24}px`,
          }}
        >
          <TrafficDot color="#ff5f56" />
          <TrafficDot color="#ffbd2e" />
          <TrafficDot color="#27c93f" />
        </div>

        {/* ── CORPO: as linhas do terminal, mono verde, digitando/aparecendo.
            Vive ENTRE a safe-area do título (topSafe) e a da legenda (bottomSafe),
            e é CENTRALIZADO verticalmente nesse vão (justify-center) — preenche a
            tela 9:16 de forma agradável sem colidir com título nem legenda. ── */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            // reserva do título acima e da legenda abaixo (descontando o header já gasto)
            paddingTop: Math.max(0, topSafe - HEADER_H),
            paddingBottom: bottomSafe,
            paddingLeft: SIDE_PAD,
            paddingRight: SIDE_PAD,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center', // centraliza o bloco no vão entre as safe-areas
            fontFamily: MONO_FONT,
            fontWeight: 500,
            fontSize: LINE_FS,
            color: accent,
            wordBreak: 'break-word',
            overflow: 'hidden',
          }}
        >
          <div>{safeLines.map((l, i) => renderLine(l, i))}</div>
          {/* scanline CRT local por cima do corpo (sutil) */}
          <div style={{ position: 'absolute', inset: 0, background: scanline, pointerEvents: 'none' }} />
          {/* glow ambiente verde no rodapé (cara de monitor CRT) */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 260,
              background: `radial-gradient(120% 100% at 50% 120%, ${accent}1c 0%, transparent 70%)`,
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
