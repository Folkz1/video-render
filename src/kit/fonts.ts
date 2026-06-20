// ─────────────────────────────────────────────────────────────────────────────
// Kit do Editor — fonts.ts (IDENTIDADE VISUAL "Terminal-Noir")
//
// Registra as fontes REAIS via @remotion/google-fonts loadFont() para que o
// render no servidor (Docker headless, sem JetBrains Mono instalada no SO) use a
// fonte certa — em vez de cair pro fallback de monospace do SO, que apaga a
// assinatura "terminal" (numerais, labels, guyfolkz:~$). loadFont() roda no
// import do módulo; o nome resolvido (fontFamily) é exportado como token.
//
// O loadFont() é idempotente e seguro chamar no topo do módulo (sem hooks). Os
// pesos pedidos cobrem numeral display (700), labels/marca (500) e corpo (400).
// Wrap em try/catch: se a rede do bundler falhar, o token cai num fallback CSS de
// monospace e o vídeo ainda renderiza (degradação graciosa, nunca quebra).
// ─────────────────────────────────────────────────────────────────────────────

import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

const MONO_FALLBACK = 'Consolas, "Courier New", monospace';

let monoFamily = MONO_FALLBACK;
try {
  const { fontFamily } = loadJetBrainsMono('normal', {
    weights: ['400', '500', '700'],
    subsets: ['latin'],
  });
  // fontFamily resolvido (ex.: '"JetBrains Mono"') + fallback do SO como rede.
  monoFamily = `${fontFamily}, ${MONO_FALLBACK}`;
} catch {
  monoFamily = MONO_FALLBACK;
}

/** Família monospace REAL registrada (JetBrains Mono) + fallback de SO. */
export const MONO_FONT = monoFamily;
