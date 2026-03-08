import { bundle } from '@remotion/bundler';
import { combineChunks, getCompositions } from '@remotion/renderer';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createTarGz,
  createTarGzFromPaths,
  downloadToFile,
  ensureDir,
  execCommand,
  expandHomePath,
  fetchJson,
  hashText,
  readJsonFile,
  safeSlug,
  sleep,
} from './common.mjs';

const parseArgs = (argv) => {
  const options = {
    audioCodec: null,
    codec: null,
    composition: null,
    config: 'render-farm/nodes.json',
    framesPerChunk: null,
    nodes: null,
    out: null,
    pollIntervalMs: null,
    range: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = argv[index + 1];

    if (token === '--composition') {
      options.composition = next;
      index += 1;
      continue;
    }

    if (token === '--config') {
      options.config = next;
      index += 1;
      continue;
    }

    if (token === '--out') {
      options.out = next;
      index += 1;
      continue;
    }

    if (token === '--frames-per-chunk') {
      options.framesPerChunk = Number(next);
      index += 1;
      continue;
    }

    if (token === '--nodes') {
      options.nodes = next.split(',').map((item) => item.trim()).filter(Boolean);
      index += 1;
      continue;
    }

    if (token === '--range') {
      const [start, end] = next.split('-').map((value) => Number(value));
      options.range = [start, end];
      index += 1;
      continue;
    }

    if (token === '--poll-interval') {
      options.pollIntervalMs = Number(next);
      index += 1;
      continue;
    }

    if (token === '--codec') {
      options.codec = next;
      index += 1;
      continue;
    }

    if (token === '--audio-codec') {
      options.audioCodec = next;
      index += 1;
      continue;
    }
  }

  return options;
};

const createChunks = (frameRange, framesPerChunk) => {
  const [startFrame, endFrame] = frameRange;
  const chunks = [];

  let chunkIndex = 0;
  for (let currentStart = startFrame; currentStart <= endFrame; currentStart += framesPerChunk) {
    const currentEnd = Math.min(endFrame, currentStart + framesPerChunk - 1);
    chunks.push({
      attempts: 0,
      chunkIndex,
      frameRange: [currentStart, currentEnd],
    });
    chunkIndex += 1;
  }

  return chunks;
};

const httpWorkerBase = (node) => node.workerUrl.replace(/\/$/, '');

const getHealth = async (node) =>
  fetchJson(`${httpWorkerBase(node)}/health`, {
    timeoutMs: 5_000,
  });

const uploadBundle = async (node, bundleId, archiveFile) => {
  const response = await fetch(`${httpWorkerBase(node)}/api/v1/bundles/${bundleId}`, {
    body: createReadStream(archiveFile),
    duplex: 'half',
    headers: {
      'content-type': 'application/gzip',
    },
    method: 'POST',
    signal: AbortSignal.timeout(60 * 60_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Bundle upload failed for ${node.id}: HTTP ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

const submitChunk = async (node, payload) =>
  fetchJson(`${httpWorkerBase(node)}/api/v1/jobs`, {
    body: JSON.stringify(payload),
    headers: {
      'content-type': 'application/json',
    },
    method: 'POST',
    timeoutMs: 30_000,
  });

const readChunkStatus = async (node, jobId) =>
  fetchJson(`${httpWorkerBase(node)}/api/v1/jobs/${jobId}`, {
    timeoutMs: 10_000,
  });

const deleteChunk = async (node, jobId) =>
  fetchJson(`${httpWorkerBase(node)}/api/v1/jobs/${jobId}`, {
    method: 'DELETE',
    timeoutMs: 10_000,
  });

const bootstrapSshBuildNode = async (node, projectRoot) => {
  const bootstrap = node.bootstrap;
  const keyPath = expandHomePath(bootstrap.sshKeyPath);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'render-farm-bootstrap-'));
  const archiveFile = path.join(tempDir, 'worker.tar.gz');

  try {
    await createTarGzFromPaths(
      projectRoot,
      [
        'package.json',
        'package-lock.json',
        'render-farm',
        'Dockerfile.render-farm-worker',
      ],
      archiveFile,
    );

    await execCommand(
      'ssh',
      ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', bootstrap.sshHost, `mkdir -p ${bootstrap.remoteProjectDir} ${bootstrap.remoteDataDir} && rm -rf ${bootstrap.remoteProjectDir}/*`],
      { cwd: projectRoot },
    );

    await execCommand(
      'scp',
      [
        '-i',
        keyPath,
        '-o',
        'StrictHostKeyChecking=no',
        archiveFile,
        `${bootstrap.sshHost}:${bootstrap.remoteProjectDir}/worker.tar.gz`,
      ],
      { cwd: projectRoot },
    );

    const dockerCommand = [
      `cd ${bootstrap.remoteProjectDir}`,
      'tar xzf worker.tar.gz',
      'rm -f worker.tar.gz',
      `docker build -t ${bootstrap.imageName} -f ${bootstrap.dockerfile} .`,
      `docker rm -f ${bootstrap.containerName} >/dev/null 2>&1 || true`,
      [
        'docker run -d --restart unless-stopped',
        `--name ${bootstrap.containerName}`,
        `-p ${bootstrap.publishedPort}:${bootstrap.containerPort}`,
        `-v ${bootstrap.remoteDataDir}:/data`,
        `-e PORT=${bootstrap.containerPort}`,
        `-e WORKER_NAME=${node.id}`,
        `-e WORKER_RENDER_CONCURRENCY=${node.renderConcurrency}`,
        `-e WORKER_SLOTS=${node.workerSlots}`,
        bootstrap.imageName,
      ].join(' '),
    ].join(' && ');

    await execCommand(
      'ssh',
      ['-i', keyPath, '-o', 'StrictHostKeyChecking=no', bootstrap.sshHost, dockerCommand],
      { cwd: projectRoot },
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

const ensureNodeReady = async (node, projectRoot) => {
  try {
    return await getHealth(node);
  } catch (error) {
    if (node.bootstrap?.kind !== 'ssh-build') {
      throw error;
    }

    console.log(`bootstrapping ${node.id} via SSH build`);
    await bootstrapSshBuildNode(node, projectRoot);

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        return await getHealth(node);
      } catch {
        await sleep(5_000);
      }
    }

    throw new Error(`Worker ${node.id} did not become healthy after bootstrap`);
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (!options.composition) {
    throw new Error('--composition is required');
  }

  const projectRoot = process.cwd();
  const configPath = path.resolve(projectRoot, options.config);
  const config = await readJsonFile(configPath);
  const defaults = config.defaults ?? {};

  const requestedNodeIds = options.nodes;
  const allNodes = (config.nodes ?? []).filter((node) => node.kind === 'http-worker');
  const nodes = allNodes
    .filter((node) => node.enabled !== false)
    .filter((node) => !requestedNodeIds || requestedNodeIds.includes(node.id))
    .sort((left, right) => (right.weight ?? 1) - (left.weight ?? 1));

  if (nodes.length === 0) {
    throw new Error('No enabled http-worker nodes found in render-farm/nodes.json');
  }

  const cacheRoot = path.join(projectRoot, '.render-farm-cache');
  const bundleRoot = path.join(cacheRoot, 'bundles');
  const uploadsRoot = path.join(cacheRoot, 'uploads');
  const chunksRoot = path.join(cacheRoot, 'chunks');

  await ensureDir(bundleRoot);
  await ensureDir(uploadsRoot);
  await ensureDir(chunksRoot);

  const bundleId = `${safeSlug(options.composition)}-${hashText(`${options.composition}-${Date.now()}`)}`.slice(0, 48);
  const bundleDir = path.join(bundleRoot, bundleId);
  const bundleArchive = path.join(uploadsRoot, `${bundleId}.tar.gz`);

  console.log(`bundling ${options.composition} into ${bundleId}`);
  await bundle({
    entryPoint: path.join(projectRoot, 'src', 'index.ts'),
    onProgress: () => undefined,
    outDir: bundleDir,
  });

  const compositions = await getCompositions(bundleDir, {
    logLevel: 'error',
  });
  const composition = compositions.find((item) => item.id === options.composition);
  if (!composition) {
    throw new Error(`Composition ${options.composition} not found`);
  }

  const requestedRange = options.range ?? [0, composition.durationInFrames - 1];
  const framesPerChunk = options.framesPerChunk ?? defaults.framesPerChunk ?? 450;
  const pollIntervalMs = options.pollIntervalMs ?? defaults.pollIntervalMs ?? 5_000;
  const codec = options.codec ?? defaults.codec ?? 'h264';
  const audioCodec = options.audioCodec ?? defaults.audioCodec ?? 'aac';
  const outputFile = path.resolve(
    projectRoot,
    options.out ?? path.join('output', 'farm', `${safeSlug(options.composition)}.mp4`),
  );

  const chunks = createChunks(requestedRange, framesPerChunk);
  const chunkOutputDir = path.join(chunksRoot, bundleId);
  await ensureDir(chunkOutputDir);

  console.log(`render plan: ${chunks.length} chunks across ${nodes.length} nodes`);

  const healthChecks = await Promise.allSettled(nodes.map((node) => ensureNodeReady(node, projectRoot)));
  const readyNodes = nodes.filter((_, index) => healthChecks[index].status === 'fulfilled');
  const skippedNodes = nodes.filter((_, index) => healthChecks[index].status !== 'fulfilled');

  for (const [index, node] of skippedNodes.entries()) {
    const originalIndex = nodes.findIndex((item) => item.id === node.id);
    const result = healthChecks[originalIndex];
    const reason =
      result && result.status === 'rejected'
        ? result.reason instanceof Error
          ? result.reason.message
          : String(result.reason)
        : 'worker is not ready';
    console.log(`skipping node ${node.id}: ${reason}`);
  }

  if (readyNodes.length === 0) {
    throw new Error('No workers are healthy');
  }

  await createTarGz(bundleDir, bundleArchive);
  console.log(`uploading bundle to ${readyNodes.length} nodes`);
  await Promise.all(readyNodes.map((node) => uploadBundle(node, bundleId, bundleArchive)));

  const pendingChunks = [...chunks];
  const activeJobs = new Map();
  const completedChunks = new Map();
  const attemptsByChunk = new Map();
  const maxAttempts = 3;

  const claimChunk = () => pendingChunks.shift() ?? null;

  const launchJobs = async () => {
    for (const node of readyNodes) {
      const nodeBusy = [...activeJobs.values()].filter((job) => job.node.id === node.id).length;
      const capacity = Math.max(1, Number(node.workerSlots ?? 1)) - nodeBusy;

      for (let slot = 0; slot < capacity; slot += 1) {
        const chunk = claimChunk();
        if (!chunk) {
          return;
        }

        const jobId = `${bundleId}-${String(chunk.chunkIndex).padStart(4, '0')}-${safeSlug(node.id)}-${Date.now()}`;
        const payload = {
          audioCodec,
          bundleId,
          chunkIndex: chunk.chunkIndex,
          codec,
          compositionId: options.composition,
          frameRange: chunk.frameRange,
          jobId,
          renderConcurrency: node.renderConcurrency,
        };

        console.log(`submit chunk ${chunk.chunkIndex} to ${node.id} (${chunk.frameRange[0]}-${chunk.frameRange[1]})`);
        await submitChunk(node, payload);
        activeJobs.set(jobId, { chunk, jobId, node });
      }
    }
  };

  while (pendingChunks.length > 0 || activeJobs.size > 0) {
    await launchJobs();

    if (activeJobs.size === 0) {
      break;
    }

    await sleep(pollIntervalMs);

    for (const [jobId, activeJob] of [...activeJobs.entries()]) {
      const status = await readChunkStatus(activeJob.node, jobId);

      if (status.status === 'completed') {
        const videoFile = path.join(
          chunkOutputDir,
          `${String(activeJob.chunk.chunkIndex).padStart(4, '0')}.video.mp4`,
        );
        const audioFile = path.join(
          chunkOutputDir,
          `${String(activeJob.chunk.chunkIndex).padStart(4, '0')}.audio.aac`,
        );

        if (status.artifacts.video) {
          await downloadToFile(new URL(status.artifacts.video, httpWorkerBase(activeJob.node)).toString(), videoFile);
        }

        if (status.artifacts.audio) {
          await downloadToFile(new URL(status.artifacts.audio, httpWorkerBase(activeJob.node)).toString(), audioFile);
        }

        await deleteChunk(activeJob.node, jobId);
        completedChunks.set(activeJob.chunk.chunkIndex, {
          audioFile,
          chunkIndex: activeJob.chunk.chunkIndex,
          frameRange: activeJob.chunk.frameRange,
          videoFile,
        });
        activeJobs.delete(jobId);
        console.log(`chunk ${activeJob.chunk.chunkIndex} completed on ${activeJob.node.id}`);
        continue;
      }

      if (status.status === 'failed') {
        const attempts = (attemptsByChunk.get(activeJob.chunk.chunkIndex) ?? 0) + 1;
        attemptsByChunk.set(activeJob.chunk.chunkIndex, attempts);
        activeJobs.delete(jobId);
        console.log(`chunk ${activeJob.chunk.chunkIndex} failed on ${activeJob.node.id}: ${status.error}`);

        if (attempts >= maxAttempts) {
          throw new Error(`Chunk ${activeJob.chunk.chunkIndex} failed ${attempts} times`);
        }

        pendingChunks.unshift({
          ...activeJob.chunk,
          attempts,
        });
      }
    }
  }

  const orderedChunks = [...completedChunks.values()].sort((left, right) => left.chunkIndex - right.chunkIndex);
  if (orderedChunks.length !== chunks.length) {
    throw new Error(`Expected ${chunks.length} completed chunks, got ${orderedChunks.length}`);
  }

  await ensureDir(path.dirname(outputFile));
  console.log(`combining ${orderedChunks.length} chunks into ${outputFile}`);
  await combineChunks({
    audioCodec,
    audioFiles: orderedChunks.map((chunk) => chunk.audioFile),
    codec,
    compositionDurationInFrames: composition.durationInFrames,
    fps: composition.fps,
    frameRange: requestedRange,
    framesPerChunk,
    outputLocation: outputFile,
    videoFiles: orderedChunks.map((chunk) => chunk.videoFile),
  });

  console.log(`render complete: ${outputFile}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
