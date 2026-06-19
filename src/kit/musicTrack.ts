// ─────────────────────────────────────────────────────────────────────────────
// DIRETOR MUSICAL — Fase 1. Helpers compartilhados da trilha de fundo.
//
// Centraliza a curva de volume da música (loop + fades + DUCKING sob a voz +
// SILÊNCIO estratégico) e o plano de SFX (riser/sting). Reusado por CaptionClip,
// CaptionWide e VerticalLong — mesma semântica em todos. 100% aditivo: sem
// voice_windows/silence_windows/sfx_plan, a curva = comportamento atual.
// ─────────────────────────────────────────────────────────────────────────────

import { interpolate } from 'remotion';

export type VoiceWindow = { from: number; to: number };
export type SilenceWindow = { from: number; to: number };
export type SfxKind = 'riser' | 'sting';
export type SfxCue = { at_s: number; type: SfxKind };

const DUCK_VOICE = 0.045; // volume da música SOB a fala
const DUCK_PAUSE = 0.13; // volume da música nas pausas (idêntico a SplitReaction/VerticalLong)
const DUCK_PAD = 0.12; // folga (s) ao redor de cada janela de voz
const SILENCE_FADE = 1.2; // rampa (s) de entrada/saída do silêncio estratégico

/**
 * Curva de volume da música cobrindo o vídeo INTEIRO (a música entra com loop).
 *
 * - fade-in (12f) + fade-out (24f) nas pontas — herdado do comportamento atual;
 * - DUCKING binário por voice_windows (fala = 0.045, pausa = 0.13) — padrão SplitReaction;
 * - SILÊNCIO estratégico por silence_windows: música → 0 com fade SILENCE_FADE s
 *   antes/depois (a "confissão" respira — Regra de Ouro 4/9).
 *
 * Ausentes voice_windows + silence_windows → curva de volume constante (com fades),
 * o que reproduz exatamente o volume atual de CaptionClip/CaptionWide.
 */
export function buildMusicVolume(opts: {
  fps: number;
  totalFrames: number;
  baseVolume?: number; // volume "de cruzeiro" quando NÃO há voice_windows (default 0.13)
  duckVoice?: number; // override do volume SOB a fala (default DUCK_VOICE) — talking-head sobe um pouco
  duckPause?: number; // override do volume nas PAUSAS (default DUCK_PAUSE)
  voiceWindows?: VoiceWindow[];
  silenceWindows?: SilenceWindow[];
  fadeInFrames?: number;
  fadeOutFrames?: number;
}): (f: number) => number {
  const {
    fps,
    totalFrames,
    baseVolume = 0.13,
    duckVoice = DUCK_VOICE,
    duckPause = DUCK_PAUSE,
    voiceWindows,
    silenceWindows,
    fadeInFrames = 12,
    fadeOutFrames = 24,
  } = opts;
  const hasVW = Array.isArray(voiceWindows) && voiceWindows.length > 0;
  const hasSilence = Array.isArray(silenceWindows) && silenceWindows.length > 0;

  return (f: number) => {
    const t = f / fps;
    // 1) volume-base: ducking binário OU volume de cruzeiro
    let vol = baseVolume;
    if (hasVW) {
      const inVoice = voiceWindows!.some((w) => t >= w.from - DUCK_PAD && t < w.to + DUCK_PAD);
      vol = inVoice ? duckVoice : duckPause;
    }
    // 2) silêncio estratégico: multiplica por um envelope 0..1 com rampa SILENCE_FADE
    if (hasSilence) {
      let gate = 1;
      for (const s of silenceWindows!) {
        // 0 dentro da janela, sobe a 1 nas bordas (fade in/out de SILENCE_FADE s)
        const g = Math.min(
          interpolate(t, [s.from - SILENCE_FADE, s.from], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          interpolate(t, [s.to, s.to + SILENCE_FADE], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        );
        gate = Math.min(gate, g);
      }
      vol *= gate;
    }
    // 3) fades nas pontas (cobrem o vídeo inteiro)
    const fade = interpolate(
      f,
      [0, fadeInFrames, totalFrames - fadeOutFrames, totalFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    return vol * fade;
  };
}

/**
 * Resolve a janela de Sequence (from/dur em frames) de uma SFX cue.
 * - riser: começa ~2.5s ANTES do at_s pra "picar" exatamente no at_s; dura ~3s;
 * - sting: dispara NO at_s; dura ~1.2s.
 */
export function sfxCueWindow(cue: SfxCue, fps: number): { from: number; durationInFrames: number } {
  if (cue.type === 'riser') {
    return {
      from: Math.max(0, Math.round((cue.at_s - 2.5) * fps)),
      durationInFrames: Math.round(3.0 * fps),
    };
  }
  return {
    from: Math.max(0, Math.round(cue.at_s * fps)),
    durationInFrames: Math.round(1.2 * fps),
  };
}
