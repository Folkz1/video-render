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

// Binário do Chromium no container: o Dockerfile.short-server instala `chromium`
// via APT em /usr/bin/chromium e NÃO roda `npx playwright install` — então não
// existe o browser baixado pelo Playwright. Usamos o do APT.
//   - CHROMIUM_PATH (env) vence, se setado.
//   - senão /usr/bin/chromium (path do APT no Debian slim, confirmado no Dockerfile).
//   - se nenhum existir (ex: dev local), cai pro channel 'chromium' do Playwright.
function resolveLaunchOptions() {
  const candidates = [
    process.env.CHROMIUM_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return {
          headless: true,
          executablePath: p,
          args: ['--no-sandbox', '--disable-dev-shm-usage'],
        };
      }
    } catch {}
  }
  // Fallback (dev local com `npx playwright install` feito): usa o channel.
  return { headless: true, channel: 'chromium', args: ['--no-sandbox', '--disable-dev-shm-usage'] };
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
