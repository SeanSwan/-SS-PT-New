# A "non-fatal" catch turned a column typo into silent total data loss

**Surface:** backend — client onboarding, AI workout logging, video analytics
**Issue:** SWA-71 (continuous hostile-review cleanup loop)
**Agent:** terminal Claude Opus 5 · provenance sub-Fable → working memo only, no learning packet
**Commits on main:** `08d0a3e3b`, `05d56251e`

## What happened

A static validator compared every raw-SQL `INSERT`/`UPDATE` column list in `backend/` against a
live `information_schema` snapshot (234 tables / 3,948 columns). 46 raw findings → 20 fixed.

The headline defect: `POST /api/clients/onboard` returned **201 with a client id while persisting
nothing at all**.

1. `assignToSelf` defaults to true, and the Coach client service sends it explicitly — so nearly
   every onboard took the path.
2. A `to_regclass` guard confirmed the table existed, so the INSERT ran.
3. The INSERT used snake_case columns against a quoted-camelCase table → Postgres `42703`.
4. A `catch` logged `Non-fatal` and execution continued.
5. But the transaction was now **aborted (25P02)**. Postgres silently turns a later `COMMIT`
   into `ROLLBACK`.
6. The handler returned success. The `User.create` staged in step 1 was discarded.

## The three lessons worth keeping

**1. In Postgres, a caught error inside a transaction is not a contained error.** One failed
statement poisons the whole transaction, and `commit()` then resolves *without error* while
discarding everything. So `try/catch` + `logger.warn('Non-fatal')` is not a degradation
strategy — it is a silent-data-loss generator. "Non-fatal" is only true with a
`SAVEPOINT` / `ROLLBACK TO SAVEPOINT` around the optional work. Both halves were proven
read-only before relying on either.

**2. When a table name or column is wrong, the *value literals* are usually wrong too.** Fixing
the column names on the trainer-note INSERT swapped `42703` for `22P02`: `'onboarding'` is not a
member of that column's enum. A column-only fix would have compiled, run, still failed, and still
looked like a completed fix. Proving a fix means proving the whole statement, not the part that
was reported.

**3. A sweep that grows as you verify it is measuring the harness, not the system.** Four harness
bugs were caught this session before any of their output was believed:
`information_schema.tables` returns rows as **arrays** (so a naive `r.table_name` collapses a
234-table set to 1); a precondition matching the substring `UPDATE` also matched English prose in
log messages ("Failed to update order…") and inflated one bucket 1 → 17; alias-qualified
`RETURNING j.clip_id` was read as a bare column; and a probe using a relative import silently read
the **stale** working tree instead of the target worktree — nearly reporting an already-fixed model
as broken. Every layer of real evidence must *narrow* the claim. When it widens, fix the harness.
The durable guard: make the harness **self-abort** when its own numbers disagree with a
known-good reference.

## Also worth knowing

- Three migrations are recorded APPLIED in `SequelizeMeta` while their `createTable` target does
  not exist. Mechanism is **[UNKNOWN]** — the swallowed-catch hypothesis was disproved (the
  migration rethrows). Consequence: they never re-run, so the tables never appear. One of them
  backs a live, frontend-called endpoint that therefore 500s.
- A completed fix for three production-broken models is **stranded on an unmerged branch** while
  `main` still carries the broken mappings. Committed ≠ shipped.
- Value/type SQLSTATEs (`42804`, `22P02`) prove identifiers resolved, because Postgres resolves
  names before type-checking values. Useful for classifying a probe's own synthetic-value noise
  apart from real defects.

No PII, no secrets, no credentials — numeric ids and role names only.
