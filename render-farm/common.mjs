import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const ensureDir = async (dirPath) => {
  await mkdir(dirPath, { recursive: true });
  return dirPath;
};

export const fileExists = (filePath) => existsSync(filePath);

export const readJsonFile = async (filePath) => {
  const raw = await readFile(filePath, 'utf8');
  return JSON.parse(raw);
};

export const hashText = (value) =>
  createHash('sha1').update(value).digest('hex');

export const safeSlug = (value) =>
  String(value)
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const expandHomePath = (value) => {
  if (!value || !value.startsWith('~')) {
    return value;
  }

  return path.join(os.homedir(), value.slice(1));
};

export const jsonResponse = (res, statusCode, payload) => {
  res.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
};

export const readRequestText = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
};

export const parseJsonBody = async (req) => {
  const raw = await readRequestText(req);
  if (!raw.trim()) {
    return {};
  }

  return JSON.parse(raw);
};

export const saveRequestToFile = async (req, filePath) => {
  await ensureDir(path.dirname(filePath));
  const stream = createWriteStream(filePath);
  await pipeline(req, stream);
  return filePath;
};

export const downloadToFile = async (
  url,
  filePath,
  { headers = {}, timeoutMs = 120_000 } = {},
) => {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`Download failed for ${url}: HTTP ${response.status}`);
  }

  if (!response.body) {
    throw new Error(`Download failed for ${url}: empty body`);
  }

  await ensureDir(path.dirname(filePath));
  const target = createWriteStream(filePath);
  await pipeline(Readable.fromWeb(response.body), target);
  return filePath;
};

export const fetchJson = async (
  url,
  { method = 'GET', headers = {}, body = undefined, timeoutMs = 30_000 } = {},
) => {
  const response = await fetch(url, {
    method,
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
    duplex: body ? 'half' : undefined,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: HTTP ${response.status} ${text}`);
  }

  return text ? JSON.parse(text) : {};
};

export const execCommand = async (command, args, options = {}) => {
  const result = await execFileAsync(command, args, {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
    ...options,
  });

  return {
    stdout: (result.stdout ?? '').trim(),
    stderr: (result.stderr ?? '').trim(),
  };
};

export const createTarGz = async (sourceDir, targetFile) => {
  await ensureDir(path.dirname(targetFile));
  await rm(targetFile, { force: true });
  await execCommand('tar', ['-czf', targetFile, '-C', sourceDir, '.']);
  return targetFile;
};

export const createTarGzFromPaths = async (baseDir, relativePaths, targetFile) => {
  await ensureDir(path.dirname(targetFile));
  await rm(targetFile, { force: true });
  await execCommand('tar', ['-czf', targetFile, '-C', baseDir, ...relativePaths]);
  return targetFile;
};

export const extractTarGz = async (archiveFile, targetDir) => {
  await rm(targetDir, { recursive: true, force: true });
  await ensureDir(targetDir);
  await execCommand('tar', ['-xzf', archiveFile, '-C', targetDir]);
  return targetDir;
};
