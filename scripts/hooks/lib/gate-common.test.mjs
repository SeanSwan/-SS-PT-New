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
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  appendTelemetry, readJsonResult, readJsonUnsafeCollapse, appendJsonl, readJsonl,
  auditJsonl, disableChannelStatus, setGateRoot, setDisableRoot, sanitizeGateEnv,
  gitSafeEnv, HOSTILE_GIT_ENV, MAX_TELEMETRY_LINE_BYTES, MAX_REASON_CHARS,
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
  setGateRoot(dir);
  setDisableRoot(null);
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
  assert.equal(readJsonUnsafeCollapse(bad, 'FB'), 'FB', 'explicit collapse still available');
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

check('HY3 D1: listDisabled enumerates markers, and setDisableRoot moves them out of the tree', () => {
  const dir = freshRoot();
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'gate-a'), '', 'utf8');
  writeFileSync(join(disabledDir(), 'gate-b'), '', 'utf8');
  assert.deepEqual(listDisabled(), ['gate-a', 'gate-b']);
  const outside = join(dir, 'privileged');
  mkdirSync(outside, { recursive: true });
  setDisableRoot(outside);
  assert.deepEqual(listDisabled(), [], 'override reads the privileged root, not the in-tree one');
  assert.equal(isDisabled('gate-a'), false);
  setDisableRoot(null);
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

/* ==========================================================================
 * GLM-5.3 hostile review (2026-08-16) — every test below kills a defect that
 * was CONFIRMED BY EXECUTED PROBE against the shipped code before it was fixed.
 * ========================================================================== */

check('GLM Q1 (CRITICAL): env vars can no longer relocate the trust root', () => {
  const real = freshRoot();
  const evil = mkdtempSync(join(tmpdir(), 'swan-evil-'));
  made.push(evil);
  process.env.SWAN_GATE_ROOT = evil;
  process.env.SWAN_DISABLE_ROOT = evil;
  try {
    // Before the fix, one env var moved telemetry, counter, lock, anchor and
    // disable markers into a directory the examinee had just built.
    for (const p of [telemetryPath(), counterLockPath(), disabledDir(), qaDir()]) {
      assert.ok(!String(p).startsWith(evil), 'env must not relocate ' + p);
      assert.ok(String(p).startsWith(real), 'in-process setter still governs');
    }
  } finally {
    delete process.env.SWAN_GATE_ROOT;
    delete process.env.SWAN_DISABLE_ROOT;
  }
});

check('GLM Q1: sanitizeGateEnv strips the hostile vars and reports the attempt', () => {
  freshRoot();
  const env = { SWAN_GATE_ROOT: '/tmp/x', GIT_DIR: '/tmp/y', PATH: '/usr/bin', KEEP: '1' };
  const found = sanitizeGateEnv(env);
  assert.ok(found.includes('SWAN_GATE_ROOT') && found.includes('GIT_DIR'), 'attempt is reported, not silently cleaned');
  assert.equal(env.SWAN_GATE_ROOT, undefined);
  assert.equal(env.GIT_DIR, undefined);
  assert.equal(env.KEEP, '1', 'unrelated vars survive');
});

check('GLM Q10a (CRITICAL): headSha strips GIT_DIR so HEAD cannot be forged', () => {
  freshRoot();
  const env = gitSafeEnv({ GIT_DIR: '/tmp/fake/.git', GIT_WORK_TREE: '/tmp/fake', PATH: '/usr/bin' });
  for (const k of HOSTILE_GIT_ENV) assert.equal(env[k], undefined, k + ' must not reach git');
  assert.equal(env.PATH, '/usr/bin', 'PATH is preserved (residual risk, documented)');
  let seen = null;
  const sha = headSha('/nowhere', { exec: (_b, _a, opts) => { seen = opts.env; return 'deadbeef\n'; } });
  assert.equal(sha, 'deadbeef');
  assert.equal(seen.GIT_DIR, undefined, 'the spawned git must not inherit GIT_DIR');
});

check('GLM Q5: an oversized reason is clamped so telemetry lines cannot tear', () => {
  freshRoot();
  appendTelemetry({ gate: 'g', boundary: 'push', result: 'fail-open', reason: 'E'.repeat(8192) });
  const raw = readFileSync(telemetryPath(), 'utf8').trim().split(/\r?\n/).pop();
  assert.ok(Buffer.byteLength(raw) <= MAX_TELEMETRY_LINE_BYTES, 'line was ' + Buffer.byteLength(raw) + ' bytes');
  const parsed = JSON.parse(raw);
  assert.ok(parsed.reason.length < 8192, 'reason is truncated');
  assert.ok(parsed.reason.includes('+'), 'truncation is visible, not silent');
  assert.equal(parsed.result, 'fail-open', 'the record itself survives intact');
});

check('GLM Q5: auditJsonl reports damage instead of silently skipping it', () => {
  const dir = freshRoot();
  const p = join(dir, 'x.jsonl');
  writeFileSync(p, '{"a":1}\nNOT JSON\n{"b":2}\n', 'utf8');
  const a = auditJsonl(p);
  assert.equal(a.lines.length, 2);
  assert.equal(a.malformed, 1, 'damage on the crash-signal channel must be countable');
  assert.equal(a.status, 'ok');
  assert.equal(auditJsonl(join(dir, 'nope.jsonl')).status, 'missing', 'missing != damaged');
  assert.equal(readJsonl(p).length, 2, 'the lenient reader still works');
});

check('GLM Q10d: a broken disable channel is reported broken, never "nothing disabled"', () => {
  freshRoot();
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), 'review-round-gate'), '', 'utf8');
  assert.equal(disableChannelStatus().status, 'ok');
  assert.equal(isDisabled('review-round-gate'), true);
  // Replace the directory with a FILE -> ENOTDIR. Before the fix this read as [].
  rmSync(disabledDir(), { recursive: true, force: true });
  writeFileSync(disabledDir(), 'not a directory', 'utf8');
  const st = disableChannelStatus();
  assert.equal(st.status, 'broken', 'an unreadable kill-switch channel is UNKNOWN, not empty');
  assert.equal(st.markers.length, 0);
  assert.equal(isDisabled('review-round-gate'), false, 'value unchanged; the push gate must consult status');
  freshRoot();
  assert.equal(disableChannelStatus().status, 'missing', 'absent != broken');
});

check('GLM Q7: marker matching is case-insensitive on BOTH sides', () => {
  freshRoot();
  mkdirSync(disabledDir(), { recursive: true });
  // Marker written with capitals: matched on Windows by luck, missed on Linux.
  writeFileSync(join(disabledDir(), 'Review-Round-Gate'), '', 'utf8');
  assert.equal(isDisabled('review-round-gate'), true, 'a capitalised marker must be honored everywhere');
  assert.equal(isDisabled('REVIEW-ROUND-GATE'), true);
  assert.equal(listDisabled()[0], 'Review-Round-Gate', 'listing preserves the on-disk name');
});

check('GLM Q7: a malformed disable name is telemetered, not silently dropped', () => {
  freshRoot();
  assert.equal(isDisabled('a/b'), false);
  const line = lastLine();
  assert.equal(line.result, 'name-rejected', 'the rejection must be visible on the channel');
});

check('GLM Q10c: the session anchor refuses future stamps and foreign sessions', () => {
  freshRoot();
  const first = stampSessionStart({ when: new Date(), id: 'real-session', sha: 'aaa' });
  assert.equal(first.ok, true);
  // Forward move: before the fix this redefined which artifacts looked fresh.
  const fwd = stampSessionStart({ when: new Date(Date.now() + 86400000), id: 'real-session' });
  assert.equal(fwd.clamped, true, 'a future stamp must be clamped to now');
  assert.ok(new Date(fwd.ts).getTime() <= Date.now() + 1000);
  assert.equal(sessionAnchor().headSha, 'aaa', 'an omitted sha must be inherited, never nulled');

  // Rotation: a NEW session must be able to stamp (found by regression — the
  // first version of this fix refused, freezing the anchor at session one), but
  // the prior record must survive the overwrite.
  const rot = stampSessionStart({ when: new Date(), id: 'session-two', sha: 'bbb' });
  assert.equal(rot.ok, true, 'a legitimate new session MUST be able to stamp');
  assert.equal(rot.rotated, true);
  const after = sessionAnchor();
  assert.equal(after.sessionId, 'session-two');
  assert.equal(after.previous.sessionId, 'real-session', 'the prior binding is preserved, not destroyed');
  assert.equal(after.previous.headSha, 'aaa');
  assert.equal(lastLine().result, 'session-rotated', 'the rotation is announced on the channel');
});

check('GLM Q9 mutant 3: the anchor CONTENTS are asserted, not just its mtime', () => {
  freshRoot();
  const past = new Date(Date.now() - 3600000);
  stampSessionStart({ when: new Date(), id: 's1', sha: 'sha1' });
  const back = stampSessionStart({ when: past, id: 's1', sha: 'sha2' });
  assert.equal(back.clamped, true);
  const body = sessionAnchor();
  assert.ok(new Date(body.ts).getTime() > past.getTime(), 'contents must not claim the clamped-away time');
  assert.ok(Math.abs(new Date(body.ts).getTime() - sessionStartMs()) < 1000, 'contents and mtime agree');
});

check('GLM Q9 mutant 4: listDisabled still filters dotfiles', () => {
  freshRoot();
  mkdirSync(disabledDir(), { recursive: true });
  writeFileSync(join(disabledDir(), '.DS_Store'), '', 'utf8');
  writeFileSync(join(disabledDir(), 'real-gate'), '', 'utf8');
  assert.equal(listDisabled().length, 1, 'an editor temp file must not disable the world');
  assert.equal(listDisabled()[0], 'real-gate');
});

check('GLM Q9 mutant 6: isFreshForSha refuses the String(null) coincidence', () => {
  freshRoot();
  assert.equal(isFreshForSha('null', null), false, 'the literal string null must not match a null HEAD');
  assert.equal(isFreshForSha(null, null), false);
  assert.equal(isFreshForSha(undefined, 'abc'), false);
});

check('GLM Q9 mutant 7: empty reason and boundary are preserved verbatim', () => {
  freshRoot();
  appendTelemetry({ gate: 'g', boundary: '', result: 'r', reason: '' });
  const line = lastLine();
  assert.equal(line.reason, '', 'an empty reason must not become unknown');
  assert.equal(line.boundary, '', 'an empty boundary must not become unknown');
});

check('GLM Q9 mutant 9: a failed atomic write leaves no temp orphan', () => {
  const dir = freshRoot();
  const target = join(dir, 'sub', 'c.json');
  const circular = {}; circular.self = circular;          // JSON.stringify throws
  assert.equal(writeJsonAtomic(target, circular), false);
  const leftovers = readdirSync(join(dir, 'sub')).filter((f) => f.includes('.tmp.'));
  assert.equal(leftovers.length, 0, 'the failure path must clean up its temp file');
});

check('GLM Q4: failOpen carries a block instruction a careless reader still sees', () => {
  const dir = freshRoot();
  mkdirSync(join(dir, '.ai-workflow'), { recursive: true });
  writeFileSync(qaDir(), 'not a directory', 'utf8');       // force telemetry failure
  const r = failOpen('g', 'push', 'telemetry is down');
  assert.ok(r, 'telemetry failure must not return a falsy safe-to-allow');
  assert.equal(r.block, true, 'the sentinel names the required action');
  assert.equal(r.failOpen, true, 'the legacy field is retained for existing readers');
  rmSync(dir, { recursive: true, force: true });
});

check('the re-export surface stays intact for consumers of gate-common', () => {
  // gate-common is the single import point every gate uses; the primitives now
  // live in gate-trust / gate-io / gate-lock. If a re-export is dropped during a
  // future split, consumers break at run time with no compiler to catch it.
  for (const [name, value] of Object.entries({
    acquireCounterLock, releaseCounterLock, LOCK_STALE_MS,
    setGateRoot, setDisableRoot, sanitizeGateEnv, gitSafeEnv, headSha, sessionId,
    readJsonResult, readJsonUnsafeCollapse, appendJsonl, readJsonl, auditJsonl,
    writeJsonAtomic, fileSha256, isFreshForSha, mtimeLooksFresh,
  })) {
    assert.ok(value !== undefined, name + ' must remain exported from gate-common');
  }
  assert.equal(typeof acquireCounterLock, 'function');
  assert.equal(typeof releaseCounterLock, 'function');
  assert.equal(LOCK_STALE_MS, 120000, 'the documented TTL is part of the contract');
});

check('self-review: a broken disable channel must not FLOOD the crash-signal channel', () => {
  // Found by attacking this slice's own fix. The broken-channel warning fired on
  // every isDisabled() call, so a gate checking in a loop would bury the
  // telemetry the warning exists to preserve.
  freshRoot();
  mkdirSync(join(qaDir()), { recursive: true });
  writeFileSync(disabledDir(), 'not a directory', 'utf8');
  for (let i = 0; i < 50; i += 1) isDisabled('review-round-gate');
  const lines = readFileSync(telemetryPath(), 'utf8')
    .split('\n').filter((l) => l.includes('disable-channel-broken'));
  assert.equal(lines.length, 1, 'the broken channel is announced ONCE, not 50 times');
});

check('self-review: two DIFFERENT malformed names are both reported', () => {
  freshRoot();
  isDisabled('a/b'); isDisabled('a/b');
  isDisabled('../x'); isDisabled('../x');
  const lines = readFileSync(telemetryPath(), 'utf8')
    .split('\n').filter((l) => l.includes('name-rejected'));
  assert.equal(lines.length, 2, 'dedupe is per offending name, not a global mute');
});

check('GLM Q5: a MID-SIZE reason is clamped too (mutation-found gap)', () => {
  freshRoot();
  // The 8 KB case is caught by the whole-line budget loop, so a mutant that
  // removed the per-field clamp survived. A 2000-char reason produces a line
  // well under 4096 bytes: nothing forces it down except MAX_REASON_CHARS.
  appendTelemetry({ gate: 'g', boundary: 'push', result: 'ok', reason: 'M'.repeat(2000) });
  const line = lastLine();
  assert.ok(line.reason.length <= MAX_REASON_CHARS + 32,
    `reason was ${line.reason.length} chars; the per-field clamp is not enforced`);
  assert.ok(line.reason.includes('+1488'), 'the truncation marker states how much was dropped');
});

process.on('exit', () => {
  for (const d of made) { try { rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } }
  const ok = passed === total;
  console.log(`RESULT: ${ok ? 'PASS' : 'FAIL'} (${passed}/${total})`);
  if (!ok && !process.exitCode) process.exitCode = 1;
});
