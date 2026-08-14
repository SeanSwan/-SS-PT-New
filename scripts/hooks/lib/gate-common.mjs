/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-common.mjs
 * PURPOSE: Shared primitives for the hostile-review gate system — telemetry,
 *          safe JSON/JSONL I/O, the counter lock, and the uniform disable
 *          mechanism every gate and tool in the system shares.
 * AUTHOR: Opus 5, from the Kimi K3 architecture blueprint | CREATED: 2026-08-12
 * SLICE: 1 of 10 (blueprint Part B §9) — build-order file #1
 * ============================================================================
 *
 * WHY THIS EXISTS
 * The old dry-loop gate enforced a STRING in the closing message. Anything the
 * agent typed satisfied it, so a genuine six-round loop and a fabricated claim
 * were indistinguishable. The replacement system's core rule is a trust
 * boundary: gate decisions may depend only on hook-written state, tool-written
 * state, and git itself. Agent-written state is a CLAIM, never evidence.
 * This module owns the hook-written half of that boundary.
 *
 * THE TELEMETRY CONTRACT (blueprint T5) is the load-bearing part. Every gate
 * run — allow, block, or crash — appends exactly one line here. Before this,
 * gates failed open silently: a gate crashing for a month and a gate happily
 * passing produced identical observable behaviour, so a dead guard read as a
 * satisfied one. With one line per run, SILENCE ITSELF BECOMES THE CRASH
 * SIGNAL, and the push gate refuses to print PASS when the newest telemetry
 * line predates the session.
 *
 * FAIL-SAFE POSTURE: nothing here throws at the caller. A telemetry or lock
 * failure must never wedge a session, so every entry point catches and returns
 * a falsy result instead. The ONE exception to fail-open lives in the privacy
 * gate (blueprint R8-1), not here.
 *
 * PATH RESOLUTION is lazy, via `gateRoot()`, so tests can retarget the whole
 * module at a temp dir with SWAN_GATE_ROOT without touching real gate state.
 * Resolving at module load would bake the repo root in at import time.
 */
import {
  appendFileSync, closeSync, existsSync, mkdirSync,
  openSync, readFileSync, statSync, unlinkSync, utimesSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
/** scripts/hooks/lib -> repo root */
const DEFAULT_ROOT = resolve(HERE, '..', '..', '..');

/** Stale-lock TTL (blueprint S3). A lock older than this is presumed abandoned. */
export const LOCK_STALE_MS = 120_000;

/** Every path below is derived at call time so SWAN_GATE_ROOT works in tests. */
export function gateRoot() {
  const override = process.env.SWAN_GATE_ROOT;
  return override ? resolve(override) : DEFAULT_ROOT;
}
export function qaDir() { return join(gateRoot(), '.ai-workflow', 'qa'); }
export function coordDir() { return join(gateRoot(), '.ai-workflow', 'coordination'); }
export function telemetryPath() { return join(qaDir(), 'gate-telemetry.jsonl'); }
export function disabledDir() { return join(qaDir(), 'disabled'); }
export function counterPath() { return join(coordDir(), 'review-counter.json'); }
export function counterLockPath() { return join(coordDir(), 'review-counter.lock'); }
export function sessionStartPath() { return join(qaDir(), '.session-start'); }

/**
 * Append exactly one telemetry line. Field ORDER is part of the contract —
 * the blueprint's wireframes and the push gate's freshness assert both read
 * these lines, so keep ts/gate/boundary/result/reason/latency_ms in order.
 *
 * Returns true on write, false if telemetry itself failed. Never throws:
 * a gate that crashed because it could not log would be the exact failure
 * this system exists to make visible.
 */
export function appendTelemetry(entry) {
  try {
    mkdirSync(qaDir(), { recursive: true });
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      gate: String(entry?.gate ?? 'unknown'),
      boundary: String(entry?.boundary ?? 'unknown'),
      result: String(entry?.result ?? 'unknown'),
      reason: String(entry?.reason ?? ''),
      latency_ms: Number.isFinite(Number(entry?.latency_ms)) ? Math.round(Number(entry.latency_ms)) : 0,
    });
    appendFileSync(telemetryPath(), `${line}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/** Parse JSON from disk, returning `fallback` for missing OR malformed input.
 *  Callers distinguish "absent" from "corrupt" by checking existsSync first —
 *  the push gate needs that distinction (R8-2 fails closed on corrupt). */
export function readJsonSafe(path, fallback = null) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

/** Append one object as a single JSONL line, creating parent dirs. */
export function appendJsonl(path, obj) {
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify(obj)}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/** Read a JSONL file into an array, skipping malformed lines rather than
 *  throwing — one corrupt line must not blind a gate to the other 400. */
export function readJsonl(path) {
  const out = [];
  let raw = '';
  try { raw = readFileSync(path, 'utf8'); } catch { return out; }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip malformed line */ }
  }
  return out;
}

/**
 * Uniform disable mechanism (blueprint S10 rollback drill): the presence of
 * `.ai-workflow/qa/disabled/<name>` turns a component off. A file rather than
 * an env var so a disable survives across processes and is visible in `ls` —
 * a silently disabled guard is the thing we are trying to stop shipping.
 */
export function isDisabled(name) {
  try {
    return existsSync(join(disabledDir(), String(name)));
  } catch {
    return false;
  }
}

/**
 * Record a fail-open and return null (the "allow" sentinel every gate's
 * decide() uses). The telemetry line is the whole point: a fail-open that
 * logs nothing is indistinguishable from a gate that passed on the merits.
 */
export function failOpen(name, boundary, reason, latencyMs = 0) {
  appendTelemetry({ gate: name, boundary, result: 'fail-open', reason, latency_ms: latencyMs });
  return null;
}

/**
 * Acquire the counter lock via O_EXCL (blueprint S3). Two agents share one
 * tree, so both lanes can legitimately reach the same round number in the same
 * minute — without this, one write silently loses and a round vanishes or an
 * anchor double-fires.
 *
 * Returns {ok, path, reason, stolen}. `stolen: true` means a lock older than
 * `staleMs` was reclaimed; callers log that, because a stolen lock means some
 * process died holding it. Exactly ONE force-unlink retry: retrying in a loop
 * would let two processes ping-pong the steal and both believe they hold it.
 */
export function acquireCounterLock({ lockPath = counterLockPath(), staleMs = LOCK_STALE_MS } = {}) {
  try {
    mkdirSync(dirname(lockPath), { recursive: true });
  } catch {
    return { ok: false, path: lockPath, reason: 'mkdir-failed', stolen: false };
  }
  try {
    closeSync(openSync(lockPath, 'wx'));
    return { ok: true, path: lockPath, reason: 'acquired', stolen: false };
  } catch (err) {
    if (err?.code !== 'EEXIST') {
      return { ok: false, path: lockPath, reason: err?.code || 'open-failed', stolen: false };
    }
  }
  // Held. Reclaim only if demonstrably stale.
  let ageMs = null;
  try { ageMs = Date.now() - statSync(lockPath).mtimeMs; } catch { ageMs = null; }
  if (ageMs === null || ageMs <= staleMs) {
    return { ok: false, path: lockPath, reason: 'contention', stolen: false };
  }
  try { unlinkSync(lockPath); } catch { /* another process reclaimed it first */ }
  try {
    closeSync(openSync(lockPath, 'wx'));
    return { ok: true, path: lockPath, reason: 'stale-reclaimed', stolen: true };
  } catch {
    return { ok: false, path: lockPath, reason: 'contention', stolen: false };
  }
}

/** Release the counter lock. Returns false if it was already gone. */
export function releaseCounterLock(lockPath = counterLockPath()) {
  try {
    unlinkSync(lockPath);
    return true;
  } catch {
    return false;
  }
}

/** Current HEAD sha, or null when git is unavailable or this is not a repo.
 *  Null is a real answer callers must handle — the push gate treats an unknown
 *  HEAD as "cannot verify the anchor covers this code". */
export function headSha(cwd = gateRoot()) {
  try {
    return execFileSync('git', ['-C', cwd, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || null;
  } catch {
    return null;
  }
}

/** Stable id for the current agent session, or null when the harness did not
 *  supply one. Callers must treat null as UNKNOWN and fail open at the turn
 *  boundary (R8) rather than inventing a session identity. */
export function sessionId() {
  return process.env.CLAUDE_SESSION_ID || process.env.SWAN_GATE_SESSION_ID || null;
}

/** Stamp the session-start marker. Called by the SessionStart hook (wired in a
 *  later slice); idempotent, so re-stamping mid-session just refreshes mtime. */
export function touchSessionStart(when = new Date()) {
  try {
    mkdirSync(qaDir(), { recursive: true });
    if (!existsSync(sessionStartPath())) appendFileSync(sessionStartPath(), '', 'utf8');
    utimesSync(sessionStartPath(), when, when);
    return true;
  } catch {
    return false;
  }
}

/**
 * Epoch ms of session start, or null when the marker is absent.
 * "Freshness" checks (R7(b): a verdict's mtime must fall inside the current
 * session) are built on this. Null means UNKNOWN — and an unknown session
 * boundary must never be silently treated as "everything is fresh", which is
 * precisely how a stale artifact from a previous run passed a check today.
 */
export function sessionStartMs() {
  try {
    return statSync(sessionStartPath()).mtimeMs;
  } catch {
    return null;
  }
}

/** True when `path` was modified at or after session start. Returns false when
 *  either the file or the session marker is unknown — unknown is not fresh. */
export function isFreshThisSession(path) {
  const start = sessionStartMs();
  if (start === null) return false;
  try {
    return statSync(path).mtimeMs >= start;
  } catch {
    return false;
  }
}
