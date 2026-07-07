# Blueprint 05 — Recovery & Mobility Board (Phase 4B — Sean ask #13, "real money")

**Status:** blueprint / executable. Deterministic, zero-LLM, comfort-language only (never medical advice; Rule 9: stretching/flexibility/mobility/myofascial release — never yoga/meditation).
**Evidence base:** dedicated read-only recon on `claude/launch-charter-20260706` (file:line verified 2026-07-07).
**Good news confirmed:** the syndrome→exercise engine is LIVE end-to-end (OHSA wizard → `ohsaCompensationAggregator` → `MovementProfile.commonCompensations` → `correctiveExerciseService.getCorrectiveExercisesForCompensations` → `CorrectiveRecommendationsPanel`, trainer/admin-only route `main-routes.tsx:593-601`). The gap is **content tags + a client-facing view + a completion log**, not architecture.

---

## 1. Receipt-backed gaps this blueprint closes

1. **Tag coverage 32/~150:** only the starter seeder's 32 `ces-*` rows carry `nasmCorrectiveCategory`/`cesProtocolStep`. The 51-row stretches seeder (`20260309000001`) has ZERO CES tags, ZERO `bodyPartCategory`, ZERO `exercise_key` (insert `:515-548`); the 24 recovery rows in `20260322` have `bodyPartCategory:'recovery'` but no CES tags. Piriformis work exists untagged.
2. **Vocabulary dead-ends:** `knees_bow` maps to ZERO exercises (`correctiveExerciseService.mjs:58` emits it; nothing tagged); `heels_rise` is tagged on exercises but NO aggregator field emits it (`ohsaCompensationAggregator.mjs:56-69`); `shoulder_elevation` neither emitted nor tagged; no "tight lower back" grouping; muscle-name drift (Lats vs Latissimus Dorsi, Calves vs Gastrocnemius).
3. **No completion log:** "days-since-last-SMR" is not derivable — `workout_logs` keys on `exerciseName` string, and `movementPatternSql.mjs:25-73` buckets all recovery work to `'other'`. NOTE: `corrective_homework_logs` + `corrective_protocols` tables EXIST in prod (0 rows, confirmed in the data-reset FK inventory) — [LIKELY] a dormant scaffold to adopt; verify its model/columns at build before creating anything new.
4. **NBA `rest_day` rung has `cta: null`** (`nextBestActionService.mjs:119`) — the board link's insertion point.
5. **`EquipmentItem.category` lacks `lacrosse_ball`** (`EquipmentItem.mjs:46-58`) while exercises reference "Lacrosse Ball" free-text.
6. **Two parallel engines:** registry path vs `MovementAnalysis.generateCorrectiveStrategy` (`:241-308`, hardcoded free-text strings) — reconcile onto the registry.

## 2. Slice 4B.1 — Content backfill (M, data-only, zero UI risk)

- NEW idempotent seeder/migration: tag the 51 stretch/SMR/mobility rows + 24 equipment-recovery rows with `nasmCorrectiveCategory` (syndrome keys), `cesProtocolStep` (inhibit=SMR/foam-roll, lengthen=static stretch, activate/integrate where applicable), `bodyPartCategory:'recovery'`, and `exercise_key` (`ces-*` convention) — mapping table authored in the seeder from NASM-CES-TAXONOMY.md §4.1 (~120-155 target).
- Vocabulary fixes in the SAME slice: add `knees_bow`-tagged exercises (adductor/TFL SMR + stretch set); either add an aggregator OHSA field→`heels_rise` mapping or retag those rows to emitted keys; delete or implement `shoulder_elevation`; introduce `tight_lower_back` grouping tag + tag the lumbar rows; normalize muscle-name vocabulary (one canonical name per muscle, migration updates strings).
- `EquipmentItem.category` validator gains `lacrosse_ball` (validator-only change + any UI equipment icon map).
- Acceptance: every syndrome key the aggregator can emit maps to ≥1 exercise per protocol step (inhibit/lengthen/activate) — locked by a NEW backend test iterating `OHSA_FIELD_TO_CES_KEY` × `COMPENSATION_TO_V3B3_TAGS` against the DB/seeder fixture.

## 3. Slice 4B.2 — Today-prescription engine (M, deterministic service)

NEW `backend/services/recoveryBoardService.mjs` — pure, rule-based `getTodayRecoveryPrescription(userId)`:
- **Inputs (all existing):** recent sessions w/ per-exercise `{exerciseName, rpe, weight, reps}` (`clientIntelligenceService.fetchRecentWorkoutLogSummaries`, `clientIntelligenceService.mjs:161-206`) joined `exerciseName → Exercise.primaryMuscles` for muscle load; active pain entries (`ClientPainEntry`: bodyRegion/painLevel/posturalSyndrome) with the frontend `painChartInsights` constraint semantics mirrored server-side (≥7 avoid, ≥4 modify); plan day type (`WorkoutPlanDay.dayType` rest/active_recovery); `MovementProfile.commonCompensations`; days-since-last-recovery from the completion log (4B.3).
- **Output:** `{ smrTargets: [{exercise, region, durationSec, reason}], stretches: [...], mobilityDrills: [...], syndromeFocus, intensityNote, disclaimers }` — exercises come ONLY from the registry path (`getCorrectiveExercisesForCompensations`) + muscle-load ranking; capped list (3 SMR + 3 stretches + 2 drills default) for one-session realism.
- **Engine reconciliation:** `generateCorrectiveStrategy` (MovementAnalysis) marked @deprecated; controller keeps writing it for back-compat but the board NEVER reads it; follow-up retire per Rule 34.
- Endpoint: `GET /api/client/analytics/recovery-board` (protect, self; trainer/admin via assignment check). NO LLM anywhere; comfort-language strings only.

## 4. Slice 4B.3 — Completion log ("done" feeds streaks + charts) (S/M)

- Adopt `corrective_homework_logs` if its columns fit (verify at build: needs client_id, exercise_id/key, completedAt, source) — else additive `recovery_completions` table. One row per completed item; idempotent per (user, exercise, date).
- `POST /api/client/analytics/recovery-board/complete` — logs the checked item; awards small XP via the existing ledger (idempotency key `recovery:{userId}:{exerciseKey}:{date}` on the proven `PointTransaction` unique index) — recovery becomes streak-relevant without corrupting workout streaks (separate source).
- "Days-since-last-SMR" now derivable; feeds 4B.2 inputs and the Phase-4g recovery-adherence chart dimension.

## 5. Slice 4B.4 — The Board UI (M, client home)

- NEW `RecoveryBoardCard` in the client home right rail (`ClientDashboardHome.railSections.tsx` — new `<PanelCard>` after the Coach compass at `:33`) + full board view (route `/dashboard/client/recovery`) for the rest-day takeover.
- Item anatomy (one-thumb): exercise name + region chip + duration + [How-to] (exercise DB instructions; Content Studio video when available) + [Done ✓] (44px, optimistic, POSTs 4B.3). Done-state shows streak/XP receipt line (reuse SaveSuccessPanel copy tone).
- **Rest-day takeover:** when NBA returns `rest_day`, the board card promotes to the top of the rail with "Recovery day — here's today's plan".
- Disclaimers (BOTH, render-locked like `PainChartInsightPanel.render.test.tsx:31-37`): the pain-panel line ("comfort modifications for training only — not medical advice…") + NBA disclosure line. Rule 9 vocabulary enforced by a wording-class test.
- Mobile-first 320/375/414; dark-first tokens; low-motion (client/data card class per house standard).

## 6. Slice 4B.5 — NBA + trainer integration (S)

- `rest_day` rung gains `cta: { label: 'Open recovery board', href: '/dashboard/client/recovery' }` (`nextBestActionService.mjs:113-120`) — additive, test-locked.
- Trainer compliance signal: `adminComplianceHelpers.buildAtRiskComplianceClient` (`:49-95`) gains a recovery-adherence reason branch ("skips recovery work: 0 completions in 14 days despite rest-day prescriptions") from the 4B.3 log — appended to the existing `reason` pattern (`:68-69`).

## 7. Data contracts (summary)

`GET /api/client/analytics/recovery-board` → `{ success, board: { items: [{key, name, step, region, durationSec, reason, howToUrl?}], syndromeFocus, restDay: boolean, disclaimers: [..] } }` · `POST .../complete` `{ exerciseKey, date? }` → `{ success, completion, xp? }`. Both additive; zero changes to existing corrective endpoints (trainer panel untouched).

## 8. Acceptance criteria

- [ ] Every aggregator-emittable syndrome resolves to ≥1 exercise per inhibit/lengthen/activate (engine-coverage test green).
- [ ] Client with logged sessions + active pain entry sees a today-prescription that respects pain constraints (≥7 region → that region's loading work absent, SMR/gentle only); client with zero data sees an honest starter state ("log workouts / complete an assessment to personalize"), never a blank.
- [ ] Done-check persists, is idempotent per day, awards XP exactly once, and days-since-SMR changes the next day's prescription.
- [ ] rest_day NBA links to the board; board renders takeover state on rest days.
- [ ] Both disclaimers render-locked; Rule-9 wording-class test green (no yoga/meditation strings).
- [ ] Trainer at-risk view can show the skipping-recovery reason.
- [ ] tsc 0 · build OK · new backend tests green · zero regressions on CorrectiveRecommendationsPanel (trainer surface untouched, source-locked).

## 9. Effort + sequencing + risk

4B.1 content (M, ship first — pure data, unblocks everything) → 4B.3 completion log (S/M) → 4B.2 engine (M) → 4B.4 UI (M, design-router pass for the board card) → 4B.5 integration (S). Migrations: tag backfill (idempotent) + possibly one table + one enum validator — all additive, §4.3 contract. Zero LLM cost. Rule 67: client-dashboard lane = Claude. FDA/medical posture mirrors the shipped pain-panel pattern (Village [D] precedent).
