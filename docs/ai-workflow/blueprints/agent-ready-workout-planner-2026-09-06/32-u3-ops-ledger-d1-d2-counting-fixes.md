# U3 ops ledger (design-first) + D1/D2 generator counting fixes

Layered on `rolodex-bootcamp-baseline-v2` (4b31241c2). Committed `fe300a2a9`, tagged
`rolodex-bootcamp-baseline-v3`. No push — main untouched pending Sean's release.

## U3 — design pass first (as Sean ordered), then code

**Evaluated and rejected for now:** session-level `pg_try_advisory_lock` held for minutes-long
generations. It requires a dedicated pooled connection per concurrent run — on Render's connection
cap that trades a lease-race for pool exhaustion, and the metadata lease already provides
cross-connection mutual exclusion. Session advisory locks are documented as the NEXT step if
cross-process contention ever outgrows a single node (full reasoning in the migration header).

**Shipped:** the `generation_runs` side-table (Qwen's sketch) as an OPS LEDGER —
- Migration `20260915000000-create-generation-runs.cjs`: sprint_id, operation_id, version,
  status ENUM(running|completed|failed|orphaned), claimed_at/heartbeat_at/finished_at,
  error_message; indexes on (sprint_id, status) + operation_id.
- `claimSprint` writes the running row (idempotent INSERT-guard + status refresh) and, when
  reclaiming a dead claim, marks superseded rows orphaned.
- `closeGenerationRun()` closes rows completed/failed with error_message.
- **D-Q3 closed:** a cleanup FAILURE after a failed generation now marks the row orphaned
  best-effort AND logs sprintId/operationId/originalError — the old `catch { }` that made cleanup
  failures invisible is gone.
- Raw SQL on purpose: an ops ledger is not a domain model; no model/index.mjs surface change.
- Tests: `generationRuns.test.mjs` — running-on-claim, completed-on-success, failed-on-error,
  orphaned-on-reclaim, orphaned-on-cleanup-failure (4; assertion fixed to match bind-param JSON
  after the first version wrongly expected literals — recorded, not hidden).

## D1/D2 — Astra's hive findings, probe-confirmed then fixed

- **D1 CONFIRMED**: `buildStationWorkout` appends finishers only when
  `allowHighImpactFinishers` (explicit cardio/high-impact), but the pool-legality estimate always
  reserved `-1` per station → normal classes under-armed the relaxation ladder by `stationCount`
  picks and could ship weak stations. Fix: `poolSlotsForClass()` mirrors the builder
  (full-group=10; stations × eps, −1 only when finishers append). Wired into
  `applyDayTypeContract` + budgetGate context.
- **D2 CONFIRMED (arithmetic)**: per-slot `durationSec` was divided by the rounds-INCLUSIVE
  totalSlots, but the timing sum counted the built list once → `totalClassMin` advertised ~half
  the real 2-round class. Fix: `estimateClassWorkoutSeconds()` multiplies the list total by
  `format.rounds` before adding station transitions. Wired into Step 6.
- Goldens for both helpers in `bootcampGenerationSemantics.test.mjs` (15/15).

## Verification

Full battery on this layer: planner 87/457 · bootcamp 39/218 · hooks+sprint 64/280 ·
backend group 14/90 · server-RED 4/25 both configs (audit PG had stopped again — restarted from
its data dir; start command in receipt 30's trail: pg_ctl -D <data dir> -o "-p 55479" start) ·
`tsc --noEmit`@16384MB 0 errors. Swarm review outputs preserved at `C:/tmp/rolodex-review-20260913/hive-*.md`.

## Remaining backlog

U4 weekly parallel generation (needs U3's ledger as its safety floor — now present) · U5 gating
purity · U6 roster query cache · U7 runner persistence + visibilitychange · U8 progression
sparkline · Fable copy-scan + ≤300-line sweep (bootcampGenerator now ~1060 lines — split
candidate for its own slice). NOT DEPLOYED, no push.
