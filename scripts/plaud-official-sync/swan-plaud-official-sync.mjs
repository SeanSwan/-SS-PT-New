#!/usr/bin/env node
/**
 * FILE: swan-plaud-official-sync.mjs
 * PURPOSE: Official @plaud-ai/cli backed sync into Swan PLAUD intake.
 */
import { execFile } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { isPlaudAuthFailure, normalizeApiBaseUrl, normalizeMaxAudioBytes, normalizePlaudAudioContentType, parsePlaudAudioUrl, parsePlaudFilesOutput, redactForLog } from './swan-plaud-official-sync.parsers.mjs';

export { isPlaudAuthFailure, normalizeApiBaseUrl, parsePlaudAudioUrl, parsePlaudFilesOutput, redactForLog } from './swan-plaud-official-sync.parsers.mjs';

const execFileAsync = promisify(execFile);
const DEFAULT_DAYS = 7;
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000;
const MIN_POLL_INTERVAL_MS = 60 * 1000;
const DEFAULT_CLI_COMMAND = 'npx --yes @plaud-ai/cli';

function caughtMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== 'null') return serialized;
  } catch {
    // Fall through to String conversion.
  }
  const text = String(error || '').trim();
  return text || 'Unknown error';
}

function localAppDataRoot(env = process.env) {
  return env.LOCALAPPDATA
    ? join(env.LOCALAPPDATA, 'SwanStudios', 'plaud-official-sync')
    : join(homedir(), '.swanstudios', 'plaud-official-sync');
}

export function defaultStatePath(env = process.env) {
  return join(localAppDataRoot(env), 'state.json');
}

function normalizePositiveIntegerOption(value, fallback, { min = 1 } = {}) {
  if (typeof value === 'boolean') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) return fallback;
  return Math.floor(parsed);
}

function normalizeBooleanFlag(value) {
  if (value === true) return true;
  const text = String(value || '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes';
}

function createStateMap(value) {
  const map = Object.create(null);
  for (const [key, entry] of Object.entries(value && typeof value === 'object' ? value : {})) map[key] = entry;
  return map;
}

export async function loadSyncState(statePath) {
  try {
    const parsed = JSON.parse(await readFile(statePath, 'utf8'));
    return {
      version: 1,
      uploaded: createStateMap(parsed?.uploaded),
      failed: createStateMap(parsed?.failed),
    };
  } catch {
    return { version: 1, uploaded: createStateMap(), failed: createStateMap() };
  }
}

export async function saveSyncState(statePath, state) {
  await mkdir(dirname(statePath), { recursive: true });
  const tempPath = `${statePath}.${process.pid}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(tempPath, statePath);
}

export function defaultCliCommandParts(env = process.env) {
  const command = String(env.SWAN_PLAUD_CLI_COMMAND || '').trim() || DEFAULT_CLI_COMMAND;
  return command.split(/\s+/).filter(Boolean);
}

export function createPlaudCliRunner({ commandParts = defaultCliCommandParts(), execFileImpl = execFileAsync } = {}) {
  const providedCommandParts = Array.isArray(commandParts)
    ? commandParts.map((part) => String(part || '').trim()).filter(Boolean)
    : [];
  const normalizedCommandParts = providedCommandParts.length ? providedCommandParts : defaultCliCommandParts({});
  const [rawCommand, ...baseArgs] = normalizedCommandParts;
  const command = process.platform === 'win32' && rawCommand === 'npx' ? 'npx.cmd' : rawCommand;
  const usesWindowsShellCommand = process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(command);
  return async (args) => {
    try {
      const { stdout, stderr } = await execFileImpl(command, [...baseArgs, ...args], {
        windowsHide: true,
        maxBuffer: 2 * 1024 * 1024,
        shell: usesWindowsShellCommand,
      });
      return { stdout, stderr, exitCode: 0 };
    } catch (err) {
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || '',
        exitCode: Number(err.code) || 1,
      };
    }
  };
}

async function runCliChecked(cliRunner, args) {
  const result = await cliRunner(args);
  if (result.exitCode === 0) return result;
  if (isPlaudAuthFailure(result)) {
    throw new Error('Plaud CLI is not authenticated. Run `npx --yes @plaud-ai/cli login` once, then rerun this sync.');
  }
  throw new Error(`Plaud CLI command failed: ${redactForLog(result.stderr || result.stdout || args.join(' '))}`);
}

async function fetchAudioBytes(url, { fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable in this Node runtime');
  const response = await fetchImpl(url, { redirect: 'manual' });
  if (response.status >= 300 && response.status < 400) throw new Error('PLAUD_AUDIO_REDIRECT_BLOCKED');
  if (!response.ok) throw new Error(`Plaud audio download failed: HTTP_${response.status}`);
  const maxBytes = normalizeMaxAudioBytes(process.env.SWAN_PLAUD_MAX_AUDIO_BYTES);
  if (Number(response.headers.get('content-length') || 0) > maxBytes) throw new Error('PLAUD_AUDIO_TOO_LARGE');
  const contentType = normalizePlaudAudioContentType(response.headers.get('content-type'));
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxBytes) throw new Error('PLAUD_AUDIO_TOO_LARGE');
  return { bytes, contentType };
}

async function uploadPlaudFile({ file, audio, apiBaseUrl, authToken, fetchImpl }) {
  if (!authToken) throw new Error('SWAN_AUTH_TOKEN is required');
  if (typeof fetchImpl !== 'function') throw new Error('fetch is unavailable in this Node runtime');
  const form = new FormData();
  form.append('files', new Blob([audio.bytes], { type: audio.contentType }), file.name || `${file.id}.m4a`);
  form.append('clipSource', 'plaud_official_sync');
  form.append('clipExternalId', file.id);
  if (file.recordedAt) form.append('recordedAt', file.recordedAt);

  const response = await fetchImpl(`${normalizeApiBaseUrl(apiBaseUrl)}/api/plaud/clips/upload`, {
    method: 'POST',
    redirect: 'manual',
    headers: { Authorization: `Bearer ${authToken}` },
    body: form,
  });
  if (response.status >= 300 && response.status < 400) throw new Error('SWAN_UPLOAD_REDIRECT_BLOCKED');
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`HTTP_${response.status}: Swan upload response was not valid JSON`);
  }
  const clips = Array.isArray(data.clips) ? data.clips : [];
  const rejected = Array.isArray(data.rejected) ? data.rejected : [];
  if (!response.ok || data.success === false) {
    const code = data?.error?.code || `HTTP_${response.status}`;
    const message = data?.error?.message || response.statusText || 'Upload failed';
    throw new Error(`${code}: ${message}`);
  }
  if (clips.length === 0) {
    const rejection = rejected[0] || {};
    const code = rejection.code || 'NO_CLIP_ACCEPTED';
    const message = rejection.message || 'Swan did not accept this recording.';
    throw new Error(`${code}: ${message}`);
  }
  return {
    clips,
    rejected,
  };
}

export async function syncOnce({
  statePath = defaultStatePath(),
  apiBaseUrl = 'https://sswanstudios.com',
  authToken = process.env.SWAN_AUTH_TOKEN,
  days = DEFAULT_DAYS,
  dryRun = false,
  cliRunner = createPlaudCliRunner(),
  fetchImpl = globalThis.fetch,
  logger = console,
  nowMs = Date.now(),
} = {}) {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const state = await loadSyncState(statePath);
  const summary = { dryRun: Boolean(dryRun), discovered: 0, uploaded: [], skipped: [], failed: [] };

  await runCliChecked(cliRunner, ['me']);
  const recent = await runCliChecked(cliRunner, ['recent', '--days', String(days)]);
  const files = parsePlaudFilesOutput(recent.stdout);
  summary.discovered = files.length;

  for (const file of files) {
    if (Object.hasOwn(state.uploaded, file.id)) {
      summary.skipped.push({ id: file.id, reason: 'already_uploaded' });
      continue;
    }
    if (dryRun) {
      summary.skipped.push({ id: file.id, name: file.name, recordedAt: file.recordedAt, reason: 'dry_run' });
      logger.info(`[swan-plaud-official-sync] dry-run skipped ${file.id}`);
      continue;
    }
    try {
      logger.info(`[swan-plaud-official-sync] preparing ${file.id}`);
      const audioResult = await runCliChecked(cliRunner, ['audio', file.id]);
      const audioUrl = parsePlaudAudioUrl(audioResult.stdout);
      if (!audioUrl) throw new Error('Plaud CLI did not return an audio URL');
      const audio = await fetchAudioBytes(audioUrl, { fetchImpl });
      const upload = await uploadPlaudFile({ file, audio, apiBaseUrl: normalizedApiBaseUrl, authToken, fetchImpl });
      const entry = {
        id: file.id,
        name: file.name,
        recordedAt: file.recordedAt,
        uploadedAt: new Date(nowMs).toISOString(),
        clipIds: upload.clips.map((clip) => clip.clipId).filter(Boolean),
        rejected: upload.rejected,
      };
      state.uploaded[file.id] = entry;
      delete state.failed[file.id];
      summary.uploaded.push(entry);
      await saveSyncState(statePath, state);
    } catch (err) {
      const entry = { id: file.id, name: file.name, error: redactForLog(caughtMessage(err)), failedAt: new Date(nowMs).toISOString() };
      state.failed[file.id] = entry;
      summary.failed.push(entry);
      logger.error(`[swan-plaud-official-sync] failed ${file.id}: ${entry.error}`);
      await saveSyncState(statePath, state);
    }
  }
  return summary;
}

export function parseArgs(argv, env = process.env) {
  const args = new Map();
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args.set(key, true);
    else {
      args.set(key, next);
      i += 1;
    }
  }
  return {
    apiBaseUrl: normalizeApiBaseUrl(args.get('api-base-url') || env.SWAN_API_BASE_URL || 'https://sswanstudios.com'),
    authToken: env.SWAN_AUTH_TOKEN,
    days: normalizePositiveIntegerOption(args.get('days') || env.SWAN_PLAUD_LOOKBACK_DAYS, DEFAULT_DAYS),
    dryRun: normalizeBooleanFlag(args.get('dry-run')) || normalizeBooleanFlag(env.SWAN_PLAUD_DRY_RUN),
    statePath: args.get('state-path') || env.SWAN_PLAUD_STATE_PATH || defaultStatePath(env),
    intervalMs: normalizePositiveIntegerOption(
      args.get('poll-interval-ms') || env.SWAN_PLAUD_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS,
      { min: MIN_POLL_INTERVAL_MS },
    ),
    once: Boolean(args.get('once')),
  };
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runLoop(config, {
  logger = console,
  sleepImpl = delay,
  maxIterations = Number.POSITIVE_INFINITY,
} = {}) {
  if (config.once) {
    console.log(JSON.stringify(await syncOnce(config), null, 2));
    return;
  }
  let iterations = 0;
  for (;;) {
    iterations += 1;
    try {
      await syncOnce(config);
    } catch (error) {
      logger.error(`[swan-plaud-official-sync] sync cycle failed: ${redactForLog(caughtMessage(error))}`);
    }
    if (iterations >= maxIterations) return;
    await sleepImpl(config.intervalMs);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runLoop(parseArgs(process.argv.slice(2))).catch((error) => {
    console.error(`[swan-plaud-official-sync] ${redactForLog(caughtMessage(error))}`);
    process.exitCode = 1;
  });
}
