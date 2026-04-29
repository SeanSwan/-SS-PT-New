# User Dashboard V3 Observatory Receipt - 2026-04-28

## Status

**Verdict:** PRE-CODE RECEIPT ONLY. Runtime implementation remains blocked until Sean / Third Eye review returns APPROVE.

**Chosen direction:** Crystalline Creator Observatory.

**Locked behavior decisions:**
- Preserve the live five-tab model: `home | feed | progress | community | profile`.
- Treat `Creative / Photos / Activity / Nutrition` as visual lens labels and section affordances, not new route/tab semantics.
- Do not ship a `Reels` lens label in this dashboard slice. The existing Reels surface remains outside `/user-dashboard`; no decorative Reels chrome and no new Reels routing is introduced here.
- Flatten the lazy-load fallback by changing `frontend/src/components/UserDashboard/index.ts` to re-export `UserDashboard.V3`.
- Fallback flatten clarity: changing `frontend/src/components/UserDashboard/index.ts` from `./UserDashboard-optimized` to `./UserDashboard.V3` removes the current visually divergent fallback dashboard.
- Accepted fallback tradeoff: this slice prioritizes visual consistency for `/user-dashboard`; it does not preserve an alternate rescue dashboard if the primary V3 import fails.
- Do not create a parallel `UserDashboard/observatory/` app layer.
- Preserve upload validation, blob URL revoke behavior, social callback contracts, and existing data hooks.
- Preserve the site-wide theme changer contract: the dashboard shell must respond to the existing header theme toggle and must consume theme variables instead of hardcoded dashboard-only colors.

**Revision after second review:**
- Classify the gamification redeem endpoint mismatch as existing hook drift outside this visual slice.
- Broaden the `UserDashboard` import sweep to include relative import forms such as `../../../UserDashboard/...`.
- Add fallback-flatten verification to the Tier-A plan.
- Tighten workout mount-order wording: `/api/workout` wins because `workoutRoutes.mjs` declares and responds to `/sessions`.
- Carry post-flatten `UserDashboard-optimized.tsx` dormancy into the follow-up ownership backlog without changing it in this slice.

**Revision after final pre-implementation reviews:**
- Add explicit lens-label mapping to live surfaces.
- Add fallback tradeoff, query-budget, accessibility, browser-smoke, visual-QA, bundle-size, file-size, and rollback guardrails.
- Keep implementation scope narrow: V3 visual shell + styles + index flatten only; no backend edits, no `TabId` changes, no new dashboard app layer, no unrelated ownership-backlog action.

**Codex context upgrade before implementation:**
- Add inherited-bug boundaries so the redesign does not accidentally claim to fix existing Nutrition, workout-history, or gamification API drift.
- Add source-contract test guidance for the `index.ts` fallback flatten.
- Add browser console/network budget and UI stability constraints for the first vertical slice.
- Add theme-foundation drift guards: the current theme button derives its next-label text from `availableThemes`, while `toggleTheme()` uses a separate hardcoded cycle. Phase 19A.1 fixes reachability for the 18 existing themes; Phase 19A.3 unifies registry metadata before any 20-theme claim.
- Add contemporary color-research guardrails: trend anchors can inspire named presets, but Swan palette rules, WCAG evidence, and theme-variable consumption remain the acceptance criteria.
- Add a theme-system gate: current code exposes 18 theme definitions, but the header toggle cycle only covers 14. The Observatory shell is blocked by 19A.1 toggle reachability and 19A.2 dashboard token discipline only; the 20-preset expansion and custom-theme creator are independent follow-up slices.

## Swan Orchestrator Pre-Task Gate

**TASK TYPE:** ui-redesign + dashboard surface audit
**TASK SCOPE:** Apply the approved Crystalline Creator Observatory visual redesign to the canonical `/user-dashboard` surface without changing the existing data or tab contracts.

**RULE 15 - Recursive Planning:** PASS for pre-code scope. Files likely touched are `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`, `frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts`, and `frontend/src/components/UserDashboard/index.ts`; any extracted file must be justified before edit.

**RULE 26 - Canonical Surface Receipt:** PASS in this document.

**RULE 27 - Surface Classification:** PASS in this document for the four dashboard files under `frontend/src/components/UserDashboard/`.

**RULE 31 - Backend Route Ownership / Shadow Audit:** PASS for existing dashboard API paths; no backend edit planned.

**RULE 32 - Repo Hygiene Scan:** PARTIAL. This receipt includes the UserDashboard competing-surface inventory required for the immediate surface. A full non-destructive repo hygiene inventory is not created in this document and remains a separate pre-implementation gate if Sean / Third Eye classifies this as a full dashboard audit rather than a redesign slice.

**RULE 40 - Swan Design Router:** PASS in this document. The 2-3 concept-direction gate is recorded below with two rejected alternatives and one selected direction.

**RULE 46 - Review Timing:** Planned after first local vertical slice: run deterministic checks, request Gemini review on changed files, then Codex hostile-review gates before commit/push.

**STATUS:** BLOCKED PENDING REVIEW.

## Canonical Surface Receipt

### 1. Route File Mounted At Target URL

Target URL: `/user-dashboard`

Route file:
- `frontend/src/routes/main-routes.tsx:353` defines `const UserDashboard = lazyLoadWithErrorHandling(`.
- `frontend/src/routes/main-routes.tsx:354` primary import is `() => import('../components/UserDashboard/UserDashboard.V3')`.
- `frontend/src/routes/main-routes.tsx:356` fallback import is `() => import('../components/UserDashboard')`.
- `frontend/src/routes/main-routes.tsx:793` defines `path: 'user-dashboard'`.
- `frontend/src/routes/main-routes.tsx:797` renders `<UserDashboard />` inside `ProtectedRoute` and `Suspense`.

### 2. Mounted JSX Page / Component

Mounted primary component:
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:159` defines `const UserDashboardV3`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:609` exports `UserDashboardV3`.

Proof of mount is the route JSX usage at `frontend/src/routes/main-routes.tsx:797`, not only the lazy import.

### 3. Consumer Hooks / Services

Canonical primary dashboard consumers:
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:174` consumes `useProfile()`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:177` consumes `useGamificationData()`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:544` renders `<SocialFeed variant="compact" />`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:369` consumes `useSocialFeed()`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:372` consumes `useActivityTicker()`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:373` consumes `useFaction()`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:374` consumes `useParty()`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:550` renders `<WorkoutsTab />`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:551` renders `<ActivitySection />`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:552` renders `<NutritionWorkspace />`.

### 4. Exact Frontend API Path String Literals

Profile service:
- `frontend/src/services/profileService.ts:134` uses `GET /api/profile`.
- `frontend/src/services/profileService.ts:170` uses `PUT /api/profile`.
- `frontend/src/services/profileService.ts:192` uses `POST /api/profile/upload-profile-photo`.
- `frontend/src/services/profileService.ts:224` uses `POST /api/profile/upload-banner-photo`.
- `frontend/src/services/profileService.ts:252` uses `GET /api/profile/stats`.
- `frontend/src/services/profileService.ts:277` uses `GET /api/profile/:userId/posts` or `GET /api/profile/posts`.
- `frontend/src/services/profileService.ts:321` uses `GET /api/profile/achievements`.
- `frontend/src/services/profileService.ts:339` uses `GET /api/profile/follow-stats`.

Gamification:
- `frontend/src/hooks/gamification/useGamificationData.ts:257` uses `GET /api/v1/gamification/profile`.
- `frontend/src/hooks/gamification/useGamificationData.ts:325` uses `GET /api/profile/achievements`.
- `frontend/src/hooks/gamification/useGamificationData.ts:395` uses `GET /api/v1/gamification/achievements`.
- `frontend/src/hooks/gamification/useGamificationData.ts:467` uses `GET /api/v1/gamification/rewards`.
- `frontend/src/hooks/gamification/useGamificationData.ts:485` uses `GET /api/v1/gamification/leaderboard`.
- `frontend/src/hooks/gamification/useGamificationData.ts:522` uses `POST /api/v1/gamification/rewards/${rewardId}/redeem`. This is existing out-of-scope hook drift for this visual redesign: the backend route is `POST /api/v1/gamification/users/:userId/rewards/:rewardId/redeem` at `backend/routes/gamificationV1Routes.mjs:275`, and `UserDashboard.V3.tsx` does not call `redeemReward`.

Social feed:
- `frontend/src/hooks/social/useSocialFeed.ts:144` uses `GET /api/social/posts/feed?limit=${limit}&offset=${currentOffset}`.
- `frontend/src/hooks/social/useSocialFeed.ts:227` uses `POST /api/social/posts`.
- `frontend/src/hooks/social/useSocialFeed.ts:280` uses `POST /api/social/posts/${postId}/like`.
- `frontend/src/hooks/social/useSocialFeed.ts:322` uses `DELETE /api/social/posts/${postId}/like?reactionType=${reactionType}`.
- `frontend/src/hooks/social/useSocialFeed.ts:357` uses `POST /api/social/posts/${postId}/comments`.
- `frontend/src/hooks/social/useSocialFeed.ts:408` uses `PUT /api/social/posts/${postId}`.
- `frontend/src/hooks/social/useSocialFeed.ts:427` uses `DELETE /api/social/posts/${postId}`.
- `frontend/src/hooks/social/useSocialFeed.ts:458` uses `POST /api/social/posts/${postId}/report`.
- `frontend/src/hooks/social/useSocialFeed.ts:485` uses `POST /api/social/posts/${postId}/repost`.
- `frontend/src/hooks/social/useSocialFeed.ts:501` uses `GET /api/social/posts/${postId}`.

Workout tab:
- `frontend/src/components/UserDashboard/components/WorkoutsTab.tsx:86` uses `GET /api/workout/sessions`.

### 5. Backend Route Matches

Profile:
- `backend/core/routes.mjs:266` mounts `app.use('/api/profile', profileRoutes)`.
- `backend/routes/profileRoutes.mjs:38` handles `POST /upload-profile-photo`.
- `backend/routes/profileRoutes.mjs:59` handles `POST /upload-banner-photo`.
- `backend/routes/profileRoutes.mjs:124` handles `GET /`.
- `backend/routes/profileRoutes.mjs:131` handles `PUT /`.
- `backend/routes/profileRoutes.mjs:138` handles `GET /stats`.
- `backend/routes/profileRoutes.mjs:145` handles `GET /posts`.
- `backend/routes/profileRoutes.mjs:152` handles `GET /achievements`.
- `backend/routes/profileRoutes.mjs:159` handles `GET /follow-stats`.
- `backend/routes/profileRoutes.mjs:166` handles `GET /:userId/posts`.
- `backend/routes/profileRoutes.mjs:173` handles `GET /:userId`.

Gamification:
- `backend/core/routes.mjs:367` mounts `app.use('/api/v1/gamification', gamificationV1Routes)`.
- `backend/core/routes.mjs:369` also mounts legacy `app.use('/api/gamification', gamificationV1Routes)`.
- `backend/routes/gamificationV1Routes.mjs:86` handles `GET /leaderboard`.
- `backend/routes/gamificationV1Routes.mjs:157` handles `GET /achievements`.
- `backend/routes/gamificationV1Routes.mjs:240` handles `GET /rewards`.
- `backend/routes/gamificationV1Routes.mjs:275` handles `POST /users/:userId/rewards/:rewardId/redeem`.
- `backend/routes/gamificationV1Routes.mjs:492` handles `GET /profile`.

Known mismatch, not a matched receipt path: `frontend/src/hooks/gamification/useGamificationData.ts:522` posts to `/api/v1/gamification/rewards/${rewardId}/redeem`, but `backend/routes/gamificationV1Routes.mjs:275` declares `/users/:userId/rewards/:rewardId/redeem`. This is not exercised by the current `UserDashboard.V3.tsx` redesign path, which reads gamification profile and level data but does not redeem rewards.

Social:
- `backend/core/routes.mjs:375` mounts `app.use('/api/social', socialRoutes)`.
- `backend/routes/social/index.mjs:15` mounts `router.use('/posts', postsRoutes)`.
- `backend/routes/social/posts.mjs:215` handles `GET /feed`.
- `backend/routes/social/posts.mjs:681` handles `POST /`.
- `backend/routes/social/posts.mjs:845` handles `GET /:postId`.
- `backend/routes/social/posts.mjs:938` handles `PUT /:postId`.
- `backend/routes/social/posts.mjs:1007` handles `DELETE /:postId`.
- `backend/routes/social/posts.mjs:1081` handles `POST /:postId/report`.
- `backend/routes/social/posts.mjs:1148` handles `POST /:postId/repost`.
- `backend/routes/social/posts.mjs:1208` handles `POST /:postId/like`.
- `backend/routes/social/posts.mjs:1293` handles `DELETE /:postId/like`.
- `backend/routes/social/posts.mjs:1329` handles `POST /:postId/comments`.

Workout sessions:
- `backend/core/routes.mjs:332` mounts `app.use('/api/workout', workoutRoutes)`.
- `backend/core/routes.mjs:333` mounts `app.use('/api/workout/sessions', workoutSessionRoutes)`.
- `backend/routes/workoutRoutes.mjs:201` handles `GET /sessions`.
- `backend/routes/workoutSessionRoutes.mjs:25` handles `GET /`.

Shadow condition for `GET /api/workout/sessions`: `backend/core/routes.mjs:332` mounts `/api/workout` before `backend/core/routes.mjs:333` mounts `/api/workout/sessions`, and `backend/routes/workoutRoutes.mjs:201` declares `GET /sessions` and responds via `workoutController.getWorkoutSessions`. Therefore line 332 wins for `GET /api/workout/sessions` before the later `/api/workout/sessions` mount is reached. No backend handler change is planned for this redesign.

### 6. Authoritative Model Fields

`backend/models/User.mjs` real fields used by the dashboard/profile path include:
- `id` at line 24.
- `firstName` at line 30.
- `lastName` at line 34.
- `email` at line 38.
- `username` at line 48.
- `photo` at line 65.
- `bannerPhoto` at line 69.
- `role` at line 75.
- `fitnessGoal` at line 100.
- `trainingExperience` at line 104.
- `healthConcerns` at line 108.
- `emergencyContact` at line 112.
- `bio` at line 194.
- `notificationPreferences` at line 270.
- `profileVisibility` at line 365.
- `showBadges` at line 374.
- `showAchievements` at line 380.
- `showStats` at line 386.
- `showWorkoutHistory` at line 392.
- `showLevel` at line 398.
- `chartVisibility` at line 407.

`backend/models/social/SocialPost.mjs` real fields used by the social feed path include:
- `id` at line 5.
- `userId` at line 10.
- `content` at line 18.
- `type` at line 22.
- `visibility` at line 27.
- `mediaUrl` at line 152.
- `mediaType` at line 157.
- `likesCount` at line 162.
- `commentsCount` at line 166.
- `createdAt` at line 170.
- `updatedAt` at line 174.

`backend/models/Gamification.mjs` real fields used by gamification surfaces include:
- `id` at line 21.
- `userId` at line 26.
- `level` at line 36.
- `experience` at line 41.
- `totalXP` at line 46.
- `streakCount` at line 51.
- `achievements` at line 56.
- `badges` at line 61.
- `totalWorkouts` at line 70.
- `currentTier` at line 85.
- `needsState` at line 139.
- `jobClass` at line 156.
- `currentMoodlet` at line 162.

`backend/models/WorkoutSession.mjs` real fields used by workout-session surfaces include:
- `id` at line 25.
- `userId` at line 30.
- `title` at line 39.
- `date` at line 44.
- `duration` at line 50.
- `intensity` at line 59.
- `notes` at line 73.
- `totalWeight` at line 80.
- `totalReps` at line 89.
- `totalSets` at line 98.
- `experiencePoints` at line 126.
- `status` at line 151.

## Surface Classification Table

| Surface | Path / File | Label | Evidence |
|---|---|---|---|
| User Dashboard V3 primary | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | canonical primary | Route primary import at `frontend/src/routes/main-routes.tsx:354`; component definition at `UserDashboard.V3.tsx:159`; rendered at `main-routes.tsx:797`. |
| User Dashboard optimized | `frontend/src/components/UserDashboard/UserDashboard-optimized.tsx` | canonical fallback today | Fallback import at `frontend/src/routes/main-routes.tsx:356` resolves to `frontend/src/components/UserDashboard/index.ts:1`, which exports `./UserDashboard-optimized`; file header says AAA edition at `UserDashboard-optimized.tsx:2`. |
| User Dashboard V3 no-dot | `frontend/src/components/UserDashboard/UserDashboardV3.tsx` | dormant / historical decomposed variant | No import hit outside self-references in frontend sweep. Contains separate `useFileUpload` flow at `UserDashboardV3.tsx:73` and older tab ids at `UserDashboardV3.tsx:111-117`. |
| User Dashboard V2 | `frontend/src/components/UserDashboard/UserDashboard.tsx` | dormant / legacy | No route or direct import hit in frontend sweep. File header says V2 at `UserDashboard.tsx:2`; it consumes `useProfile()` at `UserDashboard.tsx:1127` and `useSocialFeed()` at `UserDashboard.tsx:1145`. |

## Rule 54 Sibling-Sweep Evidence For `index.ts` Flatten

PowerShell equivalent used for the author's local run. Codex / Third Eye may also verify with:

```bash
rg -n "UserDashboard" frontend/src --glob "*.ts" --glob "*.tsx"
```

Bare-directory sweep command:

```powershell
Get-ChildItem -Path 'frontend/src' -Recurse -Include *.ts,*.tsx | Select-String -SimpleMatch 'components/UserDashboard' | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
```

Observed output:

```text
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\pages\Social\UserProfilePage.tsx:17: import ProfileChartsGrid from '../../components/UserDashboard/components/ProfileChartsGrid';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\pages\Social\UserProfilePage.tsx:18: import TransformationPhotoShowcase from '../../components/UserDashboard/components/TransformationPhotoShowcase';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\pages\Social\UserProfilePage.tsx:19: import type { TransformationPhoto } from '../../components/UserDashboard/components/TransformationPhotoTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\routes\main-routes.tsx:354: () => import('../components/UserDashboard/UserDashboard.V3'),
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\routes\main-routes.tsx:356: () => import('../components/UserDashboard')
```

Classification:
- `main-routes.tsx:356` is the only bare-directory import affected by flattening `index.ts`.
- `UserProfilePage.tsx:17-19` import subcomponents/types directly and are not affected by `index.ts`.
- `main-routes.tsx:354` imports `UserDashboard.V3` directly and is not affected by `index.ts`.

Broader relative-form import sweep command:

```powershell
Get-ChildItem -Path 'frontend/src' -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from ['`"](.*UserDashboard.*)['`"]|import\(['`"](.*UserDashboard.*)['`"]\)|vi\.mock\(['`"](.*UserDashboard.*)['`"]" | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line.Trim())" }
```

Observed output:

```text
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\DashBoard\Pages\client-dashboard\ClientProfilePage.tsx:41: } from '../../../UserDashboard/components/EditProfileChartToggles';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\DashBoard\Pages\client-dashboard\ClientProfilePage.tsx:45: () => import('../../../UserDashboard/components/ProfileChartsGrid')
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\DashBoard\Pages\client-dashboard\ClientProgressDashboardPage.test.tsx:80: vi.mock('../../../UserDashboard/components/ProfileChartsGrid', () => ({
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\components\ProfileBanner.tsx:24: import type { ProfileBannerProps } from '../types/UserDashboardTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\components\ProfileHeaderInfo.tsx:33: import type { ProfileHeaderInfoProps } from '../types/UserDashboardTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\components\QuickStatsSidebar.tsx:21: import type { QuickStatsSidebarProps } from '../types/UserDashboardTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\components\TabContent.tsx:21: import type { TabContentProps } from '../types/UserDashboardTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\components\TabNavigation.tsx:16: import type { TabNavigationProps } from '../types/UserDashboardTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\index.ts:1: export { default } from './UserDashboard-optimized';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\UserDashboard.V3.tsx:86: import type { TabId } from './types/UserDashboardTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\UserDashboardV3.tsx:74: import type { TabConfig, ProfileStats } from './types/UserDashboardTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\pages\Social\UserProfilePage.tsx:17: import ProfileChartsGrid from '../../components/UserDashboard/components/ProfileChartsGrid';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\pages\Social\UserProfilePage.tsx:18: import TransformationPhotoShowcase from '../../components/UserDashboard/components/TransformationPhotoShowcase';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\pages\Social\UserProfilePage.tsx:19: import type { TransformationPhoto } from '../../components/UserDashboard/components/TransformationPhotoTypes';
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\routes\main-routes.tsx:354: () => import('../components/UserDashboard/UserDashboard.V3'),
C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\routes\main-routes.tsx:356: () => import('../components/UserDashboard')
```

Broader sweep classification:
- Bare-directory import affected by `index.ts` flatten: only `frontend/src/routes/main-routes.tsx:356`.
- Direct V3 import unaffected by `index.ts`: `frontend/src/routes/main-routes.tsx:354`.
- Subcomponent/type imports unaffected by `index.ts`: `ClientProfilePage.tsx:41`, `ClientProfilePage.tsx:45`, `ClientProgressDashboardPage.test.tsx:80`, `UserProfilePage.tsx:17-19`, and the internal `../types/UserDashboardTypes` imports.
- `frontend/src/components/UserDashboard/index.ts:1` is the file to change; post-flatten, `UserDashboard-optimized.tsx` becomes a follow-up ownership-review item pending a separate approved maintenance pass.

## Tab Semantics Contract

Live tab type:
- `frontend/src/components/UserDashboard/types/UserDashboardTypes.ts:81` defines `export type TabId = 'home' | 'feed' | 'progress' | 'community' | 'profile';`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:194` initializes `activeTab` as `'home'`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:539` renders `HomeTab`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:544` renders `SocialFeed`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:550-552` renders workouts/activity/nutrition under `progress`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:558` renders `CommunityTab`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:564-566` renders about/creative/photos under `profile`.

Decision: do not alter `TabId`, route semantics, deep links, lazy chunk boundaries, or fixture assumptions in this slice.

### Lens Label Mapping To Existing Surfaces

The Observatory design may use the labels below as visual lens labels only. They do not create new tabs, new routes, or new data fetches.

| Lens label | Existing tab / section | What it renders in this slice | Evidence |
|---|---|---|---|
| Reels | Not shipped in this dashboard slice; related canonical social surface lives outside `/user-dashboard` | Do not embed `VerticalReels`, do not add a Reels tab, and do not render a decorative Reels label in this slice. If a future dashboard CTA should send users to Reels, that needs an explicit route/handler decision in a later slice. | `/user-dashboard` currently renders `SocialFeed variant="compact"` at `UserDashboard.V3.tsx:544`; separate Reels surface renders `VerticalReels` in `frontend/src/pages/Social/SocialPage.tsx:350`, outside this dashboard route. |
| Creative | Existing `profile` tab | Existing `CreativeGallery` remains under the `profile` tab. | Lazy import at `UserDashboard.V3.tsx:139`; render at `UserDashboard.V3.tsx:565`; component definition at `components/CreativeGallery.tsx:330`. |
| Photos | Existing `profile` tab | Existing `PhotoGallery` remains under the `profile` tab. No new transformation-photo logic is introduced. | Lazy import at `UserDashboard.V3.tsx:140`; render at `UserDashboard.V3.tsx:566`; component definition at `components/PhotoGallery.tsx:417`. |
| Activity | Existing `progress` tab | Existing `ActivitySection` remains under the `progress` tab. | Lazy import at `UserDashboard.V3.tsx:142`; render at `UserDashboard.V3.tsx:551`; component definition at `components/ActivitySection.tsx:375`. |
| Nutrition | Existing `progress` tab | Existing `NutritionWorkspace` remains under the `progress` tab. | Lazy import at `UserDashboard.V3.tsx:143`; render at `UserDashboard.V3.tsx:552`; component definition at `DashBoard/workspaces/NutritionWorkspace.tsx:81`. |

## Theme Changer / Tokenized Hex Theme System

Sean's requirement: the header theme changer must restyle the new `/user-dashboard` shell cleanly, with readable text, appropriate surfaces, and brand-grade contrast across every selectable theme. The Observatory visual direction becomes the default dashboard look, but it cannot become a hardcoded one-theme island.

Existing theme-system evidence:
- `frontend/src/components/Header/components/ActionIcons.tsx:17` imports `UniversalThemeToggle`.
- `frontend/src/components/Header/components/ActionIcons.tsx:239` renders `<UniversalThemeToggle size="medium" />`.
- `frontend/src/context/ThemeContext/UniversalThemeContext.tsx:1572-1591` exports 18 theme definitions today.
- `frontend/src/context/ThemeContext/UniversalThemeContext.tsx:1648-1658` uses a hardcoded toggle cycle that currently includes only 14 theme ids.
- `frontend/src/context/ThemeContext/UniversalThemeContext.tsx:1623-1639` loads/saves the selected theme through `localStorage` and calls `injectThemeVariables(themeId)`.
- `frontend/src/utils/theme/themeUtils.ts:29` generates CSS variables for the selected theme.
- `frontend/src/utils/theme/themeUtils.ts:115-128` emits semantic variables including `--bg-base`, `--bg-elevated`, `--bg-glass`, `--bg-surface`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-soft`, `--border-strong`, `--accent-primary`, `--accent-secondary`, and `--accent-gold`.
- `frontend/src/context/ThemeContext/UniversalThemeToggle.tsx:522-525` computes the next theme label from `availableThemes`, but `UniversalThemeContext.tsx:1648-1658` switches through the separate 14-id hardcoded cycle. If those lists diverge, the button's accessible name / tooltip can name a different next theme than the click will actually select.
- `frontend/src/context/ThemeContext/UniversalThemeToggle.tsx:435-501` hardcodes icon and description mappings for the 14 cycle themes only. The four defined-but-not-cycled themes fall through to generic Crystalline Swan labeling today. Phase 19A.1 must provide accurate accessible names/tooltips for all 18 reachable themes; Phase 19A.3 can then move that metadata into the unified registry.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:41` imports `useUniversalTheme`, and `UserDashboard.V3.tsx:161` reads `theme`.
- `[HYPOTHESIS]` Dashboard theme reactivity without reload is not yet proven for the redesigned shell. The provider plumbing exists (`setTheme`, `injectThemeVariables`, `themeChanged` event), but Phase 19B must verify re-render / repaint by source-reading the hook/provider path and by browser smoke or React Profiler while clicking the header toggle.

Decision:
- Use a tokenized hex source of truth. Theme presets may be authored as explicit hex palettes for auditability, but runtime dashboard styles must consume CSS variables / theme tokens.
- Do not hardcode dashboard-only colors except as fallbacks inside `var(--token, #fallback)` declarations.
- Do not introduce raw CSS injection from user-supplied custom themes. Custom user choices must map into a constrained token schema.
- Default Observatory visual language maps onto the existing Crystalline Swan token family first. If Sean wants the global app default changed from the current provider default to `crystalline-dark`, that is a separate explicit theme-default decision.
- Trend-derived preset names are inspiration labels, not doctrine. A preset is acceptable only if it passes contrast, reduced-motion, brand-fit, and dashboard smoke checks.

Immediate dashboard-slice rule:
- `UserDashboard.V3.tsx`, `DashboardV3Styles.ts`, and any extracted dashboard style file must use theme variables for backgrounds, text, borders, focus rings, accent fills, glass overlays, shadows, and gradients.
- Header theme toggle smoke must verify the dashboard updates without a page reload; until that smoke runs, treat the no-reload dashboard claim as `[HYPOTHESIS]`.
- At minimum, dashboard smoke must cover: default Crystalline, light, dark, monochrome, one warm theme, one green/nature theme, one high-chroma theme, and reduced-motion mode.
- When the 20-preset theme phase lands, the dashboard must be checked against all 20 presets.
- If Phase 19B lands before Phase 19A.3, closeout may claim compatibility with the current theme-variable contract only. It must not claim 20-preset coverage until the 20-preset registry and smoke matrix exist.

Theme phase decomposition:

| Phase | Scope | Blocks Phase 19B? | Notes |
|---|---|---|---|
| 19A.1 | Toggle cycle fix only: make all 18 existing theme definitions reachable from `toggleTheme()` / the header button. | Yes, but it is intentionally small. | Fix `UniversalThemeContext.tsx:1649-1654` so the click cycle cannot strand `void-crystal`, `deep-ocean`, `obsidian-aurora`, or `carbon-fiber`. Add minimally accurate icon/description handling for every currently defined theme so the header button's `aria-label`, title, and tooltip do not fall back to generic Crystalline Swan wording. Add a focused source-contract test that the toggle order includes every current theme id exactly once. No new presets in this sub-phase. |
| 19A.2 | Tokenized hex audit on dashboard files only. | Yes, bounded to the dashboard surface. | Audit `UserDashboard.V3.tsx`, `DashboardV3Styles.ts`, and any justified extracted dashboard style file. Replace hardcoded dashboard chrome colors with `var(--token, #fallback)` or existing theme variables. Produce a before/after raw-color inventory so any remaining raw color is classified as token fallback, theme-definition value, neutral overlay/shadow, media overlay, or unresolved. No new themes in this sub-phase. |
| 19A.3 | Research-informed new presets to reach 20 total selectable themes. | No. | Add Future Dusk plus either Mocha Luxe or Transformative Teal after 19B can already ship against the existing 18. This includes registry metadata, generated semantic variables, and contrast automation. |
| 19B | Observatory shell built against the existing 18 reachable themes via tokens. | N/A. | May start after 19A.1 and 19A.2 land. It must not claim 20-preset coverage until 19A.3 lands. |
| 19C | Custom theme creator: user-picked hex values, background controls, WCAG validation, and persistence. | No. | Separate feature with its own Rule 26 receipt. |

19A.3 theme-system expansion scope:
- Rebuild or refactor the theme registry so `themes`, `availableThemes`, `toggleTheme`, theme names, theme icons/descriptions, and injected CSS variables all read from one ordered preset source.
- Registry entries should carry at least: `id`, display name, accessible description, icon key, category, palette values, semantic variable mappings, and smoke-test classification tags such as light/dark/warm/nature/high-chroma.
- Target 20 total selectable presets in the header cycle. This receipt interprets Sean's requirement as 20 total selectable presets, not 20 additional presets beyond the 18 definitions currently present.
- The four current definitions outside the toggle cycle (`void-crystal`, `deep-ocean`, `obsidian-aurora`, `carbon-fiber`) must be reachable after 19A.1. In 19A.3 they can be retained, renamed under a migration plan, or carried forward as non-selectable legacy definitions only with documented reason.
- `toggleTheme()`, the button's `aria-label`, tooltip copy, icon, and description should derive their next/current theme from the same ordered registry when 19A.3 lands.
- Existing public contracts should remain stable unless a separate migration is approved: `ThemeId`, `themes`, `useUniversalTheme`, `availableThemes`, `setTheme`, `toggleTheme`, `injectThemeVariables`, the `swanstudios-theme` storage key, and the `themeChanged` event.
- Saved localStorage values that no longer map to a current preset must fall back deterministically to the default theme and re-inject CSS variables without throwing.
- Recommended 20-preset direction: retain the best existing Crystalline Swan presets, retire or rename confusing duplicates only in a separate approved maintenance pass, and add two research-informed presets:
  - `future-dusk`: dark blue-violet / celestial luxury direction informed by WGSN x Coloro's 2025 Future Dusk trend.
  - `mocha-luxe`: warm luxury accent direction informed by Pantone 2025 Mocha Mousse, constrained so it does not become a beige/brown one-note dashboard and still meets the Swan palette rules.
- Alternative 2026-aligned slot if Sean prefers a less warm preset: `transformative-teal`, informed by WGSN x Coloro's 2026 Transformative Teal direction, may be a better Swan-fit candidate than a second warm/brown family if the existing Ember presets already cover the warm lane.
- Contrast matrix handling: 19A.3 should use an automated script or test helper for the 6 checks x 20 themes matrix. Manual review can supplement the automation, but a manual 120-check matrix is not a 19A.1 or 19B blocker.
- Each preset needs contrast coverage for text-on-background, muted text-on-glass, button text-on-fill, badge text-on-fill, border visibility, and focus ring visibility.
- Each preset needs non-text contrast coverage for icons, focus indicators, control borders, chart marks, and meaningful status badges.
- Add source-contract tests for 19A.3: one test should prove the ordered registry length is 20, one should prove `toggleTheme()` walks that exact order, and one should prove every selectable preset has a display name, accessible description, icon key, and generated semantic variables.

Custom theme creator follow-up:
- Custom theme creation is Phase 19C, a distinct feature slice after the dashboard shell and the 20-preset foundation unless Sean explicitly expands the implementation scope.
- The creator should accept hex values into named token slots, not arbitrary CSS.
- It should validate WCAG 2.2 AA contrast before saving; invalid combinations should be blocked or auto-adjusted with a visible explanation.
- It should support page background image selection only through constrained controls: image source, overlay opacity, blur strength, focal position, and readability overlay. No user-provided CSS strings.
- This slice uses localStorage only. Account-level persistence requires a separate Rule 26 receipt covering the User model field, migration, and sync semantics before implementation.
- Custom theme previews should start on `/user-dashboard` before becoming site-wide.

Research anchors:
- WCAG 2.2 Contrast Minimum requires 4.5:1 for normal text and 3:1 for large text: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- WCAG 2.2 Non-text Contrast requires meaningful UI components and graphical objects to reach 3:1 against adjacent colors: https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- WGSN x Coloro's Future Dusk supports the blue-violet, futuristic, immersive direction that already fits Swan's dark luxury brand language: https://www.wgsn.com/en/wgsn/press/press-releases/wgsn-and-coloro-announce-color-year-2025-future-dusk
- WGSN x Coloro's 2026 Transformative Teal supports a blue-green, restorative, future-facing option for a contemporary preset without drifting into beige/brown dominance: https://www.wgsn.com/en/blogs/colour-year-2026-transformative-teal
- Pantone 2025 Mocha Mousse supports a warmer luxury option, but AGENTS.md palette rules mean it should be used as a controlled accent-led preset, not a dominant beige/brown dashboard: https://www.pantone.com/color-of-the-year/2025
- Current 2026 UI trend research is treated as inspiration only. The implementation bar is not trend agreement; it is Swan brand fit, theme-variable correctness, accessibility evidence, performance budget, and browser smoke across the selected preset matrix.

19A.3 cleanup / rebrand carry:
- `cyberpunk-edgerunners` currently contains the retired Galaxy color `#00FFFF` in its existing theme definition. This is pre-existing and was not introduced by 19A.1. Flag for 19A.3 retirement-or-rebrand decision before the 20-preset system is claimed.

## Logic Preservation List

Uploads:
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:220` enforces `MAX_UPLOAD_SIZE = 5 * 1024 * 1024`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:221` allows only `image/jpeg`, `image/png`, `image/webp`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:224-225` rejects invalid type/size.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:244` revokes blob URLs.

Avatar / banner upload affordance:
- Chosen placement: preserve the existing explicit avatar camera button and banner cover button, restyled into the Observatory shell.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:206-207` owns the hidden file input refs.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:248-253` opens the profile/background file pickers through `handleProfileImageClick` and `handleBackgroundClick`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:345-348` renders the banner upload button.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:360-366` renders the profile upload button with `aria-label="Upload profile photo"`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:576-586` renders the hidden profile/background file inputs.
- Keyboard equivalent: upload buttons must remain real focusable controls; Enter/Space must open the same file picker paths.
- Focus-visible state: both upload buttons need a visible theme-token focus ring with at least 3:1 contrast against the surrounding avatar/banner surface.

Social callbacks:
- `frontend/src/components/Social/Feed/SocialFeed.tsx:574` passes `onLike`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:575` passes `onReact`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:576` passes `onRemoveReaction`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:577` passes `onComment`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:578` passes `onEdit`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:579` passes `onDelete`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:580` passes `onReport`.
- `frontend/src/components/Social/Feed/SocialFeed.tsx:581` passes `onRepost`.

No duplicate social hooks:
- `frontend/src/components/Social/Feed/SocialFeed.tsx:372-374` already mounts activity ticker, faction, and party hooks. The redesign must not add a second right-rail consumer for those same hooks.

Data / query budget:
- Do not add new instances of `useGamificationData`, `useSocialFeed`, `useActivityTicker`, `useFaction`, or `useParty`.
- `useGamificationData` currently owns profile, achievements, rewards, and leaderboard query paths at `useGamificationData.ts:257`, `useGamificationData.ts:325`, `useGamificationData.ts:395`, `useGamificationData.ts:467`, and `useGamificationData.ts:485`. This redesign may restyle existing consumers but must not increase query count or duplicate right-rail consumers.
- Keep `redeemReward` endpoint drift out of scope unless the implementation introduces a reward-redemption UI, which this slice explicitly must not do.
- Preserve `SocialFeed` prop semantics: `SocialFeed.tsx:343` defines `variant?: 'full' | 'compact'`, and `UserDashboard.V3.tsx:544` uses `variant="compact"`. No new variant is planned; do not redefine `compact` silently.

Edit profile:
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:145` lazy-loads `./components/EditProfileModal`.
- `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:592-596` renders `EditProfileModal` and calls `updateProfile(data)` from the existing modal save path.
- If the Observatory redesign restyles the modal trigger, it must preserve the save callback and must not rebuild the modal in this slice.

Loading / error / empty states:
- Shell loading state must continue to render the V3 loading surface at `UserDashboard.V3.tsx:292-299`.
- Shell profile error state must continue to render the V3 error surface at `UserDashboard.V3.tsx:305-314`.
- Lazy tab fallback must continue using `LoadingContainer` / `LoadingSpinner` at `UserDashboard.V3.tsx:536`.
- Social feed loading/error/empty states stay owned by `SocialFeed`: loading at `SocialFeed.tsx:426`, error at `SocialFeed.tsx:436-452`, and empty welcome state at `SocialFeed.tsx:568-604`.
- Workouts loading/error/empty states stay owned by `WorkoutsTab`: loading at `WorkoutsTab.tsx:113-114`, error at `WorkoutsTab.tsx:117-123`, and empty state at `WorkoutsTab.tsx:142-153`.
- Activity empty/loading handling stays owned by `ActivitySection`: loading at `ActivitySection.tsx:434-444`, empty state at `ActivitySection.tsx:540-548`.
- Observatory shell must remain dignified for users with no posts, no workouts, no badges, or failed optional data; do not turn empty data into broken chrome.

Inherited issue boundaries:
- `NutritionWorkspace` is embedded under the existing `progress` tab. Prior QA found a live food-intake `POST /api/macros` 500. This redesign must not claim nutrition write behavior is fixed unless that endpoint is separately repaired and verified.
- `WorkoutsTab` reads `GET /api/workout/sessions`. Phase 19 trainer-note visibility gaps are outside this visual slice; do not claim workout-history truthfulness improvements from this redesign.
- `useGamificationData` has the out-of-scope `redeemReward` path mismatch documented above. Do not add reward redemption UI or claim reward redemption is fixed in this slice.
- Browser/network smoke should distinguish inherited API failures from new chrome regressions. Any pre-existing error observed during smoke must be tagged `[VERIFIED inherited]`, `[LIKELY inherited]`, or `[UNKNOWN]` in closeout instead of being folded into a visual success claim.

## Design Router Gate

The redesign was routed through `swan-design-router` for this receipt. The active source-of-truth docs reviewed were:
- `docs/ai-workflow/references/SWAN-CINEMATIC-DESIGN-SYSTEM.md`
- `docs/ai-workflow/references/SWAN-ASSET-STORYBOARDING.md`

### Concept Direction 1

**NAME:** Crystalline Creator Observatory

**PAGE STORY ARC:**
- Phase 1: Orientation clarity through identity, level, XP, and creator status.
- Phase 2: Current state through feed, quick post, media/lens shelf, and live activity.
- Phase 3: Progress / insight through momentum, badges, transformation, challenge, and leaderboard surfaces.
- Phase 4: Next-best-action through create post, join challenge, and continue-building CTAs.

**SECTION PATTERN STACK:**
- Phase 1 -> C9 media-first momentum header + C12 glass panel system.
- Phase 2 -> C5 shelf / poster wall + C12 dashboard glass panels.
- Phase 3 -> C11 premium chart environment + C9 KPI/progress blocks.
- Phase 4 -> C7 hover-depth action cards + Dual-Button Glow CTAs.

**EMOTIONAL JOBS PER PHASE:**
- Phase 1 -> orientation clarity.
- Phase 2 -> momentum and trust.
- Phase 3 -> aspiration and celebration.
- Phase 4 -> momentum.

**SIGNATURE MOMENT:** A crystalline profile command deck where the avatar, XP, media lenses, and challenge state feel like one creator cockpit rather than separate cards.

**ASSET TYPE NEEDED:** A3 existing profile/banner stills and existing post media; no new Seedance asset required for this implementation slice.

**MOTION TIER:** Tier-2 lean cinema baseline; tier-3 static composition under `prefers-reduced-motion`.

**WHY IT FITS:** It matches Sean's selected blended mockup while preserving the existing data model and five-tab contract.

**WHY IT COULD BE WRONG:** It requires careful density control on mobile; over-stacking glass panels would make the dashboard feel noisy.

**STATUS:** SELECTED.

### Concept Direction 2

**NAME:** Garden Profile Pavilion

**PAGE STORY ARC:**
- Phase 1: Large editorial profile garden card.
- Phase 2: Feed and stories as quiet crystalline garden paths.
- Phase 3: Weekly momentum and transformations as botanical proof.
- Phase 4: Next action as calm share/join prompts.

**SECTION PATTERN STACK:**
- Phase 1 -> C9 media-first profile card.
- Phase 2 -> C12 glass panel feed.
- Phase 3 -> C11 chart environment.
- Phase 4 -> C7 action cards.

**EMOTIONAL JOBS PER PHASE:** calm, trust, aspiration, intimacy.

**SIGNATURE MOMENT:** A large left-side profile card framed by crystalline foliage.

**ASSET TYPE NEEDED:** A3 high-resolution stills.

**MOTION TIER:** Tier-3 restrained baseline.

**WHY IT FITS:** It is elegant and least risky visually.

**WHY IT COULD BE WRONG:** It underplays the futuristic social-media energy Sean selected in the blended mockups.

**STATUS:** REJECTED.

### Concept Direction 3

**NAME:** Neon Arcade Command Center

**PAGE STORY ARC:**
- Phase 1: Dense arcade cockpit with XP, level, and navigation.
- Phase 2: Feed, short-form media candidates, badges, leaderboard, and trending rails all visible.
- Phase 3: Challenges and progress as game HUD systems.
- Phase 4: High-contrast create/join/share actions.

**SECTION PATTERN STACK:**
- Phase 1 -> C12 electric dashboard shell.
- Phase 2 -> C5 shelf + C9 KPI blocks.
- Phase 3 -> C11 chart environment + C7 challenge cards.
- Phase 4 -> Dual-Button Glow CTAs.

**EMOTIONAL JOBS PER PHASE:** awe, momentum, celebration, action.

**SIGNATURE MOMENT:** Full desktop command-center layout with left nav and right live rails.

**ASSET TYPE NEEDED:** Existing post media; optional A1 loops later.

**MOTION TIER:** Tier-1 full cinema candidate, with tier-2/3 fallbacks required.

**WHY IT FITS:** Strong futuristic energy and very close to the first selected desktop reference.

**WHY IT COULD BE WRONG:** Higher implementation and responsiveness risk, especially at 320/375/414 widths.

**STATUS:** REJECTED for first implementation slice; can inform desktop density.

### Mandatory Design Mini-Receipt

**SURFACE:** `/user-dashboard`, `UserDashboard.V3.tsx`
**SECTION TYPE:** C9 + C11 + C12 + C7
**EMOTIONAL JOB:** orientation clarity, momentum, aspiration, celebration
**SIGNATURE MOMENT:** Crystalline profile command deck blending identity, XP, social creation, and progress
**STACK CHECK:** styled-components-first; no Tailwind; no MUI; Victory only if chart work is touched
**PALETTE CHECK:** Crystalline Swan theme values only; no Galaxy-Swan; Dual-Button Glow for CTAs
**FALLBACK TIERS:** tier-1 optional full cinema later; tier-2 lean CSS/framer motion; tier-3 reduced-motion static layout
**ASSETS NEEDED:** No new Seedance asset required for this code slice

## Accessibility And UI Acceptance Guardrails

- Rule 2: every new interactive element must have a 44px minimum touch target, verified at 320px width.
- Rule 7: every new text/background color combination must meet WCAG 4.5:1 contrast, with extra scrutiny for glass overlays and disabled/muted text.
- Keyboard navigation: tab order must move through the shell, tab nav, upload controls, action buttons, and modal triggers without losing focus.
- Focus-visible states: every new button/link/tab/control must have a visible focus state using Crystalline Swan theme fallbacks.
- Upload controls: avatar/banner upload affordances must remain reachable by keyboard and must expose meaningful labels, not icon-only ambiguity.
- Image/button labels: new visual buttons and media controls need accessible names; decorative imagery must not produce noisy screen-reader output.
- Motion: `prefers-reduced-motion` must disable nonessential animation and remove decorative motion.
- Changed styles must be scanned for retired Galaxy colors: `#0a0a1a`, `#00FFFF`, `#7851A9`.
- Changed styles must be reviewed for excessive cyan/purple gradient overuse; Crystalline Swan accents should guide hierarchy, not turn the page into a one-note glow field.
- Changed styles must be scanned for raw theme-surface hexes. Palette hex values belong in theme definitions/token fallbacks; dashboard chrome should use `var(--token, #fallback)` and theme object values.
- Lens labels must be affordances, not explanatory in-app documentation. Do not add visible instructional copy that explains the redesign, labels the design system, or teaches users what the page is doing.
- New icon buttons should use existing lucide icons where available and keep text labels/tooltips accessible without squeezing text into tiny rounded pills.
- Fixed-format UI elements (avatar deck, lens rail, tab buttons, KPI counters, upload controls) need stable dimensions or responsive constraints so hover/focus/loading states cannot resize the layout.
- Do not scale font sizes with viewport width; use breakpoint-based layout changes and readable fixed/rem sizing instead.
- New glass-panel surfaces should use `contain: layout` or `contain: paint` where feasible. Avoid blanket `will-change: transform`; reserve it for elements that actually animate.
- New `<img>` elements should use `loading="lazy"` and `decoding="async"` unless they are first-viewport identity media that materially affects LCP.

## Visual QA Plan

Build order: mobile-first from 320px upward. This catches density and clipped-control issues early and keeps the desktop command-deck treatment from forcing a brittle mobile layout.

Viewport matrix:
- 320px
- 375px
- 414px
- 768px
- 1024px
- 1280px
- 1440px
- 1920px
- 2560px
- 3440px

Checks at each width:
- Text overlap.
- Clipped controls.
- Horizontal overflow.
- Nested glass/card density that makes the surface feel noisy.
- Touch target size.
- Focus-ring visibility.

Capture mechanism:
- Preferred: Playwright using the webapp-testing flow.
- Browser environment for manual fallback: Brave, matching Sean's usual visual-smoke preference.
- Before any runtime edits, capture pre-edit screenshots of `/user-dashboard` at all 10 viewport widths into `frontend/.playwright-screenshots/user-dashboard-v3-observatory/before/{viewport-width}.png`.
- Post-edit captures land at `frontend/.playwright-screenshots/user-dashboard-v3-observatory/after/{viewport-width}.png` for before/after review.
- If screenshots are generated, propose/confirm matching `.gitignore` coverage before committing so QA artifacts do not pollute the repo.
- Phase close audit record should reference the screenshot set or explain why screenshots were not captured.

## Test Inventory

Command:

```powershell
Get-ChildItem -Path 'frontend/src/components/UserDashboard' -Recurse -Include *.test.ts,*.test.tsx,*.spec.ts,*.spec.tsx | ForEach-Object { $_.FullName }
```

Observed test files under `components/UserDashboard/**`:
- `C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\components\ActivitySection.test.tsx`
- `C:\Users\BigotSmasher\Desktop\quick-pt\SS-PT\frontend\src\components\UserDashboard\components\ProfileChartsGrid.test.tsx`

Adjacent related tests found by broader frontend search:
- `frontend/src/components/DashBoard/Pages/client-dashboard/ClientProgressDashboardPage.test.tsx` mocks `ProfileChartsGrid`.
- `frontend/src/hooks/gamification/useGamificationData.test.tsx` covers gamification hook behavior.

## Tier-A Strategy

Full baseline:
- `npx tsc --noEmit --pretty false` was attempted from `frontend`.
- It timed out after about 184 seconds without returning output.
- The leftover `npx` and `tsc` child processes from that attempt were stopped.
- Full TypeScript baseline status remains `[UNKNOWN]`.

Chosen strategy for implementation:
1. Before runtime edits, capture pre-edit `/user-dashboard` screenshots at all 10 viewport widths into `frontend/.playwright-screenshots/user-dashboard-v3-observatory/before/{viewport-width}.png`.
2. Before runtime edits, run `npm run build` once if feasible and record the UserDashboard/V3 route chunk size from build output. Baseline format: `UserDashboard.V3 chunk size pre-edit: [N] KB`.
3. Run targeted tests for the dashboard inventory above.
4. Add or update a tiny source-contract test for the fallback flatten, preferably `frontend/src/components/UserDashboard/UserDashboard.index.test.ts` or an equivalent existing source-contract test. It should assert that `index.ts` exports `./UserDashboard.V3` and no longer exports `./UserDashboard-optimized`.
5. Verify the fallback-flatten contract after the edit by checking `frontend/src/components/UserDashboard/index.ts` exports `./UserDashboard.V3`, and by rebuilding the route bundle.
6. Run `npm run build` after implementation and record post-edit chunk size. Report delta as `post-edit: [N] KB; delta: [+/-N] KB`. If the route chunk grows by more than 50KB, justify or split.
7. Run full TypeScript check with increased memory and a longer timeout: `npm run type-check` with `NODE_OPTIONS=--max-old-space-size=16384`.
8. For broader slices such as 19A.2 and 19B, start the high-memory typecheck early and allow it to run in the background while other verification proceeds. A repeated `[UNVERIFIED]` full typecheck across larger JSX/style slices weakens Rule 56 value and needs explicit disclosure.
9. If full typecheck still fails to complete, report full baseline as `[UNKNOWN]` / `[UNVERIFIED]` and do not claim broad Tier-A green.
10. Run a source/style scan for retired Galaxy colors in changed files: `#0a0a1a`, `#00FFFF`, `#7851A9`.
11. Run a theme-token scan against changed dashboard files: raw hex colors are allowed only in theme definitions or `var(--token, #fallback)` fallbacks.
12. Re-run the sensitive-value scan against staged code/doc edits before commit.
13. Confirm whether Storybook stories exist for `UserDashboard.V3` or the touched dashboard shell; update them only if present and in scope.
14. Run browser smoke on `/user-dashboard`: click each of the five tabs in turn, verify fallback flatten did not alter tab semantics, trigger the actual avatar upload flow with a small JPEG/PNG/WebP fixture, verify upload controls still open the file input, scroll the compact social feed past the first batch to verify pagination still fires, emulate `prefers-reduced-motion: reduce`, and verify no new console/network errors were introduced beyond explicitly tagged inherited issues.
15. Run theme smoke through the header toggle: after 19A.1, verify all 18 current themes are reachable. For 19B, verify default Crystalline, light, dark, monochrome, one warm theme, one green/nature theme, one high-chroma theme, and reduced-motion mode. After 19A.3 lands, rerun this against all 20 presets.
16. If animated glow/pulse effects make browser automation require forced clicks, treat that as a reduced-motion verification item for 19B. The production UI can keep premium motion, but `prefers-reduced-motion: reduce` must remove nonessential motion enough for stable keyboard and browser-smoke activation.

## Planned Implementation Scope After Approval

Vertical slice definition:
- First local vertical slice = Observatory shell + fallback flatten + all five existing tabs preserved as-is.
- The Gemini -> Codex review chain fires after this shell slice and deterministic checks, before any per-tab expansion or maintenance work.
- Per-tab visual refinements can follow only after the shell slice survives review.
- Split implementation into 19A.1 Toggle Reachability, 19A.2 Dashboard Token Audit, 19A.3 New Theme Presets, 19B Dashboard Observatory Shell, and 19C Custom Theme Creator.
- Phase 19B may start after 19A.1 and 19A.2 land. It does not block on 19A.3.

File-size discipline:
- Current `UserDashboard.V3.tsx` line count is 609, already above the Rule 4 300-line cap.
- Current `DashboardV3Styles.ts` line count is 1483, already above the Rule 4 300-line cap.
- This is pre-existing debt. The slice must not worsen it casually.
- Extraction trigger: if `UserDashboard.V3.tsx` would exceed 659 lines post-edit, extract new shell JSX into a focused subcomponent before continuing.
- Style extraction trigger: do not add a large new style block to `DashboardV3Styles.ts`; if raw additions exceed 50 lines, justify and extract a focused style file before edit.
- Any extracted file must be justified before edit and documented in this receipt or the implementation closeout.
- Rule 43 reminder: any new shared style fragment with `${}` interpolation of a styled-components primitive (`keyframes`, `css`, helper output) must use the `css` tagged template helper, not a plain string.

1. Flatten fallback:
   - Change `frontend/src/components/UserDashboard/index.ts` from `./UserDashboard-optimized` to `./UserDashboard.V3`.
   - This removes the visually divergent fallback dashboard for `/user-dashboard`.
   - Accepted tradeoff: visual consistency is prioritized over preserving a separate rescue dashboard if the primary V3 import fails.
   - Leave `UserDashboard-optimized.tsx` in place for this slice.

2. Apply Observatory visual shell in-place:
   - Update `UserDashboard.V3.tsx` only where JSX structure needs the approved shell and visual lens labels.
   - Update `DashboardV3Styles.ts` or narrowly extracted style files only as needed.
   - Keep existing `TabId` union unchanged.
   - Keep existing tab content components unchanged unless responsive containment requires a wrapper.
   - Consume theme variables/tokens for dashboard chrome so the header theme changer restyles the dashboard without a reload.
   - Do not render a Reels lens label in this slice.

3. Preserve contracts:
   - Do not change `useProfile`, `useGamificationData`, `useSocialFeed`, `useActivityTicker`, `useFaction`, or `useParty` APIs.
   - Do not duplicate social hook consumers in any new right rail.
   - Do not replace upload handling with `useFileUpload`.

4. Responsive and motion verification:
   - Verify widths: 320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560, 3440.
   - Verify `prefers-reduced-motion` removes nonessential motion.
   - Verify header theme-toggle compatibility across the required 19B smoke preset set.

5. Review chain:
   - After first local vertical slice and deterministic checks, request Gemini review on changed files.
   - Codex then reviews implementation plus Gemini feedback and returns APPROVE / REVISE / REJECT before commit/push.
   - After Codex APPROVE, commit, push, and Render auto-deploy, visit production `/user-dashboard`, verify the new shell renders, and capture one production screenshot at 1440px for the closeout audit record. If the lazy chunk fails to load, exercise the fallback path to confirm the flatten landed.

6. Closeout deliverable:
   - Working phase label: Phase 19 User Dashboard V3 Observatory unless Sean overrides it.
   - At phase close, produce `docs/ai-workflow/AI-HANDOFF/PHASE-19-USER-DASHBOARD-V3-OBSERVATORY-AUDIT-RECORD-2026-04-28.md` if Sean considers the workstream complete.

7. Follow-up backlog carry:
   - After `index.ts` re-exports `UserDashboard.V3`, `frontend/src/components/UserDashboard/UserDashboard-optimized.tsx` will have no known consumer from the current sweep. Record it as a follow-up ownership-review item pending a separate Rule 34 / Rule 37 approved maintenance pass. Leave it in place for this redesign slice.

8. Rollback plan:
   - No feature flag is being added; Karpathy P2 simplicity favors git rollback.
   - If this slice lands as one isolated commit, rollback is `git revert <slice-commit-sha>` followed by normal push for Render auto-deploy.
   - If only the fallback flatten causes an issue, rollback is a one-line revert in `frontend/src/components/UserDashboard/index.ts` from `./UserDashboard.V3` back to `./UserDashboard-optimized`.
   - If visual issues are isolated to V3 styles/JSX, revert the visual commit while leaving unrelated follow-up backlog items untouched.

## Success Criteria

- All five existing tabs render: `home`, `feed`, `progress`, `community`, `profile`.
- `index.ts` fallback no longer renders a visually divergent dashboard.
- Upload validation remains: 5MB max and JPEG/PNG/WebP only.
- Blob URL revoke remains present for background preview.
- Social callback props remain wired: like, react, remove reaction, comment, edit, remove post, report, repost.
- No new duplicate calls to `useActivityTicker`, `useFaction`, or `useParty`.
- Existing dashboard test inventory is run and results reported.
- Source-contract test locks `index.ts` to `./UserDashboard.V3` and away from `./UserDashboard-optimized`.
- Fallback flatten is verified by source-level assertion that `index.ts` exports `./UserDashboard.V3`.
- Build/typecheck status is reported with Rule 56 baseline honesty.
- Browser smoke verifies all five tabs render, tab semantics are unchanged, upload controls open file inputs, reduced-motion mode suppresses nonessential animation, and no new console/network errors are introduced beyond explicitly tagged inherited issues.
- Browser smoke clicks all five tabs, triggers the avatar upload fixture path, scrolls `SocialFeed variant="compact"` far enough to exercise pagination, and verifies reduced-motion through emulated CSS media.
- Header theme-toggle smoke verifies the dashboard updates without reload across default Crystalline, light, dark, monochrome, one warm theme, one green/nature theme, and one high-chroma theme. Before this smoke runs, the no-reload dashboard claim remains `[HYPOTHESIS]`.
- 19A.1 header-toggle smoke verifies the four formerly stranded themes are reachable and that the button's `aria-label`, title, tooltip, and visible icon/label semantics are accurate for each newly reachable theme.
- Responsive matrix is visually smoke-tested at 320, 375, 414, 768, 1024, 1280, 1440, 1920, 2560, and 3440 widths.
- Visual QA checks text overlap, clipped controls, horizontal overflow, touch target size, focus-ring visibility, and excessive nested glass/card density.
- Keyboard tab navigation remains coherent through the shell, tab nav, upload controls, action buttons, and modal triggers.
- New interactive elements maintain 44px minimum touch targets.
- New color combinations meet WCAG 4.5:1 contrast.
- Upload controls remain accessible by keyboard and meaningful labels.
- Lens labels do not introduce new route/tab semantics or in-app explanatory copy.
- Reels is not rendered as a dashboard lens label in this slice.
- Fixed-format UI elements have stable responsive dimensions; hover/focus/loading states do not shift the layout.
- Motion respects reduced-motion settings.
- Changed styles contain none of the retired Galaxy colors: `#0a0a1a`, `#00FFFF`, `#7851A9`.
- Changed dashboard chrome uses theme variables / `var(--token, #fallback)` so theme presets can restyle backgrounds, text, borders, focus rings, and accent surfaces.
- Changed styles are reviewed for cyan/purple gradient overuse.
- `SocialFeed variant="compact"` prop contract remains unchanged.
- Bundle-size delta is disclosed; any UserDashboard/V3 route chunk growth above 50KB is justified or split.
- 19A.1 success means all 18 current themes are reachable from the header toggle and covered by a source-contract test.
- 19A.2 success means changed dashboard chrome consumes theme variables / `var(--token, #fallback)` and does not introduce raw dashboard-only color islands.
- 19A.2 closeout includes a raw-color inventory for changed dashboard files; any remaining raw color must be classified or the audit remains incomplete.
- 19A.3 success, when run, means 20 selectable presets are present in the header toggle cycle and every preset has an automated contrast smoke result.

## 19A.2 Closeout - Dashboard Token Audit

Status: `[VERIFIED]` implemented as a value-only token audit. No dashboard hooks, API paths, tab IDs, upload handlers, callback wiring, route fallback, or JSX structure were changed.

Files changed:

| File | Runtime impact | Line-count result |
|---|---:|---:|
| `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | Existing inline style string values only | 609 -> 609 |
| `frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts` | Existing styled-component color values only | 1483 -> 1482 |
| `frontend/src/components/UserDashboard/UserDashboardTokenAudit.test.ts` | New source-contract test, no production bundle impact | new 46-line test |

Pre-edit inventory:

| File | Raw scan result before edit | Classification |
|---|---:|---|
| `UserDashboard.V3.tsx` | 8 raw color values | Existing inline style values; approved value-only path |
| `DashboardV3Styles.ts` | 124 hits | 122 real color/gradient/rgba hits + 2 `white-space` false positives |
| Source-contract red run | 66 unresolved values | Confirmed the test failed before the substitutions |

Post-edit classified inventory:

| File | Category | Count | Status |
|---|---:|---:|---|
| `UserDashboard.V3.tsx` | token fallback hex | 8 | `[VERIFIED]` allowed `var(--token, #fallback)` |
| `UserDashboard.V3.tsx` | token-name `--color-white` | 1 | `[VERIFIED]` existing token from `themeUtils.ts:56` |
| `UserDashboard.V3.tsx` | CSS keyword (`transparent` / `currentColor`) | 2 | `[VERIFIED]` allowed CSS keyword |
| `DashboardV3Styles.ts` | token fallback hex | 64 | `[VERIFIED]` allowed `var(--token, #fallback)` |
| `DashboardV3Styles.ts` | token-name `--color-white` | 6 | `[VERIFIED]` existing token from `themeUtils.ts:56` |
| `DashboardV3Styles.ts` | neutral overlay / shadow rgba | 39 | `[VERIFIED]` intentionally not mapped to `--bg-base` |
| `DashboardV3Styles.ts` | CSS keyword (`transparent` / `currentColor`) | 42 | `[VERIFIED]` allowed CSS keyword |
| `DashboardV3Styles.ts` | `white-space` false positive | 2 | `[VERIFIED]` scanner false positive |

Residual conclusion:
- `[VERIFIED]` zero unresolved raw dashboard chroma colors remain in the two changed dashboard runtime files.
- `[VERIFIED]` changed dashboard files contain none of retired Galaxy colors: `#0a0a1a`, `#00FFFF`, `#7851A9`.
- `[VERIFIED]` `--color-white` is an existing emitted CSS variable, not a new semantic variable, at `frontend/src/utils/theme/themeUtils.ts:56`.
- `[VERIFIED]` neutral black/white rgba values remain classified as overlay/shadow physics. They were not mapped to `--bg-base` to avoid white/invisible shadows on light themes.

19A.3 open questions:
- Consider introducing semantic `--text-on-accent` across all selectable themes, then migrating the 7 current dashboard `--color-white` filled-surface callsites to that semantic token.
- Consider introducing semantic `--shadow-color` / `--overlay-highlight-color` across all selectable themes. Current dashboard residual cost: 39 neutral rgba overlay/shadow callsites in `DashboardV3Styles.ts`.
- `cyberpunk-edgerunners` still emits `#00FFFF` as its theme accent. This was observed in 19A.2 smoke and remains the 19A.3 retirement-or-rebrand decision; it was not introduced by this dashboard token audit.

Verification:

| Check | Result |
|---|---|
| `npx vitest run src/components/UserDashboard/UserDashboardTokenAudit.test.ts src/components/UserDashboard/components/ActivitySection.test.tsx src/components/UserDashboard/components/ProfileChartsGrid.test.tsx src/context/ThemeContext/UniversalThemeContext.themeCycle.test.ts` | `[VERIFIED]` pass: 4 files, 6 tests |
| `npm run build` | `[VERIFIED]` pass; existing Vite dynamic-import/chunk warnings remain |
| UserDashboard route chunk | `[VERIFIED]` post-edit `UserDashboard.V3.DdvLlnaF.js` = 39.42 kB, gzip 8.87 kB |
| Full `npm run type-check` with `NODE_OPTIONS=--max-old-space-size=16384` | `[UNVERIFIED]` timed out at 10 minutes; leftover `tsc` node process PID 24996 stopped |
| Browser smoke, production preview `/user-dashboard` at 1440px | `[VERIFIED with caveats]` route rendered, all five tabs clicked, upload button opened file chooser, feed rendered 10-post first batch after scroll, reduced-motion media emulation applied |
| Theme reactivity smoke | `[VERIFIED]` dashboard CSS variables changed without reload across `crystalline-default`, `crystalline-light`, `crystalline-dark`, `crystalline-mono`, `cinematic-ember`, `cyberpunk-edgerunners`, and `frozen-canopy` |
| Browser smoke caveats | `[VERIFIED inherited]` local preview produced external Socket.IO CORS noise and existing 401s for `/api/subscriptions/status` and `/api/macros/summary`; neither endpoint is touched by 19A.2 |
| Theme-toggle automation caveat | `[VERIFIED with caveat]` Playwright required forced clicks on the animated header theme toggle because the element did not stabilize. Carry this into 19B reduced-motion/browser-smoke review. |

Rule 46 review log:
- `[VERIFIED]` Gemini review ran on `DashboardV3Styles.ts`; output saved to `AI-Village-Documentation/gemini-consults/2026-04-29T07-14-02-review.md`.
- `[VERIFIED]` Gemini review ran on `UserDashboard.V3.tsx`; output saved to `AI-Village-Documentation/gemini-consults/2026-04-29T07-15-35-review.md` and `latest.md`.
- Codex disposition: no Gemini finding blocks 19A.2. Gemini's requested `theme.ts` / app `ThemeProvider` rewrite, button redesign, background replacement, persistent layout change, inline-style extraction, badge icon redesign, and tab redesign conflict with the approved value-only token audit scope. Carry the useful design critique into 19B, especially inline-style extraction and reduced-motion/browser-smoke stabilization for animated controls.

19A.2 scope lock:
- No new theme presets were added.
- No Observatory shell was added.
- No custom theme creator work was started.
- No backend code was touched.
- No fallback flatten was touched in this slice.
- Phase 19B remains the selected-dashboard-image implementation target after this token audit lands.

## Pending Review Questions

1. Does Third Eye approve the fallback flatten after the sibling sweep shows only `main-routes.tsx:356` is affected by the bare-directory import?
2. Does Third Eye accept the design-router concept audit trail with Direction 1 selected and Directions 2-3 rejected?
3. Does Sean / Third Eye approve the revised implementation order: 19A.1 toggle reachability -> 19A.2 dashboard token audit -> 19B Observatory shell, with 19A.3 new presets and 19C custom theme creator as independent follow-up slices?
4. Does Third Eye accept this receipt's interpretation of the theme target as 20 total selectable presets, not 20 net-new presets beyond the 18 definitions currently present in `UniversalThemeContext.tsx`?
