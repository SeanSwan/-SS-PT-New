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

## 7. BATCH 2 ADDENDUM (2026-07-13/14 — /loop continuation)

**Slices shipped:** P0 #3 Rolodex (token seams, both hosts) · #4 Schedule (frame + day-strip hooks/seams + HONEST fetch-error banner — scheduleError was computed but never rendered) · #5 Clients & Team (frame on the VIEW, card-grid hooks, swan-card radius seam + HONEST roster-error state — loadClients had no catch) · #6 Progress charts (first chart-bearing host: CLIENT_PROGRESS_MANIFEST w/ chart.progress; lens-aware Victory bridge via resolved-token palette — getComputedStyle from inside the frame, default-equality locked; /progress/detailed remains un-bridged, residual) · #7 Bootcamp (frame composed on the boundary line — page file at its 300 cap).

**§7b promoted item 1 (deferred onboarding) — RULING: structurally satisfied; wizard redesign deferred to a Sean-gated slice.**
Receipts: fresh clients land on /dashboard/client/overview (OptimizedSignupModal.tsx:901), which already carries a 1-tap "Log Workout" quick action (ClientDashboardHomeTab.tsx:158 → /dashboard/client/log-workout?loadPlan=today); the 8-step ~36-field onboarding wizard is OPT-IN (its redirect gate `shouldRedirectClientToOnboarding` exists but has ZERO mounted callers) and does NOT block logging; the real first-workout obstacle is the liability-waiver gate (protected-route.tsx:130-143), which is a legal requirement, not a UX defect. The 60-second activation clock holds ONCE THE LIABILITY WAIVER IS LINKED: signup → waiver (legal requirement, protected-route.tsx:130-143 blocks all /dashboard routes until signed) → overview → Log Workout = 2 taps post-waiver. Waiver signing is the real first-session critical path; streamlining IT is the follow-up worth measuring. Culling the wizard's 36 fields to "goal + fitness level" is a Sean-taste decision (which fields die, what gets asked contextually later) → requires the grill-me gate (Rule 64) before a redesign slice. NOT built blind.

**§7b promoted item 2 (1-click cancel) — SHIPPED as a wire-up.** Receipts showed live recurring Elite ($24.99/mo, mode:'subscription') + an EXISTING protected cancel endpoint (cancel_at_period_end) + an UNWIRED useSubscription.cancel(). New ClientMembershipCard on /dashboard/client/profile: real tier/status/renewal truth, two-tap arm→confirm cancel (8s auto-disarm), honest access-until copy, role=alert failure path, free tiers see status only. 4/4 behavior tests incl. exactly-one-cancel-call lock.

**Batch-2 residuals:** /progress/detailed un-bridged palettes · NutritionTodayPanel.reviewRepeat test failing on merged main (parallel session's lane — flagged in review-queue, zero overlap with this diff) · ClientProfilePage.tsx 361 lines + ClientsWorkspace.view.tsx ~330 (pre-existing overages that GREW slightly here — extraction backlog; ClientsWorkspace.tsx itself was honestly extracted to 288 via useClientHubRoster in the final review pass) · chip/card representation styles under worn recipes untuned for dense strips (visual-only when a v2 recipe ships).


## 8. BATCH 2 FINAL REVIEW RECORD (3 combined-angle finder agents → verify → fix)

**Fixed in the final pass:** roster error banner was DEAD CODE (data-layer fetchers swallow → []; fixed with fetchClientHubClientsStrict + useClientHubRoster extraction + rejecting-axios regression test) · membership cancel truth relapsed on remount (backend /status now returns cancelledAt; card derives cancelPending; duplicate-cancel path closed) · past_due/paused subs had NO cancel affordance (FTC inversion — now cancellable) · staff synthetic entitlement rendered a degenerate cancel card (isAdmin guard) · secondary chart series mapped to --world-action = ~1.3:1 navy-on-black under Prism (secondary now Swan-fixed until Chart Charter dataviz tokens exist) · palette identity churn double-rendered 12 charts pre-paint (bail-out) · dead /tiers fetch per profile visit (useSubscription({withTiers:false})) · manifest test covered 2/6 manifests (now iterates ALL + Golden-Pair-compiles-against-progress with real chart slot) · six 22-line frame clones → makeLensFrame factory (10-line data bindings) · three fresh error-red one-offs → shared ui/ErrorNote · schedule stale-refresh failures now show a last-loaded-data banner variant · BootcampBuilderStyles 301→300.

**Accepted residuals (explicit):** BootcampBuilderPage.tsx line-cram idiom (pre-existing; full extraction = own slice; no third cram may land) · schedule retry during the useCalendarData circuit-breaker 30s window is a silent no-op (pre-existing breaker; schedule-arc follow-up) · /progress/detailed un-bridged · NutritionTodayPanel.reviewRepeat failing on merged main (parallel session's lane, flagged in review-queue).

## §9 Batch 3 — Slice B3-1: /progress/detailed lens bridge + chart-theme dedupe (Lane 1 P1 #1)

**Receipt (Rule 26):** route `UniversalDashboardLayout.routes.tsx:196` (`/progress/detailed` → ClientProgressWrapper) → mounted JSX `UniversalDashboardLayout.routeComponents.tsx:134` `return <NASMProgressCharts clientId={clientId} />` (behind identity + Guardian gates, both preserved) → page `components/ClientProgressCharts/ClientProgressCharts.tsx` (1144 lines, pre-existing over-cap — NOT decomposed this slice) → 14 chart children in `charts/`. Data path (GET /api/workout-forms/client/:clientId/progress + /api/client/analytics/*) UNTOUCHED — styling-only bridge.

**Scope:**
1. NEW `components/Charts/lensChartPalette.tsx` — LensChartPaletteProvider + context + `useLensChartPalette()` MOVED from the grid file (right altitude: detailed page must not import grid internals). Grid file keeps `useSeamedVictoryProps` and re-exports the provider (public API unchanged; grid + card consumers untouched).
2. NEW `charts/detailedChartTheme.ts` — shared `DETAILED_AXIS_STYLE` + `DETAILED_TOOLTIP_PROPS`; replaces byte/value-identical local consts (AXIS ×7 identical + ExerciseFrequency fontSize-10 derived override; TOOLTIP ×4 identical — hashes verified pre-edit). Literal color strings preserved EXACTLY (rgba forms kept — string-form changes would break prop-equality zero-delta locks).
3. Mount `ClientProgressLensFrame` + `LensChartPaletteProvider` around `<NASMProgressCharts/>` in ClientProgressWrapper (frame-at-boundary precedent; provider INSIDE frame so the host div reads the frame's inline --world-* vars). Reuses CLIENT_PROGRESS_MANIFEST — same surface family, chart.progress slot already declared.
4. Seam the 14 Ice Wing (#60C0F0) series-identity sites (series stroke/fill, gradient stops, matching axis tint, legend symbols) across 4 charts (BodyComposition 7, MuscleGroupRadar 3, RestCompliance 2, VolumeOverTime 2) → `palette.primary` via useLensChartPalette + useMemo builders; static Swan exports keep zero-delta by construction. ALL other colors (Wing Purple, Gilded Fern, Arctic Cyan, axis chrome) stay Swan-fixed per the batch-2 doctrine (secondary/button tokens do not seam). TrainingLoadChart is DELIBERATELY excluded: its lone Ice Wing hit (line ~113) is a mid-stop of a Wing-Purple-led brand gradient — secondary-role identity, so it stays Swan-fixed (hostile-review concurrence).
**Non-goals:** ClientProgressCharts decomposition; ConsistencyHeatmap (non-Victory) tokens; /progress/detailed data-truth audit; other 9 charts' palettes.
