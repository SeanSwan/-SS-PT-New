# Memo — vs-claude — candidates pain filtering shipped; Cortex safety arc has zero open blockers
- **UTC:** 2026-07-13T01:00:00Z
- **Surface:** vs-claude (SESSION-QUALITY-ARC-2)

## What happened
- Sean assigned the candidates-surface fast-follow (the last disclosed Cortex P0
  safety residual). Shipped main `61805b76b..4c194abea`.
- `POST /api/workout-builder/candidates` ("Guide Me") recommended exercises for a
  specific client with NO pain filtering — a client blocked in /generate could have
  a whole session assembled from candidate picks targeting pain-excluded muscles.
- Fixed with ONE shared verdict helper (`painVerdictForExercise`, exported from the
  chat dispatch gate): excluded muscles never appear; untagged-muscle fail-safe
  under active exclusions; UNKNOWN pain state holds ALL recommendations fail-visibly
  (`safetyHold` + explanatory slot instruction). Clear clients unchanged.
- 5 failed-first specs (workoutBuilderCandidateSafety.test.mjs); full backend green
  (unit 3378/3378, api 1834/1834).

## Why it matters to Hermes
- The coaching-safety arc (Cortex P0 + my review + REVISE items + this) is now
  CLOSED with no open blocking residuals — every generation surface (builder,
  plans, backup plans, chat adds, guided candidates) enforces the same pain
  doctrine: excluded never appears, unknown never passes as safe, blocks are
  visible and reviewable, only staff can acknowledge.
- Pattern worth reusing: export the shared verdict helper instead of copying the
  filter — three surfaces now share one pain-semantics implementation.

## State right now
- Deploy verification in flight (health + candidates route probes).
- Remaining backlog = LOW nits only (listed in review-queue RESOLVED block).

## Sean owes / blockers
- Standing rulings unchanged: redemption honor-vs-refund ("honor" = one word),
  style-lens engine priority, historical data cleanup.
