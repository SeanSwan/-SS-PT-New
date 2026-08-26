---
decision: Do not choose between model-sync and migrations yet. Neither option is safe to pick blind, and a two-week measurement makes the choice obvious. Ship the measurement.
status: open
supersedes: none
originating_model: claude-opus-5
created: 2026-08-26
rule_basis: Rule 58 (proactive schema-drift detection), Rule 51 (confidence tags), Rule 34 (no blind cleanup), Rule 15 (plan before building)
---

# Which system owns production schema? — the decision, and why it cannot be made today

Sean asked the right question. This document exists to make it answerable, because **right now
it is not** — and the reason it is not is itself the most important finding.

## The three mechanisms, precisely

`[VERIFIED]` in code. Production runs all three on every boot, gated only by
`shouldRunProductionDatabaseSync()` (`startup.mjs:45-51`), which returns **true whenever
`NODE_ENV === 'production'`**.

| # | Step | Driven by | What it can change |
|---|---|---|---|
| 1 | `createMissingTables()` → `createTablesInOrder(models)` → `model.sync({force:false})` (`tableCreationOrder.mjs:160`) | **models** | creates any table a model declares and the DB lacks |
| 2 | `addMissingColumns()` (`productionDatabaseSync.mjs:217-259`) | **a hardcoded list of 21** | adds those 21 specific columns if absent |
| 3 | `syncIndexesAndConstraints()` → `sequelize.sync({alter:{drop:false}})` (`:270-272`) | **models** | alters existing tables toward every model — adds columns, changes types, adds indexes and constraints. `drop:false` prevents removal, not modification. |

Correction to my earlier summary of this: step 2 is **not** model-driven. I said "model-driven"
of the whole layer; only steps 1 and 3 are. Step 3 is the broad one.

## The evidence that settles what is actually happening

`addMissingColumns` is a list of **21 hand-written column patches**, and each one carries a
comment naming the migration that was supposed to add it:

```
// gallery_photos.source_type — added in 20260311000000 migration
// gallery_photos thumbnail variant columns — added in 20260312000002 migration
// gallery_visitors geo columns — added in 20260311000100 migration
```

That is not theoretical drift. **Twenty-one times, a migration did not take, and somebody
hand-wrote a boot-time patch instead of asking why.** Combine that with the 38 inert migration
files and `safe-migrate.mjs` marking failed migrations as applied because *"sync will handle
schema"*, and the picture is consistent:

> The migration system has been unreliable for a long time, and a second self-healing layer grew
> up around it to compensate. Each layer makes the other's failures invisible.

That is why 15 months of dead migrations produced no symptom. It is also why nobody noticed.

## Why neither option can be chosen today

**Option A — keep model-sync authoritative, migrations secondary.**
Honest about what already works: production is self-healing and has been for a long time.
But schema changes reach production with **no review, no backup, no gate, and no record**.
`alter` can change a column's type because a model drifted. The 21-patch list will keep growing.
And the four rounds of SWA-200 work would be hardening the *less* important of the two paths.

**Option B — make migrations authoritative, reduce `syncDatabaseSafely` to a report-only guard.**
This is the architecturally correct end-state and I would not ship it tomorrow. The 21 patches
are proof that production schema and migration-derived schema **have already diverged**. Turning
off the self-healing layer does not remove that divergence — it reveals it, all at once, on the
next deploy. `[HYPOTHESIS]` that could take production down; nobody can currently say, which is
exactly the problem.

**The blocking gap: nobody knows what step 3 does on a given deploy, because it heals silently
and logs almost nothing.** `syncIndexesAndConstraints` logs only SQL containing `CONSTRAINT` or
`INDEX`, at `debug` level. Column additions and type changes made by `alter` are not surfaced at
all.

## Recommendation — measure before choosing

Do not pick A or B. Ship the measurement that makes the choice obvious, then pick.

**Step 1 — a dry-run mode for the sync layer (small, safe, reversible).**
Add `STARTUP_DATABASE_REPAIR=report`. In that mode the layer performs its comparisons and
**logs every change it WOULD make, then makes none**. Sequelize supports this directly:
`sync({ alter: true, logging: fn })` against a transaction that is rolled back, or simpler, diff
model attributes against `information_schema` and print the delta.

The kill switch already exists — `shouldRunProductionDatabaseSync()` honours
`STARTUP_DATABASE_REPAIR=false` (`startup.mjs:49-50`) — so the plumbing for a third mode is
already there. This is a genuinely small change.

**Step 2 — read the logs for two weeks of real deploys.**
- **Log is empty** → production schema already matches the models, the self-healing layer is
  doing nothing, and **Option B is safe.** Flip it to a guard, and the SWA-200 gate becomes the
  real control it was built to be.
- **Log is non-empty** → every line is a live drift that migrations should have owned. Write
  those migrations, land them through the (now-working) shadow gate, watch the log go quiet,
  *then* flip. That is Option B arrived at safely instead of gambled on.

**Step 3 — either way, delete `MISSING_COLUMNS` last, not first.** It is the visible half of the
compensation. Removing it before the drift is resolved would silently reintroduce 21 known-missing
columns.

## What this means for SWA-200

The four hostile rounds were not wasted — migrations do run, and a destructive one can still do
real damage, so the gate is worth having. But the ticket's own framing needs updating:

> *"Nobody is guarding the migration"* was true. It is now half-guarded.
> **Nobody is guarding the other path either, and that one runs on every single deploy.**

The gate should say so rather than imply coverage it does not have. It already does, in its
Summary step.

## Sequencing against the billing block

Step 1 above does **not** depend on GitHub Actions and can ship independently. But it changes
production boot behaviour, so it should land through a working shadow gate — which means
**billing first, then this.** The order is: clear billing → run the gate once → ship the dry-run
mode → read two weeks → decide A or B with evidence.

## Confidence

- `[VERIFIED]` all three mechanisms, their gating, the 21-entry patch list, and the `alter`
  configuration — each read directly from source, cited above.
- `[VERIFIED]` the kill switch exists and its semantics (`startup.mjs:45-51`).
- `[UNVERIFIED]` what step 3 actually changes on a real deploy. That is the measurement being
  proposed and cannot be obtained by reading code.
- `[UNVERIFIED]` whether production schema currently matches the models. One read-only
  `information_schema` comparison would answer it and has deliberately not been run against
  production from here.
- `[HYPOTHESIS]` that flipping to Option B without measuring first could break production. It is
  a reasoned guess from the 21 patches, not an observation — and the whole point of the
  recommendation is that a guess is not good enough to bet production on.
