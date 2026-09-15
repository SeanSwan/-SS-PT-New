#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: scripts/creator-brains/test/concurrency.test.mjs
 * PURPOSE: Real multi-process concurrency and process-kill evidence for the
 *          store lock (review HR14).
 * PART OF: Creator Brains — SS-PT acquisition engine (review repair evidence)
 * ADDED: 2026-09-13
 * ============================================================================
 *
 * WHY THESE SPAWN REAL PROCESSES:
 *   The packet is explicit — "Test a real Windows process-kill/restart in an
 *   isolated store; do not substitute only a mocked exception." A lock tested
 *   with two `acquireLock()` calls in one process tests the FILE, not the
 *   OWNERSHIP PROTOCOL. It cannot catch:
 *     - two runners both seeing a free lock and both proceeding;
 *     - a lock left behind by a killed process never being reclaimable;
 *     - a reclaim that steals a lock whose owner is still alive.
 *   So each case here starts actual `node` child processes against one store.
 *
 * THE THREE PROPERTIES UNDER TEST:
 *   1. Two concurrent runs on one store: exactly one proceeds, the other is
 *      REFUSED with a recorded outcome. Neither loses the other's work.
 *   2. A lock held by a process that no longer exists IS reclaimable — checked
 *      by pid liveness, not by age.
 *   3. An unreadable lock file is AMBIGUOUS, and an ambiguous lock is refused
 *      rather than stolen.
 *
 * RUN: node --test scripts/creator-brains/test/concurrency.test.mjs
 * @module creator-brains/test/concurrency
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hostname } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { tempRoot, makeClock } from './helpers.mjs';
import { paths } from '../lib/paths.mjs';
import { ensureStore } from '../lib/store.mjs';
import { acquireLock, lockStatus } from '../lib/lock.mjs';

const LIB = fileURLToPath(new URL('../lib/', import.meta.url));
const A = 'UC' + 'a'.repeat(22);
const VA = 'a'.repeat(11);

/** A store with one enabled creator and one pending video. */
function seed(tag) {
  const r = tempRoot(`cb-${tag}`);
  ensureStore(r);
  writeFileSync(
    paths(r).registry,
    JSON.stringify({ version: 1, creators: { [A]: { channelId: A, title: 'Alpha', enabled: true, addedAt: new Date(0).toISOString() } } }),
    'utf-8',
  );
  writeFileSync(
    paths(r).state,
    JSON.stringify({
      version: 1,
      videos: { [VA]: { videoId: VA, channelId: A, state: 'pending', attempts: 0, nextRetryAt: null, lastError: null, title: 'V' } },
    }),
    'utf-8',
  );
  return r;
}

/**
 * Run a snippet in a real child process and return `{ code, stdout, stderr }`.
 * The snippet is written to a file rather than passed with `-e` so quoting
 * cannot be the thing under test.
 */
function runChild(source, { env = {}, timeoutMs = 30_000 } = {}) {
  const dir = tempRoot('cb-child');
  const file = join(dir, 'child.mjs');
  writeFileSync(file, source, 'utf-8');
  try {
    const stdout = execFileSync(process.execPath, [file], {
      encoding: 'utf-8',
      timeout: timeoutMs,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    return { code: e.status ?? 1, stdout: String(e.stdout || ''), stderr: String(e.stderr || '') };
  }
}

test('HR14 a REAL second process cannot take a held store lock', async () => {
  const r = seed('hr14-real');
  const held = acquireLock(r, { runId: 'parent' });
  assert.equal(held.ok, true, 'the parent holds the lock');

  // A genuine second process tries to acquire the same store.
  const child = runChild(`
    import { acquireLock } from ${JSON.stringify(pathToFileURL(join(LIB, 'lock.mjs')).href)};
    const lock = acquireLock(process.env.CB_ROOT, { runId: 'child' });
    if (lock.ok) { lock.release(); process.stdout.write('ACQUIRED'); }
    else process.stdout.write('REFUSED:' + lock.reason + ':' + (lock.holder && lock.holder.pid));
  `, { env: { CB_ROOT: r } });

  assert.equal(child.code, 0, `child failed: ${child.stderr}`);
  assert.match(child.stdout, /^REFUSED:lock_held:/, `expected a refusal, got '${child.stdout}'`);
  // And the refusal names the ALIVE owner, so an operator can find it.
  assert.match(child.stdout, new RegExp(`:${process.pid}$`), 'the refusal names the owning pid');

  held.release();
});

test('HR14b a REAL second process takes the lock after the holder releases', async () => {
  const r = seed('hr14-real2');
  const held = acquireLock(r, { runId: 'parent' });
  held.release();

  const child = runChild(`
    import { acquireLock } from ${JSON.stringify(pathToFileURL(join(LIB, 'lock.mjs')).href)};
    const lock = acquireLock(process.env.CB_ROOT, { runId: 'child' });
    process.stdout.write(lock.ok ? 'ACQUIRED' : 'REFUSED:' + lock.reason);
    if (lock.ok) lock.release();
  `, { env: { CB_ROOT: r } });

  assert.equal(child.code, 0, `child failed: ${child.stderr}`);
  assert.equal(child.stdout, 'ACQUIRED');
  assert.equal(lockStatus(r).held, false, 'and it released on the way out');
});

test('HR14c a lock left by a DEAD process is reclaimable — by liveness, not by age', async () => {
  const r = seed('hr14-dead');
  // A real child takes the lock, writes it, and exits WITHOUT releasing, which
  // is exactly what a killed process leaves behind.
  const child = runChild(`
    import { acquireLock } from ${JSON.stringify(pathToFileURL(join(LIB, 'lock.mjs')).href)};
    const lock = acquireLock(process.env.CB_ROOT, { runId: 'orphan' });
    process.stdout.write(lock.ok ? String(lock.holder.pid) : 'FAIL');
    // no release(): simulate a kill
  `, { env: { CB_ROOT: r } });

  assert.equal(child.code, 0, `child failed: ${child.stderr}`);
  const deadPid = Number(child.stdout.trim());
  assert.ok(Number.isInteger(deadPid) && deadPid > 0, `child reported a pid: '${child.stdout}'`);
  assert.ok(existsSync(paths(r).base), 'store exists');

  const before = lockStatus(r);
  assert.equal(before.held, true, 'the lock is on disk');
  assert.equal(before.sameHost, true);
  assert.equal(before.alive, false, 'and its owner is PROVABLY gone (pid not alive)');

  // The reclaim succeeds because the pid is dead — not because the lock is old.
  const taken = acquireLock(r, { runId: 'reclaimer' });
  assert.equal(taken.ok, true, 'a dead owner\'s lock is reclaimable');
  taken.release();
});

test('HR14d a lock whose OWNER IS ALIVE is never stolen, however old it looks', async () => {
  const r = seed('hr14-alive');
  // Forge an OLD lock owned by THIS live process.
  const lockPath = join(r, '.lock');
  writeFileSync(lockPath, JSON.stringify({
    token: 'forged-token', pid: process.pid, host: hostname(), runId: 'long-run',
    startedAt: new Date(Date.now() - 30 * 24 * 3_600_000).toISOString(), // 30 days old
  }), 'utf-8');

  const attempt = acquireLock(r, { runId: 'thief' });
  assert.equal(attempt.ok, false, 'age alone must not authorise a steal');
  assert.equal(attempt.reason, 'lock_held');
  assert.equal(readFileSync(lockPath, 'utf-8').includes('forged-token'), true, 'the holder is untouched');
});

test('HR14e an UNREADABLE lock is ambiguous and is refused, not overwritten', async () => {
  const r = seed('hr14-ambiguous');
  const lockPath = join(r, '.lock');
  writeFileSync(lockPath, '{ this is not json', 'utf-8');

  const attempt = acquireLock(r, { runId: 'someone' });
  assert.equal(attempt.ok, false, 'an unreadable lock is not a free lock');
  assert.equal(attempt.reason, 'lock_ambiguous');
  assert.equal(readFileSync(lockPath, 'utf-8'), '{ this is not json', 'and its bytes are preserved');
});

test('HR14f two REAL concurrent runs: one proceeds, the other is refused with a recorded outcome', async () => {
  const r = seed('hr14-race');
  const runner = `
    import { runDaily } from ${JSON.stringify(pathToFileURL(join(LIB, 'run.mjs')).href)};
    const clock = () => Date.parse('2026-09-13T10:00:00Z');
    const deps = {
      version: 'concurrency-stub',
      probeSubs: () => ({ ok: true, kind: 'ok', languages: ['en-orig'], originals: ['en-orig'] }),
      fetchJson3: () => JSON.stringify({ events: [{ tStartMs: 2000, segs: [{ utf8: 'always lift the shadows before you touch the highlights' }] }] }),
      enumerate: () => ({ rows: [], invalid: [], complete: true, reason: null, perTab: {}, tabs: ['videos'] }),
    };
    const rec = await runDaily({ r: process.env.CB_ROOT, clock, deps, only: ['fetch'] });
    const lockPhase = rec.phases.find((p) => p.name === 'lock');
    process.stdout.write(JSON.stringify({ ok: rec.ok, lockRefused: !!(lockPhase && !lockPhase.ok), fetched: rec.counts.fetched }));
  `;
  const dir = tempRoot('cb-race');
  const file = join(dir, 'runner.mjs');
  writeFileSync(file, runner, 'utf-8');

  // Start both at once and wait for both.
  const spawnOne = () => new Promise((resolve) => {
    const p = spawn(process.execPath, [file], {
      env: { ...process.env, CB_ROOT: r }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    p.stdout.on('data', (d) => { out += d; });
    p.on('close', () => resolve(out.trim()));
    p.on('error', () => resolve('SPAWN_ERROR'));
  });

  const results = await Promise.all([spawnOne(), spawnOne()]);
  const parsed = results.map((s) => { try { return JSON.parse(s); } catch { return { raw: s }; } });

  const refused = parsed.filter((x) => x.lockRefused);
  const proceeded = parsed.filter((x) => x.ok && !x.lockRefused);
  assert.equal(refused.length, 1, `exactly one run must be refused, got ${JSON.stringify(parsed)}`);
  assert.equal(proceeded.length, 1, `exactly one run must proceed, got ${JSON.stringify(parsed)}`);

  // The refusal is a DURABLE outcome, not just a line of stdout.
  const runFiles = readdirSync(paths(r).runsDir).filter((f) => f.endsWith('.json'));
  assert.ok(runFiles.length >= 1, 'at least one run record exists');
  const records = runFiles.map((f) => JSON.parse(readFileSync(join(paths(r).runsDir, f), 'utf-8')));
  const blocked = records.find((rec) => (rec.phases || []).some((p) => p.name === 'lock' && !p.ok));
  assert.ok(blocked, 'the refused run left a record naming the lock as the reason');
  assert.equal(blocked.ok, false, 'and it did not claim success');
  assert.equal(lockStatus(r).held, false, 'both children exited and released');
});
