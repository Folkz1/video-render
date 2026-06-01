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
  variant?: 'solta' | 'pilula';
  numberPop?: boolean; // count-up quando a palavra ativa tem número
  allCaps?: boolean;
};

const FONT = 'Montserrat, Poppins, Inter, Segoe UI, sans-serif';
const HAS_DIGIT = /\d/;

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

  const fmt = (s: string) => (allCaps ? s.toUpperCase() : s);

  const strokeStyle: React.CSSProperties =
    variant === 'solta'
      ? {
          WebkitTextStroke: '8px #000',
          paintOrder: 'stroke fill' as React.CSSProperties['paintOrder'],
          textShadow: '0 4px 12px rgba(0,0,0,0.6)',
        }
      : {};

  const renderWord = (w: WordTiming, idxInGroup: number) => {
    const globalIdx = groupStart + idxInGroup;
    const entryFrame = Math.round((w.start - fromSec) * fps);
    if (frame < entryFrame) return null; // pop-in progressivo

    const s = spring({ frame: frame - entryFrame, fps, config: { damping: 14, mass: 0.6 } });
    const scale = interpolate(s, [0, 1], [1.15, 1.0]);
    const opacity = interpolate(s, [0, 1], [0, 1]);
    const reallyActive = globalIdx === active;
    const color = reallyActive || isKaraoke ? accent : '#FFFFFF';

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
          ...strokeStyle,
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
        fontWeight: 900,
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
