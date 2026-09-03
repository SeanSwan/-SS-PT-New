---
decision: Hostile review packet for the SWA-200 migration-safety build — a pre-migrate guard, a CI shadow-migration gate, and a bypass ledger. Seeks a verdict, the first silent failure, and what to do next.
status: open
supersedes: none
---

# Hostile review packet — SWA-200 migration rails

**Context.** You reviewed this system earlier today and returned 5 REVISE / 1 conditional APPROVE. Three of your findings were reproduced and fixed. Ox Alpha's answer to *"what is nobody proposing"* — **"everyone is guarding the push; nobody is guarding the migration"** — became SWA-200. This is that build. Review it as adversarially as the last one.

**What I want, in order:**
1. **Verdict** — APPROVE / REVISE / REJECT, and your single strongest objection stated plainly.
2. **What fails silently first.** Not "what might break" — what breaks in a way nobody notices until production is already wrong.
3. **What next, ranked** — including one thing nobody is currently proposing.

Naming one concrete defect beats a paragraph of praise. If you think this is theatre, say so and argue it.

---

## The gap this closes

`render.yaml` builds `main` with `npm run migrate:production` → `safe-migrate.mjs`. Every push to main runs migrations against the **production database, unsupervised**.

`safe-migrate.mjs` is good at **recovering**: quarantine ledger, retry caps, a data-critical lane. Measured, it contains **zero** occurrences of `backup`, `advisory lock`, `pg_dump`, `rollback`, `smoke`, `verify`, `snapshot`. It handles failure well and prevents nothing.

Relevant constraint from the repo's own doctrine: **`DATABASE_URL` points at production from local dev.** There is no safe local database. This is why nothing below could be tested against a real migration.

---

## What was built

### 1. `backend/scripts/pre-migrate-guard.mjs`

In order: **advisory lock** (`pg_try_advisory_lock`) → **pending-set report** → **backup** (delegates to `backup-db.mjs`, the proven-restorable one).

**It runs the migration as its child.** An earlier draft took the lock, closed the connection, exited 0, and let the shell run the migration next — releasing the session-scoped lock before the thing it protected had started. It would have detected two deploys colliding within the same half-second and nothing else, while logging as though a lock were held.

**Warn-only by default.** This runs inside the Render build; a bug takes down every deploy including the one that would fix it. `SWAN_MIGRATE_GUARD=enforce` makes backup failure fatal. **Lock contention halts in both modes.**

`sequelize` is imported lazily, after the `DATABASE_URL` check — a top-level import made the guard unloadable wherever sequelize is absent, so it exited 1 before its own fail-open could run.

### 2. `.github/workflows/migration-shadow-check.yml`

Runs the **pushed SHA's** migrations against an ephemeral `postgres:16` service container, **twice** (Render can rebuild the same SHA, so idempotence matters), then imports the backend entry point to prove it loads. No production credential; the container dies with the job.

This is the only piece that cannot be bypassed by `--no-verify` or by a checkout that never configured `core.hooksPath`.

### 3. `scripts/hooks/lib/bypass-ledger.mjs`

Append-only audit line on every escape-hatch use. Wired into `SWAN_RULE45_OK=1`. Records gate, escape, and a **redacted** 120-char fragment. Gitignored, machine-local. Authorises nothing, stops nobody — makes bypass rate measurable.

### Tests

41 new. Mutation-verified: inverting lock-contention fails 2; disabling redaction fails 9. 24/24 across the full hook suite.

### Not committed

Routing `render.yaml` through the guard changes what runs against production. Left as a one-line change for the human, with blast radius and rollback documented.

---

## Known limits, stated so you can attack past them

- **The shadow database is EMPTY.** A migration that passes there can still fail against real rows — `NOT NULL` on a populated column, a unique index over existing duplicates.
- **Nothing here was tested against a real migration.** There is no safe local Postgres; the decision logic is pure and unit-tested, the integration path is not.
- The guard is **fail-open**. By design, but it means a broken guard is indistinguishable from a working one on a healthy deploy.

---

## Attack these specifically

1. **The lock is `pg_try_advisory_lock` on one connection held by the guard process.** What happens on Render if the build is cancelled, the container is OOM-killed, or the connection drops mid-migration but the migration keeps running? Is "session-scoped so it cannot leak" actually true in the failure modes that matter?
2. **Warn-only means a backup failure still deploys.** Is that the right default, or does it make the backup decorative — a thing that reports failure into a log nobody reads while the risky operation proceeds anyway?
3. **The backup is taken, never restored.** Nothing verifies it can be restored at migrate time, and nothing triggers a restore on failure. Is an unverified, never-exercised backup worth its runtime?
4. **The CI gate tests an empty database.** Name the migration class that passes there and destroys production. Is this floor worth having, or does a passing green check make people *less* careful?
5. **The bypass ledger is local and gitignored.** An agent that bypasses can delete it. Is a record that the bypasser controls worth anything?
6. **What is nobody proposing?** Same question as last time — it produced this work. Look past the obvious next step.
