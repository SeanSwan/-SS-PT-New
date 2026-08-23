/**
 * pre-migrate-guard.test.mjs — coverage for the migration guard's decision table.
 * Run: node backend/scripts/pre-migrate-guard.test.mjs
 *
 * The decision logic is pure and exported precisely so it can be tested without a database,
 * because the thing it guards cannot be exercised in a test: there is no safe local Postgres
 * in this repo, and `DATABASE_URL` points at production from local dev (CLAUDE.md).
 *
 * Two asymmetries carry the whole design and are pinned here:
 *   BACKUP failure  -> continue in warn mode. A guard that can brick every deploy, including
 *                      the deploy that would fix it, gets removed within a day.
 *   LOCK contention -> halt in BOTH modes. Two processes migrating one database concurrently
 *                      is not recoverable the way a missing backup is.
 * Get either backwards and the guard is either useless or dangerous.
 */
import assert from 'node:assert/strict';
import { decideOutcome, advisoryLockKey } from './pre-migrate-guard.mjs';

let pass = 0;
const fail = [];
const t = (name, fn) => {
  try { fn(); pass += 1; console.log(`  PASS  ${name}`); }
  catch (e) { fail.push(name); console.log(`  FAIL  ${name}\n        ${e.message}`); }
};

const S = { lockAcquired: true, backupOk: true, enforce: false, checkOnly: false };

t('everything healthy → proceed', () => {
  assert.equal(decideOutcome(S).ok, true);
});

t('LOCK BUSY halts in warn mode — the one thing warn mode will not wave through', () => {
  const r = decideOutcome({ ...S, lockAcquired: false });
  assert.equal(r.ok, false);
  assert.match(r.reason, /another migration holds/i);
});

t('LOCK BUSY halts in enforce mode too', () => {
  assert.equal(decideOutcome({ ...S, lockAcquired: false, enforce: true }).ok, false);
});

t('backup failure CONTINUES in warn mode, and says so plainly', () => {
  const r = decideOutcome({ ...S, backupOk: false });
  assert.equal(r.ok, true, 'warn mode must not brick the deploy pipeline');
  assert.match(r.reason, /backup FAILED/i, 'a silent continue would be worse than the gap');
});

t('backup failure HALTS in enforce mode', () => {
  const r = decideOutcome({ ...S, backupOk: false, enforce: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /enforce/i);
});

t('lock contention outranks backup state — the worse failure wins', () => {
  const r = decideOutcome({ lockAcquired: false, backupOk: true, enforce: false, checkOnly: false });
  assert.match(r.reason, /another migration holds/i, 'must report the lock, not a lesser condition');
});

t('--check never blocks, whatever else is wrong', () => {
  for (const bad of [
    { lockAcquired: false }, { backupOk: false }, { lockAcquired: false, backupOk: false, enforce: true },
  ]) {
    assert.equal(decideOutcome({ ...S, ...bad, checkOnly: true }).ok, true,
      `check-only must be read-only and non-blocking: ${JSON.stringify(bad)}`);
  }
});

t('every outcome explains itself — a bare halt gets the guard removed', () => {
  for (const c of [
    { ...S, lockAcquired: false },
    { ...S, backupOk: false },
    { ...S, backupOk: false, enforce: true },
  ]) {
    assert.ok(decideOutcome(c).reason.length > 30, 'reason too terse to act on');
  }
});

t('the advisory lock key is stable across calls and processes', () => {
  assert.equal(advisoryLockKey(), advisoryLockKey());
  assert.equal(typeof advisoryLockKey(), 'bigint');
});

t('the lock key fits in a signed 64-bit integer (Postgres rejects anything wider)', () => {
  const k = advisoryLockKey();
  assert.ok(k > 0n && k < 2n ** 63n, `key out of range for pg_try_advisory_lock: ${k}`);
});

t('a different label yields a different lock — two guards must not collide', () => {
  assert.notEqual(advisoryLockKey('a'), advisoryLockKey('b'));
});

console.log(`\npre-migrate-guard: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
