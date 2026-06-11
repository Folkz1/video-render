// render-farm/farm.mjs
// Modulo REUTILIZAVEL de render distribuido (chunking + dispatch + combine).
//
// Extraido da logica do coordinator.mjs (CLI) para ser chamado IN-PROCESS pelo
// short-server.mjs no MODO FARM: quando um job longo (durationInFrames > FARM_MIN_FRAMES)
// chega, em vez de renderMedia local, o short-server fatia o timeline em chunks de
// ~FARM_FRAMES_PER_CHUNK frames e distribui nos nos http-worker do nodes.json,
// agregando o progresso e concatenando o resultado com combineChunks.
//
// Diferencas-chave vs coordinator.mjs:
//   - recebe um bundleDir JA EXISTENTE (o short-server ja fez bundle() com publicDir)
//     em vez de re-bundlar; faz o tar.gz e sobe/registra nos workers.
//   - propaga inputProps (shorts sao 100% dirigidos por props dinamicas).
//   - ex포e onProgress(0..1) para o job.progress do short-server.
//   - health-check ANTES de montar o plano: no offline nao entra; no que cai no meio
//     do voo tem o chunk redistribuido (retry ja existente, maxAttempts=3).
//   - FARM_TOKEN compartilhado (header x-farm-token) validado no worker.
//
// O contrato do worker (POST /api/v1/jobs, GET /api/v1/jobs/:id, artifacts video/audio)
// permanece IDENTICO ao do coordinator — so adicionamos o campo opcional inputProps.

import { combineChunks } from '@remotion/renderer';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import {
  createTarGz,
  downloadToFile,
  ensureDir,
  fetchJson,
  fileExists,
  hashText,
  readJsonFile,
  safeSlug,
  sleep,
} from './common.mjs';

const FARM_TOKEN = (process.env.FARM_TOKEN || '').trim();

const authHeaders = (extra = {}) =>
  FARM_TOKEN ? { ...extra, 'x-farm-token': FARM_TOKEN } : { ...extra };

const httpWorkerBase = (node) => node.workerUrl.replace(/\/$/, '');

const parsePositiveInteger = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return Math.floor(parsed);
};

// ---------------------------------------------------------------------------
// Chunking (identico ao coordinator)
// ---------------------------------------------------------------------------
export const createChunks = (frameRange, framesPerChunk) => {
  const [startFrame, endFrame] = frameRange;
  const chunks = [];
  let chunkIndex = 0;
  for (let currentStart = startFrame; currentStart <= endFrame; currentStart += framesPerChunk) {
    const currentEnd = Math.min(endFrame, currentStart + framesPerChunk - 1);
    chunks.push({ attempts: 0, chunkIndex, frameRange: [currentStart, currentEnd] });
    chunkIndex += 1;
  }
  return chunks;
};

// ---------------------------------------------------------------------------
// Health + capacidade (subset do coordinator, suficiente para o short-server)
// ---------------------------------------------------------------------------
const getHealth = async (node) =>
  fetchJson(`${httpWorkerBase(node)}/health`, { headers: authHeaders(), timeoutMs: 5_000 });

const resolveNodeCapacity = (node, health) => {
  const configuredWorkerSlots = Math.max(1, parsePositiveInteger(node.workerSlots ?? 1, 1));
  const configuredRenderConcurrency = Math.max(
    1,
    parsePositiveInteger(node.renderConcurrency ?? 1, 1),
  );
  const safeWorkerSlots = parsePositiveInteger(
    health?.limits?.safeWorkerSlots,
    configuredWorkerSlots,
  );
  const safeRenderConcurrency = Math.max(
    0,
    parsePositiveInteger(health?.limits?.safeRenderConcurrency, configuredRenderConcurrency),
  );
  const effectiveWorkerSlots = Math.max(0, Math.min(configuredWorkerSlots, safeWorkerSlots));
  const effectiveRenderConcurrency =
    effectiveWorkerSlots > 0
      ? Math.max(
          1,
          Math.min(
            configuredRenderConcurrency,
            safeRenderConcurrency || configuredRenderConcurrency,
          ),
        )
      : 0;
  return { ...node, effectiveRenderConcurrency, effectiveWorkerSlots, health };
};

const refreshDispatchNodes = async (nodes) => {
  const healthChecks = await Promise.allSettled(nodes.map((node) => getHealth(node)));
  const dispatchNodes = [];
  for (const [index, node] of nodes.entries()) {
    const result = healthChecks[index];
    if (result.status !== 'fulfilled') continue;
    const nextNode = resolveNodeCapacity(node, result.value);
    if (nextNode.effectiveWorkerSlots < 1 || nextNode.effectiveRenderConcurrency < 1) continue;
    dispatchNodes.push(nextNode);
  }
  return dispatchNodes.sort((left, right) => (right.weight ?? 1) - (left.weight ?? 1));
};

// ---------------------------------------------------------------------------
// Bundle transfer (push tar.gz / pull por URL — igual ao coordinator)
// ---------------------------------------------------------------------------
const bundleTransferMode = (node) => node.bundleTransfer ?? 'push';

const readBundleRegistration = async (node, bundleId) => {
  const response = await fetch(`${httpWorkerBase(node)}/api/v1/bundles/${bundleId}`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Bundle probe failed for ${node.id}: HTTP ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
};

const uploadBundle = async (node, bundleId, archiveFile) => {
  const response = await fetch(`${httpWorkerBase(node)}/api/v1/bundles/${bundleId}`, {
    body: createReadStream(archiveFile),
    duplex: 'half',
    headers: authHeaders({ 'content-type': 'application/gzip' }),
    method: 'POST',
    signal: AbortSignal.timeout(60 * 60_000),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Bundle upload failed for ${node.id}: HTTP ${response.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
};

const registerBundleFromUrl = async (node, bundleId, archiveUrl) =>
  fetchJson(`${httpWorkerBase(node)}/api/v1/bundles/${bundleId}`, {
    body: JSON.stringify({ archiveUrl }),
    headers: authHeaders({ 'content-type': 'application/json' }),
    method: 'POST',
    timeoutMs: 60 * 60_000,
  });

const submitChunk = async (node, payload) =>
  fetchJson(`${httpWorkerBase(node)}/api/v1/jobs`, {
    body: JSON.stringify(payload),
    headers: authHeaders({ 'content-type': 'application/json' }),
    method: 'POST',
    timeoutMs: 30_000,
  });

const readChunkStatus = async (node, jobId) =>
  fetchJson(`${httpWorkerBase(node)}/api/v1/jobs/${jobId}`, {
    headers: authHeaders(),
    timeoutMs: 10_000,
  });

const deleteChunk = async (node, jobId) =>
  fetchJson(`${httpWorkerBase(node)}/api/v1/jobs/${jobId}`, {
    headers: authHeaders(),
    method: 'DELETE',
    timeoutMs: 10_000,
  });

// ---------------------------------------------------------------------------
// Carrega os nos elegiveis do nodes.json (http-worker habilitados)
// ---------------------------------------------------------------------------
export const loadFarmNodes = async (configPath) => {
  const config = await readJsonFile(configPath);
  const defaults = config.defaults ?? {};
  const nodes = (config.nodes ?? [])
    .filter((node) => node.kind === 'http-worker')
    .filter((node) => node.enabled !== false)
    .sort((left, right) => (right.weight ?? 1) - (left.weight ?? 1));
  return { defaults, nodes };
};

// ---------------------------------------------------------------------------
// renderFarm: orquestra um render distribuido COMPLETO.
//   bundleDir: diretorio do bundle Remotion ja existente (do short-server).
//   composition: { id, durationInFrames, fps } (ja resolvido via selectComposition).
//   inputProps: props dinamicas do short (propagadas a cada chunk).
//   outputFile: caminho final do mp4.
//   onProgress: (fraction 0..1) => void  — para o job.progress.
//   log: (...args) => void.
// Lanca em caso de falha (caller faz fallback p/ render local).
// ---------------------------------------------------------------------------
export const renderFarm = async ({
  bundleDir,
  cacheRoot,
  composition,
  configPath,
  inputProps = null,
  outputFile,
  framesPerChunk: framesPerChunkOverride = null,
  codec = 'h264',
  audioCodec = 'aac',
  onProgress = () => {},
  log = console.log,
}) => {
  const { defaults, nodes } = await loadFarmNodes(configPath);
  if (nodes.length === 0) {
    throw new Error('farm: nenhum no http-worker habilitado em nodes.json');
  }

  const framesPerChunk = framesPerChunkOverride ?? defaults.framesPerChunk ?? 450;
  const pollIntervalMs = defaults.pollIntervalMs ?? 5_000;

  const bundleId = `${safeSlug(composition.id)}-${hashText(
    `${composition.id}-${composition.durationInFrames}-${Date.now()}`,
  )}`.slice(0, 48);

  const uploadsRoot = path.join(cacheRoot, 'uploads');
  const chunksRoot = path.join(cacheRoot, 'chunks');
  await ensureDir(uploadsRoot);
  await ensureDir(chunksRoot);

  // 1) health-check: so entram nos vivos com capacidade segura
  const healthChecks = await Promise.allSettled(nodes.map((node) => getHealth(node)));
  const readyNodes = [];
  for (const [index, node] of nodes.entries()) {
    const result = healthChecks[index];
    if (result.status !== 'fulfilled') {
      log(`farm.node_offline id=${node.id} reason=${String(result.reason?.message || result.reason).slice(0, 120)}`);
      continue;
    }
    const resolved = resolveNodeCapacity(node, result.value);
    if (resolved.effectiveWorkerSlots < 1 || resolved.effectiveRenderConcurrency < 1) {
      log(`farm.node_no_capacity id=${node.id}`);
      continue;
    }
    readyNodes.push(resolved);
  }
  if (readyNodes.length === 0) {
    throw new Error('farm: nenhum worker saudavel com capacidade');
  }

  const requestedRange = [0, composition.durationInFrames - 1];
  const chunks = createChunks(requestedRange, framesPerChunk);
  log(`farm.plan chunks=${chunks.length} frames_per_chunk=${framesPerChunk} nodes=[${readyNodes.map((n) => n.id).join(',')}]`);

  // 2) bundle tar.gz (uma vez) + mirror nos workers
  const bundleArchive = path.join(uploadsRoot, `${bundleId}.tar.gz`);
  if (!fileExists(bundleArchive)) {
    await createTarGz(bundleDir, bundleArchive);
  }
  const pushNodes = readyNodes.filter((node) => bundleTransferMode(node) !== 'pull');
  const pullNodes = readyNodes.filter((node) => bundleTransferMode(node) === 'pull');
  const mirrorNodes = pushNodes.length > 0 ? pushNodes : readyNodes.slice(0, 1);

  const mirrorBundleStates = await Promise.all(
    mirrorNodes.map(async (node) => ({ bundle: await readBundleRegistration(node, bundleId), node })),
  );
  const nodesNeedingUpload = mirrorBundleStates.filter((e) => !e.bundle).map((e) => e.node);
  if (nodesNeedingUpload.length > 0) {
    log(`farm.bundle_upload nodes=${nodesNeedingUpload.length} bundle=${bundleId}`);
    await Promise.all(nodesNeedingUpload.map((node) => uploadBundle(node, bundleId, bundleArchive)));
  }
  if (pullNodes.length > 0) {
    const mirrorNode = mirrorBundleStates.find((e) => e.bundle)?.node ?? mirrorNodes[0];
    const archiveUrl = `${httpWorkerBase(mirrorNode)}/api/v1/bundles/${bundleId}/archive`;
    log(`farm.bundle_register_by_url nodes=${pullNodes.length} from=${mirrorNode.id}`);
    await Promise.all(pullNodes.map((node) => registerBundleFromUrl(node, bundleId, archiveUrl)));
  }

  // 3) dispatch loop (chunking + retry 3x + redistribuicao de no caido)
  const chunkOutputDir = path.join(chunksRoot, bundleId);
  await ensureDir(chunkOutputDir);

  const stableReadyNodes = readyNodes;
  const pendingChunks = [...chunks];
  const activeJobs = new Map();
  const completedChunks = new Map();
  const attemptsByChunk = new Map();
  const maxAttempts = 3;

  const claimChunk = () => pendingChunks.shift() ?? null;

  const emitProgress = () => {
    const done = completedChunks.size;
    onProgress(Math.min(0.98, done / chunks.length)); // 98% no max; 100% so apos combine
  };

  const launchJobs = async () => {
    const dispatchNodes = await refreshDispatchNodes(stableReadyNodes);
    for (const node of dispatchNodes) {
      const nodeBusy = [...activeJobs.values()].filter((job) => job.node.id === node.id).length;
      const capacity = Math.max(0, Number(node.effectiveWorkerSlots ?? 0) - nodeBusy);
      for (let slot = 0; slot < capacity; slot += 1) {
        const chunk = claimChunk();
        if (!chunk) return;
        const jobId = `${bundleId}-${String(chunk.chunkIndex).padStart(4, '0')}-${safeSlug(node.id)}-${Date.now()}`;
        const payload = {
          audioCodec,
          bundleId,
          chunkIndex: chunk.chunkIndex,
          codec,
          compositionId: composition.id,
          frameRange: chunk.frameRange,
          inputProps: inputProps ?? undefined,
          jobId,
          renderConcurrency: node.effectiveRenderConcurrency,
        };
        log(`farm.chunk_submit chunk=${chunk.chunkIndex} node=${node.id} range=${chunk.frameRange[0]}-${chunk.frameRange[1]}`);
        await submitChunk(node, payload);
        activeJobs.set(jobId, { chunk, jobId, node });
      }
    }
  };

  while (pendingChunks.length > 0 || activeJobs.size > 0) {
    await launchJobs();

    if (activeJobs.size === 0) {
      if (pendingChunks.length === 0) break;
      log('farm.waiting_for_capacity');
      await sleep(pollIntervalMs);
      continue;
    }

    await sleep(pollIntervalMs);

    for (const [jobId, activeJob] of [...activeJobs.entries()]) {
      let status;
      try {
        status = await readChunkStatus(activeJob.node, jobId);
      } catch (error) {
        // no caiu no meio do voo: tira o job e redistribui o chunk (conta como tentativa)
        const attempts = (attemptsByChunk.get(activeJob.chunk.chunkIndex) ?? 0) + 1;
        attemptsByChunk.set(activeJob.chunk.chunkIndex, attempts);
        activeJobs.delete(jobId);
        log(`farm.node_lost node=${activeJob.node.id} chunk=${activeJob.chunk.chunkIndex} attempt=${attempts} err=${String(error?.message || error).slice(0, 100)}`);
        if (attempts >= maxAttempts) {
          throw new Error(`farm: chunk ${activeJob.chunk.chunkIndex} falhou ${attempts}x (no perdido)`);
        }
        pendingChunks.unshift({ ...activeJob.chunk, attempts });
        continue;
      }

      if (status.status === 'completed') {
        const videoFile = path.join(
          chunkOutputDir,
          `${String(activeJob.chunk.chunkIndex).padStart(4, '0')}.video.mp4`,
        );
        const audioFile = path.join(
          chunkOutputDir,
          `${String(activeJob.chunk.chunkIndex).padStart(4, '0')}.audio.aac`,
        );
        if (status.artifacts?.video) {
          await downloadToFile(
            new URL(status.artifacts.video, httpWorkerBase(activeJob.node)).toString(),
            videoFile,
            { headers: authHeaders() },
          );
        }
        if (status.artifacts?.audio) {
          await downloadToFile(
            new URL(status.artifacts.audio, httpWorkerBase(activeJob.node)).toString(),
            audioFile,
            { headers: authHeaders() },
          );
        }
        await deleteChunk(activeJob.node, jobId).catch(() => {});
        completedChunks.set(activeJob.chunk.chunkIndex, {
          audioFile,
          chunkIndex: activeJob.chunk.chunkIndex,
          frameRange: activeJob.chunk.frameRange,
          videoFile,
        });
        activeJobs.delete(jobId);
        log(`farm.chunk_done chunk=${activeJob.chunk.chunkIndex} node=${activeJob.node.id} (${completedChunks.size}/${chunks.length})`);
        emitProgress();
        continue;
      }

      if (status.status === 'failed') {
        const attempts = (attemptsByChunk.get(activeJob.chunk.chunkIndex) ?? 0) + 1;
        attemptsByChunk.set(activeJob.chunk.chunkIndex, attempts);
        activeJobs.delete(jobId);
        log(`farm.chunk_failed chunk=${activeJob.chunk.chunkIndex} node=${activeJob.node.id} attempt=${attempts} err=${String(status.error).slice(0, 120)}`);
        if (attempts >= maxAttempts) {
          throw new Error(`farm: chunk ${activeJob.chunk.chunkIndex} falhou ${attempts}x: ${status.error}`);
        }
        pendingChunks.unshift({ ...activeJob.chunk, attempts });
      }
    }
  }

  // 4) combine
  const orderedChunks = [...completedChunks.values()].sort((l, r) => l.chunkIndex - r.chunkIndex);
  if (orderedChunks.length !== chunks.length) {
    throw new Error(`farm: esperava ${chunks.length} chunks, obteve ${orderedChunks.length}`);
  }
  await ensureDir(path.dirname(outputFile));
  log(`farm.combining chunks=${orderedChunks.length} -> ${outputFile}`);
  await combineChunks({
    audioCodec,
    audioFiles: orderedChunks.map((c) => c.audioFile),
    codec,
    compositionDurationInFrames: composition.durationInFrames,
    fps: composition.fps,
    frameRange: requestedRange,
    framesPerChunk,
    outputLocation: outputFile,
    videoFiles: orderedChunks.map((c) => c.videoFile),
  });
  log(`farm.combined -> ${outputFile}`);
  onProgress(1);
  return { bundleId, chunks: chunks.length, outputFile };
};
