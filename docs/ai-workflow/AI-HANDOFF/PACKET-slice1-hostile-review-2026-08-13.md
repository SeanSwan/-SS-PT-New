# Hostile review — Slice 1 code, before it ships

**Date:** 2026-08-13 · **Reviewers:** Kimi K3 + HY3 · **Verdict needed:** ship / fix-then-ship / do-not-ship.

## What this is

`gate-common.mjs` is file #1 of a 25-file hostile-review gate system you (Kimi) architected. It is the
shared library every future gate stands on: telemetry, safe JSON/JSONL I/O, an O_EXCL counter lock,
a disable mechanism, and session-freshness helpers. If this file is wrong, every gate built on it
inherits the defect.

## Context you must weigh

- Built by Opus 5 on a branch **~1,858 commits behind `origin/main`**. Its "complete" verdict has
  already been re-opened as UNVERIFIED for that reason.
- Two agents commit to this tree concurrently. One lost 728 lines to a dirty-index sweep today; the
  author's own six files were swept into another agent's commit hours later.
- A later hostile review amended the architecture AFTER this file was written. Amendments that may
  bear on it: **A2** — freshness must move from **mtime to consumer-checked `subject_sha`** (mtime is
  forgeable and skews across machines); **A4** — artifact writes must be temp-then-rename and carry a
  status taxonomy; **A6** — the trust root must be written only by hooks. This file currently
  implements mtime-based freshness (`isFreshThisSession`). **Does A2 obsolete it, or do both belong?**
- Owner intent: he wants to ship. Tell him plainly if shipping this is unsafe, and exactly why.

## Hostile-review questions

1. **Correctness under concurrency.** Two agents, one lock, `O_EXCL` + a 120s stale TTL + exactly one
   force-unlink retry. Where does this lose a write, double-acquire, or deadlock? Is "exactly one
   retry" right, or does it have a failure mode the author did not see?
2. **The freshness contract.** `isFreshThisSession` returns false for unknown session start AND for
   unstattable files ("UNKNOWN is never fresh"). Is fail-closed correct here, given every gate that
   consumes it fails OPEN on error? Does that combination produce a gate that silently allows?
3. **Telemetry as the crash signal.** The design claims "silence becomes the crash signal" because
   every gate run appends a line. `appendTelemetry` swallows all errors and returns false. If the
   telemetry write itself fails, the crash signal is silently absent — is this self-defeating?
4. **The disable mechanism** is a file in a directory the agent can write. Is a self-writable kill
   switch acceptable for a system whose purpose is constraining that same agent?
5. **Test quality.** 14 tests, mutation kill rate 1.00 post-adjudication against an 0.80 floor, with
   one mutant adjudicated equivalent in writing. Attack the adjudication: is the stale-TTL boundary
   mutant *genuinely* equivalent, or was that a convenient excuse? What mutants would you have
   planted that the author did not?
6. **What breaks on a non-Windows machine, or under a different Node?** Built and tested only on
   Windows 11 / Node 22.14 / Git Bash.
7. **Ship verdict.** Given the stale-tree provenance and the A2/A4/A6 amendments, should this ship to
   production now, be fixed first, or be rebuilt on the reconciled tree? Be decisive.

---

## SOURCE — scripts/hooks/lib/gate-common.mjs

```javascript
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
```

## SOURCE — scripts/hooks/lib/gate-common.test.mjs

```javascript
#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-common.test.mjs
 * PURPOSE: Prove the shared gate primitives hold their contracts — especially
 *          the two that the old system got wrong: telemetry-on-every-run, and
 *          "unknown is not fresh".
 * AUTHOR: Opus 5 | CREATED: 2026-08-12 | SLICE: 1 (blueprint Part B §9)
 * ============================================================================
 *
 * Run: node scripts/hooks/lib/gate-common.test.mjs
 * Final line is the literal acceptance token: RESULT: PASS (14/14)
 *
 * Every test retargets the module at a fresh temp dir via SWAN_GATE_ROOT, so
 * running this suite never writes into the repo's real gate state.
 *
 * WHY TEST 14 MATTERS MOST: a stale artifact from a previous run sat at an
 * expected path today and passed an existence-plus-non-empty check, so a
 * timed-out job read as a completed one. `isFreshThisSession` is the machine
 * that catches that, and its contract is that UNKNOWN (no session marker, or
 * an unstattable file) is FALSE — never "probably fine".
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  appendTelemetry, readJsonSafe, appendJsonl, readJsonl, isDisabled, failOpen,
  acquireCounterLock, releaseCounterLock, headSha, touchSessionStart,
  isFreshThisSession, telemetryPath, counterLockPath, disabledDir, LOCK_STALE_MS,
} from './gate-common.mjs';

let total = 0;
let passed = 0;
const madeDirs = [];

/** Point the module at a brand-new temp root and return it. */
function freshRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-gate-'));
  madeDirs.push(dir);
  process.env.SWAN_GATE_ROOT = dir;
  return dir;
}

function lastTelemetryLine() {
  const lines = readFileSync(telemetryPath(), 'utf8').trim().split(/\r?\n/);
  return JSON.parse(lines[lines.length - 1]);
}

function check(name, fn) {
  total += 1;
  test(name, async (t) => {
    await fn(t);
    passed += 1;
  });
}

check('appendTelemetry writes one line with the contracted key order', () => {
  freshRoot();
  assert.equal(appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', reason: 'r', latency_ms: 7 }), true);
  const raw = readFileSync(telemetryPath(), 'utf8');
  assert.equal(raw.split('\n').filter(Boolean).length, 1, 'exactly one line per call');
  assert.deepEqual(Object.keys(JSON.parse(raw)), ['ts', 'gate', 'boundary', 'result', 'reason', 'latency_ms']);
  assert.match(JSON.parse(raw).ts, /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/);
});

check('appendTelemetry coerces missing and non-numeric fields to defaults', () => {
  freshRoot();
  appendTelemetry({});
  const a = lastTelemetryLine();
  assert.equal(a.gate, 'unknown');
  assert.equal(a.reason, '');
  assert.equal(a.latency_ms, 0);
  appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', reason: 'x', latency_ms: 'not-a-number' });
  assert.equal(lastTelemetryLine().latency_ms, 0, 'non-numeric latency must not emit NaN');
});

check('appendTelemetry returns false instead of throwing when the qa dir cannot exist', () => {
  const dir = freshRoot();
  // Put a FILE where .ai-workflow must be a directory: mkdir then throws ENOTDIR.
  writeFileSync(join(dir, '.ai-workflow'), 'blocker', 'utf8');
  assert.doesNotThrow(() => appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow' }));
  assert.equal(appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow' }), false);
});

check('readJsonSafe parses valid JSON and falls back on malformed or missing', () => {
  const dir = freshRoot();
  const good = join(dir, 'good.json');
  const bad = join(dir, 'bad.json');
  writeFileSync(good, '{"a":1}', 'utf8');
  writeFileSync(bad, '{not json', 'utf8');
  assert.deepEqual(readJsonSafe(good), { a: 1 });
  assert.equal(readJsonSafe(bad, 'FB'), 'FB', 'malformed must not throw');
  assert.equal(readJsonSafe(join(dir, 'nope.json'), 'FB'), 'FB', 'missing must not throw');
});

check('appendJsonl creates parent dirs and appends exactly one line per call', () => {
  const dir = freshRoot();
  const p = join(dir, 'nested', 'deep', 'ledger.jsonl');
  assert.equal(appendJsonl(p, { round: 1 }), true);
  assert.equal(appendJsonl(p, { round: 2 }), true);
  const lines = readFileSync(p, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[1]), { round: 2 });
});

check('readJsonl skips malformed lines rather than blinding the caller', () => {
  const dir = freshRoot();
  const p = join(dir, 'l.jsonl');
  writeFileSync(p, '{"a":1}\nNOT JSON\n\n{"a":3}\n', 'utf8');
  assert.deepEqual(readJsonl(p), [{ a: 1 }, { a: 3 }]);
  assert.deepEqual(readJsonl(join(dir, 'missing.jsonl')), [], 'missing file is an empty ledger');
});

check('isDisabled reflects the presence of the disable marker file', () => {
  freshRoot();
  assert.equal(isDisabled('some-gate'), false);
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'some-gate'), '', 'utf8');
  assert.equal(isDisabled('some-gate'), true);
  assert.equal(isDisabled('other-gate'), false, 'disable is per-component, not global');
});

check('failOpen returns the allow sentinel AND leaves a fail-open telemetry line', () => {
  freshRoot();
  assert.equal(failOpen('review-round-gate', 'turn', 'disabled', 12), null);
  const line = lastTelemetryLine();
  assert.equal(line.result, 'fail-open');
  assert.equal(line.gate, 'review-round-gate');
  assert.equal(line.reason, 'disabled');
  assert.equal(line.latency_ms, 12);
});

check('acquireCounterLock succeeds when the lock is free', () => {
  freshRoot();
  const r = acquireCounterLock();
  assert.equal(r.ok, true);
  assert.equal(r.stolen, false);
  assert.equal(r.reason, 'acquired');
});

check('acquireCounterLock reports contention while held, and classifies other errors distinctly', () => {
  freshRoot();
  assert.equal(acquireCounterLock().ok, true);
  const second = acquireCounterLock();
  assert.equal(second.ok, false, 'a held lock must not be handed out twice');
  assert.equal(second.reason, 'contention');
  assert.equal(second.stolen, false);

  // A non-EEXIST open failure must NOT be laundered into "contention": contention
  // is retryable (the loser re-reads and retries with N+1), a real I/O fault is
  // not. Mutation vantage 2026-08-12 found this branch unguarded — a mutant that
  // dropped the error-code check survived the whole suite.
  //
  // NOTE on the probe: an existing DIRECTORY at the lock path yields EEXIST (not
  // EISDIR), which is the contention branch by design — that premise was wrong on
  // the first attempt and turned the suite red. A NUL byte in the path is the
  // portable way to force a non-EEXIST failure past the mkdir of the parent.
  const dir = freshRoot();
  const badLock = join(dir, 'lock\u0000name');
  const broken = acquireCounterLock({ lockPath: badLock });
  assert.equal(broken.ok, false);
  assert.notEqual(broken.reason, 'contention', 'a real open failure must keep its own error code');
  assert.equal(broken.stolen, false);

  // And an unbuildable parent directory is its own distinct, reachable branch.
  const dir2 = freshRoot();
  writeFileSync(join(dir2, '.ai-workflow'), 'blocker', 'utf8');
  assert.equal(acquireCounterLock().reason, 'mkdir-failed');
});

check('acquireCounterLock reclaims a lock older than the stale TTL and flags it stolen', () => {
  freshRoot();
  assert.equal(acquireCounterLock().ok, true);
  const past = new Date(Date.now() - (LOCK_STALE_MS + 60_000));
  utimesSync(counterLockPath(), past, past);
  const r = acquireCounterLock();
  assert.equal(r.ok, true, 'an abandoned lock must not deadlock the system forever');
  assert.equal(r.stolen, true, 'a steal must be visible to callers so it can be logged');
  assert.equal(r.reason, 'stale-reclaimed');
});

check('releaseCounterLock frees the lock so the next acquire succeeds', () => {
  freshRoot();
  assert.equal(acquireCounterLock().ok, true);
  assert.equal(releaseCounterLock(), true);
  assert.equal(releaseCounterLock(), false, 'releasing an absent lock reports false, not a throw');
  const again = acquireCounterLock();
  assert.equal(again.ok, true);
  assert.equal(again.stolen, false);
});

check('headSha returns a hex sha inside a git repo, or null outside one', () => {
  const dir = freshRoot();
  const outside = headSha(dir);
  assert.ok(outside === null || /^[0-9a-f]{40,64}$/.test(outside), `unexpected sha: ${outside}`);
  const inRepo = headSha(process.cwd());
  assert.ok(inRepo === null || /^[0-9a-f]{40,64}$/.test(inRepo), `unexpected sha: ${inRepo}`);
});

check('isFreshThisSession treats only post-session-start files as fresh; unknown is never fresh', () => {
  const dir = freshRoot();
  const target = join(dir, 'artifact.md');
  writeFileSync(target, 'x', 'utf8');
  assert.equal(isFreshThisSession(target), false, 'no session marker means UNKNOWN, which is not fresh');

  const sessionStart = new Date(Date.now() - 60_000);
  assert.equal(touchSessionStart(sessionStart), true);
  assert.equal(isFreshThisSession(target), true, 'written after session start');

  const beforeSession = new Date(Date.now() - 120_000);
  utimesSync(target, beforeSession, beforeSession);
  assert.equal(isFreshThisSession(target), false, 'a leftover from a previous run is NOT fresh');
  assert.equal(isFreshThisSession(join(dir, 'absent.md')), false, 'a missing file is not fresh');

  // Boundary is INCLUSIVE by contract: an artifact stamped at exactly session
  // start is fresh. Stated explicitly because a mutation vantage showed `>=` vs
  // `>` was unobserved by the suite — the boundary was accidental, not chosen.
  utimesSync(target, sessionStart, sessionStart);
  assert.equal(isFreshThisSession(target), true, 'mtime == session start counts as fresh');
});

process.on('exit', () => {
  for (const d of madeDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ }
  }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
```
