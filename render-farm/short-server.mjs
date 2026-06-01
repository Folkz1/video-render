// render-farm/short-server.mjs
// Servico HTTP de render de SHORTS por PROPS (F1 do Creative-Autopost).
//
// Diferente do worker.mjs (render por CHUNK, p/ long-form distribuido), aqui o foco e:
//   - receber PROPS dinamicos (ShortV2) com URLs absolutas de midia,
//   - renderizar o short COMPLETO (sem sharding; shorts ~900 frames),
//   - salvar o mp4 em storage LOCAL gratis (WORKER_DATA_DIR / bind mount),
//   - servir o resultado p/ download (com range requests / streaming).
//
// Fila serializada (1 render por vez) — alinhado a CPU sem GPU e ao limite de
// 1 Chromium por vez. Bundle do projeto e feito UMA vez e reusado.
//
// Endpoints:
//   GET  /health                    -> status do servico + bundle
//   POST /api/v1/shorts             -> { compositionId?, props, codec?, concurrency? } -> 202 { id, status }
//   GET  /api/v1/shorts/:id         -> { id, status, progress, downloadUrl, ... }
//   GET  /api/v1/shorts/:id/video   -> stream do mp4 (range-aware)

import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderMedia } from '@remotion/renderer';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // raiz do repo de render
const ENTRY = path.join(ROOT, 'src', 'index.ts');
const DATA_DIR = process.env.WORKER_DATA_DIR || path.join(ROOT, 'data');
const SHORTS_DIR = path.join(DATA_DIR, 'shorts');
const CLIPS_DIR = path.join(DATA_DIR, 'clips');
const PORT = Number(process.env.PORT || 3002);
// public-dir embarcado: fallback p/ props com caminhos RELATIVOS (staticFile).
// Props com URLs http/data: NAO dependem disto (resolveSrc do ShortV2 usa direto).
const PUBLIC_DIR = process.env.SHORT_PUBLIC_DIR
  ? path.resolve(ROOT, process.env.SHORT_PUBLIC_DIR)
  : path.join(ROOT, 'public-dentaly');
const MAX_BODY = 12 * 1024 * 1024; // 12MB de props (data-uri pequenos cabem)
const DEFAULT_CONCURRENCY = Math.max(1, Math.min(4, (os.cpus()?.length || 2) - 1));

const jobs = new Map(); // id -> job
const queue = [];
let working = false;
let serveUrl = null; // bundle cacheado
let bundling = null;

const nowIso = () => new Date().toISOString();
const log = (...a) => console.log(`[short-server ${nowIso()}]`, ...a);

async function ensureDirs() {
  await mkdir(SHORTS_DIR, { recursive: true });
  await mkdir(CLIPS_DIR, { recursive: true });
}

// Clip-to-Short: baixa o TRECHO de um vídeo do YouTube (yt-dlp) e corta em 9:16.
// start/end em segundos. Retorna o id do clip salvo em CLIPS_DIR.
async function resolveSearch(query) {
  // acha a melhor URL de vídeo no YouTube para um termo (yt-dlp ytsearch, mesma infra+proxy)
  const args = ['--no-playlist', '--no-download', '--print', 'webpage_url'];
  if (process.env.YTDLP_PROXY) args.push('--proxy', process.env.YTDLP_PROXY);
  // ytsearch3 + filtro de duração no formato p/ evitar lives/vídeos enormes; pega o 1º válido
  args.push(`ytsearch3:${query}`);
  const { stdout } = await execFileP('yt-dlp', args, { timeout: 90000, maxBuffer: 1024 * 1024 * 8 });
  const url = (stdout || '').trim().split('\n').map((s) => s.trim()).filter(Boolean)[0];
  if (!url) throw new Error('busca no YouTube não retornou vídeo');
  return url;
}

async function makeClip(youtubeUrl, start, end, search) {
  const id = randomUUID();
  const out = path.join(CLIPS_DIR, `${id}.mp4`);
  if (!youtubeUrl && search) {
    youtubeUrl = await resolveSearch(search);
    log('clip search', search, '->', youtubeUrl);
  }
  // 1) baixa SÓ o trecho (eficiente). Proxy Webshare se configurado (YouTube bloqueia datacenter).
  //    Deixa o yt-dlp escolher a extensão (%(ext)s): merge vp9+opus vira .webm/.mkv,
  //    não .mp4 — fixar .mp4 fazia o ffmpeg não achar o arquivo.
  const rawTpl = path.join(CLIPS_DIR, `${id}-raw.%(ext)s`);
  const ytArgs = [
    '-f', 'bestvideo[height<=1080]+bestaudio/best/best',
    '--download-sections', `*${start}-${end}`,
    '--force-keyframes-at-cuts', '--no-playlist', '-o', rawTpl,
  ];
  if (process.env.YTDLP_PROXY) ytArgs.push('--proxy', process.env.YTDLP_PROXY);
  ytArgs.push(youtubeUrl);
  await execFileP('yt-dlp', ytArgs, { timeout: 180000, maxBuffer: 1024 * 1024 * 16 });
  // localiza o arquivo realmente gerado (qualquer extensão), ignorando
  // fragmentos intermediários do merge (ex: {id}-raw.f137.webm) e pegando o maior.
  const raw = fs.readdirSync(CLIPS_DIR)
    .filter((f) => f.startsWith(`${id}-raw.`) && !/-raw\.f\d+\./.test(f))
    .map((f) => path.join(CLIPS_DIR, f))
    .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
  if (!raw) throw new Error('yt-dlp não gerou arquivo (download bloqueado pelo proxy?)');
  // 2) 9:16 robusto p/ qualquer aspect (landscape/portrait/square):
  //    escala p/ COBRIR 1080x1920 e corta o centro. Evita crop impossível
  //    quando a altura escalada fica < 1920 (caso 16:9, o mais comum).
  await execFileP('ffmpeg', [
    '-y', '-i', raw,
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-movflags', '+faststart', out,
  ], { timeout: 180000, maxBuffer: 1024 * 1024 * 16 });
  try { fs.unlinkSync(raw); } catch {}
  const st = fs.statSync(out);
  return { id, sizeBytes: st.size };
}

async function getServeUrl() {
  if (serveUrl) return serveUrl;
  if (!bundling) {
    log('bundling project...', ENTRY, 'publicDir=', PUBLIC_DIR);
    bundling = bundle({
      entryPoint: ENTRY,
      publicDir: PUBLIC_DIR,
      onProgress: (p) => {
        if (p % 25 === 0) log(`bundle ${p}%`);
      },
    })
      .then((url) => {
        serveUrl = url;
        log('bundle ready:', url);
        return url;
      })
      .catch((err) => {
        bundling = null; // permite retry
        throw err;
      });
  }
  return bundling;
}

function jsonResponse(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

function publicJob(job) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    compositionId: job.compositionId,
    durationInFrames: job.durationInFrames,
    createdAt: job.createdAt,
    finishedAt: job.finishedAt,
    sizeBytes: job.sizeBytes,
    downloadUrl: job.status === 'completed' ? `/api/v1/shorts/${job.id}/video` : null,
  };
}

async function processQueue() {
  if (working) return;
  const id = queue.shift();
  if (!id) return;
  const job = jobs.get(id);
  if (!job) return processQueue();
  working = true;
  job.status = 'rendering';
  job.updatedAt = nowIso();
  try {
    const url = await getServeUrl();
    const composition = await selectComposition({
      serveUrl: url,
      id: job.compositionId,
      inputProps: job.props,
    });
    job.durationInFrames = composition.durationInFrames;
    log(`render ${id} comp=${job.compositionId} frames=${composition.durationInFrames} conc=${job.concurrency}`);
    await renderMedia({
      composition,
      serveUrl: url,
      codec: job.codec,
      inputProps: job.props,
      outputLocation: job.file,
      concurrency: job.concurrency,
      overwrite: true,
      logLevel: 'error',
      onProgress: (p) => {
        const pr = typeof p === 'number' ? p : p?.progress ?? 0;
        job.progress = Math.round(pr * 100);
        job.updatedAt = nowIso();
      },
    });
    const st = await stat(job.file);
    job.sizeBytes = st.size;
    job.status = 'completed';
    job.progress = 100;
    job.finishedAt = nowIso();
    log(`done ${id} -> ${job.file} (${st.size} bytes)`);
  } catch (err) {
    job.error = err instanceof Error ? err.message : String(err);
    job.status = 'failed';
    job.finishedAt = nowIso();
    log(`FAILED ${id}: ${job.error}`);
  } finally {
    working = false;
    setImmediate(processQueue);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new Error('body too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function streamVideo(req, res, file) {
  const st = fs.statSync(file);
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'content-type': 'video/mp4',
      'content-length': st.size,
      'accept-ranges': 'bytes',
      'access-control-allow-origin': '*',
    });
    return res.end();
  }
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : st.size - 1;
    if (start > end || start >= st.size) {
      res.writeHead(416, { 'content-range': `bytes */${st.size}` });
      return res.end();
    }
    res.writeHead(206, {
      'content-type': 'video/mp4',
      'content-range': `bytes ${start}-${end}/${st.size}`,
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      'access-control-allow-origin': '*',
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, {
    'content-type': 'video/mp4',
    'content-length': st.size,
    'accept-ranges': 'bytes',
    'access-control-allow-origin': '*',
    'content-disposition': `inline; filename="${path.basename(file)}"`,
  });
  return fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const parts = u.pathname.split('/').filter(Boolean);

    if (req.method === 'OPTIONS') return jsonResponse(res, 204, {});

    if (req.method === 'GET' && u.pathname === '/health') {
      return jsonResponse(res, 200, {
        ok: true,
        service: 'short-server',
        bundleReady: Boolean(serveUrl),
        working,
        queued: queue.length,
        jobs: jobs.size,
        concurrency: DEFAULT_CONCURRENCY,
        publicDir: PUBLIC_DIR,
        dataDir: SHORTS_DIR,
      });
    }

    if (req.method === 'POST' && u.pathname === '/api/v1/shorts') {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        return jsonResponse(res, 400, { error: 'invalid json' });
      }
      const props = body.props;
      if (!props || typeof props !== 'object') {
        return jsonResponse(res, 400, { error: 'props (object) is required' });
      }
      const id = randomUUID();
      const job = {
        id,
        compositionId: body.compositionId || 'ShortV2',
        props,
        codec: body.codec || 'h264',
        concurrency: Number(body.concurrency) || DEFAULT_CONCURRENCY,
        status: 'queued',
        progress: 0,
        error: null,
        file: path.join(SHORTS_DIR, `${id}.mp4`),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        finishedAt: null,
        durationInFrames: null,
        sizeBytes: null,
      };
      jobs.set(id, job);
      queue.push(id);
      getServeUrl().catch(() => {}); // warm bundle
      setImmediate(processQueue);
      return jsonResponse(res, 202, publicJob(job));
    }

    // Clip-to-Short: corta trecho real de um vídeo do YouTube (síncrono; trecho curto)
    if (req.method === 'POST' && u.pathname === '/api/v1/clip') {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { return jsonResponse(res, 400, { error: 'invalid json' }); }
      const { youtube_url, search, start, end } = body;
      if ((!youtube_url && !search) || start == null || end == null) {
        return jsonResponse(res, 400, { error: 'youtube_url OU search, mais start, end (segundos) obrigatórios' });
      }
      try {
        const r = await makeClip(youtube_url, Number(start), Number(end), search);
        return jsonResponse(res, 200, { id: r.id, sizeBytes: r.sizeBytes, downloadUrl: `/api/v1/clips/${r.id}/video` });
      } catch (err) {
        log('clip error', err?.message || err);
        return jsonResponse(res, 502, { error: 'falha ao cortar clip', detail: String(err?.message || err).slice(0, 300) });
      }
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'clips' && parts[3] && parts[4] === 'video') {
      const f = path.join(CLIPS_DIR, `${parts[3]}.mp4`);
      if (!fs.existsSync(f)) return jsonResponse(res, 404, { error: 'clip not found' });
      return streamVideo(req, res, f);
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'shorts' && parts[3]) {
      const job = jobs.get(parts[3]);
      if (parts[4] === 'video') {
        const file = job?.file || path.join(SHORTS_DIR, `${parts[3]}.mp4`);
        if (job && job.status !== 'completed' && !fs.existsSync(file)) {
          return jsonResponse(res, 409, { error: 'not ready', status: job.status });
        }
        if (!fs.existsSync(file)) return jsonResponse(res, 404, { error: 'video not found' });
        return streamVideo(req, res, file);
      }
      if (!job) return jsonResponse(res, 404, { error: 'job not found' });
      return jsonResponse(res, 200, publicJob(job));
    }

    return jsonResponse(res, 404, { error: 'not found' });
  } catch (err) {
    log('route error', err);
    return jsonResponse(res, 500, { error: String(err?.message || err) });
  }
});

await ensureDirs();
getServeUrl().catch((e) => log('initial bundle failed (vai tentar de novo no 1o job):', e?.message || e));
server.listen(PORT, '0.0.0.0', () => log(`short-server on :${PORT} data=${SHORTS_DIR} publicDir=${PUBLIC_DIR}`));
