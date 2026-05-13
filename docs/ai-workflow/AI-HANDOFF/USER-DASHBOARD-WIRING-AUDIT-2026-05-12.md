# User Dashboard Wiring Audit - 2026-05-12

Status: read-only audit plus cleanup follow-up
Surface: `/user-dashboard`
Canonical runtime component: `frontend/src/components/UserDashboard/UserDashboard.V3.tsx`

## Plain-English Summary

The User Dashboard is now on one clear active surface: `UserDashboard.V3`. The old dashboard variants and old subcomponents were archived during the cleanup pass, so future work should not drift back into those files.

The strongest working parts are route mounting, tab switching, profile/banner upload, gamification read display, workout-session read display, social feed display, photo upload through the social hook, and theme-token coverage on the current V3 chrome.

The biggest gaps are on the Home tab. It looks like the Claude Design vision, but several elements are still static or partially wired: avatar uses the brand logo, post/follower/following counts are fake or floored, inbox/notification counters are hardcoded, stories/trending tags are static, mood buttons do not affect post payloads, media buttons do not upload from Home, and Swan Coach Action creates only a local receipt.

The next implementation slice should wire existing systems into the current design, not rebuild the page again. Use the existing `useProfile`, `useGamificationData`, `useSocialFeed`, workout-session, notification, badge, and Swan Coach paths where they are already solid.

## Technical Summary

### Canonical Surface Receipt

| Evidence item | File and line evidence | Status |
|---|---|---|
| Route lazy import | `frontend/src/routes/main-routes.tsx:360` imports `../components/UserDashboard/UserDashboard.V3`; `:362` fallback imports `../components/UserDashboard` | canonical |
| Route mount | `frontend/src/routes/main-routes.tsx:799` declares `path: 'user-dashboard'`; `:803` renders `<UserDashboard />` | canonical |
| Mounted component | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:30` defines `UserDashboardV3`; `:148` exports it | canonical |
| Controller hook | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:31` consumes `useUserDashboardV3Controller()` | canonical |
| Tab state | `frontend/src/components/UserDashboard/hooks/useUserDashboardV3Controller.ts:42` initializes `activeTab` as `home` | canonical |
| Tab reset fix | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx:33-35` changes tab and calls `resetUserDashboardTabScroll()` | verified |
| Tab router | `frontend/src/components/UserDashboard/components/UserDashboardTabsV3.tsx:20-29` lazy-loads Home, SocialFeed, Community, Creative, Photos, About, Activity, Nutrition, Workouts, Transformation; `:66-91` mounts the five tabs | canonical |

### Surface Classification

| Surface | Classification | Evidence |
|---|---|---|
| `UserDashboard.V3.tsx` | canonical | Direct route import and JSX mount above |
| `frontend/src/components/UserDashboard/index.ts` | canonical fallback | Re-exports `UserDashboard.V3` after fallback flatten |
| `UserDashboard.tsx` | archived legacy | No active import after cleanup; archived under `archive/cleanup-2026-05-12/frontend-dead-code/` |
| `UserDashboardV3.tsx` | archived dormant historical variant | No active import after cleanup |
| `UserDashboard-optimized.tsx` | archived dormant fallback predecessor | Index fallback now points to V3 |
| `DashBoard/Pages/user-dashboard/user-dashboard.tsx` | archived legacy route-era file | No current route mount found |
| Old V2 subcomponents (`ProfileBanner`, `TabContent`, `CommunityFeed`, old badge files) | archived legacy | Only consumed by archived variants before cleanup |
| Social/Profile badge components | active elsewhere, not UserDashboard-mounted | `frontend/src/components/Social/Profile/*` remains active code |
| Claude Design export | active reference asset, not runtime | `frontend/src/assets/user-dashboard/dashboard-export/` is untracked reference material |

### Component Audit

#### Shell and Navigation

Works:
- V3 shell renders Home outside `ObservatoryShell`, then non-home tabs inside the observatory layout.
- Desktop tab bar, mobile nav, side rails, and route fallback now point at the same canonical V3 surface.
- Tab freeze fix is in the live handler, not just a dormant helper.

Gaps:
- `ObservatoryRightRail` next-best actions are built with raw `setActiveTab` in `useUserDashboardV3Controller.ts:138-139`, while main tab changes use `handleTabChange` plus scroll reset. This can reintroduce scroll-position oddities from rail buttons.

#### Home Tab

Works:
- Uses auth user, gamification profile, subscription, social feed, and create-post hooks at `HomeTab.tsx:59-63`.
- Log Workout routes through `getLogWorkoutDashboardPath(user?.role)` at `HomeTab.tsx:79`.
- Reels route exists through `/social/:tab`; Social V3 supports `reels`.
- Elite/admin/trainer gating controls the Swan Coach Action Launcher.

Gaps:
- Avatar is always `brandLogo` at `HomeTab.tsx:72`.
- Counts are not truth-backed: `postsCount={Math.max(posts.length, 487)}`, `followersCount={24800}`, `followingCount={312}` at `HomeTab.tsx:131-133`.
- Top bar counts are static: inbox `3`, notifications `7` in `HomeTabVision.data.ts`.
- Stories and trending tags are static in `HomeTabVision.data.ts`.
- Mood selection changes UI state only; `useCreatePost` sends `{ content, type: 'general' }`.
- Home composer does not support media even though the lower-level social hook supports multipart upload.
- Swan Coach Action Launcher creates a local receipt only and explicitly saves/sends nothing.

#### Feed Tab

Works:
- Canonical tab mounts `SocialFeed variant="compact"` at `UserDashboardTabsV3.tsx:70`.
- The full social hook can read feed, create multipart posts, like/unlike, comment, report, repost, and fetch a post.
- Backend social routes exist for `/api/social/posts/feed`, `/api/social/posts`, likes, comments, report, and repost.

Gaps:
- Home uses the lighter `useCreatePost` from `useDashboardQueries`, not the richer `hooks/social/useSocialFeed` path.
- Feed UI is imported from the broader social surface, so dashboard-specific post actions and empty/loading/error states should be audited visually before heavy polishing.

#### Progress Tab

Works:
- `WorkoutsTab` reads `GET /api/workout/sessions` at `WorkoutsTab.tsx:43` and `:62`.
- Activity uses `useProfile()` stats/posts at `ActivitySection.tsx:48`.
- Nutrition is mounted through the shared `NutritionWorkspace`.
- Workout log navigation uses role-aware dashboard paths.

Gaps:
- `/api/workout/sessions` has overlapping backend mounts: `/api/workout` at `backend/core/routes.mjs:342` and `/api/workout/sessions` at `:343`. Because `/api/workout` mounts first, the active owner is likely `workoutRoutes.mjs:201`, not `workoutSessionRoutes.mjs:21`.
- Activity only maps profile posts into activity cards; workouts and achievements are not yet fused into one chronological timeline.
- Nutrition is a shared workspace, not visually or behaviorally integrated with the Creator Observatory model yet.

#### Community Tab

Works:
- Community Feed card switches to Feed.
- Find Friends navigates to `/social/friends`.
- Cards are clear about coming-soon states.

Gaps:
- Challenges are marked `soon` even though social challenge routes and gamification challenge routes exist.
- Factions and XP are marked `soon`; routes exist under social factions, but no dashboard wiring is present.
- Community tab is a navigation hub, not a live data surface yet.

#### Profile Tab

Works:
- About section uses `useGamificationData`.
- Transformation showcase uses profile transformation data derived by `ObservatoryShellAdapter`.
- Creative gallery reads profile posts and can create a basic social post.
- Photo gallery reads profile posts and can create posts with media using the richer social hook.
- Profile header uploads profile and banner photos, sanitizes URLs, and persists banner crop presets.

Gaps:
- Dedicated badge showcase is not mounted in the UserDashboard profile tab.
- Top badges are reduced to the top three earned achievements by points; there is no full badge inventory, rarity filter, or reward redemption in the UserDashboard.
- Share URL points to `/profile/${user?.id}`; confirm whether that public profile route is the intended canonical share destination.

### Backend And Hook Wiring Matrix

| System | Current wiring | Backend match | Gap |
|---|---|---|---|
| Profile | `useProfile`, `profileService` | `/api/profile`, `/api/profile/stats`, `/api/profile/posts`, upload profile/banner photo | Home does not consume profile photo/social stats |
| Gamification | `useGamificationData` | `/api/v1/gamification/profile`, achievements, rewards, leaderboard | Rewards redeem hook posts to `/api/v1/gamification/rewards/${rewardId}/redeem`, but backend expects `/users/:userId/rewards/:rewardId/redeem` |
| Badges | Top badges from `gamProfile.data.achievements` | `/api/v1/gamification/users/:userId/achievements`, `/api/profile/achievements`, `/api/badges` | No full dashboard badge panel |
| Social feed | Feed tab uses full `SocialFeed`; Home uses lightweight dashboard query | `/api/social/posts/feed`, `/api/social/posts`, comments, likes | Home composer should switch to rich social hook or extend dashboard mutation |
| Workouts | `WorkoutsTab` reads `/api/workout/sessions` | Backend has overlapping workout mounts | Route ownership should be locked before deeper logic changes |
| Nutrition | Shared `NutritionWorkspace` | `/api/nutrition` mount exists | Needs dashboard-specific data card decisions |
| Notifications/inbox | Visual only on Home | Notification and messaging systems exist elsewhere | Counts and actions are static |
| Swan Coach Action | Local receipt plus route buttons | Swan Coach routes exist elsewhere | Needs command/review queue integration |
| Subscription gating | `useSubscription` controls premium launcher | frontend hook only in this surface | Works as a gate, but no upsell path audit yet |

### Priority Findings

1. High: Home metrics are not truth-backed. Posts, followers, following, notifications, inbox, stories, and trending are static or artificial.
2. High: Home post composer is only partially wired. Mood/media controls imply richer behavior than the payload actually sends.
3. High: Badge and gamification depth is underused. Top badges display, but no full badge/reward/achievement surface is wired into the dashboard.
4. Medium: Progress data is split across workout sessions, profile stats, activity posts, and NutritionWorkspace without a unified dashboard view model.
5. Medium: Community has live routes available but still presents Challenges and Factions as future-only cards.
6. Medium: Rail next-best tab changes bypass the scroll-reset handler.
7. Medium: Gamification reward redemption endpoint mismatch must be fixed before exposing reward redemption from UserDashboard.
8. Low: Share URL target needs canonical route confirmation.

### Recommended Implementation Order

1. Home truth wiring: replace hardcoded avatar, counts, inbox, notifications, stories, and trending with real profile/social/notification sources or explicit empty states.
2. Home creator composer: wire mood/type, media upload, and post refresh through the richer social hook.
3. Gamification and badges: add a real dashboard badge module using existing achievements and Social/Profile badge UI patterns, then fix reward redemption endpoint drift before exposing rewards.
4. Progress integration: create a small dashboard view-model that merges workout sessions, profile stats, achievements, and nutrition into one coherent Progress tab.
5. Community activation: wire Challenges and Factions to existing social/gamification routes where product-ready; keep unavailable cards visibly disabled.
6. Swan Coach Action: connect review receipt to an existing command/review flow instead of keeping it local-only.
7. QA: run Playwright across Home, Feed, Progress, Community, Profile at 414, 1440, 2560, and 3840 after each visual/data slice.

### Verification Completed For This Audit/Cleanup

- Targeted UserDashboard/source-text tests passed: 3 files, 122 tests.
- Frontend production build passed.
- Secret scan on cleanup diff passed with zero hits.
- Scoped `git diff --check` on cleanup/audit-owned files passed.

### Known Unrelated Worktree Items Left Alone

- `AI-Village-Documentation/gemini-consults/latest.md`
- `frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.tsx`
- `frontend/src/components/DashBoard/Pages/client-dashboard/ClientHomeTab.test.tsx`
- `frontend/src/assets/user-dashboard/dashboard-export/`
- `frontend/src/components/DashBoard/Pages/client-dashboard/observatory/`
- `scripts/consult-codex.mjs`
