# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/SWA200-MIGRATION-RAILS-REVIEW-PACKET-2026-08-23.md
**Tokens (Ollama):** 1425 in / 1679 out | **Wall:** 15.7s | **done_reason:** stop

---
**Verdict:** REVISE

**Single Strongest Objection:**
You have built a **false sense of security** by decoupling the *safety mechanism* (backup/lock) from the *verification of safety* (restore/test). Specifically, the "warn-only" default combined with an unverified backup creates a state where a broken backup pipeline is indistinguishable from a working one, while the system proceeds to mutate production data. You are logging a "backup taken" event that may be garbage, and because the default is non-fatal, the garbage is silently accepted. This is not a guard; it is a witness to the crime.

---

### What Fails Silently First

**The "Green Check" Illusion of the Shadow CI Gate.**

The most dangerous silent failure is not in the guard (which at least logs a warning), but in the `.github/workflows/migration-shadow-check.yml`.

Here is the silent failure sequence:
1.  A developer pushes a migration that adds a `NOT NULL` column without a default, or creates a unique index on a column with existing duplicates.
2.  The CI job spins up an **empty** `postgres:16` container.
3.  The migration runs against this empty schema. It succeeds. The unique index is created on zero rows. The `NOT NULL` constraint is added to zero rows.
4.  The CI job exits `0`. The green checkmark appears in the PR.
5.  The developer merges.
6.  Render builds. `pre-migrate-guard.mjs` runs. It takes the advisory lock. It runs `backup-db.mjs`.
7.  **The backup fails silently or partially** (e.g., disk full, permission error, or `pg_dump` hangs and is killed by a timeout that isn't fatal in `warn` mode). The guard logs a warning: `WARN: Backup failed, proceeding in warn mode.`
8.  The migration runs against **production**.
9.  The migration **fails** halfway through (e.g., `NOT NULL` violation on row 4,000).
10.  The database is now in a **broken, inconsistent state**. The schema is partially updated. The data is corrupted.
11.  **Nobody notices until a user reports a 500 error or data loss.** By then, the "backup" you took in step 7 is either missing or corrupt, and you have no verified snapshot to restore to.

**Why it’s silent:** The CI gate gave you a green light. The guard gave you a "backup taken" log line. Both signals said "safe." The reality was "unverified and unprotected." The failure only manifests when the migration hits real data, which is *after* the irreversible change has started.

---

### What Next, Ranked

1.  **Make the Backup Verification Non-Negotiable (Immediate):**
    *   Modify `pre-migrate-guard.mjs` to **always** attempt a `pg_restore` (or `psql` restore) of the backup into a temporary schema or a separate test database *before* running the migration.
    *   If the restore fails, **halt immediately**, even in `warn` mode. A backup that cannot be restored is not a backup.
    *   *Why:* This turns the backup from a "hope" into a "verified asset." It catches `pg_dump` failures, disk issues, and permission errors *before* you touch production data.

2.  **Implement a "Data-Shape" Check in CI (High Priority):**
    *   You cannot test against real data in CI, but you can test against a **synthetic data set**.
    *   Add a step to the CI workflow that seeds the ephemeral Postgres with a **minimal, deterministic dataset** that covers edge cases:
        *   One row with `NULL` in every nullable column.
        *   One row with max-length strings.
        *   One row with a unique constraint violation (to test index creation).
        *   One row that triggers any `CHECK` constraints.
    *   Run the migration against this seeded DB.
    *   *Why:* This catches the "empty DB passes, real DB fails" class of bugs. It’s not perfect, but it’s vastly better than an empty DB.

3.  **Enforce `SWAN_MIGRATE_GUARD=enforce` in Production (Medium Priority):**
    *   The `warn` mode is a trap. It encourages developers to ignore warnings.
    *   Change the default in `render.yaml` to `enforce`.
    *   If a backup fails, the deploy **must** fail.
    *   *Why:* A failed deploy is better than a corrupted database. A failed deploy is loud and immediate. A corrupted database is silent and delayed.

4.  **One Thing Nobody Is Proposing: **A "Migration Rollback" Script Generator****
    *   Currently, if a migration fails, you are stuck. You have to manually write a rollback script.
    *   Propose a tool that **automatically generates a rollback script** for each migration.
    *   For example, if a migration adds a column, the rollback script drops it. If it adds an index, the rollback drops it.
    *   Store this rollback script alongside the migration.
    *   *Why:* When a migration fails, you can immediately run the rollback script to restore the schema to its pre-migration state. This reduces the time to recovery from hours to minutes.

---

### Attack on the Six Questions

1.  **The lock is `pg_try_advisory_lock` on one connection held by the guard process.**
    *   **Attack:** If the guard process is OOM-killed, the connection is dropped, and the lock is released. But the migration *might* still be running if it was spawned as a child process that outlives the parent. In Render, if the build is cancelled, the container is killed. The child process (the migration) is also killed. So the lock is released, and the migration is stopped. **However**, if the migration is running in a separate process (e.g., via `child_process.spawn` with `detached: true`), it could survive the parent’s death. In that case, the lock is released, but the migration continues. This is a race condition. **Verdict:** The lock is not safe if the migration is detached. Ensure the migration is a child process that is killed when the parent dies.

2.  **Warn-only means a backup failure still deploys.**
    *   **Attack:** Yes, this is the right default for *development*, but **wrong for production**. In production, a failed backup should be fatal. The `warn` mode is a trap. It encourages developers to ignore warnings. **Verdict:** Change the default to `enforce` in production.

3.  **The backup is taken, never restored.**
    *   **Attack:** An unverified backup is worthless. If the backup is corrupt, you have no safety net. **Verdict:** Add a restore verification step.

4.  **The CI gate tests an empty database.**
    *   **Attack:** Yes, this is a major flaw. A migration that passes on an empty DB can fail on a real DB. **Verdict:** Seed the CI database with synthetic data.

5.  **The bypass ledger is local and gitignored.**
    *   **Attack:** Yes, this is a major flaw. If the bypasser is an agent, they can delete the ledger. **Verdict:** Store the ledger in a remote, append-only store (e.g., S3, or a database table).

6.  **What is nobody proposing?**
    *   **Attack:** A "Migration Rollback" Script Generator. See above.
