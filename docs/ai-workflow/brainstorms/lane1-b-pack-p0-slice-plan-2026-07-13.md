# LANE 1 — B-PACK P0 ITEMS 1–2 SLICE PLAN (2026-07-13)

```
Status:   ACTIVE — implementation plan for the first Lane-1 batch
Parent:   docs/ai-workflow/brainstorms/SUPER-PROMPT-jarvis-swan-os-handoff-2026-07-12.md (§4, §9 step 2)
Branch:   claude/lane1-workout-core-20260713 (worktree C:/tmp/ss-lane1-20260713 @ origin/main 6256b7a7b)
Goal:     slice → hostile review → recursive fix → next slice → FINAL hostile review → ONE push to main/Render
Gates:    Sean's §11 decisions still open — §2b.1 (redemption) and §2b.2 (serve-photo) NOT in this batch
Baseline: frontend tsc --noEmit = 0 errors [VERIFIED]; main carries 10 pre-existing gamification test fails (§2b.5)
```

## 1. Canonical Surface Receipts (Rule 26 — scout-verified, file:line in scout reports)

**Workout Logger (4 canonical mounts, ONE shared component, ONE write path):**
- Client self-log `/dashboard/client/log-workout` → `WorkoutLogger` (routes.tsx:191; JSX at shellPieces.tsx:106)
- Trainer `/dashboard/trainer/log-workout` → `EnhancedWorkoutLogger` → wraps `WorkoutLogger` (routes.tsx:160; view.tsx:131)
- Client Hub embedded → `TrainingTabSectionContent.tsx:107` renders `<WorkoutLogger clientId … />`
- Admin personal `/dashboard/admin/log-my-workout` → `AdminPersonalWorkoutLogger` → `<WorkoutLogger forceSelfMode />`
- WRITE: `POST /api/workout-forms` (nasmApiService.ts:709; mount backend/core/routes.mjs:706, NOT shadowed)
  → `protect` → `checkTrainerClientRelationship` (authMiddleware.mjs:636) → handler re-checks (dailyWorkoutFormRoutes.mjs:651-687)
  → dual-write `WorkoutSession` + `DailyWorkoutForm`. **Shared-write-path law already holds — no forks to fix.**
- `WorkoutLogger.tsx` = 1262 lines (budget target ≤120 — see Deferrals §6).

**Workout Planner:** `/dashboard/{admin|trainer}/workout-planner` → `WorkoutPlannerPage` (routes.tsx:139/167),
API `/api/workout-plans` + `/api/workout-builder/*`, model `backend/models/WorkoutPlan.mjs`.

**Build Plan (forge):** `TrainerWorkoutForgePage` registered ONLY at `/workout-forge` (routes.tsx:164) while the trainer
sidebar (TrainerStellarSidebar.tsx:72) + ~6 callers navigate `/dashboard/trainer/build-plan` → unregistered → catch-all
(shellPieces.tsx:111) → trainer defaultPath `/schedule` → **UniversalSchedule**. VERDICT: **MISROUTED** (SUPER-PROMPT §4
Build-Plans audit confirmed: "Build Plan" opens the scheduling calendar).

## 2. Surface Classification (Rule 27)
| Surface | Class | Evidence |
|---|---|---|
| Shared `WorkoutLogger` + 4 mounts | canonical | receipts above |
| `WorkoutPlannerPage` @ /workout-planner (admin+trainer) | canonical | routes.tsx:139/167 |
| `TrainerWorkoutForgePage` | canonical component, **misrouted** entry | routes.tsx:164 vs sidebar:72 |
| `WorkoutLoggerModal` (admin-clients) | legacy (views not in route tree) | scout receipt |
| `/workout` Redux dashboard (+ shadowed `/api/workout/sessions`) | legacy/ambiguous | main-routes.tsx:808-827; routes.mjs:355-356 |
| `MobileWorkoutLogger` | dormant (no consumers) | scout grep |
| `ADMIN_DASHBOARD_TABS` planner labels | dormant (@deprecated) | dashboard-tabs.ts:77-80 |

## 3. Naming ruling (Fable, per §4 "one name per surface"; admin naming method leads)
- `WorkoutPlannerPage` = **"Workout Planner"**. Kills: "Workouts" (admin sidebar), "Plan Library" (trainer sidebar +
  teach-me), "Swan Studios Workout Planner" (route titles), coach's "Build Plan" labels that point at /workout-planner.
  Rationale: matches the route slug both roles use, the admin page's own vocabulary, and SUPER-PROMPT §4 item 2 itself;
  "Plan Library" stays reserved for the Client Hub per-client saved-plans panel (a different, correctly-named section).
- `TrainerWorkoutForgePage` = **"Build Plan"** (dominant existing name; ~20 call sites). Route title "Workout
  Intelligence" dies. `/build-plan` becomes a REAL registered route; `/workout-forge` stays as an alias mount.
- Client Hub in-page chips ("Build Plan" / "Plan Library" sections scoped to one client) keep their names — same verb,
  same meaning, client-scoped; recorded as accepted in-page vocabulary.
- Coach return-label for client `/dashboard/client/workouts` becomes "Back to My Workouts" (clients don't build).
- Logger names stay as-is ("Log Workout" / "Log Client Workout" / "Log My Workout") — already consistent; registry
  becomes their single source.

## 4. Slices (each: build → verify → hostile review → fix → re-verify before next)

**SLICE 1 — Naming registry + Build-Plan route truth.**
`frontend/src/config/canonical-surface-names.ts` (NEW, ≤100 lines): machine-readable registry — id, THE name,
role-appropriate subtitle, role routes, testId, ariaLabel — for: workout-planner, build-plan, log-workout,
log-client-workout, log-my-workout. Consumers rewired to import it: WORKSPACE_CONFIG ('workouts' entry),
TrainerStellarSidebar, ClientStellarSidebar (log-workout), UniversalDashboardLayout.routes.tsx titles, coach labels
(routeContext RETURN_LABELS, CommandRouteAction, CoachCommandCenterPage, commandTitle, OpsLaunchpad), teach-me refiners.
Route fix: register trainer `/build-plan` → TrainerWorkoutForgePage; keep `/workout-forge` alias; both titled from
registry. NEW test locks: registry integrity (unique ids/testIds) + every registry route resolves to a registered role
route + `/build-plan` mounts TrainerWorkoutForgePage (regression-locks the misroute). Update string-locked tests.

**SLICE 2 — Workout Logger conversion (client-visible core).**
(a) Phase-2C mobile grid law on set rows: `32px | 1fr | 1fr | 48px` (Set# | Weight | Reps | Log), min-height 56px,
spinbutton a11y on weight/reps, log-check `aria-pressed`, Blue→Purple glow on log check, Purple→Cyan on Add Exercise;
320px hard gate. (b) Honest empty/error/loading states audit on the logger path (§7b promoted item 3). (c) Lens
readiness: NEW `frontend/src/core/style-lens-os/v2/capability-manifest.schema.ts` (≤80 lines) exporting
`SurfaceCapabilityManifest` = HostCapabilityManifest + surface identity, validated fail-closed (forbidden: layout
fields, raw colors, free-form version strings); `WORKOUT_LOGGER_MANIFEST`; `lens2-*` class hooks + `--world-*` token
consumption (Swan-default fallbacks); `LensPlanFrame` gains optional `manifest` prop (default LAB_HOST_MANIFEST —
non-breaking); appearance-profile-gated recipe resolution, fail-closed to host defaults = ZERO visual delta until a v2
style is selected. Computed-signature test: Golden Pair compiles against the logger manifest and diverges ≥5 axes.
Tap-count receipt before/after.

**SLICE 3 — Workout Planner conversion + naming applied.**
`WORKOUT_PLANNER_MANIFEST`; lens2 hooks + `--world-*` consumption on planner layout/builder/saved-plans primitives;
appearance-gated LensPlanFrame wrap, fail-closed; honest empty/error states; in-page titles from registry
("Swan Studios Workout Planner" → "Workout Planner"; builder panel heading "Workout Builder" → "Plan Builder");
computed-signature test; tap-count receipt.

**FINAL — whole-diff hostile review** (fresh pass over every changed file + rules 17/20/53/54 sweeps) → fix all → full
gates (frontend targeted suites + tsc + build; backend targeted suites; Rule 42 audit; secret scan) → ONE push → Render
deploy-verify → Rule 48 audit record + lane/queue closeout.

## 5. Review protocol
Per-slice: self-hostile review (Rule 17/61 checklist + design dual-pass on UI slices). Final: batch hostile review.
Codex mutual hostile-review REQ posted to review-queue at close (Rule 67 R7, defense-in-depth). No auth/billing/Stripe
changes in batch → no Tier-C trigger (Rule 50).

## 6. Deferrals + findings routed OUT of this batch (explicit, Rule 28-honest)
1. `WorkoutLogger.tsx` 1262 lines vs ≤120 budget: full decomposition deferred — highest-risk rewrite on the #1 client
   surface; this batch extracts only what the grid/lens work touches. Residual for the B-pack refactor arc.
2. `/api/workout/sessions` mount shadowed by `/api/workout` (routes.mjs:355-356) — legacy `/workout` surface only;
   flagged for Codex/Sean, not changed here (behavior change risk without a dedicated arc).
3. §2b.1 redemption + §2b.2 serve-photo — Sean-gated (§11 #1-2).
4. `WorkoutCopilotPanel` "Workout Intelligence" heading + AITerminalPanel "Deep Research — Workout Intelligence"
   feature labels — feature names, not surface names; left alone, recorded.
5. Legacy `/workout` dashboard + `WorkoutLoggerModal` retirement — cleanup pass, Sean-gated (Rule 34/37).
