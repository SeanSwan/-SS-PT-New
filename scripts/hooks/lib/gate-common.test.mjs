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
