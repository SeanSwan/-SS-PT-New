---
decision: The 38 inert migration files are a symptom. Production schema is created and altered from MODEL definitions at every boot, not by migrations. That is the finding that needs a decision.
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-25
rule_basis: Rule 34 (no blind cleanup), Rule 58 (schema-drift detection), Rule 51 (confidence tags), Rule 75 (trailhead truth)
---

# 38 migration files that never run — and why nobody noticed for 15 months

Sean asked for a decision on the dead `.mjs` migrations. Investigating them turned up something
larger, and the larger thing changes what the decision should be about.

**Nothing has been moved, renamed or deleted.** This is classification only (Rule 34).

## Part 1 — the inventory, corrected

I have been quoting **36**. That number was wrong: it came from `343 − 307`, which swept in
directories and `.sql` files. Measured properly:

| Category | Count | Executes? |
|---|---|---|
| `.cjs` / `.js` at top level | **307** | **yes** |
| `.mjs` at top level | **32** | no |
| `.sql` at top level | **2** | no |
| `.cjs` / `.js` inside `helpers/` and `social/` | **4** | no |
| subdirectories | 2 | — |
| **Total inert** | **38** | |

`[VERIFIED]` the runner reads top-level `.cjs`/`.js` only:
`safe-migrate.mjs:145-149` = `fs.readdirSync(migrationsDir).filter(f => f.endsWith('.cjs') || f.endsWith('.js'))`.
`readdirSync` does not recurse, which is why the 4 files in `social/` are as dead as the 32
`.mjs` ones. The other runners route through `sequelize-cli`, whose umzug pattern is
`/^(?!.*\.d\.ts$).*\.(cjs|js|cts|ts)$/` — also top-level, also excluding `.mjs`.

Dates run **2025-05-03 → 2026-05-20**. These have been inert for over a year.

## Part 2 — the finding that actually matters

The obvious worry is "then some schema was never applied." That is almost certainly **not** what
happened, and the reason is the important part.

`[VERIFIED]` — production creates and alters schema **from model definitions on every boot**:

1. `backend/core/startup.mjs:45-51` — `shouldRunProductionDatabaseSync()` returns **true when
   `NODE_ENV === 'production'`** (unless `STARTUP_DATABASE_REPAIR=false`).
2. → `syncDatabaseSafely()` (`backend/utils/productionDatabaseSync.mjs:313`).
3. → `createTablesInOrder(models)` → `model.sync({ force: false })`
   (`backend/utils/tableCreationOrder.mjs:160`) — **creates any missing table from its model.**
4. → `sequelize.sync({ alter: { drop: false } })`
   (`backend/utils/productionDatabaseSync.mjs:270-272`) — **alters existing tables toward the
   models.** It will not drop, but it will add.

Note the correction I had to make getting here: `sync({ alter: true })` at
`startup.mjs:202` is explicitly gated `!isProduction` with the comment "NEVER in production".
That gate is real. Production takes the path above instead — a *different* sync, not no sync.

**So the tables those 38 files would have created almost certainly exist, built by their models
at boot.** That is why 15 months of dead migrations produced no visible symptom.

### What this means

**Migrations are not the primary schema authority in this system. Model definitions are.**

Three things follow, and they are worth more than the file cleanup:

- **It explains `safe-migrate.mjs`'s most alarming behaviour.** It marks a genuinely failed
  migration as applied and continues, commenting *"sync will handle schema"*. That comment is
  **correct**. It is not sloppiness; it is a deliberate design that follows from model-driven
  sync being the real authority.
- **It puts a ceiling on the SWA-200 gate.** Four hostile rounds hardened a check on the
  migration path. Migrations still run and can still fail destructively, so the gate is worth
  having — but there is a **second, entirely ungated path** that reshapes production schema on
  every single deploy, and no gate anywhere watches it.
- **`alter` toward model definitions is itself a live risk.** `drop: false` prevents dropped
  columns, but a model whose type or constraint drifts from production will have production
  altered to match it, silently, at boot, with no review and no backup. That is the same blast
  radius SWA-200 was opened about — arriving by a different door.

## Part 3 — the decision Sean actually has

**On the 38 files** — three options, none urgent:

1. **Archive them** (`backend/migrations/_inert/` or out of the tree). Honest: they are not
   migrations, and leaving them there invites the next person to add a 39th. Cheapest.
2. **Convert to `.cjs`** so they actually run. **Do not do this without checking each one
   against the live schema first** — re-running a year-old `createTable` against a table the
   models already built will fail or conflict. This is the expensive option and needs a
   per-file review.
3. **Leave them, documented.** The new gate already blocks a 39th from being added, so the
   problem is contained even if the existing files stay.

**Recommendation: option 1**, plus keeping the gate. It removes the trap without touching
anything that runs. It needs Sean's explicit approval before any file moves (Rule 34).

**On the larger finding** — this is the one worth a real decision:

- Should model-driven `sync` remain the production schema authority, with migrations as a
  secondary path? If yes, `safe-migrate`'s failure-swallowing is coherent and should be
  documented as intentional rather than looking like a bug.
- Or should migrations become authoritative and `syncDatabaseSafely` be reduced to a no-op
  guard? That is a significant change with real blast radius and belongs to Sean, not a
  drive-by.

Either way, the honest statement today is that **SWA-200's gate protects one of two paths into
production schema, and the other one is unwatched.**

## What was NOT done

- No file moved, renamed, or deleted.
- No change to `startup.mjs`, `productionDatabaseSync.mjs`, or `tableCreationOrder.mjs`.
- `[UNVERIFIED]` — that the tables actually exist in the production database. That requires
  querying production, which was not done. The inference is strong (models exist; boot-time
  creation is verified in code) but it is an inference. One read-only
  `information_schema.tables` query against production would settle it, and is the right next
  step if anyone wants certainty before archiving.
