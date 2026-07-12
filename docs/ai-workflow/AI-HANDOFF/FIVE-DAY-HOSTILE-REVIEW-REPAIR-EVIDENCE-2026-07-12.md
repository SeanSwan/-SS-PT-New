# Five-Day Hostile-Review Repair Evidence ? 2026-07-12

## Scope and claim

Narrow claim: six validated local findings were repaired in the isolated `codex/five-day-hostile-review-20260712` worktree. No commit, push, deploy, production write, or shared-desktop-checkout edit was performed.

## Canonical surface receipt

### Client program progress and plan-detail read

- Route mount: `frontend/src/routes/main-routes.tsx:875` renders `UniversalDashboardLayout`; its client route registry mounts `/overview` to `ClientHomeTab` at `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:187`.
- Mounted JSX: `frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx:42` renders `ClientDashboardHomeTab`, which renders `ClientProgramShelf` at `frontend/src/components/UserDashboard/components/ClientDashboardHomeTab.tsx:191`.
- Consumer hook/service: `frontend/src/components/DashBoard/Pages/client-dashboard/plan/useClientPlanDetail.ts:104` performs the plan-detail read; `frontend/src/components/DashBoard/Pages/client-dashboard/observatory/useCurrentClientWorkout.ts:61` supplies the current plan vault.
- Exact frontend paths: `/api/workouts/${clientId}/plans/${targetPlanId}` and `/api/workouts/${clientId}/current` at the lines above.
- Backend mount and handler: `backend/core/routes.mjs:536` mounts `clientWorkoutRoutes` at `/api/workouts`; `backend/routes/clientWorkoutRoutes.mjs:185` handles `/:userId/plans/:planId`.
- Route ownership/shadow check: the touched path resolves through the single `/api/workouts` mount above; the plan-detail handler precedes `/:userId/history` and no overlapping sibling mount was found in the narrow route walk.
- Authoritative model fields: `backend/models/WorkoutPlan.mjs:45-132` defines `id`, `userId`, `title`, `description`, `durationWeeks`, `status`, `currentWeek`, `currentDay`, and `planData` used by this response path.
- Surface classification: `ClientProgramShelf` is canonical for `/dashboard/client/overview`; the observatory `ClientTrainingPlanVaultCard` is a separate observatory widget, not a competing mount for this shelf.

### Repeated nutrition draft

- Mounted consumers: `frontend/src/components/DashBoard/workspaces/NutritionTodayPanel.tsx:149` and `frontend/src/components/DashBoard/workspaces/NutritionDiaryTimeline.tsx:150` call `repeatMacroEntryToNutritionDraft`.
- Contract implementation: `frontend/src/components/DashBoard/workspaces/NutritionTodayPanel.repeatMeal.ts` preserves the original source alias but marks Swan diary repeats as community confidence, unverified, review-required, with food confidence 0.6.

## RED evidence

- Frontend Vitest: 4 intended failures / 19 adjacent passes ? progress reported 825 and -25; repeat retained provider/0.8; template stripping returned ```` instead of interpolation code.
- Backend Vitest: 3 intended unsafe-ID failures / 5 adjacent passes ? zero/unsafe IDs reached DB and negative IDs reached access control.
- Hermes Node test: new `git -C` case failed / 9 adjacent passes.
- Mojibake guard: after syntax/scope repair, failed against real scoped source content rather than parser syntax.

## GREEN and hostile-review evidence

- Backend focused: `node .\node_modules\vitest\vitest.mjs run __tests__/clientWorkoutRoutes.planDetail.test.mjs --reporter=dot` ? 8/8 pass.
- Frontend focused: three files ? 23/23 pass.
- Scripts: Hermes 10/10 and mojibake guard 1/1 pass when run individually.
- Typecheck: `node --max-old-space-size=8192 .\node_modules\typescript\bin\tsc --noEmit` ? pass.
- Build: `npm run build` ? Vite transformed 6,747 modules and completed in 20.67s; the earlier combined process later exhausted Node heap, so typecheck was rerun independently with 8 GB and passed.
- Syntax: `node --check` passed for all changed Node routes/scripts.
- Hostile-review repairs: removed accidental history-route validation, reversed non-target encoding churn, preserved valid Unicode while decoding exactly 57 mojibake occurrences, removed the unused confidence map, and simplified now-impossible confidence branches.
- Diff hygiene: `git diff --check` passes.
- Secret scan: `scripts/scan-secrets.sh <17 changed paths>` ? 17 scanned, 0 skipped, 0 hits.

## Residuals

- No browser viewport smoke was required for the arithmetic-only progress change; the existing component interaction/ARIA suite is the direct UI contract evidence.
- No production or live-route smoke was run because this task is explicitly local-only and uncommitted.
