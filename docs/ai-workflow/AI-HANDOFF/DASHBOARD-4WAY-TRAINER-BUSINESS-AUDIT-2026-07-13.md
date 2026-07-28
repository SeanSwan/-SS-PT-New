# Dashboard 4-Way Audit + Trainer Business Layer — 2026-07-13

**Scope:** user dashboard · client dashboard · trainer dashboard · admin dashboard · money/session backend, audited to answer: *what does each surface need to reach the next level, and what do trainers need to run their book of business on SwanStudios (rev-share and employed compensation models)?*

**Evidence base:** fresh worktree of `origin/main` @ `85c395ab4` at `C:/tmp/sspt-dash-audit-20260713` (the wip tree this doc lives on is ~557 commits behind main — do NOT audit against it). Four parallel read-only explorers; all file:line citations below are `[VERIFIED]` against that worktree. No runtime code was touched.

**Consumer:** hand §7 (the Builder Prompt) to the executing agent. §§1–6 are its evidence appendix.

---

## 1. Verdict up front

1. **The coaching product is real.** The client log→charts→share loop closes end-to-end with live data, and the trainer coaching tools (roster, logging FOR a client, voice, plan builder, 12 real charts, schedule, at-risk intervention queue) are all wired to real APIs. This is not a mock app.
2. **The trainer BUSINESS layer is the missing floor.** A complete `TrainerCommission` ledger + `CommissionService` + admin payout API already exist on main and fire on every Stripe sale — but there is **zero frontend consumer** (`grep '/api/commissions' frontend/src` = 0 hits). Trainers can't see a dollar they earned; admin can't see per-trainer revenue or mark payouts. This is the single highest-ROI build: the backend is ~done.
3. **Rev-share mode (a) is ~80% built; employed mode (b) is 0% built.** Percentage-of-gross at purchase exists (15/85 independent, 35/65 hired, lead-source discounts). Flat $50/completed-session does not: session completion is financially decoupled from trainer pay (`sessions_consumed` is written once as 0 and never incremented).
4. **Two security holes and one silent-data-loss bug should ship before any of it** (§5).

---

## 2. Surface map (canonical mounts)

| Surface | URL | Mount evidence | Notes |
|---|---|---|---|
| USER dashboard (social "Observatory") | `/user-dashboard/:tab` | `frontend/src/routes/main-routes.tsx:736-754` | Any authenticated role; distinct from client dash |
| CLIENT dashboard | `/dashboard/client/*` | `main-routes.tsx:870-879` → `UniversalDashboardLayout`; client config `UniversalDashboardLayout.routes.tsx:188-213` | role `user` normalized to `client` (`UniversalDashboardLayout.tsx:63-64`) |
| TRAINER dashboard | `/dashboard/trainer/*` | same layout; trainer config `routes.tsx:158-187` (26 routes); sidebar `TrainerStellarSidebar.tsx:54-95` | `defaultPath: '/schedule'` (routes.tsx:186) |
| ADMIN dashboard | `/dashboard/admin/*` | same layout; admin config `routes.tsx:98-157` (55 routes); sidebar `config/dashboard-tabs.ts:504-563` (27 items) | default `/master-schedule` |

Data verdicts: client/trainer/admin sections are overwhelmingly REAL-data (hooks → live APIs). Known exceptions: `useChallenges` demo fallback (`useChallenges.ts:31,46,123`), unused `MOCK_CATEGORIES` landmine (`WorkoutsTabData.ts:35`), Security workspace partial-mock (`dashboard-tabs.ts:399`), trainer performance stats stubbed server-side (§3.2).

Core loop trace (client): `WorkoutLogger` → `POST /api/workout-forms` (`nasmApiService.ts:686-714`) → fires `WORKOUT_LOGGED_EVENT` → `CanonicalProgressChartsGrid` auto-refetches 12 real charts `/api/client/analytics/chart-*` (`useClientProgressCharts.ts:30-41`; refetch `CanonicalProgressChartsGrid.tsx:64-67`) → `SaveSuccessPanel` PR/streak beat → "Share to feed" → `POST /api/social/posts` (`shareWorkoutPost.ts:74-88`). **The loop closes.**

## 3. The trainer business layer (the money thesis)

### 3.1 What already exists (backend, on main, live)
- **Ledger:** `backend/models/TrainerCommission.mjs` — orderId/trainerId/clientId/packageId, `leadSource` (platform|trainer_brought|resign), gross/tax/net, businessCut/trainerCut, rates, `sessionsGranted`/`sessionsConsumed`, `paidToTrainerAt`/`payoutMethod`/`payoutReference`.
- **Auto-attribution on every Stripe sale:** `stripeWebhook.mjs:394-406` → `CommissionService.createCommissionForPurchase` (`CommissionService.mjs:45-156`) via the client's active `ClientTrainerAssignment`.
- **Split math:** `commissionCalculator.mjs:49-88` — independent 15/85, hired 35/65, `trainer_brought` −5% business, `resign` −3%, floor 5%, loyalty bump +5% (gated >100 sessions). ⚠ Three files document three different rate sets (migration header 55/45; calculator comment 10/90; service comment 15/35) — **code is truth**.
- **Admin payout API (mounted, `/api/commissions`):** `GET /summary`, `GET /trainer/:trainerId` (**self-authorized for trainers**, `commissionRoutes.mjs:170-238`), `POST /mark-paid`, `GET /payout-report` (`backend/core/routes.mjs:658`).

### 3.2 What's missing
- **Frontend: everything.** No trainer earnings page, no admin commission/payout console, no sidebar entries. `/api/admin/finance/trainers` hard-stubs `monthlyRevenue: null, source:'not_tracked'` (`adminFinanceRoutes.mjs:864-871`) instead of aggregating `TrainerCommission` — so admin trainer-performance cards render zeros (`EnhancedTrainerDataManagement.tsx:824-844`).
- **Mode (a) rev-share reachability:** Stripe path hardcodes `leadSource:'platform'` and `taxAmount: 0` (`stripeWebhook.mjs:401,404`), so the trainer-brought tier is only reachable via admin grant. `trainerType` validates `['affiliated','independent']` (`User.mjs:264-270`) but the calculator branches on `'independent'` vs fall-through — affiliated/null works "by accident". Commission creation is fire-and-forget (errors swallowed, `CommissionService.mjs:146-155`); no-assignment-at-purchase ⇒ silently no commission, no backfill.
- **Mode (b) employed $50/session: absent.** No flat-rate field in `ClientTrainerAssignment` (`.mjs:56-160`), `TrainerPermissions` (`.mjs:112-187`), or `Session` (`.mjs:26-328`); `User.hourlyRate` (`User.mjs:259`) is never read by any pay code. Session completion (`sessionDeductionService.mjs:124-195`, `sessionCompletionBillingPolicy.mjs`) never touches trainer pay; `sessions_consumed` is only ever written as 0 (`CommissionService.mjs:124`, `creditsController.mjs:184`).
- **Trainer autonomy ("admin of their own area"):** trainer cannot onboard/invite a client (`clientHubAudience.ts:53` `canManageAccounts:false`; assignment-create adminOnly `clientTrainerAssignmentRoutes.mjs:703`), cannot allocate/sell sessions (`SessionAllocationManager` admin-only), cannot offer deals (`AdminSpecial.mjs` has no trainerId), has no notes/photos tools, no outreach for their at-risk clients, and no "My Book" business overview (Home KPIs are today-only).

## 4. Per-surface top gaps (condensed)

**Trainer:** ① no earnings view (backend done) ② no client onboarding/invite ③ no session top-up/selling ④ no My-Book business overview ⑤ lands on `/schedule` not Home ⑥ `TrainerPermissions` flags not enforced in UI ⑦ no notes surface ⑧ no progress-photo tool ⑨ 8 routes URL-only (assessments, challenges, body-map, video-call, sprint-planner, live, creators) ⑩ no re-engagement action off the at-risk queue.

**Admin:** ① no commission/payout console ② per-trainer revenue `'not_tracked'` stub ③ trainer performance = zeros ④ no "who trained this week / celebrate wins" roster feed (stale-detection exists: `ClientComplianceDashboard.tsx:94`) ⑤ high-value tools sidebar-orphaned (trainer-mgmt, assignments, permissions, session-allocation, automation, sms-logs) ⑥ duplicate legacy surfaces (user-mgmt ×2, trainer-mgmt ×2, deprecated `ADMIN_DASHBOARD_TABS`, orphan `DashboardRoutes.tsx`, two `/trainers` endpoints with different shapes) ⑦ no dedicated notifications tab despite full `adminNotificationsRoutes.mjs` backend.

**Client/User:** ① four progress-chart renderers over one dataset (Canonical grid / WorkoutsTab / NASMProgressCharts / AdminProgressChartsGrid) ② competing `/workout` `WorkoutDashboard` surface still mounted (`main-routes.tsx:808-827`) ③ sidebar hides ~8 routable client sections ④ demo-challenge fallback can silently render on Home ⑤ share CTA self-mode-only — trainer-logged sessions produce no shareable milestone (`SaveSuccessPanel.tsx:189-192`) ⑥ possible duplicate feed post (manual share + `socialAutoPost.mjs`, `shareWorkoutPost.ts:10-15`).

## 5. Ship-first flags (security + data loss)

1. **`/emergency-admin` has NO auth gate** — `EmergencyDashboard` mounts outside `ProtectedRoute` (`main-routes.tsx:716-723`). Public admin surface.
2. **`admin-route.tsx:11-18` dev auth bypass** — renders admin children unconditionally in dev and writes `bypass_admin_verification` localStorage flags. Delete/harden before multi-trainer accounts.
3. **Order model↔DB drift = silent attribution loss.** Migration `20260101000003-extend-orders-table.cjs` added `trainer_id/lead_source/business_cut/trainer_cut/...` but `Order.mjs` declares none of them (no `underscored:true`); `creditsController.mjs:141-160` passes them to `Order.create` and Sequelize **silently drops them** (and `status:'pending_payment'` isn't in the model enum). `trainer_commissions` is currently the only reliable ledger.
4. Session completion is fail-open to no-deduct unless `SESSION_COMPLETION_SERVER_BILLING_ENABLED='true'` (`sessionCompletionBillingPolicy.mjs:7-15,28`) — known Sean-gated Render flag, restated because trainer pay will hang off completion events.

---

## 6. Ranked build plan

**P0 — Trust floor (small, ship first):** gate `/emergency-admin`; remove `admin-route.tsx` bypass; reconcile `Order` model with DB columns (schema cross-check per Rule 29); align the three contradictory rate-doc comments to code.

**P1 — Trainer business layer (the revenue thesis):**
1. **Trainer "My Earnings" page** consuming existing `GET /api/commissions/trainer/:trainerId` (earned/unpaid/paid, per-client, lead-source badges) + sidebar entry. Zero new backend.
2. **Admin "Trainer Payouts" console** consuming `/summary`, `mark-paid`, `payout-report`; replace the `finance/trainers` `'not_tracked'` stub with a `TrainerCommission` aggregation → fixes trainer performance zeros too.
3. **Compensation modes:** add `compensationMode` (`revenue_share` | `per_session_flat`) + `flatSessionRate` (per trainer or per assignment); per-completed-session accrual written at session completion (increment `sessions_consumed`, create earning row); make `leadSource` settable on the Stripe path; set independent trainers' `trainerType` correctly; make commission-creation failures alert admin instead of warn-log. **Money-path: plan-gate, migrations need Sean's explicit approval, Tier-B review minimum (Rule 16/50).**
4. **Trainer client onboarding:** invite/create own client (admin-approval option), trainer-scoped assignment creation, so a trainer can grow their book without paging Sean.
5. **Trainer "My Book" overview:** active clients, sessions sold vs consumed, revenue, unpaid balance, at-risk — one screen.

**P2 — Coaching & coherence:** admin "who trained this week / celebrate" feed · trainer default landing → overview · surface hidden routes in both sidebars (or prune) · trainer notes + progress photos (scoped) · re-engagement action on the at-risk queue · enforce `TrainerPermissions` flags in trainer UI · consolidate the four chart renderers · retire `/workout` surface + legacy ×2 admin pages + deprecated tab config (Rule 34: propose-then-approve) · fix demo-challenge fallback + duplicate-share + trainer-logged share CTA.

---

## 7. THE BUILDER PROMPT (hand this to the executing agent)

> **Mission: SwanStudios Trainer Business Layer + 4-Dashboard Next-Level pass.**
>
> You are building on `origin/main` (audit baseline `85c395ab4`). Branch from fresh main; verify freshness first (`git rev-list --left-right --count origin/main...HEAD`). Read `docs/ai-workflow/AI-HANDOFF/DASHBOARD-4WAY-TRAINER-BUSINESS-AUDIT-2026-07-13.md` §§1–6 — it is your evidence base; every claim there carries file:line receipts, so do NOT re-derive the audit. Honor CLAUDE.md rules throughout (26 receipt before UI/data fixes, 29 schema cross-check on any model touch, 58 drift detection, 42 pre-push backend audit, 67 lane coordination, styled-components only, 44px targets, Crystalline Swan tokens via swan-design-router).
>
> **Business context:** SwanStudios monetizes trainers two ways. (a) *Independent trainers* bring their own clients and the platform keeps ~10–15% of their gross — the `TrainerCommission` backend already computes this at purchase. (b) *Employed trainers* are paid a flat per-session rate (~$50) while the client pays full price (~$175) — this mode does not exist yet. Trainers must be able to run their own book (onboard clients, see money, act on at-risk clients) without the owner-admin in the loop, while the owner keeps global control and visibility.
>
> **Execute in this order, one reviewable slice each, committing per slice and pushing once at batch end (Rule 70):**
>
> **P0 (ship-first trust floor):**
> 1. Wrap `/emergency-admin` in `ProtectedRoute allowedRoles={['admin']}` (`main-routes.tsx:716-723`) and delete the `admin-route.tsx` dev bypass. Regression-test the gate.
> 2. Reconcile `Order.mjs` with the real DB columns from migration `20260101000003` (trainer_id, lead_source, business_cut, trainer_cut, sessions_granted, `pending_payment` enum...). Rule 29 drift table required; confirm `creditsController.mjs` writes actually persist.
>
> **P1 (trainer business layer):**
> 3. **Trainer Earnings page** at `/dashboard/trainer/earnings` consuming existing `GET /api/commissions/trainer/:trainerId` (self-authorized already): total earned / unpaid / paid, per-client rows, lead-source + rate badges, payout history. Add sidebar entry under a new BUSINESS section. Zero new backend.
> 4. **Admin Trainer Payouts console** at `/dashboard/admin/trainer-payouts` consuming `GET /api/commissions/summary`, `POST /api/commissions/mark-paid`, `GET /api/commissions/payout-report`. In the same slice, replace the `'not_tracked'` stub in `adminFinanceRoutes.mjs:864-871` with a `TrainerCommission` aggregation so trainer performance cards stop rendering zeros.
> 5. **Compensation modes (money-path — plan first, get Sean's explicit approval on the migration before writing it):** `compensationMode` enum + `flatSessionRate` on `ClientTrainerAssignment` (fallback to `User`), per-completed-session earning accrual hooked into the session-completion path (`sessionDeductionService` / `sessionCompletionBillingPolicy`), increment `sessions_consumed`, make `leadSource` settable through Stripe checkout metadata, alert admin on commission-creation failure instead of swallowing. Respect `SESSION_COMPLETION_SERVER_BILLING_ENABLED` semantics; write failing regression tests first.
> 6. **Trainer client onboarding:** trainer-initiated client invite/create for their own book (flip `canManageAccounts` for trainer audience with scoped safeguards, add a trainer-scoped assignment-create endpoint with optional admin-approval gate). The trainer must never see or touch another trainer's clients — verify the assignment scoping on every new endpoint.
> 7. **Trainer "My Book" overview** on trainer Home: active clients, sessions sold vs consumed, revenue + unpaid, at-risk count (reuse `/api/admin/compliance/at-risk`, already trainer-scoped). Change trainer `defaultPath` from `/schedule` to `/overview`.
>
> **P2 (pick up in order if time remains):** admin "who trained this week / celebrate wins" feed · surface sidebar-orphaned routes on trainer + admin (or propose pruning — Rule 34, no deletions without approval) · trainer notes + progress-photo tools scoped to assigned clients · re-engagement action (message/nudge) on the intervention queue · enforce `TrainerPermissions` flags in trainer UI visibility · consolidate progress-chart renderers on `CanonicalProgressChartsGrid` · fix `useChallenges` demo fallback, duplicate workout-share, and trainer-logged share CTA.
>
> **Definition of done per slice:** failing-test-first where feasible; real caller path verified; Rule 26 receipt for any UI/data-truth change; hostile self-review (Rule 61) before reporting; mobile check at 414px on any client-management surface; Rule 42 backend audit before push. Anything touching billing/Stripe/payout math is high-stakes: propose Tier-B/Tier-C review and wait for Sean's go before migrating or changing money math. Rate truth = `commissionCalculator.mjs` code, not its comments.

---

*Author: Claude (Fable 5) · read-only audit, 4 parallel explorers · worktree `C:/tmp/sspt-dash-audit-20260713` (removable via `git worktree remove`) · lane: SESSION-DASH-4WAY-AUDIT*
