# 09 — Mobile + Premium Design Polish Audit (USER-role dashboard)

**Date:** 2026-07-06 · **Baseline:** origin/main @ 87680741e (worktree c:/tmp/ss-audit-20260706) · **Method:** static code audit, no browser.
**Scope:** the surfaces a logged-in client/user actually reaches. All paths below are relative to `frontend/src/`.
**Headline:** the mobile/token/touch-target baseline is unusually strong (A- mechanics). The real gaps are (1) a split mobile-navigation paradigm between the two home shells, (2) zero one-thumb path to "Log Workout" from most tabs, (3) one Core-Loop surface (My Workouts, the diary) with no premium signature moment, and (4) a small tail of hardcoded-color / reduced-motion misses concentrated in AiConsentScreen and Messaging.

---

## 1. Canonical Surface Receipt

| # | Claim | Evidence |
|---|---|---|
| 1 | `/dashboard/*` mounts `UniversalDashboardLayout` (JSX, not just lazy decl) | `routes/main-routes.tsx:843-847` element `<UniversalDashboardLayout />`; lazy at `:242-244` [VERIFIED] |
| 2 | `/user-dashboard` + `/user-dashboard/:tab` mount `UserDashboard.V3` | `routes/main-routes.tsx:703-722` element `<UserDashboardV3 />`; lazy at `:269-271`; `/social/*` redirects here `:764-780` [VERIFIED] |
| 3 | DB role `user` is normalized to `client` inside the layout | `components/DashBoard/UniversalDashboardLayout.tsx:60-62` [VERIFIED] |
| 4 | Client route table (21 routes, default `/overview`) | `components/DashBoard/UniversalDashboardLayout.routes.tsx:178-203` [VERIFIED] |
| 5 | Routes render through `DashboardRoutes` with reduced-motion-aware page transitions | `components/DashBoard/UniversalDashboardLayout.shellPieces.tsx:85-116` [VERIFIED] |
| 6 | `/dashboard/client/overview` home = the SAME composition as `/user-dashboard` home, bridged | `components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx:38-55` renders `UserDashboard/components/ClientDashboardHomeTab` with `embedded` [VERIFIED] |
| 7 | Client sidebar = `ClientStellarSidebar` (mobile drawer + hamburger) | `shellPieces.tsx:78-82`; styles `Pages/client-dashboard/ClientStellarSidebar.styles.ts` [VERIFIED] |
| 8 | V3 mobile nav = fixed BOTTOM tab bar (≤768px), 9 tabs, scroll-snap | `components/UserDashboard/styles/DashboardV3NavigationStatusStyles.ts:156-175`; tab list `components/UserDashboard/components/UserDashboardTabBarV3.tsx:35-43` [VERIFIED] |

## 2. Current-State Map (audited surfaces)

**Canonical (mounted in the live route tree):**
- Shell: `UniversalDashboardLayout.styles.ts` (global styles, main content, 320→3840px matrix), `UniversalDashboardLayout.shellPieces.tsx`, `ClientStellarSidebar.{tsx,styles.ts,nav.styles.ts}` [VERIFIED]
- Home (`/overview` + `/user-dashboard`): `UserDashboard/components/ClientDashboardHomeTab.tsx` (259ln) + `ClientDashboardHome.*` (viewModel, quickActions, heroStyles, layoutStyles, feedStyles, cardStyles) [VERIFIED]
- V3 hub (`/user-dashboard`): `UserDashboard/UserDashboard.V3.tsx` (214ln), `styles/DashboardV3LayoutStyles.ts` (noise overlay, token-driven bg art, safe-area-aware bottom padding), `DashboardV3NavigationStatusStyles.ts` (bottom bar) [VERIFIED]
- Progress (`/progress`): `Pages/client-dashboard/ClientProgressDashboardPage.{tsx,styles.ts,cards.tsx}` + `CanonicalProgressChartsGrid.*` (Victory-based, theme-bridge tests) [VERIFIED]
- My Workouts (`/workouts`): `ClientMyWorkoutsPage.tsx` + `ClientMyWorkoutsStyles.ts` (281ln) + `ClientWorkoutPlanVaultPanel.tsx` [VERIFIED]
- Community (`/community`): `ClientCommunityPage.tsx` + `ClientCommunityStyles.ts` + `ClientCommunityFeedStyles.ts` [VERIFIED]
- Rewards (`/rewards`): `ClientRewardsPage.{tsx,styles.ts,logic.ts}` [VERIFIED]
- Schedule (`/schedule`): `Schedule/UniversalSchedule.tsx:44-66` → `UniversalMasterSchedule/UniversalMasterSchedule.tsx` in client mode (1025ln; mobile auto-layout `:185`; breakpoints `:1007-1023`) [VERIFIED]
- Messages (`/messages`): `pages/MessagingPage.tsx` → `components/Social/Messaging/*` [VERIFIED]
- Consent (`/ai-consent`): `Pages/client-dashboard/AiConsentScreen.tsx` [VERIFIED]

**Dormant (zero consumers outside their own dir — grep-verified, rule 34: candidates pending Phase-2 approval, do NOT delete in this audit):**
- `Pages/client-dashboard/observatory/ClientObservatoryShell|Hero|Feed.*` — a fully-styled premium "observatory" home that is NOT mounted; only `ClientTrainingPlanVaultCard` + 2 hooks are consumed, via `ClientWorkoutPlanVaultPanel.tsx:10-12` [VERIFIED]
- `Pages/client-dashboard/schedule/ClientSessionHistory.tsx` — no imports anywhere; carries an off-palette cosmic gradient (`:46`) [VERIFIED]
- `Pages/client-dashboard/progress/ClientProgressPanel.tsx` — no imports; hand-rolled SVG chart (non-Victory) + hardcoded hexes [VERIFIED]
- `components/ui/SwanGalaxyLuxuryButton.tsx` — RETIRED-theme relic (`#0A0A1A` at `:33`), exported only via `ui/index.ts`, no other consumers [VERIFIED]

## 3. Data-Truth Check

- `ClientHomeTab.tsx:19-26,47-52` passes `profile={null}`, `displayStats=EMPTY_STATS` (all zeros), `profilePosts=[]` into the embedded home. Inside `ClientDashboardHomeTab.tsx`, `displayStats` appears only in the prop type (`:58`) — grep shows no usage in the body, and gamification data is fetched live via `useGamificationData()` (`:79`). So the zeros are [LIKELY] dead props, not rendered lies — but any future consumer of `displayStats` on the embedded path would render fake zeros. Flag for the home-domain auditor. [VERIFIED for the prop values; LIKELY for "unused"]
- Progress page charts flow through `CanonicalProgressChartsGrid.*` with source/theme-bridge tests (`CanonicalProgressChartsGrid.source.test.ts`) — Victory-only, no Recharts found in audited surfaces. [VERIFIED]
- Dormant `progress/ClientProgressPanel.tsx:199` draws a raw `<path stroke="#60C0F0">` sparkline — non-Victory, but dormant so no live data-truth breach. [VERIFIED]
- No schema drift observed in this domain's files (this audit is presentation-layer; deeper API-shape checks belong to the progress/community domain docs).

## 4. Vision Gap Analysis (7-star vs today)

**What already meets the bar [VERIFIED]:**
- Token discipline: nearly all styles use `var(--token, #fallback)` with Crystalline Swan fallbacks; a repo-wide grep for retired Galaxy tokens (`#00FFFF|#7851A9|#0a0a1a`) in live user surfaces returned ZERO hits (only the dormant button + contract tests asserting absence).
- Touch targets: hamburger/collapse/close buttons all 44px (`ClientStellarSidebar.styles.ts:15-45,131-196`), V3 tabs `min-height:44px` (`DashboardV3NavigationStatusStyles.ts:208`), messaging NewChat 44px (`MessagingStyles.ts:84-89`). Every sub-44px element sampled was a non-interactive badge/chip.
- Responsive matrix: shell + V3 style 320/375/414/768/1024/1920/2560/3840 explicitly (`UniversalDashboardLayout.styles.ts:77-100,145-175`; `DashboardV3LayoutStyles.ts:86-134`). All fixed-ish grids collapse via media queries (Rewards `:57,182-183`, Observatory `:53-54`, Challenges `:34-35`, HomeTabVision `:71-76`). Messaging stacks at 768px (`MessagingStyles.ts:42-46,61-65`).
- Rule 43: NO violations found. The one plain-template fragment (`ClientMyWorkoutsStateStyles.ts:55-60`) contains no `${}` interpolation (safe, minor smell); `discoveryCardCss` correctly uses the `css` helper (`CommunityTab.styles.ts:41`).
- Reduced motion: 26 guards across client-dashboard styles; page transitions honor it (`shellPieces.tsx:102-104`).
- Hover-only affordances: one instance — collapsed-sidebar tooltip (`ClientStellarSidebar.nav.styles.ts:114-117`), desktop-only (collapse hidden ≤1024px), acceptable.

**The 7-star gaps:**
1. **Split mobile-nav paradigm.** `/user-dashboard` gives phones an app-like fixed bottom bar (1 thumb tap per tab). `/dashboard/client/*` — where Progress, My Workouts, Log Workout, Schedule, Rewards live — gives phones a hamburger at `top:60px; left:10px` (`ClientStellarSidebar.styles.ts:16-18`) + drawer: 2 taps + a top-corner reach. Same user, two muscle memories. The Core Loop's daily surfaces are behind the WORSE nav.
2. **No standing one-thumb "Log Workout".** Home has a quick action deep-linking to `/dashboard/client/log-workout` (`ClientDashboardHome.viewModel.ts:125`), but from Progress/Community/Rewards/Schedule on a phone it's hamburger → drawer → item.
3. **~130px of fixed mobile chrome** before content on `/dashboard/client/*`: header (56px) + `MobileDashboardSafeArea` 60px band (`UniversalDashboardLayout.styles.ts:194-219`) + content `padding-top:124-132px` (`:145-165`). On a 568-667px-tall viewport that's ~20% of the screen spent before the first stat.
4. **Weakest premium surface = My Workouts (`ClientMyWorkoutsStyles.ts`)** — the workout DIARY, Core Loop step 2, is a flat `max-width:900px` list with a 1.5rem text header (`:15-57`): no atmosphere, no streak feedback, no milestone celebration. Progress got countUp/shimmer moments (`ClientProgressDashboardPage.styles.ts:10-68`), Rewards got gold/aurora treatments, the diary got nothing. **Its signature moment should be a "Training Chronicle" spine:** a crystalline week-rhythm strip pinned above the list — streak crystal that grows with consecutive training days, Gilded Fern glint markers on PR/milestone entries, and a frost-line connecting entries of the current week. Low-motion (client/data-card class per house standard), reduced-motion-safe.
5. **Polish tail:** `AiConsentScreen.tsx` is the biggest rule-6 offender (hardcoded `#60C0F0/#ef4444/#10b981/#f59e0b` at `:117-118,222,245,291,340,351` + icon props `:558-759`) AND runs an unguarded infinite `coachPulse` (`:95`, no `prefers-reduced-motion` in file). `Social/Messaging/MessagingStyles.ts` has 5 animations incl. infinite shimmer (`:491`) with zero reduced-motion guards. Minor: hardcoded focus outlines `ClientMyWorkoutsStyles.ts:81,147`; hardcoded danger `#C92A54` `ClientStellarSidebar.styles.ts:183` + rgba clones `:181-192`.
6. **V3 bottom bar has 9 scroll-snap tabs** (`UserDashboardTabBarV3.tsx:35-43`) — entries past #5 are invisible until scrolled (comment at `DashboardV3NavigationStatusStyles.ts:235-237` confirms only ~5 render at 414px). Progress is tab #2 (good), but discoverability of Challenges/Nutrition suffers.

## 5. Ranked Upgrades (P0–P3)

| P | What | Why (Core Loop) | Effort | Acceptance criteria | Click delta |
|---|---|---|---|---|---|
| **P0** | **Unify mobile nav: give `/dashboard/client/*` a fixed bottom bar** (Home · Progress · Log · Community · Schedule), reusing the proven V3 bar pattern (`DashboardV3NavigationStatusStyles.ts:156-175` incl. safe-area padding + `ContentWrapper`-style bottom clearance). Keep drawer for the long tail. | Daily loop surfaces (log → diary → charts → next action) become 1 thumb tap apart; kills the paradigm split with `/user-dashboard`. | M | At 375px: every primary tab reachable in 1 tap from any client route; 44px targets; `env(safe-area-inset-bottom)` respected; content never buried under bar (mirror `DashboardV3LayoutStyles.ts:94-111`); drawer still opens for secondary routes. | Tab switch **2 taps + top-corner reach → 1 thumb tap** |
| **P0** | **Center slot of that bar = raised "Log" action** deep-linking to `/dashboard/client/log-workout` (reuse `ClientDashboardHome.viewModel.ts:125` param builder). Integration point ONLY — do not touch logger internals (active lane). | Core Loop step 1 becomes a standing 1-tap promise from every tab. | S (once bar exists) | Visible on all client routes ≤768px; 44px+; navigates with client pre-context. | Log from Progress/Community **3 taps → 1 tap** |
| **P1** | **My Workouts "Training Chronicle" signature moment** (streak crystal + week-rhythm strip + PR/milestone glints above the list). Feed from existing gamification/progress data — extend `progressChartFacts`/gamification reads; do NOT build a new engine. | Diary (step 2) becomes visually rewarding; streak feedback = adherence; milestone glints = shareable-moment candidates. | M | Renders from real logs; empty state coaches first workout; reduced-motion static variant; 320/375/414px no overflow; low-motion (no pointer tracking). | n/a (reward density, not clicks) |
| **P1** | **Compress mobile chrome ~130px → ~72px**: merge `MobileDashboardSafeArea` (`UniversalDashboardLayout.styles.ts:194-219`) + floating hamburger into one 56-64px contextual header row (title + hamburger + Coach entry), reduce `padding-top` at `:145-165`. | +60px of first-screen progress proof on every phone view. | M | At 375px first content row starts ≤80px from top; hamburger 44px; no overlap with page titles; scroll-under blur preserved. | First stat visible **1 scroll → 0 scroll** on short viewports |
| **P2** | **Tokenize + guard AiConsentScreen**: swap hardcoded hexes (`:117-118,222,245,291,340,351`, icon props) to `var(--accent-primary/--danger/--success/--warning, …)`; add `prefers-reduced-motion` guard to `coachPulse` (`:95`). | Trust surface (privacy consent) must look native to the brand and respect accessibility. | S | Zero raw hexes outside `var()` fallbacks in file; animation off under reduced motion. | n/a |
| **P2** | **Messaging reduced-motion pass**: guard `MessagingStyles.ts:138,307,491,507,520` (esp. infinite shimmer `:491`). | Accessibility parity on a daily coach-communication surface. | S | All infinite animations disabled under reduced motion. | n/a |
| **P2** | Token cleanups: `ClientMyWorkoutsStyles.ts:81,147` focus outlines → `var(--accent-primary, #60C0F0)`; `ClientStellarSidebar.styles.ts:181-192` danger rgba → `color-mix` on `var(--danger, #C92A54)`. | Rule 6 consistency; theme-switch correctness (28 themes). | S | Grep for `#60C0F0`/`#C92A54` outside `var()` in these files returns 0. | n/a |
| **P3** | **Curate V3 bottom bar to 5 primary + "More" sheet** (9 scroll-snap tabs today, `UserDashboardTabBarV3.tsx:35-43`). | Discoverability of Challenges/Nutrition; matches the P0 bar so both shells feel identical. | M | 5 fixed tabs at 320px, no scroll needed; More sheet lists the rest with 44px rows. | Hidden tab reach: **swipe+tap → tap+tap** (equal taps, zero hunting) |
| **P3** | **Hygiene slice (separate pass, rule 37, Sean-approved):** archive dormant `SwanGalaxyLuxuryButton.tsx` (retired `#0A0A1A` `:33`), `schedule/ClientSessionHistory.tsx` (off-palette gradient `:46`), `progress/ClientProgressPanel.tsx` (non-Victory chart), and unmounted `observatory/ClientObservatoryShell|Hero|Feed` — but first MINE the observatory hero/tier-badge treatments as reference for the P1 Chronicle. | Removes the last retired-theme relic + non-Victory chart from the tree; prevents future agents copying off-palette patterns. | S | Grep-verified zero imports before move; done as its own reviewed slice. | n/a |

## 6. Algorithm Specs

**6.1 Bottom-bar route model (P0)** — pure mapping, no backend.
- Input: `activeRole` ('client'), current pathname. Tabs: `[{id:'home',to:'/dashboard/client/overview'},{id:'progress',to:'/dashboard/client/progress'},{id:'log',to:'/dashboard/client/log-workout'},{id:'community',to:'/dashboard/client/community'},{id:'schedule',to:'/dashboard/client/schedule'}]`.
- Active state: longest-prefix match on pathname. Render inside the layout shell (sibling of `UniversalMainContent`), `@media (max-width:768px)` only; desktop unchanged. Reuse V3 bar styles verbatim; do NOT fork a new style system.
- Extend-don't-rebuild: this is presentation over the EXISTING route registry (`UniversalDashboardLayout.routes.tsx:178-203`); no new routes.

**6.2 Training Chronicle strip (P1).**
- Inputs: last 28 days of workout diary entries (existing My Workouts data source in `ClientMyWorkoutsPage.logic.ts`), streak + level from `useGamificationData()` (already consumed at `ClientDashboardHomeTab.tsx:79`), PR/milestone facts from the EXISTING `progressChartFacts` insight engine (admin/trainer command center) — expose a client-scoped read rather than writing a new engine.
- Output: `{ weekCells: Array<{date, trained: boolean, isPr: boolean, isMilestone: boolean}>, streakDays: number, nextMilestone: {label, remaining} }`.
- Pseudocode: bucket entries by local date → mark trained cells → overlay PR/milestone flags from facts → streak = consecutive trailing trained days (rest-day-aware if plan says rest) → `nextMilestone` from gamification thresholds. Render as one row of 7 cells (current week) + streak crystal; milestone cell links to share flow (community domain owns the share sheet).
- Data-truth rule: renders ONLY from real logs; if zero logs, render first-workout CTA (pattern already exists: `ClientProgressDashboardPage.firstWorkoutCta.test.tsx`).

## 7. Cross-Domain Dependencies & Sequencing

- **Workout logger lane (Phase-1, ACTIVE):** P0 center "Log" slot only deep-links; any logger-side FAB/sticky-bar overlap with a new bottom bar must be QA'd with that lane (their `timerFabClearance` test already hints at stacking issues — coordinate before shipping the bar on the logger route; simplest v1: hide the bar ON `/log-workout`).
- **Home/social domain:** the `displayStats` dead-prop finding (§3) and the shared home composition mean the P0 bar must match whatever that domain decides about `/user-dashboard` vs `/dashboard/client/overview` primacy (both currently canonical, deliberately bridged).
- **Theme domain (prior deep audit §theme):** 28-theme contrast/WCAG table-driven pass is owned there; the P2 tokenizations here make those themes actually reach AiConsentScreen/Messaging.
- **Gamification/progress domain:** Chronicle consumes their reads; sequence Chronicle AFTER confirming client-scoped `progressChartFacts` exposure.
- **Sequencing:** P0 bar → P0 Log slot → P2 token/motion fixes (parallel-safe) → P1 chrome compression → P1 Chronicle → P3 curation/hygiene.

## 8. Do-Not-Touch

- `WorkoutLogger/*`, exercise pickers, `EnhancedWorkoutLogger` internals — active Phase-1 build lane. Integration by deep-link only.
- Stripe/storefront checkout internals — Codex lane.
- `BodyMapPage` / pain-chart components — staged pain-chart upgrade WIP exists on the dev tree (commit d7e501559); do not restyle.
- `nextBestActionService.mjs` + `/api/analytics/:userId/next-best-action` — EXTEND, never rebuild (2 mounted consumers).
- Hermes/Pi operator surfaces.
- Do not delete dormant files in any build slice — P3 hygiene is its own approved pass (rules 34/37).
