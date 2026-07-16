# Hermes memo — data-truth chart cluster shipped to main

- **Surface:** vs-claude
- **When:** 2026-07-16 (UTC)
- **Shipped:** main @ `0c6cbde08` (commits `fbbd40716` + `53a100767`, Render auto-deploys)

## What I did / learned
Closed the analytics **data-truth cluster** — charts were fabricating/omitting truth as
badly as mock data would:
- **Classifier drift fixed:** the muscle-group balance chart and the strength radar had
  two *different* inline SQL CASE blocks and disagreed on the same logs ("Back Squat" =
  Legs on one, Back on the other; "Leg Curl/Extension" mislabeled Arms on both). Extracted
  ONE shared classifier: `backend/services/analytics/muscleGroupSql.mjs`. Ordering fixed
  (Cardio → Legs before Arms/Back); Back's greedy `%lat%` tightened to `%lat pull%` so
  "Lateral Raise" → shoulders. Probe-verified 20/20 exercises on prod.
- **Case-insensitive grouping:** "Bench Press" vs "bench press" were counted as two
  exercises — split frequency bars, anchor series, est-1RM, PR-timeline and PR cards into
  duplicate halves. All group on `LOWER(TRIM("exerciseName"))` now; one PR per exercise.
- **Bodyweight training no longer vanishes:** balance charts plot volume (weight*reps), so
  push-ups/planks/pull-ups (weight 0 → volume 0) were dropped by the frontend sanitizer.
  Probe: **25.5% of real logged sets are bodyweight**; user 108's 8 sets of chest were
  vanishing (chart falsely said "skipped chest"). Now kept when sets>0.

## Key finding for future audits (Rule 55 win)
- **UTC→timezone bucketing was a FALSE alarm.** Hypothesis said weekly charts drift under
  UTC. Probe of prod: **week drift = 0 rows**; the only 2 day-drift rows are date-only
  `00:00:00Z` entries that a `AT TIME ZONE` conversion would *corrupt* (push a day early).
  No fix — a blind TZ conversion would REDUCE truth. Left a code comment; the team already
  ships raw `ts` for the heatmap's local-day bucketing.

## State right now
- Backend suite 6550/6550; frontend client-dashboard 247/247; frontend tsc 0 errors.
- 1 pre-existing suite failure unrelated to this work: `__tests__/stripeWebhookSessionGrant.test.mjs`
  fails at setup on a local-Postgres SASL password (env-only, not logic).

## Sean owes / open decisions (surfaced, not done)
1. **Balance metric decision (recommended next slice):** balance charts still measure
   *volume*, so bodyweight work shows as a table row + "N sets" label but not a
   proportional wedge/bar. Switching them to a **sets** metric would make it fully visible —
   but that changes a shipped chart's semantics across client + admin + the live
   `MuscleGroupBalanceBars` panel, so it's a decision, not an autonomous change.
2. **Admin NASM sibling:** `admin-clients/.../workoutChartsSanitizers.ts` has the same
   bodyweight-drop but its endpoint returns `{group, volume}` with **no sets field** — needs
   the endpoint to return set counts before the same fix applies.
