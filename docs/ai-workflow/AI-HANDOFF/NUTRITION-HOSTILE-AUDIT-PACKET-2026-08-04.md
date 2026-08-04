# NUTRITION SYSTEM — HOSTILE AUDIT PACKET (2026-08-04)

Audience: external hostile reviewers (Kimi K3 = system/architecture pass; HY3 = UX/UI pass).
Source of truth: read-only audit of `origin/main` @ `b17e13d90`. All file:line refs verified against that tree.
Privacy: IDs/roles only. No secrets, no PII, no exports.

## 1. CONTEXT

SwanStudios is a production personal-training SaaS (React 18 + styled-components frontend; Node/Express/Sequelize/PostgreSQL backend; Render). Product loop: log workout → progress proof → next best action → shareable milestones. Four dashboards: admin, trainer, client, user. In-app AI = "Swan Coach" (never called "AI" user-facing), with a hard zero-PII-to-LLM privacy proxy (client IDs/aliases only).

Owner directive: the nutrition system must become **enterprise-level** — smarter data intake, deeper Swan Coach integration, richer coach-facing views, beautiful UX that makes people WANT to log, and a fun/light/non-repetitive reminder-notification loop.

Design system: "Enchanted Apex: Crystalline Swan" — dark-first, tokens via `var(--token, #fallback)`, palette anchors: Midnight Sapphire #002060, Royal Depth #003080, Ice Wing #60C0F0 (glow), Arctic Cyan #50A0F0 (charts only), Gilded Fern #C6A84B (gold), Frost White #E0ECF4, Wing Purple #8B5CF6, Obsidian Black #0A0A0F. Dual-Button Glow rule: blue bg → purple glow; purple bg → cyan glow. 44px touch targets. No MUI. Victory charts only.

## 2. VERIFIED CURRENT STATE (condensed)

### 2.1 Frontend surfaces (all proven mounted unless noted)
- **NutritionWorkspace** (254L + 5 support files) — the hub, mounted for all four roles (`/dashboard/{admin|trainer}/meal-planner`, `/dashboard/client/meal-planner`, user tab). 14 tabs: today, log, voice, search, barcode, restaurant, hydration, macros, intelligence, learn, garden, farms, supplements, meal-plan. **9 of 14 tabs are hidden inside a native `<select>` dropdown** (`NutritionWorkspace.tsx:153-170`). 3 tabs subscription-gated (voice, meal-plan, intelligence).
- **NutritionTodayPanel** (280L) — rich: calorie ring, macro grid, hydration bar, insights, diary timeline. Only 2 `@media` blocks in 275 style lines (default landing panel, mobile-first product).
- **Client Hub → Nutrition tab** (`workspaces/clients-team/tabs/NutritionTabContent.tsx`, 228L) — the coach-facing per-client view. **Hard-locked to today only**: `const date = useMemo(() => formatLocalCalendarDate(), [])` (line 86). No date picker, no history, no totals-vs-target, no charts. Shows a flat meal list + a 2-metric provenance card self-captioned "Source and verification status only". The richer NutritionTriageCard (status/fiber/rhythm/average/flags) sits on the *Overview* tab instead.
- **NutritionPlanBuilder** (admin+trainer, 193L) — the ONLY surface that writes nutrition targets. No sidebar entry in any role; reachable only via a "Set targets" button inside the Client Hub tab. Client selection = raw numeric ID text input. Stylesheet: 48 lines, 2 tokens, 0 media queries.
- **Admin-only roster panels** — NutritionRosterTriagePanel (hard-truncates to 4 rows while header claims "N tracked"), EstimateReviewPanel. `clientHubAudience.ts` sets `showRosterOpsPanels: false` for trainer → **trainers have zero roster-level nutrition view**.
- **FoodScannerPage** (741L, public `/food-scanner`) — **zero nav links anywhere in the app**; 51 raw hardcoded colors (worst token discipline in the surface); duplicates the workspace barcode capture.
- **Dormant UI (~1,333 lines)**: FoodTracker/BarcodeScanner (540L), IngredientSafetyPanel (286L), IngredientDetailModal (441L), LogFoodCommandCenter (66L) — a complete ingredient-safety intelligence feature with no reachable consumer.
- Coach bridge shipped: RestaurantTab → `useNutritionCoach.askCoach(food)` → sessionStorage → coach-assistant auto-send.
- Home surfaces: nutrition = one calorie row + one stat tile; the Home nutrition mission silently vanishes on loading/error/gentle-mode (`useHomeNutritionAction.ts:26-32`).

### 2.2 Backend (mounts in `core/routes.mjs`; no global auth/rate-limit — route-level only)
- `/api/macros` (protect): POST `/`, GET `/`, `/summary`, `/weekly` (?userId with assignment check), PATCH/DELETE `/:id` (ownership-scoped), `/drafts` (idempotent draft commit). Reviewer surface (admin/trainer): `/roster-triage`, `/review-queue`, `/client-timeline`, PATCH `/client-timeline/:entryId/verify`.
- `/api/nutrition`: GET `/food-search` (USDA+OFF), GET `/:userId/current` (ensureClientAccess), POST `/:userId` (trainer/admin) — **no PUT/PATCH/DELETE for plans; 14 body fields passed unvalidated into JSONB; `createdBy` never set**.
- `/api/hydration` (protect): self-only; **no trainer/admin read path — hydration invisible to coaches**.
- `/api/food-scanner`: **GET `/scan/:barcode`, `/search`, `/product/:id`, `/ingredient/:id`, `/stats` are UNAUTHENTICATED**; scan performs DB writes (FoodProduct.create + scanCount increment) and outbound third-party calls with **no rate limiter**. `/stats` leaks top-scanned products publicly. Explain router (`/explain-product`, `/explain-ingredient`, `/video-brief`) has **zero auth, zero rate limit** and is mounted ahead of the authenticated router.
- `/api/meal-plans`: `/generate`, `/analyze-photo`, `/parse-voice` (tier-gated pro). **Generated plans are never persisted** (`mealPlanRoutes.mjs:167` just returns JSON).
- Models: DailyMacroLog (rich provenance spread: source, confidence, reviewStatus, reconciliation, serving basis; description encrypted at rest), NutritionSourceRecord (orphaned — not in associations registry, invisible to every API except draft replay), DailyHydration (no associations), ClientNutritionPlan (write-once; allergies/dietaryRestrictions **plaintext** — encryption config names 3 columns of which only `notes` exists), FoodProduct, FoodIngredient (IARC/EU-ban fields, seeded), FoodScanHistory (**migration describes a schema that never existed in production**; model header documents the drift).
- **Two live write paths to daily_macro_logs**: ORM `macroLogService.createMacroEntries` (canonical, transactional) AND raw-SQL `aiDataWriteService.mjs:393` (writes no items, no provenance columns).
- Migration drift: `client_nutrition_plans` + `food_scan_history` source migrations FK to lowercase `users`; a repair migration re-points to `"Users"` but sources were never fixed (fresh migrate-from-zero recreates the bug).
- No idempotency on POST `/api/macros` (mobile retry = double-log). No audit trail on PATCH/DELETE (hard update/delete, no revision history). No rate limit on any nutrition write.

### 2.3 Swan Coach nutrition awareness (substantial — NOT greenfield)
- 6 wired commands: log_meals (trainer, confirm-gated), log_my_nutrition (client), view_nutrition_log, scan_food, view_macro_trends, flag_sodium_intake.
- **Registered but NOT wired**: `create_nutrition_plan` (debate-gated, dead → silent `not_wired`) and `nutrition_advice` (conversational route).
- `view_nutrition_log` is today-only (Zod schema has no date field — documented honest scope).
- Chat context: nutrition block = **last 2 days / 20 rows only**; meal descriptions replaced with 'Meal entry' (privacy-correct). Context Engine loads 21 rows, summarized PII-safe (`summarizeNutritionLogs`: loggedDays, flag counts, 7-macro averages). Dedicated "Macro Intelligence" persona + condition-specific protocols + mandatory disclaimer contract exist in the prompt layer.
- Review-gated proposal lane exists (import_nutrition_log → classifier → care-copy sanitizer → approval forces `verified:false`).
- Debate lane exists for nutrition_plan jobs — **its output is never persisted either**.
- PII posture is strong: de-identifier (Client-{id} aliases), phiScanner, fail-closed prompt privacy, transcript redaction BEFORE LLM, descriptions excluded from all coach reads. Residual: `/analyze-photo` ships raw user photos to Gemini with **no consent gate, no retention policy**; `/generate` sends allowlisted health conditions verbatim to Gemini.

### 2.4 Gamification + notifications (the dead loop)
- **12+ nutrition/hydration achievements are seeded** (log_nutrition_1/7/30/90, nutrition_streak_3/7/30, hydration_streak_3/7/30, gallon_a_day, balanced_week) — **zero evaluators anywhere. Nothing ever awards them.** [VERIFIED by repo-wide grep]
- `PointTransaction.source` ENUM: 15 values, no nutrition. `Streak.streakType` ENUM: no nutrition. `Notification.type` validator: no nutrition.
- Weekly challenge cron already ships a 'Nutrition Check-In' template (log 5 days, 200 XP) and Challenge.category accepts 'nutrition' — but there is **no challengeNutritionLoggingBridge**, so the challenge can never progress. (challengeWorkoutCompletionBridge exists as the template.)
- Proven reminder patterns exist to clone: `staleClientNudgeCron.mjs` (kill switch default-off, consent opt-out, cooldown-by-lookback, pure injectable tick, in-app only), `workoutAchievementEvaluator.mjs` (additive-only, DB-level idempotent, best-effort — "a gamification miss must never fail the user's write"). Idempotency-key pattern on PointTransaction partial unique index.
- Delivery seam: `createNotification()` = DB row + Socket.IO push + bell + toast in one call. SendGrid + Twilio live but automation drip is kill-switched off by default. **No web push exists — do not assume it.**
- Ethical-gamification guardrail modules exist and must clear any food-logging streak design (anti-dark-pattern).
- Schedulers are in-process setInterval on a multi-instance web service — any new job MUST be DB-level idempotent, not process-guarded.

## 3. MY HOSTILE FINDINGS (ranked)

**P0 — security/compliance/truth**
1. Unauthenticated food-scanner endpoints perform DB writes + unbounded outbound API calls with no rate limiting; `/stats` leaks data publicly; unauthenticated explain router mounted ahead of the authenticated one.
2. Meal-photo → Gemini with no consent gate/retention policy; health conditions verbatim to a third-party LLM on `/generate`.
3. Encryption config mis-specifies ClientNutritionPlan columns → allergies + dietary restrictions (PHI-adjacent) stored plaintext, silently.
4. No audit trail on macro edit/delete; any trainer can flip `verified`; no revision history for a coach to prove what a client originally logged.
5. Migration files lie: food_scan_history migration ≠ real schema; two nutrition migrations FK the wrong users table (repair migration papers over it).

**P1 — product-dead paths (the "why it feels thin/dumb" layer)**
6. No nutrition-targets entity that summary endpoints read → `/summary` returns totals with no goal/% → adherence UI defaults to empty state; the only target-writer (Plan Builder) is undiscoverable → the entire adherence feature is effectively OFF for most users.
7. Coach: create_nutrition_plan + nutrition_advice unwired; log reads today-only; chat nutrition memory = 2 days.
8. Generated meal plans (route AND debate lane) are thrown away — no plan → adherence → outcome loop exists.
9. Entire gamification reward loop for nutrition is seeded but inert (no evaluator, no ENUM values, no challenge bridge) — logging a meal earns nothing, ever.
10. No nutrition notification type; no nudge job; coaches get zero push on flags (pull-only review queue).
11. Trainer role has no roster nutrition view; coach-facing client tab is today-only (see 2.1).
12. Dual write paths diverge on provenance columns.
13. No idempotency on the main macro write (mobile double-log).

**P2 — quality/coherence**
14. ~1,333 lines dormant nutrition UI incl. a complete ingredient-safety feature; orphan 741-line public scanner page with 51 hardcoded colors; 4 competing food-search endpoints with different auth+providers; 14 tabs behind a `<select>`; media-query gaps on default panels; hydration invisible to coach; supplement catalog ships FTC affiliate disclosure with 12 empty affiliate URLs; micronutrients absent while supplement gap analysis recommends omega-3/vitamin-D from "no data at all".

## 4. DRAFT ENHANCEMENT PLAN (attack this)

**Phase 0 — Security & truth hardening (prereq, ~1 session)**
Auth or rate-limit the public scanner endpoints (limiter on scan/search; auth on stats; auth the explain router); consent gate + retention note on photo analysis; fix encryption field config + backfill-encrypt allergies/restrictions; correct source migrations (users→"Users", food_scan_history baseline); add idempotency key to POST /api/macros; add macro-edit audit trail (soft-delete + revision row); collapse raw-SQL macro write into macroLogService.

**Phase 1 — Targets & Adherence Spine (the unlock)**
`NutritionTarget` entity (per-client kcal/P/C/F/fiber/sodium-cap, effective-dated, versioned, createdBy) either as new table or hardened ClientNutritionPlan v2 with update/versioning; `/summary` + `/weekly` return target + % + streak; server-side adherence service (loggedDays, currentLogStreak, proteinTargetHitRate, consistencyScore) consumed by dashboards, triage, AND coach context; date-range support on client-timeline (kills today-only).

**Phase 2 — Coach Mind Deepening**
Wire create_nutrition_plan through the debate lane and **persist output to ClientNutritionPlan** (closes the throw-away loop); wire nutrition_advice conversational route; add date to view_nutrition_log schema; widen chat nutrition window 2→14 days; extend `summarizeNutritionLogs` with the adherence-derived fields (flows to every coach surface for free); progressive smart intake — the coach detects missing high-value data (fiber, sodium, hydration, meal timing vs workouts) and asks for it conversationally; meal templates/favorites/repeat-yesterday quick-add to kill re-typing.

**Phase 3 — Reward & Reminder Loop (fun, not naggy)**
Three ENUM migrations (PointTransaction.source, Streak.streakType, Notification.type + nutrition values); `nutritionLogAchievementEvaluator` cloned from workoutAchievementEvaluator, fired best-effort from createMacroEntries with idempotencyKey `macro:{userId}:{date}`; `challengeNutritionLoggingBridge` (makes the already-shipping Nutrition Check-In challenge completable); `nutritionLogNudgeCron` cloned from staleClientNudgeCron (kill switch default-off, `nutritionReminders` consent key, DB-level idempotent, in-app only first, email later behind opt-in); nudge variety engine — rotating light/playful copy pools keyed to context (streak celebration / gentle restart / curiosity hook / recipe tease), hard frequency cap, quiet hours, auto-backoff when ignored, cleared against the ethical-gamification rules.

**Phase 4 — UX/UI Rebuild (design-system gated)**
Client Hub Nutrition tab rebuilt: date navigation + range views, targets-vs-actual, trend chart, adherence card moved here from Overview, inline verify queue; trainer roster triage enabled (audience flag + per-trainer scoping); Plan Builder: ClientSelectorDropdown, sidebar entry, house card/button standard; workspace IA: kill the `<select>`, segmented tab groups (Capture / Insights / Fuel / Explore); resurrect the 727-line ingredient-safety feature as a reachable "Food Quality" surface; integrate or retire the orphan FoodScannerPage + tokenize its 51 colors; mobile media-query pass on TodayPanel/Diary/Supplements; fix roster-triage truncation lie (show-all affordance).

**Phase 5 — Enterprise depth (later)**
Canonical food entity + foodId FK + portion-normalization service; micronutrients; supplement intake logging (closes the gap-analysis loop); CSV/subject-access export + MFP/Cronometer import; wearable joins; RD review tier.

## 5. REVIEWER REMITS

**Kimi K3 (system/architecture hostile pass):** Attack sections 2-4. What is wrong, missing, mis-ordered, or unsafe in the findings and the plan? Specifically: (a) is the Phase ordering right — anything in P0 overrated/underrated, anything that will break production if shipped in this order? (b) attack the NutritionTarget design choice (new entity vs ClientNutritionPlan v2) with concrete failure modes; (c) attack the reminder/reward loop for dark-pattern, spam, and multi-instance idempotency failures; (d) attack the coach integration for prompt-injection, PII, and hallucinated-data risks given the described privacy proxy; (e) name the top 5 things an enterprise nutrition platform (Cronometer/MFP/EatingWell RD tier) has that this plan STILL misses; (f) rank your findings P0/P1/P2 with concrete failure scenarios. Do not restate the packet; add only deltas.

**HY3 (UX/UI hostile pass):** Attack the described UX and propose the redesign direction within the stated design system (dark-first Crystalline Swan tokens, styled-components, Victory charts, 44px targets, reduced-motion support; no generic dashboard slop). Specifically: (a) the coach-facing client Nutrition tab — information architecture for a trainer who has 30 seconds between sessions: what belongs above the fold, exact card/row hierarchy; (b) the 14-tab workspace — propose the segmented IA and mobile navigation model; (c) make-people-WANT-to-log: concrete affordances (quick-add, repeat, streak visuals, celebration moments) with exact component-level specs and empty/loading/error states; (d) the reminder UX: light, fresh, non-repetitive nudge patterns in-app (bell/toast/home-card) with copy examples and frequency choreography; (e) ASCII wireframes for: rebuilt client-hub Nutrition tab (desktop + 414px mobile), rebuilt workspace IA, one delight moment; (f) rank the ugliest current failures and the highest-leverage visual fixes. Builder-exact, phased.
