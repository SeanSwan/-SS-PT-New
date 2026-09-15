#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/lib/ytdlp.mjs
 * PURPOSE: The only place this engine invokes yt-dlp — resolution, argv-array
 *          execution, subtitle probing, upload enumeration, json3 fetch.
 * PART OF: Creator Brains — SS-PT acquisition engine (blueprint 1.0, S5)
 * ADDED: 2026-09-12
 * ============================================================================
 *
 * WHY NOT REUSE swan-scout's resolveYtDlp():
 *   It probes `uvx yt-dlp --version` with a 20s timeout and caches the result.
 *   On a cold uv cache the first fetch of the yt-dlp wheel exceeds 20s, so the
 *   probe reports "missing" for a yt-dlp that is merely slow — and (before its
 *   own fix) that verdict stuck. This engine ALSO runs on a machine where
 *   yt-dlp is not on PATH at all and uv's cache/tool dirs live outside the
 *   writable sandbox. So: longer probe, and every UV_* dir redirected into the
 *   workspace when we fall back to uvx. Verified 2026-09-12: `uvx yt-dlp`
 *   fails with `Access is denied` on %LOCALAPPDATA%\uv\cache unless all four
 *   UV_CACHE_DIR / UV_TOOL_DIR / UV_TOOL_BIN_DIR / UV_PYTHON_INSTALL_DIR point
 *   somewhere writable.
 *
 * WHY THE `--list-subs` PROBE EXISTS (upstream hostile-review finding F2):
 *   `yt-dlp --write-auto-sub --skip-download` on a video with NO caption track
 *   exits 0 and writes no file. So does a bot-check page. So does a transient
 *   empty payload. **File-absence cannot distinguish "no captions" from "fetch
 *   failed"** — and treating the second case as the first silently marks a
 *   video as permanently uncaptioned while it actually has captions. The probe
 *   asks the question directly, so the two outcomes land in different states.
 *
 * SAFETY: argv ARRAY, never a shell string, so no input can chain a command.
 * No media is ever downloaded — every invocation carries `--skip-download`,
 * and there is no `-x` / `-f` anywhere in this module.
 *
 * @module creator-brains/ytdlp
 */

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import {
  closeSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { REPO_ROOT } from './paths.mjs';

// Split out to hold this file under the Rule 4 300-line cap, then re-exported
// here so this module stays the single import surface for 'talk to YouTube'.
export { isLanguageTag, parseListSubs, probeSubs, pickLanguage } from './probe.mjs';
export { PRINT_FIELDS, parsePrintRows, listUploads } from './enumerate.mjs';

export class YtDlpError extends Error {}

/**
 * Run a subprocess with its output going to FILES, not pipes.
 *
 * WHY NOT A PIPE (`stdio: 'pipe'`, the default everyone reaches for):
 *   Two reasons, and the first one is not theoretical.
 *   1. Capturing a child's stdout through a pipe requires a named pipe. Some
 *      confined execution environments deny that outright (`spawn EPERM`), and
 *      the failure surfaces as "yt-dlp is not available" — a WRONG diagnosis
 *      that sends you to reinstall a working tool. Verified 2026-09-12: the
 *      probe reported missing while `uvx yt-dlp --version` ran fine by hand.
 *   2. `maxBuffer` is a ceiling, and a large channel enumeration is exactly the
 *      payload that hits it. A file has no ceiling.
 * So the child writes to a temp file we opened, and we read the file. Same
 * result, no pipe, no buffer cap. The temp directory is removed on every exit
 * path including a throw.
 */
function runCaptured(file, args, { timeout, env, windowsHide = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cb-exec-'));
  const outPath = join(dir, 'stdout.txt');
  const errPath = join(dir, 'stderr.txt');
  const outFd = openSync(outPath, 'w');
  const errFd = openSync(errPath, 'w');
  try {
    execFileSync(file, args, {
      stdio: ['ignore', outFd, errFd], timeout, windowsHide, env,
    });
    return { ok: true, stdout: readFileSync(outPath, 'utf-8'), stderr: '' };
  } catch (e) {
    let stderr = '';
    try { stderr = readFileSync(errPath, 'utf-8'); } catch { /* best effort */ }
    return { ok: false, stdout: safeRead(outPath), stderr, error: e };
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

let _cached;

/**
 * Resolve how to invoke yt-dlp.
 *  1. `CREATOR_BRAINS_YTDLP` — an explicit binary path (tests + odd machines).
 *  2. `yt-dlp` on PATH.
 *  3. `uvx yt-dlp`, with uv's dirs redirected somewhere writable.
 * Only a SUCCESS is cached; a failure is re-probed, because the failure state
 * is exactly the one that resolves itself (a cold uv cache warming up).
 */
export function resolveYtDlp({ force = false, probeTimeoutMs = 180_000 } = {}) {
  if (_cached && !force) return _cached;
  const explicit = process.env.CREATOR_BRAINS_YTDLP;
  if (explicit) {
    _cached = { file: explicit, prefix: [], env: process.env, label: explicit };
    return _cached;
  }
  const probe = (file, args, env) => runCaptured(file, args, { timeout: probeTimeoutMs, env }).ok;
  if (probe('yt-dlp', ['--version'], process.env)) {
    _cached = { file: 'yt-dlp', prefix: [], env: process.env, label: 'yt-dlp' };
  } else if (probe('uvx', ['yt-dlp', '--version'], uvEnv())) {
    _cached = { file: 'uvx', prefix: ['yt-dlp'], env: uvEnv(), label: 'uvx yt-dlp' };
  } else {
    _cached = null;
  }
  return _cached;
}

export function ytDlpAvailable() {
  return !!resolveYtDlp();
}

/** Test seam — forget the cached resolution. */
export function resetYtDlpCache() {
  _cached = undefined;
}

/**
 * Run yt-dlp, return stdout. Throws YtDlpError carrying the last useful stderr
 * line, because "yt-dlp failed" with no detail is unactionable in a 6am digest.
 */
export function runYtDlp(args, { timeout = 180_000 } = {}) {
  const bin = resolveYtDlp();
  if (!bin) {
    throw new YtDlpError(
      'yt-dlp is not available. Install it with `uv tool install yt-dlp`, or set '
      + 'CREATOR_BRAINS_YTDLP to a yt-dlp binary path.',
    );
  }
  if (args.some((a) => a === '-x' || a === '--extract-audio' || a === '-f' || a === '--format')) {
    throw new YtDlpError('refusing to run yt-dlp with a media-download flag (blueprint INV-5)');
  }
  const proc = runCaptured(bin.file, [...bin.prefix, ...args], { timeout, env: bin.env });
  if (proc.ok) return proc.stdout;
  throw new YtDlpError(diagnose(proc) || 'unknown yt-dlp error');
}

/** yt-dlp's version string, for the run record. Never throws. */
export function ytDlpVersion() {
  try {
    return runYtDlp(['--version'], { timeout: 60_000 }).trim();
  } catch {
    return null;
  }
}


/**
 * Fetch one video's timed-text track as raw json3 text and return it.
 *
 * `--sub-format json3` + `--skip-download` means: one subtitle request, no
 * media. We glob the produced file because the exact suffix varies by track
 * (`.en.json3`, `.en-orig.json3`).
 *
 * A missing output file after a SUCCESSFUL probe is a FAILURE, not a no-track —
 * the caller has already established the track exists (finding F2).
 */
export function fetchJson3(videoId, lang, { timeout = 180_000 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'cb-sub-'));
  try {
    const stem = join(dir, 'sub');
    runYtDlp([
      `https://www.youtube.com/watch?v=${videoId}`,
      '--skip-download', '--write-subs', '--write-auto-subs',
      '--sub-langs', lang, '--sub-format', 'json3',
      '--no-warnings', '-o', `${stem}.%(ext)s`,
    ], { timeout });
    const produced = readdirSync(dir).filter((f) => f.endsWith('.json3'));
    if (!produced.length) {
      throw new YtDlpError(
        `no json3 track was produced for ${videoId} (${lang}) although --list-subs reported one`,
      );
    }
    const raw = readFileSync(join(dir, produced[0]), 'utf-8');
    if (!raw.trim()) throw new YtDlpError(`empty json3 payload for ${videoId} (${lang})`);
    return raw;
  } finally {
    // Always clean up, including on throw. No media is ever written here, so
    // this is subtitle text only — but leaving temp dirs behind on every failed
    // fetch is how a disk quietly fills.
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

/** Probe helper used by tests and the canary: does yt-dlp answer at all?
 *
 *  THE EXPLICIT PATH IS PROBED, NOT TRUSTED. `CREATOR_BRAINS_YTDLP` used to be
 *  handed straight back, so `selfCheck()` returned `ok: true` with
 *  `version: null` for a typo'd path — and `run-daily.mjs` only refuses when
 *  `!check.ok`, so it proceeded and reported a cascade of transient fetch
 *  errors instead of the one sentence that mattered ("yt-dlp is not there").
 *  A health check that cannot fail is not a health check. */
export function selfCheck() {
  const explicit = process.env.CREATOR_BRAINS_YTDLP;
  if (explicit) {
    const proc = runCaptured(explicit, ['--version'], { timeout: 60_000, env: process.env });
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

/** yt-dlp's version string, or null. Never throws — used in run records. */
export function safeVersion() {
  try { return ytDlpVersion(); } catch { return null; }
}