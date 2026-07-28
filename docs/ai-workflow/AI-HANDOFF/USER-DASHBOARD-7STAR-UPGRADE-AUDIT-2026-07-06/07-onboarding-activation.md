# 07 — Onboarding + First-7-Days Activation: 7-Star Upgrade Audit
**Date:** 2026-07-06 · **Auditor:** Fable 5 (read-only domain auditor) · **Baseline:** origin/main @ 87680741e (worktree c:/tmp/ss-audit-20260706)
**Domain:** New client/user journey — signup → claim → first login → first dashboard render → the three 7-day activation gates: (a) first workout logged, (b) first coach/group interaction, (c) first visible progress proof.
**Confidence tags:** `[VERIFIED]` file read this session · `[LIKELY]` strong indirect evidence · `[HYPOTHESIS]` reasoned, verify before building.
**Companions:** `05-notifications-nudges.md` (nudge delivery engine), `06-next-best-action-extension.md` (NBA rungs/paywall). This doc owns the funnel; those own delivery + recommendation mechanics.

---

## 1. Canonical Surface Receipt (what actually mounts)

| Surface | Route → Component | Evidence |
|---|---|---|
| Public signup | `/signup` → `OptimizedSignupModal` | `frontend/src/routes/main-routes.tsx:75-77,342-347` [VERIFIED] |
| Public claim (Crystalline Link) | `/claim/:token` + `/claim` → `ClaimAccountPage` | `main-routes.tsx:382-398` [VERIFIED] |
| Public waiver | `/waiver` → `PublicWaiverPage` | `main-routes.tsx:400-408`; live redirect gate `routes/protected-route.tsx:133-143,289-291` [VERIFIED] |
| Client self-onboarding wizard | `/dashboard/client/onboarding` → `ClientSelfOnboardingPage` → `pages/onboarding/ClientOnboardingWizard` (8 steps) | `UniversalDashboardLayout.routes.tsx:182`; `UniversalDashboardLayout.routeComponents.tsx:147-156`; steps `pages/onboarding/ClientOnboardingWizard.tsx:26-35` [VERIFIED] |
| Admin/trainer onboarding wrappers | `/dashboard/admin/client-onboarding` (+ `/unified-onboarding`, `/user-onboarding`, `/trainer-onboarding`) | `UniversalDashboardLayout.routes.tsx:104,113-115`; `Pages/admin-clients/components/AdminOnboardingPanel.tsx:428` [VERIFIED] |
| Backend register | `POST /api/auth/register` → `authController.mjs:510-676` | roles allowlist `authController.mjs:266` (`user`,`client`,`admin`+code); default role `user` `:512-513` [VERIFIED] |
| Backend claim | `/api/claim/verify/:token`, `/api/claim/activate` → `claimRoutes.mjs` (mount `core/routes.mjs:515`) | token pattern `SWAN-[A-Z0-9]{8}` `claimRoutes.mjs:34`; activate sets `accountStatus:'active'`, `forcePasswordChange:false` `:223-229` [VERIFIED] |
| Backend self-onboarding | `POST /api/onboarding/self` (roles client+user) → `onboardingController.createClientSelfOnboarding` | `onboardingRoutes.mjs:27-31` (mount `core/routes.mjs:294`); sets `isOnboardingComplete:true` + `masterPromptJson` + spiritName + `clients_pii` upsert + `generateChallengesFromGoals` `onboardingController.mjs:329-341,355-374` [VERIFIED] |
| Staff quick-capture | `POST /api/clients/onboard` → creates stub User(role client) + ClientProgress + assignment + SWAN claim code, `isOnboardingComplete:false` | `clientOnboardRoutes.mjs:193-218` (mount `core/routes.mjs:298`) [VERIFIED] |
| Post-checkout activation ladder | `GET /api/v2/payments/activation-status` → nextStep ladder | `paymentActivationStatusService.mjs:121-170`; frontend CTA map `components/NewCheckout/checkoutActivation.ts:108-138` [VERIFIED] |
| Admin activation queue | `GET /api/admin/clients/activation-queue` → panel in admin Client Hub (directory mode only) | `adminClientRoutes.mjs:295`; `workspaces/ClientsWorkspace.view.tsx:137-152` [VERIFIED] |
| Role `user` → client dashboard normalization | `'user'` normalized to `'client'` in layout | `UniversalDashboardLayout.tsx:60-63` [VERIFIED] |

**Post-auth redirects (no onboarding check anywhere):** signup → role switch, `user`→`/user-dashboard`, `client`→`/dashboard/client/overview` (`OptimizedSignupModal.tsx:888-905`) [VERIFIED]. Login → same targets (`EnhancedLoginModal.tsx:477-484,547-554`) [VERIFIED].

---

## 2. Current-State Map

### Canonical
- `pages/OptimizedSignupModal.tsx` (1355 ln) — role selector "Account Type" defaults `user` (`:600,1209-1225`); client role reveals `clientSource` field (`:1225`) [VERIFIED]
- `pages/ClaimAccountPage.tsx` (297 ln) — verify → set password → activate → **manual** "Go to Login" (`:190-192`); login prefills `?username=&claimed=1` (`EnhancedLoginModal.tsx:430-433`) [VERIFIED]
- `pages/onboarding/ClientOnboardingWizard.tsx` (754 ln) + 11 section components — 8 steps (Basic/Goals/Health/Nutrition/Lifestyle/Training/Coach-Consent/Summary); self path posts `/api/onboarding/self` (`:579`); **form state is React-only — abandoning mid-wizard loses all answers** (`:452-453`, no draft persistence on self flow) [VERIFIED]
- `backend/services/paymentActivationStatusService.mjs` — ladder: `await_payment → claim_account → complete_waiver → complete_onboarding → await_session_allocation → schedule_first_session → dashboard` (`:121-170`) [VERIFIED]
- `backend/services/adminClientActivationQueueService.mjs` (133 ln) — **paid carts only** (`:51-58`); summary counts needsWaiver/needsOnboarding/awaitingAllocation/readyToSchedule (`:25-43`) [VERIFIED]
- `backend/services/nextBestActionService.mjs:65-69` — `log_first_workout` is priority-1 rung [VERIFIED]
- Trainer-side onboarding visibility: `TrainerDashboard/ClientManagement/MyClientsView.logic.ts:59-70` (status chip), `coach-assistant/CoachOnboardingWorkbench.logic.ts:158` (completion %), `backend/services/onboardingQueueSummaryService.mjs` [VERIFIED]
- Day-1/3/7 SMS skeleton: `backend/services/automationService.mjs:16-39` — `new_client_welcome` (day 0) + `new_client_nurture` (day 1/3/7) on `client_created` [VERIFIED]
- Waiver gate (live): `protected-route.tsx:289-291` redirects un-waivered client/user to `/waiver` [VERIFIED]

### Dormant (exists, no consumer — the biggest finding of this domain)
- **`shouldRedirectClientToOnboarding` (`UniversalDashboardLayout.logic.ts:52-61`) — the auto-redirect gate for `isOnboardingComplete === false` is defined and unit-tested (`UniversalDashboardLayout.clientOnboardingGate.test.ts`) but has ZERO non-test consumers** (repo-wide grep: only logic.ts + test). No layout, login, or route guard calls it. [VERIFIED]
- Client sidebar has **no onboarding entry** (`client-dashboard/ClientStellarSidebar.tsx:55-87` — full item list, onboarding absent) [VERIFIED]
- `routes/authentication-routes.tsx` — lazy-imports nonexistent `pages/SignupModal.component` / `pages/LoginModal.component` (`:11-12`); reachable only via `DirectAppRoutes.tsx` + `routes/index.ts`, neither consumed; live router is `createBrowserRouter([MainRoutes])` (`App.tsx:107`) [VERIFIED]
- `automationService` `client_created` trigger fires from exactly ONE call site — staff onboarding `onboardingController.mjs:186`. Self-signup, claim activation, and quick-capture never fire it; cron is env-gated `SWAN_AUTOMATION_CRON_ENABLED` (`automationArmState.mjs:14`, `automationCron.mjs:86`) — armed state in Render `[UNKNOWN]` [VERIFIED code / UNKNOWN env]

### Legacy
- `CinematicNavbar.tsx:462` links `/register` — a route that exists only in the unmounted `authentication-routes.tsx`; live wildcard `main-routes.tsx:883` silently bounces `*` → `/`. Contained: CinematicNavbar mounts only inside admin `HomepageDesignLab.tsx:55-85` variants, not the public homepage [VERIFIED]

### Discovery paths into the self-onboarding wizard (exhaustive)
1. Day-0 welcome **in-app notification** linking `/dashboard/client/onboarding` (`authController.mjs:645-654`) — only if user opens the bell [VERIFIED]
2. Checkout-success CTA when ladder says `complete_onboarding` (`checkoutActivation.ts:110`, `paymentActivationStatusService.mjs:145-146`) — paid clients only [VERIFIED]
3. TeachMe guide refiner — but only refines **when already on the onboarding path** (`DashboardTeachMeGuide.clientRouteRefiners.ts:18-35,195`); circular [VERIFIED]
4. Typing the URL. That is all. **A free self-signup who ignores one notification never encounters onboarding again.** [VERIFIED by elimination]

---

## 3. Data-Truth Check

- `User.isOnboardingComplete` BOOLEAN default false (`backend/models/User.mjs:304-309`); `accountStatus` ENUM stub/invited/active (`:424-429`) [VERIFIED]
- `/api/auth/me`-shaped responses include `isOnboardingComplete` (`authController.mjs:356`); AuthContext tolerates **two key spellings** (`isOnboardingComplete` OR `onboardingComplete`, `AuthContext.tsx:130-137`) — mild response-shape drift, currently absorbed; backend lists (`MyClientsView.clientCard.tsx:80-81`) send `onboardingComplete`. Standardize on one key when touching these payloads (Rule 58 flag, non-breaking today) [VERIFIED]
- Two routers both mounted at `/api/onboarding` (`core/routes.mjs:294,296`): `onboardingRoutes` (`/self`, `/`, `/:userId`) + `clientOnboardingRoutes` (`/:userId/questionnaire`). No shadowing — segment counts differ — but it is a Rule-31 trap for future editors [VERIFIED]
- Day-0 dashboard data is truthful, not mocked: assignment card renders "Plan pending / Your trainer has not assigned a live plan yet" (`ClientDashboardHome.viewModel.ts:161-166`); session card "No upcoming session → Book Session" (`:181-191`, `ClientDashboardHome.sections.tsx:285-296`); wearable tiles honestly "Not available" (`viewModel.ts:212-215`) [VERIFIED]
- Auto-follow admin at signup guarantees a non-empty day-0 feed (`authController.mjs:616-637`) [VERIFIED]
- Self-onboarding writes real activation fuel: `masterPromptJson` (Swan Coach), goal-derived gamification challenges (`generateChallengesFromGoals`, `onboardingController.mjs:371-374`; effect in `gamification/goalChallengeService.mjs` [LIKELY]) [VERIFIED call site]
- **Data gap:** nothing anywhere stores or derives "days since account creation vs first `WorkoutSession`" — the core activation metric has no home [VERIFIED by absence: no service references `createdAt` against workout history for activation]

---

## 4. Vision Gap Analysis (7-star vs today)

**7-star:** every new account lands in a guided first-run that ends with a logged workout inside 7 days; wizard completion flows directly into "log your first workout now"; the claim flow signs you in; day-1/3/5/7 playbook nudges fire automatically per gate state; trainer sees "new client, 4 days, no first workout" as a red exception; the first logged workout triggers a celebration + share prompt; the first chart lighting up is a designed moment.

**Today, gate by gate:**

| Gate | What exists | What's missing |
|---|---|---|
| (a) First workout logged | NBA rung 1 `log_first_workout` (`nextBestActionService.mjs:65-69`) but client rendering is **Guardian-gated** (`ClientProgressDashboardPage.tsx:62-63,188`); free fallback `FirstWorkoutCta` on progress page only (`:192-194`); sidebar "Log Workout" deep-link (`ClientStellarSidebar.tsx:57`); first-log XP + social auto-post ship (prior-verified truth #2) | No first-run sequence ends at the logger; onboarding success modal CTA goes to `/dashboard/client/overview` (`ClientOnboardingWizard.tsx:465`), not the logger; NBA `LOG_HREF='/dashboard/client/workouts'` (history page, +1 click from logger, `nextBestActionService.mjs:45`); zero workout-aware day-N nudges (drip is generic SMS, disarmed, staff-trigger-only) |
| (b) First coach/group interaction | Auto-follow admin (`authController.mjs:616-637`); Coach Assistant route free for clients (`routes.tsx:199`); community route mounted (`:190`) | No auto trainer welcome message on assignment/claim; client↔trainer messaging is tier-gated (doc 05 §7 flags Crystalline gate vs activation — cross-domain conflict); no "say hi to your coach / join a challenge" first-run step; coach-interaction is not measured anywhere |
| (c) First progress proof | Post-onboarding challenges seeded; `FirstWorkoutCta`; recap/stat tiles free; share-line builder on user home (`HomeTabProofViewModel.ts:22-34`) | The 12-chart grid + ProgressPulse are **paywalled on day 0** (`CrystallineLockOverlay`, `ClientProgressDashboardPage.tsx:229-253`) — a free trainee cannot see their first chart come alive (doc 06 P1-C addresses NBA rungs; the chart-proof paywall itself is a strategy call); no "first proof" celebration moment |
| Funnel plumbing | Waiver gate live; checkout ladder live for paid; claim flow works end-to-end | Onboarding redirect gate dormant (§2); claim → manual re-login (~4 extra user actions); activation ladder stops at `schedule_first_session` — gates a/b/c are not rungs; activation queue covers **paid** clients only — free signups (role `user`) invisible to admin |

**The structural insight:** every ingredient exists — gate logic, wizard, ladder, NBA rung, SMS skeleton, queue panel, XP/share reward — but nothing composes them into a first-7-days machine. This domain is an assembly job, not a build job.

---

## 5. Ranked Upgrades (P0 → P3)

**P0-A — Wire the dormant onboarding redirect gate.** Call `shouldRedirectClientToOnboarding` (already tested) in `UniversalDashboardLayout.tsx` render path (role resolution ~`:60-73`); `<Navigate to={CLIENT_ONBOARDING_ROUTE}/>` when true.
Why: converts onboarding from undiscoverable to unavoidable; onboarding fuels Coach (masterPromptJson) + challenges — the whole loop starts here. Value: highest in domain. Effort: **S** (gate + tests exist).
Accept: fresh client/user with `isOnboardingComplete=false` logging in lands on the wizard; completing it (sets flag true, `onboardingController.mjs:330`) never redirects again; admin/trainer unaffected.
Clicks: reach onboarding today = bell → notification → wizard (2 taps, miss-able forever) → **0 taps (automatic)**.

**P0-B — Wizard completion hands off to the first workout, not the overview.** Change self-flow success CTA (`ClientOnboardingWizard.tsx:465-466`) to `/dashboard/client/log-workout?loadPlan=today` ("Log your first workout"), keep "Go to Dashboard" secondary; also fix NBA `LOG_HREF` (`nextBestActionService.mjs:45`) to the logger deep-link.
Why: gate (a) is the activation keystone; today the wizard dead-ends at a home whose assignment card says "Plan pending." Effort: **S**.
Accept: completing self-onboarding shows "Log your first workout" primary CTA; NBA CTA opens the logger directly.
Clicks: wizard-end → first logged workout today = 4+ taps (dashboard → sidebar → logger → log) → **1 tap**.

**P0-C — Claim flow auto-login.** `POST /api/claim/activate` (`claimRoutes.mjs:~220-260`) already verifies token + sets password; return the same JWT pair `register` returns (`generateAccessToken`, `authController.mjs:310-315`) and have `ClaimAccountPage` store it via AuthContext, then route to the P0-A gate (→ onboarding).
Why: the Crystalline Link is the trainer-led B2B2C front door (Move Fitness + external clients); today's activate → "Go to Login" → retype password loses tired gym-floor users. Effort: **M** (auth surface = careful review; keep the manual path as fallback).
Accept: scanning QR → set password → land authenticated on onboarding wizard with zero re-entry; token single-use preserved (`claimTokenHash:null` on success `claimRoutes.mjs:227-228`).
Clicks: activate → training-ready today ≈ 6 (login nav, username check, password, submit, dashboard, find next) → **0** (auto).

**P1-A — Extend the activation ladder + queue to the three real gates.** Add `log_first_workout`, `first_coach_touch`, `first_progress_view` rungs to `paymentActivationStatusService.mjs` (after `schedule_first_session`), sourced from `WorkoutSession` existence, message/coach-command existence, and progress-page visit or recap share. Surface the same rungs in `adminClientActivationQueueService` summary + `ClientActivationQueuePanel`, and **widen the queue beyond paid carts** to all client/user accounts ≤14 days old.
Why: admin proof-of-value ("who's stale, who needs intervention") currently ends at scheduling; free signups are invisible. Effort: **M**.
Accept: admin Client Hub directory shows "New (≤14d): N without first workout" with per-client next-gate chips; queue row click opens that client (existing `onSelectClient`).
Clicks: admin finds an at-risk new client today = manual cross-referencing (unbounded) → **1 tap** from Client Hub.

**P1-B — Day-1/3/5/7 playbook: arm and re-point the existing drip.** Fire `triggerSequence('client_created', …)` from all three creation paths (register `authController.mjs:~614`, claim activate, quick-capture) not just staff onboarding (`onboardingController.mjs:186`); make nurture steps **gate-aware** (skip day-3 "get started" if first workout already logged) by checking `WorkoutSession` before send; deliver via doc 05's nudge engine (its `activation_day3_no_first_log` trigger spec is the same machine — build once, together).
Why: 7-day activation without automated touches depends on the trainer remembering. Effort: **M** (engine exists; env arming is Sean's call — `SWAN_AUTOMATION_CRON_ENABLED` `[UNKNOWN]` in Render).
Accept: new self-signup with no workout by day 3 receives exactly one nudge (in-app first; SMS only when armed + phone present); logged-workout users receive congratulation-path copy instead; all sends idempotent per user+step.

**P1-C — Day-0 home hero = activation card.** When `isOnboardingComplete=false` OR zero workout history, replace the "Plan pending" assignment card (`ClientDashboardHome.viewModel.ts:161-166`) with a 3-item activation checklist card (finish onboarding → log first workout → meet your coach/community), each row one tap deep, fed by the same gate state as P1-A.
Why: the current day-0 home leads with what the user does NOT have (no plan, no session) — guided actions beat empty states. Effort: **M**. Uses the NBA free-tier activation rungs from doc 06 P1-C.
Accept: day-0 client home shows checklist with real-time completion states; disappears permanently once all three gates pass.
Clicks: day-0 "what do I do?" → next action = exploration (3-10 taps) → **1 tap**.

**P2-A — First-proof celebration moment.** On first `DailyWorkoutForm` save (form-id idempotent step already exists — `workoutXpAwardStep.mjs`, prior-verified), enqueue a one-time "your charts are alive" in-app notification linking the progress page, and show a first-workout milestone share prompt reusing the existing share-line builder (`HomeTabProofViewModel.ts:22-34`) + auto-post plumbing.
Why: gate (c) + community sharing in one move; milestones are the shareable unit of the Core Loop. Effort: **S-M**. Accept: exactly-once per user; share prompt optional, never auto-posts beyond the existing single auto-post.

**P2-B — Coach first-touch automation.** On `ClientTrainerAssignment` creation (staff quick-capture `clientOnboardRoutes.mjs` step 6, and admin assignment flows), create an in-app welcome message/notification from the assigned trainer to the client ("Your coach is X — say hi"), and surface "new client assigned — send welcome" as a trainer to-do in `MyClientsView`.
Why: gate (b) has zero automation today; belonging drives retention. Effort: **M**. Depends on doc 05 P1-B (message→notification bridge) and the messaging tier-gate strategy decision (free client↔assigned-trainer DMs).

**P3 — Hygiene (separate pass, Rule 37):** delete/rewire dormant `authentication-routes.tsx` + `DirectAppRoutes.tsx` + `routes/index.ts` (broken lazy imports of nonexistent `SignupModal.component`/`LoginModal.component`) and the design-lab `/register` link; standardize `onboardingComplete` vs `isOnboardingComplete` key. Grep-check imports before removal (Rule 34).

---

## 6. Algorithm Specs (extend, don't rebuild)

### 6.1 Activation Score (0-100)
Inputs (all first-party, per user): `User.createdAt`, `isOnboardingComplete`, waiver state (`WaiverRecord` lookup as in `paymentActivationStatusService.mjs:265-272`), first `WorkoutSession` timestamp, coach-touch timestamp (first Message either direction OR first coach-assistant command), proof-touch (first progress-page visit or recap share), profile completeness (fraction of the 8 wizard sections with data in `ClientOnboardingQuestionnaire.responsesJson`).
```
score = 25*gateA + 20*gateB + 15*gateC          // the three activation gates
      + 20*onboardingComplete + 10*waiverComplete
      + 10*profileCompleteness                  // 0..1 fractional
decay: if now - createdAt > 7d and gateA==0 → status 'at_risk'
       if > 14d and gateA==0                → status 'stalled'
```
Output: `{ score, status: activating|active|at_risk|stalled, gates: {a,b,c}, nextGate }`.
**Home:** a sibling of `nextBestActionService.mjs` (e.g. `activationScoreService.mjs`) consuming `getProgressPulse` for gateA (it already computes `lastWorkout.date === null`, `progressPulseService` [VERIFIED consumer at `nextBestActionService.mjs:187`]) — do NOT fork a second pulse reader. Expose alongside the existing route family `/api/analytics/:userId/*` (extend the mounted NBA route, per known truth #1).

### 6.2 Day-1/3/5/7 playbook triggers (feeds doc 05's nudge engine)
```
day 1: if !isOnboardingComplete  → nudge 'finish_onboarding' (in-app; link wizard)
       else if gateA==0          → nudge 'first_workout' (link logger deep-link)
day 3: if gateA==0               → nudge 'first_workout_v2' + trainer to-do created
day 5: if gateA==1 && gateC==0   → nudge 'see_your_progress' (link progress page)
       if gateB==0               → nudge 'meet_your_coach' (link messages/community)
day 7: if gateA==0               → escalate: admin activation queue flags 'at_risk';
                                    trainer notification 'new client needs outreach'
       if all gates passed       → 'week_one_win' celebration + share prompt
```
Idempotency: one row per (userId, playbookStep) — mirror the gamification idempotency-key gotcha. Delivery order: in-app always; SMS/email only per doc 05 prefs + arming. Skip entirely for roles admin/trainer and `clientSource==='move_fitness'` where marketing suppression applies (`automationService.mjs` imports `marketingSuppressionService` [VERIFIED import :12]).

### 6.3 Trainer "new client at risk" signal
Input: assigned clients (existing `useTrainerClients` list) joined with activation score. Rule: `createdAt ≤ 14d AND (score < 45 OR gateA==0 at day ≥ 3)` → badge on `MyClientsView` client card (it already renders onboarding status chips, `MyClientsView.logic.ts:59-70`) + a row in the coach NBA feed via `coachify()` (`nextBestActionService.mjs:154-183`) — add one `COACH_COPY` key `new_client_at_risk`. Admin: same rule feeds the widened activation queue (P1-A). No new UI systems needed.

---

## 7. Cross-Domain Dependencies & Sequencing

- **Doc 05 (nudges):** playbook triggers (6.2) are delivery payloads for its engine — build the trigger table there, gate logic here. Its P1-B message→notification bridge is a prerequisite for P2-B.
- **Doc 06 (NBA):** free-tier activation rungs (its P1-C) must land for P1-C here to render for Starter users; `activationScoreService` extends the same route family — never a second engine.
- **Doc 01 (user home):** the day-0 activation checklist card replaces/precedes the assignment-card hero; coordinate the hero slot.
- **Monetization/strategy:** two paywall-vs-activation conflicts need a Sean ruling: (1) client↔assigned-trainer messaging tier gate vs gate (b); (2) chart-grid Guardian lock vs gate (c) "first visible progress proof."
- **Sequencing:** P0-A → P0-B (same slice OK) → P0-C → P1-A/P1-B (share the gate-state reader) → P1-C → P2s. P3 hygiene independently, separate pass.

## 8. Do-Not-Touch (active lanes)

- **Workout logger UI/flow + exercise-picker consolidation** — Phase-1 build lane owns `WorkoutLogger.tsx` and pickers. P0-B only changes CTA *targets* (URLs), never logger internals.
- **Stripe/storefront checkout internals** — Codex lane. P1-A reads `paymentActivationStatusService` outputs; do not modify checkout/webhook code paths beyond appending ladder rungs in the status service (coordinate with Codex before touching `/api/v2/payments/*`).
- **Do not rebuild:** `nextBestActionService.mjs` (extend `COACH_COPY`/rungs only), the unified workout write path + `workoutXpAwardStep.mjs` idempotency, `gamificationV1Routes.mjs`, the claim token service (AI-Village-validated), the waiver gate.
- **Env arming** (`SWAN_AUTOMATION_CRON_ENABLED`) is Sean's explicit call — ship playbook code default-off with a kill switch (Rule 48/50 posture).

---
*Every claim above carries file:line from the 87680741e worktree. The dominant pattern: all activation ingredients exist and are individually production-grade; zero of them are composed into a first-7-days machine, and the single highest-leverage fix is a dormant, already-tested redirect gate waiting for one call site.*
