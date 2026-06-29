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
import { recordPage, screencast } from './record-page.mjs';
import { renderFarm } from './farm.mjs';

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // raiz do repo de render
const ENTRY = path.join(ROOT, 'src', 'index.ts');
const DATA_DIR = process.env.WORKER_DATA_DIR || path.join(ROOT, 'data');
const SHORTS_DIR = path.join(DATA_DIR, 'shorts');
const CLIPS_DIR = path.join(DATA_DIR, 'clips');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const PORT = Number(process.env.PORT || 3002);
// public-dir embarcado: fallback p/ props com caminhos RELATIVOS (staticFile).
// Props com URLs http/data: NAO dependem disto (resolveSrc do ShortV2 usa direto).
const PUBLIC_DIR = process.env.SHORT_PUBLIC_DIR
  ? path.resolve(ROOT, process.env.SHORT_PUBLIC_DIR)
  : path.join(ROOT, 'public-dentaly');
const MAX_BODY = 12 * 1024 * 1024; // 12MB de props (data-uri pequenos cabem)
const MAX_UPLOAD = 650 * 1024 * 1024; // cobre gravações longas/exportadas (~306MB no fluxo real)
// Teto subido de 4 -> 8 (Contabo tem 8 cores). Math.max(1, cores-1) deixa 1 core livre
// pro SO/encode-paralelo; clamp em 8 evita estourar o limite do Remotion (--concurrency
// não pode passar o nº de cores) em servidores menores.
const DEFAULT_CONCURRENCY = Math.max(1, Math.min(8, (os.cpus()?.length || 2) - 1));
// PASSO 1 de velocidade: knobs aplicados ao encode H264 final do renderMedia (caminho NORMAL).
// jpeg em vez de png nos frames intermediários (~3-5x menos I/O por frame; sem alpha, ok no H264);
// x264 superfast + crf:23 (encode mais rápido + arquivo menor que o CRF18 default; bitrate ok p/ feed);
// cache de vídeo off-thread maior reduz re-decode quando há b-roll. NÃO usados no overlay ProRes
// (alpha morre em jpeg; lá o codec é ProRes 4444, sem x264/crf). scale fica 1.0 — qualidade preservada.
const RENDER_IMAGE_FORMAT = 'jpeg';
const RENDER_JPEG_QUALITY = 80;
const RENDER_X264_PRESET = process.env.RENDER_X264_PRESET || 'superfast';
// CRF do x264: default do Remotion = CRF18 (arquivo enorme + encode lento). crf:23 corta
// tamanho e tempo de encode, imperceptível em feed 9:16. Qualidade preservada: scale fica 1.0
// (NUNCA mexer em scale). Só vale no h264 NORMAL — NÃO no overlay ProRes do caminho compose.
const RENDER_CRF = Number(process.env.RENDER_CRF || 23);
const RENDER_OFFTHREAD_CACHE_BYTES = 512 * 1024 * 1024;

// PASSO 3 de velocidade: MODO FARM. Quando FARM_ENABLED=true e o render NORMAL (nao-compose)
// tem durationInFrames > FARM_MIN_FRAMES, em vez de renderMedia local o short-server fatia o
// timeline e distribui nos nos http-worker do nodes.json (render-farm/farm.mjs), agregando
// progresso e concatenando. FARM_ENABLED=false => comportamento IDENTICO ao atual.
// Falha do farm (sem no saudavel, etc) => fallback transparente pro render local.
const FARM_ENABLED = String(process.env.FARM_ENABLED || '').toLowerCase() === 'true';
const FARM_MIN_FRAMES = Number(process.env.FARM_MIN_FRAMES || 3000); // ~100s @30fps
const FARM_NODES_CONFIG = process.env.FARM_NODES_CONFIG
  ? path.resolve(process.env.FARM_NODES_CONFIG)
  : path.join(__dirname, 'nodes.json');
const FARM_CACHE_ROOT = path.join(DATA_DIR, 'farm-cache');
// override opcional do tamanho do chunk via env (senao usa defaults.framesPerChunk do nodes.json)
const FARM_FRAMES_PER_CHUNK = Number(process.env.FARM_FRAMES_PER_CHUNK || 0) || null;

const jobs = new Map(); // id -> job
const queue = [];
let working = false;
let serveUrl = null; // bundle cacheado
let bundling = null;

const nowIso = () => new Date().toISOString();
const log = (...a) => console.log(`[short-server ${nowIso()}]`, ...a);

// GUARDAS DE PROCESSO: jobs pesados (Playwright/Chromium em recordPage/screencast,
// ffmpeg, render) podem emitir rejeições NÃO encadeadas no await (ex: erro no
// processo do browser, EventEmitter 'error' solto). Sem isto o Node default
// (--unhandled-rejections=throw) DERRUBA o servidor inteiro -> o proxy devolve
// 502 HTML em ~0.5s (sintoma do screencast/record-page) e o container reinicia.
// Logamos e seguimos vivos; o handler da rota ainda devolve 502 JSON ao cliente.
process.on('unhandledRejection', (reason) => {
  try { log('unhandledRejection (ignorado, server segue vivo):', reason?.message || reason); } catch {}
});
process.on('uncaughtException', (err) => {
  try { log('uncaughtException (ignorado, server segue vivo):', err?.message || err); } catch {}
});

async function ensureDirs() {
  await mkdir(SHORTS_DIR, { recursive: true });
  await mkdir(CLIPS_DIR, { recursive: true });
  await mkdir(UPLOADS_DIR, { recursive: true });
}

// Clip-to-Short: baixa o TRECHO de um vídeo do YouTube (yt-dlp) e corta em 9:16.
// start/end em segundos. Retorna o id do clip salvo em CLIPS_DIR.
async function resolveSearch(query) {
  // acha a melhor URL de vídeo no YouTube para um termo (yt-dlp ytsearch, mesma infra+proxy)
  const args = ['--no-playlist', '--no-download', '--print', 'webpage_url',
    '--extractor-args', 'youtube:player_client=web_safari,android',
    '--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    '--socket-timeout', '20'];
  if (process.env.YTDLP_COOKIES_FILE) args.push('--cookies', process.env.YTDLP_COOKIES_FILE);
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
  // Defesa anti-bot 2026: só --proxy não basta — YouTube exige player_client + user-agent reais
  // (senão responde "confirme que não é robô"). player_client web_safari/android são menos vigiados.
  const ytCommon = [
    '--extractor-args', 'youtube:player_client=web_safari,android',
    '--user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
    '--retries', '3', '--fragment-retries', '5', '--socket-timeout', '20',
  ];
  if (process.env.YTDLP_COOKIES_FILE) ytCommon.push('--cookies', process.env.YTDLP_COOKIES_FILE);
  if (process.env.YTDLP_PROXY) ytCommon.push('--proxy', process.env.YTDLP_PROXY);
  const dl = async (fmt) => {
    const ytArgs = ['-f', fmt, '--download-sections', `*${start}-${end}`,
      '--force-keyframes-at-cuts', '--no-playlist', '-o', rawTpl, ...ytCommon, youtubeUrl];
    await execFileP('yt-dlp', ytArgs, { timeout: 180000, maxBuffer: 1024 * 1024 * 16 });
  };
  // fallback de formato: se o merge bestvideo+bestaudio falhar, tenta formato único 720p (mais resiliente)
  try { await dl('bestvideo[height<=1080]+bestaudio/best/best'); }
  catch (e) { log('clip dl fallback 720', String(e && e.message).slice(0, 140)); await dl('best[height<=720]/best'); }
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

// Pós-processamento de áudio: normaliza loudness pro padrão de feed (Reels/TikTok),
// -14 LUFS / -1 dBTP, num passe único (rápido: -c:v copy não re-encoda vídeo).
// Tolerante: se ffmpeg falhar/der timeout ou o resultado for inválido, MANTÉM o
// original (áudio não-normalizado é melhor que job falho). Só aplica a .mp4.
async function normalizeAudio(file) {
  if (path.extname(file).toLowerCase() !== '.mp4') {
    log('audio loudnorm skip (não é .mp4):', file);
    return;
  }
  const tmp = `${file}.norm.mp4`;
  try {
    await execFileP('ffmpeg', [
      '-y', '-i', file,
      '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
      tmp,
    ], { timeout: 180000, maxBuffer: 1024 * 1024 * 16 });
    // valida o resultado antes de substituir (exit 0 + arquivo > 100KB)
    const st = fs.statSync(tmp);
    if (st.size > 100 * 1024) {
      fs.renameSync(tmp, file); // substitui o original pelo normalizado
      log('audio loudnorm ok:', file, `(${st.size} bytes)`);
      return;
    }
    log('audio loudnorm skip (tmp inválido/pequeno):', st.size, 'bytes');
  } catch (err) {
    log('audio loudnorm skip (falha):', err?.message || err);
  }
  // qualquer caminho de falha: garante limpeza do tmp e mantém o original
  try { fs.unlinkSync(tmp); } catch {}
}

// Baixa uma URL http(s) para um arquivo local (usa fetch global do Node 22).
// Usado no MODO COMPOSE p/ trazer o vídeo do criador antes do overlay-compose.
async function downloadToFile(url, dest) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`download falhou (${resp.status} ${resp.statusText}) ${url}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length === 0) throw new Error(`download vazio: ${url}`);
  fs.writeFileSync(dest, buf);
  return buf.length;
}

// MODO COMPOSE: sobrepõe o overlay (webm com alpha) no vídeo do criador via ffmpeg.
// scale+crop garante 1920x1080 (16:9) cobrindo qualquer aspect; overlay=shortest=1
// corta na menor faixa; -map 0:a? copia o áudio do criador se existir (? = opcional).
async function composeOverlay(creatorFile, overlayFile, outFile) {
  await execFileP('ffmpeg', [
    '-y', '-i', creatorFile, '-i', overlayFile,
    '-filter_complex',
    '[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1[bg];[bg][1:v]overlay=shortest=1[v]',
    '-map', '[v]', '-map', '0:a?',
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-movflags', '+faststart',
    outFile,
  ], { timeout: 60 * 60 * 1000, maxBuffer: 1024 * 1024 * 16 });
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

// Serializa um job pesado (Chromium do Playwright) contra a MESMA trava `working`
// dos renders Remotion — só 1 Chromium por vez na máquina. Espera a trava liberar
// (poll leve), claim, roda, libera e reativa a fila de renders. Usado pelo
// /api/v1/record-page (Playwright). makeClip (yt-dlp+ffmpeg) não precisa disto.
async function runExclusive(fn) {
  while (working) {
    await new Promise((r) => setTimeout(r, 250));
  }
  working = true;
  try {
    return await fn();
  } finally {
    working = false;
    setImmediate(processQueue); // destrava renders que estavam na fila
  }
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
    if (job.compose) {
      // ===== MODO COMPOSE (formato longo) =====
      // Remotion renderiza SÓ os overlays (transparente) -> ffmpeg sobrepõe no vídeo
      // do criador. Muito mais rápido que renderizar o vídeo-fonte quadro a quadro.
      const creatorUrl = job.props?.creatorVideoUrl;
      if (!creatorUrl) throw new Error('compose=true exige props.creatorVideoUrl');
      const overlayPath = path.join(os.tmpdir(), `${id}-overlay.mov`);
      const creatorPath = path.join(os.tmpdir(), `${id}-creator.mp4`);
      const overlayProps = { ...job.props, overlayOnly: true };
      try {
        // a) render do overlay transparente em ProRes 4444 com alpha (encode "Fast" do Remotion vs
        //    vp8 "Slow"; ffmpeg decoda ProRes intra-frame muito mais rápido que vp8). Mata o gargalo
        //    do compose. duração vem do calculateMetadata via durTotalSec nos props.
        const composition = await selectComposition({
          serveUrl: url,
          id: job.compositionId,
          inputProps: overlayProps,
        });
        job.durationInFrames = composition.durationInFrames;
        log(`compose ${id} comp=${job.compositionId} frames=${composition.durationInFrames} conc=${job.concurrency} (overlay prores4444)`);
        await renderMedia({
          composition,
          serveUrl: url,
          codec: 'prores',
          proResProfile: '4444',
          inputProps: overlayProps,
          outputLocation: overlayPath,
          concurrency: job.concurrency,
          scale: job.scale,
          // NÃO mexer em imageFormat/x264 aqui: overlay é ProRes 4444 com ALPHA
          // (jpeg mataria o canal alpha e não há encode x264 neste passo). Só o cache
          // off-thread se aplica (ajuda decode de qualquer vídeo embarcado no overlay).
          offthreadVideoCacheSizeInBytes: RENDER_OFFTHREAD_CACHE_BYTES,
          overwrite: true,
          logLevel: 'error',
          onProgress: (p) => {
            const pr = typeof p === 'number' ? p : p?.progress ?? 0;
            // overlay = ~90% do tempo; reserva 90-100 pro download+ffmpeg
            job.progress = Math.round(pr * 90);
            job.updatedAt = nowIso();
          },
        });
        // b) baixa o vídeo do criador
        log(`compose ${id} baixando creator -> ${creatorPath}`);
        const dlBytes = await downloadToFile(creatorUrl, creatorPath);
        log(`compose ${id} creator baixado (${dlBytes} bytes)`);
        job.progress = 92;
        job.updatedAt = nowIso();
        // c) ffmpeg overlay-compose -> job.file
        log(`compose ${id} ffmpeg overlay -> ${job.file}`);
        await composeOverlay(creatorPath, overlayPath, job.file);
        job.progress = 98;
        job.updatedAt = nowIso();
        // d) pós-processamento + finalização (igual ao fluxo normal)
        await normalizeAudio(job.file);
        const st = await stat(job.file);
        job.sizeBytes = st.size;
        job.status = 'completed';
        job.progress = 100;
        job.finishedAt = nowIso();
        log(`done ${id} (compose) -> ${job.file} (${st.size} bytes)`);
      } finally {
        // e) limpa temporários (não derruba o job se a limpeza falhar)
        try { fs.unlinkSync(overlayPath); } catch {}
        try { fs.unlinkSync(creatorPath); } catch {}
      }
    } else {
      // ===== FLUXO NORMAL (renderMedia h264) — INTACTO =====
      const composition = await selectComposition({
        serveUrl: url,
        id: job.compositionId,
        inputProps: job.props,
      });
      job.durationInFrames = composition.durationInFrames;
      log(`render ${id} comp=${job.compositionId} frames=${composition.durationInFrames} conc=${job.concurrency}`);

      // ===== MODO FARM (render distribuido) =====
      // Decide farm vs local: flag explicita do job (props.render_opts.farm) tem precedencia;
      // senao o server decide pelo tamanho (FARM_ENABLED && frames > FARM_MIN_FRAMES).
      // serveUrl do short-server e um diretorio de bundle (path) -> serve direto pro farm.
      const farmFlag = job.props?.render_opts?.farm;
      const wantFarm =
        farmFlag === true ||
        (farmFlag !== false && FARM_ENABLED && composition.durationInFrames > FARM_MIN_FRAMES);
      if (wantFarm) {
        try {
          log(`render ${id} -> MODO FARM (frames=${composition.durationInFrames} > min=${FARM_MIN_FRAMES})`);
          await renderFarm({
            bundleDir: url,
            cacheRoot: FARM_CACHE_ROOT,
            composition,
            configPath: FARM_NODES_CONFIG,
            inputProps: job.props,
            outputFile: job.file,
            framesPerChunk: FARM_FRAMES_PER_CHUNK,
            codec: job.codec,
            audioCodec: 'aac',
            onProgress: (frac) => {
              job.progress = Math.round((typeof frac === 'number' ? frac : 0) * 100);
              job.updatedAt = nowIso();
            },
            log: (...a) => log(`[farm ${id}]`, ...a),
          });
          await normalizeAudio(job.file);
          const stf = await stat(job.file);
          job.sizeBytes = stf.size;
          job.status = 'completed';
          job.progress = 100;
          job.finishedAt = nowIso();
          log(`done ${id} (farm) -> ${job.file} (${stf.size} bytes)`);
          return; // sai do processQueue() — finally re-arma a fila
        } catch (farmErr) {
          // fallback transparente: farm indisponivel/falhou -> render local (comportamento atual)
          log(`render ${id} farm FALHOU, fallback local: ${String(farmErr?.message || farmErr).slice(0, 200)}`);
          job.progress = 0;
          job.updatedAt = nowIso();
        }
      }

      await renderMedia({
        composition,
        serveUrl: url,
        codec: job.codec,
        inputProps: job.props,
        outputLocation: job.file,
        concurrency: job.concurrency,
        scale: job.scale,
        // PASSO 1 velocidade (encode H264 final): jpeg nos frames (menos I/O),
        // x264 superfast + crf:23 (encode rápido, arquivo menor; default CRF18 era enorme/lento),
        // cache off-thread maior (menos re-decode de b-roll). NÃO aplicado no overlay ProRes.
        imageFormat: RENDER_IMAGE_FORMAT,
        jpegQuality: RENDER_JPEG_QUALITY,
        x264Preset: RENDER_X264_PRESET,
        crf: RENDER_CRF,
        offthreadVideoCacheSizeInBytes: RENDER_OFFTHREAD_CACHE_BYTES,
        overwrite: true,
        logLevel: 'error',
        onProgress: (p) => {
          const pr = typeof p === 'number' ? p : p?.progress ?? 0;
          job.progress = Math.round(pr * 100);
          job.updatedAt = nowIso();
        },
      });
      // pós-processamento: normaliza o áudio pro padrão de feed (tolerante a falha)
      await normalizeAudio(job.file);
      const st = await stat(job.file);
      job.sizeBytes = st.size;
      job.status = 'completed';
      job.progress = 100;
      job.finishedAt = nowIso();
      log(`done ${id} -> ${job.file} (${st.size} bytes)`);
    }
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

function streamVideo(req, res, file, contentType = 'video/mp4') {
  const st = fs.statSync(file);
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'content-type': contentType,
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
      'content-type': contentType,
      'content-range': `bytes ${start}-${end}/${st.size}`,
      'accept-ranges': 'bytes',
      'content-length': end - start + 1,
      'access-control-allow-origin': '*',
    });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, {
    'content-type': contentType,
    'content-length': st.size,
    'accept-ranges': 'bytes',
    'access-control-allow-origin': '*',
    'content-disposition': `inline; filename="${path.basename(file)}"`,
  });
  return fs.createReadStream(file).pipe(res);
}

// Mapeia extensão de arquivo → content-type de vídeo (uploads podem ser .webm ou .mp4).
function videoContentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.webm') return 'video/webm';
  if (ext === '.mov') return 'video/quicktime';
  return 'video/mp4';
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
        // escala de render: 1 = nativo; <1 acelera (ex 0.667 => 1080p->720p) pra vídeo longo
        scale: Number(body.scale) > 0 ? Number(body.scale) : 1,
        // MODO COMPOSE (formato longo): Remotion renderiza SÓ os overlays (transparente,
        // leve) e o ffmpeg sobrepõe no vídeo do criador (rápido). Evita decodificar o
        // vídeo-fonte quadro a quadro no Remotion (~2h/10min). Requer props.creatorVideoUrl.
        compose: body.compose === true,
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

    // Gravação de tela (Playwright): grava uma URL (notícia/tweet/post) em mp4 9:16
    // pra virar footage do Fiel IA quando NÃO há vídeo do YouTube. Síncrono (igual
    // ao /clip), mas Chromium é pesado -> roda na MESMA trava `working` dos renders
    // (runExclusive: 1 Chromium por vez). Salva em CLIPS_DIR e é servível pelo
    // /api/v1/clips/{id}/video existente.
    if (req.method === 'POST' && u.pathname === '/api/v1/record-page') {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { return jsonResponse(res, 400, { error: 'invalid json' }); }
      const { url, seconds, clipSelector } = body;
      if (!url || typeof url !== 'string') {
        return jsonResponse(res, 400, { error: 'url (string) é obrigatória' });
      }
      try {
        const r = await runExclusive(() => recordPage(
          { url, seconds: seconds != null ? Number(seconds) : undefined, clipSelector },
          CLIPS_DIR,
        ));
        return jsonResponse(res, 200, {
          id: r.id,
          videoUrl: `/api/v1/clips/${r.id}/video`,
          sizeBytes: r.sizeBytes,
          text: r.text,
        });
      } catch (err) {
        log('record-page error', err?.message || err);
        return jsonResponse(res, 502, { error: 'falha ao gravar tela', detail: String(err?.message || err).slice(0, 300) });
      }
    }

    // SCREEN-OP: grava um SITE REAL "operando" (cursor verde + scroll/move/click com
    // easing) num viewport DESKTOP e converte pra 9:16 (fit pad|crop). Footage pra
    // notícias/tutoriais GuyFolkz. Síncrono e pesado (1 Chromium) -> runExclusive,
    // mesma trava dos renders/clips. Servível pelo /api/v1/clips/{id}/video.
    if (req.method === 'POST' && u.pathname === '/api/v1/screencast') {
      const raw = await readBody(req);
      let body;
      try { body = JSON.parse(raw || '{}'); } catch { return jsonResponse(res, 400, { error: 'invalid json' }); }
      const { url, actions, seconds, viewport, fit } = body;
      if (!url || typeof url !== 'string') {
        return jsonResponse(res, 400, { error: 'url (string) é obrigatória' });
      }
      try {
        const r = await runExclusive(() => screencast(
          {
            url,
            seconds: seconds != null ? Number(seconds) : undefined,
            actions: Array.isArray(actions) ? actions : undefined,
            viewport: viewport && typeof viewport === 'object' ? viewport : undefined,
            fit,
          },
          CLIPS_DIR,
        ));
        return jsonResponse(res, 200, {
          id: r.id,
          videoUrl: `/api/v1/clips/${r.id}/video`,
          sizeBytes: r.sizeBytes,
          fit: r.fit,
          viewport: r.viewport,
          text: r.text,
        });
      } catch (err) {
        log('screencast error', err?.message || err);
        return jsonResponse(res, 502, { error: 'falha ao gravar screencast', detail: String(err?.message || err).slice(0, 300) });
      }
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'clips' && parts[3] && parts[4] === 'video') {
      const f = path.join(CLIPS_DIR, `${parts[3]}.mp4`);
      if (!fs.existsSync(f)) return jsonResponse(res, 404, { error: 'clip not found' });
      return streamVideo(req, res, f);
    }

    // Object storage genérico p/ gravações (webm/mp4) — usado quando o B2 não está
    // configurado em prod. Lê o body como BINÁRIO (NÃO usa readBody, que é string).
    if (req.method === 'POST' && u.pathname === '/api/v1/upload') {
      const ext = String(u.searchParams.get('ext') || 'webm').toLowerCase().replace(/[^a-z0-9]/g, '') || 'webm';
      const id = randomUUID();
      const out = path.join(UPLOADS_DIR, `${id}.${ext}`);
      try {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > MAX_UPLOAD) {
            req.destroy();
            return jsonResponse(res, 413, { error: 'upload too large' });
          }
          chunks.push(chunk);
        }
        const buf = Buffer.concat(chunks);
        if (buf.length === 0) return jsonResponse(res, 400, { error: 'empty body' });
        fs.writeFileSync(out, buf);
        log('upload', id, ext, buf.length, 'bytes');
        return jsonResponse(res, 200, { id, url: `/api/v1/uploads/${id}/video`, sizeBytes: buf.length });
      } catch (err) {
        log('upload error', err?.message || err);
        return jsonResponse(res, 500, { error: 'upload failed', detail: String(err?.message || err).slice(0, 300) });
      }
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'uploads' && parts[3] && parts[4] === 'video') {
      // o arquivo pode ser .webm ou .mp4 — acha por prefixo do id
      let f;
      try {
        const name = fs.readdirSync(UPLOADS_DIR).find((n) => n.startsWith(`${parts[3]}.`));
        if (name) f = path.join(UPLOADS_DIR, name);
      } catch {}
      if (!f || !fs.existsSync(f)) return jsonResponse(res, 404, { error: 'upload not found' });
      return streamVideo(req, res, f, videoContentType(f));
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
      if (parts[4] === 'poster' || parts[4] === 'poster.jpg') {
        // Thumbnail: extrai 1 frame (~3s) do vídeo via ffmpeg e CACHEIA o jpg ao lado do mp4.
        const file = job?.file || path.join(SHORTS_DIR, `${parts[3]}.mp4`);
        if (!fs.existsSync(file)) return jsonResponse(res, 404, { error: 'video not found' });
        const poster = `${file}.poster.jpg`;
        try {
          if (!fs.existsSync(poster)) {
            const extract = async (ss) => {
              await execFileP('ffmpeg', [
                '-y', '-ss', String(ss), '-i', file,
                '-frames:v', '1', '-vf', 'scale=540:-1', '-q:v', '5', poster,
              ], { timeout: 30000 });
            };
            try {
              await extract(3);
              if (!fs.existsSync(poster)) await extract(0); // vídeo < 3s
            } catch {
              await extract(0); // fallback: seek pra 3s falhou (vídeo curto)
            }
          }
          if (!fs.existsSync(poster)) return jsonResponse(res, 500, { error: 'poster generation failed' });
          const st = fs.statSync(poster);
          res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': st.size,
            'Cache-Control': 'public, max-age=86400',
          });
          if (req.method === 'HEAD') return res.end();
          return fs.createReadStream(poster).pipe(res);
        } catch (err) {
          return jsonResponse(res, 500, { error: 'poster failed', detail: String(err?.message || err).slice(0, 300) });
        }
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
