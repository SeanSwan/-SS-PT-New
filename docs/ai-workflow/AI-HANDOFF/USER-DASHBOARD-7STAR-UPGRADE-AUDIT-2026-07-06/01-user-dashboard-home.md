# User Dashboard Home + Information Architecture — 7-Star Upgrade Audit
**Domain:** logged-in client/user landing experience · **Baseline:** origin/main @ `87680741e` (worktree c:/tmp/ss-audit-20260706) · **Date:** 2026-07-06
**Audience:** future AI builders with zero context. Every claim carries file:line + confidence tag. Complements §J of `FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md` (4-role dashboard view); this doc goes one level deeper on the user/client HOME specifically.

---

## 1. Canonical Surface Receipt (what actually mounts)

**Post-login landing is role-forked** — `frontend/src/pages/EnhancedLoginModal.tsx:474-485` (already-authed effect) and `:545-556` (submit handler) `[VERIFIED]`:
- role `client` → **`/dashboard/client/overview`**
- role `user` (DB default) → **`/user-dashboard`**
- (admin → `/dashboard/admin`, trainer → `/dashboard/trainer/overview` — other auditors' domains)

**Surface A — `/user-dashboard` ("Creator Observatory", role-less users):**
- Route mount: `frontend/src/routes/main-routes.tsx:707-728` — `user-dashboard` + `user-dashboard/:tab` → `<UserDashboardV3 />` inside `ProtectedRoute` `[VERIFIED]`
- Component: `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:36-214` — home tab renders `UserDashboardTabsV3` → lazy `HomeTab` (`UserDashboardTabsV3.tsx:32,145`) `[VERIFIED]`
- Home body: `frontend/src/components/UserDashboard/components/HomeTab.tsx:204-291` `[VERIFIED]`
- Old `/social` and `/social/:tab` are pure redirects into this surface (`main-routes.tsx:764-780`) `[VERIFIED]`

**Surface B — `/dashboard/client/overview` (role client — canonical client home):**
- Route mount: `main-routes.tsx:843-852` — `dashboard/*` → `UniversalDashboardLayout` (allowedRoles admin/trainer/client; role `user` passes via alias `['user','client']` at `frontend/src/routes/protected-route.tsx:253`) `[VERIFIED]`
- Role table: `frontend/src/components/DashBoard/UniversalDashboardLayout.routes.tsx:178-203` — client `defaultPath: '/overview'`, `/overview` → `ClientHomeTab` `[VERIFIED]`
- `ClientHomeTab` (`frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx:12,38-56`) wraps `ClientDashboardHomeTab` (embedded) → composes `ClientDashboardHome` (`frontend/src/components/UserDashboard/components/ClientDashboardHome.tsx:36-73`) `[VERIFIED]`
- Role normalization: `UniversalDashboardLayout.tsx:60-62` maps role `user` → `client`, so plain users CAN use Surface B; but login never sends them there `[VERIFIED]`
- Legacy `/client-dashboard` + `/client-dashboard-legacy` redirect here (`main-routes.tsx:680-687`) `[VERIFIED]`

**Waiver gate wraps both homes:** `protected-route.tsx:131` — `WAIVER_GATED_ROUTE_PREFIXES = ['/dashboard', '/user-dashboard']` for roles client+user `[VERIFIED]`.

**Bottom line:** TWO live homes for the same "trainee" persona, forked only by DB role string. Both are real-data. This split is THE structural defect of the domain (details §4).

---

## 2. Current-State Map

### Surface A — /user-dashboard Home (HomeTab) — canonical for role `user`
| Piece | File:line | Class | Notes |
|---|---|---|---|
| Shell + cover hero | `UserDashboard.V3.tsx:93-131` (`ObservatoryCoverHero`) | canonical | name/tier/level/avatar/share, background studio |
| Tab bar (IA) | `UserDashboardTabBarV3.tsx:34-43` | canonical | Home, **Progress (2nd)**, Reels, Friends, Challenges, Alerts, Nutrition, Photos, Creative `[VERIFIED]` |
| Training command strip | `HomeTrainingCommandStrip.tsx:44-96` | canonical | Log Workout / View Progress / Ask Coach — **collapsed by default (`useState(false)` line 45)** `[VERIFIED]` |
| Center column | `HomeTabVisionCenter.tsx:114-253` | canonical | order: TopBar+XP pill → lens strip → **Latest Drop** panel → **Quick Post** composer → **stats ticker (:247)** → support panels → **community feed + enrichment (:251)** `[VERIFIED]` |
| Quick-stats ticker | `UserDashboardQuickStatsTicker.tsx` (228 ln); stats built by `buildSidebarQuickStats` (`UserDashboardSidebarV3.tsx:39-110`) | canonical | 8 stats: workouts, level, points, streak, level-progress, XP-to-next, this-week, training-time. Has a dormant `sponsorSpot` affordance (`:37-46`) no caller passes `[VERIFIED]` |
| Feed enrichment | `hooks/social/useFeedEnrichment.ts:133` → `GET /api/social/feed-enrichment` | canonical | mounted `backend/routes/social/index.mjs:16`; NASA/Smithsonian/NPS/Wikimedia + `swan-curated` fallback, 30-min cache (`feedEnrichmentService.mjs:1-75`) `[VERIFIED]` |
| Right rail | `HomeTabVisionRightRail.tsx:124-273` | canonical | **NextBestAction card first (:126)**, then Live Activity (socket ticker), Active Challenge, Badges/Leaderboard, Faction, Trending, Momentum ring, Transformation before/after `[VERIFIED]` |
| NBA card (frontend-only) | `HomeTabNextBestAction.tsx:40-64` | canonical but SHALLOW | streak-rescue heuristic ONLY (`assessStreakRisk`, `HomeTabProofViewModel.ts:104+`, escalates after 15:00 local). Does NOT call the backend engine `[VERIFIED]` |
| Support panels | `HomeTab.tsx:138-182` | canonical | TrainingProof (real 4-week buckets from `/api/workout/sessions`), DailyHealthLoop, SwanCoachDock (elite-gated) `[VERIFIED]` |
| "Progress" tab content | `UserDashboardTabsV3.tsx:221-224` → `WorkoutsTab.tsx` | canonical but WEAK | exercise-usage categories + streak from `GET /api/workout/sessions` (`WorkoutsTab.tsx:15`) — NOT the canonical 12-chart grid `[VERIFIED]` |

### Surface B — /dashboard/client/overview (ClientDashboardHome)
| Piece | File:line | Class | Notes |
|---|---|---|---|
| Layout order | `ClientDashboardHome.tsx:40-71` | canonical | TopNav → ProfileHero (points/level/streak + progressbar) → QuickActions → **SocialProgressAnalyticsPreview (real chart cube)** → 3-col (TodaysAssignmentCard / TrainingFocusCard / NextSessionCard) → feed+composer → insights+performance → right rail `[VERIFIED]` |
| Quick actions | `ClientDashboardHomeTab.tsx:158-164` | canonical | Log Workout (primary), Ask Coach, View Progress, View Challenges, Book Session (gated by `canBookSwanStudiosSessions`) `[VERIFIED]` |
| Assignment card | `ClientDashboardHome.viewModel.ts:129-169` ← `useCurrentClientWorkout` → `GET /api/workouts/:id/current` (`observatory/useCurrentClientWorkout.ts:61`) | canonical | real plan cursor: title, week/day, first exercise, CTA `[VERIFIED]` |
| Chart preview | `SocialProgressAnalyticsPreview.tsx:27-60` ← `useClientProgressCharts` (`/api/client/analytics/chart-*`) | canonical | honest empty/loading states; same engine as canonical progress page `[VERIFIED]` |
| Next session | `useUpcomingClientSession.ts:21-50` → `sessionService.getUpcomingSessions` | canonical | |
| Client sidebar (shell) | `ClientStellarSidebar.tsx:53-87` | canonical | HOME: Home / **My Progress** / **Log Workout** top 3; then TRAIN / RECOVER / COMMUNITY / ACCOUNT — vision-compliant order `[VERIFIED]` |
| Inner `ClientSidebar` + dead rows | `ClientDashboardHome.sections.tsx:79-104` | dormant-when-embedded | 'Billing & Plans', 'Help Center', 'Sign Out' have `undefined` targets = disabled "not wired yet" tiles; only rendered non-embedded (`ClientDashboardHome.tsx:43`), and the only mount is embedded `[VERIFIED]` |
| `TodaySnapshotCard` | defined `sections.tsx:253`, imported `ClientDashboardHome.tsx:21`, **never rendered** (repo-wide `<TodaySnapshotCard` = 0 hits) | dormant | built view-model (`buildTodaySnapshot`) computed then dropped `[VERIFIED]` |

### Competing / legacy / dead in this domain
- `frontend/src/routes/DashboardRoutes.tsx` — **dead**, zero importers (grep = 0) `[VERIFIED]`; misleads route tracing.
- `frontend/src/config/dashboard-tabs.ts:25-75` — `COMMON_DASHBOARD_TABS`/`ADMIN_DASHBOARD_TABS` marked `@deprecated` (:78); only `WORKSPACE_CONFIG` is consumed (`AdminStellarSidebar.tsx:51`). The `status: 'mock'` labels there describe nothing that mounts — stale metadata `[VERIFIED]`.
- `/workout` → `pages/workout/WorkoutDashboard` mounted at `main-routes.tsx:783-791` but **no in-app link found** (grep `'/workout'` consumers = 0) — mounted-but-unlinked legacy `[VERIFIED]`.
- `observatory/ClientObservatoryHome.tsx` — zero consumers (grep = 0) — dormant older client home; its `useCurrentClientWorkout` hook is the live survivor `[VERIFIED]`.
- `pages/Social/SocialPage.V3.tsx` — unmounted legacy absorbed into /user-dashboard (comment `main-routes.tsx:264-269`) `[VERIFIED]`.

---

## 3. Data-Truth Check

**No mock data renders on either mounted home.** `[VERIFIED]` for every widget traced:
- Gamification (level/XP/streak/badges/leaderboard): `useGamificationData.ts:79-151` → `/api/v1/gamification/*` (the live gamificationV1 surface). Challenges: `useChallenges.ts:53` → `/api/v1/gamification/challenges`; on failure sets `isDemoData:false` + error (no demo fill, `:81-86`), and `selectActiveChallengeSummary` hard-returns null on demo (`HomeTabLiveWidgetViewModel.ts:170`) `[VERIFIED]`.
- Training proof / ticker "This Week"/"Training Time": real `GET /api/workout/sessions` (`useDashboardQueries.ts:251`; backend mount `backend/core/routes.mjs:350-351`) bucketed into 4 real weeks (`HomeTabProofViewModel.ts:36+`) `[VERIFIED]`.
- Social feed: `/api/social/posts/feed` (`useSocialFeed.ts:116`); live activity = shared socket (`useActivityTicker.ts:72-82`) with "Recent" fallback label when disconnected `[VERIFIED]`.
- Feed enrichment: live external APIs + curated static fallback lines (`feedEnrichmentService.mjs:44-75`). The curated items are editorial content, not fabricated user metrics — acceptable, but they are the one non-first-party block on the home `[VERIFIED]`.

**Truth flags:**
1. **Two "streak" semantics coexist** `[VERIFIED]`: home streak = gamification `streakDays` (daily, `/api/v1/gamification/profile`), while the backend pulse/NBA engine uses ISO-week streak (`progressPulseService` → `pulse.streak.weeklyCurrent`, weekly target). Client-side `assessStreakRisk` (daily, 15:00 heuristic) vs backend `streak_at_risk` (days-left-in-week rule, `nextBestActionService.mjs:81-95`) can disagree on the same day. Not schema drift in the DB sense, but a **metric-definition drift** that will produce contradictory copy once both surfaces render together.
2. **Tier gate on the intelligence layer** `[VERIFIED]`: the entire `/api/client/analytics/*` suite including `progress-pulse` (with its embedded nextBestAction) requires feature `analytics.advanced` (`clientAnalyticsRoutes.mjs:61,159`). Free-tier trainees get zero engine-driven guidance; `ProgressPulsePanel` only mounts when `hasAdvancedAccess` (`ClientProgressDashboardPage.tsx:188`).
3. `ClientHomeTab` passes `EMPTY_STATS`/`profile={null}` (`ClientHomeTab.tsx:19-26,47-52`) — inert today because the inner component fetches its own data and never reads `displayStats`, but it is a booby trap for future props use `[VERIFIED]`.
4. Ticker `sponsorSpot` slot exists with zero suppliers — dormant affordance, no fake sponsor renders `[VERIFIED]`.

---

## 4. Vision Gap Analysis (7-star bar: personal, alive, progress-first, zero dead tiles)

**Answers to the domain questions:**
- **Landing URL:** role client → `/dashboard/client/overview`; role user → `/user-dashboard` (§1).
- **Above the fold, Surface B (client):** top nav → profile hero (name, points, level, streak, progress bar) → 5 quick-action pills → chart-cube preview. Progress-first. **Strong.**
- **Above the fold, Surface A (user):** full-bleed cover hero → tab bar → teach-me guide → **collapsed** training strip → utility bar + XP pill → lens strip → *Latest Drop* + *Quick Post* (social composer). Training proof, ticker, and feed are mid-page; the NBA/streak-rescue card is right-rail — **which stacks to near page-bottom ≤1023px** (`HomeTabVision.styles.ts:98-116`). Social-first; conflicts with the workout-progress-first Core Loop on the exact surface new (role-less) signups land on `[VERIFIED]`.
- **Taps:** see click-delta table in §5.
- **Stats ticker / enriched feed on main:** YES, both exist and are real (§3) — but only on Surface A `[VERIFIED]`.
- **NBA hero mount point:** §6.

**Gaps vs 7-star:**
1. **One persona, two homes.** Features diverge hard: ticker + enrichment + streak-rescue + faction/momentum ONLY on A; assignment card + chart cube + next session + insights ONLY on B. A role-less user who is actually a training client never sees their assigned workout on their home; a client never gets streak rescue. `[VERIFIED]` (§2 tables).
2. **The real NBA engine reaches no home.** Backend `nextBestActionService.mjs` (8-rule ladder, :20-28) is consumed only by the tier-gated progress page pulse (`useProgressPulse.ts:82`) and the admin/trainer card (`ClientNextBestActionCard.tsx:107`). The home-side "Next Best Action" card is a 2-state streak heuristic. The Core Loop's "next best training action" is absent at the moment of landing `[VERIFIED]`.
3. **Activation guidance is paywalled.** `log_first_workout` / `return_after_gap` / `streak_at_risk` — precisely the 7-day activation levers — sit behind `analytics.advanced` `[VERIFIED]`.
4. **User-role progress is a downgraded shadow.** `/user-dashboard/progress` renders `WorkoutsTab` (category usage) instead of the canonical 12-chart grid; there is no 1-tap path from Surface A to `/dashboard/client/progress` `[VERIFIED]`.
5. **The #1 action costs an extra tap on Surface A** (collapsed strip) and the rescue card is buried on mobile.
6. **Dead-tile debt is small but present:** `TodaySnapshotCard` computed-not-rendered; 3 unwired inner-sidebar rows; dead `DashboardRoutes.tsx`; deprecated tabs config with stale `'mock'` labels; unlinked `/workout` `[VERIFIED]`.
7. **Milestone sharing is good but not event-driven:** composer + "share my week" proof-attach exists (`useHomeComposer`, `HomeTab.tsx:116-122`), yet nothing prompts a share at the moment a milestone occurs (level-up, PR, streak week closed).

**Grade: B.** Real data everywhere, honest empty states, both homes premium-styled; held back by the two-home fork, an unmounted intelligence engine, tier-gated activation, and social-first ordering on the default-role landing.

---

## 5. Ranked Upgrades (P0–P3)

| # | P | What | Why (Core Loop) | Value/Effort | Acceptance criteria | Click delta |
|---|---|------|-----------------|--------------|--------------------|-------------|
| 1 | P0 | **Mount the engine-driven NBA hero on BOTH homes.** Extend `HomeTabNextBestAction` to consume `pulse.nextBestAction` (via a shared `useNextBestAction` hook wrapping `useProgressPulse`), falling back to the current streak heuristic on 402/error/loading. Surface B: insert the same card at top of `PrimaryStack` (`ClientDashboardHome.tsx:47`, above QuickActions). | "Next best training action" is the loop's decision step; today it never reaches a home. | High / **M** | Card renders engine `primary.title/message/cta` when eligible; heuristic fallback otherwise; both homes; contract test asserting the shared hook is mounted in each home tree. | See next action: 2 taps + gate → **0 taps** |
| 2 | P0 | **Free-tier activation slice of NBA.** Split route: keep full pulse behind `analytics.advanced`, expose a light `GET /api/client/analytics/next-best-action-lite` (or un-gate codes 1–3: `log_first_workout`, `return_after_gap`, `streak_at_risk`) using the same `computeNextBestAction`. | Trainee activation = first workout + progress proof in 7 days; the nudges that drive it must not be paywalled. | High / **S** | Free user receives codes 1–3 with CTA; codes 4–8 still gated; regression test per code. | Free user guidance: ∞ → 0 taps |
| 3 | P1 | **Converge the two homes into one composition with role framing.** Port assignment card + `SocialProgressAnalyticsPreview` + next-session into Surface A's center (they already share `HomeTabViewModel` builders); port ticker + streak-rescue + enrichment into Surface B. End state: one home component, role/tier props. Do NOT change landing URLs in this slice. | One canonical progress-first home = the "personal, alive, progress-first" bar; kills the role-fork feature lottery. | Very High / **L** | A user-role member with an assigned plan sees TodaysAssignment on `/user-dashboard`; a client sees ticker+rescue on `/overview`; zero duplicated fact cards per surface; 375px QA both. | User sees assigned workout: unreachable → 0 taps |
| 4 | P1 | **Make Surface A "Progress" reach canonical charts.** Replace `WorkoutsTab` panel (`UserDashboardTabsV3.tsx:221-224`) with `ClientProgressDashboardPage` content or a redirect to `/dashboard/client/progress`; keep WorkoutsTab's category summary as a section inside it. | Chart review is loop step 3; users currently get a shadow surface. | High / **M** | Tapping "Progress" on A lands on the 12-chart canonical grid (or embeds it); WorkoutsTab no longer a dead-end sibling. | Canonical charts (user role): 3+ → **1 tap** |
| 5 | P1 | **Default-expand the training command strip on A** (or delete it in favor of upgrade #1's hero) and lift NBA + TrainingProof above Latest Drop/Quick Post at ≤1023px (reorder `HomeTab.tsx:204-291` / CSS order in `HomeTabVision.styles.ts`). | Log-the-workout is loop step 1; today it's behind a disclosure tap and the rescue card is page-bottom on phones. | High / **S** | Log Workout visible without interaction at 375px; NBA card within first 2 viewport-heights on mobile. | Log workout (A): 2 → **1 tap** |
| 6 | P2 | **Event-driven milestone share.** When gamification returns a level-up/badge or `trainingProof.weekDelta` closes a week, render a one-tap "Share it" chip on the ticker stat / NBA secondary that opens the composer pre-armed (proof attach already exists via `latestSessionId`). | Shareable milestone = loop step 5; today sharing is user-initiated only. | Med / **M** | Chip appears only on real events; composer opens pre-filled with proof attached; posts carry `workoutSessionId`. | Share milestone: ~4 → **2 taps** |
| 7 | P2 | **Unify streak semantics.** Pick ONE user-facing streak (recommend the engine's weekly-target streak; keep daily as "days active"), rename labels, and make `assessStreakRisk` delegate to `pulse.nextBestAction` when available. | Progress proof must be trustworthy; contradictory streak copy erodes trust. | Med / **S** | Ticker, hero, rescue card, and pulse panel all show the same streak number+unit for one user; doc note in code. | — |
| 8 | P3 | **Dead-tile hygiene slice** (separate pass, rule 37): render-or-delete `TodaySnapshotCard`; wire or remove the 3 unwired inner-sidebar rows; delete `routes/DashboardRoutes.tsx`; delete deprecated arrays in `dashboard-tabs.ts`; decide `/workout` route (redirect → `/dashboard/client/workouts`). | Zero dead tiles is part of the 7-star bar; dead files mislead every future auditor. | Low / **S** | grep proves zero consumers before each removal (rule 34); route map doc updated. | — |

---

## 6. Algorithm Specs (extend, don't rebuild)

### 6.1 Shared `useNextBestAction` (frontend, upgrade #1)
- **Inputs:** `useProgressPulse()` (`GET /api/client/analytics/progress-pulse` → `nextBestAction.primary/secondary`, `useProgressPulse.ts:37-52`); fallback inputs already on the homes: `streakAtRisk` (`assessStreakRisk`), `streakDays`, `trainingProof`.
- **Output:** `{ source: 'engine'|'heuristic', title, message, cta: {label, href}, urgent: boolean }`.
- **Pseudocode:** `if pulse ready → map primary (urgent = code in {streak_at_risk, return_after_gap}); elif 402/error → heuristic card (current behavior); render CTA href through role-aware path helper (swanCoachDashboardRoute.ts:20 — note engine hrefs '/dashboard/client/workouts' are client-shaped and already valid for user role via alias)`.
- **EXTEND note:** do NOT fork the ladder client-side. All rule logic stays in `backend/services/nextBestActionService.mjs` (`computeNextBestAction`, :53). Known-truth engine; 2 existing consumers stay untouched.

### 6.2 Assignment-aware NBA (backend extension, after #1)
- **Gap:** the ladder is history-derived only; it never says "Day 3 of *your assigned plan* is next." The plan cursor already exists: `GET /api/workouts/:userId/current` (consumed at `useCurrentClientWorkout.ts:61`).
- **Extension:** add optional `assignment` input to `getNextBestAction(sequelize, userId, opts)`; when an active `WorkoutPlan` day is pending and no urgent code (1–3) fires, emit new code `do_assigned_workout` (priority 3.5) with title from plan day + CTA to the assignment path (`assignmentPath`, `ClientDashboardHome.viewModel.ts`). Deterministic, no LLM, zero PII — preserves the service's design contract (:9-17).
- **Tests:** extend the service's injectable-clock test pattern with an assignment fixture.

### 6.3 Free-tier NBA-lite (upgrade #2)
- New handler beside `getNextBestActionHandler` (`analyticsRoutes.mjs:163-164`): same service call, response filtered to codes 1–3 + `keep_momentum`, mounted WITHOUT `requireTier('pro','charts.full')` but WITH `protect` + ownership. No new SQL.

### 6.4 Milestone-share trigger (upgrade #6)
- **Inputs:** gamification profile deltas (level, badges — already fetched), `trainingProof.weeklyCounts` week-close, PR timeline (chart engine has `chart-pr-timeline`, gated).
- **Rule:** fire at most 1 share prompt per day; store last-prompt in localStorage; never fabricate (only real event objects with ids).
- **Reuses:** `useHomeComposer.handleShareProgress` + `latestSessionId` proof attach — the write path is done; only the trigger is new.

---

## 7. Cross-Domain Dependencies & Sequencing

1. **Charts domain:** upgrade #4 depends on the canonical chart engine decision (prior audit §I: `/api/client/analytics` vs `/api/workout-forms` engines). Sequence: charts-domain consolidation verdict → then embed on Surface A.
2. **Gamification domain:** streak unification (#7) needs the gamification auditor's read on where `streakDays` is computed/awarded (gamificationV1). The two-streak conflict will surface the moment #1 puts engine copy next to ticker copy — do #7 in the same release as #1.
3. **Monetization/tier domain:** #2 changes a tier boundary (`requireFeature('analytics.advanced')`) — needs Sean's pricing sign-off; it un-gates guidance, not charts.
4. **Workout logger lane (ACTIVE — do not touch):** all CTAs land on `/dashboard/client/log-workout?loadPlan=today` (`ClientStellarSidebar.tsx:57`, `swanCoachDashboardRoute.ts:20`). Keep emitting this exact path; the logger's internals are owned by the Phase-1 lane.
5. **Social domain:** enrichment + composer + auto-post (unified write path's single social auto-post) are integration points; #6 must not double-post — reuse the composer path only.
6. **Admin/trainer dashboards:** the shared NBA card component from #1 is the seed for the 4-role rollout (prior audit §J top rec). Build it role-agnostic (props: framing copy + data hook), then the trainer/admin auditors' lanes consume it.
7. **Sequencing:** #2 (S, backend-only) → #1 (M) + #7 (S) together → #5 (S) → #4 (M) → #3 (L, after Sean ratifies the one-home direction) → #6 (M) → #8 (hygiene pass, anytime, separate slice).

---

## 8. Do-Not-Touch Notes

- **Workout logger UI/flow + exercise picker** — active Phase-1 build lane. Only consume its entry URL.
- **Stripe/storefront checkout internals** — Codex lane. The home's Store links (`ClientDashboardHome.sections.tsx:78,143-149`) may be re-pointed but the store itself is off-limits.
- **`nextBestActionService.mjs` / `progressPulseService.mjs`** — EXTEND only (built 2026-07-02, known truth). Never rebuild or fork the ladder.
- **Unified workout write path** (`submitAiWorkoutLogAsDailyForm`, `workoutXpAwardStep.mjs`) — integration point for proof/XP; do not add parallel writers from home surfaces.
- **`gamificationV1Routes.mjs`** is the live gamification surface — home hooks already point at `/api/v1/gamification/*`; keep them there (legacy gamificationRoutes is removal-in-flight).
- **Do not change login redirect targets** in upgrades #1–#7; the landing-URL decision (one home vs two) is Sean's call inside #3.
- Files safe to modify in this domain: `HomeTab*.tsx/ts`, `ClientDashboardHome*.tsx/ts`, `HomeTabVision*`, `UserDashboardQuickStatsTicker*`, `ClientHomeTab.tsx`, `HomeTabNextBestAction.tsx`, `UserDashboardTabsV3.tsx` (progress panel), `ClientStellarSidebar.tsx`, plus the new hook/route files named in §6.

*End of audit — 2026-07-06, grounded entirely in origin/main @ 87680741e.*
