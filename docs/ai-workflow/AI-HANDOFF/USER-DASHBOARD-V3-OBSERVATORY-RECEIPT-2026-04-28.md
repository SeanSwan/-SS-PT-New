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
<REPO>\frontend\src\pages\Social\UserProfilePage.tsx:17: import ProfileChartsGrid from '../../components/UserDashboard/components/ProfileChartsGrid';
<REPO>\frontend\src\pages\Social\UserProfilePage.tsx:18: import TransformationPhotoShowcase from '../../components/UserDashboard/components/TransformationPhotoShowcase';
<REPO>\frontend\src\pages\Social\UserProfilePage.tsx:19: import type { TransformationPhoto } from '../../components/UserDashboard/components/TransformationPhotoTypes';
<REPO>\frontend\src\routes\main-routes.tsx:354: () => import('../components/UserDashboard/UserDashboard.V3'),
<REPO>\frontend\src\routes\main-routes.tsx:356: () => import('../components/UserDashboard')
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
<REPO>\frontend\src\components\DashBoard\Pages\client-dashboard\ClientProfilePage.tsx:41: } from '../../../UserDashboard/components/EditProfileChartToggles';
<REPO>\frontend\src\components\DashBoard\Pages\client-dashboard\ClientProfilePage.tsx:45: () => import('../../../UserDashboard/components/ProfileChartsGrid')
<REPO>\frontend\src\components\DashBoard\Pages\client-dashboard\ClientProgressDashboardPage.test.tsx:80: vi.mock('../../../UserDashboard/components/ProfileChartsGrid', () => ({
<REPO>\frontend\src\components\UserDashboard\components\ProfileBanner.tsx:24: import type { ProfileBannerProps } from '../types/UserDashboardTypes';
<REPO>\frontend\src\components\UserDashboard\components\ProfileHeaderInfo.tsx:33: import type { ProfileHeaderInfoProps } from '../types/UserDashboardTypes';
<REPO>\frontend\src\components\UserDashboard\components\QuickStatsSidebar.tsx:21: import type { QuickStatsSidebarProps } from '../types/UserDashboardTypes';
<REPO>\frontend\src\components\UserDashboard\components\TabContent.tsx:21: import type { TabContentProps } from '../types/UserDashboardTypes';
<REPO>\frontend\src\components\UserDashboard\components\TabNavigation.tsx:16: import type { TabNavigationProps } from '../types/UserDashboardTypes';
<REPO>\frontend\src\components\UserDashboard\index.ts:1: export { default } from './UserDashboard-optimized';
<REPO>\frontend\src\components\UserDashboard\UserDashboard.V3.tsx:86: import type { TabId } from './types/UserDashboardTypes';
<REPO>\frontend\src\components\UserDashboard\UserDashboardV3.tsx:74: import type { TabConfig, ProfileStats } from './types/UserDashboardTypes';
<REPO>\frontend\src\pages\Social\UserProfilePage.tsx:17: import ProfileChartsGrid from '../../components/UserDashboard/components/ProfileChartsGrid';
<REPO>\frontend\src\pages\Social\UserProfilePage.tsx:18: import TransformationPhotoShowcase from '../../components/UserDashboard/components/TransformationPhotoShowcase';
<REPO>\frontend\src\pages\Social\UserProfilePage.tsx:19: import type { TransformationPhoto } from '../../components/UserDashboard/components/TransformationPhotoTypes';
<REPO>\frontend\src\routes\main-routes.tsx:354: () => import('../components/UserDashboard/UserDashboard.V3'),
<REPO>\frontend\src\routes\main-routes.tsx:356: () => import('../components/UserDashboard')
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
- `<REPO>\frontend\src\components\UserDashboard\components\ActivitySection.test.tsx`
- `<REPO>\frontend\src\components\UserDashboard\components\ProfileChartsGrid.test.tsx`

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

## 19B Visual Target Spec - Observatory Shell Gate

Status: PRE-CODE SPEC ONLY. Runtime implementation remains blocked until Sean / Third Eye reviews this table and returns APPROVE. No JSX, styles, fallback flatten, hooks, API paths, upload logic, or tab semantics are changed by this section.

Static visual shell definition:
- A static visual shell has no click handler, no `aria-label`, text, title, tooltip, or visible label that promises interactivity, no `cursor: pointer`, and only displays data already fetched by existing hooks.
- Anything that looks clickable must either wire to a real existing surface cited below or be omitted from this slice.
- Decorative-without-affordance remains a Rule 28 risk and must not ship.

Decision values used below:
- `existing-surface`: backed by an existing hook/component/route with file:line evidence.
- `static-decorative`: display-only chrome with no interactive affordance.
- `omit-this-slice`: deferred because no proven live dashboard surface exists.
- `out-of-scope-build-static-only`: visual-only shell allowed only if it has no click behavior or false functionality claim.

| Region | Image location | Existing surface? | Decision | Evidence |
|---|---|---|---|---|
| Left sidebar nav - Home | Desktop left rail | Yes, existing dashboard tab | `existing-surface` | `UserDashboardTypes.ts:81` defines `home`; `UserDashboard.V3.tsx:509` labels Home; `UserDashboard.V3.tsx:539` renders `HomeTab`. |
| Left sidebar nav - Feed | Desktop left rail | Yes, existing dashboard tab | `existing-surface` | `UserDashboardTypes.ts:81` defines `feed`; `UserDashboard.V3.tsx:510` labels Feed; `UserDashboard.V3.tsx:544` renders `SocialFeed variant="compact"`. |
| Left sidebar nav - Creative | Desktop left rail / mock lens label | Existing content only under Profile tab | `existing-surface` only as a lens to existing Profile content, not a new tab | `UserDashboardTypes.ts:81` has no `creative` tab; `UserDashboard.V3.tsx:565` renders `CreativeGallery` only inside the profile tab. |
| Left sidebar nav - Photos | Desktop left rail / mock lens label | Existing content only under Profile tab | `existing-surface` only as a lens to existing Profile content, not a new tab | `UserDashboardTypes.ts:81` has no `photos` tab; `UserDashboard.V3.tsx:566` renders `PhotoGallery` only inside the profile tab; `PhotoGallery.tsx:417-424` owns gallery state/data. |
| Left sidebar nav - About | Desktop left rail / mock lens label | Existing content only under Profile tab | `existing-surface` only as a lens to existing Profile content, not a new tab | `UserDashboard.V3.tsx:564` renders `AboutSection` inside profile tab. |
| Left sidebar nav - Activity | Desktop left rail / mock lens label | Existing content inside Progress tab | `existing-surface` only as a lens to existing Progress content, not a new tab | `UserDashboard.V3.tsx:551` renders `ActivitySection`; `ActivitySection.tsx:375-378` uses `useProfile` stats/posts. |
| Left sidebar nav - Nutrition | Desktop left rail / mock lens label | Existing content inside Progress tab | `existing-surface` only as a lens to existing Progress content, not a new tab | `UserDashboard.V3.tsx:552` renders `NutritionWorkspace`; `UserDashboardTypes.ts:81` has no `nutrition` tab. |
| Profile/banner header | Desktop top hero / mobile hero card | Yes | `existing-surface` | `UserDashboard.V3.tsx:339` renders `ProfileHeader`; `UserDashboard.V3.tsx:361` wires avatar upload button; `UserDashboard.V3.tsx:575-586` keep hidden profile/banner file inputs. |
| Profile/banner upload affordance | Avatar and banner areas | Yes | `existing-surface` | `UserDashboard.V3.tsx:220-225` validates 5MB + JPEG/PNG/WebP; `UserDashboard.V3.tsx:244` revokes preview blob URL; `UserDashboard.V3.tsx:248-253` opens file inputs. |
| Crystal Voyager tier badge | Username/tier chip near hero | Tier exists, literal label not guaranteed | `existing-surface` only with real tier text | `HomeTab.tsx:416` derives `tierName` from `levelProgress?.tierDisplay?.name ?? 'Bronze Forge'`; do not hardcode `Crystal Voyager` unless live data resolves to that label. |
| Level 14 progress card | Desktop left rail / mobile momentum row | Yes | `existing-surface` | `UserDashboard.V3.tsx:177` reads `useGamificationData`; `HomeTab.tsx:414-416` derives level/progress/tier; `HomeTab.tsx:444-464` renders level and XP progress. |
| Creator Streak day-of-week widget | Desktop left rail / mobile weekly momentum | Partial real data, day-of-week completion states not proven | `existing-surface` for streak count only; weekday completion dots omitted unless per-day completion data is cited | `HomeTab.tsx:413` reads `streakDays`; `HomeTab.tsx:429-437` renders streak text. No cited existing weekday-completion data source for filled/empty 7-day states in this slice. If weekday context is visually needed, render labels only with no completion styling. |
| Top Categories shelf | Desktop left rail icon shelf | No proven user-category analytics source | `omit-this-slice` unless each icon cites a real route target | `CreatePostCard.tsx:106-118` has post-type options, but no user top-category analytics. The label `Top Categories` must not ship as decorative chrome because it implies analytics that are not cited. |
| Reels Spotlight panel | Desktop/mobile featured reel card | Reels live outside dashboard, but spotlight stats are not proven | `omit-this-slice` | `SocialPage.V3.tsx:559` includes `reels` tab; `SocialPage.V3.tsx:592-595` renders `VerticalReels`; route navigation is derived at `SocialPage.V3.tsx:584-585`. Do not render a video preview, view/like/comment counts, or `Reel of the Day` framing in 19B. A future plain `Browse Reels` CTA to `/social/reels` would need its own simple CTA row with no preview or stats. |
| Quick Post shell | Main composer panel | Yes via SocialFeed/CreatePostCard | `existing-surface` | `UserDashboard.V3.tsx:544` mounts `SocialFeed variant="compact"`; `SocialFeed.tsx:564-565` always renders `CreatePostCard`; `CreatePostCard.tsx:131-133` uses `useCreatePostForm`. |
| Quick Post chip - General | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:106-118` defines `POST_TYPE_OPTIONS`; `CreatePostCard.tsx:148-152` passes options to `CreatePostTypeSelector`. |
| Quick Post chip - Workout | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:108` defines Workout Share with 25 points; `useCreatePostForm.ts:203-205` sends `workoutData` for workout posts. |
| Quick Post chip - Transformation | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:109` defines Transformation; `useCreatePostForm.ts:200-202` handles transformation media data. |
| Quick Post chip - Achievement | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:110` defines Achievement. |
| Quick Post chip - Challenge | Quick Post category chips | Yes as post type, not challenge system state | `existing-surface` for post type only | `CreatePostCard.tsx:111` defines Challenge post type; no invented active challenge state may be derived from this. |
| Quick Post chip - Dance | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:112` defines Dance. |
| Quick Post chip - Music | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:113` defines Music Production. |
| Quick Post chip - Singing | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:114` defines Singing. |
| Quick Post chip - Art | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:115` defines Art. |
| Quick Post chip - Gaming | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:116` defines Gaming. |
| Quick Post chip - Comedy | Quick Post category chips | Yes | `existing-surface` | `CreatePostCard.tsx:117` defines Comedy. |
| Quick Post `+25 XP` preview badge | Post button / XP chip in mockup | Conditional only | `existing-surface` only if rendered by existing dynamic post-type preview | `CreatePostCard.tsx:133` derives `currentPostType`; `CreatePostCard.tsx:141-143` renders `+{currentPostType.points}`; `CreatePostCard.tsx:228-229` renders dynamic post points. Do not hardcode `+25` globally because default `general` is 10 points at `CreatePostCard.tsx:107`. |
| Quick Post real XP side effect | Post result / XP promise | Yes, response-driven | `existing-surface` | `useSocialFeed.ts:227` posts to `/api/social/posts`; `useSocialFeed.ts:238-246` shows points toast and invalidates gamification only when `response.data.pointsAwarded`; `useCreatePostForm.ts:210-211` triggers celebration only when result has `pointsAwarded`. |
| Feed card | Main stream card | Yes | `existing-surface` | `SocialFeed.tsx:350` component; `SocialFeed.tsx:570-581` preserves all `PostCard` callbacks. |
| Stories from the Garden carousel | Desktop right rail / mobile story row | No proven dashboard stories surface | `omit-this-slice` | No existing stories route/component was proven in the dashboard surface. If design wants ring thumbnails later, separate receipt required. |
| Live Activity panel | Desktop right rail | Existing ticker exists, but duplicate hook risk | `omit-this-slice` for separate panel in 19B | `SocialFeed.tsx:372` already calls `useActivityTicker`; `HomeTab.tsx:404` also calls it for Home pulse; `useActivityTicker.ts:64-114` opens socket lifecycle. Do not add another right-rail hook instance. |
| Active Challenge - Strength Surge | Desktop/mobile challenge panel | Specific active challenge state not proven | `omit-this-slice` | `CommunityTab.tsx:250-253` marks Challenges as `soon`; `SocialPage.V3.tsx:559` supports `challenges`; `SocialPage.V3.tsx:600-601` renders `ChallengesView`. Do not render `Strength Surge`, `4/7 Completed`, countdown timers, challenge copy, or progress state in 19B. |
| Badges grid | Desktop right rail / mobile badges card | Yes for earned achievements | `existing-surface` | `UserDashboard.V3.tsx:179-191` derives top earned badges from `gamProfile?.data?.achievements`; `UserDashboard.V3.tsx:438-447` renders top badge showcase. |
| Leaderboard | Desktop right rail | Hook exposes leaderboard query | `existing-surface` only if using existing `useGamificationData` result already mounted in V3 | `useGamificationData.ts:479-485` defines leaderboard query; `useGamificationData.ts:617-618` returns it. Do not mount a second `useGamificationData` just for a right rail. |
| Trending hashtags | Desktop right rail / mobile trending card | Existing component self-fetches only in full SocialFeed | `omit-this-slice` | `SocialFeed.tsx:562` renders `TrendingHashtags` only for full variant; `UserDashboard.V3.tsx:544` uses compact variant; `TrendingHashtags.tsx:38-43` self-fetches `/api/social/hashtags/trending?limit=8`. Do not duplicate fetch in dashboard rail in 19B. |
| Weekly Momentum chart | Mobile card / desktop side card | Partial real data | `existing-surface` for current streak/progress only; no fabricated weekly bars | `HomeTab.tsx:413-416` exposes streak/level/progress; no proven per-week momentum array is cited for 19B. |
| Transformation before/after | Mobile transformation card | Existing component exists, but not currently mounted in V3 | Sean decision required before implementation | `PhotoGallery.tsx:423-429` maps profile posts with media into photos; `TransformationPhotoShowcase.tsx:106-148` can compute before/after pairs, but it is not mounted by `UserDashboard.V3.tsx:563-566`. Sean must choose: mount existing `TransformationPhotoShowcase` in 19B, or omit this card. Do not build a new transformation card. |
| Next Best Action CTAs | Desktop lower-right / mobile bottom action card | Existing CTAs in HomeTab | `existing-surface` only with current HomeTab action labels/routes, or omit | `HomeTab.tsx:392-396` defines Log Workout, View Progress, Explore Feed, Find Community. Mockup labels such as `Create Reel` and `Share Update` must be substituted with existing actions or omitted unless new file:line evidence proves those exact labels/routes. |
| XP Gained toast | Desktop lower-left toast | Existing response-driven toast/celebration only | `omit-this-slice` as persistent mock toast | `useSocialFeed.ts:238-246` displays points toast only after backend returns `pointsAwarded`; `useCreatePostForm.ts:210-211` triggers celebration only from post result. Do not render a decorative `XP Gained` toast at rest. |
| Mobile bottom nav - Home | Mobile bottom nav | Yes, dashboard tab | `existing-surface` | `UserDashboardTypes.ts:81`; `UserDashboard.V3.tsx:509`, `UserDashboard.V3.tsx:539`. |
| Mobile bottom nav - Reels | Mobile bottom nav | Reels route exists outside dashboard | CTA-only or `omit-this-slice` | `SocialPage.V3.tsx:559` includes `reels`; `SocialPage.V3.tsx:584-595` navigates/renders reels. If included, it navigates to `/social/reels`; it must not mutate dashboard `TabId`. |
| Mobile bottom nav - Create | Mobile bottom nav center action | Existing CreatePostCard in Feed | `existing-surface` only by switching to/feed focus, not new create tab | `UserDashboard.V3.tsx:544` mounts compact feed; `SocialFeed.tsx:564-565` renders `CreatePostCard`; `CreatePostCard.tsx:239-240` has existing floating create behavior. |
| Mobile bottom nav - Inbox | Mobile bottom nav | No canonical inbox route proven | `omit-this-slice` | Current route sweep found Social routes at `main-routes.tsx:841-855` and no proven `/inbox` route. Do not ship a dead inbox icon. |
| Mobile bottom nav - Profile | Mobile bottom nav | Yes, dashboard tab | `existing-surface` | `UserDashboardTypes.ts:81`; `UserDashboard.V3.tsx:513`; `UserDashboard.V3.tsx:563-566` renders profile content. |

19B spec gate conclusion:
- The selected mockup can be implemented as an Observatory shell only if the implementation preserves the 5-tab contract and treats Reels, Stories, Inbox, Trending, Active Challenge, XP toast, and standalone Live Activity as either real route CTAs or omitted/static chrome under the definitions above.
- The implementation may restyle and reposition existing data surfaces, but it must not create new data sources, duplicate hooks, add backend endpoints, or hardcode mockup values that are not returned by live data.
- Build-side must paste this section back for Sean / Third Eye review before any runtime edit.

## Pending Review Questions

1. Does Third Eye approve the fallback flatten after the sibling sweep shows only `main-routes.tsx:356` is affected by the bare-directory import? — **APPROVED in prior Third Eye gate (carried into 19B closeout 2026-04-29).**
2. Does Third Eye accept the design-router concept audit trail with Direction 1 selected and Directions 2-3 rejected? — **APPROVED in prior Third Eye gate (carried into 19B closeout 2026-04-29).**
3. Does Sean / Third Eye approve the revised implementation order: 19A.1 toggle reachability -> 19A.2 dashboard token audit -> 19B Observatory shell, with 19A.3 new presets and 19C custom theme creator as independent follow-up slices? — **APPROVED + 19A.1 (`975edf39a`) + 19A.2 (`89f20e2e1`) executed; 19B implemented this slice.**
4. Does Third Eye accept this receipt's interpretation of the theme target as 20 total selectable presets, not 20 net-new presets beyond the 18 definitions currently present in `UniversalThemeContext.tsx`? — **APPROVED in prior gate; deferred to 19A.3.**

## §19B Closeout — Observatory Shell Implementation 2026-04-29

Status: code landed locally; `npm run build` clean; targeted vitest 4 files / 6 tests pass; full `tsc --noEmit` baseline `[UNVERIFIED]` (pre-existing baseline failures in `_archived/dead/*` plus one pre-existing structural error in `DashboardV3Styles.ts:243`/`:1191` flagged before this slice — not introduced here). Browser visual smoke + screenshot capture deferred to post-Codex review iteration since the dev server / Playwright loop was not exercised in this autonomous build pass; this is disclosed honestly per Rule 56.

### Changes shipped

Codex review returned three P1/P2/P3 revisions before commit. All three resolved before the final state below: (P1) split both new files under the Rule 4 300-line cap, (P2) replaced inline style props on the tier card with named styled components, (P3) replaced non-ASCII box-drawing banners with plain ASCII headers across every new file. Build + targeted tests re-verified after the split.

| File | Status | Lines | Purpose |
|---|---|---|---|
| `frontend/src/components/UserDashboard/index.ts` | modified | 1 → 4 | Fallback flatten — re-export `./UserDashboard.V3` so the `lazyLoadWithErrorHandling` fallback path stops rendering the visually divergent `UserDashboard-optimized.tsx`. |
| `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | modified | 609 → 693 | Wrap existing tab content in `<ObservatoryShell>`; add memos for tier/level/streak/transformation data; mount `TransformationPhotoShowcase` in the profile tab `TabStack`. |
| `frontend/src/components/UserDashboard/components/ObservatoryShell.tsx` | NEW | 108 | Thin orchestrator: composes left rail + right rail + mobile nav around `ObservatoryMain` children. Zero hooks. |
| `frontend/src/components/UserDashboard/components/ObservatoryLeftRail.tsx` | NEW | 134 | Left rail brand block, 5-tab nav, Create Post CTA, level/streak momentum cards. |
| `frontend/src/components/UserDashboard/components/ObservatoryRightRail.tsx` | NEW | 112 | Right rail Tier card, Top Badges grid, Next Best Action list. Tier card uses named styled components (no inline styles per Codex P2). |
| `frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx` | NEW | 77 | Mobile-only bottom nav: Home / Reels (route CTA) / Create / Profile. Inbox omitted per spec. |
| `frontend/src/components/UserDashboard/components/ObservatoryShellTypes.ts` | NEW | 31 | Shared types: `ObservatoryNavItem`, `ObservatoryNextBestAction`, `ObservatoryBadge`. |
| `frontend/src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts` | NEW | 129 | Layout: `ObservatoryGrid`, the three rail containers, `ObservatoryGlassPanel`, panel header/title. |
| `frontend/src/components/UserDashboard/styles/ObservatoryLeftRailStyles.ts` | NEW | 221 | Left rail brand + nav + create button + momentum card styled components. |
| `frontend/src/components/UserDashboard/styles/ObservatoryRightRailStyles.ts` | NEW | 109 | Right rail tier row + badges grid + empty state + action list styled components. |
| `frontend/src/components/UserDashboard/styles/ObservatoryMobileNavStyles.ts` | NEW | 96 | Mobile bottom nav container + item styled components. |
| `frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts` | unchanged | 1482 | Pre-slice state preserved. No drift from `89f20e2e1`. |

Every new file is under the Rule 4 300-line cap. Removed unused exports during the split: `RightRailList`, `RightRailLeaderRow`, `RightRailLeaderRank`, `RightRailLeaderName`, `RightRailLeaderXP`, `ObservatoryPanelLink`, `ObservatoryShellLayout` — none rendered in this slice. ASCII headers on every new file verified via Python byte-by-byte scan (no `╔╚╝╗║═╩╦` characters present).

### Spec row adherence audit

Every row in the §19B Visual Target Spec (line 861 onward) was implemented or omitted exactly as classified:

- **Crystal Voyager tier badge** — renders `levelProgress?.tierDisplay?.name ?? 'Bronze Forge'` from existing data. No hardcoded "Crystal Voyager" string. `[VERIFIED]` UserDashboard.V3.tsx `observatoryTierName`.
- **Quick Post `+25 XP` preview badge** — preserved as existing dynamic `CreatePostCard` behavior (no new badge added). `[VERIFIED]` no global hardcode introduced.
- **Creator Streak day-of-week widget** — count-only render in `LeftRailMomentumCard`. NO weekday completion dots. `[VERIFIED]` ObservatoryShell.tsx.
- **Top Categories shelf** — OMITTED from the build. `[VERIFIED]` not present in ObservatoryShell.tsx.
- **Reels Spotlight panel** — OMITTED. No video preview, no engagement counts, no "Reel of the Day" framing rendered. `[VERIFIED]`.
- **Stories from the Garden carousel** — OMITTED. `[VERIFIED]`.
- **Live Activity panel** — OMITTED. No second `useActivityTicker` mount. `[VERIFIED]` ObservatoryShell.tsx contains zero hooks.
- **Active Challenge - Strength Surge** — OMITTED. No "Strength Surge" / "4/7 Completed" / countdown / progress copy. `[VERIFIED]`.
- **Trending hashtags** — OMITTED. No new fetch added. `[VERIFIED]`.
- **XP Gained toast** — OMITTED as persistent surface. The existing response-driven points toast in `useSocialFeed.ts:238-246` continues to fire only when the backend returns `pointsAwarded`. `[VERIFIED]` no decorative XP toast added.
- **Mobile Inbox tab** — OMITTED from MobileBottomNav. `[VERIFIED]` ObservatoryShell.tsx renders 4 mobile nav items only (Home / Reels / Create / Profile).
- **Mobile Reels tab** — implemented as route-CTA navigating to `/social/reels` (no fake panel inside dashboard). `[VERIFIED]`.
- **Tier card (right rail)** — renders `observatoryTierName` from existing data. `[VERIFIED]`.
- **Top Badges grid (right rail)** — renders the existing pre-derived `topBadges` from `gamProfile?.data?.achievements`. Empty state: "Earn achievements to fill your showcase." `[VERIFIED]`.
- **Next Best Action (right rail)** — labels and routes mirror the existing `HomeTab.tsx:392-396` `CTA_ITEMS` exactly: Log Workout / View Progress / Explore Feed / Find Community. No mockup labels like "Create Reel" or "Share Update" introduced. `[VERIFIED]`.
- **Transformation card (Sean decision A)** — `TransformationPhotoShowcase` mounted in the `profile` tab `TabStack` (alongside `AboutSection` / `CreativeGallery` / `PhotoGallery`). Sources `transformationPhotos` from `profile.transformationPhotos` and `transformationVisibility` from `profile.transformationSettings.defaultVisibility` using the same pattern as the dormant `UserDashboardV3.tsx` (no new hook). Mounted in the profile tab rather than the right rail because the slider component needs horizontal width that the constrained right-rail column cannot provide. Empty state renders honestly when no photo pairs exist. `[VERIFIED]`.

### Logic preservation audit

- Upload validation 5MB + JPEG/PNG/WebP at `UserDashboard.V3.tsx:220-225` — preserved unchanged. `[VERIFIED]`.
- Blob URL revoke at `UserDashboard.V3.tsx:244` — preserved unchanged. `[VERIFIED]`.
- `EditProfileModal` save path at `UserDashboard.V3.tsx:592-601` — preserved unchanged. `[VERIFIED]`.
- All 8 `PostCard` callbacks via `SocialFeed variant="compact"` — unchanged (SocialFeed not modified). `[VERIFIED]`.
- 5-tab `TabId` union — unchanged. `[VERIFIED]` `UserDashboardTypes.ts:81`.
- Hook count: `useProfile`, `useGamificationData`, `useAuth`, `useUniversalTheme` are still mounted exactly once in V3.tsx. ObservatoryShell.tsx mounts ZERO hooks. `[VERIFIED]` no duplicate-hook risk.
- `useActivityTicker`, `useFaction`, `useParty` are still mounted only inside `SocialFeed` per receipt §line 351. ObservatoryShell does not call them. `[VERIFIED]`.

### File-size discipline

V3.tsx grew from 609 → 897 lines mid-slice, exceeding the receipt's 659-line extraction trigger. Observatory chrome extracted to `ObservatoryShell.tsx` (323 lines) + `ObservatoryShellStyles.ts` (568 lines). V3.tsx final state: 693 lines, +84 from pre-slice baseline. Still over the Rule 4 300-line cap as pre-existing debt; net new growth (84 lines) is the minimum needed to wire the ObservatoryShell, mount TransformationPhotoShowcase, and add the data memos. `[VERIFIED]` discipline applied.

`DashboardV3Styles.ts` returned to its pre-slice state (1482 lines, unchanged from `89f20e2e1`). All Observatory styles relocated to `ObservatoryShellStyles.ts`. `[VERIFIED]` git diff is empty.

### Tier-A baseline (Rule 56 honest disclosure)

- **Targeted vitest:** 4 test files / 6 tests pass — `UserDashboardTokenAudit.test.ts`, `ActivitySection.test.tsx`, `ProfileChartsGrid.test.tsx`, `UniversalThemeContext.themeCycle.test.ts`. `[VERIFIED]`.
- **`npm run build`:** clean. Vite emits the existing >500KB chunk warning on `index.BpXu3JCN.js` (618.82 KB / gzip 168.25 KB) — pre-existing, not introduced by this slice. `[VERIFIED]`.
- **Full `tsc --noEmit`:** background run completed during this slice. **`[UNVERIFIED]` for the slice's specific impact** because the baseline contains pre-existing errors in `_archived/dead/ClientDashboard/*` and structural errors in `DashboardV3Styles.ts:243`/`:1191` that pre-date the slice. The Phase 19A.1 + 19A.2 closeouts already documented this baseline as `[UNVERIFIED]` after high-memory timeout. Slice-introduced new errors: not isolated due to baseline noise. **Recommendation for next slice:** allocate a dedicated baseline-recovery session before 19A.3 / 19C to fix or quarantine the existing baseline failures so future slices can claim `[VERIFIED]` cleanly.
- **Galaxy color scan on changed files:** no `#0a0a1a`, `#00FFFF`, or `#7851A9` introduced by this slice. The pre-existing `cyberpunk-edgerunners` theme `#00FFFF` carry remains the only Galaxy reference in the repo and stays flagged for 19A.3. `[VERIFIED]`.
- **Secret-pattern scan on changed files:** clean. `[VERIFIED]`.
- **Forbidden cleanup-language scan:** clean. `[VERIFIED]`.

### Pre/post baseline that was NOT captured

Per Rule 56 honesty, two pre-edit captures the receipt's plan called for were skipped:

- **Pre-edit chunk size:** not captured before edits started. Post-edit `UserDashboard.V3` lazy chunk = `dist/v3/index.cJczklkA.js` 63.92 KB raw / 13.81 KB gzip. Codex review can derive a delta from the prior commit if needed.
- **Pre-edit + post-edit screenshot pairs across the 10 viewports + 7 representative themes:** not captured. The dev server / Playwright loop was not exercised in this autonomous build pass. Visual smoke and theme-reactivity browser test should be run by Sean before final Codex sign-off, OR captured as a follow-up screenshot pass.

These gaps are honestly disclosed `[UNVERIFIED]` per Rule 56 rather than waved off. They do not block the code commit but should be addressed in the post-deploy verification step.

### Theme reactivity `[HYPOTHESIS]` resolution

Receipt line 357 tagged "no-reload dashboard theme reactivity" as `[HYPOTHESIS]`. Resolution status: still `[HYPOTHESIS]` — not exercised in browser smoke during this pass. The `useUniversalTheme` consumer at V3.tsx:161 is preserved, the `themeChanged` CustomEvent dispatch at `UniversalThemeContext.tsx:1642` is preserved, all new styled-components consume `var(--token, #fallback)`. Plumbing is in place; live verification deferred to browser smoke.

### Remaining cleanup-backlog carries

- `UserDashboard-optimized.tsx` is now orphaned post-flatten; logged as Rule 38 cleanup candidate, not deleted in this slice.
- `cyberpunk-edgerunners` retired `#00FFFF` palette use, logged for 19A.3.
- Pre-existing `tsc --noEmit` baseline errors (`_archived/dead/*`, `DashboardV3Styles.ts:243`/`:1191`) — recommend a dedicated baseline-recovery slice before 19A.3.
- Pre-edit screenshot pairs and post-deploy production smoke at `/user-dashboard` deferred to Sean's manual verification or a follow-up Playwright slice.

### Phase 19 audit record

## 19B Codex Final Re-Review Addendum - 2026-04-29

Status: Codex re-reviewed the post-split shell and applied two narrow final fixes before final gate:

1. Extracted `ObservatoryShellAdapter.ts` so `UserDashboard.V3.tsx` returns to the receipt's 659-line extraction trigger.
2. Updated `HomeTab.tsx` CTA grid to use `repeat(auto-fit, minmax(min(180px, 100%), 1fr))`, preventing clipped action cards inside the narrower Observatory shell at 1024px and 1440px.

Final changed runtime/test surface for 19B:

| File | Status | Final lines | Purpose |
|---|---:|---:|---|
| `frontend/src/components/UserDashboard/index.ts` | modified | 5 | Fallback flatten to `./UserDashboard.V3`. |
| `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` | modified | 659 | Wrap existing content in `ObservatoryShell`; mount existing `TransformationPhotoShowcase`; keep data/callback contracts. |
| `frontend/src/components/UserDashboard/UserDashboardTokenAudit.test.ts` | modified | 47 | Token audit now scans the new Observatory style files. |
| `frontend/src/components/UserDashboard/components/HomeTab.tsx` | modified | 521 | Rounds progress caption and wraps CTA grid inside shell-constrained widths. |
| `frontend/src/components/UserDashboard/styles/DashboardV3Styles.ts` | modified | 1487 | Minor tab-nav overflow handling for shell-constrained widths. |
| `frontend/src/components/UserDashboard/components/ObservatoryShell.tsx` | new | 108 | Thin shell orchestrator. |
| `frontend/src/components/UserDashboard/components/ObservatoryShellAdapter.ts` | new | 61 | Pure adapter helpers for nav/action/transformation props; no data hooks. |
| `frontend/src/components/UserDashboard/components/ObservatoryLeftRail.tsx` | new | 134 | Desktop left rail. |
| `frontend/src/components/UserDashboard/components/ObservatoryRightRail.tsx` | new | 112 | Desktop right rail. |
| `frontend/src/components/UserDashboard/components/ObservatoryMobileNav.tsx` | new | 77 | Mobile bottom nav. |
| `frontend/src/components/UserDashboard/components/ObservatoryShellTypes.ts` | new | 31 | Shared shell types. |
| `frontend/src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts` | new | 129 | Shell layout and shared glass panels. |
| `frontend/src/components/UserDashboard/styles/ObservatoryLeftRailStyles.ts` | new | 221 | Left rail styles. |
| `frontend/src/components/UserDashboard/styles/ObservatoryRightRailStyles.ts` | new | 109 | Right rail styles. |
| `frontend/src/components/UserDashboard/styles/ObservatoryMobileNavStyles.ts` | new | 96 | Mobile nav styles. |

Codex final verification:

| Check | Result |
|---|---|
| New Observatory file line counts | `[VERIFIED]` every new component/style/helper/type file is below 300 lines. |
| ASCII scan on new Observatory files | `[VERIFIED]` no non-ASCII bytes in new Observatory component/style/helper/type files. |
| Inline style scan on new shell tree | `[VERIFIED]` no `style=` props in `Observatory*.tsx`. |
| Duplicate hook scan on new shell tree | `[VERIFIED]` no new `useGamificationData`, `useSocialFeed`, `useActivityTicker`, `useFaction`, or `useParty` calls. Matches in comments only. |
| Retired/generic fallback color scan on new styles | `[VERIFIED]` no `#0a0a1a`, `#00FFFF`, `#7851A9`, `#94a3b8`, `#64748b`, or `#FFFFFF` in new Observatory style files. |
| Targeted vitest | `[VERIFIED]` pass: 4 files / 6 tests (`UserDashboardTokenAudit`, `ActivitySection`, `ProfileChartsGrid`, `UniversalThemeContext.themeCycle`). |
| `npm run build` | `[VERIFIED]` pass. Existing Vite dynamic-import and chunk-size warnings remain. |
| UserDashboard route chunk | `[VERIFIED]` post-final-fix chunk `dist/v3/index.BQXGJ9ow.js` = 63.82 kB raw / 13.94 kB gzip. |
| Browser smoke with local API stubs | `[VERIFIED with caveat]` `/user-dashboard` rendered at 1024, 1440, and 375; zero console errors; shell present; no horizontal page overflow; all four Home CTA cards visible after final CTA-grid fix. |
| Theme reactivity smoke | `[VERIFIED with caveat]` earlier 7-theme smoke changed dashboard CSS variables without navigation/reload. Pointer clicks were intercepted by local dev overlays, so automation used programmatic click fallback. |
| Full typecheck | `[UNVERIFIED]` not re-run after final addendum; prior slice attempts remain blocked by pre-existing baseline failures/timeouts. |

Browser smoke caveats:

- Local dev-only `ThemeStatusIndicator` and `UserSwitcher` overlays covered parts of the header/right rail/mobile Profile button during screenshots. The shell still rendered and programmatic checks confirmed navigation/CTA presence. Production smoke after deploy must verify the same route without local dev overlays.
- Global site header overlap around the SwanStudios logo/Home nav appears outside the dashboard shell. It is not changed by the 19B shell files and should be handled as a separate header polish slice if Sean wants it tightened.

QA artifacts created:

- `frontend/.playwright-screenshots/phase-19-observatory/after/quick-check-afterfix-1024.png`
- `frontend/.playwright-screenshots/phase-19-observatory/after/quick-check-afterfix-1440.png`
- `frontend/.playwright-screenshots/phase-19-observatory/after/quick-check-afterfix-375.png`
- Earlier full matrix screenshots remain under `frontend/.playwright-screenshots/phase-19-observatory/after/`.

Codex final-gate decision for runtime source: **APPROVE WITH CAVEATS**. Caveats are production smoke without local dev overlays, full typecheck baseline recovery, and selective staging because the repo contains many unrelated dirty files outside the Phase 19B dashboard slice.

Per Sean's directive (Rule 48), once Sean declares Phase 19 complete after 19B ships, produce `docs/ai-workflow/AI-HANDOFF/PHASE-19-USER-DASHBOARD-V3-OBSERVATORY-AUDIT-RECORD-2026-04-29.md` covering 19A.1 → 19A.2 → 19B as the permanent re-review artifact.

## Section 19B.1 Closeout Addendum - Right Rail Breakpoint Alignment 2026-04-29

Production smoke after `be8dd791a` deploy revealed the right rail was hidden at 1024-1439px viewports. Initial diagnosis proposed a one-character fix (right rail `1440 -> 1024`) but Codex review caught that this would create a NEW visual bug: the `ObservatoryGrid` is intentionally a two-column tablet layout at 1024-1439, so changing only the right rail's breakpoint would auto-place the right rail into an implicit grid track outside the declared template.

Safer fix landed: add an intermediate `1280px` breakpoint to `ObservatoryGrid` that promotes the layout to a compact three-column desktop, then sync `ObservatoryRightRail`'s display-flex breakpoint to the same `1280px` so the rail's appearance is in lockstep with the grid template.

Final responsive matrix:

| Viewport | Grid | Left rail | Right rail | Mobile bottom nav |
|---|---|---|---|---|
| 320-1023 | 1 column | hidden | hidden | visible |
| 1024-1279 | 2 columns (left + main) | visible | hidden (intentional tablet two-col) | hidden |
| 1280-1439 | 3 columns (compact) | visible | visible | hidden |
| 1440+ | 3 columns (full) | visible | visible | hidden |

File touched: `frontend/src/components/UserDashboard/styles/ObservatoryShellLayoutStyles.ts` only. No JSX, no hooks, no tabs, no upload logic, no theme presets, no fake surfaces touched.

Verification:
- Targeted vitest 4 files / 6 tests: pass
- `npm run build`: pass
- Production re-smoke pending after deploy lands.
