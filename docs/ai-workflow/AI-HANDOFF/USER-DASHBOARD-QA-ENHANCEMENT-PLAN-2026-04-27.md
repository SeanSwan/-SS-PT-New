# SwanStudios User Dashboard — QA + Enhancement Plan

> **Comprehensive top-to-bottom audit of the client/user-facing dashboard.** Synthesizes parallel codebase recon (17 tabs mapped, every interaction classified) and online research (top-10 engagement features ranked by build-cost ratio, anti-patterns to avoid, 2026 premium aesthetic). Includes an executable Playwright test matrix to run against production when the browser lock clears.
> **Date:** 2026-04-27
> **Author:** Claude Opus 4.7
> **Trigger:** Sean's request — "intensive deep comprehensive" user dashboard QA + ideas to spice it up + Playwright pass before tomorrow's Phase 19 implementation slice.
> **Codex status:** unavailable for ~22h. Doc is review-ready for Third Eye when Sean wants.
> **Playwright execution status:** BLOCKED — browser MCP locked by another session at `<HOME>\AppData\Local\ms-playwright\mcp-chrome-4424a21`. Test matrix in §7 is executable when lock clears or via Sean's own browser.

---

## §0 — Executive Summary

| Question | Answer |
|---|---|
| Is the user dashboard **broken**? | No. Core flow works. **One [CRITICAL] live bug** (food intake 500), **one [HIGH] feature stub** (challenge detail modal), **two [HIGH] verification needs** (social endpoints, profile form save), **handful of [MEDIUM] orphan files**. |
| Is it **boring**? | Yes — relative to 2026 premium social-fitness apps. The bones are there (17 tabs, real data flowing, Victory charts, post creation works) but the **engagement signature** is missing: post-session share cards, asymmetric trainer/client views, daily readiness narrative, bounded leaderboards, auto-recap, weekly check-in, streak forgiveness. |
| What's the **highest-leverage** add? | **Auto-generated post-session share card** (Crystalline-styled, screenshot-optimized for IG/YouTube funnel). Reuses already-logged data; one new component + one Victory chart + one share modal. ~2-3 day build. Massive marketing payback. |
| What should ship **next**? | (1) Fix food intake 500 — 1 evening. (2) Phase 19 trainer-coaching-note visibility — 1 day, already scoped in receipt `PHASE-19-TRAINER-VISIBILITY-RECEIPT-2026-04-27.md`. (3) Post-session share card — 2-3 days. Then re-evaluate. |

---

## §1 — Inventory of the User Dashboard

### §1.1 Role mapping

The dashboard normalizes the database `'user'` role to `'client'` at runtime ([UniversalDashboardLayout.tsx:653](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L653)). What Sean colloquially calls the "user dashboard" IS the client dashboard. The 'user' label and 'client' label are the same surface.

### §1.2 The 17 tabs

| # | Tab name | Route | Component | Purpose |
|---|---|---|---|---|
| 1 | Home | `/dashboard/client/overview` | `ClientHomeTab` | Momentum card + Coach dock + Quick actions |
| 2 | My Workouts | `/dashboard/client/workouts` | `ClientMyWorkoutsPage` | Paginated workout history with per-set detail |
| 3 | Log Workout | `/dashboard/client/log-workout` | `WorkoutLogger` | Manual workout entry form |
| 4 | My Progress | `/dashboard/client/progress` | `ClientProgressDashboardPage` | Stats, Victory charts, XP bar, companion pet |
| 5 | Detailed Analytics | `/dashboard/client/progress/detailed` | `ClientProgressWrapper` | 12-chart NASM analytics grid |
| 6 | Swan Coach Privacy | `/dashboard/client/ai-consent` | `AiConsentScreen` | Data consent toggle |
| 7 | Nutrition | `/dashboard/client/meal-planner` | `NutritionWorkspaceLazy` | **Food log** (the broken one), macros, hydration, meal plans |
| 8 | Book Session | `/dashboard/client/schedule` | `UniversalScheduleLazy` | Calendar booking |
| 9 | Community | `/dashboard/client/community` | `ClientCommunityPage` | Social feed, hashtags, challenges, leaderboard |
| 10 | Messages | `/dashboard/client/messages` | `MessagingPageLazy` | Trainer comms |
| 11 | Live Streams | `/dashboard/client/live` | `LiveStreamingPage` | Watch live workouts |
| 12 | Creators | `/dashboard/client/creators` | `CreatorEconomyPage` | Creator economy |
| 13 | Profile | `/dashboard/client/profile` | `ClientProfilePage` | Personal info + chart toggles + notifications |
| 14 | Rewards | `/dashboard/client/rewards` | `ClientRewardsPage` | Points + achievements |
| 15 | Pain Chart | `/dashboard/client/body-map` | `BodyMapPage` | Body pain tracking |
| 16 | My Home | `/dashboard/client/my-home` | `AvatarHomePage` | 3D pet home (unlocks at Lvl 10) |
| 17 | Coach Assistant | `/dashboard/client/coach-assistant` | `SwanCoachAssistantPage` | Swan Coach AI |
| (+) | Virtual Olympics | `/dashboard/client/virtual-olympics` | `VirtualOlympicsPage` | Ghost racing |

Definitions live at [UniversalDashboardLayout.tsx:606-628](frontend/src/components/DashBoard/UniversalDashboardLayout.tsx#L606-L628).

### §1.3 Tab-by-tab interactivity verdict

| Tab | Verdict | Notes |
|---|---|---|
| Home | ✅ WIRED | 4 quick-action buttons, all route to valid targets |
| My Workouts | ✅ WIRED | Pagination, expand/collapse, log-workout CTA all functional |
| Log Workout | ✅ WIRED | Form submits, write path verified |
| Progress | ✅ WIRED | Time filter dropdown, Victory charts, "View Detailed Analytics" CTA |
| Detailed Analytics | ⚠️ VERIFY | `ClientProgressWrapper` import path unclear in excerpt — confirm at impl-slice time |
| Coach Privacy | ✅ WIRED | Toggle |
| **Nutrition / Food Intake** | ❌ **CRITICAL** | Submit returns 500 — see §3 |
| Schedule | ⚠️ NOT-AUDITED | Out of scope for this pass |
| **Community** | ⚠️ **PARTIAL** | Feed + post creation wired; **challenge detail modal stubbed** ([ClientCommunityPage.tsx:42](frontend/src/components/DashBoard/Pages/client-dashboard/ClientCommunityPage.tsx#L42) "Future") |
| Messages | ⚠️ NOT-AUDITED | Out of scope |
| Live Streams | ⚠️ NOT-AUDITED | Out of scope |
| Creators | ⚠️ NOT-AUDITED | Out of scope |
| **Profile** | ⚠️ **VERIFY** | Chart toggles wired; **profile-edit form save handler not visible in excerpt** — verify at QA time |
| Rewards | ⚠️ NOT-AUDITED | Likely read-only; verify |
| Pain Chart | ⚠️ NOT-AUDITED | Out of scope |
| My Home | ⚠️ NOT-AUDITED | Locked behind Lvl 10 — defer |
| Coach Assistant | ✅ WIRED | Phase 9/10 hardened |

---

## §2 — Cross-cutting code-quality findings (recon)

| Rule | Status | Notes |
|---|---|---|
| Rule 1 — No Material-UI in client dashboard | ✅ PASS | Zero `@mui` imports in `/client-dashboard/` |
| Rule 4 — 300-line cap | ✅ PASS | Pages extracted + lazy-loaded |
| Rule 6 — Token-with-fallback colors | ✅ PASS | All `var(--*)` patterns |
| Rule 10 — Victory only (no Recharts/Nivo) | ✅ PASS in client surface | 28 Recharts/Nivo files exist elsewhere (admin/trainer) — out of scope for this audit |
| Orphans | ⚠️ 2 found | `ClientOverviewPage.tsx` (replaced by `ClientHomeTab`); `RevolutionaryClientDashboard.tsx` (legacy, per ACTIVE-INDEX.md:124). Cleanup pending Rule 34 approval. |

---

## §3 — [CRITICAL] Food Intake 500 — Root Cause Analysis

### §3.1 The chain

```
Form: FoodIntakeForm.tsx:613-713
  → POST /api/macros (line 662)
    → backend mount: core/routes.mjs:578 — app.use('/api/macros', dailyMacroRoutes)
      → handler: dailyMacroRoutes.mjs:52-116
        → service: macroLogService.mjs:111-116 — createSingleMacroEntry()
          → DB: DailyMacroLog.create({ ...sanitizedData, userId, source })
```

### §3.2 Frontend payload shape (line 662-679)

```json
{
  "date": "YYYY-MM-DD",
  "mealType": "breakfast|lunch|dinner|snack",
  "description": "Grilled Chicken (1 cup), ...",
  "calories": 450,
  "protein": 50,
  "carbs": 10,
  "fat": 15,
  "items": [{ id, name, portion, calories, protein, carbs, fat, quality }],
  "source": "manual"
}
```

### §3.3 Model NOT-NULL constraints

[DailyMacroLog.mjs:24-198](backend/models/DailyMacroLog.mjs#L24-L198):

| Column | NOT NULL | Defaulted? | Source from frontend |
|---|---|---|---|
| `userId` | yes | NO | from `req.user.id` (auth-attached) |
| `date` | yes | NO | request body |
| `mealType` | yes | YES (`'snack'`) | request body or default |
| `description` | yes | NO | validated in route |
| `items` | NO | YES (`[]`) | request body (safe) |
| `source` | yes | YES (`'manual'`) | normalized in service |

### §3.4 Most likely root cause `[HYPOTHESIS]`

**Auth middleware fails to attach `req.user`, so `userId` arrives as `undefined` to `DailyMacroLog.create()` → NOT-NULL constraint violation → 500.** The error gets logged at [dailyMacroRoutes.mjs:114](backend/routes/dailyMacroRoutes.mjs#L114) but the response message is the generic `"Failed to log food entry"` which Sean is seeing.

**Why this is the prime suspect:** the form submits with the bearer token in the Authorization header (verified at [FoodIntakeForm.tsx:666](frontend/src/components/FoodTracker/FoodIntakeForm.tsx#L666)). If `protect` middleware hasn't been applied to the `dailyMacroRoutes` mount, OR if `req.user` is being read from the wrong path, OR if the JWT decode is failing silently, `req.user.id` is `undefined`.

### §3.5 Lower-probability alternatives

- **Migration `20260310000001` not run on production** — table doesn't exist or column missing.
- **`aiConversationId` type mismatch** — model expects INTEGER ([DailyMacroLog.mjs:173](backend/models/DailyMacroLog.mjs#L173)), some callers send STRING.
- **`source` validator rejects** — model enforces `['manual', 'ai_chat', 'voice', 'barcode', 'usda_lookup']` ([DailyMacroLog.mjs:167-169](backend/models/DailyMacroLog.mjs#L167-L169)). Frontend sends `'manual'`, normalized correctly. `[VERIFIED]` not the cause.

### §3.6 Verification protocol (before fix)

1. Open browser DevTools Network tab on the 500.
2. Capture: response JSON, response status (500 vs 401 vs 403).
3. Capture: response headers (any CORS or auth-related).
4. Render server log on Render → grep for the request ID → find the actual exception (Sequelize error name, column name, validator name).
5. **IF** the error mentions `userId` cannot be null → confirmed §3.4.
6. **IF** the error mentions `relation "daily_macro_logs" does not exist` → migration didn't run.
7. **IF** the error mentions any other column → schema drift; produce drift table.

### §3.7 Fix slice estimate

- **Path A — auth attach gap:** verify `protect` middleware is on the route, fix any stale middleware ordering. ~1 line, ~30 min.
- **Path B — migration miss:** run the migration on production via Render shell. ~5 min.
- **Path C — schema drift:** produce drift table per Phase 18 P1-O sibling-sweep pattern, fix the gap. ~1-2 hours.

This becomes its own slice with a Canonical Surface Receipt before any code change.

---

## §4 — [HIGH] Feature gaps from recon

### §4.1 Community challenge detail modal — STUBBED

[ClientCommunityPage.tsx:42](frontend/src/components/DashBoard/Pages/client-dashboard/ClientCommunityPage.tsx#L42) — comment marks "Future: opens challenge detail modal." Challenge cards render but are not clickable for detail. Users see the challenge but can't view rules, progress, or join.

**Fix scope:** new `ChallengeDetailModal` component + click handler + backend endpoint (`GET /api/social/challenges/:id`) if not already present. ~80-120 lines.

### §4.2 Social endpoint verification needed

`useSocialFeed`, `useSocialChallenges`, `useCreatePost` hooks call `/api/social/*` endpoints. Frontend code references them confidently but recon did not verify the backend routes are mounted. Need:
- `GET /api/social/feed` exists?
- `POST /api/social/posts` exists?
- `GET /api/social/challenges` exists?
- `GET /api/social/leaderboard` exists?

Verification slice: backend route grep + Postman/curl smoke. ~30 min.

### §4.3 Profile form save handler — UNVERIFIED

[ClientProfilePage.tsx](frontend/src/components/DashBoard/Pages/client-dashboard/ClientProfilePage.tsx) shows chart toggles wired but the personal-info edit form's save handler was not visible in the recon excerpt. If the user edits their name / email / phone / goals, does it actually persist?

**Verification:** open the file, find the save handler, confirm it POSTs/PATCHes a real endpoint.

### §4.4 Like / comment / follow — NOT FOUND in recon

The community feed shows posts but the recon did not surface like/comment/follow buttons. Either they're rendered but hidden in the excerpt, OR they're missing entirely. **For a "social media app" feel this is a gap.** Verify; if missing, design + ship.

---

## §5 — Top-10 Enhancement Features (from research)

Ranked by **engagement-per-build-cost ratio**. Implement #1-3 for the biggest visible lift.

| # | Feature | Build effort | Engagement payback | Why now |
|---|---|---|---|---|
| **1** | **Auto-generated post-session share card** (Crystalline-styled, screenshot-optimized for IG/YouTube) | ~2-3 days | HIGH (viral, marketing) | Reuses already-logged data; new component + Victory chart + share modal |
| **2** | **Asymmetric trainer/client session view** | ~1 day | HIGH (already-built data, role-aware rendering) | Phase 19 partially does this; extend to give the client a celebration view of trainer prescription |
| **3** | **Daily readiness card** (Swan Coach references real logged sleep/load) | ~1-2 days | HIGH (sticky daily check-in) | Swan Coach already exists; new prompt + Victory chart |
| **4** | **Trainer-roster-bounded leaderboard** (weekly volume / PRs / attendance, ONLY across that trainer's clients) | ~1 day | MEDIUM-HIGH (no humiliation, real motivation) | One Victory chart + scoped query; ties to retention |
| **5** | **Auto-recap after each logged session** (*"Liz hit 3 PRs, +12% volume vs last week"*) | ~1 day | HIGH (motivational + share-worthy) | Pure backend summarization on existing data |
| **6** | **Weekly client check-in form** (mood / sleep / soreness / effort 1-10) | ~1-2 days | HIGH (drives trainer truth + adherence) | New form + new endpoint + trainer dashboard ingest |
| **7** | **Streak with forgiveness tokens** (1 free skip/week, 2/month) | ~1 day | MEDIUM-HIGH (engagement without panic) | Small state addition to gamification |
| **8** | **Form-check video upload + trainer timestamped comment** | ~3-4 days | HIGH (trainer-loop killer feature) | R2 infrastructure already exists |
| **9** | **Progress photo timeline + side-by-side compare** | ~2-3 days | HIGH (visceral motivation) | Existing measurement surface; add photos column |
| **10** | **Monthly "Crystalline Challenge" themed badge** (e.g. golf-primary March: Drive Power) | ~1-2 days | MEDIUM-HIGH (limited-time scarcity, ties to YouTube cadence) | New badge + monthly content rotation |

**Deferred (high cost or wait-for-50-active-users):** AI form-check on uploaded video, tournament-bracket challenges, live training presence indicator, ephemeral 24h stories.

---

## §6 — Anti-Patterns to AVOID

Hard-no list, in PR review checklist form:

- ❌ **Global leaderboards** for adults trying to get healthy. Bound to trainer-roster only. (Strava-style global ranking humiliates slower users.)
- ❌ **Streak panic** — public red-counter shaming. Use forgiveness tokens.
- ❌ **Toast / push notification spam.** Default cap: 1 push/day, user-tunable.
- ❌ **Generic AI motivational text** (*"You got this!"*). Swan Coach must reference specific logged data; otherwise stay silent.
- ❌ **Over-gamification for adults.** XP bars on everything reads as childish on a luxury brand. Lean cinematic, not arcade.
- ❌ **Paywalls on a user's own data.** History, charts, measurements — all free for the account holder. Paywall premium *additions*, never the user's own logs.

---

## §7 — Playwright QA Test Matrix (executable)

> **Status:** ready to execute. Browser MCP currently locked. When lock clears (close other Playwright instance OR Sean closes/reopens browser), this matrix runs in ~10-15 min for a smoke pass.
> **Auth requirement:** Sean is admin. To test the **user-perspective** dashboard, either (a) generate a SWAN-XXXX claim code for a synthetic test client and claim it, OR (b) use the admin View-As surface (Phase 18 P1-O) to view the dashboard as a real client. Option (a) is more realistic for QA but creates production state. **Recommended:** option (b) for read-only verification; option (a) only for the food-intake write-flow test.

### §7.1 Phase A — Read-only nav smoke (autonomous-safe)

| Step | Action | Pass criteria |
|---|---|---|
| A1 | Navigate to `/dashboard/client/overview` | Page renders, no 4xx/5xx in network, console error count = 0 |
| A2 | Visit each of the 17 tabs in §1.2 | Every tab loads without 500. Capture any 4xx for /api/* calls. |
| A3 | Capture full-page screenshot of each tab | Save to `qa-screenshots-2026-04-27-user-dashboard/` |
| A4 | Visual sweep: Material-UI residuals, hardcoded colors, broken layouts | Flag any issues for cleanup backlog |
| A5 | Network filter: every `/api/*` request | Count 200 vs 4xx vs 5xx; flag every non-200 |
| A6 | Console filter: errors + warnings | Flag every error; categorize warnings |

### §7.2 Phase B — Controlled-fail tests (autonomous-safe — verifies the bugs we already know about)

| Step | Action | Pass criteria |
|---|---|---|
| B1 | Open Nutrition tab → Log Meal | Form renders |
| B2 | Fill: today's date / lunch / "Test meal" / 500 cal / 30 protein / 50 carbs / 15 fat | Form validates client-side |
| B3 | Click Submit | Confirms the 500 |
| B4 | Capture: response status, response body, request body, response time | Should be HTTP 500 with `"Failed to log food entry"` (per our hypothesis) |
| B5 | Open DevTools Application → localStorage | Confirm `token` and `refreshToken` exist (rules out auth missing entirely) |
| B6 | Click Community tab → click any challenge card | Confirms no detail modal opens (per [ClientCommunityPage.tsx:42](frontend/src/components/DashBoard/Pages/client-dashboard/ClientCommunityPage.tsx#L42) stub) |

### §7.3 Phase C — Sean-required (creates real state — defer until cleanup confirmed)

| Step | Action | Auth required | State created |
|---|---|---|---|
| C1 | Submit a real post in Community | yes | New social post (Sean's account) |
| C2 | Edit profile: change phone number | yes | Profile change persists |
| C3 | Send a Message to admin | yes | New message thread |
| C4 | Submit a real measurement | yes | New BodyMeasurement row |
| C5 | Onboard synthetic test client (SWAN-XXXX → claim → log workout → view as client) | yes | Synthetic User row + WorkoutSession + WorkoutLog + Gamification |

**Recommended:** run Phase A + B autonomously when the lock clears; run Phase C only if Sean explicitly authorizes (with cleanup plan: delete synthetic data after).

### §7.4 Test runner script (when lock clears)

```bash
# (1) Confirm browser MCP is free
# (2) From this conversation:
#     - mcp__playwright__browser_navigate to https://sswanstudios.com/login
#     - manually log in as admin (Sean's session) OR paste session cookie
#     - mcp__playwright__browser_snapshot at each tab
#     - mcp__playwright__browser_network_requests to capture every /api/* call
#     - mcp__playwright__browser_console_messages level=error
# (3) Save screenshots to qa-screenshots-2026-04-27-user-dashboard/
# (4) Append findings to this document under §10 — Playwright Run Results
```

---

## §8 — 2026 Premium Aesthetic — Visual Recommendations

Per the research, the Awwwards-tier fitness aesthetic in 2026 reads as **dark editorial first**, deep saturated brand color (Midnight Sapphire ✅ already), one luxury accent metal (Gilded Fern ✅ already), **cinematic photography over illustration**, **editorial serif drama paired with clean geometric sans** (Cormorant Italic + Plus Jakarta ✅ already), **GPU-safe micro-motion**, **generous negative space**.

**SwanStudios' Crystalline Swan palette + typography stack is on-trend.** What's missing is *application*:

| Surface | Today | 2026-trend upgrade |
|---|---|---|
| Workout history rows | Static cards | Add subtle scroll-driven parallax on exercise headers (60-120ms ease, prefers-reduced-motion respect) |
| Stat cards | Solid fills | Add backdrop-blur glass + gold border on hover (Crystalline gold-on-sapphire) |
| Empty states | Plain text + icon | Editorial typography moment — Cormorant italic header + 1-line motivation + CTA |
| Charts | Default Victory styling | Custom Crystalline color tokens + gold gradient on PR lines |
| Workout cards | All identical density | Hero-class first card (recent session) with cinematic photo treatment if available |

The cleanest single upgrade: a **post-session share card** (top-10 #1) gives a chance to ship one premium-aesthetic moment that converts to social marketing.

---

## §9 — Recommended Fix Sequence

If Sean wants a 2-week sprint plan with maximum ROI:

### Sprint A — Plumbing (3-4 days)

1. **[CRITICAL] Food intake 500 fix** — diagnose via §3.6 protocol → pick fix path → ship
2. **[HIGH] Phase 19 trainer coaching note visibility** — already scoped in `PHASE-19-TRAINER-VISIBILITY-RECEIPT-2026-04-27.md`, ~80 lines
3. **[HIGH] Verify social endpoints exist** (§4.2) — backend grep + Postman, ~30 min
4. **[HIGH] Verify profile save handler** (§4.3) — file read, fix if stubbed

### Sprint B — Engagement (5-7 days)

5. **[FEATURE] Top-10 #1 — auto-generated post-session share card** (~2-3 days)
6. **[FEATURE] Top-10 #5 — auto-recap after each session** (~1 day)
7. **[FEATURE] Top-10 #4 — trainer-roster-bounded leaderboard** (~1 day)
8. **[BUG] Top-10 sibling: ChallengeDetailModal** (~1 day)

### Sprint C — Stickiness (5-7 days)

9. **[FEATURE] Top-10 #3 — daily readiness card via Swan Coach** (~1-2 days)
10. **[FEATURE] Top-10 #6 — weekly client check-in form** (~1-2 days)
11. **[FEATURE] Top-10 #7 — streak forgiveness tokens** (~1 day)
12. **[FEATURE] Top-10 #10 — monthly Crystalline Challenge badge cycle** (~1-2 days)

After Sprint A: SwanStudios is professionally usable. After Sprint B: it has a marketing engine. After Sprint C: it has a daily-engagement loop. Sprints D+ extend into form-check video, progress-photo timelines, and bigger features.

---

## §10 — Playwright Run Results (executed 2026-04-28 06:17-06:22 UTC)

**Browser:** Playwright MCP, Sean's admin session (id=2, role=admin), JWT iat=1777357047 / exp=1777367847 (3h lifetime per F-4).
**Coverage:** 17 of 17 client-dashboard tabs navigated. Token decoded; auth confirmed.

### §10.1 Per-tab verdict

| Tab | Route | Console errors | Network errors | Verdict |
|---|---|---|---|---|
| Home | `/dashboard/client/overview` | 2 | 1 | ⚠️ `GET /api/ai/consent/status` returns **400** |
| My Workouts | `/dashboard/client/workouts` | 0 | 0 | ✅ CLEAN |
| Log Workout | `/dashboard/client/log-workout` | 0 | 0 | ✅ CLEAN |
| Progress | `/dashboard/client/progress` | 24 | **12** | ❌ **CRITICAL — all 12 chart endpoints 400** |
| Detailed Analytics | `/dashboard/client/progress/detailed` | **182** | (compounds 12×400) | ❌ **HIGH — Victory SVG NaN flood** when chart data is empty |
| Coach Privacy | `/dashboard/client/ai-consent` | 2 | 1 | ⚠️ Same `/api/ai/consent/status` 400 |
| Nutrition | `/dashboard/client/meal-planner` | 0 (initial) | 0 (initial) | ❌ **CRITICAL — food intake POST 500** (verified §10.2) |
| Schedule | `/dashboard/client/schedule` | 0 | 0 | ✅ CLEAN |
| Community | `/dashboard/client/community` | 0 | 0 | ✅ **All 8 social endpoints 200** — clears §4.2 [HIGH] verification need |
| Messages | `/dashboard/client/messages` | 0 | 0 | ✅ CLEAN |
| Profile | `/dashboard/client/profile` | 0 | 0 | ✅ CLEAN — analytics charts read with userId-in-path correctly |
| Rewards | `/dashboard/client/rewards` | 0 | 0 | ✅ CLEAN |
| Pain Chart | `/dashboard/client/body-map` | 0 | 0 | ✅ CLEAN |
| Live | `/dashboard/client/live` | 0 | 0 | ✅ CLEAN |
| Creators | `/dashboard/client/creators` | 0 | 0 | ✅ CLEAN |
| My Home | `/dashboard/client/my-home` | 0 | 0 | ✅ CLEAN (locked behind Lvl 10) |
| Virtual Olympics | `/dashboard/client/virtual-olympics` | 1 | 1 | ❌ **HIGH — `/api/olympics/events` returns 500** |
| Coach Assistant (client) | `/dashboard/client/coach-assistant` | 0 | 0 | ✅ CLEAN |

### §10.2 Food Intake 500 — full evidence captured

**Triggered:** filled form (`QA Test Food`, `1 cup`, `100 cal`, `20p / 10c / 5f`, breakfast), clicked "Log Food Intake".
**Request:** `POST /api/macros` body shape exactly as recon §3.2 predicted.
**Response:** `HTTP 500` — body `{"success":false,"error":"Failed to log food entry"}` (52 bytes — generic catch-all from [dailyMacroRoutes.mjs:114](backend/routes/dailyMacroRoutes.mjs#L114)).
**Auth verified:** localStorage `token` length 251 present; JWT decodes to `{id: 2, role: "admin"}`; `GET /api/macros/summary?date=...` on the same controller returns 200, **proving auth middleware attaches `req.user` correctly**.
**Conclusion:** the recon's prime hypothesis (auth-attach gap, §3.4) is **disproven**. Auth is fine. The 500 is server-side — likely Sequelize validator failure, missing column on production, or a hook throwing inside `createSingleMacroEntry`. **Render logs needed to root-cause.** This is a 30-60 min slice once the actual exception is captured.

### §10.3 Progress charts 12-fold 400 — root-caused live

**The headline finding of this run, larger than the food-intake bug.**

Frontend hits `/api/client/analytics/chart-*` (12 endpoints). All 12 return `HTTP 400` body `{"success":false,"message":"Invalid userId"}`. Even with `?userId=2` query, still 400.

**Probed alternates:**
- `/api/client/analytics/chart-workout-frequency` → **400 Invalid userId**
- `/api/client/analytics/chart-workout-frequency?userId=2` → **400 Invalid userId**
- `/api/client/analytics/2/chart-workout-frequency` → **404 endpoint not found**
- `/api/analytics/2/chart-workout-frequency` → ✅ **200** with `{"success":true,"data":[]}`

**Root cause:** the frontend's `useClientAnalytics`-class hooks call the wrong endpoint family. The canonical handler lives at `/api/analytics/{userId}/chart-*` (path-positioned userId). The path the frontend uses (`/api/client/analytics/chart-*`) either expects userId in a different position, or is a legacy route that no longer accepts the request. **Empty `data: []` is expected** — admin (id=2) has no workout sessions logged. That's not a bug; that's data state. The bug is the route mismatch.

**Fix scope:** find the frontend hook(s) that build these URLs and correct the path shape (likely 1-2 lines per hook, unified through a base-URL helper). ~30-60 min once the file is found.

### §10.4 Detailed Progress 182× SVG NaN errors

`/dashboard/client/progress/detailed` floods console with errors of shape:
```
<tspan> attribute x: Expected length, "NaN".
<text> attribute x: Expected length, "NaN".
<line> attribute x1: Expected length, "NaN".
<line> attribute x2: Expected length, "NaN".
```

**Root cause hypothesis `[LIKELY]`:** Victory chart components compute axis ticks from data extents. When data is empty (because the §10.3 endpoint 400'd OR because admin has no sessions), `min(data) / max(data)` produce `NaN`, and Victory passes those `NaN`s into SVG coordinate attributes. **Even after §10.3 is fixed**, this remains a real bug for any client whose history is genuinely empty (new users on day 1).

**Fix:** wrap each chart in an empty-state guard — `if (data.length === 0) return <EmptyChartState />`. Or pass safe-default domain bounds when data is empty. ~1-2 hours across the chart grid.

### §10.5 `/api/ai/consent/status` 400 — reproducible on two tabs

Reproduces on `/dashboard/client/overview` AND `/dashboard/client/ai-consent`. Server returns 400 — likely missing query param or scope mismatch (similar pattern to chart endpoints). Not blocking core flow but pollutes console and breaks the consent-status banner state.

**Fix scope:** ~15-30 min once the controller validator is read.

### §10.6 Virtual Olympics 500

`GET /api/olympics/events` returns `HTTP 500` with `{"success":false,"error":"Failed to load events"}` (generic catch-all, no useful body). Same pattern as food intake. Render log needed.

### §10.7 Surfaces verified clean

These tabs had **zero console errors and zero network 4xx/5xx**: Workouts, Log Workout, Schedule, Community, Messages, Profile, Rewards, Pain Chart, Live, Creators, My Home, Coach Assistant. **12 of 17 tabs are clean.**

### §10.8 Updated bug priority (after live evidence)

| Priority | Finding | Source | Estimated fix |
|---|---|---|---|
| **[CRITICAL]** | All 12 progress charts 400 — frontend hits wrong endpoint family | §10.3 | ~30-60 min |
| **[CRITICAL]** | Food intake POST 500 | §10.2 (and §3) | ~30-60 min once Render log captured |
| **[HIGH]** | Detailed Progress 182× SVG NaN flood when data empty | §10.4 | ~1-2 hrs across chart grid |
| **[HIGH]** | `/api/ai/consent/status` 400 | §10.5 | ~15-30 min |
| **[HIGH]** | Virtual Olympics events 500 | §10.6 | ~30-60 min once Render log captured |
| **[HIGH]** | Community challenge detail modal stubbed (recon, not Playwright-confirmed but visible in code) | recon §4.1 | ~80-120 lines |
| **[MEDIUM]** | Profile-edit form save handler — verify wired | recon §4.3 | 5 min file read |
| **[CLEARED]** | Social endpoints exist | §10 Community row | none — all 200 |

### §10.9 Updated fix sequence (replaces §9)

**Sprint A — Critical Plumbing (3-5 days):**
1. **Progress chart endpoint fix** — find frontend `useClientAnalytics` hook, correct URL shape from `/api/client/analytics/chart-*` to `/api/analytics/:userId/chart-*`. ~30-60 min + Canonical Surface Receipt + tests.
2. **Detailed Progress empty-state guard** — wrap charts in `data.length === 0 → <EmptyChartState/>`. ~1-2 hrs.
3. **Food intake 500 fix** — capture Render log → identify Sequelize/validator/missing-column → fix. ~30-60 min once log captured.
4. **AI consent status 400 fix** — read controller validator → fix call site. ~15-30 min.
5. **Olympics events 500 fix** — capture Render log → fix. ~30-60 min.
6. **Phase 19 trainer-coaching-note visibility** — already scoped in `PHASE-19-TRAINER-VISIBILITY-RECEIPT-2026-04-27.md`. ~80 lines.

After Sprint A: every tab loads cleanly, every chart renders, every form saves. The user dashboard is **production-grade usable.**

**Sprint B — Engagement (5-7 days):** unchanged from §9 — share card, asymmetric trainer/client view, daily readiness, bounded leaderboard, auto-recap, challenge modal.

**Sprint C — Stickiness (5-7 days):** unchanged from §9 — daily check-in, streak forgiveness, monthly badge cycle.

---

## §11 — Out-of-Scope (explicit)

- **Trainer dashboard QA** — separate audit. Trainer surfaces (`MyClientsView`, etc.) need their own pass.
- **Admin dashboard QA** — separate audit. Admin already has Phase 18 P1-O coverage.
- **Charts/KPI truthfulness audit** — separate phase already on the priorities stack.
- **Stripe / cart 404** — paused.
- **Codex review of this doc** — Codex unavailable for ~22h; eligible for hostile-reviewer practice gate now.
- **Phase 19 implementation** — receipt approved at `8cf195797`; implementation slice opens tomorrow with swan-design-router consult first.

---

## §12 — Sign-off

**Hold at unstaged (or commit per Sean's call).** This doc is the load-bearing artifact for the next 1-2 weeks of user-dashboard work. It synthesizes both recons, names every known gap with file:line, ranks 10 enhancement features by build-cost ratio, codifies anti-patterns to avoid, and ships an executable Playwright test matrix.

**Recommended commit message** if Sean wants this on disk: `docs(user-dashboard): comprehensive QA + enhancement plan + Playwright test matrix`.

**Next concrete actions** (in order):
1. Sean reviews this doc.
2. Either (a) Sean closes whatever's holding the Playwright browser lock so I can run §7.1 + §7.2 autonomously, OR (b) Sean runs §7 manually using DevTools.
3. Pick the fix sequence (§9) that fits this week's bandwidth.
4. Tomorrow: open Phase 19 implementation slice with the receipt as evidence base + swan-design-router consult.
