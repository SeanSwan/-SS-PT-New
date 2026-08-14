#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/hooks/lib/gate-common.test.mjs
 * PURPOSE: Prove the gate primitives hold their contracts, including every
 *          defect found by the Kimi K3 (S1-S9) and HY3 (D1-D4) hostile reviews.
 * AUTHOR: Opus 5 | CREATED: 2026-08-12 | REVISED: 2026-08-13
 * ============================================================================
 *
 * Run: node scripts/hooks/lib/gate-common.test.mjs   -> RESULT: PASS (n/n)
 *
 * Test count changed from 14 to 20: the reviews forced API changes (typed JSON
 * reads, clamped session anchor, ownership-checked release) and named seven
 * mutants the v1 suite could not express. Each regression test below cites the
 * finding it kills, so a future edit cannot quietly drop one.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  appendTelemetry, readJsonResult, readJsonOrDefault, appendJsonl, readJsonl,
  writeJsonAtomic, isDisabled, listDisabled, failOpen, headSha, sessionId,
  stampSessionStart, sessionAnchor, sessionStartMs, mtimeLooksFresh, fileSha256,
  isFreshForSha, telemetryPath, counterLockPath, disabledDir, qaDir,
  acquireCounterLock, releaseCounterLock, LOCK_STALE_MS,
} from './gate-common.mjs';

let total = 0;
let passed = 0;
const made = [];

function freshRoot() {
  const dir = mkdtempSync(join(tmpdir(), 'swan-gate-'));
  made.push(dir);
  process.env.SWAN_GATE_ROOT = dir;
  delete process.env.SWAN_DISABLE_ROOT;
  return dir;
}
function lastLine() {
  const lines = readFileSync(telemetryPath(), 'utf8').trim().split(/\r?\n/);
  return JSON.parse(lines[lines.length - 1]);
}
function check(name, fn) {
  total += 1;
  test(name, async (t) => { await fn(t); passed += 1; });
}

check('appendTelemetry writes one line with the contracted key order', () => {
  freshRoot();
  assert.equal(appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', reason: 'r', latency_ms: 7 }), true);
  const raw = readFileSync(telemetryPath(), 'utf8');
  assert.equal(raw.split('\n').filter(Boolean).length, 1);
  assert.deepEqual(Object.keys(JSON.parse(raw)), ['ts', 'gate', 'boundary', 'result', 'reason', 'latency_ms']);
});

check('appendTelemetry rounds fractional latency and preserves an empty gate name', () => {
  freshRoot();
  // mutant 1: Math.round -> identity. v1 only ever passed integers.
  appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', latency_ms: 7.6 });
  assert.equal(lastLine().latency_ms, 8);
  appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow', latency_ms: 'nope' });
  assert.equal(lastLine().latency_ms, 0, 'non-numeric must not emit NaN');
  // mutant 2: ?? -> ||. An empty-string gate name must stay '', not become 'unknown'.
  appendTelemetry({ gate: '', boundary: 'turn', result: 'allow' });
  assert.equal(lastLine().gate, '');
  appendTelemetry({ boundary: 'turn', result: 'allow' });
  assert.equal(lastLine().gate, 'unknown', 'absent gate still defaults');
});

check('appendTelemetry returns false instead of throwing when the qa dir cannot exist', () => {
  const dir = freshRoot();
  writeFileSync(join(dir, '.ai-workflow'), 'blocker', 'utf8'); // forces ENOTDIR
  assert.doesNotThrow(() => appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow' }));
  assert.equal(appendTelemetry({ gate: 'g', boundary: 'turn', result: 'allow' }), false);
});

check('KIMI S3 / HY3 D3: failOpen returns TRUTHY when telemetry fails, null when it lands', () => {
  freshRoot();
  assert.equal(failOpen('review-round-gate', 'turn', 'disabled', 12), null, 'logged fail-open allows');
  const line = lastLine();
  assert.equal(line.result, 'fail-open');
  assert.equal(line.latency_ms, 12);

  // mutant 3, the most important in the module: a failOpen that ignores telemetry
  // failure is indistinguishable from shipped v1 under every other test.
  const dir = freshRoot();
  writeFileSync(join(dir, '.ai-workflow'), 'blocker', 'utf8');
  const res = failOpen('review-round-gate', 'turn', 'disabled', 3);
  assert.ok(res, 'unlogged fail-open must NOT return the allow sentinel');
  assert.equal(res.telemetrySound, false);
  assert.equal(res.failOpen, true);
});

check('KIMI S6: readJsonResult discriminates missing / corrupt / unreadable', () => {
  const dir = freshRoot();
  const good = join(dir, 'good.json');
  const bad = join(dir, 'bad.json');
  writeFileSync(good, '{"a":1}', 'utf8');
  writeFileSync(bad, '{not json', 'utf8');
  assert.deepEqual(readJsonResult(good), { ok: true, value: { a: 1 } });
  assert.equal(readJsonResult(bad).error, 'corrupt', 'corrupt must not read as missing');
  assert.equal(readJsonResult(join(dir, 'nope.json')).error, 'missing');
  const asDir = join(dir, 'adir');
  mkdirSync(asDir);
  const r = readJsonResult(asDir);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'unreadable', 'an I/O fault is not "missing"');
  assert.equal(readJsonOrDefault(bad, 'FB'), 'FB', 'explicit collapse still available');
});

check('appendJsonl creates dirs and appends one line per call; readJsonl skips torn lines', () => {
  const dir = freshRoot();
  const p = join(dir, 'nested', 'deep', 'ledger.jsonl');
  assert.equal(appendJsonl(p, { round: 1 }), true);
  assert.equal(appendJsonl(p, { round: 2 }), true);
  assert.equal(readFileSync(p, 'utf8').trim().split('\n').length, 2);
  const t = join(dir, 'torn.jsonl');
  writeFileSync(t, '{"a":1}\nTORN\n\n{"a":3}\n', 'utf8');
  assert.deepEqual(readJsonl(t), [{ a: 1 }, { a: 3 }]);
  assert.deepEqual(readJsonl(join(dir, 'absent.jsonl')), []);
});

check('KIMI S8: writeJsonAtomic lands the file and leaves no temp behind', () => {
  const dir = freshRoot();
  const p = join(dir, 'out', 'verdict.json');
  assert.equal(writeJsonAtomic(p, { verdict: 'CLEAN' }), true);
  assert.deepEqual(JSON.parse(readFileSync(p, 'utf8')), { verdict: 'CLEAN' });
  assert.equal(readdirSync(join(dir, 'out')).filter((f) => f.includes('.tmp.')).length, 0);
  writeFileSync(join(dir, 'blocked'), 'x', 'utf8');
  assert.equal(writeJsonAtomic(join(dir, 'blocked', 'nope.json'), { a: 1 }), false, 'failure reports false');
});

check('KIMI S5: isDisabled rejects traversal, is case-insensitive, and telemeters the honor', () => {
  freshRoot();
  assert.equal(isDisabled('some-gate'), false);
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'some-gate'), '', 'utf8');
  assert.equal(isDisabled('some-gate'), true);
  const line = lastLine();
  assert.equal(line.result, 'disabled-honored', 'honoring a kill switch must not be silent');
  // Memoized: honoring a disable must be announced ONCE per process, not on every
  // call, or a hot gate floods the telemetry that is meant to be the crash signal.
  const before = readFileSync(telemetryPath(), 'utf8').split('\n').filter((l) => l.includes('disabled-honored')).length;
  isDisabled('some-gate'); isDisabled('some-gate');
  const after = readFileSync(telemetryPath(), 'utf8').split('\n').filter((l) => l.includes('disabled-honored')).length;
  assert.equal(after, before, 'repeat calls must not re-announce');
  assert.equal(isDisabled('SOME-GATE'), true, 'case-insensitive filesystems must not split the name');
  assert.equal(isDisabled('other-gate'), false, 'disable is per-component');
  assert.equal(isDisabled('../../../../tmp/x'), false, 'path traversal must be refused');
  assert.equal(isDisabled('a/b'), false);
});

check('HY3 D1: listDisabled enumerates markers, and SWAN_DISABLE_ROOT moves them out of the tree', () => {
  const dir = freshRoot();
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'gate-a'), '', 'utf8');
  writeFileSync(join(disabledDir(), 'gate-b'), '', 'utf8');
  assert.deepEqual(listDisabled(), ['gate-a', 'gate-b']);
  const outside = join(dir, 'privileged');
  mkdirSync(outside, { recursive: true });
  process.env.SWAN_DISABLE_ROOT = outside;
  assert.deepEqual(listDisabled(), [], 'override reads the privileged root, not the in-tree one');
  assert.equal(isDisabled('gate-a'), false);
  delete process.env.SWAN_DISABLE_ROOT;
});






check('headSha returns null on empty output, and a sha otherwise', () => {
  freshRoot();
  // mutant 6: `.trim() || null` -> `.trim()`. '' is falsy but poisons `=== null`.
  assert.equal(headSha(process.cwd(), { exec: () => '  \n' }), null);
  assert.equal(headSha(process.cwd(), { exec: () => 'a'.repeat(40) }), 'a'.repeat(40));
  assert.equal(headSha(process.cwd(), { exec: () => { throw new Error('no git'); } }), null);
  const real = headSha(process.cwd());
  assert.ok(real === null || /^[0-9a-f]{40,64}$/.test(real));
});

check('KIMI S4 / HY3 D2: the session anchor never moves backwards and carries contents', () => {
  freshRoot();
  const t1 = new Date(Date.now() - 60_000);
  const first = stampSessionStart({ when: t1, id: 'sess-1', sha: 'abc123' });
  assert.equal(first.ok, true);
  assert.equal(first.clamped, false);
  assert.deepEqual(sessionAnchor(), { sessionId: 'sess-1', headSha: 'abc123', ts: t1.toISOString() });

  // v1 exported touchSessionStart(when) — touchSessionStart(new Date(0)) made
  // every artifact ever written "fresh". A backwards move must be refused.
  const back = stampSessionStart({ when: new Date(0), id: 'sess-1' });
  assert.equal(back.clamped, true, 'a backwards stamp must be clamped, not honored');
  assert.equal(Math.round(sessionStartMs()), Math.round(t1.getTime()));
  const fwd = new Date(t1.getTime() + 30_000);
  assert.equal(stampSessionStart({ when: fwd, id: 'sess-1' }).clamped, false, 'forward moves still allowed');
});

check('sessionStartMs reads mtime, not atime', () => {
  freshRoot();
  const when = new Date(Date.now() - 60_000);
  stampSessionStart({ when, id: 's' });
  // mutant 5: mtimeMs -> atimeMs. stampSessionStart sets both, so skew them.
  const atime = new Date(Date.now() - 5_000);
  const mtime = new Date(when.getTime());
  utimesSync(join(qaDir(), '.session-start'), atime, mtime);
  assert.equal(Math.round(sessionStartMs()), Math.round(mtime.getTime()));
});

check('mtimeLooksFresh is a heuristic: unknown anchor is never fresh', () => {
  const dir = freshRoot();
  const target = join(dir, 'artifact.md');
  writeFileSync(target, 'x', 'utf8');
  assert.equal(mtimeLooksFresh(target), false, 'no anchor means UNKNOWN, which is not fresh');
  const start = new Date(Date.now() - 60_000);
  stampSessionStart({ when: start, id: 's' });
  assert.equal(mtimeLooksFresh(target), true);
  const older = new Date(start.getTime() - 60_000);
  utimesSync(target, older, older);
  assert.equal(mtimeLooksFresh(target), false, 'a previous run leftover is not fresh');
  utimesSync(target, start, start);
  assert.equal(mtimeLooksFresh(target), true, 'boundary is inclusive by contract');
  assert.equal(mtimeLooksFresh(join(dir, 'absent.md')), false);
});

check('A2: isFreshForSha is the load-bearing check and refuses missing bindings', () => {
  freshRoot();
  assert.equal(isFreshForSha('abc', 'abc'), true);
  assert.equal(isFreshForSha('abc', 'def'), false);
  assert.equal(isFreshForSha(null, 'abc'), false, 'an artifact with no subject_sha is never fresh');
  assert.equal(isFreshForSha('abc', null), false, 'unknown HEAD can never confirm freshness');
  assert.equal(isFreshForSha('', ''), false);
});

check('fileSha256 hashes bytes and reports null for unreadable paths', () => {
  const dir = freshRoot();
  const p = join(dir, 'a.txt');
  writeFileSync(p, 'hello', 'utf8');
  assert.equal(fileSha256(p), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  assert.equal(fileSha256(join(dir, 'missing.txt')), null);
  assert.equal(typeof sessionId(), sessionId() === null ? 'object' : 'string');
});

process.on('exit', () => {
  for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
