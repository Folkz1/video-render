// screenop-poc.mjs — PoC SCREEN-OP
// Abre um SITE REAL, opera (scroll suave com easing + cursor falso animado) e
// grava um clip que vira B-ROLL 9:16 1080x1920 autentico pra noticias/tutoriais.
//
// Reusa o padrao de render-farm/record-page.mjs (chromium + recordVideo native),
// mas:
//   - viewport DESKTOP (o site renderiza como num browser de verdade),
//   - injeta um cursor falso (Playwright nao mostra cursor nativo no recordVideo),
//   - move o cursor + scroll com easing/pausas pra parecer operacao humana,
//   - converte .webm -> mp4 9:16 via ffmpeg (scale-to-width 1080 + pad pra 1920).
//
// Uso: node screenop-poc.mjs [url] [seconds] [outMp4]

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const URL = process.argv[2] || 'https://www.githubstatus.com/';
const SECONDS = Math.max(6, Math.min(30, Number(process.argv[3]) || 11));
const OUT_MP4 = process.argv[4] || 'D:/tmp/screenop_poc.mp4';
const FFMPEG = process.env.FFMPEG_PATH || 'C:/ffmpeg/bin/ffmpeg';

// Viewport DESKTOP — site renderiza no layout real de desktop.
const VW = 1440;
const VH = 900;

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'screenop-'));

// ---- cursor falso: injetado na pagina, posicionado por uma global setada por nos ----
const CURSOR_INIT = `
  (() => {
    if (window.__fakeCursor) return;
    const c = document.createElement('div');
    c.id = '__fakeCursor';
    Object.assign(c.style, {
      position: 'fixed', left: '0px', top: '0px', width: '22px', height: '22px',
      zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-2px,-2px)',
      transition: 'left .12s linear, top .12s linear',
      // setinha de mouse desenhada via SVG data-uri (branca com borda preta)
      background: "url('data:image/svg+xml;utf8," +
        encodeURIComponent('<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'22\\' height=\\'22\\' viewBox=\\'0 0 24 24\\'><path d=\\'M3 2l7 18 2.5-7L20 10.5z\\' fill=\\'white\\' stroke=\\'black\\' stroke-width=\\'1.4\\' stroke-linejoin=\\'round\\'/></svg>') +
        "') no-repeat center / contain",
    });
    document.documentElement.appendChild(c);
    window.__fakeCursor = c;
    window.__setCursor = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; };
    window.__setCursor(${Math.round(VW*0.5)}, ${Math.round(VH*0.4)});
  })();
`;

function easeInOut(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2; }

async function moveCursor(page, fromX, fromY, toX, toY, ms) {
  const steps = Math.max(6, Math.round(ms / 40));
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps);
    const x = Math.round(fromX + (toX - fromX) * t);
    const y = Math.round(fromY + (toY - fromY) * t);
    await page.evaluate(([x, y]) => window.__setCursor && window.__setCursor(x, y), [x, y]);
    await page.mouse.move(x, y);
    await page.waitForTimeout(40);
  }
}

async function smoothScrollWithEasing(page, totalPx, ms) {
  const steps = Math.max(10, Math.round(ms / 60));
  let prev = 0;
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps);
    const target = Math.round(totalPx * t);
    const delta = target - prev;
    prev = target;
    if (delta !== 0) await page.mouse.wheel(0, delta);
    await page.waitForTimeout(60);
  }
}

async function dismissCookieBanner(page) {
  const selectors = [
    'button:has-text("Accept")', 'button:has-text("Aceitar")',
    'button:has-text("Got it")', 'button:has-text("I agree")',
    '[aria-label*="accept" i]', '[id*="cookie"] button',
  ];
  for (const sel of selectors) {
    try { await page.click(sel, { timeout: 1200 }); break; } catch {}
  }
}

async function main() {
  console.log(`[SCREEN-OP PoC] url=${URL} seconds=${SECONDS} out=${OUT_MP4}`);
  console.log(`[SCREEN-OP PoC] viewport=${VW}x${VH} tmp=${TMP_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
  });
  const context = await browser.newContext({
    viewport: { width: VW, height: VH },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    recordVideo: { dir: TMP_DIR, size: { width: VW, height: VH } },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  // re-injeta o cursor em toda navegacao
  await context.addInitScript(CURSOR_INIT);

  const page = await context.newPage();
  let webmPath = null;
  try {
    try { await page.goto(URL, { waitUntil: 'load', timeout: 30000 }); } catch {}
    await dismissCookieBanner(page);
    await page.evaluate(CURSOR_INIT); // garante o cursor mesmo se initScript nao pegou
    await page.waitForTimeout(1200);

    try { webmPath = await page.video()?.path(); } catch {}

    // Roteiro de "operacao" dentro do tempo total:
    // 1) cursor passeia pelo header (mostra o titulo/status) ~2.2s
    // 2) scroll suave descendo pra revelar os componentes/incidentes ~ metade do tempo
    // 3) cursor pousa num item ~1.5s
    // 4) scroll mais um pouco + cursor sobe ~ resto
    const budget = SECONDS * 1000;
    const t1 = Math.round(budget * 0.20);
    const t2 = Math.round(budget * 0.40);
    const t3 = Math.round(budget * 0.15);
    const t4 = budget - t1 - t2 - t3;

    let cx = Math.round(VW*0.5), cy = Math.round(VH*0.4);
    await moveCursor(page, cx, cy, Math.round(VW*0.35), Math.round(VH*0.22), t1);
    cx = Math.round(VW*0.35); cy = Math.round(VH*0.22);

    await smoothScrollWithEasing(page, 1100, t2);

    await moveCursor(page, cx, cy, Math.round(VW*0.55), Math.round(VH*0.55), t3);
    cx = Math.round(VW*0.55); cy = Math.round(VH*0.55);

    // ultimo trecho: scroll final + cursor sobe pra um CTA/topo do bloco
    await Promise.all([
      smoothScrollWithEasing(page, 700, Math.round(t4*0.7)),
      moveCursor(page, cx, cy, Math.round(VW*0.45), Math.round(VH*0.35), t4),
    ]);

    try { webmPath = webmPath || (await page.video()?.path()); } catch {}
    await context.close(); // finaliza/flush do video
  } finally {
    try { await browser.close(); } catch {}
  }

  if (!webmPath || !fs.existsSync(webmPath)) {
    const webms = fs.readdirSync(TMP_DIR).filter(f => f.endsWith('.webm'))
      .map(f => path.join(TMP_DIR, f))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    webmPath = webms[0];
  }
  if (!webmPath || !fs.existsSync(webmPath)) throw new Error('nao gerou .webm');
  const webmSize = fs.statSync(webmPath).size;
  console.log(`[SCREEN-OP PoC] webm=${webmPath} (${(webmSize/1024).toFixed(0)} KB)`);

  // .webm desktop 1440x900 -> mp4 9:16 1080x1920.
  // Estrategia "scale+pad": escala a largura do site pra 1080 (mantem aspecto,
  // 1440x900 -> 1080x675) e centraliza verticalmente em canvas 1080x1920 preto.
  // Isso preserva o conteudo inteiro (legivel) e deixa faixas pretas em cima/baixo
  // que viram a moldura Terminal-Noir na composicao final.
  await execFileP(FFMPEG, [
    '-y', '-i', webmPath,
    '-vf', 'scale=1080:-2,pad=1080:1920:0:(1920-ih)/2:black,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-movflags', '+faststart',
    OUT_MP4,
  ], { timeout: 180000, maxBuffer: 1024 * 1024 * 32 });

  // versao alternativa "crop central" (zoom no conteudo, sem barras) pra comparar
  const cropOut = OUT_MP4.replace(/\.mp4$/, '_crop.mp4');
  await execFileP(FFMPEG, [
    '-y', '-i', webmPath,
    // crop coluna central de proporcao 9:16 a partir do video desktop, depois scale
    '-vf', "crop='min(iw,ih*9/16)':ih:(iw-min(iw,ih*9/16))/2:0,scale=1080:1920,format=yuv420p",
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
    '-movflags', '+faststart',
    cropOut,
  ], { timeout: 180000, maxBuffer: 1024 * 1024 * 32 });

  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}

  const st = fs.statSync(OUT_MP4);
  const stc = fs.statSync(cropOut);
  console.log(`[SCREEN-OP PoC] OK pad   -> ${OUT_MP4} (${(st.size/1024).toFixed(0)} KB)`);
  console.log(`[SCREEN-OP PoC] OK crop  -> ${cropOut} (${(stc.size/1024).toFixed(0)} KB)`);
}

main().catch((e) => { console.error('[SCREEN-OP PoC] FAIL:', e); process.exit(1); });
