---
decision: "C0 nav truth: owner personal logger surfaced, authoring tools adjacent; hub-shell deferred to C4 where its content lives; pinned nav contracts honored"
status: shipped
supersedes: none
---

# WORKOUT OS — C0 Receipt: Hub + Nav Truth (2026-07-29)

Branch `claude/workout-os-build-20260729` off `origin/main@14032c035`. Program doc: `UNIFIED-WORKOUT-OS-FABLE-BLUEPRINT-2026-07-29.md` (§12 plan + §13 hostile addendum).

## 1. Canonical Surface Receipt (Rule 26)

| Element | Evidence |
|---|---|
| Route registry | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx` — admin `/log-workout` → `AdminLogWorkoutRedirect` (:147), admin `/log-my-workout` → `AdminPersonalWorkoutLogger` (:148), trainer `/log-workout` → `EnhancedWorkoutLogger` (:187), client `/log-workout` → `WorkoutLogger` (:219) |
| Admin nav source | `frontend/src/config/dashboard-tabs.ts` `WORKSPACE_CONFIG` (consumed by `AdminStellarSidebar.tsx:51,170`) |
| Trainer nav source | `TrainerStellarSidebar.tsx:56` `trainerNavConfig` |
| Client nav source | `ClientStellarSidebar.tsx:53` `clientNavConfig` |
| Naming registry | `frontend/src/config/canonical-surface-names.ts` — already complete for all six workout surfaces (`logMyWorkout` at :74-81); **zero changes needed** |
| Contract tests | `sidebarRouteParity.contract.test.ts` (full WORKSPACE_CONFIG walk), `AdminStellarSidebar.iconCoverage.test.ts`, `AdminStellarSidebar.workoutFirst.test.ts`, `ClientStellarSidebar.navigation.test.ts`, `TrainerStellarSidebar.navigation.test.ts` |

## 2. Pinned product decisions discovered (Rule 52 — C0 works INSIDE these gates)

1. **Admin client-logging lives in Clients & Team** — `AdminStellarSidebar.workoutFirst.test.ts:14-22` BANS a `log-workout` workspace id / "Log Workout" clients-section label; Client Hub description owns "workout logging"; `/dashboard/admin/log-workout` is deliberately a redirect into the hub. C0 does NOT add a duplicate entry.
2. **Trainer sidebar Log Workout uses the intent flow** (`clients?intent=log_workout`) — `TrainerStellarSidebar.navigation.test.ts:33-39` pins it ("client selection instead of an empty logger", 2026-07-13 audit). The real-route nav flip happens in **C2** when the unified logger gains a client-picker header — not before the picker exists.
3. **Client first cluster IS the workout continuum** — `ClientStellarSidebar.navigation.test.ts:16-26` pins `['Home','My Progress','Log Workout']` + `?loadPlan=today`. Client nav already satisfies the blueprint's ≤2-click goal; restructuring would move workout items DOWN.

## 3. What C0 changed (all contract-safe)

1. `dashboard-tabs.ts` — **`log-my-workout` added to TRAINING** (from `CANONICAL_SURFACES.logMyWorkout`): the owner personal logger was a registered route with ZERO nav entries (dead end).
2. `AdminStellarSidebar.tsx` — `ClipboardCheck` imported + registered in `iconMap` (iconCoverage contract).
3. `TrainerStellarSidebar.tsx` — BUILD cluster reordered: **Build Plan + Workout Planner now adjacent** (were split by PLAUD Intake); no pinned order existed for BUILD.

**Deliberately NOT done + why:** hub-shell page with tabs → deferred to C4 (Today surface) where the tab content actually exists; an empty shell today would CREATE a competing surface (the disease this program cures — §13 HR-11). Client + trainer cluster restructures → blocked by pinned contracts above; the gap they'd address doesn't exist. Redirect shims for `/workout`/`/workout-builder` → C1 (same slice that removes the dead components, one touch of `main-routes.tsx`).

## 4. Tap-count baseline (desktop sidebar visible; mobile adds +1 hamburger tap)

| Role → surface | Before C0 | After C0 |
|---|---|---|
| Client → logger (today's plan loaded) | 1 | 1 |
| Client → My Progress / My Workouts | 1 / 1 | 1 / 1 |
| Trainer → client logging (via intent flow: sidebar + pick client) | 2 | 2 |
| Trainer → Workout Planner / Build Plan | 1 / 1 | 1 / 1 (now adjacent) |
| Admin → log a client workout (Clients & Team → client → log) | 2-3 | 2-3 (hub-owned, pinned) |
| **Admin → Log My Workout (owner personal)** | **∞ (URL-only, no nav)** | **1** |
| Set logged once inside logger (measured at C4) | baseline TBD C4 | — |

## 5. Verification
- Targeted vitest: sidebar/nav contract suites (parity, iconCoverage, workoutFirst, client/trainer navigation) — results in slice commit message.
- `tsc --noEmit` + production build at batch gates.
