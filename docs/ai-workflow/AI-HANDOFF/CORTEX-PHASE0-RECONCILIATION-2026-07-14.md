# SWAN Training Cortex — Phase 0 Reconciliation Record
**Date:** 2026-07-14 · **Author:** Fable 5 · **Read-only audit; no code changed.**
**Audited against:** `origin/main` @ `eac60c638` in a dedicated worktree (`C:/tmp/sspt-cortex-phase0`) — NOT the wip tree (which is 574 commits behind main).
**Parent:** `docs/ai-workflow/brainstorms/swan-training-cortex-master-prompt-2026-07-13.md` (v2 master prompt, Phase 0).
**Method:** 3 parallel repo auditors — (1) 63-table model reconciliation, (2) intake canonical-surface receipt, (3) generation-path + catalog-duplicate + movement/form receipt. All claims below carry file:line evidence from the agents' walks. `[VERIFIED]` at eac60c638.

---

## 1. Headline

| Verdict | Count / 63 proposed tables |
|---|---|
| **EXISTS-AS** (already there) | 30 |
| **EXTEND** (exists, missing structure) | 13 |
| **COVERED-ELSEWHERE** (pattern exists, different scope) | 8 |
| **NEW** (genuinely greenfield) | **12** |

The only truly new construction is the **knowledge/rules layer itself**: `knowledge_sources`, `source_files`, `source_sections`, `knowledge_concepts`, `knowledge_rules`, `rule_sources`, `rule_conflicts`, `swan_methodology`, plus `credentials`, `continuing_education`, `workshops`/`workshop_notes`, and `emergency_actions`. Everything client/exercise/program/session-shaped already exists. **Phase 1 scope = ~12 new tables + reuse of existing approval/versioning patterns, not 63.**

## 2. Table reconciliation (full map)

Legend: E = EXISTS-AS · X = EXTEND · C = COVERED-ELSEWHERE · N = NEW

| Proposed | V | Existing home / evidence |
|---|---|---|
| knowledge_sources, source_files, source_sections | N | none (closest: `NutritionSourceRecord.mjs`, nutrition-only) |
| source_permissions | C | permission-grant pattern in `TrainerPermissions.mjs`, `VideoAccessGrant.mjs` |
| credentials, continuing_education, workshops, workshop_notes | N | none |
| knowledge_concepts, knowledge_rules, rule_sources, rule_conflicts, swan_methodology | N | NASM logic is hardcoded in services + `optPhases`/`nasmMovementPattern` columns, not a rules table |
| rule_versions | N | reuse waiver versioning pattern (`WaiverVersion`/`WaiverRecordVersion`) as template |
| rule_approvals | C | approval shape in `LongTermProgramPlan` (`status` draft/approved, `approvedBy/At`) — reuse |
| coaching_preferences | C | settings pattern (`GamificationSettings`, `AdminSettings`); no trainer coaching-style table |
| coaching_cues / exercise_cues | E | `Exercise.coachingCues` JSON |
| exercises | E | `Exercise.mjs` (rich: type, difficulty, force, mechanic, nasmMovementPattern, optPhases, uniqueSlug) + `CustomExercise` |
| exercise_aliases | E | `Exercise.aliases` JSON |
| exercise_muscles | E | `Exercise.primaryMuscles/secondaryMuscles` + `ExerciseMuscleGroup` join (activationLevel 1-10) |
| exercise_equipment | E | `ExerciseEquipment` join + `Exercise.equipmentNeeded` |
| exercise_contraindications | X | `Exercise.contraindicationNotes` TEXT + `nasmCorrectiveCategory` JSON — free text, needs structured rows |
| exercise_precautions | X | `Exercise.safetyTips` TEXT |
| exercise_progressions | E | `Exercise.progressionPath` JSON + `prerequisites` + `unlockLevel` |
| exercise_regressions | X | inverse of progressionPath not stored; partial via `WorkoutPlanDayExercise.alternativeExerciseId` |
| exercise_substitutions | E | `WorkoutPlanDayExercise.alternativeExerciseId` + `VariationLog.switchDetails` JSON |
| exercise_errors | X | per-analysis compensations (`FormAnalysis`/`MovementAnalysis` JSON); no static per-exercise error catalog |
| exercise_dosage_options | E | `Exercise.recommendedSets/Reps/Duration`, `defaultTempo`, `defaultRestSeconds` + plan-level fields |
| assessments / assessment_results | E | `MovementAnalysis` (PAR-Q+, OHSA checkpoints, overallScore, correctivePlan JSON) + `ClientBaselineMeasurements` |
| assessment_protocols | X | protocol steps encoded as JSON per analysis; no reusable protocol-definition table |
| client_health_history | E | `ClientOnboardingQuestionnaire.responsesJson` (85-q) + baseline `parqScreening` JSON |
| client_medications, client_restrictions, client_clearances | X | inside questionnaire/pain/baseline JSON; no discrete rows |
| client_goals | E | `Goal.mjs` family + `LongTermProgramPlan.goals` JSONB |
| client_preferences | E | questionnaire prefs + `NotificationSettings` |
| client_readiness | E/X | RPE + `WearableData` + `RecoveryCompletion`; no unified readiness-score table |
| client_pain_reports | E | `ClientPainEntry` (region, side, level, type, aggravatingMovements) + `BodyMapEvidence` + `PainEntryCorrectiveExercise` |
| client_referrals | C | `GalleryReferral`/`Lead` are marketing referrals; medical referral = extend |
| programs / program_phases | E | `LongTermProgramPlan` + `ProgramMesocycleBlock` (optPhase 1-5, entry/progression criteria) + `WorkoutPlan.nasmPhase` |
| workouts / workout_exercises | E | `WorkoutPlanDay`/`WorkoutPlanDayExercise` (planned) + `WorkoutExercise` (performed) + `WorkoutTemplate` |
| workout_blocks | X | only `supersetGroup` INTEGER; no block entity |
| completed_sessions / completed_sets | E | `WorkoutSession` + `Set` (setType, target/actual, RPE, isPR) + `WorkoutLog` |
| exercise_history | E | `ExerciseTrend` + derivable from Set/WorkoutExercise + `SprintExerciseMemory` |
| personal_records | E | `PersonalRecord` (recordType weight/est1rm) + `Set.isPersonalRecord` |
| progression_events / regression_events / program_adjustments | X | `VariationLog` (BUILD/SWITCH) + `ClientProgress` levels + `WorkoutPlan.progressNotes` JSONB; no explicit event log |
| bootcamp_templates / stations / variations | E | `BootcampTemplate` (stationConfig JSONB) + `BootcampStation` + `BootcampExercise.variationType` (main/alternative/lowImpact) |
| safety_events | X | pain entries + PAR-Q flags + `WorkoutExercise.painLevel`; no unified safety-event log |
| emergency_actions | N | none |
| trainer_reviews | C | plan-approval fields + `ProgressReport`/`ClientNote`; no review-queue table |
| outcome_metrics | E | `ClientProgress`, `ProgressData`, `BodyMeasurement`, `MeasurementMilestone` |
| knowledge_feedback | C | `EnhancementRequest` closest |
| audit_logs | E | `AiCommandAuditLog`, `AiInteractionLog`, `AdminAccountAuditLog`, `AutomationLog` — **reuse; do NOT add a 5th audit table** |

## 3. Intake canonical-surface receipt (summary)

**The "3 competing wizards" story is wrong — there is ONE real wizard plus decoys, and the real admin intake flow is the Coach intake queue.**

- **CANONICAL wizard:** `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx` — mounted at `/onboarding` (client self, `UniversalDashboardLayout.routes.tsx:186`) and `/client-onboarding` (admin, `routes.tsx:112`); posts to `POST /api/onboarding[/self]` (`onboardingRoutes`, mounted `backend/core/routes.mjs:297`).
- `admin-clients/.../ClientOnboardingWizard.tsx` = a **14-line re-export wrapper** of the canonical wizard (not a competitor).
- `admin-onboarding/UnifiedOnboardingWizard.tsx` = **misnamed decoy** — a 74-line static landing card, not a wizard, though mounted at 3 routes. LEGACY/DORMANT.
- `AdminOnboardingPanel.tsx` + `adminOnboardingRoutes` (`routes.mjs:482`) = **DORMANT** — only consumer is unmounted.
- **CANONICAL admin intake:** ClientsWorkspace's "Open onboarding workbench" actually navigates to the Coach Command Center intake queue → `/api/coach/intake` (`coachIntakeRoutes`, `routes.mjs:384`) (`ClientsWorkspace.logic.ts:148`).
- **Route-shadow flags:** `/api/onboarding` is double-mounted (`onboardingRoutes` @ :297 THEN `clientOnboardingRoutes` @ :299 — no live collision, but `onboardingRoutes`'s `GET /:userId` claims single-segment GETs; fragile). `orientationRoutes` mounted twice (`routes.mjs:366` wins; the `api.mjs:50` copy is dead weight).

**Cortex implication:** Layer-5 intake data = `ClientOnboardingQuestionnaire` via `onboardingRoutes` + coach intake queue. Cleanup candidates (Phase 2 approval, Rule 34): `UnifiedOnboardingWizard`, `AdminOnboardingPanel` + `adminOnboardingRoutes`, the duplicate orientation mount, and merging `clientOnboardingRoutes` into `onboardingRoutes`.

## 4. Generation-path receipt (summary)

**The two generators are complementary, both live, NOT redundant — but they don't converge on one persisted shape.**

- **Deterministic path** `/api/workout-builder` (`routes.mjs:379` → `workoutBuilderService.mjs`): serves trainer/admin WorkoutBuilder + admin-workout-planner. **Stateless** — returns the plan JSON; does not write WorkoutPlan tables. Crucially, `workoutBuilderService.mjs:75` already imports `swanCoachCortexService` — **the doctrine vault feeds the deterministic builder, exactly the v2 architecture.** Client self-gen exists but is killed by default (`ENABLE_CLIENT_PLAN_SELFGEN`, `workoutBuilderRoutes.mjs:49-60`) — consistent with trainer-indispensability.
- **LLM path** `/api/ai` (`routes.mjs:644`): serves ONLY the admin-clients Swan Coach Copilot. Single-workout (`aiWorkoutController`) writes `WorkoutPlan/WorkoutPlanDay`; long-horizon (`longHorizonController`) writes `LongTermProgramPlan/ProgramMesocycleBlock`.
- **Three different persistence outcomes** (none / WorkoutPlan / LongTermProgramPlan) for "generate a plan" — the real unification target.
- **Data blind spot:** `MovementAnalysis` + `FormAnalysis` converge into `MovementProfile.commonCompensations` (V3c.4 aggregator), which feeds ONLY the LLM/long-horizon path (`longHorizonContextBuilder.mjs:200-206`). The deterministic builder never reads MovementProfile — OHSA/pose compensation data is invisible to the trainer dashboard generator. **This is the single highest-value Phase 3 wiring fix.**

## 5. Exercise catalog receipt (summary)

**No hard duplicate of the master catalog.** `Exercise` ("Rolodex," 840+ rows) is the single authoritative table (`exercise_library` exists but is EMPTY — deletion candidate pending Phase 2 approval). `BootcampExercise` = per-class denormalized snapshot with soft FK `exerciseLibraryId → Exercises`; `BootcampStretch` = separate small catalog for stretches (master doesn't cover them); `SprintExerciseMemory` = anti-repeat usage ledger (string-keyed); `CustomExercise` = trainer-authored, soft `baseExerciseKey` link. **Real risk = string-key drift**, not duplicated rows. v2's "fold bootcamp tables" instinct was wrong — they're legitimate satellites; the fix is hardening the soft links, not merging tables.

## 6. Decisions for Sean (the Phase 0 exit gate)

1. **Persisted-shape unification:** should the deterministic builder start persisting to `WorkoutPlan` (one canonical save path for all generators), with `LongTermProgramPlan/Mesocycle` kept as the long-horizon layer above it? **Fable recommends YES** — one plan shape, three writers today is drift waiting to happen.
2. **Movement-data wiring:** approve feeding `MovementProfile.commonCompensations` into the deterministic builder (Phase 3 slice)? **Recommend YES — highest-value single fix found.**
3. **Knowledge-layer form:** approve Phase 1 = ~12 new tables (knowledge/rules/sources/credentials/CE/workshops/emergency_actions) reusing the waiver-versioning and plan-approval patterns, with the coach-brain vault staying the doctrine home? **Recommend YES.**
4. **Intake cleanup (separate cleanup pass, Rule 37):** archive `UnifiedOnboardingWizard` (decoy), `AdminOnboardingPanel`+`adminOnboardingRoutes` (dormant), the duplicate orientation mount, and merge `clientOnboardingRoutes` into `onboardingRoutes`? All appear unreferenced/dormant based on current walk; final reference check before any destructive action.
5. **EXTEND priorities:** which structured upgrades matter first — (a) structured contraindications/precautions per exercise, (b) medications/restrictions/clearances as discrete rows, (c) progression/regression event log, (d) unified readiness score, (e) safety-event log? Fable's order: **(c) → (a) → (b) → (d) → (e)** (progression events power charts + gamification immediately).
6. **`exercise_library` empty table:** likely deletion candidate pending Phase 2 approval — confirm nothing external references it.

## 7. Hostile self-review + residual risk

- Agents walked origin/main statically; no runtime probes (Rule 55) — route-shadow claims are mount-order reads, marked fragile not broken. Before any fix lands on the double-mounted `/api/onboarding`, a supertest probe is required.
- Live production DB schema was NOT queried (read-only audit, no launcher run). Model files may drift from prod columns (Rule 58) — Phase 1 migrations must run the information_schema check per touched table.
- The 63-table verdicts trust JSON columns as "coverage"; whether JSON-in-column suffices vs discrete rows is exactly decision #5.

**Next slice (Rule 60):** Sean answers §6 (six decisions) → then `fable-blueprint-forge` forges the Phase 1 knowledge-spine package.

## 8. DECISIONS RATIFIED — 2026-07-14

Sean delegated all six decisions to Fable ("make the best decision… for the vision and the best for the app"). Fable's rulings, binding for Phase 1+:

1. **Plan-shape unification: YES.** `WorkoutPlan`/`WorkoutPlanDay`/`WorkoutPlanDayExercise` is the ONE canonical persisted plan shape. The deterministic builder gains an optional persist step writing that shape; `LongTermProgramPlan`/`ProgramMesocycleBlock` remains the macro layer ABOVE it (mesocycles reference/spawn WorkoutPlans), not a rival shape. Scheduled as its own slice in Phase 3 (touches money-adjacent trainer workflows — regression-tested).
2. **Movement-data wiring: YES.** `MovementProfile.commonCompensations` becomes an input to `workoutBuilderService` candidate filtering/regression selection. Phase 3, first slice after the safety engine.
3. **Knowledge spine (~12 new tables): YES.** Phase 1 as scoped in §6; reuse waiver-versioning + plan-approval patterns; coach-brain vault remains the doctrine home; DB rules layer complements (does not replace) the vault.
4. **Intake cleanup: YES, as a separate Rule-37 pass** after Phase 1 ships — archive `UnifiedOnboardingWizard` decoy, `AdminOnboardingPanel`+`adminOnboardingRoutes`, dedupe orientation mount, merge `clientOnboardingRoutes` into `onboardingRoutes`. Each item gets a final reference grep + supertest probe (Rule 55) before any move; nothing deleted, archived only (Rule 34).
5. **EXTEND order: (c) progression/regression event log → (a) structured contraindications/precautions → (b) medications/restrictions/clearances rows → (d) unified readiness score → (e) safety-event log.** (c) lands in Phase 1 (it is knowledge-spine adjacent and immediately feeds charts + gamification + the custom-chart builder per master-prompt A2.15).
6. **`exercise_library` empty table: likely deletion candidate pending final reference check** in the Phase-4 cleanup pass — requires grep across backend + migrations + a prod row-count check before destructive action. Until then: untouched.
