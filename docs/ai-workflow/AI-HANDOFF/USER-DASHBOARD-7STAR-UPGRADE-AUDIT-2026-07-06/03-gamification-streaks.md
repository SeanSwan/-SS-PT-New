# 03 — Gamification, Streaks, XP, Milestones (7-Star Upgrade Audit)

Audit baseline: `origin/main @ 87680741e` (worktree `c:/tmp/ss-audit-20260706`). 2026-07-06. Read-only domain audit for future AI builders. All paths repo-relative. Tags: [VERIFIED]=file read this session, [LIKELY]=consistent evidence, [HYPOTHESIS]=needs probe (usually production DB).

---

## 1. Canonical Surface Receipt

**Backend (one live router, two mounts):**
- `backend/core/routes.mjs:416-418` — `gamificationV1Routes` mounted at **both** `/api/v1/gamification` AND `/api/gamification` [VERIFIED]. Legacy `gamificationRoutes.mjs` / `gamificationApiRoutes.mjs` imports are commented out at `routes.mjs:94-95` [VERIFIED] — those two route files are **legacy/unmounted** (files still exist in `backend/routes/`).
- `backend/routes/gamificationV1Routes.mjs` (775 lines) — ~70 endpoints: stats/progress, leaderboard, challenges (+submissions/moderation/results), achievements, points/rewards, milestones, goals, social-follow, settings, `/record-workout`, streak-freeze, comeback-challenge, activity-feed, weekly-recap, Ghost/Vault/Aegis/JobClass/Pet [VERIFIED].
- Competing live gamification writer: `PUT /api/workout/sessions/:id` (`backend/core/routes.mjs:350` mounts `workoutRoutes.mjs`; `workoutRoutes.mjs:229`) → `workoutService.updateWorkoutSession` → on status→completed `workoutService.mjs:454` → `updateClientProgress:491` → `updateGamification:809` [VERIFIED]. See §3 drift.

**Frontend (user role):**
- `/gamification` → `AdvancedGamificationPage` — `frontend/src/routes/main-routes.tsx:728-738`; `/achievements`, `/challenges`, `/leaderboard` redirect there (`main-routes.tsx:740-750`) [VERIFIED].
- `/user-dashboard(/:tab)` → `UserDashboard.V3` (`main-routes.tsx:269-272, 705-726`). Home tab (`HomeTab.tsx:68-114`) pulls `useGamificationData()` — level, points, tier, `streakDays`, level progress; left rail renders "Creator Streak" flame + 7-dot week (`HomeTabVisionLeftRail.tsx:167-176`) [VERIFIED]. Challenges tab mounts `Social/Challenges/ChallengesView` + `DashboardChallengesParty` (`UserDashboardTabsV3.tsx:32-37,169-176`) [VERIFIED].
- Client role: `/dashboard/client/progress` → `ClientProgressDashboardPage` (`UniversalDashboardLayout.routes.tsx:185`) — weekly recap (`ClientProgressDashboardPage.recap.ts:47` → `/api/gamification/users/:id/weekly-recap`) + compact `CompanionPet` (`ClientProgressDashboardPage.tsx:54-55,199-201`); `ClientProfilePage.tsx:48-49,283` also mounts compact pet [VERIFIED].
- Admin: `/dashboard/gamification` → `AdminGamificationView` (`UniversalDashboardLayout.routes.tsx:124`), tabs include `RPGFeaturesPanel` (`AdminGamificationTabs.tsx:21,135`) [VERIFIED].
- Data hook: `frontend/src/hooks/gamification/useGamificationData.ts:79-151` — GET `/api/v1/gamification/profile`, `/achievements`, `/rewards`, `/leaderboard`; computes `levelProgress` client-side from the shared power curve (`frontend/src/types/gamification.ts:9-10,239-249` mirrors `backend/utils/levelingAlgorithm.mjs:15-16`) [VERIFIED].

## 2. Current-State Map

| Surface / module | file:line | Class |
|---|---|---|
| `gamificationV1Routes.mjs` + `gamificationController.mjs` (4,050 ln) | routes.mjs:416-418 | **canonical** |
| `awardWorkoutXP.mjs` + `awardWorkoutXPSupport.mjs` (XP+streak+milestone engine) | services/awardWorkoutXP.mjs:36-256 | **canonical** |
| `workout/workoutXpAwardStep.mjs` (unified-lane post-commit XP step, Phase 1.1a) | :24-73; called by `aiWorkoutDailyFormService.mjs:243` | **canonical** |
| `GamificationPointsService.recordLedgerEntry` (single ledger writer; syncs User.points/level/tier) | GamificationPointsService.mjs:155-297 | **canonical** |
| `levelingAlgorithm.mjs` power curve + 100 Swan rank titles | :15-16,18-119,184-206 | **canonical** |
| Challenge stack: `challengeWorkoutCompletionBridge` → `challengeProgressEventService` (sourceId idempotency :83-85,232) + creation/templates/submissions/results services | services/gamification/challenge*.mjs | **canonical** |
| `weeklyChallengeCron.mjs` (10 rotating templates, auto weekly challenge) started at `core/startup.mjs:586-588` | weeklyChallengeCron.mjs:16-80 | **canonical** |
| `socialAutoPost.mjs` — workout auto-post EVERY XP'd workout; streak post at [7,14,30,60,90,180,365] | :13,28-66,73-88 | **canonical** (see §3 trust flag) |
| `CompanionPetService.mjs` + config/state (adopt/interact/activity/evolution) | :46+; endpoints v1Routes:766-773 | **canonical** (read/write via UI only) |
| Realtime: ledger → `GamificationRealtimeEvents.mjs:33-46` → socket `gamificationEvents.mjs` (30s debounce) | emit path [VERIFIED] | **canonical backend, orphan frontend** |
| `hooks/gamification/useGamificationRealtime.ts` (toasts for points/level-up/streak events) | zero importers [VERIFIED] | **dormant** |
| `components/Celebrations/PostWorkoutCelebration.tsx` (+`XPCounter`, `CelebrationPortal`, `ComebackBanner`) | only `CelebrationToggles` consumed (SocialFeedReady.tsx:2) | **dormant** — the built dopamine beat is unmounted |
| `GamificationStreakService.mjs` (freeze earning, comeback creation) | zero runtime importers [VERIFIED] | **dormant** — freeze/comeback lifecycle dead |
| `GamificationEngine.mjs` (own hardcoded `levelThresholds` :117, own achievements check :550) | reached only via `/api/master-prompt/gamification/*` (routes.mjs:665); no frontend caller of those endpoints found; unused import in `social/posts.mjs:12` | **legacy/near-dormant** |
| `workoutService.updateGamification` second XP/streak/achievement engine | workoutService.mjs:809-896 | **competing — LIVE** via `/workout` page (`main-routes.tsx:781-799` → `WorkoutDashboard.tsx:122-126` → `RecentSessions.tsx:104-107` PUT status:'completed') |
| `Pages/trainer-gamification/` (award dialogs, client table) | no route imports it [VERIFIED grep] | **dormant** |
| `AdvancedGamification/components/` RPG suite (StreakFortress, VaultDecryption, AegisHud, GhostMode, JobClassSelector, CrystallineAvatar, GamificationHub) | only CompanionPet reaches client pages; rest reachable only via admin `RPGFeaturesPanel` and unmounted `AvatarHomePage` | **dormant for the user role** despite live backend endpoints (v1Routes:748-773) |
| `frontend/src/services/gamificationRewardsService.ts:43` + `enhancedClientDashboardService.ts:428` (POST `/record-workout`) | consumers: `useEnhancedClientDashboard` (no importers), `useMcpIntegration` (FoodIntakeForm only) | **dormant/legacy** |
| `Celebrations/ComebackBanner` + backend comeback endpoints (v1Routes:717-728) | creator only in dormant service (GamificationStreakService.mjs:100) | **dormant end-to-end** |

## 3. Data-Truth Check

**Real data (good):**
- All user-facing gamification reads are real DB reads: profile = `User` + `UserAchievement`/`UserReward`/`UserMilestone` + `PointTransaction` (gamificationController.mjs:962-1032). `useChallenges.ts:53-88` has NO demo fallback — truthful error/empty states (`isDemoData` hardwired false :80,84) [VERIFIED].
- XP idempotency is strong on the canonical lane: 4 stacked guards in `awardWorkoutXP` — ledger `idempotencyKey` `workout:{userId}:{formId|date}` (:47,61-71), numeric `sourceId` re-check (:73-85), day-level `WorkoutSession.experiencePoints>0` guard (:93-103), `lastActivityDate` same-day guard (support :96-98). `recordLedgerEntry` double-checks the key under row lock (:190-221) [VERIFIED]. Max ONE workout XP award per calendar day.

**Drift / defects (each verified by file read; runtime impact tagged):**
1. **Streak freeze is a placebo.** Freezes are only *earned* in dormant `GamificationStreakService.checkStreakFreezeEligibility` (zero callers) and only *spent* by `useStreakFreeze` (controller:3225-3280) which decrements `Gamification.streakFreezes` — but the live streak engine (`awardWorkoutXPSupport.mjs:96-152`) reads/writes **`User.streakDays`** and never consults freezes. Response text "Your streak is safe" (:3268) is false. [VERIFIED code; user impact LIKELY invisible today since the buying UI (StreakFortress) is dormant.]
2. **Two streak stores.** `User.streakDays` (canonical, User.mjs:370) vs `Gamification.streakCount` (Gamification.mjs:51) written by the competing `workoutService.mjs:871-884` lane and read by streak-freeze status (:3212), weekly recap block (:3340,3367) and AI self-service dispatchers (`clientSelfServiceReadDispatchers.mjs:90,251`). They WILL disagree. [VERIFIED]
3. **Three level curves.** (a) canonical power curve `floor(80*(L-1)^1.6)` (levelingAlgorithm.mjs:184-200, mirrored frontend); (b) `workoutService.mjs:860` `100*1.5^(level-1)` writing `Gamification.level/experience`; (c) `GamificationEngine.mjs:117,435-441` hardcoded thresholds. Plus `getUserProfile`'s `nextLevelProgress` uses a 4th source — `settings.levelRequirements` + retired tier names `bronze_forge…crystalline_swan` (controller:1052-1071); HomeTab masks this by preferring client-side curve math (HomeTab.tsx:89). [VERIFIED]
4. **Cross-lane double XP possible.** Same day: form log via `POST /api/workout-forms` (key `workout:{uid}:{formId}`) + session "mark completed" via `PUT /api/workout/sessions/:id` (key `workout-service:{uid}:{sessionId}:completion`, workoutService.mjs:849) → different keys, and the day-guard only sees sessions with `experiencePoints>0` which the workoutService lane never sets. [VERIFIED keys; double-award LIKELY reproducible.]
5. **Auto-achievements are dead.** The only automatic workout achievement path, `workoutService.checkAchievements` (:907-974), switches on `achievement.type`/`achievement.criteria` — **columns that do not exist** on `Achievement.mjs` (category ENUM at :88; no `type`/`criteria` attrs) → `achieved` never true. It would also crash on award via `sequelize.models.UserAchievements` (plural, :913,970). Net: the rich seeded Swan catalog (`seeders/20260310000001-reseed-swan-achievements.cjs` — 5-tier skill trees: awakening/iron-ice/streak/social/special) is awarded ONLY manually (controller:1639,1753), by challenge completion (`models/social/ChallengeParticipant.mjs:128`), or by AI dispatcher (`gamificationCommandDispatchers.mjs:157`). [VERIFIED]
6. **Milestone table likely empty.** `collectWorkoutMilestones` awards points-threshold `Milestone` rows (support :215-260) but no Milestone seeder exists (`backend/seeders/` has achievement seeders only) → `awardedMilestones` likely always `[]` in production. [HYPOTHESIS — verify: `SELECT count(*) FROM "Milestones" WHERE "isActive"=true`.]
7. **Client self-log response omits XP.** `dailyWorkoutFormRoutes.mjs:1197-1224` awards XP in `setImmediate` AFTER `res.status(201)` (:1248-1266) — response carries `challengeProgress` but no `xpAwarded/streakDays`. The unified adapter DOES return them (`aiWorkoutDailyFormService.mjs:269-271`) but its callers are admin logger/Coach/AI dispatcher, not the client UI (nasmApiService.ts:695 → this route). [VERIFIED]
8. **Grace day mislabeled in ledger.** Auto-consumed streak grace writes `source:'admin_adjustment'`, `transactionType:'adjustment'` with a `[STREAK_GRACE]` description prefix (support :117-146) — pollutes admin-adjustment analytics and makes grace invisible as a first-class concept. [VERIFIED]
9. **Spend lowers level.** `recordLedgerEntry` recomputes level/tier from post-spend balance (:245-247,265-268), violating the stated contract "level must be driven by LIFETIME earned XP" (levelingAlgorithm.mjs:9-10). Redeeming a reward (v1Routes:369) can demote level/tier/rank-title. [VERIFIED]
10. **Every-workout public auto-post, no consent.** `createWorkoutAutoPost` posts `visibility:'public'` on every first-XP-of-day workout with no user opt-out check (`socialAutoPost.mjs:28-47`). Feed noise + privacy-trust risk (Rule 62: community must reinforce, not spam). [VERIFIED]
11. Comeback challenges: GET/accept endpoints live (v1Routes:717-728, controller:3462-3515) but the only creator is dormant (`GamificationStreakService.mjs:100`) and no cron calls it → always empty. [VERIFIED]
12. Companion pet workout evolution orphaned: `strength_workouts`/`cardio_workouts` counters (companionPetConfig.mjs:63-64) only advance via `POST .../pet/activity`, which has zero frontend callers and no backend hook from workout completion. [VERIFIED]
13. `POINTS_CONFIG.dailyLogin` etc. (levelingAlgorithm.mjs:256-276) have no awarding path [VERIFIED grep: only ethical/vault configs reference daily_login].

## 4. Vision Gap Analysis (7-star vs today)

Core Loop stage 4-5 ("streak/progression feedback… shareable milestone") is where this domain lives. Today:
- **The dopamine beat does not exist on the self-log path.** User taps Log Workout → fills form → Save → sees a toast + (if enrolled) a challenge receipt (`WorkoutLoggerChallengeReceipt.tsx`, real backend-authoritative — good). XP, streak increment, level-up, milestone: **never shown at the moment of logging**. Seeing your streak requires navigating Home (left rail) or `/gamification` — 1-2 extra taps AND a stale-cache refetch. A complete `PostWorkoutCelebration` overlay (peak-end rule, XP count-up, level-up glow, reduced-motion aware) sits dormant.
- **Streak mechanics are half-real.** Real: daily increment, 1-per-30d auto grace, weekly streak bonus XP, streak-at-risk escalation on Home (`assessStreakRisk`, HomeTabProofViewModel.ts:104-116 — evening + no session today). Fake/dead: freeze tokens, comeback challenges, StreakFortress UI. 7-star = one coherent loss-aversion system: visible streak state, earnable/holdable freezes that the engine actually honors, automatic comeback offer after a break, repair receipt in the ledger.
- **Milestone taxonomy is fragmented:** session tags (`workout_count_{1,10,25,50,100,250,500}`, `streak_{7,14,30,60,90,180,365}`, `first_60min` — support :161-213), points-threshold `Milestone` rows (likely unseeded), seeded achievement trees (not auto-awarded), streak auto-posts. Nothing scores share-worthiness; sharing is an unconditional public auto-post instead of a user-owned "share this milestone" moment.
- **Rank ladder pacing:** at realistic volume (4-5 workouts/wk ≈ 400-550 XP/wk: base 50 + ~10/exercise + duration + weekly streak bonus 20) → L5 ≈ 2 wks, L10 ≈ 6 wks, L21 (3rd rank title) ≈ 4-5 months, L50 ≈ 1.6 yrs, L1000 ≈ centuries. First 90 days feel good; titles 4-100 are decorative. Challenge XP and (if seeded) milestone bonuses are the only accelerants.
- **Trainer/admin lens:** admin has a real gamification console; trainer award surface is built but unmounted; the coach cannot see "client streak about to break" as an intervention queue (that signal exists per-user only on the client's own Home).

## 5. Ranked Upgrades (P0-P3)

**P0-1 — Return XP in the client save response + mount the reward moment.** Move the self-log lane onto the proven pattern: replace the fire-and-forget block (`dailyWorkoutFormRoutes.mjs:1197-1224`) with `runWorkoutXpAwardStep` (already 300-line-cap-safe, post-commit, never fails the write) and include `xpAwarded/streakDays/levelUp/milestones` in the 201 body (mirror `aiWorkoutDailyFormService.mjs:269-271`). Then mount `PostWorkoutCelebration` in `WorkoutLogger`/`ClientMyWorkoutsPage` on save success, fed ONLY by response data (no invented XP — keep the challenge-receipt discipline). Core Loop: this IS the addictive feedback beat. Value: highest in domain. Effort: **S-M**. Acceptance: self-log → overlay shows real +XP, streak count, level-up when true; zero overlay when `sameDay/alreadyAwarded`; reduced-motion respected; response contract test. Click delta: reward visibility **2 taps + refetch → 0 taps**.
**P0-2 — Kill the double-economy.** Pick the form lane as the only XP writer (per KNOWN TRUTH #2): make `workoutService.updateGamification` stop awarding ledger XP/parallel level/streak (or gate `PUT /sessions/:id` completions into the same idempotency key space `workout:{uid}:{date}` + day guard writing `experiencePoints`). Also sync or retire `Gamification.streakCount/level/experience` readers (recap :3340, AI dispatchers). Effort: **M**. Acceptance: same-day form-log + session-complete yields exactly one `workout_completion` earn; drift table for readers updated.
**P0-3 — Honor the contract: level = lifetime XP.** In `recordLedgerEntry`, compute level/tier from lifetime earned (sum of earn/bonus, or a `lifetimePoints` column) and never demote on `spend` (:245-268). Effort: **S** (+migration backfill). Acceptance: redeem reward → balance drops, level/tier/rank unchanged; regression test.

**P1-1 — Real streak-freeze + comeback lifecycle.** Wire freeze earning (port dormant `checkStreakFreezeEligibility` into the streak step), consume a freeze inside `buildWorkoutProgressStats` when gap > grace (before reset), write a first-class ledger row (`source:'streak_freeze'`), and schedule comeback creation from the existing daily cron pattern (`startup.mjs:586` shows the wiring idiom; `createComebackChallenge` logic already written). Mount `ComebackBanner` on Home. Fix grace mislabel (#8) in the same slice. Effort: **M**. Acceptance: miss 1 day beyond grace with a freeze held → streak preserved + freeze decremented + ledger row; 8+ day absence → comeback offer visible on Home, accept → 2x XP applies via existing `updateComebackProgress` semantics. Click delta: comeback re-activation **(no path today) → 1 tap Accept**.
**P1-2 — Milestone detection + share-worthiness scoring + owned share prompt.** Replace unconditional public auto-post (#10) with: always tag session milestones (already done), score share-worthiness (§6.3), and put a **Share to community** button INSIDE the P0-1 celebration for score ≥ threshold (auto-post becomes opt-in default-on for milestones only, per-user toggle — `CelebrationToggles` already exists). Core Loop stage 5 becomes user-owned. Effort: **M**. Acceptance: ordinary workout → no public post unless user opted in; 30-day streak → share prompt with prefilled proof card; consent stored. Click delta: milestone share **0 taps but non-consensual → 1 tap and owned**.
**P1-3 — Seed the Milestone table + auto-award achievement tiers.** Ship a Milestone seeder (points thresholds aligned to the power curve: e.g. L2/L5/L10/L15/L20 boundaries) and a small event-driven evaluator in the XP step that advances seeded achievements from real counters (`totalWorkouts`, `streakDays`, challenge completions) — extending `collectWorkoutMilestones`, NOT resurrecting `workoutService.checkAchievements` or `GamificationEngine`. Effort: **M**. Acceptance: 10th workout auto-awards the tier-1 workout-count achievement + shows in celebration + `/gamification`.

**P2-1 — Trainer streak-risk queue.** Surface `assessStreakRisk`-style signal per client on the trainer/admin client command center (extend `nextBestActionService.mjs` — it already owns next-best-action; add `streak_at_risk` input). Effort: **M**. Acceptance: trainer sees ranked "streaks at risk today" list; tap → client Today view. Click delta: finding at-risk clients **manual per-client inspection → 1 tap**.
**P2-2 — Mount `useGamificationRealtime`** in UserDashboard shell so ledger events toast + invalidate profile/leaderboard queries (backend already emits with 30s debounce). Effort: **S**. Acceptance: trainer logs for client → client's open dashboard toasts XP without refresh.
**P2-3 — Feed the companion pet from the XP step** (`recordActivity(userId,'strength_workouts'|'cardio_workouts')` post-commit, best-effort) so the one RPG element users already see (client progress/profile pages) reflects training. Effort: **S**. Acceptance: logged strength workout advances pet counter; evolution mods appear.

**P3-1 — Decide the dormant RPG suite** (StreakFortress/Vault/Aegis/Ghost/JobClass/CrystallineAvatar): either mount behind a gamification tab for users at 50+ actives (deferred roadmap already says V2-V4 wait) or archive fronted UI; do not leave 6 live endpoint families with zero user surface. Effort: decision + S.
**P3-2 — Retire/mark legacy:** delete unused `gamificationEngine` import (`social/posts.mjs:12`), fold `GamificationEngine` master-prompt endpoints onto the canonical ledger/curve or label internal-only; archive `gamificationRoutes.mjs`/`gamificationApiRoutes.mjs` after Rule 34 grep. Effort: **S**.
**P3-3 — Rank-title compression or prestige events:** add seasonal/prestige XP events or compress titles to match real pacing (§4); data-informed, post-P0/P1.

## 6. Algorithm Specs

### 6.1 Streak engine (current [VERIFIED] + target)
State: `User.streakDays`, `User.lastActivityDate` (day-normalized). Input: one XP-eligible workout/day (form date string or server now).
```
gap = floorDays(workoutDay - lastActivityDay)   # server-TZ midnight normalization (UTC on Render)
gap==0 → keep streak (no XP; sameDay)
gap==1 → streak+1
gap==2 → if no [STREAK_GRACE] ledger row in 30d: streak+1, write grace row   # auto, invisible to user
         else streak=1
gap>2  → streak=1
bonus: streak%7==0 → +settings.pointsPerStreak (default 20), key streak:{uid}:{days}:{date}
```
Gaps vs 7-star: (a) **timezone** — day boundary is server UTC; a 5pm PT logger crossing UTC midnight can skip/merge days. Target: resolve day using a user `timezone` profile field (fallback UTC), normalize with it in `buildWorkoutProgressStats` and `assessStreakRisk` (frontend already uses device-local — the two disagree today). (b) **freeze**: consume in the `gap>graceWindow` branch when `Gamification.streakFreezes>0` (row-locked), ledger `source:'streak_freeze'`, cap 3, earn 1 per 7-day milestone (dormant logic is correct — port it). (c) **repair**: allow 1-tap paid/earned repair within 48h of a break (comeback `streak_recovery` type already models this). (d) Grace should become visible: "Grace day used — 1 left this month" in the celebration.

### 6.2 XP + level pacing (current [VERIFIED])
```
xp = settings.pointsPerWorkout (50)
   + (exerciseDetails? sumExerciseXP : exercisesCompleted*pointsPerExercise)   # per-ex: experiencePointsEarned || difficulty*10
   + floor(max(0,duration-30)/5)                                              # +1 per 5 min past 30
   × clamp(settings.pointsMultiplier,0..5)
   + combo bonus (detectCombos: e.g. full_spectrum 3.0x — gamificationComboService.mjs:19-27)
level(P) = inverse of pointsForLevel(L)=floor(80*(L-1)^1.6), MAX 1000; rank title changes every 10 levels
```
Sanity at 4-5 logs/wk (~450 XP/wk): L2 day 1 · L5 ~2wk · L10 ~6wk · L20 ~4.5mo · L50 ~1.6yr. Verdict: early pacing healthy; add non-workout earners already declared in `POINTS_CONFIG` (recovery/nutrition/social log actions) through `recordLedgerEntry` with per-source daily caps (`dedupeBySourceToday`) before touching the curve. Do NOT rebuild the curve — frontend/backend/ tests mirror it.

### 6.3 Milestone detection + share-worthiness (target; extends `tagWorkoutSessionMilestone` + `collectWorkoutMilestones`)
```
inputs: xpResult {streakDays,totalWorkouts,awardedMilestones,levelUp,prCount}, challengeProgress.completed
score = max(matching):  streak∈{7:60,14:65,30:80,60:85,90:90,180:95,365:100}
        workout_count∈{1:70(first proof!),10:60,25:65,50:75,100:85,250:90,500:95}
        levelUp:40 + 5*floor(newLevel/10) · challengeCompleted:70 · PR:65 · first_60min:55
share prompt if score≥60; auto-suggest caption from milestoneType; store consent per user (default: prompt, never silent-public)
output: {milestoneType, score, sharePrompt:boolean, proofCard:{streakDays,totalWorkouts,level,tierName}}
```
Detection stays server-side in the XP step (single writer); the celebration consumes it from the save response. Idempotent by construction (fires only when XP fires, once/day).

## 7. Cross-Domain Dependencies & Sequencing

- **Workout logger lane (Phase 1, out of scope here)** owns the UI where the P0-1 celebration mounts — deliver P0-1 backend response-contract first (pure `dailyWorkoutFormRoutes`/`workoutXpAwardStep` change), hand the overlay mount to that lane as an integration point.
- **Next-best-action engine** (`nextBestActionService.mjs`, KNOWN TRUTH #1): P2-1 streak-risk input EXTENDS it; also the streak-rescue Home escalation already feeds it conceptually (HomeTabProofViewModel.ts:102).
- **Social/community domain:** P1-2 changes auto-post semantics (`socialAutoPost.mjs` is shared with the activity ticker + admin RecentActivityFeed) — coordinate feed-noise expectations; streak posts power the admin activity feed (`RecentActivityFeed.tsx:88`).
- **Charts/progress domain:** `WorkoutSession.isMilestone/milestoneType` tags (support :207-212) are chart-annotation gold (PR/milestone markers were a Fable rec in the 2026-07-05 deep audit §charts).
- **Billing/credits:** none of the P0-P2 slices touch session deduction; the XP step must remain post-commit/non-fatal (contract at workoutXpAwardStep.mjs:9-11).
- **AI/Coach:** `clientSelfServiceReadDispatchers` read `Gamification.streakCount` — P0-2 must repoint them to `User.streakDays` or the Coach will speak a stale streak.
- Sequencing: P0-3 (contract) and P0-2 (single economy) before P1-3 (seeding milestones on a clean ledger); P0-1 independent and shippable first; P1-2 after P0-1 (share prompt lives in the celebration).

## 8. Do-Not-Touch (active lanes / hazards)

- **Workout logger UI/flow + exercise-picker consolidation** — active Phase-1 build lane. Only add the response fields + a mountable celebration component; do not restructure `WorkoutLogger.tsx`/`QuickLogMode`.
- **Stripe/storefront checkout internals** (Codex lane) — reward *redemption* pricing/store integration out of scope; P0-3 only fixes level math.
- **`aiWorkoutDailyFormService.mjs` / `workoutXpAwardStep.mjs` / `awardWorkoutXP.mjs` idempotency order** — proven KNOWN-TRUTH plumbing; extend return payloads, never reorder guards (concurrency-safe order documented at awardWorkoutXP.mjs:12-17).
- **`challengeProgressEventService` sourceId history** — its idempotency is per-participation JSON history; don't migrate storage mid-flight.
- **`levelingAlgorithm.mjs` curve constants** — mirrored in `frontend/src/types/gamification.ts` and tests; any change is a two-sided lockstep migration.
- Legacy files to leave in place pending Rule 34 sweep: `gamificationRoutes.mjs`, `gamificationApiRoutes.mjs`, `GamificationEngine.mjs`, `Pages/trainer-gamification/`, `AvatarHomePage.tsx`, dormant RPG components.

*End of domain audit 03.*
