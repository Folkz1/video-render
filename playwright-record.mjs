// Playwright browser recorder for GuyFolkz 5-min video
// Records local HTML screens + real websites as .webm clips
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = import.meta.dirname;
const REC_DIR = path.join(ROOT, 'public', 'recordings');
const SCREENS_DIR = path.join(ROOT, 'screens');
fs.mkdirSync(REC_DIR, { recursive: true });

const VIEWPORT = { width: 1920, height: 1080 };

const scenes = [
  {
    id: 'data-screen',
    url: `file:///${SCREENS_DIR.replace(/\\/g, '/')}/data-screen.html`,
    wait: 16000,  // Let both phases animate
  },
  {
    id: 'agent-flow',
    url: `file:///${SCREENS_DIR.replace(/\\/g, '/')}/agent-flow.html`,
    wait: 8000,
  },
  {
    id: 'n8n-site',
    url: 'https://n8n.io/',
    wait: 3000,
    actions: async (page) => {
      // Dismiss cookie banner if present
      try {
        const btn = page.locator('button:has-text("Accept"), button:has-text("Aceitar"), [class*="cookie"] button').first();
        if (await btn.isVisible({ timeout: 2000 })) await btn.click();
      } catch {}
      await page.waitForTimeout(1500);
      // Smooth scroll
      for (let i = 0; i < 5; i++) {
        await page.mouse.wheel(0, 250);
        await page.waitForTimeout(600);
      }
      await page.waitForTimeout(1500);
    }
  },
  {
    id: 'elevenlabs-site',
    url: 'https://elevenlabs.io/conversational-ai',
    wait: 3000,
    actions: async (page) => {
      try {
        const btn = page.locator('button:has-text("Accept"), button:has-text("Got it"), [class*="cookie"] button').first();
        if (await btn.isVisible({ timeout: 2000 })) await btn.click();
      } catch {}
      await page.waitForTimeout(2000);
      for (let i = 0; i < 4; i++) {
        await page.mouse.wheel(0, 300);
        await page.waitForTimeout(800);
      }
      await page.waitForTimeout(1500);
    }
  },
  {
    id: 'whatsapp-demo',
    url: `file:///${SCREENS_DIR.replace(/\\/g, '/')}/whatsapp-demo.html`,
    wait: 14000,
  },
  {
    id: 'results-dashboard',
    url: `file:///${SCREENS_DIR.replace(/\\/g, '/')}/results-dashboard.html`,
    wait: 8000,
  },
  {
    id: 'cta-screen',
    url: `file:///${SCREENS_DIR.replace(/\\/g, '/')}/cta-screen.html`,
    wait: 6000,
  }
];

async function recordScene(scene) {
  const targetFile = path.join(REC_DIR, `${scene.id}.webm`);
  if (fs.existsSync(targetFile) && fs.statSync(targetFile).size > 50000) {
    console.log(`[SKIP] ${scene.id} already recorded (${(fs.statSync(targetFile).size/1024/1024).toFixed(1)}MB)`);
    return;
  }

  console.log(`[REC] ${scene.id}: ${scene.url.substring(0, 80)}...`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--window-size=1920,1080', '--disable-gpu', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: {
      dir: REC_DIR,
      size: VIEWPORT
    },
    locale: 'pt-BR',
    colorScheme: 'dark',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    const isLocal = scene.url.startsWith('file:');
    await page.goto(scene.url, {
      waitUntil: isLocal ? 'load' : 'domcontentloaded',
      timeout: 15000
    });

    // Wait for initial load
    await page.waitForTimeout(scene.wait || 5000);

    // Run custom actions if defined
    if (scene.actions) {
      await scene.actions(page);
    }

  } catch (e) {
    console.error(`[WARN] ${scene.id}: ${e.message}`);
    await page.waitForTimeout(3000);
  }

  // Close context to save video
  await context.close();
  await browser.close();

  // Find the latest .webm file and rename it
  const files = fs.readdirSync(REC_DIR)
    .filter(f => f.endsWith('.webm') && !scenes.some(s => f === `${s.id}.webm`))
    .map(f => ({ name: f, time: fs.statSync(path.join(REC_DIR, f)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  if (files.length > 0) {
    const src = path.join(REC_DIR, files[0].name);
    if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    fs.renameSync(src, targetFile);
    const size = fs.statSync(targetFile).size;
    console.log(`[DONE] ${scene.id}: ${(size/1024/1024).toFixed(1)}MB`);
  } else {
    console.error(`[ERROR] ${scene.id}: no recording file found`);
  }
}

async function main() {
  console.log('=== PLAYWRIGHT RECORDER ===');
  console.log(`Recording ${scenes.length} scenes at ${VIEWPORT.width}x${VIEWPORT.height}\n`);

  for (const scene of scenes) {
    await recordScene(scene);
  }

  console.log('\n=== ALL RECORDINGS COMPLETE ===');
  for (const f of fs.readdirSync(REC_DIR).filter(f => f.endsWith('.webm')).sort()) {
    const size = fs.statSync(path.join(REC_DIR, f)).size;
    console.log(`  ${f} (${(size/1024/1024).toFixed(1)}MB)`);
  }
}

main().catch(console.error);
