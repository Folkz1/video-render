// Record browser screens for all 3 videos using Playwright
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const ROOT = import.meta.dirname;
const REC_DIR = path.join(ROOT, 'public', 'recordings-v2');
fs.mkdirSync(REC_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };
const RECORD_SECONDS = 12; // Each scene records for 12 seconds

// All scenes for 3 videos
const SCENES = [
  // === VIDEO 1 (reuse some from v1 + new CTA) ===
  { id: 'v1-data-screen',     type: 'local', file: 'screens/data-screen.html',       dur: 14 },
  { id: 'v1-agent-flow',      type: 'local', file: 'screens/agent-flow.html',        dur: 12 },
  { id: 'v1-n8n-site',        type: 'url',   url: 'https://n8n.io',                  dur: 12 },
  { id: 'v1-elevenlabs-site', type: 'url',   url: 'https://elevenlabs.io',           dur: 12 },
  { id: 'v1-results',         type: 'local', file: 'screens/results-dashboard.html',  dur: 12 },
  { id: 'v1-whatsapp',        type: 'local', file: 'screens/whatsapp-demo.html',     dur: 14 },
  { id: 'v1-cta',             type: 'local', file: 'screens/cta-consultoria.html',   dur: 12 },

  // === VIDEO 2 (Projects showcase) ===
  { id: 'v2-projects',        type: 'local', file: 'screens/v2-projects-showcase.html', dur: 14 },
  { id: 'v2-licitaai',        type: 'local', file: 'screens/v2-licitaai-dashboard.html', dur: 14 },
  { id: 'v2-superbot',        type: 'local', file: 'screens/v2-superbot-detail.html',   dur: 14 },
  { id: 'v2-cta',             type: 'local', file: 'screens/cta-consultoria.html',   dur: 12 },

  // === VIDEO 3 (Pipeline / Meta) ===
  { id: 'v3-pipeline',        type: 'local', file: 'screens/v3-pipeline-overview.html', dur: 14 },
  { id: 'v3-terminal',        type: 'local', file: 'screens/v3-terminal-demo.html',     dur: 14 },
  { id: 'v3-cta',             type: 'local', file: 'screens/cta-consultoria.html',      dur: 12 },
];

async function recordScene(browser, scene) {
  const outPath = path.join(REC_DIR, `${scene.id}.webm`);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 50000) {
    console.log(`[SKIP] ${scene.id} already recorded`);
    return;
  }

  console.log(`[RECORD] ${scene.id} (${scene.dur}s)...`);

  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: 'dark',
    recordVideo: { dir: REC_DIR, size: VIEWPORT },
  });

  const page = await context.newPage();

  try {
    if (scene.type === 'local') {
      const filePath = path.join(ROOT, scene.file);
      await page.goto(`file://${filePath}`, { waitUntil: 'networkidle', timeout: 15000 });
    } else {
      await page.goto(scene.url, { waitUntil: 'load', timeout: 20000 });

      // Dismiss cookie banners
      for (const sel of ['[class*="cookie"] button', '[id*="cookie"] button', 'button:has-text("Accept")', 'button:has-text("Aceitar")']) {
        try { await page.click(sel, { timeout: 2000 }); } catch {}
      }
    }

    // Wait for animations to play
    await page.waitForTimeout(2000);

    // Slow scroll for web pages
    if (scene.type === 'url') {
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(1500);
      }
    } else {
      // Just wait and let CSS animations play
      await page.waitForTimeout((scene.dur - 2) * 1000);
    }
  } catch (e) {
    console.log(`  [WARN] ${scene.id}: ${e.message.substring(0, 80)}`);
    await page.waitForTimeout(5000);
  }

  await context.close();

  // Rename the auto-generated video file
  const files = fs.readdirSync(REC_DIR).filter(f => f.endsWith('.webm') && !SCENES.some(s => f === `${s.id}.webm`));
  if (files.length > 0) {
    const latestFile = files.sort((a, b) => {
      return fs.statSync(path.join(REC_DIR, b)).mtimeMs - fs.statSync(path.join(REC_DIR, a)).mtimeMs;
    })[0];
    fs.renameSync(path.join(REC_DIR, latestFile), outPath);
    const sizeMB = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
    console.log(`[DONE] ${scene.id}: ${sizeMB}MB`);
  } else {
    console.log(`[WARN] No recording file found for ${scene.id}`);
  }
}

async function main() {
  console.log('=== PLAYWRIGHT RECORDER V2 ===');
  console.log(`Recording ${SCENES.length} scenes at ${VIEWPORT.width}x${VIEWPORT.height}\n`);

  const browser = await chromium.launch({ headless: true });

  for (const scene of SCENES) {
    await recordScene(browser, scene);
  }

  await browser.close();

  console.log('\n=== ALL RECORDINGS COMPLETE ===');
  const files = fs.readdirSync(REC_DIR).filter(f => f.endsWith('.webm'));
  let totalSize = 0;
  for (const f of files.sort()) {
    const size = fs.statSync(path.join(REC_DIR, f)).size;
    totalSize += size;
    console.log(`  ${f} (${(size/1024/1024).toFixed(1)}MB)`);
  }
  console.log(`\n  Total: ${(totalSize/1024/1024).toFixed(1)}MB across ${files.length} recordings`);
}

main().catch(console.error);
