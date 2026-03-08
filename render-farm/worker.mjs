import { getCompositions, renderMedia } from '@remotion/renderer';
import { createReadStream } from 'node:fs';
import { readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
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

const bytesInGiB = 1024 ** 3;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

const clampRatio = (value, fallback) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
    return fallback;
  }

  return parsed;
};

const nowIso = () => new Date().toISOString();

const port = Number(process.env.PORT ?? '3001');
const workerName = process.env.WORKER_NAME ?? os.hostname();
const workerSlots = Math.max(1, parsePositiveInteger(process.env.WORKER_SLOTS ?? '1', 1));
const defaultRenderConcurrency = Math.max(
  1,
  parsePositiveInteger(process.env.WORKER_RENDER_CONCURRENCY ?? '4', 4),
);
const dataDir = process.env.WORKER_DATA_DIR ?? path.join(process.cwd(), '.render-farm-worker');
const bundleRetentionMs = parsePositiveInteger(
  process.env.WORKER_BUNDLE_RETENTION_MS ?? 2 * 60 * 60_000,
  2 * 60 * 60_000,
);
const jobRetentionMs = parsePositiveInteger(
  process.env.WORKER_JOB_RETENTION_MS ?? 30 * 60_000,
  30 * 60_000,
);
const cleanupIntervalMs = parsePositiveInteger(
  process.env.WORKER_CLEANUP_INTERVAL_MS ?? 5 * 60_000,
  5 * 60_000,
);
const maxFreeCapacityRatio = clampRatio(
  process.env.WORKER_MAX_FREE_CAPACITY_RATIO ?? 0.6,
  0.6,
);
const minFreeMemoryPerJobBytes = parsePositiveInteger(
  process.env.WORKER_MIN_FREE_MEMORY_PER_JOB_BYTES ?? 2 * bytesInGiB,
  2 * bytesInGiB,
);
const staleUploadRetentionMs = Math.max(bundleRetentionMs, jobRetentionMs);

const bundlesDir = path.join(dataDir, 'bundles');
const uploadsDir = path.join(dataDir, 'uploads');
const jobsDir = path.join(dataDir, 'jobs');

const state = {
  activeJobs: 0,
  bundles: new Map(),
  compositionCache: new Map(),
  jobs: new Map(),
  queue: [],
  startedAt: nowIso(),
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

const bundleExpiryIso = (timestamp = Date.now()) =>
  new Date(timestamp + bundleRetentionMs).toISOString();

const parseTimestamp = (value) => {
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};

const createBundleRecord = ({
  archiveBytes = null,
  bundleId,
  compositions,
  expiresAt = null,
  lastAccessedAt = null,
  uploadedAt = nowIso(),
}) => {
  const leaseTimestamp =
    parseTimestamp(lastAccessedAt) ??
    parseTimestamp(uploadedAt) ??
    Date.now();

  return {
    archiveBytes,
    bundleId,
    compositions: summarizeCompositions(compositions),
    expiresAt: expiresAt ?? bundleExpiryIso(leaseTimestamp),
    lastAccessedAt: lastAccessedAt ?? uploadedAt,
    uploadedAt,
  };
};

const writeBundleMetadata = async (bundle) => {
  await ensureDir(path.dirname(getBundleMetadataFile(bundle.bundleId)));
  await writeFile(getBundleMetadataFile(bundle.bundleId), JSON.stringify(bundle, null, 2));
};

const persistBundleRecord = async (bundle) => {
  state.bundles.set(bundle.bundleId, bundle);
  await writeBundleMetadata(bundle);
  return bundle;
};

const withBundleLease = (bundle, timestamp = Date.now()) => ({
  ...bundle,
  expiresAt: bundleExpiryIso(timestamp),
  lastAccessedAt: new Date(timestamp).toISOString(),
});

const readBundleMetadata = async (bundleId) => {
  const metadataFile = getBundleMetadataFile(bundleId);
  if (!fileExists(metadataFile)) {
    return null;
  }

  return JSON.parse(await readFile(metadataFile, 'utf8'));
};

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
    expiresAt: metadata?.expiresAt ?? null,
    lastAccessedAt: metadata?.lastAccessedAt ?? metadata?.uploadedAt ?? null,
    uploadedAt: metadata?.uploadedAt ?? nowIso(),
  });
  await persistBundleRecord(bundle);
  return bundle;
};

const touchBundle = async (bundleId) => {
  const bundle = await loadBundle(bundleId);
  if (!bundle) {
    return null;
  }

  return persistBundleRecord(withBundleLease(bundle));
};

const ensureBundleArchive = async (bundleId) => {
  const bundle = await touchBundle(bundleId);
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
  await persistBundleRecord(nextBundle);
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
    await persistBundleRecord(bundle);
    return bundle;
  } catch (error) {
    await rm(tempArchiveFile, { force: true });
    await rm(getBundleDir(bundleId), { recursive: true, force: true });
    state.compositionCache.delete(bundleId);
    state.bundles.delete(bundleId);
    throw error;
  }
};

const getCapacitySnapshot = () => {
  const cpuCount = Math.max(1, os.cpus().length);
  const loadAverage = os.loadavg();
  const freeCpuCores = Math.max(0, cpuCount - loadAverage[0]);
  const freeCpuBudgetCores = Math.max(0, freeCpuCores * maxFreeCapacityRatio);
  const totalMemoryBytes = os.totalmem();
  const freeMemoryBytes = os.freemem();
  const freeMemoryBudgetBytes = Math.max(0, Math.floor(freeMemoryBytes * maxFreeCapacityRatio));
  const safeWorkerSlotsByCpu = Math.floor(freeCpuBudgetCores);
  const safeWorkerSlotsByMemory = Math.floor(freeMemoryBudgetBytes / minFreeMemoryPerJobBytes);
  const safeWorkerSlots = Math.max(
    0,
    Math.min(workerSlots, safeWorkerSlotsByCpu, safeWorkerSlotsByMemory),
  );
  const safeRenderConcurrency =
    safeWorkerSlots > 0
      ? Math.max(1, Math.min(defaultRenderConcurrency, Math.floor(freeCpuBudgetCores / safeWorkerSlots) || 1))
      : 0;

  return {
    limits: {
      configuredRenderConcurrency: defaultRenderConcurrency,
      configuredWorkerSlots: workerSlots,
      maxFreeCapacityRatio,
      minFreeMemoryPerJobBytes,
      safeRenderConcurrency,
      safeWorkerSlots,
    },
    policy: {
      bundleRetentionMs,
      cleanupIntervalMs,
      jobRetentionMs,
      storageMode: 'temporary',
    },
    system: {
      cpuCount,
      freeCpuBudgetCores,
      freeCpuCores,
      freeMemoryBudgetBytes,
      freeMemoryBytes,
      loadAverage,
      totalMemoryBytes,
    },
  };
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
  effectiveRenderConcurrency: job.effectiveRenderConcurrency,
  error: job.error,
  frameRange: job.frameRange,
  id: job.id,
  progress: job.progress,
  renderConcurrency: job.renderConcurrency,
  requestedRenderConcurrency: job.requestedRenderConcurrency,
  startedAt: job.startedAt,
  status: job.status,
  timings: job.timings,
  updatedAt: job.updatedAt,
});

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

const deleteJob = async (jobId) => {
  await rm(getJobDir(jobId), { recursive: true, force: true });
  state.jobs.delete(jobId);
  state.queue = state.queue.filter((queuedJobId) => queuedJobId !== jobId);
};

const deleteBundle = async (bundleId) => {
  await rm(getBundleDir(bundleId), { recursive: true, force: true });
  await rm(getUploadFile(bundleId), { force: true });
  await rm(getBundleMetadataFile(bundleId), { force: true });
  state.bundles.delete(bundleId);
  state.compositionCache.delete(bundleId);
};

const listKnownBundleIds = async () => {
  const ids = new Set(state.bundles.keys());
  const [uploadEntries, bundleEntries] = await Promise.all([
    readdir(uploadsDir, { withFileTypes: true }).catch(() => []),
    readdir(bundlesDir, { withFileTypes: true }).catch(() => []),
  ]);

  for (const entry of uploadEntries) {
    if (entry.isFile() && entry.name.endsWith('.json')) {
      ids.add(entry.name.slice(0, -'.json'.length));
    }
  }

  for (const entry of bundleEntries) {
    if (entry.isDirectory()) {
      ids.add(entry.name);
    }
  }

  return [...ids];
};

const cleanupExpiredJobs = async (timestamp = Date.now()) => {
  for (const job of state.jobs.values()) {
    if (job.status === 'queued' || job.status === 'running') {
      continue;
    }

    const updatedAt = parseTimestamp(job.updatedAt);
    if (updatedAt == null || timestamp - updatedAt < jobRetentionMs) {
      continue;
    }

    await deleteJob(job.id);
  }
};

const cleanupExpiredBundles = async (timestamp = Date.now()) => {
  const activeBundleIds = new Set(
    [...state.jobs.values()]
      .filter((job) => job.status === 'queued' || job.status === 'running')
      .map((job) => job.bundleId),
  );

  for (const bundleId of await listKnownBundleIds()) {
    if (activeBundleIds.has(bundleId)) {
      continue;
    }

    const metadata = await readBundleMetadata(bundleId);
    const expiresAt = parseTimestamp(metadata?.expiresAt ?? metadata?.uploadedAt);
    if (expiresAt == null || expiresAt > timestamp) {
      continue;
    }

    await deleteBundle(bundleId);
  }
};

const cleanupStaleUploadFiles = async (timestamp = Date.now()) => {
  const entries = await readdir(uploadsDir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (!entry.isFile() || !/\.(part|tmp)$/.test(entry.name)) {
      continue;
    }

    const filePath = path.join(uploadsDir, entry.name);
    const stats = await stat(filePath).catch(() => null);
    if (!stats || timestamp - stats.mtimeMs < staleUploadRetentionMs) {
      continue;
    }

    await rm(filePath, { force: true });
  }
};

const cleanupExpiredState = async () => {
  const timestamp = Date.now();
  await cleanupExpiredJobs(timestamp);
  await cleanupExpiredBundles(timestamp);
  await cleanupStaleUploadFiles(timestamp);
};

const processQueue = () => {
  const capacity = getCapacitySnapshot().limits.safeWorkerSlots;

  while (state.activeJobs < capacity && state.queue.length > 0) {
    const jobId = state.queue.shift();
    const job = state.jobs.get(jobId);
    if (!job || job.status !== 'queued') {
      continue;
    }

    void runJob(job);
  }
};

const runJob = async (job) => {
  state.activeJobs += 1;
  job.status = 'running';
  job.startedAt = nowIso();
  job.updatedAt = job.startedAt;
  job.progress = {};

  try {
    await touchBundle(job.bundleId);

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

    const capacity = getCapacitySnapshot();
    job.effectiveRenderConcurrency = Math.max(
      1,
      Math.min(
        job.requestedRenderConcurrency,
        capacity.limits.safeRenderConcurrency || 1,
      ),
    );
    job.renderConcurrency = job.effectiveRenderConcurrency;
    job.timings.capacitySnapshot = {
      safeRenderConcurrency: capacity.limits.safeRenderConcurrency,
      safeWorkerSlots: capacity.limits.safeWorkerSlots,
    };

    const renderStartedAt = Date.now();

    await renderMedia({
      audioCodec: job.audioFile ? job.audioCodec : null,
      codec: job.codec,
      composition,
      concurrency: job.effectiveRenderConcurrency,
      frameRange: job.frameRange,
      logLevel: 'error',
      onProgress: (progress) => {
        job.progress = summarizeProgress(progress);
        job.updatedAt = nowIso();
      },
      outputLocation: job.videoFile,
      overwrite: true,
      separateAudioTo: job.audioFile,
      serveUrl: getBundleDir(job.bundleId),
    });

    job.timings.renderMs = Date.now() - renderStartedAt;
    await finalizeJobFiles(job);
    job.status = 'completed';
    job.updatedAt = nowIso();
  } catch (error) {
    job.error = error instanceof Error ? error.message : String(error);
    job.status = 'failed';
    job.updatedAt = nowIso();
  } finally {
    state.activeJobs -= 1;
    processQueue();
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
      ...getCapacitySnapshot(),
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

    const bundle = await touchBundle(parts[3]);
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

    const bundle = await touchBundle(body.bundleId);
    if (!bundle) {
      return jsonResponse(res, 404, { error: `Bundle ${body.bundleId} not found` });
    }

    const jobId =
      body.jobId ??
      `${safeSlug(body.bundleId)}-${safeSlug(body.compositionId)}-${String(body.chunkIndex).padStart(4, '0')}`;
    const requestedRenderConcurrency = Math.max(
      1,
      parsePositiveInteger(body.renderConcurrency ?? defaultRenderConcurrency, defaultRenderConcurrency),
    );

    const job = {
      audioCodec: body.audioCodec ?? 'aac',
      audioFile: null,
      audioReady: false,
      bundleId: body.bundleId,
      chunkIndex: body.chunkIndex,
      codec: body.codec ?? 'h264',
      compositionId: body.compositionId,
      createdAt: nowIso(),
      effectiveRenderConcurrency: null,
      error: null,
      frameRange,
      id: jobId,
      progress: {},
      renderConcurrency: requestedRenderConcurrency,
      requestedRenderConcurrency,
      startedAt: null,
      status: 'queued',
      timings: {},
      updatedAt: nowIso(),
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
      await deleteJob(job.id);
      return jsonResponse(res, 200, { deleted: true, jobId: job.id });
    }
  }

  return jsonResponse(res, 404, { error: 'Not found' });
};

await ensureDir(bundlesDir);
await ensureDir(uploadsDir);
await ensureDir(jobsDir);

const cleanupTimer = setInterval(() => {
  void cleanupExpiredState()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
    })
    .finally(() => {
      processQueue();
    });
}, cleanupIntervalMs);

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

server.on('close', () => {
  clearInterval(cleanupTimer);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`render-farm worker listening on 0.0.0.0:${port} as ${workerName}`);
});
