# Phase A - Workout Builder Goal-Driven Generation - Audit Record

**File path:** `docs/ai-workflow/AI-HANDOFF/WORKOUT-BUILDER-PHASE-A-AUDIT-RECORD-2026-04-30.md`
**Pattern:** Phase 20 audit record + rule 48 12-section structure.
**Status:** DRAFT - smoke evidence sections marked `[PENDING SMOKE]` until Sean confirms 6-step authenticated browser smoke.
**Authority:** CLAUDE.md rule 48 (per-phase permanent artifact), rule 17 (dual-pass), rule 56 (Tier-A baseline disclosure), rule 51 (confidence tags), rule 26 (canonical surface receipt).

---

## Section 1 - Phase Header

| Field | Value |
|---|---|
| Phase name | Phase A - Workout Builder goal-driven generation |
| Scope | Six-goal opinionated NASM-OPT strategy (`general_fitness`, `hypertrophy`, `strength`, `fat_loss`, `athletic_performance`, `golf_performance`) replaces the legacy hardcoded `Math.floor(i/2)` phase ramp. Trainer-side phase override accepted on `/api/workout-builder/plan`. Both `/generate` and `/plan` endpoints accept `primaryGoal`. |
| Start date | 2026-04-29 (receipt) |
| End date | 2026-04-30 (deploy live) |
| Reviewers | Claude Opus 4.7 (build), Gemini (architectural review), Codex (final gate, 2 REVISE rounds + APPROVE), Sean (smoke + final approval) |
| Final verdict | `[PENDING SMOKE]` Codex APPROVED + pushed; deploy live; smoke pending. |
| Phase commit | `42566ccc96227f2b51b501f219587dc5514a5762` on `origin/main` |
| Receipt | [WORKOUT-BUILDER-CANONICAL-SURFACE-RECEIPT-2026-04-29.md](docs/ai-workflow/AI-HANDOFF/WORKOUT-BUILDER-CANONICAL-SURFACE-RECEIPT-2026-04-29.md) (REV 3) |

---

## Section 2 - Files Involved

**New (4):**
- [backend/services/workoutBuilderGoalConfig.mjs](backend/services/workoutBuilderGoalConfig.mjs) - 230 lines. `GOAL_CONFIG`, `normalizeGoal`, `resolveStartingPhase`, `buildGoalPhaseSequence`, `getGoalOptBias`, `ALLOWED_GOALS`. Pure helpers, deterministic.
- [backend/__tests__/workoutBuilderGoalConfig.test.mjs](backend/__tests__/workoutBuilderGoalConfig.test.mjs) - 41 tests for the helper module.
- [backend/__tests__/workoutBuilderService.goalAware.test.mjs](backend/__tests__/workoutBuilderService.goalAware.test.mjs) - 18 service-integration tests.
- [backend/__tests__/workoutBuilderRoutes.validation.test.mjs](backend/__tests__/workoutBuilderRoutes.validation.test.mjs) - 22 route-validation tests.

**Modified (3):**
- [backend/services/workoutBuilderService.mjs](backend/services/workoutBuilderService.mjs) - Replaced `Math.floor(i/2)` ramp at original line 582 with `buildGoalPhaseSequence`. Added `exerciseMatchesBias`, `scoreExerciseForGoalBias`, `formatBiasedRange`, `chooseBiasedSet`, `midpoint`. Threaded `goalBias` through `selectExercises` + `applyOPTParams`. Response emits `primaryGoal`, `goalBias`, `rationale`, `phaseParams.intensityBias`.
- [backend/routes/workoutBuilderRoutes.mjs](backend/routes/workoutBuilderRoutes.mjs) - `/generate` accepts `primaryGoal` + `nasmPhase`; `/plan` accepts `startingPhaseOverride`. Imports `ALLOWED_GOALS` for single-source validation. New `parseOptionalPhase` helper.
- [frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx](frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx) - 2 POST body field adds + 2 useCallback dep updates.

**Total runtime LOC delta:** ~+550 / ~-50 (net +500).

---

## Section 3 - Architecture & Runtime Flow

### Trainer presses Generate Plan
```
WorkoutPlannerPage.tsx (frontend)
  -> POST /api/workout-builder/plan
     body: { clientId, durationWeeks, sessionsPerWeek, primaryGoal, startingPhaseOverride }

workoutBuilderRoutes.mjs (backend)
  -> protect + authorize(['admin','trainer']) + verifyClientAccess
  -> safeGoal validated against ALLOWED_GOALS
  -> safeOverride validated 1-5
  -> generatePlan({ clientId, trainerId, durationWeeks, sessionsPerWeek, primaryGoal, startingPhaseOverride, equipmentProfileId })

workoutBuilderService.mjs::generatePlan
  -> getClientContext (DB)
  -> normalizeGoal(primaryGoal)
  -> resolveStartingPhase({ startingPhaseOverride, contextPhase: context.constraints.nasmPhase || 1 })
  -> buildGoalPhaseSequence({ primaryGoal, startingPhase, durationWeeks })
     -> per-goal phaseFn -> recommended phase per mesocycle index
     -> clamp to [startingPhase, 5]
  -> for each mesocycle:
     -> getGoalOptBias({ primaryGoal, phase })
     -> formatBiasedRange(phaseParams.sets, bias.setBias) -> e.g. "4-5"
     -> formatBiasedRange(phaseParams.reps, bias.repBias) -> e.g. "9-12"
     -> formatBiasedRange(phaseParams.rest, bias.restBias, 's') -> e.g. "0-30s"
  -> rationale[] array describes goal+phase+sequence
  -> return { mesocycles, planSummary, rationale, ... }
```

### Goal-aware exercise selection within `selectExercises()`
- New `scoreExerciseForGoalBias(exercise, goalBias)` weights exercises by their match against `bias.exerciseBias[]`.
- Sort key: recency (descending) -> goalBias score (descending) -> NASM-level proximity to target phase.
- Result: hypertrophy-goal pulls compound + isolation movements with lower-rest schemes; strength-goal pulls compounds with high rest; athletic_performance + golf_performance pull plyometric/power movements.

---

## Section 4 - Security Logic & Posture

| Control | What | Why | How it could break |
|---|---|---|---|
| Goal allowlist | `ALLOWED_GOALS` from goalConfig drives both route validation and service normalization | Single source of truth; rejects out-of-band goal strings | If allowlist diverged between modules, attackers could pass strings that bypass validation |
| Phase override range | `parseOptionalPhase` clamps to integer 1-5 | Prevents arbitrary phase numbers / SQL injection-class issues | If parser dropped, `startingPhaseOverride: -999` could break sequence math |
| Trainer-client assignment guard | `verifyClientAccess` middleware (Phase A pre-existing) | Trainer can only generate plans for assigned clients; admin bypass | If middleware was bypassed by mount-order regression, IDOR on workouts |
| Determinism | All goalConfig helpers are pure (no clock, no Math.random) | Same inputs always yield same plan; tests can pin behavior | If a Date.now() crept into phaseFn, plans would drift between calls |

**Zero new fetches, zero new auth surfaces, zero new privilege boundaries.** This phase is service-layer-only behavior change.

---

## Section 5 - Best Practices Applied

| Rule | How applied |
|---|---|
| Rule 4 (file size) | Helpers extracted to dedicated module instead of bloating service file |
| Rule 17 (dual-pass) | Codex hostile review caught band-narrowing gap before commit |
| Rule 21 (regression test first) | 81 tests written before fix landed; later expanded to 86 |
| Rule 26 (canonical surface receipt) | REV 3 receipt landed before any code |
| Rule 28 (claim-to-evidence lock) | Receipt revisions track every implementation change |
| Rule 46 (3-brain pipeline) | Claude built, Gemini reviewed, Codex APPROVED |
| Rule 51 (confidence tags) | `[VERIFIED]` / `[LIKELY]` / `[HYPOTHESIS]` used throughout |
| Rule 56 (Tier-A baseline disclosure) | Slice-clean explicitly distinguished from full repo baseline |

---

## Section 6 - Known Limitations / Non-Goals

1. **Goal config is opinionated, not configurable.** No admin UI to tune per-goal strategy. Deferred per Codex directive.
2. **`phaseFn` for `general_fitness` preserves the legacy linear ramp.** Existing client plans don't drift on this goal.
3. **Exercise selection bias is best-effort against existing fields** (`exerciseType`, `category`, `bodyPartCategory`, `primaryMuscles`, `nasmLevel`). No new DB columns; no migration.
4. **Single-workout `/generate` path** also accepts `primaryGoal` + `nasmPhase` (added in this phase per Codex review).
5. **Long-context cases (24+ week plans)** tested up to 24 weeks; longer plans clamp at the configured ceiling.

---

## Section 7 - Performance & UX Considerations

- Helper module is pure-function; zero I/O. Test suite runs in <50ms.
- Service refactor adds ~5 lines per mesocycle iteration; per-call overhead negligible (<1ms).
- Frontend adds 2 fields to existing POST bodies; no new HTTP calls.
- `rationale` array on responses is opt-in render (frontend can ignore); zero forced UX change.

---

## Section 8 - Test Coverage Summary

### Deterministic Tier-A test evidence

| Test file | Tests | Result |
|---|---|---|
| `workoutBuilderGoalConfig.test.mjs` | 41 (post-fix expanded to 42) | PASS |
| `workoutBuilderService.goalAware.test.mjs` | 18 (post-fix expanded to 20) | PASS |
| `workoutBuilderRoutes.validation.test.mjs` | 22 (post-fix expanded to 24) | PASS |
| **Combined** | **86 tests at ship; current 86** | **PASS** |
| `npm run build` | Vite production build | PASS (50.94s) |

### Tier-A baseline disclosure (Rule 56)

- Slice files: clean against `tsc --noEmit`.
- Full `tsc --noEmit` baseline: `[UNVERIFIED baseline]` - 25 pre-existing errors in `src/utils/*.ts` (logger module path + unknown-error types). NOT introduced by Phase A.

### Production smoke matrix

`[PENDING SMOKE]` - the 6-step authenticated browser smoke per Codex's directive has not been reported. Slots below await Sean's evidence:

| Step | Action | Expected | Actual |
|---|---|---|---|
| 1 | `/dashboard/admin/workout-planner` page load with client selected | renders, no console errors | `[PENDING]` |
| 2 | Generate single workout: hypertrophy + Phase 2 | `workout.primaryGoal: "hypertrophy"`, `workout.nasmPhase: 2`, `workout.phaseParams.reps: "8-12"`, `workout.phaseParams.rest: "0-60s"`, `workout.goalBias` present, `workout.rationale` array present | `[PENDING]` |
| 3 | Same client: switch goal to strength, regenerate | `workout.primaryGoal: "strength"`; goalBias differs from step 2 OR exercise pool ordering differs | `[PENDING]` |
| 4 | Multi-week: 12 weeks + hypertrophy + Phase 2 override | `plan.mesocycles` length 3, phases `[2, 3, 3]`, `plan.planSummary.startingPhase: 2`, rationale contains "(trainer override)" | `[PENDING]` |
| 5 | Inspect mesocycles[2].params | `sets: "4-5"`, `reps: "9-12"`, `rest: "0-30s"`, `intensityBias: "mid"` | `[PENDING]` |
| 6 | Open `/dashboard/trainer/workout-forge` | UNCHANGED stub behavior; no regression | `[PENDING]` |

### Deploy evidence

- Commit: `42566ccc9` on `origin/main`
- Render auto-deploy: live. Production health probe at 17:28 UTC 2026-04-30 - uptime 90s, healthy, database connected.
- Render event ID / build timestamp tying SHA to live revision: `[PENDING]` - Sean to paste from Render dashboard.

---

## Section 9 - Rollback Plan

```bash
git revert 42566ccc96227f2b51b501f219587dc5514a5762
git push origin main   # Render auto-deploys
```

This single-commit phase reverts cleanly. No DB migration to roll back. No env var to flip.

Granular rollback (revert individual files): not supported - the 7 files are interdependent. Full revert is the only safe option.

---

## Section 10 - Future Review Hooks

1. **Re-audit goal-driven phase strategy under longer plans (>24 weeks).** Current testing covers up to 24 weeks. Phaseseq behavior for 36/52-week plans should be verified under load.

2. **Audit `exerciseMatchesBias` heuristic regex set.** Lines 187-217 of workoutBuilderService.mjs use string-matching heuristics (`/jump|plyo|power/`, `/single_leg|balance/`, etc.) to classify exercises. As the exercise database grows beyond the current 880, these regex patterns may misclassify new entries. Periodic re-audit recommended.

3. **Goal allowlist drift between route validator + helper module.** If the route validator at `workoutBuilderRoutes.mjs:108` and `ALLOWED_GOALS` in `workoutBuilderGoalConfig.mjs` ever diverge, validation could pass while service rejects (or vice versa). Runtime test exists; lint rule could catch at edit time.

4. **Phase progression sequences for new goals.** Adding a 7th goal requires defining its `phaseFn` AND updating `ALLOWED_GOALS` AND adding tests. Document this explicitly in goalConfig comments.

5. **`rationale` array UI surface.** Currently emitted but not rendered in WorkoutPlannerPage. Future UX phase will render the rationale below the generated plan; re-audit at that time for PII / privacy concerns in the explanation strings.

6. **Single-workout `/generate` goal+phase verification.** The `/generate` path was added late in Phase A (Codex's REV 3 directive). Re-audit at the next workout-builder touch to confirm goal + phase plumbing didn't regress under refactor.

---

## Section 11 - Codex / AI Review Log

| Round | Date | Outcome | Action |
|---|---|---|---|
| Pre-code REV 1 | 2026-04-29 | Codex REVISE - 2 critical issues | Fixed: TrainerWorkoutForgePage misclassified as dormant; invented `/api/workout-builder/plans/:id` endpoint. |
| Pre-code REV 2 | 2026-04-29 | Codex REVISE - 5 specific corrections | Fixed: mounted-JSX proof, progressNotes type wrong (TEXT -> JSONB), ASCII normalization, GOAL_CONFIG split out, surface #4 mount-unverified tag. |
| Pre-code REV 3 | 2026-04-29 | Codex APPROVE on direction with 1 tweak | Added local pre-commit smoke requirement. |
| Implementation | 2026-04-29 | 81/81 tests green; Tier-A clean for slice; baseline UNVERIFIED disclosed per rule 56 | Codex review of diff |
| Final gate | 2026-04-30 | Codex APPROVE + push at `42566ccc9` | Codex caught + fixed: band-narrowing actually shapes set/rep/rest output (not just metadata); raw phaseParams added to single-workout response for smoke. |
| Post-deploy | 2026-04-30 | `[PENDING]` Sean's authenticated smoke | Live but unconfirmed by browser test |

---

## Section 12 - Sign-off

**Status:** PENDING Sean's authenticated smoke + explicit phase-close approval.

| Item | Status |
|---|---|
| Pre-code receipt | `[VERIFIED]` REV 3 |
| Commit pushed to main | `[VERIFIED]` 42566ccc9 |
| Render auto-deploy | `[VERIFIED]` live, uptime probe confirmed |
| Codex final gate | `[VERIFIED APPROVE]` |
| Production smoke (6 steps) | `[PENDING SMOKE]` Sean to run |
| Phase-close approval | `[PENDING]` Sean explicit "Phase A closed" |

**Audit-record commit SHA:** `[to be filled when this file is committed]`

**Next-action pointer (post phase-close):** Phase B implementation (saved-plan click-to-load + IDOR mitigation) per the Phase B receipt at [WORKOUT-BUILDER-PHASE-B-RECEIPT-2026-04-30.md](docs/ai-workflow/AI-HANDOFF/WORKOUT-BUILDER-PHASE-B-RECEIPT-2026-04-30.md), OR Master Plan resumption per Sean's direction.

---

**End of Phase A audit record.** Permanent artifact per CLAUDE.md rule 48.
