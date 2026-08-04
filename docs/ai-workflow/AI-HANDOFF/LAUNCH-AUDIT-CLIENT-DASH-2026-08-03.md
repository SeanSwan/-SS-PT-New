# Launch-Readiness Deep Audit — CLIENT DASHBOARD (Lane 3 of 5)

**Date:** 2026-08-03 · **Agent:** VS-Claude (Fable 5) · **Surface:** `/dashboard/client/*` (paying training clients)
**Base:** isolated worktree `c:/tmp/ss-launch-audit-lane3-20260803`, branch `claude/launch-audit-lane3-20260803`, from **origin/main HEAD `0949eaf6b`**.
**Why a worktree:** the shared tree (`wip/comms-notifications-2026-07-05`) is **1,422 commits behind origin/main** — findings and fixes must be against real main (Ground Rule 1). Commits stay local; integrator reconciles + pushes all 5 lanes.

## LAUNCH-READY: **YES** (client dashboard), with 1 cross-lane P1 handed to Lane 5 and a ranked backlog below.

The client dashboard's security posture is **strong** and its data-truth posture is **good after this lane's fixes**. No client-to-client data exposure exists. The launch-blocking-class issues found *inside this lane* (white-label leak, fake settings controls, invisible session balance) are **fixed and proven**. The one remaining P1 is a **trainer-side** access-control gap (Lane 5), not a client-facing one.

---

## Fixes shipped this lane (all in-lane, frontend-only, proven)

| # | Commit | Sev | What | Proof |
|---|---|---|---|---|
| 1 | `1b0076877` | **P1** | **White-label shell leak.** `ClientStellarSidebar` showed the SwanStudios `SS` logo mark + `SwanStudios v2.1` footer to Move Fitness clients. Now derives mark/footer from `resolveBrandIdentity(clientSource)` (canonical fail-safe resolver). + reduced-motion guard on nav animation, naked hex → palette tokens. | tsc 0, sidebar nav test pass, build ok |
| 2 | `8e1f5e5cb` | **P1** | **Fake settings controls (data-lie).** `ClientProfilePage` Fitness-Goals textarea + 3 notification toggles were fully interactive but persisted **nothing**. Backend `/api/profile` already accepts these fields — now wired with a 44px "Save Goals & Notifications" button + status; toggles seed from real saved prefs. | tsc 0, profile test pass, build ok |
| 3 | `78e0535d0` + `70673f565` | **P1** | **Sessions-remaining invisible on home.** The paying client's session balance appeared only on the Book Session page. New in-lane `ClientSessionsRemainingBanner` at the top of `/overview` using the canonical `useSessionCredits` → `/api/user/credits`. Non-deducting sources render nothing (no false balance); honest loading/error states; 44px Book CTA. | ClientHomeTab 12/12 pass, tsc 0, build ok |
| 4 | `5c44833ee` | **P1/P2** | **Dishonest error states.** `/progress` rendered `0 workouts / 0d streak` on a recap outage (indistinguishable from an inactive client) — now shows `—` on hard error. `ClientMembershipCard` vanished entirely on a transient status 500 — now shows a "couldn't load — refresh" hint. | membership + progress suites pass, tsc 0 |

**Verification (rule 73 — proven, current session):**
- `tsc --noEmit`: **0 errors** total (baseline-clean AND slice-clean, rule 56).
- vitest `client-dashboard/`: **53/54 files, 275/277 tests pass.** The only failure — `observatory/ClientObservatoryHome.profileMetrics.test.tsx` (2 tests, missing QueryClient) — **fails identically on origin/main `0949eaf6b`** (proven by re-run); it is dormant code, untouched by this lane, a **pre-existing baseline** failure.
- `vite build`: **exit 0**, 6857 modules, built in ~14s.
- Secret scan: CLEAN on all 6 commits.
- Hostile pass: caught 1 self-inflicted regression (banner's react-query broke the ClientHomeTab test with no QueryClientProvider) → fixed via hook mock → re-ran 12/12. Pass now runs dry.

---

## Flagship deliverable — IDOR / access-control sweep (client-scoped endpoints)

**Result: 0 P0, 0 client-to-client vulnerabilities.** ~95 endpoints across 26 route files reviewed. Every client-scoped endpoint routes its target id through one of four vetted, fail-closed ownership gates — `ensureClientAccess`, `verifyClientAccessByUserId` / `verifyClientAccessByPlanId` / `assertAssignmentOrAdmin`, or `authorizeResourceAccess` — all implementing **admin-bypass / self-only / trainer-requires-active-assignment** with **404-not-403** (won't leak resource existence). Independently spot-verified: `bodyMeasurementController.createMeasurement` (client forced to own id, line 107) and `getMeasurementById` (in-controller `assertAssignmentOrAdmin`, line 319). `clientAnalyticsRoutes` injects `req.params.userId = req.user.id` so 40+ chart endpoints have **no** attacker-controlled param.

### Cross-lane / shared-infra security findings (NOT fixed here — see conflicts file)

| Sev | file:line | Issue | Owner |
|---|---|---|---|
| **P1** | `backend/routes/workoutSummaryRoutes.mjs:39` | `POST /api/workout-summaries` uses `trainerOrAdminOnly` (role only) — never verifies the trainer is **assigned** to `req.body.clientId`. Any authenticated trainer can read any client's name+**email**, overwrite any `DailyWorkoutForm.clientSummary` by `formId`, and email any client. Trainer-tenant isolation break + PII (rule 8). Static-only (read-only worktree). Fix pattern exists in `workoutController.createWorkoutSession:313`. | **Lane 5 / trainer-write** (C6) — logged in `launch-audit-conflicts.md` |
| P2 | `backend/core/app.mjs` | No global `express-rate-limit`; client reads unthrottled (enumeration/DoS surface). | Shared infra — propose |
| P2 | `backend/services/sessions/session.service.mjs:769` | `GET /api/sessions/:id` grants view on `status==='available'` and the include leaks client email/phone/healthConcerns/weight/height. Benign only while available slots have `userId=null`. | Shared infra — propose |
| P2 | `backend/controllers/clientProgressController.mjs:88` | `/api/client-progress/leaderboard` returns every ranked member's firstName/lastName/username/photo to any authed user. **Likely by-design** (community leaderboard) — confirm intent. | Product decision |
| P2 | `backend/routes/aiRoutes.mjs:61-66,87-92` | Two `/api/ai/*/approve` plan-persist routes rely on in-controller role checks vs route middleware — defense-in-depth parity gap. | Backend — propose |

---

## Trainer-indispensability (server-side) — **ENFORCED, no P0/P1**

Every plan/program mutation gates `trainerOrAdminOnly` → **403** for clients (create/edit-planData/activate/primary/promote-backup/status/delete, `workoutPlanRoutes.mjs`). The client-facing plan router (`clientWorkoutRoutes.mjs`) is **read-only by design** with an explicit "do not add a write path" doctrine comment. AI write/approve paths (`aiDataWriteService.saveWorkoutPlan`, `/api/ai/*/approve`, `/api/ai-command/execute`) all reject role `client`. A client may *generate* a draft for themselves, but persist/activate (the DECIDE step) stays trainer/admin-only. **Consistent with READ+DO / never-DECIDE.**

## White-label (Move Fitness) — true state on main

- **PDFs: RESOLVED** (memory note "code does the opposite" is **stale**). `resolveWorkoutPlanPdfBrand` / `resolveBrandIdentity` return Move Fitness branding for `clientSource==='move_fitness'`, fail-safe to SwanStudios; server derivative worker + progress-report button both wired. An MF client's plan/progress PDF shows Move Fitness only.
- **Dashboard shell: was leaking (P1) → FIXED this lane** (`ClientStellarSidebar` mark + footer, commit 1). **Residual:** a broad `rg "SwanStudios"` sweep across all client dashboard chrome (top bar, empty-states, the shared `ClientDashboardHome` top-nav) is recommended before launch — this lane fixed the sidebar concretely but did not exhaustively enumerate every hardcoded string.

---

## SHARED-INFRA PROPOSALS (propose-only — integrator/owning-lane applies; C4)

These live in the **UserDashboard subtree (Lane 1)** or shared backend and were NOT edited by this lane:

1. **Fabricated `#SwanStudios` trending tag** — `frontend/src/components/UserDashboard/components/ClientDashboardHome.railSections.tsx:52` renders a hardcoded `{ name: 'SwanStudios', count: 0 }` pill under "Trending tags" when the API returns empty/error. A fake trending tag presented as real (data-truth). *Fix:* render nothing (or an honest empty state) when `trendingTags.length === 0`.
2. **"Not available" hero tiles** — `ClientDashboardHome.viewModel.ts:108,215,218` leads the premium home with Average Heart Rate / Strength Score / Recovery = "Not available". *Fix:* hide un-sourced metrics until data exists (or replace with real logged-data metrics).
3. **Hardcoded `WEEKLY_GOAL = 5` / `45min`** — `ClientDashboardHome.viewModel.ts:11-12,212` measures the weekly-progress ring against a constant, presented as *the client's* goal. *Fix:* source from the client's assigned plan.
4. **Duplicate top nav in embedded mode** — `ClientDashboardHome.tsx:32` renders `<ClientTopNavigation>` unconditionally, so the embedded `/overview` shows the sidebar AND a second full top-nav. *Fix:* suppress `ClientTopNavigation` when `embedded`.
5. Backend P2s from the security table above (global rate limiter, available-session PII guard, AI-approve route-middleware parity).

## Enhancement backlog (ranked by launch impact)

| Rank | Item | Where | Note |
|---|---|---|---|
| 1 | Cross-lane P1: workout-summaries trainer isolation | Lane 5 backend | real access-control break |
| 2 | Fabricated trending tag + "Not available" hero tiles | Lane 1 shared home | data-truth on the money surface |
| 3 | Broad `rg "SwanStudios"` white-label sweep of remaining chrome | client + shared | finish the white-label job |
| 4 | Global rate limiter | backend shared | enumeration/DoS hardening |
| 5 | Degraded 1-tap "today's workout" paths drop `assignmentKey`/`assignmentType` (sidebar `:59`, quick action `:171`) — loads wrong session | shared home | self-documented bug |
| 6 | ~1,900 LOC dormant client code (observatory/, progress/ClientProgressPanel, schedule/ClientSessionHistory, MCP hooks) + baseline observatory test failure | hygiene | Rule 32-39 cleanup pass |
| 7 | `notifPrefs` toggles could add `aria-pressed`; MF footer wordmark length; banner in view-as shows viewer balance | client polish | P3 |

## Surface facts (Canonical Surface Receipt)
- Mount: `main-routes.tsx:929` → `ProtectedRoute[admin,trainer,client]` → `UniversalDashboardLayout` → `shellPieces.tsx:95-110` maps `roleConfigurations.client.routes` (`UniversalDashboardLayout.routes.tsx:213-238`). Default landing `/overview`. 21 mounted routes, 15 nav links all resolve, **zero mock-data-as-truth** in the client-dashboard dir.
- `/client-dashboard` + `/client-dashboard-legacy` = dead-alias redirects. `WORKOUT_VIEW_HOME_BY_ROLE` (main-routes.tsx:306) is a legacy `/workout` bookmark absorber, **not** the default landing (verified — not a drift bug).

## Files changed this lane
```
frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.nav.styles.ts
frontend/src/components/DashBoard/Pages/client-dashboard/ClientStellarSidebar.styles.ts
frontend/src/components/DashBoard/Pages/client-dashboard/ClientMyWorkoutsStyles.ts
frontend/src/components/DashBoard/Pages/client-dashboard/ClientProfilePage.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/ClientSessionsRemainingBanner.tsx  (new)
frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.test.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.tsx
frontend/src/components/DashBoard/Pages/client-dashboard/ClientMembershipCard.tsx
```
Commits: `1b0076877`, `8e1f5e5cb`, `78e0535d0`, `5c44833ee`, `70673f565` (all `audit(lane-3-client):`, local, unpushed).

## Post-task hygiene (rule 38)
New artifact: this file. New runtime file: `ClientSessionsRemainingBanner.tsx` (wired + tested). No temp/screenshot/log artifacts. Worktree + junctioned `node_modules` are outside the repo (`c:/tmp`).
