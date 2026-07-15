# 05 — Slices & Executable Acceptance Criteria

Global gates for EVERY slice (in addition to per-slice criteria):
- `cd frontend && NODE_OPTIONS=--max-old-space-size=8192 npx tsc --noEmit` → exit 0
- `cd frontend && npx vitest run src/components/DashBoard/Pages/admin-workout-planner` → all pass
  (incl. the 300-line extraction locks)
- Touched backend? `cd backend && npx vitest run tests/unit tests/api` → all pass
- No file over 300 lines except pre-existing exempt files; Rule 42 audit clean.
Paste real command output as evidence. STOP after each slice for checkpoint.

## S1 — Planner Coach dock (no backend changes)
Scope: 04 §S1 files only.
Accept:
1. `npx vitest run src/components/DashBoard/Pages/admin-workout-planner/WorkoutPlannerCoachDock.test.tsx`
   → ≥6 tests pass covering: collapsed default, expand/collapse aria-expanded, mic aria-pressed
   toggling, busy state disables Send, error receipt row rendered, empty-state example prompts.
2. Manual (screenshot at 1440px + 375px): dock renders below the three panels; dictating streams
   interim as hint (never into textarea value); Send of a non-command sentence renders a chat-reply
   receipt row.
3. Dock does NOT render when no client is selected; instead shows collapsed bar with muted copy
   `Select a client to talk to Swan Coach.` (test this).
STOP — checkpoint 1.

## S2 — Backend planner commands
Scope: 04 §S2.
Accept:
1. New `backend/tests/unit/plannerFrontendDispatchCommands.test.mjs` ≥6 tests pass:
   - each of the 5 commands resolves from a representative phrase WITH
     `context.surface==='workout-planner'`;
   - `"add goblet squat"` with `surface==='workout-logger'` resolves to `add_exercise_to_form`
     (logger family), NOT `planner_add_exercise` (disambiguation pinned both ways);
   - execute pipeline returns `type:'frontend_dispatch'`, `event:'AI_PLANNER_SWAP_EXERCISE'`,
     payload passthrough (mimic whatever harness the existing FRONTEND_DISPATCH tests use — grep
     `frontend_dispatch` in backend/tests first and extend that suite's pattern).
2. `curl` (or supertest) evidence of one full execute round-trip JSON for `planner_swap_exercise`.
3. Client-role caller receives the standard role-denied response for `planner_*` (test).
STOP — checkpoint 2.

## S3 — Planner AI-event hook (the real-time loop closes)
Scope: 04 §S3.
Accept:
1. `useWorkoutPlannerAiEvents.test.tsx` ≥8 tests pass:
   - ADD appends to builder list with phase defaults when no generatedPlan;
   - ADD targets selected horizon day when generatedPlan open (uses selection {weekNumber,dayIndex});
   - SWAP keeps sets/reps/tempo/rest + clears rotationFallback (horizon) — reuse helper asserts;
   - SWAP resolves `to` name via mocked search (exact-first);
   - ambiguous name → handled=false + receipt text exactly per 03 §5;
   - unresolvable name → handled=false + `Couldn't find "<name>" in the exercise library.`;
   - REMOVE by name; UPDATE changes only provided fields;
   - every branch calls `acknowledgeAIWorkoutEvent` with the correct handled flag.
2. Manual: with planner open, dictate `"swap leg press for box squat"` end-to-end (S1+S2+S3 live)
   → builder row visibly changes + receipt `Swapped Leg Press → Box Squat`; screenshot.
3. Dirty-state: after a dictated edit, the Update/Save buttons light up (currentExercisesSig
   changed) — test or screenshot.
STOP — checkpoint 3 (this is the demo checkpoint — record a short screen capture if possible).

## S4 — Logger dictation
Scope: 04 §S4.
Accept:
1. New logger tests ≥5 pass: mic toggle state; send routes text with `surface:'workout-logger'`;
   `frontend_dispatch` response for `update_set_data` reaches the EXISTING `useWorkoutAiEvents`
   handler and mutates `exercises[i].sets[j].weight` (integration-style with mocked lane);
   no-command receipt copy exact per 02 §D; strip hidden when inactive.
2. Existing logger source-contract suites still pass with the ratchet respected
   (`npx vitest run src/components/WorkoutLogger`).
3. Manual: dictate `"leg press set two ninety pounds eleven reps"` in a loaded logger →
   set 2 weight becomes 90, reps 11; screenshot.
STOP — checkpoint 4.

## S5 — Last-weight suggestions
Scope: 04 §S5.
Accept:
1. Backend suite ≥5 tests: RBAC 403 foreign client; 400 missing names; success map shape
   (lowercased keys, latest wins, zero-weight rows excluded); bounded queries (assert LIMITs);
   fail returns 200 `weights:{}` never 500 for empty history.
2. Frontend: suggestion chip renders only for names in the map; tap fills the input through the
   existing set-update handler (test); untouched input still submits as before (test).
3. Manual against prod-parity dev DB: load a plan for client 84 → chips show his real last
   weights (e.g. Leg Press ~100 lbs); screenshot.
STOP — checkpoint 5.

## S6 — Sync hardening + verification + audit record
Scope: 04 §S6.
Accept:
1. Plan→logger prefill regression test green (2-exercise plan → 2 ExerciseEntry with correct
   set counts, weight 0 or suggestion placeholder).
2. API test pins `plan.metadata.planPdf` present after POST /api/workout-plans with planData.
3. "Log in Workout Logger" affordance proven mounted (test or file:line receipt) and routes with
   `loadPlan=today&source=workout-planner`.
4. Rule 48 audit record file exists with all 12 sections + checkpoint log.
5. FULL gates: frontend planner+logger folders, backend tests/unit+tests/api, build, Rule 42.
STOP — final checkpoint → ONE push per Rule 70 (architect signs off first).
