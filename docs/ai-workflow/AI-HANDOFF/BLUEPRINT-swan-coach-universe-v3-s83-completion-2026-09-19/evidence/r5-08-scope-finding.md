# Finding: the runner files have never had a controller owner

**Raised:** 2026-09-21, while producing the C-to-S coverage mapping (Astra R5-08).
**Severity:** structural. Not a code defect.
**Status:** reported, not resolved — resolving it is a scoping decision.

## Observation

Checked every file in the guarded-runner surface against the `allowedFiles` of every slice in
the migrated state, and against `planFiles`:

| File | Controller owner |
|---|---|
| `backend/run-coach-postgres.mjs` | **NONE** |
| `backend/tests/helpers/coachRunnerLifecycle.mjs` | **NONE** |
| `backend/tests/helpers/coachRunnerReport.mjs` | **NONE** |
| `backend/tests/helpers/coachRunnerVerdict.mjs` | **NONE** |
| `backend/tests/unit/coachRunnerLifecycle.test.mjs` | **NONE** |
| `backend/tests/unit/coachRunnerVerdict.test.mjs` | **NONE** |

That is 6 of 6. Also unowned: `scripts/coach-completion-checkpoint.mjs`, `backend/package.json`.

## This is not a migration artifact

Checked the same question against the four historical states — v4, v5, v6 and v7:

| State | Harness files in scope |
|---|---|
| `workflow-state-v4.json` | NONE |
| `workflow-state-v5.json` | NONE |
| `workflow-state-v6.json` | NONE |
| `workflow-state-v7.json` | NONE |

The runner surface has **never** been inside any controller slice's owned scope. The migration to
v8 did not drop it — there was nothing to drop.

## Why this matters

1. **C1 requires the runner changes.** `PKG/05-slices.md#C1` demands that "marker-clear failure
   yields nonzero overall status" and that "abandonment at each child stage prevents all later
   resets/children". Those behaviours live in `run-coach-postgres.mjs` and the helpers above. So
   C1's acceptance criteria reference files C1's scope does not contain.

2. **`preserveOwnedScope` is satisfied vacuously.** The controller's migration refuses to drop
   previously owned paths. Because these files were never owned, the guard never fired. A reader
   could reasonably conclude the runner is protected when it is simply invisible.

3. **Every hardening round in this arc ran outside the ownership boundary.** R3-01, R3-02, R4-03,
   R4-04, R5-01, R5-02 and the R5-03b extraction all edited these files. Each was verified by
   execution — the work is real and the tests are green — but the controller that is supposed to
   bound "who may touch what" has never had an opinion about them.

## What is NOT claimed

- Not claimed that the edits were wrong. They were review-driven fixes, each mutation-proven.
- Not claimed that anyone violated a scope rule. The rule did not cover these paths.
- Not claimed that this is caused by the v7→v8 migration. It predates it by four states.

## What would resolve it

A scoping decision, recorded in the controller rather than in prose:

- append a bounded slice covering the runner surface, or
- declare the runner explicitly out of controller scope and name what governs it instead.

Until one of those exists, C1's acceptance criteria and C1's owned scope do not intersect on the
files C1 is written to require.
