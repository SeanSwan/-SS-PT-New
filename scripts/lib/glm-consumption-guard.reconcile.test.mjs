/**
 * Regression tests for reconcileGlmLock (INF-5 / GLM-seat deadlock).
 *
 * No network, no provider call: these tests only create and read local temp files.
 * Run: node --test scripts/lib/glm-consumption-guard.reconcile.test.mjs
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { reconcileGlmLock } = await import('./glm-consumption-guard.mjs');

const scratch = () => {
  const dir = mkdtempSync(join(tmpdir(), 'glm-reconcile-'));
  return { dir, lockPath: join(dir, 'glm-call.lock'), ledgerPath: join(dir, 'glm-usage.jsonl') };
};
const deadPid = () => {
  // A pid that is syntactically valid but cannot be running: spawn nothing, just pick a
  // very high pid and confirm the guard's own liveness probe disagrees with it.
  const candidate = 999_999;
  let live = true;
  try { process.kill(candidate, 0); } catch { live = false; }
  assert.equal(live, false, 'expected pid 999999 to be free for this test host');
  return candidate;
};

test('reconciles a dead owner and records the owner identity in the ledger', () => {
  const { dir, lockPath, ledgerPath } = scratch();
  try {
    const owner = { pid: deadPid(), at: '2026-09-13T14:55:58.051Z', token: 'tok-abc', state: 'unresolved' };
    writeFileSync(lockPath, JSON.stringify(owner));

    const result = reconcileGlmLock({ path: lockPath, ledgerPath, reason: 'owner died mid-call', by: 'test' });

    assert.equal(result.reconciled, true);
    assert.equal(result.pid, owner.pid);
    assert.equal(existsSync(lockPath), false, 'lock must be removed');

    const records = readFileSync(ledgerPath, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    assert.equal(records.length, 1);
    assert.equal(records[0].event, 'reconciled');
    assert.equal(records[0].pid, owner.pid, 'ledger must retain the owner pid (appendGlmLedger would drop it)');
    assert.equal(records[0].token, owner.token, 'ledger must retain the owner token');
    assert.equal(records[0].ownerAlive, false);
    assert.equal(records[0].reason, 'owner died mid-call');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('refuses to clear a lock whose owner is alive', () => {
  const { dir, lockPath, ledgerPath } = scratch();
  try {
    // This process is definitionally alive.
    writeFileSync(lockPath, JSON.stringify({ pid: process.pid, at: new Date().toISOString(), token: 'tok-live' }));
    assert.throws(
      () => reconcileGlmLock({ path: lockPath, ledgerPath, reason: 'should not happen' }),
      /Refusing to reconcile a live lock/,
    );
    assert.equal(existsSync(lockPath), true, 'a live lock must survive');
    assert.equal(existsSync(ledgerPath), false, 'no ledger event may be written for a refused reconcile');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('does nothing when no lock is present', () => {
  const { dir, lockPath, ledgerPath } = scratch();
  try {
    const result = reconcileGlmLock({ path: lockPath, ledgerPath, reason: 'idempotent check' });
    assert.equal(result.reconciled, false);
    assert.equal(existsSync(ledgerPath), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('requires a reason so a clear is always auditable', () => {
  const { dir, lockPath, ledgerPath } = scratch();
  try {
    assert.throws(() => reconcileGlmLock({ path: lockPath, ledgerPath }), /requires a reason/);
    assert.throws(() => reconcileGlmLock({ path: lockPath, ledgerPath, reason: '   ' }), /requires a reason/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('refuses when the lock ownership changes between read and clear', () => {
  const { dir, lockPath, ledgerPath } = scratch();
  try {
    writeFileSync(lockPath, JSON.stringify({ pid: deadPid(), at: '2026-09-13T14:55:58.051Z', token: 'tok-original' }));
    // Simulate the exact incident: a new holder acquires the lock between the first read
    // (liveness check) and the confirming read (clear). ESM imports are immutable, so the
    // race is injected through the module's own readLock seam rather than by monkey-patching.
    let reads = 0;
    const racyReader = (target) => {
      reads += 1;
      if (reads === 2) return JSON.stringify({ pid: 4242, at: new Date().toISOString(), token: 'tok-intruder' });
      return readFileSync(target, 'utf8');
    };
    assert.throws(
      () => reconcileGlmLock({ path: lockPath, ledgerPath, reason: 'racing clear', readLock: racyReader }),
      /ownership changed/,
    );
    assert.equal(existsSync(lockPath), true, 'the replacement lock must survive');
    assert.equal(existsSync(ledgerPath), false, 'a refused reconcile must not write a ledger event');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
