# 04 — Community + Social Feed · 7-Star Upgrade Audit
**Date:** 2026-07-06 · **Baseline:** origin/main @ 87680741e (worktree c:/tmp/ss-audit-20260706) · **Auditor:** read-only domain agent (Fable 5)
**Domain:** social feed, posts, workout auto-post path, challenges-as-community, friends, groups/parties/factions, events, moderation.
**Rule:** every claim carries file:line + `[VERIFIED]`/`[LIKELY]`/`[HYPOTHESIS]`. No PII. Recommendations are coaching-first (Rule 62) — no generic social-network scope.

---

## 1. Canonical Surface Receipt (what actually mounts)

**The social hub is NOT a /social page — it is the `/user-dashboard` Home tab.** `[VERIFIED]`
- Route: `frontend/src/routes/main-routes.tsx:707-726` mounts `UserDashboardV3` at `user-dashboard` and `user-dashboard/:tab` inside `ProtectedRoute`. `/social`, `/social/:tab`, `/social/posts/:postId` are pure redirects into it (`main-routes.tsx:764-778`). The retirement is documented in-code: "SocialPage.V3 / SocialPage are unmounted legacy" (`main-routes.tsx:268`).
- Shell: `UserDashboard.V3.tsx:120-131` renders `UserDashboardTabsV3`; the home panel mounts `HomeTab` (`UserDashboardTabsV3.tsx:144-153`). The old Feed tab is explicitly unmounted — comment at `UserDashboardTabsV3.tsx:154-158` ("Home truly absorbs the retired Feed tab").
- Live feed: `HomeTab.tsx:72` (`useSocialFeed()`) + `HomeTab.tsx:73` (`useFeedEnrichment`) → `HomeTabVisionCenter.tsx:251` → **`HomeCommunityFeed.tsx`** (full `PostCard` stream, infinite scroll, `HomeCommunityFeed.tsx:12,207-227`).
- Transport: `hooks/social/useSocialFeed.ts:116` → `GET /api/social/posts/feed?limit&offset` → backend mount `backend/core/routes.mjs:424` (`/api/social` → `routes/social/index.mjs`) → `routes/social/posts.mjs:239` feed handler.
- Social tabs also canonical on the same shell: `reels` (`VerticalReels`, real feed media, `UserDashboardTabsV3.tsx:159-163` + `VerticalReels.tsx:45`), `friends` (`FriendsList`, :164-168), `challenges` (`ChallengesView` + `DashboardChallengesParty`, :169-179), `notifications` (`DashboardNotificationsTab`, :180-184).
- Second live community surface: **`/dashboard/client/community` → `ClientCommunityPage`** (`UniversalDashboardLayout.routes.tsx:190`, lazy at `UniversalDashboardLayout.routeComponents.tsx:70`) — its own simplified feed + composer + faction/party/events widgets.
- Challenge authoring (coach side): `/dashboard/admin/challenges` + `/dashboard/trainer/challenges` → `ChallengeCommandWorkspace` (`UniversalDashboardLayout.routes.tsx:125,159`) → `/api/v1/gamification/challenges/*` (mounted `backend/core/routes.mjs:416-418`).
- Workout auto-post write path `[VERIFIED]`: `dailyWorkoutFormRoutes.mjs` → `runWorkoutXpAwardStep` (`services/workout/workoutXpAwardStep.mjs:24`) → `awardWorkoutXP` (`services/awardWorkoutXP.mjs`) → `emitWorkoutXpSideEffects` (`services/awardWorkoutXPSupport.mjs:262-291`) → `createWorkoutAutoPost` / `createStreakAutoPost` (`services/socialAutoPost.mjs:28,73`). Single-post contract is explicit: the XP step "deliberately does NOT post again" (`workoutXpAwardStep.mjs:14-16`).
- Moderation: `/api/admin/content/*` (`backend/core/routes.mjs:455`, admin-gated at `adminContentModerationRoutes.mjs:174-176`) consumed by admin-dashboard `ModerationWidget.tsx:54` + `PostReportsWidget.tsx:211`.

## 2. Current-State Map

| Surface / file | Role | Class |
|---|---|---|
| `UserDashboard/components/HomeCommunityFeed.tsx` (+ `HomeTab.tsx:72-136`, `useHomeComposer.ts`) | THE live feed + quick composer ("Share my week" attaches real `workoutSessionId`, `useHomeComposer.ts:81-100`) | **canonical** |
| `Social/Feed/PostCard.tsx`, `components/PostContent.tsx`, `PostWorkoutDetailsModal.tsx` | Post render; workout share-card (`WorkoutStats` duration/exercises/weight/calories + "Try workout", `PostContent.tsx:54-59,176-194`) | **canonical** (consumed by HomeCommunityFeed) |
| `hooks/social/useSocialFeed.ts` | Full feed API (react/comment/edit/delete/report/repost) | **canonical** |
| `backend/routes/social/posts.mjs` (1457 ln) | feed/trending/CRUD/reactions/comments/report/repost + social XP ledger (idempotent, `posts.mjs:124-163`) | **canonical** |
| `Social/Challenges/ChallengesView.*` + `hooks/useChallenges.ts:53` | Challenges tab (user + `/dashboard/client/challenges` via `ClientChallengesPage.tsx:9`) → `/api/v1/gamification/challenges` | **canonical** |
| `DashBoard/Pages/challenges/ChallengeCommandWorkspace.*` | Trainer/admin challenge authoring: drafts, templates, audience, results, submissions (`useChallengeDraftCreator.ts:33`, `useManagedChallenges.ts:134`) | **canonical** |
| `services/gamification/challenge*` suite + `challengeWorkoutCompletionBridge.mjs:116` | **Workout→challenge auto-progress engine**, called from BOTH write lanes (`dailyWorkoutFormRoutes.mjs:1158`, `aiWorkoutDailyFormService.mjs:238`) | **canonical** |
| `Social/Challenges/challengeSocialShare.ts:63-82` | Completed-challenge → feed share (type `challenge`, wired in mounted `ChallengesView.tsx:29`) | **canonical** |
| `ClientProgressCharts/ShareChartModal.tsx:257,284` | Chart PNG → feed post | **canonical** |
| `Social/Friends/*` + `routes/social/friendships.mjs` | Friends list/requests/suggestions/block, rate-limited | **canonical** |
| `Social/RPG/*` (Faction, PartyHPBar) + `routes/social/factions.mjs`, `parties.mjs` | Faction war (Home right rail `HomeTab.tsx:283`) + accountability parties (challenges tab) | **canonical** |
| `Social/Notifications/SocialNotificationsPanel` via `DashboardNotificationsTab.tsx:14` | Social notifications tab (mark-read + deep-link) | **canonical** |
| `hooks/social/useActivityTicker.ts:88` | Live `social:activity` socket ticker → Home right rail | **canonical** |
| `routes/social/feedEnrichment.mjs:18` + `HomeCommunityFeed.tsx:54-60,135-159` | External filler cards (NASA / Smithsonian / NPS / Wikimedia / swan-curated) injected top-2 + every 4th post | **canonical** (but see §4 — off-strategy) |
| `pages/Social/SocialPage.tsx`, `SocialPage.V3.tsx`, `UserDashboard/components/DashboardFeedTab.tsx`, `Social/Feed/SocialFeed.tsx` + `SocialFeedReady/Sections/Panels/PostStream` | Old full social page + feed tab | **legacy (unmounted)** — `main-routes.tsx:268`, `UserDashboardTabsV3.tsx:154-158`; consumers grep = only each other `[VERIFIED]` |
| `Social/Feed/CreatePostCard.tsx` + `useWorkoutAttachmentBuilder.ts:157` (`/api/workout/sessions`) | The RICH composer (post-type picker, workout attachment builder → `workoutData`) | **legacy** — only consumed by `SocialFeedReady.tsx` `[VERIFIED]` |
| `Social/CoachDock/*` (`SocialCoachDock`, `InlineMilestoneShare`, `milestoneResolver.ts`, `InlineCheerPicker`, `InlineChallengeFinder`) | Coach-drafted milestone share (streak>level>points, honest thresholds) | **dormant** — consumers = `DashboardFeedTab.tsx` + `SocialPage.V3.tsx` only, both unmounted `[VERIFIED]` |
| `routes/social/challenges.mjs` (761 ln) + `models/social/Challenge.mjs` | SECOND challenge system (manual `POST /:id/progress`) | **competing** — sole live consumer = `ClientCommunityPage` via `useDashboardQueries.ts:107` (`/api/social/challenges/active`) |
| `ClientCommunityPage.tsx` | Simplified duplicate feed + composer + the only `EventsList` mount | **canonical but competing** with the Home hub |
| `Social/Events/*` + `routes/social/events.mjs` | Community events + RSVP (any authed user can create, `events.mjs:164`) | **canonical, single-mount** (only inside ClientCommunityPage) |
| `Social/LiveStreaming/LiveStreamingView.tsx`, `Social/CreatorEconomy/CreatorEconomyView.tsx` | "Coming soon" stubs mounted in trainer + client nav (`UniversalDashboardLayout.routes.tsx:165-166,193-194`) | **dormant-but-mounted** (dead nav destinations) |
| `Social/Explore/*`, `Social/Messaging/*` (elite-gated, `/dashboard/*/messages`), `Social/Hashtags/*` | Explore = legacy (only SocialPage); Messaging + Hashtags canonical | mixed |
| `socialAutoPost.mjs createAchievementAutoPost / createWearableSharePost` | Achievement + wearable auto-posts | **dormant exports** — zero callers outside the module `[VERIFIED]` |

**Trainer/admin have NO feed surface inside their dashboards** `[VERIFIED]` — trainer routes (`UniversalDashboardLayout.routes.tsx:150-176`) and admin routes (:87-147) contain no community/feed entry; coaches must leave their dashboard for `/user-dashboard` to see or cheer client posts.

## 3. Data-Truth Check

**Real:** the feed is 100% real DB posts (`SocialPost`), reactions/comments real, XP awards ledgered + idempotent (`posts.mjs:150-167`); reels derive from real media posts (`VerticalReels.tsx:45`); challenge progress is REAL and auto-fed from logged workouts (`challengeWorkoutCompletionBridge.mjs`); ChallengesView "never manufactures challenge cards" (`useChallenges.ts:5-6,81-88`); milestone resolver "never invents a milestone" (`milestoneResolver.ts` header); Home training proof is real sessions (`HomeTab.tsx:97-102`). No mock data found on any mounted community surface `[VERIFIED]`.

**Drift / truth flags (Rule 58):**
1. **`transformation` post type will 500 on the LIVE composer** `[VERIFIED code / LIKELY runtime]`. Home composer mood "Progress photo" maps to type `transformation` (`HomeTabVision.data.ts:60`, `HomeTabViewModel.ts:141-149,169-183`), and intent inference auto-types `transformation` from text like "before and after" (`postIntentInference.ts:38-41`; also used by `ClientCommunityPage.helpers.ts:102`). The model ENUM has NO `transformation` (`models/social/SocialPost.mjs:22-23`: general/workout/achievement/challenge/milestone/creative/dance/music/singing/art/gaming/comedy) → `SocialPost.create` throws → 500 "Failed to create post". Points table even prices it (`posts.mjs:108` `post_create_transformation: 50`).
2. **TWO parallel challenge model families in different tables** `[VERIFIED]`: gamification `models/Challenge.mjs:328` → `challenges` + `ChallengeParticipant.mjs:304` → `challenge_participants` (fields `currentProgress/maxProgress/progressUnit`, statuses joined/active/completed) vs social `models/social/Challenge.mjs:104` → `Challenges` + `social/ChallengeParticipant.mjs:75` → `ChallengeParticipants` (fields `progress/goal/pointsPerUnit`, statuses active/inactive/completed). Same dual-case table-name trap as `users`/`"Users"`. ClientCommunityPage shows the SOCIAL dataset; ChallengesView + trainer authoring + workout auto-progress run on the GAMIFICATION dataset → a client can see challenges on `/dashboard/client/community` that never progress from their workouts.
3. **Privacy leak: friends' `private` posts appear in the feed** `[VERIFIED]` — feed WHERE is `(userId IN [self+friends]) OR visibility='public'` with no visibility filter on the friend branch (`posts.mjs:311-321`), so a friend's `visibility:'private'` post is served to all their friends.
4. **Auto-posts carry no structured workout data** `[VERIFIED]` — `createWorkoutAutoPost` ignores the `workoutId` it receives and writes plain text "Just crushed a workout! | 45 min | 8 exercises | +50 XP" (`socialAutoPost.mjs:28-47`), no `workoutSessionId`, no `metadata.workoutData` → renders as a thin text line, never the `WorkoutStats` share card (`PostContent.tsx:176-177` requires `post.workoutData`).
5. **Offset pagination, not cursor** `[VERIFIED]` — `posts.mjs:242` + `useSocialFeed.ts:93-128` contradict the CLAUDE.md gotcha "Social feed: cursor-based pagination (not offset)"; new posts prepending shift offsets → duplicate/skipped pages on infinite scroll.
6. **Feed enrichment is real API data but off-domain content** (NASA/Smithsonian/NPS) — truthful, cached, moderated (`feedEnrichmentService.mjs`), but not coaching content.
7. Auto-post cadence: XP side effects (and thus the workout auto-post) fire at most **once per user per day** — day-guards at `awardWorkoutXP.mjs:87-103,125-127`. Second workout of the day = zero feed signal.
8. Friend suggestions are "newest users first", no mutual-friend/cohort logic (`friendships.mjs:536-590`).

## 4. Vision Gap Analysis — why the feed is "dead"

7-star target: the feed is the **proof-of-work wall for a coached community** — every real workout becomes a visually rewarding, reactable proof card; coaches celebrate publicly; challenges give the week a shared finish line; the feed is worth opening every day because your people (coach + squad) are in it.

Diagnosis of the dead-feed problem, in causal order:
1. **Content supply is starved and thin.** Max one auto-post per user per day (§3.7), rendered as one plain text line (§3.4). The only rich composer (CreatePostCard with workout attachment) is unmounted (§2), the coach-drafted milestone share dock is dormant (§2), and the mounted quick composer can silently 500 on its "Progress photo" mood (§3.1). With a small roster the result is a near-empty wall padded by NASA photos — filler that signals "nothing is happening here."
2. **Zero ranking.** Pure `createdAt DESC` over friends + ALL public posts (`posts.mjs:339-343`). Milestones (`WorkoutSession.isMilestone/milestoneType` is already computed at `awardWorkoutXPSupport.mjs:161-213`!) rank no higher than "gm". The `/trending` engagement sort exists (`posts.mjs:440`) but only the legacy Explore consumed it.
3. **The coach is absent.** Trainers/admin have no feed surface in their dashboards (§2), no "cheer queue," no coach-mark. The Home feed's own copy promises "coach-marked wins" (`HomeCommunityFeed.tsx:285`) — the feature does not exist. In a trainer-led B2B2C product, coach reaction is THE retention loop; today it requires the coach to wander to `/user-dashboard`.
4. **No weekly rhythm.** Challenges auto-progress beautifully but completion only writes XP (`challengeCompletionRewardService.mjs:21-40`) — no celebration post, no coach notification, no end-of-challenge recap. Streak auto-posts fire at 7/14/30/... (`socialAutoPost.mjs:13`) but nothing anchors "this week": no digest, no cohort finish line.
5. **The community is split three ways.** Home hub feed vs ClientCommunityPage feed (different composer, different challenge dataset §3.2) vs the challenges tab. Small population + three rooms = every room feels empty. Events (a genuine belonging engine) are buried as the last widget of the least-visited room.
6. **Dead nav weight.** "Live Streams" and "Creators" coming-soon stubs occupy trainer+client nav (§2) — empty destinations teach users the community section is vaporware.

What already works and must be EXTENDED, not rebuilt `[VERIFIED]`: the single-write auto-post contract (`workoutXpAwardStep.mjs:14-16`), the workout→challenge auto-progress bridge, ChallengeCommandWorkspace authoring, challenge share-to-feed, chart share-to-feed, `WorkoutStats`/`Try workout` share-card renderer, party/faction primitives, activity ticker, moderation pipeline, honest empty states.

## 5. Ranked Upgrades

| # | What | Why (Core Loop) | Effort | Acceptance criteria | Clicks |
|---|---|---|---|---|---|
| **P0-1** | **Fix `transformation` ENUM drift**: add `transformation` to `SocialPost.type` ENUM via migration (or map→`milestone` server-side in `posts.mjs:695-714`) | Progress-photo shares ARE milestone proof; today the live composer path can hard-fail | **S** | Post with "Progress photo" mood succeeds; regression test posts each `POST_MOODS` id + intent-inferred types through the real route | n/a (bug) |
| **P0-2** | **Rich auto-post share cards**: pass `workoutId/sessionId` + built `workoutData` (title/focus/duration/exerciseCount/totalWeight/top-3 exercises from the just-saved form) + `isMilestone/milestoneType` into `createWorkoutAutoPost`; store as `metadata.workoutData` + `workoutSessionId` | Turns every logged workout into visible, reactable, "Try workout"-able proof — the #1 content-supply fix, reuses the existing renderer (`PostContent.tsx:54-59`) | **M** | Auto-posts render `WorkoutStats` card + Try Workout; milestone sessions show a milestone treatment; zero extra posts (single-write contract preserved) | 0 taps — automatic |
| **P0-3** | **One challenge system**: repoint `useSocialChallenges` (`useDashboardQueries.ts:107`) at `/api/v1/gamification/challenges`; deprecate `routes/social/challenges.mjs` reads (classify remaining consumers, then archive as hygiene slice) | Clients currently see a challenge dataset their workouts can never progress (§3.2) — trust killer | **S-M** | ClientCommunityPage shows the same challenges as ChallengesView; grep shows zero live consumers of `/api/social/challenges`; social challenge tables untouched (no destructive action) | n/a |
| **P1-1** | **Post-save "Share this win"** step: after workout save, a one-tap share sheet (uses the auto-post draft + optional note/photo; skippable) — integration point ONLY, logger UI itself is an active lane (§8) | Least-click milestone sharing; today a manual proof share = open Home → type → mood → post (**4+ taps → 1 tap**) | **S-M** | From save confirmation, 1 tap publishes a rich card (P0-2 shape); 0-tap path (auto-post) unchanged | 4+ → 1 |
| **P1-2** | **Feed ranking v1 + cursor pagination** (spec §6-A): recency × relationship × milestone-weight × richness; `(createdAt,id)` cursor | Milestones and coach/squad content surface first; fixes duplicate pages; makes small feeds feel alive | **M** | A 7-day streak post outranks a newer "gm"; page 2 never duplicates; own+coach posts always in first screen; feature-flagged fallback to recency | n/a |
| **P1-3** | **Challenge completion celebration** (spec §6-C): on `wasCompleted` (`challengeProgressEventService.mjs:120`), auto-post typed `challenge` w/ `challengeData` + socket celebration + coach notification | Closes join→progress→finish→**celebrate**; feeds P1-2 with high-weight content | **S-M** | Completing a challenge creates exactly one celebration post (idempotent on participantId) + a trainer notification; leaderboard final standing included | 0 taps |
| **P1-4** | **Trainer Celebrate Queue**: trainer-overview card listing assigned clients' last-48h milestone/workout posts with 1-tap cheer (reuse `reactToPost`) + comment | Coach reaction is the retention loop; today = leave dashboard → find post (**5+ taps → 2**) | **M** | Trainer sees only assigned clients' posts (reuse `ClientTrainerAssignment` scoping); cheer lands as a normal reaction the client sees | 5+ → 2 |
| **P1-5** | **Fix friends'-private-post leak**: add visibility filter to the friend branch (`posts.mjs:311-321`) | Trust/privacy (Rule 62 posture) | **S** | private = author-only; friends = friends+author; regression test with 3-user fixture | n/a |
| **P2-1** | **Weekly loop**: Monday "this week in your squad" notification (active challenge + who's on a streak) + Friday finish-line nudge; reuse notification pipeline + streak-rescue pattern (`HomeTab.tsx:111-115`) | The reason-to-return cadence; challenges become the week's shared arc | **M** | 2 scheduled notifications/wk max, deep-link to challenges tab; opt-out honored | n/a |
| **P2-2** | **Merge community rooms**: fold ClientCommunityPage's unique widgets (Events, faction/party) into the Home hub right rail / challenges tab; make `/dashboard/client/community` a redirect | One room where everyone is, instead of three empty ones | **M** | Events reachable from Home in ≤2 taps; no duplicated composer; redirect keeps old links alive |
| **P2-3** | **Resurrect the milestone share dock** into the live `SwanCoachDock` (port `InlineMilestoneShare` + `milestoneResolver` — dormant, already honest-thresholded) | Coach-voiced share drafts lower the posting barrier | **S-M** | "Share milestone" appears in Home coach dock only when a real threshold clears; posts via existing `createPost` | 3 → 2 |
| **P3-1** | Friend suggestions v2: rank by mutual friends + same challenge/party/trainer cohort (`friendships.mjs:536-590`) | Belonging via training cohorts, not recency of signup | **S** | Suggestions show shared-context label ("same challenge") |
| **P3-2** | Remove "Live Streams"/"Creators" stubs from client+trainer nav (files stay, Rule 34) | Kill decorative dead ends that cheapen the section | **S** | Nav entries gone; routes still render if deep-linked |
| **P3-3** | Re-skin feed enrichment to coaching content (form tips, exercise spotlights from the real exercise library) or demote below real posts | Filler should teach, not distract | **M** | Enrichment cards link to in-app exercises, never outrank real member posts |

## 6. Algorithm Specs (extend, don't rebuild)

### A. Feed ranking v1 (extends `GET /api/social/posts/feed`, `posts.mjs:239`)
- **Inputs:** candidate window = latest ~120 posts matching the existing WHERE (keep friend scoping + moderation filter); viewer's `friendIds` (already fetched :293-305), viewer's trainer/client assignments (`ClientTrainerAssignment`), post fields (`type`, `createdAt`, `metadata.workoutData`, `mediaUrl`, `workoutSessionId`), linked `WorkoutSession.isMilestone/milestoneType`, reaction/comment counts (already batch-fetched :354-393).
- **Score (compute in JS after fetch, no SQL change):**
  `score = recencyDecay * relationshipW * milestoneW * richnessW + engagementNudge`
  - `recencyDecay = exp(-ageHours / 36)`
  - `relationshipW`: own 1.3 · own-coach/own-client 1.5 · friend 1.2 · same-party/same-challenge 1.15 · public-other 0.6
  - `milestoneW`: streak/`milestone` type or `isMilestone` 2.0 · `challenge` completion 1.8 · `achievement` 1.5 · `workout` w/ workoutData 1.3 · plain 1.0
  - `richnessW`: has media or workoutData 1.2 else 1.0
  - `engagementNudge = min(0.2, 0.02*(likes+2*comments))` — capped so cliques can't dominate.
- **Output:** same response shape (posts + pagination) so `useSocialFeed`/`HomeCommunityFeed` need no changes; add `rankingVersion` for observability. **Pagination:** switch to keyset cursor `(createdAt,id)` for the fallback recency order; ranked page-1 is re-scored per request, subsequent pages fall back to cursor-recency (good enough at current scale).
- **Extend-don't-rebuild:** keep the enhanced-table fallback (`posts.mjs:33-102`) and the legacy-table error path intact.

### B. Milestone share-card composition (from real workout data)
- **Source of truth:** the just-committed `DailyWorkoutForm` + `WorkoutSession` (+ `tagWorkoutSessionMilestone` output, `awardWorkoutXPSupport.mjs:161-213`) — never recomputed from client input.
- **Build (server-side, inside `emitWorkoutXpSideEffects`):**
  `workoutData = { title, focus, duration, exerciseCount, totalWeight, exercises: top3 by volume {name, sets, reps, weight} }` — sanitize through the EXISTING `sanitizeWorkoutPostData` (`socialWorkoutData.mjs:64-84`, 12-exercise cap, length limits).
  `post = { userId, type: isMilestone ? 'milestone' : 'workout', content: headline, workoutSessionId, metadata: { workoutData, milestoneType, streakDays, pointsAwarded, isAutoGenerated: true }, visibility: 'public', moderationStatus: 'approved' }`.
- **Render:** zero new UI — `attachWorkoutDataToPost` (`socialWorkoutData.mjs:92-96`) already lifts `metadata.workoutData`, and `PostContent.tsx:176-194` already renders `WorkoutStats` + "Try workout" + details modal. Milestone variant: add a rarity-tinted frame keyed off `metadata.milestoneType` (Crystalline tokens, Rule 6).
- **Idempotency:** key auto-posts on `workout:autopost:{userId}:{dailyFormId}` to survive retries (the XP ledger idempotency pattern at `posts.mjs:124-132` is the model).

### C. Challenge lifecycle (join → progress → finish → celebrate)
- **Today `[VERIFIED]`:** join/leave (`gamificationV1Routes.mjs` join + DELETE leave; `useChallenges.ts:95-121`) → auto-progress from every canonical workout write (`challengeWorkoutCompletionBridge.mjs:116`; units sessions/workouts/minutes/days, day-dedup, per-source dedup via `progressHistory`, rule-token matching on exercise families/tags, `challengeProgressEventService.mjs:10,89-131`) → completion flips status + `awardWorkoutChallengeCompletionXp` → **manual** share only (`challengeSocialShare.ts:63-82`).
- **Extend:** in the completion branch (`wasCompleted`, `challengeProgressEventService.mjs:120`): (1) auto-create celebration post typed `challenge` with `challengeData = { title, progressLabel, finishedAt, finalRank?, reward }` (idempotency key `challenge:celebrate:{participantId}`); (2) emit `social:activity {type:'challenge_completed'}` (ticker already listens, `useActivityTicker.ts:88`); (3) notify the authoring trainer (audience linkage already exists in `challengeAudienceService`); (4) at challenge `endDate`, a results digest post from the authoring trainer's identity via `challengeResultsService` — celebration is coach-voiced, on-brand for trainer-led community.
- **Weekly loop hooks:** challenges are the anchor object — Monday digest (P2-1) reads active participations; Friday nudge reads `progressPercentage ≥ 60 && < 100` ("one workout from the finish").

## 7. Cross-Domain Dependencies & Sequencing

- **Workout logger lane (Phase-1, OUT OF SCOPE here):** P1-1 post-save share is an integration point on the save-confirmation callback of the unified write path — coordinate, don't touch `WorkoutLogger.tsx`. P0-2 lives entirely server-side in the XP side-effect step so it's safe to ship independently.
- **Next-Best-Action engine (EXISTS — extend):** `nextBestActionService.mjs` already emits share-nudge copy (":127,177"). Feed ranking (P1-2) and the celebrate queue (P1-4) should feed it signals (e.g. "client hit milestone → suggest coach cheer") rather than building a second recommender.
- **Gamification:** all social XP flows through `GamificationPointsService.recordLedgerEntry` with idempotency — any new celebration/auto-post XP must reuse it (double-award gotcha). Live gamification surface = `gamificationV1Routes.mjs` (also aliased at `/api/gamification`, `core/routes.mjs:416-418`).
- **Dashboards workstream (deep-audit §J):** the trainer Celebrate Queue (P1-4) belongs on the trainer overview being reworked there; admin "what progress can we celebrate" card should read the same milestone-post query.
- **Charts (deep-audit §I):** `ShareChartModal` is the proof-share exemplar — P0-2's card + chart-share should converge on one share-card visual language.
- **Sequencing:** P0-1 (unblocks composer) → P0-2 (content supply) → P0-3 (one challenge truth) → P1-2 ranking (needs P0-2's milestone metadata) → P1-3/P1-4 celebration loops → P2 consolidation/rhythm.
- **Schema migrations needed:** ENUM add (P0-1); none for P0-2 (uses existing `metadata` JSON + `workoutSessionId` col, `SocialPost.mjs:126`). Rule 58: verify the prod ENUM label list and the dual challenge tables (`challenges` vs `Challenges`) via information_schema before migrating.

## 8. Do-Not-Touch (active lanes)

- **Workout logger UI/flow + exercise-picker consolidation** — active Phase-1 build lane. Do not modify `WorkoutLogger.tsx`, `QuickLogMode`, picker components, or `dailyWorkoutFormRoutes.mjs` write logic beyond the documented side-effect extension point (`workoutXpAwardStep.mjs` / `emitWorkoutXpSideEffects`).
- **Stripe/storefront checkout internals** — Codex lane (`adminPackageRoutes.mjs` shared-file caution per Rule 67 lanes).
- **Hermes/Pi operator work** — out of scope.
- **Do not rebuild:** next-best-action engine, unified workout write path/`workoutXpAwardStep.mjs` single-post contract, `gamificationV1Routes.mjs` challenge suite, `sessionDeductionService` ledger, admin/trainer client command center, PainChartInsightPanel.
- **Do not delete without a Rule 34 pass:** legacy `SocialPage*`/`SocialFeed.tsx`/`CreatePostCard`/`DashboardFeedTab`/CoachDock files (harvest `CreatePostCard`'s workout-attachment builder + CoachDock's milestone resolver before any archive), `routes/social/challenges.mjs` + social challenge tables (data may exist in prod), enrichment service.
- **Rule 16/40/41 apply** to any implementation slice that follows from this audit (design router for the milestone card visuals; closeout evidence lock on ship).

---
*Self-contained for a future AI: start at §1 receipt, trust §3 flags only after re-verifying line numbers against current origin/main (this doc is pinned to 87680741e).*
