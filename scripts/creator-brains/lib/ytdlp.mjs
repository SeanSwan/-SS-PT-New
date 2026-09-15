#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/ytdlp.mjs
 * PURPOSE: The only place this engine invokes yt-dlp — resolution, execution,
 *          and an ALLOWLISTED OPERATION MODEL instead of a flag blacklist.
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair HR20)
 * ADDED: 2026-09-12 | REWRITTEN 2026-09-13
 * ============================================================================
 *
 * WHAT WAS WRONG (reproduced findings HR20 and HR20b):
 *   The guard rejected four exact spellings — `-x`, `--extract-audio`, `-f`,
 *   `--format` — and the reviewer walked straight past it with `--format=best`.
 *   Separately, the enumeration argv carried NEITHER `--ignore-config` nor a
 *   central `--skip-download`, so a user's `yt-dlp.conf` could add `--exec`,
 *   `-o`, cookies or a proxy to a command this engine believes it controls. An
 *   argv array prevents SHELL interpolation; it does nothing about yt-dlp's own
 *   automatic configuration loading.
 *
 * THE FIX IS A CONSTRUCTION MODEL, NOT A LONGER BLACKLIST:
 *   Callers no longer pass flags. They name an OPERATION and its parameters, and
 *   this module builds the argv from a fixed allowlist:
 *     - every operation except `version` carries `--ignore-config` and
 *       `--no-config-locations`, so ambient configuration cannot add effects;
 *     - every read-only operation carries `--skip-download` centrally;
 *     - there is no operation that downloads media, so there is no code path
 *       that can be talked into one;
 *     - identifiers, language tags and hosts are regex-validated before they
 *       reach argv.
 *   A blacklist must anticipate every spelling. An allowlist only has to be
 *   correct about what it permits.
 *
 * @module creator-brains/ytdlp
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  closeSync, mkdtempSync, openSync, readFileSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from './paths.mjs';

export class YtDlpError extends Error {}
export class OpError extends Error {}

/** BCP-47-ish, 2-3 letter primary subtag. */
const LANG = /^[a-zA-Z]{2,3}(?:-[A-Za-z0-9]{1,8})*$/;
/** YouTube video ids are exactly 11 url-safe chars. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
/** Channel ids are `UC` + 22 url-safe chars. */
const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
/** Only these hosts, and only https. */
const ALLOWED_HOST = /^https:\/\/(www\.)?youtube\.com\//;

export const isVideoId = (s) => typeof s === 'string' && VIDEO_ID.test(s);
export const isChannelId = (s) => typeof s === 'string' && CHANNEL_ID.test(s);
export const isLanguageTag = (s) => typeof s === 'string' && LANG.test(s);

// ─────────────────────────────────────────────────────────────────────────────
// The operation model (HR20)
// ─────────────────────────────────────────────────────────────────────────────

/** Flags every read-only operation gets. `--ignore-config` is the load-bearing
 *  one: without it a yt-dlp.conf on the machine silently joins the command. */
const READ_ONLY_BASE = [
  '--ignore-config',
  '--no-config-locations',
  '--skip-download',
  '--no-warnings',
  '--no-playlist',
  '--no-progress',
];

const VERSION_FLAGS = ['--version'];

/** The JSON field set the enumerator asks for. Queried as one JSON object per
 *  line, which is what makes embedded tabs and newlines in titles harmless
 *  (review HR12). */
export const ENUM_FIELDS = '{id,title,duration,view_count,upload_date,channel_id,availability}';
export const ENUM_PRINT = `%(.${ENUM_FIELDS})j`;

/**
 * Validate an operation's parameters and return argv (without the binary).
 * Throws `OpError` for anything not explicitly permitted.
 */
export function buildArgv(op, params = {}) {
  switch (op) {
    case 'version':
      return [...VERSION_FLAGS];

    case 'probe': {
      const { videoId } = params;
      if (!isVideoId(videoId)) throw new OpError(`probe: '${videoId}' is not a video id`);
      return [`https://www.youtube.com/watch?v=${videoId}`, ...READ_ONLY_BASE, '--list-subs'];
    }

    case 'fetchSubs': {
      const { videoId, lang, outStem } = params;
      if (!isVideoId(videoId)) throw new OpError(`fetchSubs: '${videoId}' is not a video id`);
      if (!isLanguageTag(lang)) throw new OpError(`fetchSubs: '${lang}' is not a language tag`);
      if (typeof outStem !== 'string' || !outStem) throw new OpError('fetchSubs: outStem is required');
      return [
        `https://www.youtube.com/watch?v=${videoId}`,
        ...READ_ONLY_BASE,
        '--write-subs', '--write-auto-subs',
        '--sub-langs', lang,
        '--sub-format', 'json3',
        '-o', `${outStem}.%(ext)s`,
      ];
    }

    case 'enumerate': {
      const { url, limit = 0 } = params;
      if (typeof url !== 'string' || !ALLOWED_HOST.test(url)) {
        throw new OpError(`enumerate: '${url}' is not a permitted YouTube URL`);
      }
      const args = [url, ...READ_ONLY_BASE, '--flat-playlist', '--print', ENUM_PRINT];
      if (Number.isInteger(limit) && limit > 0) args.push('--playlist-end', String(limit));
      return args;
    }

    case 'resolveChannel': {
      // A FLAT enumeration does not populate per-video `channel_id`, so asking
      // for it there returns nothing and `add` could not resolve a handle. The
      // PLAYLIST-level fields ARE populated in flat mode, which makes this both
      // correct and cheap — no per-video extraction.
      const { url } = params;
      if (typeof url !== 'string' || !ALLOWED_HOST.test(url)) {
        throw new OpError(`resolveChannel: '${url}' is not a permitted YouTube URL`);
      }
      return [
        url,
        ...READ_ONLY_BASE,
        '--flat-playlist',
        '--playlist-end', '1',
        '--print', '%(playlist_channel_id)s\t%(playlist_uploader_id)s\t%(playlist_title)s',
      ];
    }

    default:
      // An unknown operation is REFUSED, not passed through. This line is what
      // makes the model an allowlist rather than a differently-shaped blacklist.
      throw new OpError(`'${op}' is not a permitted yt-dlp operation`);
  }
}

/** Every operation name this engine will build. */
export const OPERATIONS = Object.freeze(['version', 'probe', 'fetchSubs', 'enumerate', 'resolveChannel']);

// ─────────────────────────────────────────────────────────────────────────────
// Execution
// ─────────────────────────────────────────────────────────────────────────────

/** Where uv's dirs go when we fall back to `uvx yt-dlp`. */
const UV_HOME = join(REPO_ROOT, '.ai-workflow', 'uv');

function uvEnv() {
  return {
    ...process.env,
    UV_CACHE_DIR: process.env.UV_CACHE_DIR || join(UV_HOME, 'cache'),
    UV_TOOL_DIR: process.env.UV_TOOL_DIR || join(UV_HOME, 'tools'),
    UV_TOOL_BIN_DIR: process.env.UV_TOOL_BIN_DIR || join(UV_HOME, 'bin'),
    UV_PYTHON_INSTALL_DIR: process.env.UV_PYTHON_INSTALL_DIR || join(UV_HOME, 'python'),
  };
}

/**
 * Run a subprocess with its output going to FILES, not pipes.
 *
 * Capturing a child's stdout through a pipe needs a named pipe, which some
 * confined environments deny outright (`spawn EPERM`) — and that failure
 * surfaces as "yt-dlp is not available", a WRONG diagnosis that sends you to
 * reinstall a working tool. `maxBuffer` is also a ceiling a large enumeration
 * will hit. A file has neither problem.
 */
function runCaptured(file, args, { timeout, env, windowsHide = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cb-exec-'));
  const outPath = join(dir, 'stdout.txt');
  const errPath = join(dir, 'stderr.txt');
  const outFd = openSync(outPath, 'w');
  const errFd = openSync(errPath, 'w');
  try {
    execFileSync(file, args, { stdio: ['ignore', outFd, errFd], timeout, windowsHide, env });
    return { ok: true, stdout: readFileSync(outPath, 'utf-8'), stderr: '' };
  } catch (e) {
    return { ok: false, stdout: safeRead(outPath), stderr: safeRead(errPath), error: e };
  } finally {
    try { closeSync(outFd); } catch { /* best effort */ }
    try { closeSync(errFd); } catch { /* best effort */ }
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

function safeRead(p) {
  try { return readFileSync(p, 'utf-8'); } catch { return ''; }
}

/** Last two meaningful stderr lines — the useful diagnosis lives there. */
function diagnose(proc) {
  const text = `${proc.stderr || ''}\n${(proc.error && proc.error.message) || ''}`;
  return text.split('\n').map((l) => l.trim()).filter(Boolean).slice(-2).join(' ').slice(0, 400);
}

let _cached;

/** Resolve how to invoke yt-dlp. Only a SUCCESS is cached. */
export function resolveYtDlp({ force = false, probeTimeoutMs = 180_000 } = {}) {
  if (_cached && !force) return _cached;
  const explicit = process.env.CREATOR_BRAINS_YTDLP;
  if (explicit) {
    _cached = { file: explicit, prefix: [], env: process.env, label: explicit };
    return _cached;
  }
  if (runCaptured('yt-dlp', VERSION_FLAGS, { timeout: probeTimeoutMs, env: process.env }).ok) {
    _cached = { file: 'yt-dlp', prefix: [], env: process.env, label: 'yt-dlp' };
  } else if (runCaptured('uvx', ['yt-dlp', ...VERSION_FLAGS], { timeout: probeTimeoutMs, env: uvEnv() }).ok) {
    _cached = { file: 'uvx', prefix: ['yt-dlp'], env: uvEnv(), label: 'uvx yt-dlp' };
  } else {
    _cached = null;
  }
  return _cached;
}

export function ytDlpAvailable() {
  return !!resolveYtDlp();
}

export function resetYtDlpCache() {
  _cached = undefined;
}

/** Run an allowlisted operation. Callers never supply flags. */
export function runOperation(op, params = {}, { timeout = 180_000 } = {}) {
  const bin = resolveYtDlp();
  if (!bin) {
    throw new YtDlpError(
      'yt-dlp is not available. Install it with `uv tool install yt-dlp`, or set '
      + 'CREATOR_BRAINS_YTDLP to a yt-dlp binary path.',
    );
  }
  const argv = buildArgv(op, params); // throws before any process starts
  const proc = runCaptured(bin.file, [...bin.prefix, ...argv], { timeout, env: bin.env });
  if (proc.ok) return proc.stdout;
  throw new YtDlpError(diagnose(proc) || 'unknown yt-dlp error');
}

/** Version string, for the run record. Never throws. */
export function ytDlpVersion() {
  try {
    return runOperation('version', {}, { timeout: 60_000 }).trim();
  } catch {
    return null;
  }
}

/** yt-dlp's version string, or null. Used in run records. */
export function safeVersion() {
  try { return ytDlpVersion(); } catch { return null; }
}

/**
 * Does yt-dlp answer at all?
 *
 * The explicit path is PROBED, not trusted: the first version returned
 * `ok: true` with `version: null` for a typo'd `CREATOR_BRAINS_YTDLP`, and
 * `run-daily` — which only refuses when `!ok` — proceeded and reported a cascade
 * of fetch errors instead of the one sentence that mattered. A health check that
 * cannot fail is not a health check.
 */
export function selfCheck() {
  const explicit = process.env.CREATOR_BRAINS_YTDLP;
  if (explicit) {
    const proc = runCaptured(explicit, VERSION_FLAGS, { timeout: 60_000, env: process.env });
    if (!proc.ok) {
      return { ok: false, reason: `CREATOR_BRAINS_YTDLP points at '${explicit}', which did not run`, version: null };
    }
    return { ok: true, reason: `explicit path ${explicit}`, version: String(proc.stdout).trim() || null };
  }
  const bin = resolveYtDlp();
  if (!bin) return { ok: false, reason: 'yt-dlp not resolvable', version: null };
  const version = ytDlpVersion();
  if (!version) return { ok: false, reason: `resolved via ${bin.label} but --version produced nothing`, version: null };
  return { ok: true, reason: `resolved via ${bin.label}`, version };
}

// Re-exported so this module stays the single import surface for "talk to
// YouTube" — the same pattern swan-scout uses for its cache split.
export { parseListSubs, probeSubs, pickLanguage } from './probe.mjs';
export { parsePrintRows, listUploads, PRINT_FIELDS, classifyEnumeration } from './enumerate.mjs';
export { fetchJson3 } from './subtitles.mjs';
