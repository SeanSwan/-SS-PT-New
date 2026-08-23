#!/usr/bin/env node
/**
 * pre-migrate-guard.mjs — the rails that were missing in front of migrate:production.
 *
 * WHY THIS EXISTS (SWA-200, panel 2026-08-23)
 * -------------------------------------------
 * Ox Alpha, answering "what is nobody proposing": **everyone is guarding the push; nobody is
 * guarding the migration.** A full day went into making pushes safe — Rules 42, 6, 45, 59, a
 * pre-push gate, a pre-commit gate. None of it protects the database once the push lands.
 *
 * `render.yaml:66` builds `main` with `npm run migrate:production`, which is
 * `safe-migrate.mjs`. That script is genuinely good at RECOVERING from a bad migration — it
 * carries a quarantine ledger, retry caps and a data-critical lane. Measured, it contains
 * zero occurrences of: backup, advisory lock, pg_dump, rollback, smoke, verify, snapshot.
 * It handles failure well and prevents nothing.
 *
 * So every push to main runs migrations against production with no backup taken first and
 * nothing stopping two deploys from migrating at once.
 *
 * WHAT THIS DOES, IN ORDER
 * ------------------------
 *   1. ADVISORY LOCK  — pg_try_advisory_lock. Concurrent deploys are the one case where
 *                       continuing is worse than stopping, so this HALTS even in warn mode.
 *   2. PENDING SET    — names the migrations that are about to run, before they run.
 *   3. BACKUP         — delegates to backup-db.mjs (SWA-122: proven restorable, not assumed).
 *
 * FAIL-OPEN BY DEFAULT — and that is deliberate
 * ---------------------------------------------
 * This runs inside the Render build. A bug here takes down every deploy, including the one
 * that would fix it. So in the default mode it WARNS and exits 0: a guard that can brick the
 * deploy pipeline gets ripped out within a day, and then there is no guard at all.
 *
 * Set `SWAN_MIGRATE_GUARD=enforce` to make backup failure fatal. The intended path is: ship
 * warning-only, read a few real deploys, then flip it. Earning enforcement beats asserting it.
 *
 * THE ONE EXCEPTION: the advisory lock halts in BOTH modes. Fail-open on concurrency would
 * mean two processes migrating the same database simultaneously — the exact thing the lock
 * exists to prevent, and unrecoverable in a way a missing backup is not.
 *
 * NOT A SUBSTITUTE FOR THE SERVER-SIDE GATE. The panel's stronger recommendation is a CI job
 * that boots the backend from the pushed SHA and migrates a shadow database BEFORE Render
 * deploys (see .github/workflows/migration-shadow-check.yml). This is the last line, not the
 * first. Kimi: "keep the local gate, stop pretending it's the control."
 *
 * Usage:
 *   node scripts/pre-migrate-guard.mjs            # warn-only (default)
 *   SWAN_MIGRATE_GUARD=enforce node scripts/...   # backup failure is fatal
 *   node scripts/pre-migrate-guard.mjs --check    # report only; never backs up, never locks
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ARGS = process.argv.slice(2);
const CHECK_ONLY = ARGS.includes('--check');
const ENFORCE = process.env.SWAN_MIGRATE_GUARD === 'enforce';
const MODE = CHECK_ONLY ? 'check-only' : ENFORCE ? 'enforce' : 'warn-only';

/**
 * Stable 64-bit key for the deploy-migration lock. Any constant works as long as every
 * deploy uses the SAME one; it is derived from a fixed string rather than a magic number so
 * a reader can see where it came from and nobody "tidies" it into a different value.
 */
export function advisoryLockKey(label = 'swanstudios:deploy-migrate') {
  let h = 0n;
  for (const ch of label) h = (h * 131n + BigInt(ch.codePointAt(0))) % (2n ** 63n - 1n);
  return h;
}

/** @returns {{ok:boolean, reason:string}} — pure, so the decision table is testable. */
export function decideOutcome({ lockAcquired, backupOk, enforce, checkOnly }) {
  if (checkOnly) return { ok: true, reason: 'check-only: nothing was locked, nothing was backed up' };
  if (!lockAcquired) {
    return {
      ok: false,
      reason: 'another migration holds the deploy lock. Two deploys migrating the same database '
        + 'at once is the one failure this guard will not wave through, in any mode.',
    };
  }
  if (!backupOk && enforce) {
    return { ok: false, reason: 'backup failed and SWAN_MIGRATE_GUARD=enforce' };
  }
  if (!backupOk) {
    return { ok: true, reason: 'backup FAILED — continuing because this guard is warn-only by default' };
  }
  return { ok: true, reason: 'lock held, backup verified' };
}


/**
 * ATTESTATION — the positive signal (Kimi K3, panel 2026-08-23).
 *
 * "The guard is fail-open with no positive signal, which means its failure state and its
 *  healthy state produce identical output on a successful deploy. You have built a safety
 *  device that cannot distinguish 'I am working' from 'I am dead.' It converts 'we have no
 *  protection' — a known, actionable fact — into 'we believe we have protection', an
 *  unknown, unactionable falsehood."
 *
 * That is correct, and it is the SAME defect GLM found in the hook layer earlier the same
 * day: nothing distinguished "gate passed" from "gate not installed." I fixed that one and
 * then rebuilt it here within hours, in a fail-open guard whose silence means nothing.
 *
 * So the guard now emits one machine-checkable line on every run, including the runs where
 * it stands down. Absence of this line in a deploy log is now itself a finding — which is
 * the whole point: you can check for PRESENCE, not merely for absence of errors.
 */
export const ATTEST_PREFIX = 'PRE-MIGRATE-ATTESTATION';

export function attestation(fields) {
  return `${ATTEST_PREFIX} ${JSON.stringify({
    v: 1,
    at: new Date(fields.now ?? Date.now()).toISOString(),
    mode: fields.mode,
    locked: Boolean(fields.locked),
    backup: fields.backup,
    pending: fields.pending ?? null,
    outcome: fields.outcome,
  })}`;
}

/** Parse a deploy log and answer the only question that matters: did the guard run at all? */
export function findAttestation(logText) {
  for (const line of String(logText ?? '').split('\n')) {
    const i = line.indexOf(ATTEST_PREFIX);
    if (i === -1) continue;
    try { return JSON.parse(line.slice(i + ATTEST_PREFIX.length).trim()); } catch { /* keep looking */ }
  }
  return null;
}

const log = (...m) => console.log('[pre-migrate]', ...m);
const warn = (...m) => console.error('[pre-migrate]', ...m);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    warn('DATABASE_URL is not set — nothing to guard. Exiting 0 so a non-DB build is unaffected.');
    console.log(attestation({ mode: 'no-db-url', locked: false, backup: 'skipped', outcome: 'stood-down' }));
    process.exit(0);
  }

  log(`mode=${MODE}`);

  // Imported lazily, AFTER the DATABASE_URL check. A top-level import made the guard
  // unloadable wherever sequelize is absent — so it exited 1 before its own fail-open
  // could run, which is the opposite of the design. A guard must be able to stand down.
  let Sequelize;
  try {
    ({ Sequelize } = await import('sequelize'));
  } catch (e) {
    warn(`sequelize unavailable (${e.code || e.message}) — cannot guard this migration.`);
    if (ENFORCE) {
      warn('SWAN_MIGRATE_GUARD=enforce — refusing to migrate unguarded.');
      console.log(attestation({ mode: MODE, locked: false, backup: 'skipped', outcome: 'halted-no-sequelize' }));
      process.exit(1);
    }
    console.log(attestation({ mode: MODE, locked: false, backup: 'skipped', outcome: 'stood-down-no-sequelize' }));
    log('continuing (warn-only). The migration is running UNGUARDED.');
    process.exit(0);
  }

  const sequelize = new Sequelize(url, {
    logging: false,
    dialectOptions: /localhost|127\.0\.0\.1/.test(url) ? {} : { ssl: { require: true, rejectUnauthorized: false } },
  });

  let lockAcquired = false;
  let backupOk = false;
  let pendingCount = null;

  try {
    await sequelize.authenticate();

    // 1. ADVISORY LOCK — session-scoped, so it releases automatically if this process dies.
    //    That matters: a lock that could leak would eventually block every deploy, and the
    //    fix for a stuck deploy is always "remove the guard".
    if (!CHECK_ONLY) {
      const key = advisoryLockKey().toString();
      const [rows] = await sequelize.query(`SELECT pg_try_advisory_lock(${key}) AS locked`);
      lockAcquired = Boolean(rows?.[0]?.locked);
      log(lockAcquired ? 'deploy lock acquired' : 'deploy lock BUSY — another migration is running');
    } else {
      lockAcquired = true;
    }

    // 2. PENDING SET — say what is about to happen while it can still be stopped.
    try {
      const [applied] = await sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name');
      const done = new Set(applied.map((r) => r.name));
      const dir = path.resolve(process.cwd(), 'migrations');
      if (existsSync(dir)) {
        const { readdirSync } = await import('node:fs');
        const pending = readdirSync(dir).filter((f) => /\.(c?js)$/.test(f) && !done.has(f)).sort();
        pendingCount = pending.length;
        pendingCount = pending.length;
        log(`applied=${done.size} pending=${pending.length}`);
        for (const p of pending.slice(0, 25)) log(`  PENDING  ${p}`);
        if (pending.length > 25) log(`  … and ${pending.length - 25} more`);
      }
    } catch (e) {
      warn(`could not read the pending set (${e.message}). Not fatal — this step is informational.`);
    }

    // 3. BACKUP — delegate. backup-db.mjs is the one that was proven restorable (SWA-122);
    //    backup-database.mjs looks like a backup tool and cannot connect to production.
    if (!CHECK_ONLY && lockAcquired) {
      const r = spawnSync('node', ['scripts/backup-db.mjs'], {
        cwd: process.cwd(), encoding: 'utf8', timeout: 15 * 60 * 1000,
      });
      backupOk = r.status === 0;
      log(backupOk ? 'backup completed' : `backup FAILED (exit ${r.status})`);
      if (!backupOk && r.stderr) warn(String(r.stderr).trim().split('\n').slice(-4).join('\n'));
    } else {
      backupOk = true;
    }
  } catch (e) {
    warn(`guard could not run: ${e.message}`);
    if (ENFORCE) {
      warn('SWAN_MIGRATE_GUARD=enforce — refusing to migrate behind a guard that did not run.');
      await sequelize.close().catch(() => {});
      process.exit(1);
    }
    await sequelize.close().catch(() => {});
    log('continuing (warn-only). The migration is running UNGUARDED.');
    process.exit(0);
  }

  const verdict = decideOutcome({ lockAcquired, backupOk, enforce: ENFORCE, checkOnly: CHECK_ONLY });
  log(verdict.reason);

  if (!verdict.ok) {
    await sequelize.close().catch(() => {});
    warn('HALTING before migrate:production.');
    process.exit(1);
  }

  /**
   * WHY THIS RUNS THE MIGRATION INSTEAD OF EXITING FIRST.
   *
   * A Postgres advisory lock is SESSION-scoped: it is released the moment this connection
   * closes. An earlier draft of this file acquired the lock, closed the connection, exited 0,
   * and let the shell run the migration next — which released the lock before the thing it
   * was protecting had started. It would have detected two deploys colliding in the same
   * half-second and nothing else, while reading in every log line as though a lock were held.
   *
   * That is the same shape as the flush-race fix earlier today: a signal that looks right,
   * passes review, and discriminates nothing. So the guard owns the migration. It holds the
   * session open for the whole run, and Postgres drops the lock on disconnect whether this
   * process exits cleanly or is killed — so a crashed deploy cannot wedge the next one.
   */
  const runIdx = ARGS.indexOf('--run');
  const runCmd = runIdx > -1 ? ARGS.slice(runIdx + 1) : null;
  if (!runCmd || runCmd.length === 0) {
    await sequelize.close().catch(() => {});
    log('no --run command given; lock released. Use --run <cmd...> to hold it across the migration.');
    process.exit(0);
  }

  console.log(attestation({ mode: MODE, locked: lockAcquired, backup: backupOk ? 'ok' : 'failed', pending: pendingCount, outcome: 'proceeding' }));
  log(`holding the deploy lock while running: ${runCmd.join(' ')}`);
  const child = spawnSync(runCmd[0], runCmd.slice(1), { cwd: process.cwd(), stdio: 'inherit' });
  await sequelize.close().catch(() => {});
  log(`migration finished with exit ${child.status}; deploy lock released.`);
  process.exit(child.status ?? 1);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch((e) => {
    warn(`unexpected: ${e.message}`);
    process.exit(ENFORCE ? 1 : 0);
  });
}
