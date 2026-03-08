import { getCompositions, renderMedia } from '@remotion/renderer';
import { createReadStream } from 'node:fs';
import { readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {
  createTarGz,
  downloadToFile,
  ensureDir,
  extractTarGz,
  fileExists,
  jsonResponse,
  parseJsonBody,
  safeSlug,
  saveRequestToFile,
} from './common.mjs';

const port = Number(process.env.PORT ?? '3001');
const workerName = process.env.WORKER_NAME ?? os.hostname();
const workerSlots = Number(process.env.WORKER_SLOTS ?? '1');
const defaultRenderConcurrency = Number(process.env.WORKER_RENDER_CONCURRENCY ?? '4');
const dataDir = process.env.WORKER_DATA_DIR ?? path.join(process.cwd(), '.render-farm-worker');

const bundlesDir = path.join(dataDir, 'bundles');
const uploadsDir = path.join(dataDir, 'uploads');
const jobsDir = path.join(dataDir, 'jobs');

const state = {
  activeJobs: 0,
  bundles: new Map(),
  compositionCache: new Map(),
  jobs: new Map(),
  queue: [],
  startedAt: new Date().toISOString(),
};

const summarizeProgress = (progress) => {
  const summary = {};
  const keys = [
    'encodedDoneIn',
    'encodedFrames',
    'expectedFrameCount',
    'renderedDoneIn',
    'renderedFrames',
    'stitchStage',
  ];

  for (const key of keys) {
    if (key in progress) {
      summary[key] = progress[key];
    }
  }

  return summary;
};

const getBundleDir = (bundleId) => path.join(bundlesDir, bundleId);
const getUploadFile = (bundleId) => path.join(uploadsDir, `${bundleId}.tar.gz`);
const getBundleMetadataFile = (bundleId) => path.join(uploadsDir, `${bundleId}.json`);
const getJobDir = (jobId) => path.join(jobsDir, jobId);

const summarizeCompositions = (compositions) =>
  compositions.map((item) => ({
    durationInFrames: item.durationInFrames,
    fps: item.fps,
    id: item.id,
  }));

const createBundleRecord = ({
  archiveBytes = null,
  bundleId,
  compositions,
  uploadedAt = new Date().toISOString(),
}) => ({
  archiveBytes,
  bundleId,
  compositions: summarizeCompositions(compositions),
  uploadedAt,
});

const readBundleMetadata = async (bundleId) => {
  const metadataFile = getBundleMetadataFile(bundleId);
  if (!fileExists(metadataFile)) {
    return null;
  }

  return JSON.parse(await readFile(metadataFile, 'utf8'));
};

const writeBundleMetadata = async (bundle) => {
  await ensureDir(path.dirname(getBundleMetadataFile(bundle.bundleId)));
  await writeFile(getBundleMetadataFile(bundle.bundleId), JSON.stringify(bundle, null, 2));
};

const loadBundle = async (bundleId) => {
  if (state.bundles.has(bundleId)) {
    return state.bundles.get(bundleId);
  }

  const bundleDir = getBundleDir(bundleId);
  if (!fileExists(bundleDir)) {
    return null;
  }

  const metadata = await readBundleMetadata(bundleId);
  const compositions = await getBundleCompositions(bundleId);
  const bundle = createBundleRecord({
    archiveBytes: metadata?.archiveBytes ?? null,
    bundleId,
    compositions,
    uploadedAt: metadata?.uploadedAt ?? new Date().toISOString(),
  });
  state.bundles.set(bundleId, bundle);
  await writeBundleMetadata(bundle);
  return bundle;
};

const ensureBundleArchive = async (bundleId) => {
  const bundle = await loadBundle(bundleId);
  if (!bundle) {
    return null;
  }

  const archiveFile = getUploadFile(bundleId);
  const archiveStats = fileExists(archiveFile) ? await stat(archiveFile) : null;

  if (!archiveStats || bundle.archiveBytes == null || archiveStats.size !== bundle.archiveBytes) {
    const tempArchive = `${archiveFile}.${Date.now()}.tmp`;
    await createTarGz(getBundleDir(bundleId), tempArchive);
    await rm(archiveFile, { force: true });
    await rename(tempArchive, archiveFile);
  }

  const currentStats = await stat(archiveFile);
  const nextBundle = {
    ...bundle,
    archiveBytes: currentStats.size,
  };
  state.bundles.set(bundleId, nextBundle);
  await writeBundleMetadata(nextBundle);
  return {
    archiveFile,
    bundle: nextBundle,
  };
};

const registerBundle = async (bundleId, sourceHandler) => {
  const archiveFile = getUploadFile(bundleId);
  const tempArchiveFile = `${archiveFile}.${Date.now()}.part`;

  try {
    await sourceHandler(tempArchiveFile);
    await extractTarGz(tempArchiveFile, getBundleDir(bundleId));
    state.compositionCache.delete(bundleId);

    const compositions = await getBundleCompositions(bundleId);
    await rm(archiveFile, { force: true });
    await rename(tempArchiveFile, archiveFile);
    const archiveStats = await stat(archiveFile);
    const bundle = createBundleRecord({
      archiveBytes: archiveStats.size,
      bundleId,
      compositions,
    });
    state.bundles.set(bundleId, bundle);
    await writeBundleMetadata(bundle);
    return bundle;
  } catch (error) {
    await rm(tempArchiveFile, { force: true });
    await rm(getBundleDir(bundleId), { recursive: true, force: true });
    state.compositionCache.delete(bundleId);
    state.bundles.delete(bundleId);
    throw error;
  }
};

const publicJob = (job) => ({
  artifacts: {
    audio: job.audioReady ? `/api/v1/jobs/${job.id}/audio` : null,
    video: job.videoReady ? `/api/v1/jobs/${job.id}/video` : null,
  },
  audioCodec: job.audioCodec,
  bundleId: job.bundleId,
  chunkIndex: job.chunkIndex,
  codec: job.codec,
  compositionId: job.compositionId,
  createdAt: job.createdAt,
  error: job.error,
  frameRange: job.frameRange,
  id: job.id,
  progress: job.progress,
  renderConcurrency: job.renderConcurrency,
  startedAt: job.startedAt,
  status: job.status,
  timings: job.timings,
  updatedAt: job.updatedAt,
});

const getBundleCompositions = async (bundleId) => {
  if (state.compositionCache.has(bundleId)) {
    return state.compositionCache.get(bundleId);
  }

  const compositions = await getCompositions(getBundleDir(bundleId), {
    logLevel: 'error',
  });
  state.compositionCache.set(bundleId, compositions);
  return compositions;
};

const finalizeJobFiles = async (job) => {
  if (job.videoFile && fileExists(job.videoFile)) {
    const stats = await stat(job.videoFile);
    job.videoReady = true;
    job.timings.videoBytes = stats.size;
  } else {
    job.videoReady = false;
  }

  if (job.audioFile && fileExists(job.audioFile)) {
    const stats = await stat(job.audioFile);
    job.audioReady = true;
    job.timings.audioBytes = stats.size;
  } else {
    job.audioReady = false;
  }
};

const runJob = async (job) => {
  state.activeJobs += 1;
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.updatedAt = job.startedAt;
  job.progress = {};

  try {
    const compositions = await getBundleCompositions(job.bundleId);
    const composition = compositions.find((item) => item.id === job.compositionId);

    if (!composition) {
      throw new Error(`Composition ${job.compositionId} not found in bundle ${job.bundleId}`);
    }

    const jobDir = getJobDir(job.id);
    await rm(jobDir, { recursive: true, force: true });
    await ensureDir(jobDir);

    job.videoFile = path.join(
      jobDir,
      `${safeSlug(job.compositionId)}-chunk-${String(job.chunkIndex).padStart(4, '0')}.mp4`,
    );
    job.audioFile = job.audioCodec
      ? path.join(
          jobDir,
          `${safeSlug(job.compositionId)}-chunk-${String(job.chunkIndex).padStart(4, '0')}.aac`,
        )
      : null;

    const renderStartedAt = Date.now();

    await renderMedia({
      audioCodec: job.audioFile ? job.audioCodec : null,
      codec: job.codec,
      composition,
      concurrency: job.renderConcurrency,
      frameRange: job.frameRange,
      logLevel: 'error',
      onProgress: (progress) => {
        job.progress = summarizeProgress(progress);
        job.updatedAt = new Date().toISOString();
      },
      outputLocation: job.videoFile,
      overwrite: true,
      separateAudioTo: job.audioFile,
      serveUrl: getBundleDir(job.bundleId),
    });

    job.timings.renderMs = Date.now() - renderStartedAt;
    await finalizeJobFiles(job);
    job.status = 'completed';
    job.updatedAt = new Date().toISOString();
  } catch (error) {
    job.error = error instanceof Error ? error.message : String(error);
    job.status = 'failed';
    job.updatedAt = new Date().toISOString();
  } finally {
    state.activeJobs -= 1;
    processQueue();
  }
};

const processQueue = () => {
  while (state.activeJobs < workerSlots && state.queue.length > 0) {
    const jobId = state.queue.shift();
    const job = state.jobs.get(jobId);
    if (!job || job.status !== 'queued') {
      continue;
    }

    void runJob(job);
  }
};

const route = async (req, res) => {
  const requestUrl = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const parts = requestUrl.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && requestUrl.pathname === '/health') {
    return jsonResponse(res, 200, {
      activeJobs: state.activeJobs,
      queuedJobs: state.queue.length,
      startedAt: state.startedAt,
      workerName,
      workerSlots,
    });
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'bundles' && parts[3]) {
    const bundleId = parts[3];
    const contentType = req.headers['content-type'] ?? '';
    const requestBody = contentType.includes('application/json') ? await parseJsonBody(req) : null;

    if (requestBody && !requestBody.archiveUrl) {
      return jsonResponse(res, 400, { error: 'archiveUrl is required for JSON bundle registration' });
    }

    const bundle = await registerBundle(bundleId, async (archiveFile) => {
      if (requestBody) {
        await downloadToFile(requestBody.archiveUrl, archiveFile, {
          timeoutMs: 60 * 60_000,
        });
        return;
      }

      await saveRequestToFile(req, archiveFile);
    });

    return jsonResponse(res, 201, bundle);
  }

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'bundles' && parts[3]) {
    if (parts[4] === 'archive') {
      const archive = await ensureBundleArchive(parts[3]);
      if (!archive) {
        return jsonResponse(res, 404, { error: 'Bundle archive not found' });
      }

      res.writeHead(200, { 'content-type': 'application/gzip' });
      createReadStream(archive.archiveFile).pipe(res);
      return;
    }

    const bundle = await loadBundle(parts[3]);
    if (!bundle) {
      return jsonResponse(res, 404, { error: 'Bundle not found' });
    }

    return jsonResponse(res, 200, bundle);
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/v1/jobs') {
    const body = await parseJsonBody(req);
    const frameRange = Array.isArray(body.frameRange) ? body.frameRange : null;

    if (!body.bundleId || !body.compositionId || typeof body.chunkIndex !== 'number' || !frameRange) {
      return jsonResponse(res, 400, { error: 'bundleId, compositionId, chunkIndex and frameRange are required' });
    }

    const bundle = await loadBundle(body.bundleId);
    if (!bundle) {
      return jsonResponse(res, 404, { error: `Bundle ${body.bundleId} not found` });
    }

    const jobId =
      body.jobId ??
      `${safeSlug(body.bundleId)}-${safeSlug(body.compositionId)}-${String(body.chunkIndex).padStart(4, '0')}`;

    const job = {
      audioCodec: body.audioCodec ?? 'aac',
      audioFile: null,
      audioReady: false,
      bundleId: body.bundleId,
      chunkIndex: body.chunkIndex,
      codec: body.codec ?? 'h264',
      compositionId: body.compositionId,
      createdAt: new Date().toISOString(),
      error: null,
      frameRange,
      id: jobId,
      progress: {},
      renderConcurrency: Number(body.renderConcurrency ?? defaultRenderConcurrency),
      startedAt: null,
      status: 'queued',
      timings: {},
      updatedAt: new Date().toISOString(),
      videoFile: null,
      videoReady: false,
    };

    state.jobs.set(job.id, job);
    state.queue.push(job.id);
    processQueue();
    return jsonResponse(res, 202, publicJob(job));
  }

  if (parts[0] === 'api' && parts[1] === 'v1' && parts[2] === 'jobs' && parts[3]) {
    const job = state.jobs.get(parts[3]);
    if (!job) {
      return jsonResponse(res, 404, { error: 'Job not found' });
    }

    if (req.method === 'GET' && parts.length === 4) {
      return jsonResponse(res, 200, publicJob(job));
    }

    if (req.method === 'GET' && parts[4] === 'video' && job.videoReady && job.videoFile) {
      res.writeHead(200, { 'content-type': 'video/mp4' });
      createReadStream(job.videoFile).pipe(res);
      return;
    }

    if (req.method === 'GET' && parts[4] === 'audio' && job.audioReady && job.audioFile) {
      res.writeHead(200, { 'content-type': 'audio/aac' });
      createReadStream(job.audioFile).pipe(res);
      return;
    }

    if (req.method === 'DELETE' && parts.length === 4) {
      await rm(getJobDir(job.id), { recursive: true, force: true });
      state.jobs.delete(job.id);
      return jsonResponse(res, 200, { deleted: true, jobId: job.id });
    }
  }

  return jsonResponse(res, 404, { error: 'Not found' });
};

await ensureDir(bundlesDir);
await ensureDir(uploadsDir);
await ensureDir(jobsDir);

const server = http.createServer((req, res) => {
  void route(req, res).catch((error) => {
    jsonResponse(res, 500, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
});

server.requestTimeout = 0;
server.headersTimeout = 0;
server.timeout = 0;

server.listen(port, '0.0.0.0', () => {
  console.log(`render-farm worker listening on 0.0.0.0:${port} as ${workerName}`);
});
