# G07 — Real workout/progress evidence + deterministic metrics (S8)

Artifact `SCU-G07-41`. Version 1. Date: 2026-09-11. Owner: Sean.
Route: packet [31](31-gwen-execution-handoff.md) G07/S8 row, card [09](09-experience-cards.md) S8,
verification contract [32](32-gwen-domain-and-verification-contract.md) T33/T34/T48.
Reviews deferred to the final combined Astra gate; per-slice hostile review until clean.

## Gap truth (found by schema check, not assumption)

The S8a calculator (`coachProgressEvidence.mjs`) exists and is unit-tested, but its
only source-linked caller (`progressEvidenceTool` in coachEvidenceTools.mjs) is
effectively broken: it selects only `id, date, duration, intensity` from
`workout_sessions`, while the calculator needs `status/verified/voided` plus
`exercises[].sets[{reps, load}]`. Every real call therefore yields no verified
records. Its "scheduled" denominator counts ALL sessions (including completed),
not scheduled plan data. Real schema (model-verified 2026-09-11):
`workout_sessions(id UUID, userId, status ENUM planned|in_progress|completed|skipped|cancelled,
date, workoutPlanId, isMilestone)` -> `workout_exercises(id UUID, workoutSessionId,
exerciseId UUID, painLevel)` -> `sets(workoutExerciseId, setNumber, repsCompleted,
weightUsed)`. There is NO verified/voided column and NO per-row weight unit.

## Scope

1. **T33 — source-linked deterministic evidence.** NEW
   `coachProgressRecordReader.mjs`: bounded join (sessions -> exercises -> sets)
   scoped by userId; maps real rows onto the calculator contract
   (verified = status 'completed'; voided-equivalent = skipped/cancelled;
   exerciseKey = exerciseId; reps = repsCompleted; load = weightUsed); unit from
   the client's latest `BodyMeasurement.weightUnit` (lbs/kg) or '' with
   `missingInputs: ['weight_unit']` — never an invented unit; scheduled
   denominator = count of status 'planned' sessions in the same window (null when
   none -> no invented adherence). Calculator status semantics split:
   'unavailable' (no source rows input) vs 'empty' (truly zero sessions) vs
   'no_verified_records' (rows exist, none verified) vs 'verified'. Tool envelope
   maps accordingly. Fresh read every call (no cache) — edited/deleted rows
   change the next exact output.
2. **T34 — substitution draft with contraindication gating.** NEW
   `coachSubstitutionDraft.mjs`: hard contraindication (active match on the
   planned exercise) -> `blocked` with reasons, no bypass field; active pain
   level >= 4 or readiness <= 3 or unknown pain/readiness/contraindication data
   -> `requires_review` (never fabricated clearance); clean -> `draft` carrying
   substitution exerciseKey + equipment/media metadata, `requiresTrainerReview:
   true`. Thresholds are THIS slice's stated policy for Astra to review.
3. **T48 — share draft separate from log approval.** NEW
   `coachMilestoneShareDraft.mjs`: verified milestone session -> share DRAFT
   object only (no send, no enqueue); test proves the log-approval path never
   invokes a share send.

## Out of scope

Rewriting chart routes (charts remain authoritative; G11 covers browser/DB
acceptance), changing the atomic workout save path (G01), share SENDING
infrastructure (only the draft gate), real-PG loopback reruns (unit + mocked-
sequelize level here; G11 owns the real harness).

## Verification

node:test for calculator/reader/substitution/share units; vitest for the T33
tool integration (mocked sequelize per coachEvidenceTools.test.mjs pattern).
RED first: updated calculator status tests + T33 tool test must fail on
assertions before implementation. Baseline disclosed per rule 56.
