import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

// Motor de legenda word-by-word (karaokê/Hormozi) reusável por SplitReaction e CaptionClip.
// Sincroniza pela lista de palavras com timestamps (ElevenLabs with-timestamps). Se vazio,
// cai num fallback uniforme distribuindo o texto pela duração — a legenda NUNCA some.

export type WordTiming = { word: string; start: number; end: number }; // segundos

export type WordCaptionsProps = {
  words?: WordTiming[];
  accent?: string; // cor da palavra ativa (= paleta do brand). Default amarelo.
  fromSec?: number; // offset: subtrai do tempo absoluto (cena que não começa em t=0)
  durSec?: number; // duração da cena — necessária para o fallback uniforme
  text?: string; // fala crua — usada só no fallback
  anchorY: number; // centro vertical do bloco em px (canvas 1920)
  maxWordsPerGroup?: number; // 1 = karaokê puro; >1 = frase com palavra ativa destacada
  fontSize?: number;
  maxWidth?: number;
  variant?: 'solta' | 'pilula' | 'limpa';
  numberPop?: boolean; // count-up quando a palavra ativa tem número
  allCaps?: boolean;
};

const FONT = 'Montserrat, Poppins, Inter, Segoe UI, sans-serif';
const HAS_DIGIT = /\d/;

// IDENTIDADE "Terminal-Noir": quando o accent é o verde-terminal aprovado (#3DF07A),
// a karaokê ganha tratamento "premium dev": caixa MISTA (não all-caps agressivo),
// peso médio (700, não 900 berrante), micro-pop sutil e um glow do accent na palavra
// ativa. Comparação por hex normalizado (tolera maiúsc/minúsc e #abreviado).
const norm = (hex?: string) => (hex || '').trim().toLowerCase().replace(/^#/, '');
const TERMINAL_GREEN = '3df07a';
const isTerminalAccent = (hex?: string) => norm(hex) === TERMINAL_GREEN;

// luminância relativa (0=preto, 1=branco) do accent. A PLACA escura (fix-legibilidade) só
// faz sentido quando o texto da legenda é CLARO (caso karaokê-sobre-b-roll: palavra ativa
// num accent vivo + não-ativas brancas). Quando o accent é ESCURO (ex.: CaptionBold usa
// #05060a em cima de uma faixa SÓLIDA clara), uma placa escura tamparia o texto → nesses
// casos NÃO aplicamos a placa escura (deixa a faixa clara do próprio formato fazer o
// contraste). Evita regressão no CaptionBold mantendo o fix nos formatos sobre b-roll.
const luminance = (hex?: string): number => {
  const h = norm(hex);
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  if (full.length < 6) return 1; // desconhecido => trata como claro (placa escura ON)
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const isLightAccent = (hex?: string) => luminance(hex) >= 0.35;

function buildWords(words?: WordTiming[], text?: string, durSec?: number): WordTiming[] {
  if (words && words.length) return words;
  if (text && durSec && durSec > 0) {
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return tokens.map((w, i) => ({
      word: w,
      start: (i / tokens.length) * durSec,
      end: ((i + 1) / tokens.length) * durSec,
    }));
  }
  return [];
}

export const WordCaptions: React.FC<WordCaptionsProps> = ({
  words,
  accent = '#FFD400',
  fromSec = 0,
  durSec,
  text,
  anchorY,
  maxWordsPerGroup = 3,
  fontSize = 88,
  maxWidth = 920,
  variant = 'solta',
  numberPop = true,
  allCaps = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ws = buildWords(words, text, durSec);
  if (!ws.length) return null;

  const t = frame / fps + fromSec;

  // palavra ativa = última cujo start já passou
  let active = 0;
  for (let i = 0; i < ws.length; i++) {
    if (ws[i].start <= t) active = i;
    else break;
  }

  const isKaraoke = maxWordsPerGroup === 1;
  const groupStart = Math.floor(active / maxWordsPerGroup) * maxWordsPerGroup;
  const group = ws.slice(groupStart, groupStart + maxWordsPerGroup);

  // Terminal-Noir: o accent verde-terminal NUNCA vai a all-caps (caixa mista), mesmo
  // que allCaps=true seja passado — é a regra do brief (sem all-caps agressivo).
  const term = isTerminalAccent(accent);
  const fmt = (s: string) => (allCaps && !term && variant !== 'limpa' ? s.toUpperCase() : s);

  const strokeStyle: React.CSSProperties =
    variant === 'solta'
      ? {
          // Terminal-Noir usa stroke um pouco mais fino (6px) pra casar com o peso 700
          // (menos "berrante"); demais accents mantêm o stroke 8px atual.
          // LEGIBILIDADE EM FUNDO CLARO (fix QA): stroke preto FORTE em TODA palavra (ativa OU
          // não-ativa) + halo de sombra denso, garantindo contorno legível mesmo se a placa
          // ficar translúcida sobre b-roll brilhante. NENHUMA palavra fica invisível.
          WebkitTextStroke: term ? '7px #000' : '9px #000',
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          // Halo escuro multicamada: contorno tight + sombra de leitura que destaca o texto
          // de qualquer fundo (claro ou escuro), reforçando a placa.
          textShadow:
            '0 0 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.98), 0 4px 14px rgba(0,0,0,0.95)',
        }
      : variant === 'limpa'
        ? {
            // MODO ESSAY (estilo Alex Wei): legenda LIMPA — branco, sombra sutil, sem stroke grosso.
            // Elegante e discreta; não compete com a fala. Frase por vez (maxWordsPerGroup alto).
            textShadow: '0 2px 8px rgba(0,0,0,0.92), 0 1px 3px rgba(0,0,0,0.97)',
          }
        : {};

  // PLACA (estilo Hragment/Hormozi): pílula escura que huga CADA palavra (ativa E não-ativa).
  // Garante contraste sobre QUALQUER b-roll (teclado claro, logo no clipe, foto brilhante) —
  // mata o defeito "legenda ilegível em fundo claro" do QA. Só no modo karaokê/solta
  // (limpa/pílula têm seu próprio fundo) E só quando o texto é CLARO (accent vivo/branco).
  // FIX QA: a placa subia translúcida demais (0.66) → em b-roll CLARO as palavras não-ativas
  // (brancas) sumiam. Agora a placa é quase opaca (0.82) com borda sutil, e é aplicada
  // IGUALMENTE a todas as palavras do grupo — não só a ativa. Combinado com o stroke preto
  // forte (strokeStyle), NENHUMA palavra fica invisível, em fundo claro ou escuro.
  // Quando o accent é ESCURO (CaptionBold #05060a em faixa clara), a placa escura é desligada
  // (senão tamparia o texto) — o contraste vem da faixa sólida do próprio formato.
  const plateOn = variant === 'solta' && isLightAccent(accent);
  const plateStyle: React.CSSProperties = plateOn
    ? {
        background: 'rgba(8,10,16,0.82)',
        borderRadius: 18,
        padding: '6px 26px',
        border: '2px solid rgba(0,0,0,0.55)',
        boxShadow: '0 6px 22px rgba(0,0,0,0.6)',
        boxDecorationBreak: 'clone' as React.CSSProperties['boxDecorationBreak'],
      }
    : {};

  const renderWord = (w: WordTiming, idxInGroup: number) => {
    const globalIdx = groupStart + idxInGroup;
    const entryFrame = Math.round((w.start - fromSec) * fps);
    if (frame < entryFrame) return null; // pop-in progressivo

    const s = spring({ frame: frame - entryFrame, fps, config: { damping: 14, mass: 0.6 } });
    // Terminal-Noir: micro-pop sutil (1.08→1.0) em vez do pop maior (1.15→1.0) — leitura
    // mais "premium/contida"; demais accents mantêm o pop atual.
    const scale = interpolate(s, [0, 1], [term ? 1.08 : 1.15, 1.0]);
    const opacity = interpolate(s, [0, 1], [0, 1]);
    const reallyActive = globalIdx === active;
    // MODO LIMPA (essay): tudo branco, sem destaque de cor (legenda elegante, não karaokê).
    const color = variant === 'limpa' ? '#FFFFFF' : (reallyActive || isKaraoke ? accent : '#FFFFFF');
    // glow do accent SÓ na palavra ativa em terminal-noir (sutil, reforça o "terminal").
    // Mantém o halo escuro FORTE (igual ao strokeStyle) e SOMA o glow verde — não troca o
    // contorno de leitura por um glow fraco (senão a palavra ativa perderia contraste em
    // fundo claro). Assim ativa = legível + acende verde.
    const accentGlow: React.CSSProperties =
      term && variant === 'solta' && (reallyActive || isKaraoke)
        ? { textShadow: `0 0 4px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.98), 0 4px 14px rgba(0,0,0,0.95), 0 0 18px ${accent}66` }
        : {};

    let display = fmt(w.word);
    if (numberPop && reallyActive) {
      const m = w.word.match(/[\d.]+/);
      if (m && HAS_DIGIT.test(m[0])) {
        const target = parseFloat(m[0].replace(/\./g, ''));
        if (!Number.isNaN(target) && target >= 1) {
          const cur = Math.round(interpolate(s, [0, 1], [0, target]));
          display = fmt(w.word.replace(/[\d.]+/, cur.toLocaleString('pt-BR')));
        }
      }
    }

    return (
      <span
        key={globalIdx}
        style={{
          display: 'inline-block',
          transformOrigin: 'center',
          transform: `scale(${scale})`,
          opacity,
          color,
          ...plateStyle,
          ...strokeStyle,
          ...accentGlow,
        }}
      >
        {display}
      </span>
    );
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: anchorY,
        transform: 'translate(-50%, -50%)',
        width: variant === 'pilula' ? 'auto' : maxWidth,
        maxWidth,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0 18px',
        textAlign: 'center',
        zIndex: 40,
        fontFamily: FONT,
        // Terminal-Noir: peso MÉDIO (700) na karaokê — premium, não "berrante" (900).
        fontWeight: variant === 'limpa' ? 600 : term ? 700 : 900,
        fontSize,
        lineHeight: 1.05,
        ...(variant === 'pilula'
          ? { background: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: '14px 28px', color: '#fff' }
          : {}),
      }}
    >
      {group.map((w, i) => renderWord(w, i))}
    </div>
  );
};
