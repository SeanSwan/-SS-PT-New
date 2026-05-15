#!/usr/bin/env node
/**
 * FILE: swan-applaud-sync.mjs
 * PURPOSE: Local Windows-friendly APPLAUD/PLAUD folder watcher for Swan Coach.
 * Runtime config: APPLAUD_SYNC_DIR/--watch-dir, SWAN_AUTH_TOKEN, SWAN_API_BASE_URL, SWAN_APPLAUD_STATE_PATH.
 */
import { createHash } from 'node:crypto';
import { watch as watchFs } from 'node:fs';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const SUPPORTED_EXT_TO_MIME = new Map([
  ['.mp3', 'audio/mpeg'],
  ['.wav', 'audio/wav'],
  ['.m4a', 'audio/m4a'],
  ['.aac', 'audio/aac'],
  ['.flac', 'audio/flac'],
  ['.ogg', 'audio/ogg'],
  ['.webm', 'audio/webm'],
]);

const DEFAULT_STABLE_MS = 15_000;
const DEFAULT_SCAN_INTERVAL_MS = 15_000;
const DEFAULT_LOOKBACK_HOURS = 36;
function localAppDataRoot(env = process.env) {
  return env.LOCALAPPDATA
    ? join(env.LOCALAPPDATA, 'SwanStudios', 'applaud-sync')
    : join(homedir(), '.swanstudios', 'applaud-sync');
}

function defaultStatePath(env = process.env) {
  return join(localAppDataRoot(env), 'state.json');
}

function normalizeApiBaseUrl(value) {
  const raw = String(value || 'https://sswanstudios.com').trim().replace(/\/+$/, '');
  const url = new URL(raw);
  if (url.protocol !== 'https:' && !/^http:\/\/localhost(?::\d+)?$/i.test(url.toString())) {
    throw new Error('apiBaseUrl must be HTTPS, except localhost development');
  }
  return url.toString().replace(/\/+$/, '');
}

export function isSupportedAudioFile(filePath) {
  return SUPPORTED_EXT_TO_MIME.has(extname(filePath).toLowerCase());
}

async function walkFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function scanAudioFiles(watchDir, {
  nowMs = Date.now(),
  stableMs = DEFAULT_STABLE_MS,
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
} = {}) {
  const root = resolve(watchDir);
  const files = await walkFiles(root);
  const lookbackMs = Number(lookbackHours) > 0 ? Number(lookbackHours) * 60 * 60 * 1000 : 0;
  const candidates = [];

  for (const filePath of files) {
    if (!isSupportedAudioFile(filePath)) continue;
    let info;
    try {
      info = await stat(filePath);
    } catch {
      continue;
    }
    if (!info.isFile() || info.size <= 0) continue;
    if (nowMs - info.mtimeMs < stableMs) continue;
    if (lookbackMs > 0 && info.mtimeMs < nowMs - lookbackMs) continue;
    candidates.push({
      filePath,
      filename: basename(filePath),
      size: info.size,
      mtimeMs: info.mtimeMs,
      recordedAt: new Date(info.mtimeMs).toISOString(),
      mimeType: SUPPORTED_EXT_TO_MIME.get(extname(filePath).toLowerCase()),
    });
  }

  return candidates.sort((a, b) => a.mtimeMs - b.mtimeMs || a.filePath.localeCompare(b.filePath));
}

export async function fingerprintFile(filePath) {
  const bytes = await readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

export async function loadSyncState(statePath) {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8'));
    return {
      version: 1,
      uploaded: parsed?.uploaded && typeof parsed.uploaded === 'object' ? parsed.uploaded : {},
      failed: parsed?.failed && typeof parsed.failed === 'object' ? parsed.failed : {},
    };
  } catch {
    return { version: 1, uploaded: {}, failed: {} };
  }
}

export async function saveSyncState(statePath, state) {
  await mkdir(dirname(statePath), { recursive: true });
  const tempPath = `${statePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(tempPath, statePath);
}

export async function uploadAudioFile({
  filePath,
  recordedAt = null,
  apiBaseUrl,
  authToken,
  fetchImpl = globalThis.fetch,
}) {
  if (!authToken) throw new Error('SWAN_AUTH_TOKEN is required');
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable in this Node runtime');

  const bytes = await readFile(filePath);
  const mimeType = SUPPORTED_EXT_TO_MIME.get(extname(filePath).toLowerCase()) || 'application/octet-stream';
  const form = new FormData();
  form.append('files', new Blob([bytes], { type: mimeType }), basename(filePath));
  form.append('clipSource', 'applaud_local_sync');
  if (recordedAt) form.append('recordedAt', recordedAt);

  const response = await fetchImpl(`${normalizeApiBaseUrl(apiBaseUrl)}/api/plaud/clips/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${authToken}` },
    body: form,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok || data.success === false) {
    const code = data?.error?.code || `HTTP_${response.status}`;
    const message = data?.error?.message || response.statusText || 'Upload failed';
    throw new Error(`${code}: ${message}`);
  }
  return {
    clips: Array.isArray(data.clips) ? data.clips : [],
    rejected: Array.isArray(data.rejected) ? data.rejected : [],
  };
}

export async function syncOnce({
  watchDir,
  statePath = defaultStatePath(),
  apiBaseUrl = 'https://sswanstudios.com',
  authToken = process.env.SWAN_AUTH_TOKEN,
  stableMs = DEFAULT_STABLE_MS,
  lookbackHours = DEFAULT_LOOKBACK_HOURS,
  nowMs = Date.now(),
  fetchImpl = globalThis.fetch,
  logger = console,
} = {}) {
  if (!watchDir) throw new Error('watchDir is required');
  const state = await loadSyncState(statePath);
  const candidates = await scanAudioFiles(watchDir, { nowMs, stableMs, lookbackHours });
  const result = { scanned: candidates.length, uploaded: [], skipped: [], failed: [] };

  for (const candidate of candidates) {
    let fingerprint;
    try {
      fingerprint = await fingerprintFile(candidate.filePath);
      if (state.uploaded[fingerprint]) {
        result.skipped.push({ ...candidate, reason: 'already_uploaded' });
        continue;
      }

      logger.info(`[swan-applaud-sync] uploading ${candidate.filename}`);
      const upload = await uploadAudioFile({
        filePath: candidate.filePath,
        recordedAt: candidate.recordedAt,
        apiBaseUrl,
        authToken,
        fetchImpl,
      });
      const entry = {
        filePath: candidate.filePath,
        filename: candidate.filename,
        size: candidate.size,
        mtimeMs: candidate.mtimeMs,
        recordedAt: candidate.recordedAt,
        uploadedAt: new Date(nowMs).toISOString(),
        clipIds: upload.clips.map((clip) => clip.clipId).filter(Boolean),
        rejected: upload.rejected,
      };
      state.uploaded[fingerprint] = entry;
      delete state.failed[fingerprint];
      result.uploaded.push(entry);
      await saveSyncState(statePath, state);
    } catch (error) {
      const key = fingerprint || `${candidate.filePath}:${candidate.size}:${candidate.mtimeMs}`;
      const entry = { ...candidate, error: error.message, failedAt: new Date(nowMs).toISOString() };
      state.failed[key] = entry;
      result.failed.push(entry);
      logger.error(`[swan-applaud-sync] failed ${candidate.filename}: ${error.message}`);
      await saveSyncState(statePath, state);
    }
  }

  return result;
}

function parseArgs(argv, env = process.env) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args.set(key, true);
    } else {
      args.set(key, next);
      i += 1;
    }
  }
  return {
    watchDir: args.get('watch-dir') || env.APPLAUD_SYNC_DIR,
    statePath: args.get('state-path') || env.SWAN_APPLAUD_STATE_PATH || defaultStatePath(env),
    apiBaseUrl: args.get('api-base-url') || env.SWAN_API_BASE_URL || 'https://sswanstudios.com',
    authToken: env.SWAN_AUTH_TOKEN,
    stableMs: Number(args.get('stable-ms') || env.SWAN_APPLAUD_STABLE_MS || DEFAULT_STABLE_MS),
    scanIntervalMs: Number(args.get('scan-interval-ms') || env.SWAN_APPLAUD_SCAN_INTERVAL_MS || DEFAULT_SCAN_INTERVAL_MS),
    lookbackHours: Number(args.get('lookback-hours') || env.SWAN_APPLAUD_LOOKBACK_HOURS || DEFAULT_LOOKBACK_HOURS),
    once: Boolean(args.get('once')),
  };
}

export async function runWatcher(config, logger = console) {
  let running = false;
  let pending = false;

  const trigger = async (reason) => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      logger.info(`[swan-applaud-sync] scan start (${reason})`);
      const summary = await syncOnce({ ...config, logger });
      logger.info(`[swan-applaud-sync] scan complete: ${summary.uploaded.length} uploaded, ${summary.skipped.length} skipped, ${summary.failed.length} failed`);
    } finally {
      running = false;
      if (pending) {
        pending = false;
        await trigger('queued');
      }
    }
  };

  await trigger('startup');
  const interval = setInterval(() => void trigger('interval'), config.scanIntervalMs);
  const watcher = watchFs(config.watchDir, { recursive: true }, () => void trigger('file-change'));
  logger.info(`[swan-applaud-sync] watching ${config.watchDir}`);
  logger.info('[swan-applaud-sync] press Ctrl+C to stop. Local recordings will not be deleted.');

  return new Promise((resolve) => {
    const shutdown = () => {
      clearInterval(interval);
      watcher.close();
      resolve();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  });
}

async function main() {
  const config = parseArgs(process.argv.slice(2));
  if (!config.watchDir) throw new Error('APPLAUD sync folder is required. Pass --watch-dir or set APPLAUD_SYNC_DIR.');
  if (!config.authToken) throw new Error('SWAN_AUTH_TOKEN is required. Use the launcher for encrypted login.');
  if (config.once) {
    const summary = await syncOnce(config);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  await runWatcher(config);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[swan-applaud-sync] ${error.message}`);
    process.exitCode = 1;
  });
}
