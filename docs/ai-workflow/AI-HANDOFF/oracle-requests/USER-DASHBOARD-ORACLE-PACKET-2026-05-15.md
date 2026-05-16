# User Dashboard Oracle Packet - 2026-05-15

## Purpose

This packet is for a GPT Pro / Oracle review of the SwanStudios user dashboard before the next implementation slices begin.

The goal is not only visual polish. The goal is to make the user dashboard an enterprise-grade system of action for the SwanStudios app: training progress, social/community engagement, gamification, workout logging, Swan Coach, PLAUD-driven coaching notes, client profile state, and approval-first AI workflows should all feel like one coherent product.

This packet is privacy-safe. It contains no client PII, no secrets, no production tokens, and no private transcript content.

## Plain-English Summary

The user dashboard currently has two active dashboard concepts:

1. `/dashboard/client/*` is the canonical role-based client dashboard mounted through `UniversalDashboardLayout`.
2. `/user-dashboard` is also active and mounts the newer V3 Creator Observatory style.

That is the core architecture issue. The richer V3 surface looks closer to the design vision, but the canonical client routes contain more of the real operational workflow. The implementation path should not keep bending old pages toward the new design forever. It should decide which surface is the primary product shell, then migrate real route logic, data contracts, actions, tabs, and theme behavior into that shell.

The dashboard also has inconsistent depth across sections. Home is much stronger than Reels, Community, Progress, Profile, Rewards, and adjacent client pages. Some areas are live-wired to real endpoints, some are route-mounted previews, some have fallback/static data risks, and some are hidden from the sidebar even though the routes exist.

## Strategic Product Goal

SwanStudios needs a user dashboard that supports:

- Daily client action: log workout, review progress, book session, message coach, view schedule.
- Social and creator workflow: feed, reels, stories, quick post, media, challenges, badges, leaderboard.
- Gamification: XP, streaks, achievements, challenges, rewards, progress momentum.
- AI-assisted coaching: Swan Coach should understand current dashboard context and propose bounded actions.
- PLAUD intake future: field notes should become structured review items that can be approved into the client record.
- Theme consistency: every dashboard component must connect to the active theme changer and not fall back to mismatched hardcoded visual styles.
- Mobile-first usability: touch targets, route navigation, overlays, command surfaces, and tab switching must stay usable on phones.

## Canonical Surface Receipt

### Main route file

- `frontend/src/routes/main-routes.tsx:275-276` lazy-imports `../components/UserDashboard/UserDashboard.V3` as `UserDashboard`.
- `frontend/src/routes/main-routes.tsx:715` mounts `/user-dashboard` to `<UserDashboard />`.
- `frontend/src/routes/main-routes.tsx:846` mounts `dashboard/*` to `<UniversalDashboardLayout />`.
- `frontend/src/routes/main-routes.tsx:691` redirects `/client-dashboard` to `/dashboard/client/overview`.
- `frontend/src/routes/main-routes.tsx:695` redirects `/client-dashboard-legacy` to `/dashboard/client/overview`.

### Role dashboard route tree

- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:623-644` defines the client role route map.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:625` mounts `/dashboard/client/overview` to `ClientHomeTab`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:626` mounts `/dashboard/client/workouts` to `ClientMyWorkoutsPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:627` mounts `/dashboard/client/log-workout` to `WorkoutLogger`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:628` mounts `/dashboard/client/progress` to `ClientProgressDashboardPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:629` mounts `/dashboard/client/progress/detailed` to `ClientProgressWrapper`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:630` mounts `/dashboard/client/ai-consent` to `AiConsentScreen`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:631` mounts `/dashboard/client/meal-planner` to `NutritionWorkspaceLazy`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:632` mounts `/dashboard/client/schedule` to `UniversalScheduleLazy`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:633` mounts `/dashboard/client/community` to `ClientCommunityPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:634` mounts `/dashboard/client/messages` to `MessagingPageLazy`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:635` mounts `/dashboard/client/live` to `LiveStreamingPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:636` mounts `/dashboard/client/creators` to `CreatorEconomyPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:637` mounts `/dashboard/client/profile` to `ClientProfilePage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:638` mounts `/dashboard/client/rewards` to `ClientRewardsPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:639` mounts `/dashboard/client/body-map` to `BodyMapPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:640` mounts `/dashboard/client/my-home` to `AvatarHomePage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:641` mounts `/dashboard/client/coach-assistant` to `SwanCoachAssistantPage`.
- `frontend/src/components/DashBoard/UniversalDashboardLayout.tsx:642` mounts `/dashboard/client/virtual-olympics` to `VirtualOlympicsPage`.

### V3 dashboard route tree

- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:31` uses `useUserDashboardV3Controller()`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:53` renders `UserDashboardTabsV3` directly for the home tab.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:66` wraps non-home tabs in `ObservatoryShell`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:81` renders `UserDashboardTabBarV3`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:86` renders `UserDashboardProfileHeaderV3`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:107` renders `UserDashboardSidebarV3`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:112` renders the second `UserDashboardTabsV3`.
- `frontend/src/components/UserDashboard/types/UserDashboardTypes.ts:81` limits V3 tabs to `home`, `feed`, `progress`, `community`, and `profile`.
- `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx:79-103` maps those tabs to Home, SocialFeed, Workouts/Activity/Nutrition, Community, and Profile content.

## Route And Surface Classification

| Surface | Runtime status | Evidence | Product interpretation |
| --- | --- | --- | --- |
| `/dashboard/client/overview` | Canonical active | `UniversalDashboardLayout.tsx:625`, `ClientHomeTab.tsx`, `ClientObservatoryHome.tsx` | Main client home route. Stronger real workflow than older pages, but still distinct from `/user-dashboard` V3. |
| `/dashboard/client/workouts` | Canonical active | `UniversalDashboardLayout.tsx:626`, `ClientMyWorkoutsPage.tsx` | Uses workout session query and routes to workout logging. |
| `/dashboard/client/log-workout` | Canonical active | `UniversalDashboardLayout.tsx:627`, `WorkoutLogger.tsx` | Real workout logging route with client self-mode tests. |
| `/dashboard/client/progress` | Canonical active | `UniversalDashboardLayout.tsx:628`, `ClientProgressDashboardPage.tsx` | Live analytics/gamification route. Needs visual alignment with V3 style. |
| `/dashboard/client/progress/detailed` | Canonical active, hidden in primary nav | `UniversalDashboardLayout.tsx:629`, `ClientProgressWrapper` | Mounted but not obvious in sidebar; likely deep-link or CTA route. |
| `/dashboard/client/ai-consent` | Canonical active | `UniversalDashboardLayout.tsx:630`, `AiConsentScreen.tsx` | Important privacy route. Needs theme-token review. |
| `/dashboard/client/meal-planner` | Canonical active | `UniversalDashboardLayout.tsx:631`, `NutritionWorkspaceLazy` | Shared nutrition surface. Needs separate data/UX audit. |
| `/dashboard/client/schedule` | Canonical active | `UniversalDashboardLayout.tsx:632`, `UniversalScheduleLazy` | Scheduling workflow mounted. Backend route tree is large and should be audited before major changes. |
| `/dashboard/client/community` | Canonical active | `UniversalDashboardLayout.tsx:633`, `ClientCommunityPage.tsx` | Uses feed, challenges, leaderboard, faction, and party queries. Contains static fallback leaderboard risk. |
| `/dashboard/client/messages` | Canonical active | `UniversalDashboardLayout.tsx:634`, `MessagingPageLazy` | Wrapper around MessagingView. Needs endpoint and UX audit before redesign. |
| `/dashboard/client/live` | Active preview | `UniversalDashboardLayout.tsx:635`, `LiveStreamingPage` | Route exists, but component is a coming-soon/preview feature. |
| `/dashboard/client/creators` | Active preview | `UniversalDashboardLayout.tsx:636`, `CreatorEconomyPage` | Route exists, but component is a coming-soon/preview feature. |
| `/dashboard/client/profile` | Canonical active | `UniversalDashboardLayout.tsx:637`, `ClientProfilePage.tsx` | Real profile route, but less visually aligned to V3 observatory. |
| `/dashboard/client/rewards` | Canonical active | `UniversalDashboardLayout.tsx:638`, `ClientRewardsPage.tsx` | Real gamification dashboard route. Needs alignment with badges/challenges system. |
| `/dashboard/client/body-map` | Canonical active | `UniversalDashboardLayout.tsx:639`, `BodyMapPage` | Pain/injury chart route with real state and Swan Coach guidance fields. |
| `/dashboard/client/my-home` | Canonical active | `UniversalDashboardLayout.tsx:640`, `AvatarHomePage.tsx` | Real avatar-home endpoint usage. Needs design continuity review. |
| `/dashboard/client/coach-assistant` | Canonical active | `UniversalDashboardLayout.tsx:641`, `SwanCoachAssistantPage` | Mounted assistant page, separate from admin Command Center and future PLAUD action system. |
| `/dashboard/client/virtual-olympics` | Canonical active | `UniversalDashboardLayout.tsx:642`, `VirtualOlympicsPage.tsx` | Mounted and endpoint-backed. Hidden from main sidebar. |
| `/user-dashboard` | Active competing/ambiguous | `main-routes.tsx:715`, `UserDashboard.V3.tsx` | Newer visual V3 observatory. Active surface, not safely classifiable as legacy. Needs product decision. |
| `/client-dashboard` | Redirect only | `main-routes.tsx:691` | Legacy URL redirected to canonical role dashboard. |
| `/client-dashboard-legacy` | Redirect only | `main-routes.tsx:695` | Legacy URL redirected to canonical role dashboard. |
| `ClientOverviewPage` fallback | Dormant/legacy fallback | Imported as fallback but not mounted in the current client route map | Should not be used as source of truth without a fresh grep. |
| `client-dashboard/index.tsx` enhanced client dashboard | Dormant/legacy candidate | Re-exported but not mounted by `UniversalDashboardLayout` | Contains older/static concepts; should not steer new dashboard without classification. |
| `client-dashboard-view.tsx` | Legacy/dormant candidate | Older dashboard view with outdated navigation assumptions | Requires final grep before cleanup or migration decisions. |

## Data Wiring Observations

### UserDashboard V3

- `useUserDashboardV3Controller.ts:39` uses `useProfile()`.
- `useUserDashboardV3Controller.ts:40` uses `useGamificationData()`.
- `useUserDashboardV3Controller.ts:105` derives display stats from profile stats.
- `useUserDashboardV3Controller.ts:116` derives top badges from gamification achievements.
- `useUserDashboardV3Controller.ts:128` derives transformation photos.
- `useUserDashboardV3Controller.ts:138` derives next-best-action data.
- `useUserDashboardV3Controller.ts:150` handles profile/background file upload.

V3 has strong design cohesion, but it only exposes five local tabs and does not represent the full canonical client dashboard route set.

### Canonical Client Home

- `ClientObservatoryHome.tsx:47` uses `useGamificationData()`.
- `ClientObservatoryHome.tsx:48` uses `useSocialFeed({ limit: 6 })`.
- `ClientObservatoryHome.tsx:49` uses `useSocialChallenges()`.
- `ClientObservatoryHome.tsx:50` uses `useLeaderboard()`.
- `ClientObservatoryHome.tsx:51` uses `useCreatePost()`.
- `ClientObservatoryHome.tsx:53` starts with `activeLens = 'reels'`.
- `ClientObservatoryHome.tsx:84` does not navigate for the Reels lens; other lens clicks route out.

The Home page is operationally promising, but Reels is currently a local lens, not a full create/manage route. That matches the reported product gap: the Reels section looks like a surface but does not yet behave like a real creator workflow.

### Shared Dashboard Queries

- `useDashboardQueries.ts:95` fetches `/api/social/posts/feed`.
- `useDashboardQueries.ts:107` fetches `/api/social/challenges/active`.
- `useDashboardQueries.ts:155` posts to `/api/social/posts`.
- `useDashboardQueries.ts:218` fetches `/api/v1/gamification/leaderboard`.
- `useDashboardQueries.ts:243` fetches `/api/workout/sessions`.

The social/feed/challenge/workout query layer is real and should be reused rather than replaced during redesign.

### Community

- `ClientCommunityPage.tsx:93` uses `useSocialChallenges()`.
- `ClientCommunityPage.tsx:94` uses `useSocialFeed()`.
- `ClientCommunityPage.tsx:99` uses `useLeaderboard()`.
- `ClientCommunityPage.tsx:100` uses `useCreatePost()`.
- `ClientCommunityPage.tsx:101` uses `useFaction()`.
- `ClientCommunityPage.tsx:102` uses `useParty()`.
- `ClientCommunityPage.tsx:115-116` falls back to `FALLBACK_LEADERS` when leaderboard data is empty.

The fallback leaderboard is a truth risk. Empty leaderboard state should be honest, not filled with placeholder competitive data.

### Progress

- `ClientProgressDashboardPage.tsx:352` fetches `/api/gamification/users/{id}/weekly-recap`.
- `ClientProgressDashboardPage.tsx:361` fetches `/api/client/analytics/personal-records`.
- `ClientProgressDashboardPage.tsx:508` mounts `CanonicalProgressChartsGrid`.
- `useClientProgressCharts.ts:77-88` defines multiple chart endpoint suffixes under `/api/client/analytics/*`.

The progress route is more live-wired than it may look. The opportunity is design integration and clearer explanation of what data is real, stale, empty, or waiting for first logged workout.

### Rewards

- `ClientRewardsPage.tsx:190` fetches `/api/v1/gamification/dashboard`.

Rewards is endpoint-backed and should be treated as a real gamification surface, not decorative sidebar content.

### Backend Route Ownership

Relevant backend mounts include:

- `backend/core/routes.mjs:276` mounts `/api/profile`.
- `backend/core/routes.mjs:342` mounts `/api/workout`.
- `backend/core/routes.mjs:343` mounts `/api/workout/sessions`.
- `backend/core/routes.mjs:350` mounts `/api/schedule`.
- `backend/core/routes.mjs:401` mounts `/api/client/analytics`.
- `backend/core/routes.mjs:408` mounts `/api/gamification`.
- `backend/core/routes.mjs:414` mounts `/api/social`.
- `backend/core/routes.mjs:449` mounts `/api/avatar-home`.
- `backend/core/routes.mjs:451` mounts `/api/olympics`.
- `backend/core/routes.mjs:516` mounts `/api/workout-summaries`.
- `backend/core/routes.mjs:517` mounts `/api/nutrition`.

Social backend endpoints include:

- `backend/routes/social/posts.mjs:222` GET `/feed`.
- `backend/routes/social/posts.mjs:427` GET `/trending`.
- `backend/routes/social/posts.mjs:688` POST `/`.
- `backend/routes/social/challenges.mjs:40` GET `/active`.
- `backend/routes/social/challenges.mjs:390` POST `/:challengeId/join`.
- `backend/routes/social/challenges.mjs:511` PUT `/:challengeId/progress`.
- `backend/routes/social/challenges.mjs:597` GET `/:challengeId/leaderboard`.
- `backend/routes/social/hashtags.mjs:63` GET `/trending`.
- `backend/routes/social/factions.mjs:97` GET `/my-faction`.
- `backend/routes/social/parties.mjs:72` GET `/my-party`.

## Theme And Design Observations

The design target from `frontend/src/assets/user-dashboard/dashboard-export` is the Crystalline Creator Observatory:

- dark-first, not generic SaaS blue-gray.
- glow, glass, depth, crystalline texture, and gaming/creator social language.
- token-based theme behavior with no hardcoded color islands.
- responsive from small phones through 4K.
- Home shell first, then Community, Reels/Feed, Progress, Profile, Workouts, and Rewards.

The production code is mixed:

- V3 UserDashboard has stronger visual identity and token audit tests.
- Canonical `/dashboard/client/*` pages hold more real workflow logic.
- Several older client pages still rely on hardcoded rgba/hex styling or one-off visual systems.
- Sidebar navigation hides several route-mounted sections.
- Header/dropdown responsive issues have already surfaced repeatedly, so route shells and overlays need z-index/layout QA after each slice.

## Open Product Questions For Oracle

1. Should `/user-dashboard` become the canonical client dashboard shell, or should its V3 observatory components be migrated into `/dashboard/client/overview` and sibling routes?
2. Should the product have a distinct public/social creator profile route separate from the authenticated client dashboard?
3. What is the right route model for Reels: local lens, `/dashboard/client/reels`, part of Community, or a creator media center?
4. Which pages should be in the primary sidebar versus secondary actions: Live, Creators, Virtual Olympics, Coach Assistant, Detailed Progress, Log Workout?
5. How should Swan Coach context attach to each route without becoming a generic chatbox?
6. What parts of the dashboard must be action-first instead of display-first?
7. How should empty states be handled so the product feels alive without fake data?
8. How should PLAUD-derived approval workflows eventually surface inside the user dashboard versus the admin Command Center?
9. What route/page should own badges, challenges, leaderboard, streaks, and rewards so gamification is coherent?
10. What should be the minimum enterprise-ready slice sequence before adding new surfaces?

## Recommended Slice Plan After Oracle Review

### Slice 1 - Product route decision

Decide whether the V3 observatory becomes the canonical shell or whether V3 components migrate into existing `/dashboard/client/*` routes. This must happen before more styling work, or the repo will keep accumulating competing dashboards.

Hostile review gate:

- Verify no route is accidentally orphaned.
- Verify redirects still work.
- Verify sidebar/header/dropdown behavior on desktop, 4K, tablet, and phone.

### Slice 2 - Reels and Quick Post action model

Turn Reels from a local visual lens into a real workflow: create, upload, preview, draft, post, and review status. Keep it connected to `/api/social/posts` or create a clear media/reels endpoint if needed.

Hostile review gate:

- Reject fake reels.
- Confirm upload limits and error states.
- Confirm mobile media picker behavior.
- Confirm post submission and rollback behavior.

### Slice 3 - Community truth pass

Remove static fallback leaderboard data and replace fake-looking states with live, empty, loading, error, and first-action states.

Hostile review gate:

- Confirm no placeholder users appear as real leaderboard entries.
- Confirm challenges, party, faction, trending, and feed are all endpoint-backed or explicitly marked unavailable.

### Slice 4 - Progress, rewards, and gamification merge

Unify progress charts, XP, badges, rewards, challenges, and streaks into one coherent gamification model.

Hostile review gate:

- Confirm each widget has a real source.
- Confirm no duplicate gamification truth exists across pages.
- Confirm empty progress states guide the user to log the first workout.

### Slice 5 - Theme and responsive audit

Run a route-by-route theme token pass and Playwright QA matrix for the full dashboard set.

Hostile review gate:

- Confirm theme changer affects every dashboard element.
- Confirm no dropdowns hide behind panels.
- Confirm no mobile sidebar traps users.
- Confirm no text overlaps or button clipping at 300, 332, 390, 414, 768, 1440, 2560, and 3840 widths.

### Slice 6 - Swan Coach context binder

Define how Swan Coach knows current route, current client, current workout/session/post/challenge context, and allowed actions.

Hostile review gate:

- Confirm Swan Coach cannot write to records without approval.
- Confirm all AI outputs use structured actions.
- Confirm audit events exist for app-side writes.

## Oracle Prompt To Paste

You are the Oracle reviewer for SwanStudios, a production personal-training SaaS. Review this dashboard audit as a principal product architect, enterprise UX lead, and AI workflow systems reviewer.

Context: SwanStudios needs its user dashboard to become a coherent system of action. It must support training progress, workout logging, social feed, reels/media creation, community, badges, challenges, rewards, profile, schedule, messages, Swan Coach, and future PLAUD field-note approval workflows. The design vision is the Crystalline Creator Observatory: dark-first, crystalline, premium, social/gamified, responsive, and fully theme-token driven.

Important finding: the app currently has two active dashboard concepts. `/dashboard/client/*` is the canonical role dashboard and contains much of the real workflow logic. `/user-dashboard` is also active and mounts the newer V3 observatory style, but only exposes local tabs for home, feed, progress, community, and profile. We need a strategic recommendation before implementing more slices.

Please answer:

1. What should be the canonical route architecture for this dashboard?
2. Should `/user-dashboard` be promoted, merged, redirected, or split into a public/social profile surface?
3. What is the enterprise-ready route and action model for Reels, Quick Post, Community, Progress, Rewards, and Swan Coach?
4. Which existing surfaces should be considered live, preview, dormant, or candidates for cleanup?
5. What data contracts must be formalized before more design work?
6. How should theme tokens and the header/sidebar shell be governed so every page responds correctly to the theme changer?
7. What empty-state strategy avoids mock data while still making the dashboard feel alive?
8. How should future PLAUD ingestion and approval workflows surface without overloading the client dashboard?
9. What implementation sequence reduces rework and avoids vibe-coded page-by-page drift?
10. What hostile review checklist should be applied after every slice before moving on?

Use the evidence in this packet. Do not invent access to source files beyond the cited file paths and line references. If a recommendation depends on missing code evidence, mark it as an assumption and say what file or runtime behavior must be verified.

## Hostile Review Of This Packet

Verdict: REVISE BEFORE IMPLEMENTATION, ACCEPTABLE FOR ORACLE REVIEW.

Findings:

1. The packet gives enough route evidence to prove the major conflict, but it is still an audit packet, not an implementation spec. No code should be changed from this alone until Oracle returns route architecture guidance.
2. Some active pages, especially Nutrition, Schedule, Messages, Body Map, Coach Assistant, and Virtual Olympics, need deeper endpoint-level audits before any redesign touches their internals.
3. `client-dashboard-view.tsx` and other legacy candidates require final grep/reference checks before any cleanup action. This packet does not approve deletion or archiving.
4. Static fallback risks are identified, but not exhaustively proven across every widget. The next slice must include targeted grep/tests for mock arrays, demo data, and fallback entities.
5. Theme gaps are called out at a high level. A real token audit still needs file-by-file CSS/styled-components scanning before edits.

Conclusion:

The packet is safe to send to Oracle as a strategy and architecture review input. It is not safe to use as a deletion plan or as proof that any route can be removed.
