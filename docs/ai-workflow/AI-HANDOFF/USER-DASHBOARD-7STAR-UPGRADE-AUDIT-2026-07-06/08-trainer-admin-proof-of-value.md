# 08 — Trainer + Admin Proof-of-Value Surfaces (7-Star Upgrade Audit)

> Audit baseline: origin/main @ `87680741e` (worktree `c:/tmp/ss-audit-20260706`), 2026-07-06.
> Scope: the coaching-loop views that are NOT the just-shipped Client Command Center
> (see `CLIENT-COMMAND-CENTER-SESSION-Q-HANDOFF-2026-07-05.md` — Training-tab modes, chart
> insight bars, AdminBodyCompPanel, and trainer parity at `/dashboard/trainer/clients` are
> SHIPPED and out of scope here). Focus: (a) stale-client detection + exceptions,
> (b) celebration/share pipeline, (c) roster adherence rollups, (d) admin proof-of-value
> data truth. All paths are repo-relative. No PII — IDs/roles only.

---

## 1. Canonical Surface Receipt (what actually mounts)

| # | Surface | Evidence |
|---|---------|----------|
| R1 | Admin route registry + landing | `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:92-148`. **Admin `defaultPath` = `/master-schedule`** (`:148`, test-locked at `UniversalDashboardLayout.routeRegistry.test.ts:44`) — admin does NOT land on the proof-of-value overview. [VERIFIED] |
| R2 | Admin `/overview` ("Command Center") | routes.tsx:95 → `RevolutionaryAdminDashboard` (lazy at `UniversalDashboardLayout.routeComponents.tsx:17`) → JSX mounts `AdminOverviewPanel` at `Pages/admin-dashboard/admin-dashboard-view.tsx:43`. [VERIFIED] |
| R3 | Stale-client detection (the ONLY mounted one) | `AdminOverviewPanel.tsx:250` mounts `ClientComplianceDashboard` → `GET /api/admin/compliance/at-risk` (`components/ClientComplianceDashboard.tsx:94`) → `backend/routes/adminComplianceRoutes.mjs:45` (mounted `backend/core/routes.mjs:517`) → real SQL in `backend/utils/adminComplianceHelpers.mjs:6-100` over `"Users"` + `workout_sessions`. [VERIFIED] |
| R4 | Trainer home | routes.tsx:152 → `TrainerHomeTab` (`Pages/trainer-dashboard/TrainerHomeTab.tsx`) ← `useTrainerTodaySessions` → `GET /api/sessions?startDate=&endDate=` (`hooks/useTrainerTodaySessions.ts:244`). Trainer `defaultPath` = `/schedule` (routes.tsx:176). [VERIFIED] |
| R5 | Coach-voiced Next-Best-Action (EXTEND, never rebuild) | `backend/routes/analyticsRoutes.mjs:164` `GET /api/analytics/:userId/next-best-action` → `backend/services/nextBestActionService.mjs` (`coachify` :154-183). Exactly 2 mounted consumers: client `ProgressPulsePanel` (on `ClientProgressDashboardPage`) and admin `ClientNextBestActionCard.tsx:107` mounted by `admin-client-progress-view.V2.tsx:60` (route `/dashboard/admin/client-progress-tracking`, routes.tsx:105). [VERIFIED] |
| R6 | Celebration/share, client side | `progress-proof/ProgressChartActionBar.tsx:258` wires `shareProgressCardToFeed` → `POST /api/social/posts` type `milestone` (`progress-proof/progressSocialShare.ts:33-35`). [VERIFIED] |
| R7 | Celebration/share, staff side | `workspaces/clients-team/tabs/AdminProgressChartsGrid.share.tsx:74-86` opens `ProgressChartStudio` **without** `onShareToFeed` → staff get PNG download ONLY, no feed post, no consent flow. [VERIFIED] |
| R8 | Auto-celebration on workout save | `backend/services/socialAutoPost.mjs` exports `createWorkoutAutoPost`:28 / `createStreakAutoPost`:73 / `createAchievementAutoPost`:112; called from `awardWorkoutXPSupport.mjs:280-289` and `workout/workoutLogService.mjs:398-405`. Visibility hardcoded `'public'`, no consent/preference check found (grep for autoShare/shareConsent/optIn in `User.mjs` + `SocialPost.mjs` = 0 hits). [VERIFIED] |
| R9 | Swan Coach per-client brief | `backend/services/ai/dispatchers/briefClientDispatcher.mjs:14` (`STALE_DAYS = 7`) builds attention flags (staleness, active pain, low credits) for "brief me on client X". [VERIFIED] |

---

## 2. Current-State Map

### Canonical (mounted, real data)
- `AdminOverviewPanel.tsx` + its 20 widgets — most have `.truth.test.ts` locks (a data-truth pass already ran). Sections: mission-critical queues (:208-213), platform pulse (:239-242), ops (:250-253), community safety (:261-264), business lens (:272-274). [VERIFIED]
- `ClientComplianceDashboard.tsx` ("Needs Attention") — risk chips critical/warning/watch, 7d/30d compliance bars, days-since badge, low-credit badge. [VERIFIED]
- `BusinessKPIDashboard` → `GET /api/admin/analytics/business-kpis` (`adminComplianceRoutes.mjs:73-167`, admin-only, real SQL over orders/Users/sessions). [VERIFIED]
- Admin top metrics → `/api/admin/analytics/statistics/{revenue,users,workouts,system-health}` (`backend/routes/admin/analytics*Routes.mjs`, mounted core/routes.mjs:494-496; real Sequelize counts, see §3 caveats). [VERIFIED]
- `TrainerHomeTab.tsx` — today's sessions + real KPI strip (clients today / sessions / hours / completion) + next-actionable-session card. All today-scoped; zero roster-health content. [VERIFIED]
- `EnhancedClientProgressView` (trainer `/client-progress`, routes.tsx:155) → `/api/workout-forms/client/:id/{info,progress}`; sub-widgets Comparison/InjuryRisk/Goals → `/api/client-progress/:clientId/*` → real DB (`backend/controllers/clientProgressController.mjs:129-221`). [VERIFIED]
- `measurementMilestoneService.mjs` — milestone detection runs on measurement save (`bodyMeasurementController.mjs:154,377`). [VERIFIED]

### Dormant (exists, zero mounted consumers) — all candidates for Rule-34 cleanup or revival
- `HighRiskClientsWidget.tsx` — no importer; calls `/api/admin/reports/compliance` which does NOT exist in backend. [VERIFIED]
- `TopTrainersWidget.tsx` — no importer; calls `/api/admin/reports/trainer-performance` which does NOT exist. [VERIFIED]
- `ClientActivityWidget.tsx` — no importer. [VERIFIED]
- `Pages/admin-dashboard/components/adminReportsController.mjs` — a BACKEND controller stranded inside the frontend components dir (imports `../models/index.cjs` which cannot resolve there). Pure hygiene debt. [VERIFIED]
- `Pages/admin-clients/AdminClientManagementView.tsx` + `EnhancedAdminClientManagementView.tsx` (with `AIInsightsPanel`, `ClientAnalyticsPanel`) — zero route consumers → the backend BFF endpoints `/api/admin/ai-bff/command-center` (`aiBffRoutes.mjs:145`, aggregates dashboard-stats + at-risk + KPIs + signups) and `/client-summary/:clientId` (:184) have NO mounted frontend consumer. Dormant aggregation engine. [VERIFIED]
- `getMilestonesNeedingRenewal` / `markRenewalConversation` (`measurementMilestoneService.mjs:342-363`) — zero callers outside the service. The retention-critical "milestone → renewal conversation" queue never reaches any UI. [VERIFIED]
- `MyClientsView` — dormant per SESSION-Q handoff (kept per Rules 27/34; do not delete without Sean's approval).

### Stub (mounted but serves empty structure)
- `AutomatedCheckInsWidget` (AdminOverviewPanel.tsx:251) → `GET /api/admin/check-ins/dashboard` returns hardcoded `{checkIns:[],habits:[],triggers:[]}` (`adminComplianceRoutes.mjs:173-186`). Honest-empty, but a permanently dead feature occupying prime ops real estate. [VERIFIED]

---

## 3. Data-Truth Check (real vs decorative, with drift flags)

1. **Trainer Data Management stats are permanently zero (decorative).** `/dashboard/admin/trainer-management` (routes.tsx:99 → `Pages/admin-trainers/EnhancedTrainerDataManagement.tsx`) computes "Avg Rating", "Monthly Revenue", "Total Clients" from `t.averageRating`/`t.clientCount`/`t.monthlyRevenue` (:830-836, stat cards :886-915, per-trainer "N clients • N sessions" :1216) — but the backend `GET /api/admin/trainers` returns raw User rows (`adminRoutes.mjs:44-59`) and `models/User.mjs` has NONE of those fields (grep = 0). Renders 0.0 / $0 / 0 forever. [VERIFIED]
2. **"Workout Completion" on admin overview is scheduled-session completion, not workout-log truth.** `generateWorkoutStatistics` counts the `sessions` table (`backend/services/adminUserAnalyticsService.mjs:100-152`), yet the card says "Average workout completion rate" (`AdminOverviewPanel.tsx:117-123`). Mislabel, not mock. [VERIFIED]
3. **Synthetic target line:** users statistics `target: Math.round(totalUsers * 1.1)` (`backend/routes/admin/analyticsUserRoutes.mjs:146`) — a made-up goal presented as a target. [VERIFIED]
4. **BusinessKPI partial truth:** `revenueChange: 0` hardcoded and `revenueSparkline/clientSparkline: []` (`adminComplianceRoutes.mjs:149,159-160`) — change chips/sparklines can render as flat/empty truth-gaps. [VERIFIED]
5. **Dead intervention buttons — the exceptions loop dead-ends at the last click.** `ClientComplianceDashboard.tsx:216-218`: the "Send check-in" and "View profile" buttons have NO onClick (only refresh/filter/retry handlers exist in the file, :127,:134,:167). Admin can SEE who is stale but cannot ACT from the widget. [VERIFIED]
6. **AdminSignalBar is static copy, not live counts.** `overview/AdminSignalBar.tsx:25-44` hardcodes label/detail text ("Intakes, waivers, payments") as anchor links — no fetched counts. Decorative navigation, not signal. [VERIFIED]
7. **Trainer 403 shadow-gate makes trainer at-risk scoping dead code.** `adminRoutes.mjs:30-31` (`router.use(authenticateToken); router.use(authorizeAdmin)`) is mounted at core/routes.mjs:434, and `adminClientRoutes.mjs:290-291` (`authorize(['admin'])`) at :438 — both BEFORE `adminComplianceRoutes` (:517) whose own gate is `authorize(['admin','trainer'])` (:38) and whose query has a trainer-scoped join (`adminComplianceHelpers.mjs:8-19`). Non-admin requests to ANY `/api/admin/*` are rejected upstream → trainers can never load at-risk data. [HYPOTHESIS — high confidence from source; Rule 55 requires the supertest probe already planned in SESSION-Q handoff §4.1 before code lands.]
8. **Three competing staleness/adherence definitions (truth drift):** (a) `adminComplianceHelpers.mjs:54-77` — targets 3 workouts/7d and 12/30d, critical >10d, warning >5d, watch >3d; (b) `progressPulseService.mjs:31` — `WEEK_TARGET_DAYS = 2` and NBA gap trigger at 7d (`nextBestActionService.mjs:72`); (c) `briefClientDispatcher.mjs:14` — `STALE_DAYS = 7`. A client on a 2-day/week plan reads 67% "compliance" in the at-risk widget while the NBA engine calls the same week healthy. None are plan-aware (`WorkoutPlan` has no daysPerWeek; per-week `WorkoutPlanDay` rows are countable). [VERIFIED]
9. **Auto-posts have zero consent surface.** `socialAutoPost.mjs:44-46` hardcodes `visibility:'public'` with no user preference check. Trust-surface gap (Rule 62: consent is a product surface). [VERIFIED]
10. Real-and-healthy (for the record): orientation queue (`/api/orientation/all`), waivers (`/api/admin/waivers`), pending payments, cancelled sessions, upcoming measurement checks (`bodyMeasurementRoutes.mjs:52`), signup monitoring (`/api/admin/dashboard-stats`), activity feed (`/api/gamification/activity-feed` → served by `gamificationV1Routes` via the legacy-path mount at core/routes.mjs:418). [VERIFIED]

---

## 4. Vision Gap Analysis

**7-star for this domain:** the admin/trainer opens their dashboard and, without hunting, sees: who trained yesterday, who is going stale (ranked), who needs intervention TODAY (with one-tap act), what adherence looks like across the whole roster, and which client wins are ready to celebrate into the community — with client consent — in two taps. Coach responsiveness is itself a measured KPI.

**Today:**
- Stale detection EXISTS and is real (a genuine strength) but is buried: admin lands on `/master-schedule`, must click Command Center, scroll past 2 sections to the 3rd ("Client and Trainer Operations") to reach "Needs Attention" — then the action buttons do nothing (§3.5).
- Trainers have NO stale/at-risk view at all (§3.7): TrainerHomeTab is today-only; the trainer roster cards show "Last logged" (`clientCardReadiness.ts:67-71`) but the roster filter is account-lifecycle only (`clientStatusFilter.ts:20-26` — all/active/deactivated/unclaimed/invited; no activity filter, no risk sort).
- Celebration: clients can self-share proof cards; staff can only download a PNG (§R7). The NBA ladder already emits `celebrate_streak` ("A shout-out or share nudge reinforces it", `nextBestActionService.mjs:176-177`) but it is advisory text with `cta:null`. Milestone detection fires on measurement save, but the renewal-conversation queue — the explicitly retention-critical piece (service header: "40-60% improvement") — is dormant plumbing (§2).
- Roster adherence rollup: nothing. The at-risk endpoint returns only the exception list (at-risk-only, LIMIT 50); no roster-wide trained-this-week %, no per-trainer rollup, no trend.
- Coach response time: messages infra exists (`messages` + `conversation_participants` tables, `messagingConversationQueries.mjs:9-18`) but no metric anywhere.

---

## 5. Ranked Upgrades (P0 → P3)

**P0-A — Wire the dead intervention buttons.** What: give `ClientComplianceDashboard` rows real actions — "View" deep-links to Client Hub (`/dashboard/admin/client-management?clientId=<id>`), "Send check-in" opens messages with the client conversation. Why: completes the see→act loop of the Core Loop's "next best training action" for the coach. Value: highest of the domain — the intel already exists, only the last click is missing. Effort: S. Acceptance: tapping each button navigates with the client preselected; test locks onClick presence. Click delta: impossible → 1 tap.

**P0-B — Trainer at-risk visibility (SEQUENCED BEHIND the active auth slice).** What: after the `/api/admin` router-order fix lands (SESSION-Q handoff §4.1 — an ACTIVE named next-slice; do not fork it), mount a trainer-scoped "Needs Attention" card on `TrainerHomeTab` (the helper's trainer join at `adminComplianceHelpers.mjs:8-19` already scopes to `client_trainer_assignments`). Why: trainers are the intervention arm; today only the admin sees staleness. Effort: M (frontend S + auth slice owned elsewhere). Acceptance: trainer login sees only assigned at-risk clients; supertest proves trainer 200 + admin parity; non-assigned clients never appear. Click delta: today impossible → 0 taps (on landing-adjacent home).

**P0-C — One adherence/staleness truth.** What: extract a single shared definition (extend `adminComplianceHelpers.mjs`, parameterized by plan-aware weekly target = COUNT of current-week `WorkoutPlanDay` rows when an active `WorkoutPlan` exists, else default 2 to match `WEEK_TARGET_DAYS`) and consume it from the at-risk query, `progressPulseService`, and `briefClientDispatcher`. Why: the same client must not be "67% compliant" and "healthy streak" simultaneously — data-truth rule. Effort: M. Acceptance: one module exports thresholds; all three call sites import it; unit tests lock the ladder; drift test fails if a surface hardcodes its own target.

**P1-A — Consent-gated staff celebration pipeline.** What: (1) add `onShareToFeed` to `AdminProgressProofShare` gated on a new client consent flag (e.g. `User.shareCelebrationsConsent`, default OFF, editable in client profile + onboarding); (2) post attributes the CLIENT (type `milestone`) with a "celebrated by your coach" frame, or falls back to "nudge client to share" (sends the client a prefilled share prompt) when consent is absent; (3) turn the NBA `celebrate_streak` coach card into a CTA that opens this flow. Why: makes milestones shareable community proof — the final beat of the Core Loop — without trust damage. Effort: M. Acceptance: no staff share possible without consent flag; consent revocation blocks future posts; audit trail on the post row. Click delta: celebrate a PR = today ~impossible (PNG + manual repost) → 2 taps.

**P1-B — Surface the dormant renewal-conversation queue.** What: small "Milestones to celebrate / renew" widget in the admin mission-critical section reading `getMilestonesNeedingRenewal` (new thin route), with `markRenewalConversation` as the done-action. Why: revenue (renewals) + celebration source feed; the service was built for exactly this and has zero consumers. Effort: S-M. Acceptance: milestone with `triggersRenewal:true` appears until marked held. Click delta: renewal-worthy milestone discovery = never → 0 taps on overview.

**P1-C — Live counts in AdminSignalBar + exceptions strip on `/master-schedule`.** What: feed the signal bar real counts (orientation, waivers, payments, at-risk critical) and mount a compact exceptions ribbon on the admin's ACTUAL landing (`/master-schedule`) — or flip admin `defaultPath` to `/overview` (decision for Sean; the deep audit §J raised the same landing question). Why: "visible WITHOUT hunting" is the domain mandate. Effort: M. Click delta: stale-client awareness = 1 click + scroll → 0 clicks.

**P2-A — Roster adherence rollup endpoint + view.** Extend the at-risk SQL into `GET /api/admin/compliance/roster-summary` (KPIs in §6.2) with per-trainer grouping; render as a compact header row above "Needs Attention" and on trainer home. Effort: M.
**P2-B — Trainer Data Management truth.** Either compute real per-trainer aggregates (clients from `client_trainer_assignments`, sessions from `sessions`, revenue from ledger `FinancialTransaction` — it exists per `sessionDeductionService.mjs`) or delete the decorative stat cards. Never ship zeros dressed as KPIs. Effort: M.
**P2-C — Coach response-time metric** (§6.3) surfaced on admin overview ops section + per-trainer. Effort: M.
**P3-A — Weekly proof-of-value digest** (C4 roadmap "nightly admin briefing" alignment): cron job composing at-risk + celebrations + adherence deltas; wire into existing `backend/jobs/` worker pattern. Effort: L (needs P0-C + P2-A first).
**P3-B — Rule-34 cleanup slice (Sean approval required):** archive `HighRiskClientsWidget`, `TopTrainersWidget`, `ClientActivityWidget`, stranded `adminReportsController.mjs`, and decide revive-or-archive for the `ai-bff` command-center endpoints + `AdminClientManagementView` tree. Effort: S.

---

## 6. Algorithm Specs (extend, don't rebuild)

### 6.1 Stale-Client Scoring v2 (extends `adminComplianceHelpers.mjs` — keep the existing shape)
- Inputs (all first-party): `lastWorkoutDate`, `workouts7d`, `workouts30d` (existing SQL); NEW: `planTargetPerWeek` = COUNT(`WorkoutPlanDay` rows in current week of active plan) fallback 2 (`progressPulseService.WEEK_TARGET_DAYS`); NEW: `lastClientMessageAt`/`lastCoachReplyAt` (from `messages`); NEW: `nextScheduledSessionAt` (from `sessions`).
- Score (0-100, higher = worse): `risk = 45*recencyFactor + 35*(1 - adherenceRatio) + 20*silenceFactor` where `recencyFactor = clamp(daysSinceLastWorkout / 14, 0, 1)` (999-sentinel for never-logged maps to 1.0 but emits `no_logs_yet` reason instead of days), `adherenceRatio = clamp(workouts30d / (planTargetPerWeek * 4.3), 0, 1)`, `silenceFactor = clamp(daysSinceLastAnyTouch / 10, 0, 1)` (touch = message either direction OR completed session OR workout log).
- Tiers (compatible with existing UI chips): critical ≥ 70 OR daysSince > 10 (preserve current guarantee), warning ≥ 45 OR daysSince > 5, watch ≥ 25 OR daysSince > 3, else healthy (excluded, as today via the `null` return in `buildAtRiskComplianceClient:77`).
- Modifiers: suppress recency/adherence for clients with a future `nextScheduledSessionAt` within 48h (booked = not stale); keep the existing paid-credits escalation (`sessionsRemaining <= 2` appends reason, helpers :68-70); keep `isFreeTracking` neutralization (Move Fitness clients never get billing-flavored reasons).
- Output: existing shape + `riskScore`, `planTargetPerWeek`, `lastTouchAt`, `reasons[]` (multi-reason instead of single string — UI already renders one line; join for back-compat).

### 6.2 Roster Adherence KPIs (new read on the same tables)
- `trainedThisWeekPct` = distinct clients with ≥1 completed `workout_sessions` row in ISO week / active clients.
- `onTargetPct` = clients with `workouts7d >= planTargetPerWeek` / active clients.
- `avgAdherence30d` = mean of per-client `adherenceRatio` (§6.1) — replaces the current widget's misleading `avgCompliance` computed only over at-risk clients (`ClientComplianceDashboard.tsx:117`).
- `staleCount{critical,warning,watch}`; `newPRsThisWeek` (from the existing PR facts source used by `progressChartFacts.buildPrFacts`); `milestonesPendingRenewal` (from `getMilestonesNeedingRenewal`).
- Scope param: `?trainerId=` reuses the trainer join; admin default = whole roster grouped by trainer.

### 6.3 Coach-Response-Time Metric (new, over existing `messages` tables)
- Definition: for each client-initiated message in a coach↔client conversation (sender role client, previous message NOT client), response latency = time until the next message by a staff participant in that conversation. Sessions/logs do NOT count as responses (message-channel discipline).
- KPIs: `medianResponseHrs7d`, `p90ResponseHrs7d`, `awaitingReplyCount` (client messages with no staff reply yet, age > 4h), per-trainer + org rollup. Exclude auto-generated/system messages; cap outliers at 7d.
- Data: `messages(conversation_id, sender_id, created_at)` + `conversation_participants` roles (`messagingConversationQueries.mjs:9-18`). Pure SQL window functions; no new tables.
- Feeds §6.1 `silenceFactor` and the P2-C admin widget; `awaitingReplyCount` belongs in the mission-critical queue section, not business lens.

---

## 7. Cross-Domain Dependencies & Sequencing

1. **HARD DEPENDENCY: the `/api/admin` router-order auth slice** (SESSION-Q handoff §4.1, active named next-slice, auth-sensitive, triangle-review minimum) gates ALL trainer-facing at-risk work (P0-B) and trainer roster rollups. Sequence: auth slice → P0-B → P2-A trainer view.
2. **Consent model (P1-A)** must coordinate with the community/social domain auditor: a `User` consent flag + the existing `SocialPost` moderation fields; also fixes the §3.9 auto-post consent gap in one pass (route auto-posts through the same flag).
3. **NBA engine is shared** with the client-dashboard domain (doc 01/02 of this audit series): `coachify` audience + the `celebrate_streak` CTA change (P1-A.3) touch `nextBestActionService.mjs` — one owner per slice, coordinate via lane files (Rule 67).
4. **Plan-aware targets (P0-C)** read `WorkoutPlan`/`WorkoutPlanDay` — the program-model domain (deep audit §G) may merge program models; keep the target-derivation behind one function so a model merge changes one call site.
5. **Ledger truth for P2-B** depends on `FinancialTransaction` (exists, `sessionDeductionService.mjs`) — coordinate with the sessions/credits workstream (deep audit §L) before defining "trainer revenue".
6. Schema-drift watch (Rule 58): at-risk SQL reads `workout_sessions.status='completed'` and `cta.status='active'` — `ClientTrainerAssignment.isActive` is a METHOD not a column (2026-05-01 incident class); any new caller must use `status`.

## 8. Do-Not-Touch (active lanes + shipped surfaces)

- **Workout logger UI/flow + exercise-picker consolidation** — active Phase-1 build lane. Integration point only (deep-links from at-risk rows may target the logger routes; do not modify them).
- **Stripe/storefront checkout internals** — Codex lane. P2-B revenue reads are read-only ledger queries.
- **Hermes/Pi operator work** — out of scope.
- **Client Command Center shipped surfaces** (SESSION-Q): Training-tab workflow modes (`trainingWorkflowModes.ts`), `progressChartFacts.ts` + `ProgressChartInsightBar`, `AdminBodyCompPanel`, `clientHubAudience.ts` trainer parity, canonical 12-chart mapper. Extend around them; source-lock tests (`AdminProgressChartsGrid.source.test.ts`, 300-line caps) will fail non-conforming edits — check sibling `.test.ts` before touching anything in `workspaces/clients-team/`.
- **`MyClientsView`** — dormant by decision, Rule-34: no delete without Sean's Phase-2 approval.
- **The `/api/admin` router-order fix** — already a named next-slice with a written plan (probe → mount-order fix → unhide trainer surfaces). Do not fork or pre-empt; build P0-B behind it.

---
*Auditor: domain 08 (trainer/admin proof-of-value), read-only pass over origin/main @ 87680741e. Every claim carries file:line; [HYPOTHESIS] items (§3.7) require the Rule-55 probe before implementation.*
