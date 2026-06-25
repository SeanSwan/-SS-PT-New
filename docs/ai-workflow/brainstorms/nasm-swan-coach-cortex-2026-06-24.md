# NASM Swan Coach Cortex Brain Foundation - 2026-06-24

Prompt-watcher classification: VISION.

## Plain-English Goal

Build the brain first: an Obsidian-compatible Swan Coach Cortex vault that captures Sean Swan's training style, NASM-aligned rules, guided generation flow, client-facing privacy rules, and full-plan PDF expectations before changing runtime behavior.

The initial brain-foundation slice was behavior-neutral. Runtime Slice 1 now adds backend-only workout generation wiring; PDF export, database schema, and client-facing runtime UI remain unchanged.

## Current System Receipt

| Surface | Evidence | Meaning |
|---|---|---|
| Admin workout planner page | `frontend/src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerPage.tsx:122` | Canonical planner wires generation actions. |
| Planner generation API calls | `frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerGenerationActions.ts:220`, `:259` | Planner calls `/api/workout-builder/generate` and `/api/workout-builder/plan`. |
| Backend workout-builder mount | `backend/core/routes.mjs:368` | `/api/workout-builder` mounts `workoutBuilderRoutes`. |
| Backend workout-builder handlers | `backend/routes/workoutBuilderRoutes.mjs:158`, `:218` | Single workout and long-plan endpoints exist. |
| Backend generation service | `backend/services/workoutBuilderService.mjs:829`, `:1263` | Long-plan generation emits populated `weeks[]` with day/session exercises. |
| Sean-style policy | `backend/services/workoutBuilderTrainingStyle.mjs:139` | Current style layer applies hardcore cues, but it is not yet a full Sean doctrine brain. |
| Planner Rolodex hook | `frontend/src/components/DashBoard/Pages/admin-workout-planner/useWorkoutPlannerRolodexState.tsx:8`, `:36` | Planner reuses the shared exercise search/Rolodex source. |
| Exercise library frontend | `frontend/src/components/WorkoutLogger/useExerciseSearch.ts:99`, `:125-156` | Client-safe `/api/exercises/library` supplies media and NASM/Swan metadata. |
| Exercise backend route | `backend/routes/exerciseRoutes.mjs:467`, `:541` | `/api/exercises/library` exists under protected exercise routes. |
| Exercise model fields | `backend/models/Exercise.mjs:35`, `:40`, `:242`, `:301`, `:315`, `:322`, `:329`, `:341` | Video, preview, source, OPT phases, movement pattern, thumbnail, tempo, body part are modeled. |
| Current long-horizon PDF export | `frontend/src/components/DashBoard/Pages/admin-clients/components/useLongHorizonWorkflow.ts:251`, `frontend/src/services/pdfExportService.ts:470` | This path calls the mesocycle-summary exporter. |
| Populated PDF exporter exists | `frontend/src/services/pdfExportService.ts:887` | There is already an exporter intended to walk populated weeks/days. Next slice should route the right plan shape into this path. |

## What Changed In This Slice

- Added `docs/ai-workflow/coach-brain/` as the active Swan Coach Cortex vault.
- Added `scripts/coach-brain/brain-contract.mjs` so agents can inspect the vault programmatically.
- Added `scripts/__tests__/coach-brain-contract.test.mjs` to lock required brain files, approved frontmatter, style-intake command, client-facing privacy wording, full-plan PDF expectations, readiness/recovery integration, and Obsidian map coverage.

## Runtime Slice 1 - Backend Readiness Policy Bridge

- Added `backend/services/swanCoachCortexService.mjs` to load approved Swan Coach Cortex vault notes as structured runtime policy.
- Wired `/api/workout-builder/generate` and `/api/workout-builder/plan` to accept `readinessCheck`.
- `workoutBuilderService` now emits `swanCoachReadiness`, readiness rationale, trainer-safe explanations/recommendation details, and readiness notes on generated exercises.
- Green/Yellow/Red readiness now affects exercise scoring before final selection.
- Short readiness fields are sanitized to approved body-area/readiness tokens, and free-text `notes` are intentionally dropped.
- No frontend guided-flow UI, preference database, PDF exporter, or schema changes were included in this backend slice.

## Joint-Integrity Hardening

Sean added a stronger style rule after the initial vault: Swan Coach should deliberately build shoulders, hips, ankles, elbows, hands, forearms, neck, feet, trunk control, form quality, and self-myofascial release into programming. The visible client goal still matters; the durability layer should be blended into prep, activation, accessories, swaps, cooldown/flexibility, and progression decisions.

Follow-up hardening adds tissue-quality and range-of-motion judgment for real client friction: minor tightness, back knots, tired arms after a heavy weekend of push-ups, pull-ups, chest press, heavy lifting, tight tendons, elbow/forearm strain, arthritis-aware ROM, rest/release/rolling decisions, and scaling from a 90-year-old beginner to super athletes training for triathlon.

## Brain Decisions Locked

1. The vault is policy and preference context, not production client memory.
2. Sean-style doctrine must grow through `swan-coach-style-intake`, one question at a time.
3. Sean preferences bias generation but never override safety, client data, or NASM gates.
4. Guided generation should support Auto Generate, Guide Me, and Deep Grill.
5. Client PDFs must not expose sensitive history.
6. Every planned training day must appear in client PDFs.
7. Hermes can inherit this vault later if it preserves the same contract.
8. Tissue-quality recovery guidance must scale from minor tightness and arthritis-aware ROM to high-output runner/triathlon overuse management without diagnosing clients.
9. Readiness checks must affect intake, guided generation, privacy wording, roadmap planning, and the Obsidian map, not only the standalone doctrine note.

## Runtime Slice 2 - Guided Generation Candidates

- Added `/api/workout-builder/candidates` behind the same workout-builder access gate.
- Candidate generation returns 4 Guide Me options or 6 Deep Grill options with Rolodex media, exercise defaults, trainer-safe readiness notes, and selection reasons.
- The planner now has Auto, Guide Me, and Deep Grill modes: Auto keeps the existing full generation path, while guided modes fetch selectable options first.
- The builder panel renders candidate cards with the shared Rolodex media preview and appends selected exercises to the workout.
- The DB-backed variation registry now preserves exercise media/default training fields when the Exercise model exposes them.
- No preference-learning storage or client PDF changes were included in this slice.
## Next Runtime Slices

1. Preference learning: store trainer accepts/rejects/swaps after approval.
2. Deep Grill intake refinement: add optional trainer prompts for readiness, equipment constraints, and Sean-style preferences before candidate refresh.
3. PDF exporter repair: route populated generated plans to the populated day-by-day exporter and test full day counts.
4. Client-facing privacy hardening: test PDF/client copy so sensitive history is not restated.

## Hostile Review Repair

Findings from the self-hostile pass:

- MED: tissue-quality doctrine was too isolated in `08-joint-integrity-and-release.md`; intake, guided generation, privacy, and roadmap files did not force runtime behavior to consider readiness before exercise choice.
- LOW: the Obsidian Mermaid map skipped the readiness/tissue-quality gate, so the visual brain could mislead future agents.
- LOW: the original older/fragile wording was too blunt for the coaching doctrine and was tightened to "older, higher-risk, or lower-capacity clients."

Repairs made:

- Added recovery/release/readiness questions to `01-sean-style-intake.md`.
- Added a Readiness Check section and readiness/recovery candidate note to `04-guided-generation-flow.md`.
- Added arthritis, condition-label, and symptom-narrative privacy handling to `05-client-output-privacy.md`.
- Added readiness/tissue-quality/Green-Yellow-Red candidate-scoring requirements to `07-implementation-roadmap.md`.
- Updated `09-brain-map-diagram.md` so Readiness Check and Tissue Quality feed candidate scoring.
## Verification

- Red: `node --test scripts/__tests__/coach-brain-contract.test.mjs` failed before the validator existed.
- Red: `node --test scripts/__tests__/coach-brain-contract.test.mjs` failed 7/8 when tissue-quality, ROM, arthritis-aware, and full-spectrum client guidance was not yet in the joint-integrity doctrine.
- Red: `node --test scripts/__tests__/coach-brain-contract.test.mjs` failed 8/9 when recovery/readiness doctrine was not wired into intake, guided generation, privacy, and roadmap notes.
- Red: `node --test scripts/__tests__/coach-brain-contract.test.mjs` failed 8/9 when the Obsidian map did not include Readiness Check and Tissue Quality.
- Green: `node --test scripts/__tests__/coach-brain-contract.test.mjs` passed 9/9 after the hostile-review repairs.
