// render-farm/record-page.mjs
// GRAVACAO DE TELA via Playwright -> footage MP4 9:16 pro Fiel IA.
//
// Quando NAO ha vídeo do YouTube (clip-to-short) pra ilustrar uma pauta de
// futebol, gravamos a PROPRIA fonte (notícia / tweet / post) navegando a URL
// num Chromium headless e capturando a tela em 1080x1920 NATIVO (recordVideo do
// Playwright grava no tamanho do viewport — sem crop). O .webm gerado vira mp4
// h264 (+faststart) servível pelo mesmo /api/v1/clips/{id}/video do short-server.
//
// Pesado (1 Chromium): o short-server enfileira isto na MESMA fila serializada
// dos renders/clips (1 job por vez).
//
// Reusa a lógica do POC playwright-record-v2.mjs (cookie banner + scroll suave).

import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

// Viewport NATIVO 9:16 — recordVideo grava exatamente nesse tamanho, sem crop.
const VW = 1080;
const VH = 1920;

// Binário do Chromium pro Playwright.
//
// IMPORTANTE (recordVideo): a gravação de vídeo do Playwright usa o screencast do
// browser + um ffmpeg que vem DENTRO do pacote de browser do Playwright. Por isso
// o caminho MAIS CONFIÁVEL pra recordVideo é o chromium GERENCIADO pelo Playwright
// (instalado via `npx playwright install chromium` no build) — e NÃO um chromium
// arbitrário do APT via executablePath (combinação que pode crashar o launch).
//
// Precedência:
//   1. CHROMIUM_PATH (env) — override explícito, se setado e existir.
//   2. Chromium GERENCIADO do Playwright (sem executablePath: Playwright resolve
//      sozinho a build baixada em ~/.cache/ms-playwright). É o default desejado.
//   3. Fallback: /usr/bin/chromium do APT (executablePath) se a build do Playwright
//      não estiver disponível — mantém o comportamento antigo como último recurso.
const COMMON_LAUNCH_ARGS = ['--no-sandbox', '--disable-dev-shm-usage'];

function playwrightBrowserInstalled() {
  // a build gerenciada vive em ~/.cache/ms-playwright/chromium-*/ (ou PLAYWRIGHT_BROWSERS_PATH).
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH
    || path.join(process.env.HOME || '/root', '.cache', 'ms-playwright');
  try {
    return fs.existsSync(base)
      && fs.readdirSync(base).some((d) => d.startsWith('chromium'));
  } catch { return false; }
}

function resolveLaunchOptions() {
  // 1. override explícito por env
  if (process.env.CHROMIUM_PATH) {
    try {
      if (fs.existsSync(process.env.CHROMIUM_PATH)) {
        return { headless: true, executablePath: process.env.CHROMIUM_PATH, args: COMMON_LAUNCH_ARGS };
      }
    } catch {}
  }
  // 2. chromium GERENCIADO do Playwright (default p/ recordVideo funcionar)
  if (playwrightBrowserInstalled()) {
    return { headless: true, args: COMMON_LAUNCH_ARGS };
  }
  // 3. fallback APT chromium (dev sem playwright install, ou build antigo)
  for (const p of ['/usr/bin/chromium', '/usr/bin/chromium-browser']) {
    try {
      if (fs.existsSync(p)) {
        return { headless: true, executablePath: p, args: COMMON_LAUNCH_ARGS };
      }
    } catch {}
  }
  // último recurso: channel chromium (dev local)
  return { headless: true, channel: 'chromium', args: COMMON_LAUNCH_ARGS };
}

// Fecha banners de cookie/consent (mesmos selectors do POC v2, com folga).
async function dismissCookieBanner(page) {
  const selectors = [
    '[class*="cookie"] button',
    '[id*="cookie"] button',
    'button:has-text("Accept")',
    'button:has-text("Aceitar")',
    'button:has-text("Aceito")',
    'button:has-text("Concordo")',
    'button:has-text("Got it")',
    '[aria-label*="accept" i]',
  ];
  for (const sel of selectors) {
    try {
      await page.click(sel, { timeout: 1500 });
      break; // um clique basta
    } catch {}
  }
}

// Scroll suave (reuse v2): vai descendo aos poucos pra "passear" pela página
// durante ~seconds, pra gravação não ficar parada. Divide o tempo em passos.
async function smoothScroll(page, seconds) {
  const steps = Math.max(3, Math.round(seconds / 1.4));
  const perStep = Math.max(600, Math.round((seconds * 1000) / steps));
  for (let i = 0; i < steps; i++) {
    try { await page.mouse.wheel(0, 220); } catch {}
    await page.waitForTimeout(perStep);
  }
}

// Extrai texto da fonte (notícia/tweet/post) pra virar narração depois.
// Primeiro container que existir; corta ~1500 chars.
async function extractText(page) {
  const candidates = ['article', 'main', '[role=article]', 'body'];
  for (const sel of candidates) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.count() === 0) continue;
      const t = (await loc.innerText({ timeout: 3000 }) || '').trim();
      if (t) return t.replace(/\s+\n/g, '\n').slice(0, 1500);
    } catch {}
  }
  return '';
}

/**
 * Grava uma URL em MP4 9:16 (footage pro Fiel IA).
 * @param {object} opts
 * @param {string} opts.url           URL a gravar (notícia/tweet/post).
 * @param {number} [opts.seconds=8]   duração-alvo da gravação (scroll/espera).
 * @param {string} [opts.clipSelector] se dado, faz scrollIntoView nesse elemento
 *                                      (foca o card/tweet) em vez de scroll suave.
 * @param {string} CLIPS_DIR          diretório onde salvar (do short-server).
 * @returns {Promise<{id:string,sizeBytes:number,text:string}>}
 */
export async function recordPage({ url, seconds = 8, clipSelector }, CLIPS_DIR) {
  if (!url || typeof url !== 'string') throw new Error('url (string) é obrigatória');
  if (!CLIPS_DIR) throw new Error('CLIPS_DIR é obrigatório');
  const secs = Math.max(3, Math.min(30, Number(seconds) || 8)); // clamp 3..30s

  const id = randomUUID();
  const outMp4 = path.join(CLIPS_DIR, `${id}.mp4`);

  let browser = null;
  let context = null;
  let webmPath = null;
  let text = '';

  try {
    browser = await chromium.launch(resolveLaunchOptions());
    context = await browser.newContext({
      viewport: { width: VW, height: VH },
      colorScheme: 'dark',
      // grava NATIVO 9:16 (sem crop). dir = CLIPS_DIR (mesmo storage dos clips).
      recordVideo: { dir: CLIPS_DIR, size: { width: VW, height: VH } },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    try {
      // load (não networkidle: páginas de notícia têm trackers que nunca quietam)
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (e) {
      // segue mesmo com timeout de load — pode já ter conteúdo suficiente
    }

    await dismissCookieBanner(page);
    await page.waitForTimeout(1500); // deixa render/animação inicial assentar

    let videoPromise = null;
    try { videoPromise = page.video()?.path(); } catch {}

    if (clipSelector) {
      // foca o card/tweet específico
      try {
        await page.locator(clipSelector).first().scrollIntoViewIfNeeded({ timeout: 5000 });
      } catch {}
      // segura na tela pelo tempo pedido (sem scroll, fica no elemento)
      await page.waitForTimeout(secs * 1000);
    } else {
      await smoothScroll(page, secs);
    }

    text = await extractText(page);

    // captura o path do .webm ANTES de fechar (o arquivo só finaliza no close).
    try { webmPath = webmPath || (await videoPromise) || (await page.video()?.path()); } catch {}

    await context.close(); // <- finaliza/flush do vídeo
    context = null;

    // localiza o .webm: o path do page.video() é o mais confiável; se faltar,
    // pega o .webm mais novo no CLIPS_DIR (recordVideo escreve aí).
    if (!webmPath || !fs.existsSync(webmPath)) {
      const webms = fs.readdirSync(CLIPS_DIR)
        .filter((f) => f.endsWith('.webm'))
        .map((f) => path.join(CLIPS_DIR, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      webmPath = webms[0];
    }
    if (!webmPath || !fs.existsSync(webmPath)) {
      throw new Error('gravação não gerou .webm (página bloqueou? Chromium falhou?)');
    }

    // transcoda webm -> mp4 h264 (preset veryfast, +faststart). Já está 1080x1920
    // (recordVideo NATIVO), então só re-encoda o codec — sem scale/crop.
    await execFileP('ffmpeg', [
      '-y', '-i', webmPath,
      '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outMp4,
    ], { timeout: 180000, maxBuffer: 1024 * 1024 * 16 });

    // limpa o .webm intermediário
    try { fs.unlinkSync(webmPath); } catch {}

    const st = fs.statSync(outMp4);
    return { id, sizeBytes: st.size, text };
  } finally {
    // garante fechamento (context pode já ter sido fechado acima)
    try { if (context) await context.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN-OP — screencast(): grava um SITE REAL "operando" (cursor falso VERDE +
// scroll/move/click com easing) num viewport DESKTOP e converte pra 9:16. Mesma
// base do recordPage (chromium APT + recordVideo nativo + cookie banner), com os
// 3 deltas do PoC (screenop-poc.mjs):
//   (a) viewport DESKTOP default 1440x900 (o site renderiza no layout de desktop);
//   (b) cursor falso VERDE #3DF07A injetado via addInitScript + page.evaluate
//       (Playwright não desenha cursor no recordVideo), movido com easing;
//   (c) ffmpeg fit:'pad' (default; site legível + faixas pretas onde a moldura
//       Terminal-Noir assenta) ou fit:'crop' (zoom no conteúdo, sem barras).
// O resultado é servível pelo MESMO /api/v1/clips/{id}/video do short-server.
// ─────────────────────────────────────────────────────────────────────────────

const SCREEN_CURSOR_COLOR = '#3DF07A'; // verde-terminal (GUYFOLKZ_ACCENT) — assinatura

// init-script: injeta o cursor falso verde e expõe window.__setCursor(x,y).
// Idempotente (não recria se já existe). Re-injetado em toda navegação via
// addInitScript + uma chamada page.evaluate defensiva depois do goto.
function buildCursorInit(startX, startY) {
  return `
  (() => {
    if (window.__fakeCursor) { window.__setCursor && window.__setCursor(${startX}, ${startY}); return; }
    const c = document.createElement('div');
    c.id = '__fakeCursor';
    Object.assign(c.style, {
      position: 'fixed', left: '0px', top: '0px', width: '24px', height: '24px',
      zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(-3px,-2px)',
      transition: 'left .1s linear, top .1s linear',
      filter: 'drop-shadow(0 0 4px ${SCREEN_CURSOR_COLOR}cc)',
      background: "url('data:image/svg+xml;utf8," +
        encodeURIComponent('<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\'><path d=\\'M3 2l7 18 2.5-7L20 10.5z\\' fill=\\'${SCREEN_CURSOR_COLOR}\\' stroke=\\'#04140a\\' stroke-width=\\'1.4\\' stroke-linejoin=\\'round\\'/></svg>') +
        "') no-repeat center / contain",
    });
    (document.documentElement || document.body).appendChild(c);
    window.__fakeCursor = c;
    window.__setCursor = (x, y) => { c.style.left = x + 'px'; c.style.top = y + 'px'; };
    window.__clickPulse = () => {
      const r = document.createElement('div');
      const rect = c.getBoundingClientRect();
      Object.assign(r.style, {
        position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
        width: '8px', height: '8px', borderRadius: '50%', border: '2px solid ${SCREEN_CURSOR_COLOR}',
        zIndex: 2147483646, pointerEvents: 'none', transform: 'translate(-50%,-50%)',
        transition: 'all .35s ease-out', opacity: '0.95',
      });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.width = '46px'; r.style.height = '46px'; r.style.opacity = '0'; });
      setTimeout(() => { try { r.remove(); } catch {} }, 420);
    };
    window.__setCursor(${startX}, ${startY});
  })();
  `;
}

function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

async function moveCursor(page, state, toX, toY, ms) {
  const fromX = state.x, fromY = state.y;
  const steps = Math.max(6, Math.round(ms / 40));
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps);
    const x = Math.round(fromX + (toX - fromX) * t);
    const y = Math.round(fromY + (toY - fromY) * t);
    try { await page.evaluate(([x, y]) => window.__setCursor && window.__setCursor(x, y), [x, y]); } catch {}
    try { await page.mouse.move(x, y); } catch {}
    await page.waitForTimeout(40);
  }
  state.x = toX; state.y = toY;
}

async function smoothScrollWithEasing(page, totalPx, ms) {
  const steps = Math.max(10, Math.round(ms / 60));
  let prev = 0;
  for (let i = 1; i <= steps; i++) {
    const t = easeInOut(i / steps);
    const target = Math.round(totalPx * t);
    const delta = target - prev;
    prev = target;
    if (delta !== 0) { try { await page.mouse.wheel(0, delta); } catch {} }
    await page.waitForTimeout(60);
  }
}

// converte coordenadas das actions: aceita px absolutos OU fração 0..1 do viewport.
function resolveCoord(v, dim, fallback) {
  if (v == null) return fallback;
  const n = Number(v);
  if (Number.isNaN(n)) return fallback;
  return n > 0 && n <= 1 ? Math.round(n * dim) : Math.round(n);
}

// Executa o roteiro de operação. Se vier actions[], roda elas; senão, gera um
// "passeio" automático (move header -> scroll -> pousa num item -> scroll+sobe)
// dentro do orçamento de tempo, como no PoC.
async function runScreenActions(page, actions, secs, vw, vh) {
  const state = { x: Math.round(vw * 0.5), y: Math.round(vh * 0.4) };
  try { await page.evaluate(([x, y]) => window.__setCursor && window.__setCursor(x, y), [state.x, state.y]); } catch {}

  if (Array.isArray(actions) && actions.length) {
    for (const a of actions) {
      if (!a || typeof a !== 'object') continue;
      const type = String(a.type || a.kind || '').toLowerCase();
      const dur = Math.max(120, Number(a.ms ?? a.duration_ms ?? 600));
      if (type === 'move' || type === 'click') {
        const tx = resolveCoord(a.x, vw, state.x);
        const ty = resolveCoord(a.y, vh, state.y);
        await moveCursor(page, state, tx, ty, dur);
        if (type === 'click') {
          try { await page.evaluate(() => window.__clickPulse && window.__clickPulse()); } catch {}
          try { await page.mouse.click(tx, ty, { delay: 40 }); } catch {}
          await page.waitForTimeout(Math.min(1200, Math.max(250, Number(a.pause_ms ?? 400))));
        }
      } else if (type === 'scroll') {
        const px = Number(a.px ?? a.delta ?? 600);
        await smoothScrollWithEasing(page, px, dur);
      } else if (type === 'pause' || type === 'wait') {
        await page.waitForTimeout(Math.min(8000, dur));
      }
    }
    return;
  }

  // ── roteiro automático (PoC): passeia pelo header, scrolla, pousa, scrolla+sobe ──
  const budget = secs * 1000;
  const t1 = Math.round(budget * 0.20);
  const t2 = Math.round(budget * 0.40);
  const t3 = Math.round(budget * 0.15);
  const t4 = Math.max(400, budget - t1 - t2 - t3);
  await moveCursor(page, state, Math.round(vw * 0.35), Math.round(vh * 0.22), t1);
  await smoothScrollWithEasing(page, 1100, t2);
  await moveCursor(page, state, Math.round(vw * 0.55), Math.round(vh * 0.55), t3);
  await Promise.all([
    smoothScrollWithEasing(page, 700, Math.round(t4 * 0.7)),
    moveCursor(page, state, Math.round(vw * 0.45), Math.round(vh * 0.35), t4),
  ]);
}

/**
 * Grava um SITE REAL "operando" (cursor verde + scroll/move/click) e converte pra
 * MP4 9:16 1080x1920 — footage SCREEN-OP pra notícias/tutoriais GuyFolkz.
 * @param {object} opts
 * @param {string} opts.url                 URL a operar (obrigatória).
 * @param {number} [opts.seconds=11]        duração-alvo (clamp 6..30s).
 * @param {Array}  [opts.actions]           roteiro de operação. Cada item:
 *   {type:'move',x,y,ms} | {type:'scroll',px,ms} | {type:'click',x,y,ms,pause_ms} |
 *   {type:'pause',ms}. x/y aceitam px OU fração 0..1 do viewport. Sem actions =>
 *   passeio automático.
 * @param {object} [opts.viewport]          {width,height} desktop (default 1440x900).
 * @param {('pad'|'crop')} [opts.fit='pad'] modo de conversão 9:16. 'pad' = site
 *   legível + faixas pretas (viram a moldura Terminal-Noir); 'crop' = coluna central.
 * @param {string} CLIPS_DIR                diretório de saída (do short-server).
 * @returns {Promise<{id:string,sizeBytes:number,text:string,fit:string,viewport:object}>}
 */
export async function screencast({ url, seconds = 11, actions, viewport, fit = 'pad' } = {}, CLIPS_DIR) {
  if (!url || typeof url !== 'string') throw new Error('url (string) é obrigatória');
  if (!CLIPS_DIR) throw new Error('CLIPS_DIR é obrigatório');
  const secs = Math.max(6, Math.min(30, Number(seconds) || 11)); // clamp 6..30s
  const VW = Math.max(640, Math.min(1920, Number(viewport?.width) || 1440));
  const VH = Math.max(480, Math.min(1200, Number(viewport?.height) || 900));
  const fitMode = String(fit).toLowerCase() === 'crop' ? 'crop' : 'pad';

  const id = randomUUID();
  const outMp4 = path.join(CLIPS_DIR, `${id}.mp4`);

  let browser = null;
  let context = null;
  let webmPath = null;
  let text = '';

  try {
    browser = await chromium.launch(resolveLaunchOptions());
    context = await browser.newContext({
      viewport: { width: VW, height: VH },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      // grava DESKTOP (VWxVH); o crop/pad pra 9:16 é feito depois no ffmpeg.
      recordVideo: { dir: CLIPS_DIR, size: { width: VW, height: VH } },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });
    // re-injeta o cursor verde em toda navegação (centro-ish inicial)
    await context.addInitScript(buildCursorInit(Math.round(VW * 0.5), Math.round(VH * 0.4)));

    const page = await context.newPage();

    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    } catch (e) {
      // segue mesmo com timeout — pode já ter conteúdo suficiente
    }

    await dismissCookieBanner(page);
    // garante o cursor mesmo se o initScript não pegou (SPAs que limpam o DOM)
    try { await page.evaluate(buildCursorInit(Math.round(VW * 0.5), Math.round(VH * 0.4))); } catch {}
    await page.waitForTimeout(1200); // deixa render/animação inicial assentar

    let videoPromise = null;
    try { videoPromise = page.video()?.path(); } catch {}

    await runScreenActions(page, actions, secs, VW, VH);

    text = await extractText(page);

    try { webmPath = webmPath || (await videoPromise) || (await page.video()?.path()); } catch {}

    await context.close(); // finaliza/flush do vídeo
    context = null;

    if (!webmPath || !fs.existsSync(webmPath)) {
      const webms = fs.readdirSync(CLIPS_DIR)
        .filter((f) => f.endsWith('.webm'))
        .map((f) => path.join(CLIPS_DIR, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
      webmPath = webms[0];
    }
    if (!webmPath || !fs.existsSync(webmPath)) {
      throw new Error('screencast não gerou .webm (página bloqueou? Chromium falhou?)');
    }

    // converte webm DESKTOP -> mp4 9:16 1080x1920:
    //  - pad: escala a LARGURA pra 1080 (mantém aspecto) e centraliza num canvas
    //    1080x1920 preto (faixas pretas em cima/baixo = moldura Terminal-Noir);
    //  - crop: pega a coluna central 9:16 do desktop e escala pra 1080x1920 (zoom).
    const vf = fitMode === 'crop'
      ? "crop='min(iw,ih*9/16)':ih:(iw-min(iw,ih*9/16))/2:0,scale=1080:1920,format=yuv420p"
      : 'scale=1080:-2,pad=1080:1920:0:(1920-ih)/2:black,format=yuv420p';

    await execFileP('ffmpeg', [
      '-y', '-i', webmPath,
      '-vf', vf,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      outMp4,
    ], { timeout: 180000, maxBuffer: 1024 * 1024 * 32 });

    try { fs.unlinkSync(webmPath); } catch {}

    const st = fs.statSync(outMp4);
    return { id, sizeBytes: st.size, text, fit: fitMode, viewport: { width: VW, height: VH } };
  } finally {
    try { if (context) await context.close(); } catch {}
    try { if (browser) await browser.close(); } catch {}
  }
}
