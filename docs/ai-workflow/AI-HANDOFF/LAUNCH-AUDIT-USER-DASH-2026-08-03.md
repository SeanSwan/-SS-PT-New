---
decision: Lane 1 (member dashboard) is launch-ready on data truth, navigation and its own security surface, after one P0 PII leak and five data-truth defects were fixed; three items are handed to other lanes.
status: shipped
supersedes: none
---

# Launch-Readiness Audit — USER (member) DASHBOARD · Lane 1 of 5

**Date:** 2026-08-03 · **Agent:** VS-Claude (Fable 5) · **Lane:** 1 (User Dashboard)
**Base:** `origin/main@0949eaf6b` in an isolated worktree `c:/tmp/ss-launch-audit-lane1-20260803`, branch `claude/launch-audit-lane1-20260803`.
**5 commits, local only — NOT pushed.** Integrator reconciles all five lanes.

> ⚠ **HEADER NOTICE — C4 exception used.** One **P0 security fix landed in shared backend code** (`backend/controllers/scheduleController.mjs`). It is announced in `.ai-workflow/coordination/launch-audit-conflicts.md`. Admin/trainer output shapes are unchanged; see §3.1 for the blast-radius analysis.

---

## 0. Freshness (Ground Rule 1)

The shared working tree sits on `wip/comms-notifications-2026-07-05`, **1,422 commits behind `origin/main`** (64 ahead). Auditing there would have produced findings that do not exist on main and fixes that never reach production. Every finding below was therefore found, reproduced and fixed against `origin/main@0949eaf6b` in a dedicated worktree. `[VERIFIED]`

---

## 1. Canonical Surface Receipt (Rule 26)

| Element | Evidence |
|---|---|
| Router entry | `frontend/src/main.jsx:73` renders `<App />` → `App.tsx:55` imports `MainRoutes` → `App.tsx:116` `createBrowserRouter([MainRoutes])` → `App.tsx:237` `<RouterProvider>`. `frontend/src/routes/main-routes.tsx` is the **only live route tree**. |
| Mounted routes | `main-routes.tsx:783-802` — `path: 'user-dashboard'` and `'user-dashboard/:tab'`, each rendering `<UserDashboardV3 />` **in JSX** inside `<ProtectedRoute>`. Parent route `path: '/'` at `:335-343`, so absolute paths are `/user-dashboard` and `/user-dashboard/:tab`. |
| Canonical component | `frontend/src/components/UserDashboard/UserDashboard.V3.tsx` (bound at `main-routes.tsx:277-280`). |
| Navigation model | URL-driven single component, **not** nested routes: `UserDashboard.V3.tsx:44` `useParams`, `:46-48` validate against `USER_DASHBOARD_TAB_IDS` else fall back to `home`, `:57-60` `navigate()` on tab change. |
| Role gate | `frontend/src/routes/protected-route.tsx` — **no `requiredRole`/`allowedRoles` passed**, so `:257` role checks never run: the route is **authentication-gated, not role-gated**. Waiver gate at `:131-132,294-297` redirects `client`/`user` with no linked waiver to `/waiver`. |
| Post-login landing | `/user-dashboard` → Home, for role `user` and any unrecognised role. Confirmed across every redirect writer: `EnhancedLoginModal.tsx:98,115-121`, `postPasswordChangeRoute.ts:3-14`, `OptimizedSignupModal.tsx:890-906`, `orientationForm.tsx:582,645`, `adminImpersonationSession.ts:104-107`. |
| Backend reads | See §3. `/api/schedule` mounted `core/routes.mjs:407`; gamification `gamificationV1Routes` double-mounted `:465,467`. |

### Surface Classification (Rule 27)

| Surface | Class | Evidence |
|---|---|---|
| `UserDashboard.V3.tsx` | **canonical** | imported `main-routes.tsx:277-280`, rendered in JSX `:788,798` |
| `components/UserDashboard/index.ts` barrel | dormant | zero non-test bare-dir imports |
| `UserDashboardProfileHeaderV3.tsx` | legacy/orphaned | no prod importer; `UserDashboardDailyLoop.contract.test.ts:519` literally asserts the dashboard does **not** contain it |
| `CommunityTab.tsx` | legacy/orphaned | zero importers outside its own test; `community` excluded from `USER_DASHBOARD_TAB_IDS` |
| `src/assets/user-dashboard/dashboard-export/**` | **dormant — hygiene hazard** | a full stale copy of the dashboard tree (34 `.ts`/`.tsx`) inside `src/`, zero references. Every filename search for `UserDashboard.V3.tsx` double-hits it. |
| `ClientDashboardHome*.tsx` (in `UserDashboard/`) | canonical **but Lane 3's** | consumed by `client-dashboard/ClientHomeTab.tsx:12`, routed at `UniversalDashboardLayout.routes.tsx:215-216`. Physically colocated in `UserDashboard/` — a mis-attribution trap. |
| `routes/index.ts`, `DirectAppRoutes.tsx`, `routes/authentication-routes.tsx` | dead | no importers; declare a competing `/login` that never executes |

---

## 2. Findings

Severity: **P0** = launch blocker, exploitable now · **P1** = ships a falsehood to users or leaks staff PII · **P2** = degraded truth/UX · **P3** = hygiene.

| # | Sev | Area | Finding | file:line | Status |
|---|---|---|---|---|---|
| 1 | **P0** | Security | `/api/schedule` returns **every session on the platform** with `clientEmail` + `clientPhone` to any public signup | `scheduleController.mjs:49-70,102-122` | **FIXED** `f3ac594b8` |
| 2 | **P1** | Security | `/api/sessions/users/trainers` returns trainer **and admin** `email`+`phone` to any authenticated user | `session.service.mjs:2466-2472`, `routes/sessions.mjs:1498` | **HANDED OFF** (C4) |
| 3 | **P1** | Security | `/api/sessions/stats` returns platform-wide counts to role `'user'` | `session.service.mjs:2362-2370` | **HANDED OFF** (C4) |
| 4 | **P1** | Data truth | Weekday streak grid filled by streak **count**, not session dates — a Wed/Thu/Fri streak lit Mon/Tue/Wed | `HomeTabVisionLeftRail.tsx:117` | **FIXED** `a5fa47288` |
| 5 | **P1** | Data truth | Synthetic leaderboard row → gold `#1` for every member, forever | `HomeTabLiveWidgetViewModel.ts:223` | **FIXED** `a5fa47288` |
| 6 | **P1** | Data truth | Gamification outage rendered Level 1 / 0 XP / 0% / 0-day streak — indistinguishable from a new account | `useGamificationData.ts:166-168` + no consumer read `hasError` | **FIXED** `96851d506` |
| 7 | **P2** | Data truth | Failed workout fetch rendered *"No logged workouts yet"* — a claim about a record we did not have | `HomeTab.tsx:104` (`isError` unread) | **FIXED** `96851d506` |
| 8 | **P2** | Data truth | Quick Stats sidebar hardcoded zeros on **every non-Home tab** (5 tiles); same member saw different numbers per tab | `UserDashboard.V3.tsx:167-170` | **FIXED** `96851d506` |
| 9 | **P2** | IA | `groups` in the tab bar (10 items) but absent from the Observatory rail (9) — two navs disagreeing | `ObservatoryShellAdapter.ts:29-39` | **FIXED** `587baa737` |
| 10 | **P2** | Data truth | DST mis-bucketing introduced by my own week builder (found by self-hostile pass) | `HomeTabProofViewModel.ts` | **FIXED** `e06ae9caa` |
| 11 | P3 | Hygiene | `MOCK_CATEGORIES` fabricated exercise counts exported from the live Progress data module | `WorkoutsTabData.ts:35-44` | **FIXED** `e06ae9caa` (deleted, zero importers verified) |
| 12 | **P1** | Data truth | Invented `WEEKLY_GOAL=5` / `225min` targets, fabricated "% ready" score, 4 sparklines plotting one array under "Not available" | `ClientDashboardHome.viewModel.ts:11-12,212-227,215-219` | **HANDED TO LANE 3** |
| 13 | P2 | Security | 4 social routes use `requireUser` (role) not `authorizeResourceAccess` (ownership), unlike their 17 siblings | `gamificationV1Routes.mjs:507,514,521,528` | **BACKLOG** — bounded: attributes allowlisted, no email |
| 14 | P2 | Security | Members with role `'user'` receive their own `private`/`admin_only` trainer notes and `trainer_only` photos (the visibility screen only checks `'client'`) | `clientNoteRoutes.mjs:70-74`, `clientPhotoRoutes.mjs:72-76` | **BACKLOG** — self-scoped only |
| 15 | P2 | Security | No global rate limiter; most member reads unthrottled | `core/app.mjs` (no `express-rate-limit`) | **BACKLOG** — also raised by Lanes 2/3 |
| 16 | P3 | Hygiene | Full stale copy of the dashboard tree under `src/assets/.../dashboard-export/` | — | **BACKLOG** — Rule 34, no blind cleanup |
| 17 | P3 | Hygiene | Stale gallery truth-test fails on pristine main (guard was **strengthened**, test not updated) | `galleryReferralCreditGuardTruth.test.mjs:12` | **HANDED OFF** to gallery owner |

### 2.1 The systemic root cause

Findings 1, 3 and 14 are **one pattern**: `role === 'client'` written where *client-equivalent* was meant. `User.role` **defaults to `'user'`** (`models/User.mjs:125-127`) and public self-registration mints `{'user','client'}` (`authController.mjs:272`) — so the default role for every YouTube signup is `'user'`, and every `role === 'client'` check silently excludes them. Two of the four instances fail **open**.

The codebase already has the correct helper — `isClientEquivalentRole` (`utils/clientAccess.mjs:16`) — and `session.service.mjs:687-694` already handles role `'user'` properly. The broken sites simply never adopted it. **Recommended for the integrator: grep `role === 'client'` backend-wide and audit each hit.**

---

## 3. The P0 in detail

### 3.1 What was wrong

`scheduleController.getScheduleEvents` (route `GET /api/schedule`, `scheduleRoutes.mjs:14`, guard = `protect` only, mounted `core/routes.mjs:407`) branched on `'client' | 'trainer' | 'admin'`:

- **Row scope:** a default-role member matched no branch, so **no ownership predicate was appended**. `whereClause` stayed `sessionDate BETWEEN … AND status IN (…)` — every session on the platform.
- **Projection:** the `selectFields` ternary's final `else` was the **admin** shape, carrying `'clientEmail', c.email` and `'clientPhone', c.phone` (`:114-121`).

**Exploit:** `GET /api/schedule?start=2000-01-01&end=2099-01-01` with any freshly-registered account's JWT → full client roster (name, email, phone) plus the entire business schedule.

### 3.2 Proof it was real, before any fix

`backend/tests/api/scheduleRoutesRoleScoping.test.mjs` captures the SQL the controller builds. Against the **pre-fix** controller: **3 of 6 assertions failed** — role `'user'` produced no `s."userId" = :userId` predicate and a projection containing `c.email` / `c.phone`; an unrecognised role failed open identically. `[VERIFIED]`

### 3.3 The fix

Both halves now fail closed. Client-equivalent roles (`'client'` + `'user'`) pin to their own `userId`, and an unrecognised role falls to that same narrow scope instead of the global one. The **minimal client projection is now the DEFAULT** — only `'admin'` and `'trainer'` opt out — so no future role can inherit contact PII by omission.

### 3.4 Blast radius (why this was safe to land in shared code)

- Admin and trainer output shapes are **byte-identical** to before; asserted by two dedicated tests.
- The **only** frontend consumer of `/api/schedule` is `frontend/src/services/enhancedClientDashboardService.ts:334`, which reads `start` / `end` / `sessionDate` — fields present in **every** projection. `[VERIFIED]` by repo-wide grep.
- `noClientStackLeak.test.mjs`, which guards this same file, still passes.

---

## 4. SHARED-INFRA PROPOSALS (C4 — integrator applies once, centrally)

Lane 1 did **not** edit `backend/services/sessions/session.service.mjs`; it serves the admin master schedule.

**P1 — `getTrainers()` leaks staff contact details** (`session.service.mjs:2466-2472`). Route `sessions.mjs:1498` is `protect` only, while its sibling `/users/clients` (`:1516`) is correctly `trainerOrAdminOnly`. Any registered member receives the owner's email and phone. The three consumers (`BlockedTimeModal.tsx:114`, `RecurringSeriesModal.tsx:111`, `RecurringSessionModal.tsx:111`) are all admin/trainer schedule modals that need names for a dropdown, not contact details.

```js
// session.service.mjs — drop PII from the dropdown query:
attributes: ['id', 'firstName', 'lastName', 'photo', 'specialties', 'bio'],
// AND/OR gate the route to match its sibling:
// routes/sessions.mjs:1498
router.get("/users/trainers", protect, trainerOrAdminOnly, async (req, res) => {
```
Note: verify no admin surface renders trainer email from this endpoint before dropping the attributes; gating the route alone is the lower-risk half.

**P1 — `getScheduleStats()` fails open for role `'user'`** (`session.service.mjs:2362-2370`):
```js
if (user.role === 'client' || user.role === 'user') {   // was: === 'client'
  whereClause = { userId: user.id };
} else if (user.role === 'trainer') {
  whereClause = { trainerId: user.id };
} else if (user.role !== 'admin') {
  whereClause = { userId: user.id };   // fail closed on unknown roles
}
```

---

## 5. What was verified GOOD (no action)

Stated explicitly so the fix list stays honest and short.

- **Auth core:** `protect` pins HS256, enforces `tokenType === 'access'`, re-reads the user, checks `isActive`/`isLocked` (`authMiddleware.mjs:274-430`). `authorizeResourceAccess` / `requireOwnershipOrTrainer` implement a correct self / assigned-trainer / admin ladder. `verifyClientAccessByUserId` returns **404 not 403** to avoid an existence oracle.
- **Correctly scoped member reads:** `/api/notifications/*`, `/api/client/*`, `/api/dashboard/*` all key off `req.user.id`; `/api/analytics/*` carries `requireOwnershipOrTrainer` on all 26 `:userId` routes; `/api/client/analytics/*` injects the id from the JWT.
- **Charts:** **zero Recharts.** `recharts` is not in `package.json` and appears in no import. Every member chart is Victory or hand-rolled SVG/CSS — Rule 10 clean. `[VERIFIED]`
- **Product Core Loop ordering:** Home is the landing view; **Progress is tab #2 — one tap**, and directly URL-addressable. Workout logging is one tap from Home (`HomeTab.tsx:109,320`). Progress is *not* buried under social/profile. `[VERIFIED]`
- **Mobile/responsive:** the tab strip is already a **fixed bottom bar ≤768px** with scroll-snap, hidden scrollbars and `env(safe-area-inset-bottom)`; `Tab` holds **`min-height: 44px` at every breakpoint** including 414px and 320px overrides; `ContentWrapper` — which wraps **both** the Home and Observatory shell paths — pads the bottom by `calc(4.5–4.75rem + safe-area)` so the fixed bar never buries content. Breakpoints exist through 1920/2560/3440/3840. Rules 2 + 24 satisfied by prior work. `[VERIFIED]`
- **Honest states already in place (models for the rest):** `WorkoutsTab` (shimmer + empty + explicit error card with Retry), `WeeklyRingsCard` (*"Rings unavailable right now — your logged workouts are safe."*), the NBA card's `loading|ready|lite|error` machine, `ObservatoryRightRail`'s ChunkLoadError boundary, and the canonical progress grid's 402-means-tier-lock handling.

---

## 6. Verification evidence (Rules 19, 51, 56, 73)

| Gate | Command | Result |
|---|---|---|
| New backend security test | `npx vitest run tests/api/scheduleRoutesRoleScoping.test.mjs` | **6/6 pass** (3 failed pre-fix) |
| Adjacent guard test | `npx vitest run tests/api/noClientStackLeak.test.mjs` | pass |
| Backend API suite | `npx vitest run tests/api` | **2157 passed / 1 failed / 4 skipped (2162)** |
| Frontend dashboard suite | `npx vitest run src/components/UserDashboard` | **337 passed / 337 across 62 files** |
| Types | `NODE_OPTIONS=--max-old-space-size=14336 npx tsc --noEmit` | **exit 0** |
| Build | `npm run build` | **green, 13.54s** |
| Rule 42 backend audit | `git ls-files --others --exclude-standard backend/` + `git diff --name-only HEAD backend/` | both **empty** |
| Secret scan | `scan-secrets.sh` over all 19 changed files | **0 hits, CLEAN** (plus per-commit pre-commit hook) |

### Baseline disclosure (Rule 56)

The frontend and type/build gates above are **repo-wide, not slice-scoped**, and are clean.

The backend suite has **1 pre-existing failure**: `galleryReferralCreditGuardTruth.test.mjs:12`. **Proven not mine:** that test reads only `backend/routes/galleryRoutes.mjs`, and this lane's entire backend diff is `scheduleController.mjs` + its own new test — so the test's inputs are byte-identical to `origin/main`. Root cause: the referral duplicate-guard was **improved** from a read-then-write `findOne` to a DB partial-unique index + `SequelizeUniqueConstraintError` → 409 (`galleryRoutes.mjs:1043,1066-1068`), which is concurrency-safe; the assertion was never updated. **Stale test, stronger code.** Handed to the gallery owner.

`tsc --noEmit` requires a **14GB heap** in this repo; 8GB OOMs. That is a known environment gotcha, not a code defect.

---

## 7. Hostile review (Rules 17, 61, 73)

**Round 1 — self-review of this lane's own commits — found 2 real defects, both fixed in `e06ae9caa`:**
1. **DST mis-bucketing.** My `buildWeekTrainingDays` derived each day's end as `dayStart + 24h`. On a 23- or 25-hour DST day that offset lands inside the neighbouring day — reintroducing, in miniature, the exact wrong-day defect the builder was written to remove. Boundaries are now derived with `setDate` (8 bounds), and a regression test is pinned to the real 2026-11-01 US transition.
2. **Dead fabricated-data export.** `MOCK_CATEGORIES` (invented counts 24, 18, …) exported from the module feeding the live Progress tab. Zero importers verified by my own grep; deleted.

**Round 2 — independent adversarial review** of all five commits (regressions, incomplete fixes, builder edge cases, prop breakage, claim verification). Findings and dispositions are recorded in §7.1.

### 7.1 Dry-loop ledger

Each round had to gather **new** evidence from a vantage not yet tried; re-reading the same code is not a round, and the round that applied fixes became the next round's primary attack surface.

| Round | Vantage (new evidence) | Outcome |
|---|---|---|
| **1** | Self-review of this lane's own commits — attacked the code I had just written | **2 defects found + fixed** (`e06ae9caa`): DST day-boundary mis-bucketing in my new builder; dead `MOCK_CATEGORIES` fabricated-data export |
| **2a** | **Rule 31 backend route-ownership / shadow audit** on the touched path — mount order, not source reading | CLEAN — `/api/schedule` mounts `core/routes.mjs:407`, before the `/api` fallback `:814`; no competing router defines `/schedule`; `/api/schedule-ai` is a distinct segment |
| **2b** | **Impersonation path** — a role-rewriting middleware would invalidate the whole fix | CLEAN — `authMiddleware.mjs:356-372` sets `req.user.role` to the target's *real* role and records impersonation separately in `req.impersonation`; an admin impersonating a client correctly scopes to that client |
| **2c** | **Type coercion** — `req.user.id` is stringified by `toStringId`, my SQL compares to an integer column | CLEAN — identical to the pre-existing client branch, which works in production; no new coercion risk introduced |
| **2d** | **Rules 6 + 2 compliance on the CSS I added** (not the logic) | CLEAN — all 4 added hex values sit inside `var(--token, #fallback)`, zero bare hex, all Crystalline Swan (no retired Galaxy tokens); both new buttons `min-height: 44px` |
| **2e** | **Cross-lane consumer suites** — my leaderboard change is consumed by Lane 3's client dashboard, which the UserDashboard suite never exercises | CLEAN — client-dashboard **277/277 across 54 files**; combined UserDashboard + observatory + gamification hooks **431/431 across 85 files** |
| **2f** | **Different cwd** (repo root vs `frontend/`) | No defect — vitest's `include` is root-relative, so a root-cwd path filter matches nothing. Known harness quirk, not a code issue |
| **3** | **Independent adversarial reviewer** — told to refute the 5 commits | **REVISE — 2 blockers, both real.** I gated the proof card on fetch failure and left the day grid beside it ungated (outage → "no workout logged" ×7); and I introduced a SECOND definition of "this week" next to the existing one. Plus `isToday` built-but-never-rendered, `role="status"` wrapping the Retry button, `refetch` receiving a MouseEvent, and my own test cementing a wrong-identity heuristic. Fixed in `4f3b45664`. **Refuted one finding** (trainer projection "narrowed" — `origin/main` shows it was already the trainer shape). |
| **4** | **Self-attack on round 3's own claim** — "the two windows can never disagree" | **1 fixed** (`5fce87473`). Not true: the proof card used an instant-based sliding window, the grid calendar days, so they disagreed across a ≤24h tail band. Every agreement fixture was mid-window. Both now share `calendarDaysAgo`. |
| **5** | **Component-state rendering** of `HomeTabTrainingProof` (all prior tests hit the builder) | **CLEAN** — 6/6 first run |
| **6** | **Independent adversarial reviewer** on round 4 | **REVISE — 3 fixed** (`936a85a7d`). Confirmed the window fix holds (~9,600 brute-forced timestamps, 0 mismatches), then found the gate `isError && !data` is FALSE for the entire pending window (first paint + in-flight + retry + backoff) — the same lie relocated; that rendering `isToday` turned a latent memo staleness into an on-screen lie across midnight; and that my round-3 test comment was **false about its own fixture** (row and member both 640, so the branch I claimed to avoid was the one firing). |
| **7** | **Independent adversarial reviewer** on round 6, incl. mutation-testing the new tests | **REVISE — 5 blockers + 5 should-ship, fixed in `<this commit>`.** See §7.2. |

---

### 7.2 Round 7 — the gate class was never actually closed

The round-7 reviewer mutation-tested the new tests rather than reading them, and found the fix had been applied to one consumer instead of the class:

- **The identical defect was live five lines above the fix.** `gamificationUnavailable = gamProfile.isError && !gamProfile.data` — verbatim the expression the round-6 commit declared defective — still drove the Level/XP/streak rail, so a member with an in-flight gamification request saw "Level 1 · 0% · 0 XP · 0 days" as fact.
- **`isError` WITH stale data resolved to `ready`.** A failed background refetch keeps the cached list; the UI then presented it as current and, worse, withheld the Retry (which was gated on `unavailable`).
- **A disabled query reported `loading` forever.** `enabled: !!user` goes false on session expiry, leaving a `role="status"` region announcing "Loading your training history…" that could never resolve and offered no way out.
- **The Quick Stats ticker on the same page was ungated**, asserting "This Week 0 / Training Time 0m" — its `trainingProof ? … : []` guard is dead, because `buildHomeTrainingProof` always returns an object.
- **The round-6 commit and the hook header over-claimed.** They said a workout logged after midnight would now light a tile. It would not: the hook re-keys the *day*, not the *data*, and nothing refetches.
- **My unmount test passed against a genuinely leaking timer** — asserting `clearTimeout` was *called* proves a call, not an effect. Proven by mutation.
- **Nothing tested the derivation that was actually broken.** Reverting `HomeTab`'s gate reintroduced the original bug with the whole suite still green, because every gate test hands the prop directly to a presentation component.

**Fixes:** a single shared `resolveDataStatus` now answers "do we know this member's record?" in one place (`ready | stale | loading | unavailable`), consumed by both the sessions and gamification gates — the class is closed rather than the instance. The Quick Stats ticker is gated on it. `HomeTab` refetches on day rollover, which makes the midnight claim true rather than merely asserted. The hook header now states its scope and its known limits instead of over-promising (Rule 75). The unmount test asserts `vi.getTimerCount() === 0` instead of a spy call. A new `HomeTab.gates.contract.test.ts` pins the derivation itself — **mutation-verified: reverting the gate fails 2 of its 6 assertions.** And `dayClock(dayStart)` replaces the inline `Date.now()`, so `dayStart` is a genuine dependency — ESLint no longer emits the 3 `exhaustive-deps` warnings that would have told the next developer to delete the fix.

**Deferred with reason (recorded, not silently dropped):** the hour-of-day threshold in `assessStreakRisk` is still frozen for an open tab (needs its own timer, not a day boundary); `useDayBoundary` has no `visibilitychange` resync, so a throttled or suspended tab lags until its timer fires; `buildLatestPostView`'s relative timestamps freeze at mount; the grid announces "loading" nine times where `aria-busy` plus one status line is the conventional shape; and "No logged workouts yet" is still wrong for a returning member whose last session is >4 weeks old (the proof card branches on a 4-bucket array). **`ClientDashboardHomeTab.tsx` carries the identical ungated defect feeding a numeric performance score — that is Lane 3's file and is handed off, not edited.**

## 8. Backlog, ranked by launch impact

1. **P1 (other lanes)** — the two `session.service.mjs` leaks (§4) and Lane 3's fabricated client-dashboard metrics (finding 12).
2. **P2** — ownership guards on the 4 social routes (13); `'user'`-role visibility screens for notes/photos (14); global rate limiter (15).
3. **P3 (UX, by design — verify only)** — `/user-dashboard/profile` is routable but appears in neither nav list. This is **intentional**, not a defect: `ObservatoryCoverHero.tsx:65-66` documents the Settings action as *"the ONLY entry into the profile panel (N5 contract)"*, and `:174-176` wires it. Worth a launch spot-check that the Settings affordance is discoverable on mobile, nothing more.
4. **P3 (hygiene, Rule 34 — propose only)** — delete the `src/assets/.../dashboard-export/` duplicate tree; remove the three dead router files; retire `CommunityTab.tsx` + `UserDashboardProfileHeaderV3.tsx`; drop the vestigial `isDemoData` flag (`useChallenges.ts`) and the now-unused `currentUserPoints` prop on `useHomeTabLiveWidgets`.
5. **Not verifiable here** — an authenticated two-session live IDOR probe (the gap Kimi named on 2026-07-27 and the single highest-value remaining security check) needs a running backend with two real sessions.

---

## 9. Launch readiness

**LAUNCH-READY: YES for Lane 1's own surface**, with the following named conditions.

- ✅ The member dashboard no longer ships a falsehood: no fabricated rank, no invented training days, no zeros-as-facts, no mock data on a live surface.
- ✅ Navigation is internally consistent; the Product Core Loop (Home → Progress → log) is one tap.
- ✅ The one exploitable-today leak on this surface is closed and regression-tested.
- ⚠ **Blockers owned by others:** the two `session.service.mjs` leaks (§4) are P1 and trivially fixable — they should land before promotion. Lane 3's fabricated client metrics (finding 12) ship a falsehood on a member-facing surface.
- ⚠ **Unproven, not failed:** authenticated lateral IDOR across member-scoped routes has still never been probed at runtime.

---

## 10. Post-task hygiene (Rule 38)

Created: 4 test files + this artifact (all intended, all committed). No temp files, screenshots, or debug output left behind. `git status` in the worktree is **clean**. The worktree itself (`c:/tmp/ss-launch-audit-lane1-20260803`) should be removed by the integrator after the branch is reconciled.

**Next slice:** hand this branch to the integrator for cross-lane reconciliation and a single batch push (Rule 70), and route the §4 shared-infra proposals to whoever owns the session service — those two one-line role fixes are the highest-value remaining work in this class.
