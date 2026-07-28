# Blueprint 01 — Workout Logger + Planner Convergence (Phase 3)

**Status:** blueprint / awaiting Sean's direction pick (§8 D-B). No build code until picked.
**Charter:** `docs/ai-workflow/brainstorms/launch-readiness-master-prompt-2026-07-06.md` (Phase 3).
**Evidence base:** Phase-0 audit + logger/planner recon (all file:line verified on `origin/main 6e730975d`).
**Executable-spec contract (§10):** any AI can build from this doc alone — parity checklists, states, component tree, data contracts, acceptance criteria included.

---

## 1. The problem (evidence)

The logger core is strong; the disease is **fragmentation**, so "scrap and rebuild" is the wrong frame — **converge** is. Two divergence axes:

**Loggers (2 live):**
- CANONICAL `WorkoutLogger.tsx` (1225L) — client `/dashboard/client/log-workout`, admin `/log-my-workout`, admin-for-client (Client Hub). Ghost pre-fill, quick-log, offline queue, rest timers, NASM protocols, AI terminal, PDF, Brzycki 1RM.
- COMPETING `TrainerDashboard/WorkoutLogging/EnhancedWorkoutLogger.tsx` (159L +view/logic/identity) — trainer `/dashboard/trainer/log-workout` (`UniversalDashboardLayout.routes.tsx:154`). Any feature added to one silently skips the other.

**Planners (5 live + 2 orphan):**
| Surface | File | Route | Verdict |
|---|---|---|---|
| CANONICAL | `admin-workout-planner/WorkoutPlannerPage.tsx` (296L) | admin+trainer `/workout-planner` | KEEP (richest: OPT phases, AI gen, rolodex+filters, saved-plan vault, PDF, teach mode) |
| Build Plan | `WorkoutManagement/WorkoutPlanBuilder.tsx` (220L) | Client Hub Training "Build Plan" | **MERGE** — writes same `/api/workout-plans`; unique = 4-step stepper UX + `/api/workout-builder/plan` gen (hardcodes `trainerId:'current-trainer'` — bug) |
| standalone | `WorkoutBuilder/WorkoutBuilderPage.tsx` (210L) | `/workout-builder` | MERGE/RETIRE — 3-pane AI gen, subset of canonical |
| Trainer Forge | `trainer-dashboard/TrainerWorkoutForgePage.tsx` (265L) | trainer `/workout-forge` | MERGE/RETIRE — trainer AI gen, subset |
| legacy | `pages/workout/components/WorkoutPlanner.tsx` (298L) | `/workout` (WorkoutDashboard) | RETIRE — old `<select>` client picker |
| orphan | `Admin/WorkoutPlanBuilder.tsx` (628L) | none | DELETE candidate (Rule 34 — grep-verified 0 route imports; `useCurrentWorkout.authPipeline.test.tsx:48` asserts NOT imported) |
| orphan-shadow | `pages/workout/components/WorkoutPlanner/WorkoutPlanner.tsx` (118L) | shadowed by flat `.tsx` | DELETE candidate |

---

## 2. Direction options (Sean picks — D-B)

- **A — Converge (RECOMMENDED).** Trainers adopt canonical `WorkoutLogger` (forceSelfMode already exists as the pattern); planners collapse to `WorkoutPlannerPage`, others become thin adapters or retire. Lowest risk, preserves the mature surface + today's shipped upgrades (Rule 52). Effort M.
- **B — Fresh unified rebuild.** New `WorkoutStudio` shell hosting both log + plan, reusable-primitive-first (§6). Only if the Phase-2 mobile blueprint proves the canonical logger can't hit the Apple-crisp bar by refactor. Effort L. Higher risk.
- Default if silent: **A**.

---

## 3. Feature-parity checklist (MUST pass before any retire — Rule 34 / non-negotiable #1)

`EnhancedWorkoutLogger` → canonical `WorkoutLogger` parity (verify each exists in canonical or is ported):
- [ ] set/rep/weight/RPE/tempo/rest/formQuality/notes entry
- [ ] exercise search (NASMExerciseRolodex / shared SwanExercisePicker)
- [ ] trainer client-select context (canonical takes `clientId`; confirm trainer selection UX)
- [ ] voice/transcript memo logging (canonical gates `!isClientSelfMode` — trainers keep it)
- [ ] equipment profile picker (trainer-only, exists in canonical)
- [ ] any EnhancedWorkoutLogger-only field (audit `.view/.logic/.identity` before switch)
- [ ] session summary → `/api/workout-summaries`
- [ ] submit path `/api/workout-forms` (same backend)

Planner merge (Build Plan → WorkoutPlannerPage): port the 4-step stepper UX as an optional mode; fix `trainerId:'current-trainer'` to real id; verify saved-plan management (rename/duplicate/archive/primary/PDF) reachable; then retire the 3 subset builders behind Rule-34 grep + Sean approval.

---

## 4. Logger completeness (Phase 3c — independent of the direction pick)

Real gaps to close (all P1-6, file:line):
1. **Autosave/draft-restore.** `autoSaveInterval` defined (`WorkoutLoggerTypes.ts:374`) but never wired. Add a debounced localStorage draft (per client+date key) + restore-on-mount prompt. States: saved / restoring / discarded. Highest mobile value (in-gym tab backgrounding = data loss today).
2. **Loggable supersets.** Today display-only (`ExerciseCardComponent.tsx:76` renders SS badge from plan data). Add pair/group UI honoring NASM Phase 2/4 templates. The methodology the app teaches must be recordable.
3. **Client voice logging.** Un-gate `VoiceMemoUpload` for self-mode (`WorkoutLogger.tsx:1012-1018`) with consent + redaction (Rule 8 — de-identify before any LLM parse; the parser already exists).
4. **Exercise-count copy.** Reconcile "840+" (route copy) vs ~736 (DB, memory) vs "900+" (About) — one number, sourced from a count.

## 5. Apple-crisp pass (Phase 3d)

- One-thumb bottom-sheet set entry (mobile); reuse the §6 BottomSheet primitive.
- Ghost values everywhere (progressive overload prefill — exists, extend coverage).
- Sticky-bar + FAB collision at 320px (there is already a `WorkoutLogger.timerFabClearance.test.ts` acknowledging the tension — verify + fix).
- Desktop: keyboard-first grid, drag-reorder, tab-to-next-set.
- Save beat: PR hook (Phase 4a) feeds the already-shipped SaveSuccessPanel.

## 6. Plan Library upgrade (Phase 3e — Sean ask #15)

Consolidate the 2 sibling surfaces (`WorkoutPlannerSavedPlansSection` cards + Client Hub `ClientWorkoutPlansPanel`) into ONE library on the reusable DataTable/Card primitives (§6). Add: search, OPT-phase/goal filter, plan preview (day peek without opening), one-tap duplicate/assign/activate, "last used / used by N clients", archive. Surface the unshown model fields: `description, nasmPhase, startDate/endDate, durationWeeks, currentWeek/Day, progressNotes, createdBy (AI vs trainer), day-count/duration` (`WorkoutPlan.mjs:59-145`, `WorkoutPlanDay.mjs:42-63`). Keep it simple/low-click.

## 7. Component tree (Direction A)

```
WorkoutLogger (canonical, unchanged core)
 ├─ mode: self | trainer-for-client | admin-for-client   ← trainer route now renders THIS
 ├─ SwanExercisePicker (shared, already extracted)
 ├─ ExerciseCard → ExerciseSetRow (+ superset group UI [new, 3c])
 ├─ useWorkoutDraft [new hook, 3c: debounced localStorage autosave/restore]
 ├─ RestTimer / QuickLogMode / VoiceMemoUpload(self-enabled, 3c) / CoachTerminal
 └─ SaveSuccessPanel (shipped) ← PRhook (4a)
WorkoutPlannerPage (canonical)
 ├─ StepperMode [ported from Build Plan, optional]
 ├─ RolodexPanel + filters (exists)
 └─ PlanLibrary [3e: DataTable+Card, search/filter/preview/actions]
```

## 8. Data contracts (unchanged — convergence, not new API)

Logger submit `POST /api/workout-forms` (`dailyWorkoutFormService.submitWorkoutForm`); reads `/api/workout-forms/my/info` + `/client/:id/info`. Planner `/api/workout-builder/*` + `/api/workout-plans/*`. History `/api/workout/sessions`. No new endpoints for Direction A; 3c superset/draft are client-side + existing submit shape; 3e Plan Library reads existing `/api/workout-plans` (add pagination query if list grows).

## 9. Acceptance criteria

- [ ] Trainer logs a workout through the SAME component as client/admin; parity checklist §3 fully checked.
- [ ] ≤1 planner surface reachable per role; retired surfaces grep-clean (Rule 34) + Sean-approved.
- [ ] Autosave survives tab background/navigate (regression test: fill 2 sets → unmount → remount → values restored).
- [ ] Supersets created in the logger persist and re-render as grouped.
- [ ] Mobile 320/375/414 one-thumb set entry, no FAB/sticky overlap; desktop keyboard flow.
- [ ] Plan Library: search + filter + preview + duplicate/assign/activate/archive, phone-width clean.
- [ ] tsc 0, build OK, logger family suites green, no new baseline breaks (Rule 56).

## 10. Sequencing & risk

3a (trainer convergence, needs parity audit first) → 3c (completeness: draft, supersets, voice) → 3d (Apple-crisp mobile) → 3e (Plan Library) → 3b (retire subset planners, LAST, after parity proven). Retire is always last + Rule-34 gated. Coordinate Rule 67 (Codex owns storefront/Coach/Social; logger is Claude/cross-cutting).
