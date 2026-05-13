# User Dashboard System Status - 2026-05-13

Status: active implementation map after stabilization pass 2
Surface: `/user-dashboard`
Canonical runtime component: `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`
Reference vision: `frontend/src/assets/user-dashboard/dashboard-export/`

## Plain-English Summary

The User Dashboard is no longer a place to keep adding ideas before the base works. The current rule is: stabilize and wire existing features first, then add new modules.

The active dashboard is `UserDashboard.V3`. The archived dashboard variants are reference-only and must not be edited for runtime fixes. The Home tab now uses real profile/follow/feed data for its avatar and visible creator stats, reads inbox and notification counts from existing APIs, sends quick posts with the selected mood/type, supports media upload through the existing social post endpoint, and uses the normal dashboard scroll reset for right-rail next-best actions.

The Home right rail is no longer static filler. Stories come from real media posts, Live Activity comes from the socket ticker with feed fallback, Active Challenge reads the gamification challenge hook, Badges/Leaderboard read gamification data, and Trending reads the social hashtag endpoint. Empty states are honest when an API has no real data. The global header now uses explicit desktop grid columns so the SwanStudios logo and Home nav item do not overlap at 4K.

Authenticated QA found and fixed the non-home tab click trap. On Feed/Progress/Community/Profile, the full-bleed profile header was visually behind the left rail but still receiving pointer events across the page. Decorative header layers now opt out of pointer events, while real controls such as cover upload, avatar upload, edit/settings/share, role badge, and stat cards opt back in.

The dashboard still has real gaps. Notifications are API-backed but the backend notification route still returns mock data. Community Challenges and Factions have routes but are not yet fully wired into the dashboard UI. Badges and rewards show partial gamification data, but the full badge/reward inventory is not mounted yet. Progress still combines Workouts, Activity, and Nutrition as adjacent panels instead of one unified progress view-model.

## Technical Summary

This file is the current source-of-truth status record for future AI work on the User Dashboard. It should be updated whenever a dashboard stabilization slice lands.

### Canonical Surface Receipt

| Evidence item | File evidence | Status |
|---|---|---|
| Route lazy import | `frontend/src/routes/main-routes.tsx:359-362` imports `../components/UserDashboard/UserDashboard.V3` with index fallback | canonical |
| Route mount | `frontend/src/routes/main-routes.tsx:799-803` mounts `<UserDashboard />` at `user-dashboard` | canonical |
| Runtime shell | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | canonical |
| Controller | `frontend/src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts` | canonical |
| Tab panel router | `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx` | canonical |
| Home tab | `frontend/src/components/UserDashboard/components/HomeTab.tsx` | canonical Home |
| Home view-model helpers | `frontend/src/components/UserDashboard/components/HomeTabViewModel.ts` + `HomeTabLiveWidgetViewModel.ts` | canonical pure mapping layer |
| Home live widget hook | `frontend/src/components/UserDashboard/components/useHomeTabLiveWidgets.ts` | canonical Home right-rail API connector |
| Reels surface | `frontend/src/components/Social/Reels/VerticalReels.tsx` + `VerticalReels.styles.ts` | canonical `/social/reels` content component |
| Global header | `frontend/src/components/Header/header.tsx` + `components/Logo.tsx` + `components/NavigationLinks.tsx` | canonical fixed site header |

### Surface Classification

| Surface | Classification | Notes |
|---|---|---|
| `UserDashboard.V3.tsx` | canonical | Only runtime dashboard mounted at `/user-dashboard`. |
| `index.ts` | canonical fallback | Re-exports V3 for lazy fallback. |
| `archive/cleanup-2026-05-12/frontend-dead-code/...` | archive-only | Old variants and old subcomponents. Do not patch for runtime fixes. |
| `frontend/src/assets/user-dashboard/dashboard-export/` | active reference asset | Claude Design reference, not runtime code. |

### Current Feature Inventory

| Area | Current behavior | Status |
|---|---|---|
| Shell/navigation | Home-first V3 shell with Home, Feed, Progress, Community, Profile tabs. | working |
| Tab changes | Main tabs and right-rail next-best actions reset dashboard scroll. | working |
| Non-home tab clicks | Feed, Progress, Community, and Profile can switch from side rail and top tab strip without profile-header interception. | stabilized |
| Theme integration | V3 styles use CSS custom properties with dark fallbacks. | working, keep auditing per slice |
| Home identity | Uses profile photo first, auth photo second, fallback logo last. | stabilized |
| Home creator stats | Uses profile stats, follow stats, profile posts, then feed posts as fallback. No fake stat floors. | stabilized |
| Home top bar | Search is local visual; inbox reads `/api/messaging/conversations`; notifications read `/api/notifications`. | partially wired |
| Home quick post | Sends selected mood as social post type, defaults visibility to `friends`, supports optional media. | stabilized |
| Home media upload | Hidden file input feeds the existing `/api/social/posts` multipart path. | stabilized |
| Home Stories from the Garden | Uses real media-bearing feed posts plus a local create-story entry. | stabilized |
| Home Live Activity | Uses `useActivityTicker()` socket events, then recent feed posts as fallback. | stabilized |
| Home Active Challenge | Uses `useChallenges()` and refuses demo challenge data as truth. CTA routes to Challenge Hub or Progress. | stabilized |
| Home Badges/Leaderboard | Uses recent earned achievements and gamification leaderboard rows. | stabilized |
| Home Trending | Reads `/api/social/hashtags/trending` through a React Query hook. | stabilized |
| DailyHealthLoop | Shows streak, level, progress, and role-aware workout route. | working |
| SwanCoachDock | Shows gated coach actions based on elite/admin/trainer access. | working as navigation |
| SwanCoachActionLauncher | Builds a local review receipt only. | partial |
| Feed tab | Mounts shared `SocialFeed variant="compact"`. | working |
| Progress tab | Mounts Workouts, Activity, and NutritionWorkspace. | partial integration |
| Community tab | Discovery/navigation hub with Feed and Find Friends active. | partial |
| Profile tab | Mounts About, Transformation, CreativeGallery, and PhotoGallery. | working, badge depth missing |
| Gamification | Level, XP, streak, tier, and top badges are read from existing gamification/profile hooks. | partial |
| Badges/rewards | Top badges appear, but full inventory and reward redemption are not mounted in this dashboard. | gap |
| Messaging | Existing API can return conversations with `unreadCount`. Dashboard only uses count today. | partial |
| Notifications | Existing endpoint returns notification data and unread count, but backend route is still mock-backed. | partial |
| Social Reels | Reels logic remains canonical; styles were extracted and tokenized to match the dashboard visual system. | visual stabilized |
| Global header | Desktop layout uses grid columns and nav shrink constraints to prevent logo/nav overlap at 4K. | stabilized |

### Data And API Wiring Map

| Dashboard need | Frontend source | Backend source | Notes |
|---|---|---|---|
| Profile identity/photo | `useUserDashboardV3Controller` via `useProfile()` | `/api/profile` | Home now consumes controller profile data. |
| Profile stats | `displayStats` from controller | `/api/profile/stats` | Used for posts/follow fallback. |
| Follow stats | `followStats` from controller | `/api/profile/follow-stats` | Home creator stats prefer these counts. |
| Profile posts | `profilePosts` from controller | `/api/profile/posts` | Used as posts count fallback. |
| Feed preview | `useSocialFeed({ limit: 4 })` | `/api/social/posts/feed` | Used for latest caption and fallback count. |
| Home stories | `buildHomeStories()` via `useHomeTabLiveWidgets()` | `/api/social/posts/feed` | Only media-bearing posts render as stories. |
| Home live activity | `useActivityTicker()` then `buildHomeLiveActivity()` | Socket event `social:activity`; feed fallback `/api/social/posts/feed` | Shows `Live` when socket connected, `Recent` otherwise. |
| Home active challenge | `useChallenges()` then `selectActiveChallengeSummary()` | `/api/v1/gamification/challenges` + `/api/v1/gamification/users/:id/challenges` | Demo data is not rendered as challenge truth. |
| Home badges | `useGamificationData().profile.data.achievements` | `/api/v1/gamification/profile` | Recent earned achievements only. |
| Home leaderboard | `useGamificationData().leaderboard.data` | `/api/v1/gamification/leaderboard` | Falls back to current user row only when no leaderboard rows exist. |
| Home trending | `useTrendingHashtags()` | `/api/social/hashtags/trending` | Query key: `social.trendingTags`. |
| Create post | `useCreatePost()` | `POST /api/social/posts` | Now accepts object payload and media. |
| Notification count | `useNotificationSummary()` | `/api/notifications` | API-backed count; backend still mock-backed. |
| Inbox count | `useMessageSummary()` | `/api/messaging/conversations` | Sums conversation `unreadCount`. |
| Gamification | `useGamificationData()` | `/api/v1/gamification/profile` | Used by Home and profile shell. |
| Workout log route | `getLogWorkoutDashboardPath()` | frontend route map | Role-aware navigation. |

### Stabilization Pass 1 Changes

- Added `HomeTabViewModel.ts` with tested pure helpers for stats, avatar, topbar counts, post payloads, and unread parsers.
- Removed hardcoded Home stat floors and fake follower/following counts.
- Removed static `TOP_BAR_ACTIONS` count data from the Home vision data file.
- Extended `useCreatePost()` to accept typed post payloads and multipart media.
- Added `useNotificationSummary()` and `useMessageSummary()` dashboard query hooks.
- Passed controller-owned profile data into `HomeTab` through `UserDashboardTabsV3`.
- Added media selection to the Home quick post card.
- Updated right-rail next-best tab actions to use scroll reset.

### Stabilization Pass 2 Changes

- Added tested live-widget mappers for stories, live activity, active challenge, badges, leaderboard rows, and trending tags.
- Added `useHomeTabLiveWidgets()` to connect the Home right rail to existing feed, socket activity, challenge, gamification, leaderboard, and hashtag data.
- Replaced static Home right-rail names, challenges, badge rows, and trending tags with live data and honest empty states.
- Added `useTrendingHashtags()` to `useDashboardQueries.ts` for `/api/social/hashtags/trending`.
- Fixed the global desktop header overlap by moving header content to `auto minmax(0, 1fr) auto auto` grid columns, adding nav shrink constraints, and preventing logo shrink.
- Removed an unused desktop `LogoutButton` style block from `NavigationLinks.tsx` while keeping logout behavior in `ActionIcons`.
- Refactored `VerticalReels.tsx` from 517 lines to a 246-line logic component plus a 283-line tokenized `VerticalReels.styles.ts` presentation module.
- Reels styling now uses Crystalline Swan theme tokens/fallbacks instead of fixed black/blue-only styling.

### Stabilization Pass 3 Changes

- Fixed the Feed/Progress/Community/Profile click trap by making the full-bleed profile header and non-interactive profile identity layer `pointer-events: none`.
- Restored pointer events only to real profile controls: banner reposition/upload, avatar upload, role badge, stat cards, edit profile, settings, and share buttons.
- Added a dashboard contract test that locks this pointer-event ownership so future profile-header polish cannot silently block the observatory rails again.
- Authenticated Playwright smoke confirmed side rail and top tab strip both switch to the expected panels from Feed.
- QA screenshots were archived under `docs/qa/user-dashboard/2026-05-13/` instead of staying in the repo root.

### Known Gaps To Fix Before Adding New Features

1. Notification persistence: `/api/notifications` currently returns mock data. Replace with real user notification storage before treating notification counts as production truth.
2. Badge/reward dashboard: mount a full badge inventory and reward panel using existing badge/gamification services.
3. Reward redemption endpoint: frontend callers must use `/api/v1/gamification/users/:userId/rewards/:rewardId/redeem`.
4. Progress unification: create one dashboard progress view-model that merges workout sessions, profile stats, achievements, and nutrition.
5. Community activation: wire Challenges and Factions only where the existing routes are product-ready.
6. Swan Coach Action: connect the local receipt to an existing review/command queue before presenting it as saved or sent.
7. Workout session route ownership: finish the `/api/workout/sessions` mount-order audit before changing deeper workout logic.
8. Share route: confirm `/profile/:userId` is the intended canonical public profile route.
9. Reels action depth: the Reels share/comment buttons are still visual/partial; wire them only after confirming canonical social comment/share routes.

### Future AI Work Rules

- Do not edit archived UserDashboard files for runtime behavior.
- Do not hardcode visible user stats, badges, notification counts, or feed counts.
- Start each stabilization slice with tests for the behavior being changed.
- Keep files under 300 lines; extract view-model/helper logic before a component becomes crowded.
- Use existing hooks and services first. New APIs come only after a route ownership check.
- Keep visual changes tied to the Crystalline Swan token system: `var(--token, #fallback)`.
- Update this document after every dashboard wiring slice.

### Verification

Last verified on this status update:

- `npx vitest run src/components/UserDashboard/HomeTabViewModel.test.ts`
- `npx vitest run src/components/UserDashboard/HomeTabViewModel.test.ts src/components/UserDashboard/UserDashboardDailyLoop.contract.test.ts src/components/UserDashboard/dashboardVisibleLanguageContract.test.ts`
- `npx vitest run src/components/UserDashboard/HomeTabViewModel.test.ts src/components/UserDashboard/UserDashboardDailyLoop.contract.test.ts src/components/UserDashboard/dashboardVisibleLanguageContract.test.ts src/components/Header/HeaderLayout.contract.test.ts`
- `npm run build`
- `git diff --check -- ACTIVE-INDEX.md docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-SYSTEM-STATUS-2026-05-13.md frontend/src/components/UserDashboard frontend/src/hooks/useDashboardQueries.ts`
- Scoped diff secret scan: `git diff -- ACTIVE-INDEX.md docs/ai-workflow/AI-HANDOFF/USER-DASHBOARD-SYSTEM-STATUS-2026-05-13.md frontend/src/components/UserDashboard frontend/src/hooks/useDashboardQueries.ts | bash scripts/scan-secrets.sh --stdin`
- Full changed-file content secret scan, including untracked new files, piped through `bash scripts/scan-secrets.sh --stdin`
- Browser route smoke: `http://127.0.0.1:5176/user-dashboard` loads the local app and redirects unauthenticated traffic to `/login?returnUrl=%2Fuser-dashboard`.
- Browser route smoke: `http://127.0.0.1:5176/social/reels` loads the local app and redirects unauthenticated traffic to `/login?returnUrl=%2Fsocial%2Freels`.
- Browser 4K header check at `3840x2160`: SwanStudios logo and Home nav bounding boxes do not overlap.
- Scoped diff secret scan for pass 2: dashboard/header/reels diff piped through `bash scripts/scan-secrets.sh --stdin`, Hits: 0.
- Authenticated Playwright smoke on `http://localhost:5173/user-dashboard` with local seeded admin:
  - Home widgets present: Stories from the Garden, Live Activity, Active Challenge, Badges, Leaderboard, Trending, Weekly Momentum, Next Best Action.
  - Side rail clicks from Feed: Progress -> `panel-progress`, Community -> `panel-community`, Profile -> `panel-profile`.
  - Top tab clicks from Feed: Feed, Progress, Community, Profile, Home all switch to their expected panels.
  - `bypass_admin_verification` cleared before the final protected-route check; `/user-dashboard` still loaded with the real local admin token.
  - Responsive checks passed at `2560x1440`, `3840x2160`, and `414x896`: no horizontal overflow and no logo/Home overlap; mobile nav visible at 414.
  - `/social/reels` loaded at `1440x1100` with no horizontal overflow.
- QA screenshots:
  - `docs/qa/user-dashboard/2026-05-13/swan-dashboard-home-1440-after-tab-fix.png`
  - `docs/qa/user-dashboard/2026-05-13/swan-dashboard-home-mobile-414-after-tab-fix.png`
  - `docs/qa/user-dashboard/2026-05-13/swan-reels-1440-after-polish.png`
- Current Playwright console result after final dashboard check: 0 errors. Residual warnings are performance/dev warnings: preload `main.jsx`, long task/TTI/FPS budget warning when Progress loads Nutrition, and local development mock-mode logs.
- `npx vitest run src/components/UserDashboard/HomeTabViewModel.test.ts src/components/UserDashboard/UserDashboardDailyLoop.contract.test.ts src/components/UserDashboard/dashboardVisibleLanguageContract.test.ts src/components/Header/HeaderLayout.contract.test.ts` -> 22 tests passed.
- `npm run build` -> passed with existing Vite chunk/import warnings.
- Full unstaged diff secret scan: `git diff | bash scripts/scan-secrets.sh --stdin` -> Hits: 0.

Build passed with existing Vite chunk/import warnings unrelated to this slice. Authenticated dashboard click-through is now covered by the pass 3 Playwright smoke above.
