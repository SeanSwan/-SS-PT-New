/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-common.mjs
 * PURPOSE: Shared primitives for the hostile-review gate system — telemetry,
 *          typed JSON I/O, atomic writes, the disable mechanism, and freshness.
 * AUTHOR: Opus 5 | CREATED: 2026-08-12 | REVISED: 2026-08-13
 * REVIEW:  Kimi K3 (S3-S9) + HY3 (D1-D4) hostile review — both DO-NOT-SHIP on v1.
 *          The lock moved to gate-lock.mjs (Kimi S1/S2, CRITICAL).
 * ============================================================================
 *
 * TRUST BOUNDARY: gate decisions may depend only on hook-written state,
 * tool-written state, and git. Agent-written state is a CLAIM, never evidence.
 * Several v1 primitives violated this while appearing to enforce it; the
 * corrections are marked inline so nobody re-introduces them.
 *
 * TELEMETRY IS THE CRASH SIGNAL. Every gate run appends one line, so silence
 * means a dead gate rather than a satisfied one. v1 broke this at the single
 * place it mattered: `failOpen` discarded `appendTelemetry`'s return value, so a
 * telemetry failure produced a silent allow — manufactured silence, which is the
 * failure the contract claims to detect (Kimi S3 / HY3 D3). `failOpen` now
 * returns a TRUTHY object when logging failed; a truthy return means DO NOT
 * SILENTLY ALLOW. Consumers must treat it as a block at any fail-closed boundary.
 */
import {
  appendFileSync, closeSync, existsSync, mkdirSync, openSync,
  readdirSync, readFileSync, renameSync, statSync, unlinkSync, utimesSync, writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(HERE, '..', '..', '..');

/** Paths resolve at call time so tests can retarget via SWAN_GATE_ROOT. */
export function gateRoot() {
  return process.env.SWAN_GATE_ROOT ? resolve(process.env.SWAN_GATE_ROOT) : DEFAULT_ROOT;
}
export function qaDir() { return join(gateRoot(), '.ai-workflow', 'qa'); }
export function coordDir() { return join(gateRoot(), '.ai-workflow', 'coordination'); }
export function telemetryPath() { return join(qaDir(), 'gate-telemetry.jsonl'); }
export function counterPath() { return join(coordDir(), 'review-counter.json'); }
export function counterLockPath() { return join(coordDir(), 'review-counter.lock'); }
export function sessionAnchorPath() { return join(qaDir(), '.session-start'); }

/**
 * Disable markers. HY3 D1 (BLOCKER): an in-tree directory is a kill switch the
 * examinee can throw. SWAN_DISABLE_ROOT lets a privileged hook host it outside
 * agent-writable space; the in-tree default remains only so the rollback drill
 * works today, and `listDisabled()` exists so the push gate can REFUSE while any
 * gate is disabled — a disable must be loud at the trust boundary, not silent.
 */
export function disabledDir() {
  return process.env.SWAN_DISABLE_ROOT
    ? resolve(process.env.SWAN_DISABLE_ROOT)
    : join(qaDir(), 'disabled');
}

/** Append exactly one telemetry line. Key ORDER is contract. Never throws. */
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
    // Keep lines well under 4096 bytes: concurrent appendFileSync from two agents
    // can tear longer lines, and readJsonl's skip-malformed policy would silently
    // absorb the evidence (Kimi S3 corollary).
    appendFileSync(telemetryPath(), `${line}\n`, 'utf8');
    return true;
  } catch {
    return false;
  }
}

/**
 * Record a fail-open.
 * @returns {null} when the telemetry line landed — safe to allow.
 * @returns {object} TRUTHY when logging failed — the caller must NOT silently
 *          allow; at a fail-closed boundary this is a block (HY3 D3).
 */
export function failOpen(name, boundary, reason, latencyMs = 0) {
  const logged = appendTelemetry({ gate: name, boundary, result: 'fail-open', reason, latency_ms: latencyMs });
  if (logged) return null;
  try { process.stderr.write(`GATE-TELEMETRY-FAILURE ${name} ${reason}\n`); } catch { /* last resort */ }
  return { failOpen: true, telemetrySound: false, gate: name, reason };
}

/**
 * Typed JSON read (Kimi S6). v1 collapsed missing/corrupt/unreadable into one
 * fallback, so an EACCES read as "no data yet" and fell open — while the
 * architecture requires fail-CLOSED on a corrupt counter. Callers must opt into
 * collapsing rather than inherit it.
 * @returns {{ok:true,value:any}|{ok:false,error:'missing'|'corrupt'|'unreadable',code?:string}}
 */
export function readJsonResult(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return { ok: false, error: 'missing' };
    return { ok: false, error: 'unreadable', code: err?.code };
  }
  try { return { ok: true, value: JSON.parse(raw) }; } catch { return { ok: false, error: 'corrupt' }; }
}

/** Convenience collapse. NEVER use where missing-vs-corrupt changes the decision. */
export function readJsonOrDefault(path, fallback = null) {
  const r = readJsonResult(path);
  return r.ok ? r.value : fallback;
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

/** Read JSONL, skipping malformed lines — one torn line must not blind a gate. */
export function readJsonl(path) {
  const out = [];
  let raw = '';
  try { raw = readFileSync(path, 'utf8'); } catch { return out; }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* skip torn line */ }
  }
  return out;
}

/**
 * Atomic whole-file JSON write (Kimi S8 / amendment A4): temp-then-rename, so an
 * artifact either fully exists or does not. Without this, slice-2 authors reach
 * for writeFileSync and a killed write leaves a truncated file that passes an
 * existence-plus-non-empty check — the exact incident this system was built after.
 */
export function writeJsonAtomic(path, obj) {
  const tmp = `${path}.tmp.${process.pid}.${randomUUID()}`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(tmp, JSON.stringify(obj), 'utf8');
    renameSync(tmp, path);
    return true;
  } catch {
    try { unlinkSync(tmp); } catch { /* best effort */ }
    return false;
  }
}

const disabledAnnounced = new Set();

/**
 * Is a component disabled? Emits `disabled-honored` telemetry the first time per
 * process (Kimi S5) — v1 honored a kill switch and told nobody.
 * Names are sanitized: v1 joined an unsanitized name, so `isDisabled('../../x')`
 * traversed. Names are lowercased because macOS/Windows filesystems are
 * case-insensitive and Linux is not (Kimi Q6e).
 */
export function isDisabled(name) {
  const raw = String(name);
  if (!raw || /[\\/]/.test(raw) || raw.includes('..')) return false;
  const key = raw.toLowerCase();
  let present = false;
  try { present = existsSync(join(disabledDir(), key)); } catch { return false; }
  if (present && !disabledAnnounced.has(key)) {
    disabledAnnounced.add(key);
    appendTelemetry({ gate: key, boundary: 'tool', result: 'disabled-honored', reason: 'disable marker present', latency_ms: 0 });
  }
  return present;
}

/** Every active disable marker. The push gate must refuse PASS while any exists. */
export function listDisabled() {
  try { return readdirSync(disabledDir()).filter((f) => !f.startsWith('.')).sort(); } catch { return []; }
}

/** Current HEAD sha, or null. `exec` is injectable so the empty-output branch is testable. */
export function headSha(cwd = gateRoot(), { exec = execFileSync } = {}) {
  try {
    const out = exec('git', ['-C', cwd, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return String(out).trim() || null; // '' is falsy but poisons `sha === null` checks
  } catch {
    return null;
  }
}

/** Session id from the harness, or null. Null means UNKNOWN — never invent one. */
export function sessionId() {
  return process.env.CLAUDE_SESSION_ID || process.env.SWAN_GATE_SESSION_ID || null;
}

/**
 * Stamp the session anchor. **SessionStart hook only** — this is trust-root state.
 *
 * v1 exported `touchSessionStart(when)` with an attacker-controlled timestamp, so
 * `touchSessionStart(new Date(0))` made every artifact ever written "fresh" — a
 * one-line bypass of the whole freshness contract (Kimi S4 / HY3 D2). The anchor
 * now (a) never moves backwards, (b) carries {sessionId, headSha, ts} so consumers
 * verify contents rather than a bare mtime.
 */
export function stampSessionStart({ when = new Date(), id = sessionId(), sha = null } = {}) {
  try {
    mkdirSync(qaDir(), { recursive: true });
    const path = sessionAnchorPath();
    let existingMs = null;
    try { existingMs = statSync(path).mtimeMs; } catch { existingMs = null; }
    const clamped = existingMs !== null && when.getTime() < existingMs;
    const effective = clamped ? new Date(existingMs) : when;
    writeFileSync(path, JSON.stringify({ sessionId: id, headSha: sha, ts: effective.toISOString() }), 'utf8');
    utimesSync(path, effective, effective);
    return { ok: true, clamped, ts: effective.toISOString() };
  } catch {
    return { ok: false, clamped: false, ts: null };
  }
}

/** The anchor's contents, or null when absent/corrupt. */
export function sessionAnchor() {
  const r = readJsonResult(sessionAnchorPath());
  return r.ok ? r.value : null;
}

/** Anchor mtime in epoch ms, or null (UNKNOWN). */
export function sessionStartMs() {
  try { return statSync(sessionAnchorPath()).mtimeMs; } catch { return null; }
}

/** sha256 of a file's bytes, or null if unreadable. */
export function fileSha256(path) {
  try { return createHash('sha256').update(readFileSync(path)).digest('hex'); } catch { return null; }
}

/**
 * A2 — the load-bearing freshness primitive. An artifact is fresh for a subject
 * only if it *states* the sha it covers and that matches the sha the consumer
 * computed from git. Unforgeable by mtime games: the agent cannot mint a binding
 * for code it did not review, because HEAD is recomputed on the trust side.
 * Missing or mismatched → false, and consumers must treat that as a hard block.
 */
export function isFreshForSha(artifactSubjectSha, currentSha) {
  if (!artifactSubjectSha || !currentSha) return false;
  return String(artifactSubjectSha) === String(currentSha);
}

/**
 * HEURISTIC ONLY — never a gate decision (Kimi's A2 ruling / HY3 D2).
 * mtime is agent-writable via utimesSync, so this fails OPEN against forgery even
 * though it fails closed against absence. Legitimate uses: a human-facing
 * "claims sha X but is 3 days old" tripwire, and cheap pre-filtering before the
 * sha check. Deliberately renamed from `isFreshThisSession` so no consumer can
 * mistake it for proof.
 */
export function mtimeLooksFresh(path) {
  const start = sessionStartMs();
  if (start === null) return false;
  try { return statSync(path).mtimeMs >= start; } catch { return false; }
}

export { LOCK_STALE_MS, acquireCounterLock, releaseCounterLock, readLockHolder } from './gate-lock.mjs';
