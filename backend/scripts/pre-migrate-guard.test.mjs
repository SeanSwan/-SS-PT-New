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
import { decideOutcome, advisoryLockKey, attestation, findAttestation, ATTEST_PREFIX } from './pre-migrate-guard.mjs';

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


// ── attestation: the positive signal (Kimi K3, panel 2026-08-23) ──────────────────
// "a safety device that cannot distinguish 'I am working' from 'I am dead'." A fail-open
// guard whose silence is ambiguous converts "we have no protection" — known and actionable —
// into "we believe we have protection", which is neither. These pin the fix.

t('an attestation is emitted even when the guard STANDS DOWN', () => {
  const a = findAttestation(attestation({ mode: 'warn-only', locked: false, backup: 'skipped', outcome: 'stood-down' }));
  assert.ok(a, 'a stand-down that emits nothing is exactly the ambiguity being fixed');
  assert.equal(a.outcome, 'stood-down');
});

t('the line is machine-findable inside noisy deploy output', () => {
  const log = ['npm install', 'added 900 packages',
    attestation({ mode: 'enforce', locked: true, backup: 'ok', outcome: 'proceeding' }),
    'Build succeeded'].join('\n');
  const a = findAttestation(log);
  assert.equal(a.outcome, 'proceeding');
  assert.equal(a.locked, true);
});

t('ABSENCE is detectable — the whole point', () => {
  assert.equal(findAttestation('npm install\nBuild succeeded\n'), null);
});

t('carries mode, lock, backup and outcome — enough to judge without the rest of the log', () => {
  const a = findAttestation(attestation({ mode: 'warn-only', locked: true, backup: 'failed', pending: 3, outcome: 'proceeding' }));
  assert.deepEqual(
    { mode: a.mode, locked: a.locked, backup: a.backup, pending: a.pending, outcome: a.outcome },
    { mode: 'warn-only', locked: true, backup: 'failed', pending: 3, outcome: 'proceeding' });
});

t('a backup that FAILED is visible in the attestation, not buried', () => {
  const a = findAttestation(attestation({ mode: 'warn-only', locked: true, backup: 'failed', outcome: 'proceeding' }));
  assert.equal(a.backup, 'failed', 'proceeding without a backup must stay legible after the fact');
});

t('is versioned, so a later format change is detectable rather than silent', () => {
  assert.equal(findAttestation(attestation({ mode: 'x', outcome: 'y' })).v, 1);
});

t('a malformed attestation line does not hide a good one', () => {
  const log = `${ATTEST_PREFIX} {not json}\n${attestation({ mode: 'enforce', outcome: 'proceeding' })}`;
  assert.equal(findAttestation(log).outcome, 'proceeding');
});


// ── lock verification: a lock the database does not report holding is not a lock ──
// GLM 5.3: "if DATABASE_URL transits a pooler in transaction mode, session advisory locks
// are unsupported and the lock is void from second zero... a control that logs 'held' while
// guaranteed-vacuous is worse than no control." The guard now MEASURES this per deploy
// instead of leaving it an open question in a document.

t('lock acquired but NOT visible in pg_locks → halts in enforce', () => {
  const r = decideOutcome({ ...S, lockVerified: false, enforce: true });
  assert.equal(r.ok, false);
  assert.match(r.reason, /pooler|not visible/i);
});

t('lock acquired but NOT visible → proceeds in warn mode, and says concurrency is unprotected', () => {
  const r = decideOutcome({ ...S, lockVerified: false });
  assert.equal(r.ok, true, 'warn mode must not brick the deploy');
  assert.match(r.reason, /unprotected|UNVERIFIED/i, 'a silent proceed here is the whole bug');
});

t('an unverified lock outranks a failed backup — the worse condition is reported', () => {
  const r = decideOutcome({ ...S, lockVerified: false, backupOk: false, enforce: true });
  assert.match(r.reason, /pooler|not visible/i);
});

t('lockVerified undefined (older callers / check-only) does not spuriously halt', () => {
  assert.equal(decideOutcome({ ...S, lockVerified: undefined, enforce: true }).ok, true);
});

t('a verified lock plus a good backup reports both', () => {
  assert.match(decideOutcome({ ...S, lockVerified: true }).reason, /verified/i);
});

t('the attestation carries lockVerified so a pooler is visible after the fact', () => {
  const a = findAttestation(attestation({ mode: 'warn-only', locked: true, lockVerified: false, outcome: 'proceeding' }));
  assert.equal(a.lockVerified, false, 'a vacuous lock must be legible in the deploy log');
});

t('lockVerified omitted serialises as null, not as false — unknown is not failure', () => {
  assert.equal(findAttestation(attestation({ mode: 'x', outcome: 'y' })).lockVerified, null);
});

console.log(`\npre-migrate-guard: ${pass} passed, ${fail.length} failed`);
if (fail.length) process.exit(1);
