# 06 — Next-Best-Action Engine: Keystone Algorithms Audit + Extension Spec

> 7-star upgrade audit · Domain: Next-Best-Action (NBA) engine · Baseline: origin/main @ 87680741e (2026-07-06)
> Audience: future AI builders with zero context. Every claim carries file:line + [VERIFIED]/[LIKELY]/[HYPOTHESIS].
> Verdict up front: **the engine EXISTS and is good — deterministic, null-honest, tested. EXTEND it; never rebuild.**
> It reaches 2 of the 4 role surfaces it should power, ignores 6 available signal classes, and its "Log a workout"
> CTA lands one click short of the logger.

---

## 1. Canonical Surface Receipt

### 1.1 The engine (backend)
- **Service:** `backend/services/nextBestActionService.mjs` (192 lines, created 2026-07-02, Slice 8.2). [VERIFIED]
  - `computeNextBestAction(pulse, {now, audience})` — pure decision core, injectable clock (`:53-147`).
  - `coachify(action, pulse)` — coach-voice transform, same ranking, CTA stripped (`:154-183`).
  - `getNextBestAction(sequelize, userId, opts)` — DB entry point: pulse + decision + pulse echo (`:186-189`).
- **Input engine:** `backend/services/progressPulseService.mjs` (213 lines). 4 parallel raw SQLs against the canonical
  snake_case backbone `workout_sessions` + `workout_logs` (`:130-165`, orchestrated `:168-210`). Pure helpers
  `computeWeeklyStreak` (`:44`), `computePushPull` (`:92`), `computeVariety` (`:109`). [VERIFIED]

### 1.2 Routes (both live)
- **Coach route:** `GET /api/analytics/:userId/next-best-action` → `backend/routes/analyticsRoutes.mjs:164`
  with `requireTier('pro','charts.full')` + `requireOwnershipOrTrainer`; mounted `backend/core/routes.mjs:410`
  (`app.use('/api/analytics', analyticsRoutes)`). Handler `progressPulseController.mjs:79-95` calls the service with
  `{audience:'coach'}` (`:85`). [VERIFIED]
- **Client route (embedded):** `GET /api/client/analytics/progress-pulse` → `backend/routes/clientAnalyticsRoutes.mjs:159`
  gated by `requireFeature('analytics.advanced')` (`:61`); mounted `backend/core/routes.mjs:411`. Handler
  `progressPulseController.mjs:28-51` embeds `nextBestAction` into the pulse payload in ONE round trip (`:38-39`);
  userId is JWT-derived with a rule-55 param-reset fallback (`:30`). [VERIFIED]
- **Ownership gate semantics:** `backend/middleware/authMiddleware.mjs:840-858` — admin always; owner by string-equal id;
  trainer via assignment check. [VERIFIED]

### 1.3 Mounted consumers (JSX in the routed tree — the two known-truth consumers, both confirmed)
- **Consumer 1 (client "Coach Compass"):** `frontend/src/hooks/analytics/useProgressPulse.ts:82` fetches the pulse →
  `ProgressPulsePanel.tsx:71-125` renders primary title/message/CTA + secondary chips → mounted at
  `ClientProgressDashboardPage.tsx:188` behind `hasGuardianAccess` (`:62-63`) → routed at
  `UniversalDashboardLayout.routes.tsx:185` (client `/dashboard/client/progress`). [VERIFIED]
- **Consumer 2 (coach card):** `ClientNextBestActionCard.tsx:107` fetches `/api/analytics/${clientId}/next-best-action` →
  mounted at `admin-client-progress-view.V2.tsx:634` → exported `DashBoard/index.ts:22` → routed at
  `UniversalDashboardLayout.routes.tsx:105` (**admin-only** `/dashboard/admin/client-progress-tracking`). [VERIFIED]

---

## 2. Current-State Map

| Surface | File:line | Class | Notes |
|---|---|---|---|
| `nextBestActionService.mjs` | `backend/services/…:53` | **canonical** | The engine. 8-rung ladder, unit-tested |
| `progressPulseService.mjs` | `backend/services/…:168` | **canonical** | Sole signal source today |
| `progressPulseController.mjs` | `backend/controllers/…:28,79` | **canonical** | Client-embedded + coach handlers |
| `analyticsRoutes.mjs:164` / `clientAnalyticsRoutes.mjs:159` | routes | **canonical** | Both mounted (`core/routes.mjs:410-411`) |
| `ProgressPulsePanel.tsx` (client Coach Compass) | mounted `ClientProgressDashboardPage.tsx:188` | **canonical** | Guardian-gated, self-hides on error |
| `ClientNextBestActionCard.tsx` (coach card) | mounted `admin-client-progress-view.V2.tsx:634` | **canonical** | Admin route only — trainers never see it (§3.4) |
| `HomeTabNextBestAction.tsx` (user home right rail) | mounted `HomeTabVisionRightRail.tsx:126` | **competing** | Titled "Next Best Action" but NOT wired to the engine — local streak-rescue only (`HomeTabProofViewModel.ts:104-123`, 3pm escalation const `:19`); otherwise static copy "Log today's training" (`HomeTabNextBestAction.tsx:58`) [VERIFIED] |
| `ClientDailyActionStrip.tsx` (Client Hub Today mode) | `workspaces/clients-team/…:20-30` | **competing** | Static action buttons (Log/Plan/Progress/AI) + session signal; no engine call [VERIFIED] |
| `briefClientDispatcher.mjs` `buildFlags` | `backend/services/ai/dispatchers/…:24-49` | **competing** | Parallel "attention flags" heuristic (staleness, active pain, low credits, no bookings) — RICHER signals than the engine, different lane (Coach chat brief) [VERIFIED] |
| `Pages/client-progress/ClientProgressDashboard.tsx` | wraps AdminClientProgressView `:106` | **dormant** | Zero imports found repo-wide [VERIFIED by grep absence] |
| Trainer `/client-progress` (`EnhancedClientProgressView`) | `routes.tsx:155` → `TrainerDashboard/ClientProgress` | canonical route, **no NBA** | No NextBestAction match anywhere under `TrainerDashboard/` [VERIFIED by grep absence] |

**Output contract today** (`nextBestActionService.mjs:41-43,139`): `{ primary, secondary[≤2] }`, each
`{ code, priority:1-8, title, message, cta:{label,href}|null }`; coach audience strips `cta` (`:182`). Codes:
`log_first_workout(1) · return_after_gap(2) · streak_at_risk(3) · balance_pull/push(4) · add_variety(5) ·
volume_drop(6) · celebrate_streak(7) · keep_momentum(8)` — first-match-wins by priority sort (`:138`).

**Current inputs** (all from the pulse, `progressPulseService.mjs`): week-based streak (target 2 days/week, const `:31`),
push/pull 30d volume ratio (bands >1.25 / <0.8, `:104`), variety score (6 patterns ×60 + 12 exercises ×40, `:119-122`),
week-over-week volume delta (`:150-159`), last-workout recency (`:161-165`). [VERIFIED]

---

## 3. Data-Truth Check

1. **All signals are real** — every rung derives from `workout_sessions`/`workout_logs` rows; null-honest (no history →
   `score:null`, `ratio:null`, never fake zeros). `progressPulseService.mjs:10-15,100,112`. No mock data anywhere in this
   lane. [VERIFIED]
2. **CTA misroute (one wasted click):** `LOG_HREF = '/dashboard/client/workouts'` (`nextBestActionService.mjs:45`) is the
   **My Workouts history page** (`routes.tsx:183`); the logger is `/dashboard/client/log-workout` (`routes.tsx:184`).
   Five of eight rungs CTA to history instead of the logger. [VERIFIED]
3. **Activation rung is paywalled:** rung 1 `log_first_workout` — the exact 7-day-activation nudge the strategy demands —
   is only served behind `analytics.advanced` (client route `clientAnalyticsRoutes.mjs:159,61`) and `requireTier('pro')`
   (coach route `analyticsRoutes.mjs:164`). A free Starter user in their first week never sees the engine; they get only
   the static `FirstWorkoutCta` fallback (`ClientProgressDashboardPage.tsx:192`). [VERIFIED]
4. **Trainer parity gap:** backend authorizes trainers (`requireOwnershipOrTrainer`), but no trainer-routed component
   renders the coach card — admin route only (`routes.tsx:105` vs trainer routes `:150-175`). Backend capability shipped;
   frontend never exposed it. [VERIFIED]
5. **weekTarget is global, not plan-aware:** `WEEK_TARGET_DAYS = 2` (`progressPulseService.mjs:31`) — a 4×/week client
   "qualifies" at 2 days; streak_at_risk under-fires for them. Plan adherence is not an input. [VERIFIED]
6. **Minor drift:** `coachify` hardcodes fallback `patternsTotal ?? 6` (`nextBestActionService.mjs:173`) instead of
   `NAMED_MOVEMENT_PATTERNS.length`; harmless while 6, breaks silently if patterns change. [VERIFIED]
7. **Deep-audit reconciliation:** `FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md:120-123` (§H) calls NBA "the real GAP…
   nothing composes them." Partially outdated: this behavioral-nudge engine shipped 2026-07-02 and composes pulse signals.
   The part that remains TRUE: no "do this specific workout next" prescription (no plan cursor, no pain constraints, no
   exercise-level output), and no shared 4-dashboard card (§J `:135-138`). This doc specs that extension. [VERIFIED]

---

## 4. Vision Gap Analysis (7-star vs today)

**7-star NBA** = every role opens their dashboard and the FIRST thing they see answers the north-star question with real
data: trainee → "here is your one next action (and it respects your pain chart, plan, and streak)"; trainer → "these 3
clients need you today, in order, with the reason"; admin → "these are the exceptions across the org — stale, unpaid,
hurting, celebrating." Today:

| Dimension | Today | 7-star |
|---|---|---|
| User home hero | Static panel, engine unwired (`HomeTabNextBestAction.tsx`) | Engine-driven hero card, streak-rescue merged in |
| Client progress page | ✅ Coach Compass (best surface today) | + pain/plan/booking awareness |
| Trainer queue | ❌ nothing (per-client card is admin-only) | Ranked client action queue, one tap to act |
| Admin exceptions | ❌ nothing (RevolutionaryAdminDashboard has no NBA) | Org-wide exceptions list, celebration + risk |
| Signals | 5 (all workout-log derived) | +6: pain constraints, plan adherence, session credits, booking gap, measurement staleness, challenge/bootcamp freshness |
| Free users | Locked out of rung 1 activation | Activation rungs (1-3) free; analysis rungs stay premium |
| CTA | Lands on history page | Deep-links to logger / booking / share composer |
| Shareability | celebrate_streak says "worth sharing", no share affordance | CTA opens share composer with the real milestone |

The engine's architecture (pure core + injectable clock + priority ladder + audience voice) is exactly right for the
extension — the gaps are wiring, signal breadth, and role reach, not design. [VERIFIED]

---

## 5. Ranked Upgrades

**P0-A — Wire the user home hero to the engine** (S)
What: `HomeTabNextBestAction` consumes the engine (via `useProgressPulse` or a lighter `/next-best-action` self route),
keeping the local 3pm streak-rescue escalation as a client-side urgency overlay.
Why: Home is first (Core Loop); today's hero is static copy — the smartest signal in the app never reaches the most-seen surface.
Acceptance: home hero shows engine `primary.title/message`; streak-rescue still escalates gold after 15:00 local with
unlogged day; self-hides on error; test asserts engine-code render. Clicks: next action visible 2 taps (Home→Progress) → **0** (on Home).
**P0-B — Fix LOG_HREF to the logger** (S)
What: `nextBestActionService.mjs:45` → `/dashboard/client/log-workout` (keep history link for review-type rungs).
Why: every log-type CTA currently costs one extra click at the exact moment of intent. Clicks: 2 → **1**.
Acceptance: unit test locks `cta.href` per rung; QA taps CTA and lands in the logger.

**P1-A — Trainer action queue** (M)
What: new `GET /api/analytics/coach/action-queue` — batch-compute NBA for the trainer's assigned clients, rank by urgency
(§6.3), render a queue panel in `TrainerClientsWorkspace` and the trainer `/overview`; row tap → that client's Hub.
Why: trainer north star = "which client needs me"; backend already authorizes trainers, frontend shows them nothing.
Acceptance: queue lists ≤10 clients, most urgent first, each with coach-voiced primary + one-tap open; p95 < 400ms at 50
clients; access-guard contract test (mirror `sessionDeductionRoutesAccessGuard.test.mjs` pattern). Clicks: today (open
each client one-by-one: N×3 taps) → **1 glance + 1 tap**.
**P1-B — New signals: pain, credits, booking gap** (M)
What: extend the signal bundle per §6.2 with `ClientPainEntry` active entries (model `backend/models/ClientPainEntry.mjs:20-80`,
route mounted `core/routes.mjs:368`), `User.availableSessions` (`User.mjs:176-179`), upcoming-session count (pattern:
`coachContextEngine.mjs:113,206,210` already reads all three — reuse its queries, not its LLM lane).
Why: `briefClientDispatcher.buildFlags` (`:24-49`) already proves these flags matter; they live only in the chat lane today.
Acceptance: new rungs fire per §6.1 ladder; pain rung copy reuses the FDA-style disclaimer precedent verbatim class
(`PainChartInsightPanel.tsx:121-125`); coach voice includes credits/booking flags.
**P1-C — Free-tier activation rungs** (S)
What: serve rungs 1-3 (log_first, return_after_gap, streak_at_risk) without the premium gate — a `scope=activation`
variant on the client route; rungs 4-8 stay Guardian.
Why: strategy mandates first-workout + progress proof inside 7 days; the paywall currently blocks the activation nudge itself.
Acceptance: Starter user sees rung 1-3 card on `/progress` (and Home after P0-A); premium rungs still 403 for Starter direct API calls.

**P2-A — Admin exceptions list** (M): same queue endpoint org-wide (`scope=org`, admin-only), grouped
{intervene | at-risk | celebrate}; lands on the admin overview. Serves proof-of-value visibility. Acceptance: stale/pain/
low-credit clients surface without hunting; celebrate group feeds share/shout-out. Clicks: unknown-today → 1 glance.
**P2-B — Milestone share CTA** (S): `celebrate_streak` (and future PR rung) CTA opens the existing share composer with the
real streak fact (streak data already in payload). Core Loop's final leg. Clicks: manual compose (~5 taps) → **2**.
**P2-C — Plan-adherence rung + per-client weekTarget** (M): read active plan via the
`GET /api/workouts/:userId/current` lane (`clientWorkoutRoutes.mjs:58-109`; `selectCurrentWorkoutPlan` + assignment
completion context) → `plan_behind`/`plan_today` rungs; derive `weekTarget` from plan days/week when a plan exists.
**P3 — Measurement staleness + bootcamp/challenge freshness rungs** (S-M): reuse `measurementScheduleService.getCheckStatus`
(`:21-50`, green/yellow/red) → `measurements_due` rung (coach voice); challenge progress via
`GET /users/:userId/challenges` (`gamificationV1Routes.mjs:240`) → `challenge_closing` rung; bootcamp taught-log freshness
(`bootcampRoutes.mjs:9`, POST `/api/bootcamp/log`) as a trainer-queue-only signal.

---

## 6. Algorithm Specs (EXTEND — do not rebuild)

### 6.1 Extended priority ladder (deterministic; first-match primary, next 2 = secondary)
Insert new rungs into the existing 1-8 ladder; existing codes keep their relative order (regression safety):

```
 1 log_first_workout        (existing)
 2 return_after_gap         (existing)
 3 pain_review_needed       NEW — active entry painLevel>=7 OR red-flag type (numbness/tingling/burning)
                            → coach voice: "flag for check-in"; client voice: comfort-mod line + disclaimer. NEVER blocks logging.
 4 streak_at_risk           (existing 3)
 5 plan_behind / plan_today NEW (P2-C) — active plan, today's assignment uncompleted / week behind plan cadence
 6 session_credits_low      NEW — availableSessions <= 2 AND recent activity (coach+admin voices; client voice = gentle
                            "book/renew" only if org policy allows client-visible billing nudges — default coach-only)
 7 booking_gap              NEW — upcomingCount === 0 AND has history (client: "book your next session"; coach: flag)
 8 balance_pull/push        (existing 4)
 9 add_variety              (existing 5)
10 volume_drop              (existing 6)
11 measurements_due         NEW (P3) — getCheckStatus red (coach/admin voices only by default)
12 challenge_closing        NEW (P3) — enrolled challenge ends <=3d with progress < target
13 celebrate_streak         (existing 7)
14 keep_momentum            (existing 8)
```

### 6.2 Signal bundle + fail-soft adapters
```
async function collectSignals(sequelize, userId, { include }) {
  // Each provider: independent, try/catch, returns null on failure (engine
  // degrades to today's pulse-only behavior — NEVER 500s the whole decision).
  const [pulse, pain, credits, booking, plan, measurements, challenges] =
    await Promise.all([
      getProgressPulse(sequelize, userId),                  // existing, keep
      include.pain ? getActivePainSummary(userId) : null,   // ClientPainEntry: {maxLevel, redFlag, regions[]}
      include.credits ? getSessionCredits(userId) : null,   // User.availableSessions (int|null)
      include.booking ? getUpcomingSessionCount(userId) : null,
      include.plan ? getPlanCursor(userId) : null,          // {hasPlan, daysPerWeek, todayAssigned, todayCompleted, weekCompletionPct}
      include.measurements ? getMeasurementStatus(userId) : null, // getCheckStatus → 'green'|'yellow'|'red'
      include.challenges ? getChallengeCloseouts(userId) : null,
    ].map(p => Promise.resolve(p).catch(() => null)));
  return { pulse, pain, credits, booking, plan, measurements, challenges };
}
```
Port the pain constraint logic server-side from `painChartInsights.ts` (`buildWorkoutConstraints`, `:47,197,297`) — it is
frontend-only today; reuse its `DEFAULT_MOVEMENT_RULES` table and riskBand thresholds so client and server agree.

### 6.3 Scoring, per-role output, constraint decoration
```
function computeNextBestActionV2(signals, { now, audience = 'client', role = 'client' }) {
  const candidates = buildCandidates(signals, now);      // §6.1 ladder, each {code, priority, title, message, cta}
  candidates.sort((a, b) => a.priority - b.priority);    // deterministic — priority IS the score (no ML, no LLM)

  // Constraint decoration (never re-ranks): if pain.riskBand in {moderate,review},
  // annotate any training-suggesting rung (streak/plan/balance/variety/momentum)
  // with constraints + the fixed disclaimer string.
  if (signals.pain?.riskBand !== 'clear' && signals.pain) decorateWithPainConstraints(candidates, signals.pain);

  let ranked = { primary: candidates[0], secondary: candidates.slice(1, 3) };
  if (audience === 'coach') ranked = mapVoices(ranked, coachify);   // existing transform, extended copy table
  return ranked;
}

// Trainer queue / admin exceptions: urgencyScore ranks CLIENTS, not rungs.
// urgencyScore(client) = (15 - primary.priority) * 10
//   + (pain.redFlag ? 25 : 0) + (daysAgo >= 14 ? 15 : 0) + (credits !== null && credits <= 0 ? 10 : 0)
// Deterministic, explainable: the queue row always shows WHICH facts produced the score.
```
Batching: queue endpoints must NOT loop `getProgressPulse` per client (4 SQLs × N). Add `WHERE ws."userId" = ANY(:ids)
GROUP BY ws."userId"` batch variants of the four pulse SQLs (`progressPulseService.mjs:130-165`) — same math helpers, one
pass. [HYPOTHESIS on exact SQL shape; helpers are already pure so this is mechanical]

### 6.4 Caching / performance
- Per-user decision: compute-on-read stays fine (4 indexed aggregates). Add 10-min in-process TTL cache keyed
  `userId:role`, **busted on workout write** — hook the existing unified write path's XP step
  (`workoutXpAwardStep.mjs`, known-truth #2) or `eventBus.mjs` emit, so a just-logged workout updates the card immediately.
- Queue: 5-min TTL; recompute on demand with `?fresh=1` for the trainer pull-to-refresh.
- Budget: single-user p95 < 150ms; 50-client queue p95 < 400ms (batch SQL, no N+1).

### 6.5 Test strategy
- Extend `backend/tests/unit/nextBestActionService.test.mjs` (`:36+` pattern: fixture pulse + injectable clock) — one
  test per new rung, one per precedence boundary (pain vs gap; plan vs streak), one per null-signal degradation
  (provider returns null → identical to today's output).
- Copy lint test: assert no forbidden terms (yoga/meditation — rule 9), no guilt language, disclaimer present on every
  pain-decorated payload.
- Route contract tests: queue endpoint 403s non-trainers/non-assigned (mirror `painEntryRoutesAccessGuard.test.mjs`);
  activation-scope route serves rungs 1-3 to Starter and 403s rungs 4+.
- Frontend: hero-wiring test (engine code renders on Home), CTA-href lock, queue-order render test.

### 6.6 Guardrails (non-negotiable)
- **Rule-based only.** No LLM anywhere in ranking, scoring, or copy generation — the service header codifies this
  (`nextBestActionService.mjs:10-12`). LLM lane (Swan Coach chat, `briefClientDispatcher`) may CONSUME the engine's
  output as context; it never produces it.
- **Zero medical advice.** Pain rung copy = fixed clinical-ruleset strings + the exact disclaimer precedent:
  "comfort modifications for training only — not medical advice, diagnosis, or treatment…" (`PainChartInsightPanel.tsx:121-125`).
  Red-flag pain types route to "check in with your trainer," never self-treatment guidance.
- **Zero PII.** Engine is server-side, IDs only; payloads carry no names (coach card receives `clientId` prop only,
  `ClientNextBestActionCard.tsx:94`). Keep it that way in queue rows (alias/id, name mapped client-side per rule 8).
- **Care-first copy** — no guilt framing; volume drops stay neutral (`:16-17` design note). Every recommendation must
  trace to an auditable logged-data condition.
- **Never block the loop:** pain rungs annotate and advise review; they must never disable the Log CTA.

---

## 7. Cross-Domain Dependencies & Sequencing

- **Home hero (doc 01/02 user-dashboard lanes):** P0-A replaces the static `HomeTabNextBestAction` internals — coordinate
  with whoever owns `HomeTabVisionRightRail`; the priority-order source test (`HomeTabVisionRightRail.priority.test.ts:10-16`)
  must keep passing (NBA stays first in rail).
- **Pain-chart domain (doc on BodyMap):** P1-B needs the pain constraint engine ported server-side; the deep audit
  (`FABLE-VISION-REBUILD-DEEP-AUDIT-2026-07-05.md:90-92`) already names "promote Pain Intelligence into dashboard
  next-best-action" as top value. Sequence: port `buildWorkoutConstraints` → then rung 3.
- **Workout logger lane (ACTIVE — out of scope):** P0-B only changes an href constant; it does not touch logger UI. If the
  Phase-1 logger lane changes the canonical logging route, LOG_HREF follows THEIR route decision.
- **Sessions/billing domain:** `session_credits_low` reads `availableSessions`; the flag-OFF session-completion billing
  policy (known-truth #6) may change the meaning of "credits" — gate client-visible billing nudges behind that lane's decision.
- **Gamification (gamificationV1Routes only):** challenge rung reads `gamificationV1Routes.mjs:240`; do not touch legacy
  gamificationRoutes (dormant, `core/routes.mjs:94-95` commented out).
- **Sequencing:** P0-A/P0-B (independent, ship first) → P1-C (activation) → P1-B (signals) → P1-A (queue, needs batch SQL)
  → P2-A (admin, reuses queue) → P2-B/P2-C → P3.

## 8. Do-Not-Touch

- **Workout logger UI/flow + exercise-picker consolidation** — active Phase-1 build lane. Integration point only (href).
- **Stripe/storefront checkout internals** — Codex lane. `session_credits_low` reads the User column only.
- **Hermes/Pi operator work** — out of scope.
- **Do NOT rebuild** `nextBestActionService.mjs` / `progressPulseService.mjs` — extend the ladder and add signal adapters.
  The pure-core + injectable-clock + audience-voice architecture is the keeper.
- **Do NOT resurrect** `Pages/client-progress/ClientProgressDashboard.tsx` (dormant) or legacy `gamificationRoutes`.
- The unified write path (`submitAiWorkoutLogAsDailyForm` + `workoutXpAwardStep.mjs`) is shipped truth — cache-bust hooks
  onto it, never around it.
