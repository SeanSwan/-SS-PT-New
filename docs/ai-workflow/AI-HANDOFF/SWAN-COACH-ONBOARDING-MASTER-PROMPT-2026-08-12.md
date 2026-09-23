---
decision: Master prompt for the downstream reviewing/building agent — consolidates a 4-round review chain, corrects it, and adds the verified onboarding→generation findings the chain missed
status: superseded
supersedes: none
superseded-by: docs/ai-workflow/AI-HANDOFF/SWAN-COACH-ONBOARDING-MASTER-PROMPT-V2-2026-08-12.md
superseded-reason: GPT-5.6 counter-review (adjudicated by Kimi K3, HY3, and Fable, 2026-08-12) — F14 here is FALSE (a service abstraction persists the questionnaire on the staff path); the pending_action substrate here duplicates the existing coach_action_proposals system; the single-instance/no-Redis constraint here cites an inert render.yaml. Do NOT hand this version to a builder.
---

# MASTER PROMPT — SwanStudios Coach / Onboarding Remediation + Build

> **Assembled:** 2026-08-12 · **Bound repo state:** `origin/main` @ `0bff35fc8`
> **Chain:** external GPT-class audit → its self-review → paid panel (Opus 5 / Kimi K3 / HY3 / Fable seat / AI Village) → Fable hostile verification (4 read-only agents) → Kimi K3 hostile meta-review → this consolidation.
> **Everything below the line is the prompt.** Hand it to the agent as-is.

## Provenance notes for Sean (NOT part of the prompt)

- **Kimi's meta-review was accepted with two corrections.** It caught a real counting error in my packet (§3.4 said "three findings," listed five) — fixed. It also **fabricated a migration filename** (`20250918090000-*`); the real file is `20260718120000-add-client-request-id-to-workout-sessions.cjs` [VERIFIED via `git ls-tree origin/main`]. That is exactly the error class it was told to avoid, and it is corrected below. Treat Kimi's *architecture judgment* as strong and its *file:line recall* as unreliable.
- **Kimi's biggest contribution:** the proportionality challenge (§6) and the G-series gap list (§7). Its prediction that nobody verified the onboarding→generation link was correct, and I verified it independently — see F12–F15, which are new to this document and are the most serious findings in the entire chain.
- **My concession to Kimi:** my verification method graded the panel's ten claims rather than sweeping cold. The codebase's true defect surface remains unknown. That caveat is carried into the prompt.

---

================================================================================
MASTER PROMPT — SwanStudios Coach/Onboarding Remediation + Build
Bound repo state: origin/main @ 0bff35fc8
You have repo access. You have no memory of any prior conversation. This
document is the complete spec. Do not ask clarifying questions; where this
document says VERIFY, verify against the mounted code and report the result.
================================================================================

## 0. BEFORE YOU READ CODE — WORKING-TREE WARNING

The local working tree may be on a stale branch hundreds or thousands of
commits behind `origin/main`. Source files in the checkout may not reflect
reality, tooling may appear missing when it exists, and fixes made on a stale
branch do not reach production.

REQUIRED FIRST ACTIONS:
  1. `git fetch origin main`
  2. Establish your working base from `origin/main`. Read code via
     `git show origin/main:<path>` / `git grep <pattern> origin/main -- <path>`
     until you are certain your branch is current.
  3. Report the branch, its distance from `origin/main`, and your chosen base
     before any other work.

Other agents may be working this same tree in parallel. Before editing any
file, check `.ai-workflow/coordination/*.lane.md` for another agent's locks,
claim your own files in your lane file, and never stage with `git add -A`
while another agent holds locks. `main` auto-deploys to production on push:
commit per slice locally, push once per batch, verify the deploy once.

## 1. MISSION

You are the final reviewing-and-building agent for SwanStudios, a production
personal-training SaaS. Four prior review rounds have run. Your job, in order:

  PHASE 1 — VERIFY: independently confirm every finding in §5 against the
    mounted code. Confirm, refute, or correct each with fresh file:line
    evidence. Report anything the whole chain missed.
  PHASE 2 — PLAN: produce the slice-by-slice implementation plan per §8,
    with estimates, before writing code.
  PHASE 3 — BUILD: execute slices in order (parallel tracks where marked),
    meeting each slice's acceptance criteria and proof requirements.

Repository truth outranks every claim in this document, including this
document. If evidence below is stale or wrong, say so and proceed from code.

## 2. PRODUCT CONTEXT

Roles: admin (the owner, a working trainer), trainer, client. Trainer-led
B2B2C. The coaching record (programs, assignments, logs, notes, adherence) is
first-party and canonical.

Owner's core vision (verbatim intent): "Dictation first. As I dictate to the
Swan Coach, it changes the UI/UX and logs workouts. Manual forms are the
always-available fallback, secondary. Onboarding is where I pour all my data
so we can build customized workouts based on the client's goals and history."

Product loop: log workout -> save -> charts/progress proof -> next training
action -> shareable milestones.

## 3. HARD CONSTRAINTS (reject any plan violating these)

- Vite + React Router + React 18 + TypeScript + styled-components. NOT
  Next.js. A prior reviewer in this chain hallucinated Next.js files; do not
  repeat that.
- No Material-UI. styled-components only; colors as var(--token, #fallback);
  no hardcoded hex.
- Dark-first "Crystalline Swan" palette. Retired Galaxy-Swan tokens
  (#0a0a1a, #00FFFF, #7851A9) must never appear.
- 44px minimum touch targets. WCAG 4.5:1 contrast. prefers-reduced-motion
  respected.
- Files <= 300 lines. Victory for charts (never Recharts).
- ZERO new frameworks and ZERO new runtime dependencies unless you document
  the in-repo alternative you rejected and why it is a blocker.
- Zero PII to LLMs: client IDs and roles only. This includes voice
  transcripts (see G9).
- No voice-executed payments, auth changes, role changes, deletions, or
  bulk/irreversible operations.
- Backend: Node/Express + Sequelize + PostgreSQL on Render, SINGLE INSTANCE,
  Redis NOT available (commented out in render.yaml:276). Design for that
  deployment, not a hypothetical cluster.
- No destructive database work without explicit owner approval: no
  sync({force}), no unbounded UPDATE/DELETE, no dropping columns, no
  whole-schema sync. Migrations must be reversible.

## 4. PROVENANCE — HOW MUCH TO TRUST WHAT FOLLOWS

- The paid panel produced ten findings plus a "Balanced Crystalline Coach
  Layer" architecture. Its nine artifact documents (blueprint, wireframes,
  contracts) exist ONLY outside this repository. THIS document is the spec.
  If you want blueprint artifacts, reconstruct them into the repo as you go.
- A hostile verification round (four read-only agents against origin/main)
  confirmed all ten findings and produced the corrected fix-scopes below.
  IMPORTANT CAVEAT: that method GRADED a given claim list; it did not sweep
  cold. The codebase's full defect surface is UNKNOWN. Stay alert for
  adjacent defects while you work, and report them.
- A hostile meta-review corrected the architecture's proportionality (§6)
  and contributed the G-series gaps (§7). One of its file references was
  fabricated and has been corrected here — do not assume any citation is
  right without checking.
- F12–F15 were verified independently after the panel finished. They are the
  most serious findings in the chain and the panel never looked at them.
- Every file:line citation in §5 and §6 was audited against origin/main
  (~95 citations, 0 nonexistent paths, 2 hard defects found and corrected
  before you received this). Citations are therefore high-confidence but
  not infallible — line numbers drift as the repo moves. The bound SHA
  0bff35fc8 was already 6 commits behind origin/main at audit time with no
  drift observed in any cited file; re-anchor if you find a mismatch, and
  report it rather than silently patching a nearby line.

## 5. FINDINGS WITH EVIDENCE AND CORRECTED FIX-SCOPES

Verify each, then fix per the CORRECTED scope, not the original framing.

--- ONBOARDING -> PROGRAM GENERATION (the product spine; newest findings) ---

F12 [P0 — SAFETY] Client-reported injuries never reach the AI that writes
  their workouts.
  Evidence: the onboarding wizard collects name="injuries"
  (frontend/src/pages/onboarding/components/HealthSection.tsx:106). The
  master-prompt transform reads a DIFFERENT key —
  backend/services/onboardingMasterPromptBuilder.mjs:65:
    injuries: formData.pastInjuries || [],
  so health.injuries is ALWAYS empty. The AI workout prompt embeds the
  de-identified masterPromptJson (de-identified at
  aiWorkoutController.mjs:432, embedded at
  backend/services/ai/promptBuilder.mjs:92-93), and de-identification does
  not strip health.injuries — so an empty list there means the model is
  blind to injuries the client typed in, not that they were redacted.
  The same field-name mismatch class drops (verify each):
    movementLimitations (TrainingSection) -> read by nothing
    doctorClearance -> transform expects doctorCleared (:62)
    heartCondition, chestPain, bloodPressure, physicianName -> dropped
    trainingExperience -> transform expects fitnessLevel /
      pastTrainingExperience (:104,108)
    activityLevel -> transform expects workActivityLevel (:98)
    typicalDiet -> transform expects currentDietQuality (:71)
    mealsPerDay, customGoal, sessionsPerWeek, trainingPackage -> dropped
  FIX-SCOPE: reconcile wizard field names against the transform contract in
  BOTH directions and add a test that asserts every wizard field either maps
  to a master-prompt path or is explicitly listed as intentionally-unmapped.
  A silent drop must become impossible. Injuries and movement limitations
  are the safety-critical pair — fix those first and verify end-to-end that
  a typed injury appears in the generated prompt payload.

F13 [P0] The master-prompt auto-build fallback reads six columns that do not
  exist, then persists the wrong result permanently.
  Evidence: backend/services/masterPromptBuilder.mjs:257-270 reads
  questionnaire?.secondaryGoals, ?.goalNotes, ?.experienceLevel,
  ?.activityLevel, ?.preferredExercises, ?.dislikedExercises. The model
  (backend/models/ClientOnboardingQuestionnaire.mjs) and its migration
  (backend/migrations/20260112000000-create-client-onboarding-
  questionnaires.cjs) define ONLY: userId, createdBy, questionnaireVersion,
  status, responsesJson, primaryGoal, trainingTier, commitmentLevel,
  healthRisk, nutritionPrefs, completedAt. So every one of those reads is
  permanently undefined -> every client defaults to experienceLevel
  'beginner', empty preferences, no secondary goals. responsesJson — which
  actually holds those answers — is never opened here. The resulting blob is
  then written back onto the user (backend/controllers/
  aiWorkoutController.mjs:366), freezing the wrong values.
  FIX-SCOPE: read from responsesJson (the real payload) or from the columns
  that exist; add a schema-drift test asserting every field the builder
  reads exists on the model. Then decide what to do about already-persisted
  all-default masterPromptJson blobs — a backfill is a DESTRUCTIVE-ADJACENT
  operation and requires owner approval before execution.

F14 [P1] THREE onboarding write paths, each producing a different subset of
  the canonical artifacts. No path writes everything.
  Evidence — the two artifacts that matter are User.masterPromptJson (what
  the AI generator reads: aiWorkoutController.mjs:348,
  longHorizonController.mjs:255) and the ClientOnboardingQuestionnaire row
  (the structured record):
    PATH A — admin/trainer, backend/controllers/onboardingController.mjs:72
      (handler), :128, :191 (masterPromptJson written inside User.create).
      Writes masterPromptJson. Writes NO questionnaire row — the only
      ClientOnboardingQuestionnaire.create in that file is :393, on Path B.
    PATH B — client self, onboardingController.mjs:360, :371-383
      (masterPromptJson) and :393 (questionnaire row). Writes BOTH. This is
      the only complete path.
    PATH C — backend/controllers/clientOnboardingController.mjs:191-226
      (createQuestionnaire, .create at :213-225). Writes ONLY the
      questionnaire row; zero masterPromptJson references in the file, so
      data entered here influences no generator at all.
  FIX-SCOPE: route every onboarding write through ONE service that produces
  the same canonical artifacts every time. Path B is the reference behavior.
  Add a test asserting that each entry point yields both artifacts. This is
  the blueprint's "one authoritative onboarding record" goal, and it is a
  precondition for F12/F13 being fixable in a durable way — fixing the
  field mapping is pointless on a path that never writes the record.

F15 [P1] The deterministic workout builder ignores onboarding data.
  Evidence: backend/services/workoutBuilderService.mjs:486-511 takes
  primaryGoal from the REQUEST BODY (routes/workoutBuilderRoutes.mjs:169,193;
  adminClientController.mjs:1650-1659 does not pass it at all). The client's
  stored goal is used only to print a disclaimer
  (workoutBuilderService.mjs:880-885). questionnaire.commitmentLevel and
  .trainingTier are placed on context.goals
  (backend/services/clientIntelligenceService.mjs:906-907) and read by
  nothing. The ONLY generation-affecting read of responsesJson is a
  three-pattern regex scan for pregnancy / older-adult / youth
  (clientIntelligenceService.mjs:97-122) feeding a safety gate
  (swanCoachPlanningSafetyGateService.mjs:91-97). ClientOnboardingCoverageItem
  rows are read by no generator at all.
  FIX-SCOPE: decide and document the intended contract — either the
  deterministic builder consumes the client's stored onboarding context
  (goal, experience, limitations, equipment) with trainer override as an
  explicit action, or the product accepts that it is a trainer-driven tool
  and the UI stops implying otherwise. Do not leave it ambiguous. If it
  should consume onboarding data, that is the highest-value product work in
  this document.

--- COACH / VOICE / SAVE TRUTH ---

F4 [P1] Voice submission reports success before the save completes.
  Evidence: frontend/src/components/WorkoutLogger/useWorkoutSubmit.ts:228-229
  — acknowledgeAIWorkoutEvent?.() then void handleSubmit(...) (un-awaited;
  the API call is at :147). The dispatcher is synchronous by spec
  (frontend/src/utils/aiWorkoutEvents.ts:113-130) and returns handled
  immediately; frontend/src/hooks/useCoachCommand.ts:148 captures that
  premature true; useWorkoutLoggerDictation.ts:94 renders it as a success
  receipt. Every failure branch fires AFTER the user was told it worked:
  session-balance :107, incomplete sets :111, 4xx :190, timeout :180,
  offline requeue :192.
  FIX-SCOPE: await the save before acknowledging; the ack must carry the
  real outcome (saved / queued-offline / failed-with-reason). This is the
  behavioral core of the whole program — a voice loop that lies about saving
  is worse than no voice loop.

F5 [P1] Idempotency lives on a route the logger never calls.
  Evidence: the logger submits to /api/workout-forms
  (frontend/src/services/nasmApiService.ts:711,735 ->
  backend/routes/dailyWorkoutFormRoutes.mjs), which contains NO
  clientRequestId reference. The machinery — backend/models/
  WorkoutSession.mjs:50, migration backend/migrations/20260718120000-add-
  client-request-id-to-workout-sessions.cjs, whitelist backend/controllers/
  workoutController.mjs:315-330, conflict-returns-existing backend/services/
  workoutService.mjs:238,252,274-282 — is on /api/workouts only. The offline
  queue replays identical entry.formData with no key
  (frontend/src/components/WorkoutLogger/useOfflineQueue.ts:98) — the exact
  duplicate-write path idempotency exists for.
  FIX-SCOPE: cross-route change. EITHER move the logger to the session route
  OR give /api/workout-forms the column + unique index + conflict-returns-
  existing semantics. Pick one and document why. Generate clientRequestId at
  draft creation and thread it through the offline queue so replays reuse
  it. A frontend-only fix is silently dropped — say so if you attempt it.

F3 [P1] The client Workout Logger Coach panel 403s on every send — and is
  default-open.
  Evidence: frontend/src/components/WorkoutLogger/
  WorkoutLoggerCoachTerminal.tsx:128 hardcodes context="workout_generation";
  the client allowlist at backend/routes/aiChatRoutes.mjs:322 omits it;
  rejection at :349-355. WorkoutLogger.tsx:602 mounts it unconditionally
  (selfMode is cosmetic copy only) and the panel is defaultOpen (:139).
  FIX-SCOPE: add a client-safe context to the allowlist (or downgrade the
  requested context for client callers) AND gate defaultOpen on Coach
  availability so clients never see a dead panel presented as the product's
  centerpiece.

F8 [P0] Confirmation substrate is non-durable, unsigned by default, and one
  path has no HMAC at all.
  Evidence: backend/services/ai/destructiveOperations.mjs:17 —
  pendingOps = new Map(). The "or Redis" comment at :110 is aspirational;
  no Redis path exists and Redis is commented out (render.yaml:276). Signing
  key at :12 — process.env.OPERATION_SIGNING_KEY || randomBytes(32) —
  feeding createHmac at :39. OPERATION_SIGNING_KEY appears in NO deploy
  manifest (render.yaml, render.env.example), so the random branch is the
  ONLY production branch. Worse: preparePendingConfirmation (:197) has no
  HMAC whatsoever — Map custody plus an owner-id check (:255). 120s TTL.
  Restart kills pending confirmations. Wired live via backend/services/ai/
  commandExecutor.mjs:27-30,510,536,804,934.
  FIX-SCOPE (hotfix half belongs in Slice 1 — do NOT wait for substrate
  work): add OPERATION_SIGNING_KEY to render.yaml + render.env.example, fail
  fast in production if unset (no random fallback), and HMAC every
  confirmation kind including preparePendingConfirmation. Durable storage is
  Slice 3.

F9 [P1] Three Coach runtimes, none shared; one shell hard-navigates out and
  lands the wrong role.
  Evidence: Shell A = UniversalDashboardLayout at /dashboard/*
  (frontend/src/routes/main-routes.tsx:940), Coach registered as a per-role
  route three times (UniversalDashboardLayout.routes.tsx:108 admin, :209
  trainer, :236 client). Shell B = UserDashboardV3 at /user-dashboard
  (main-routes.tsx:796-812) mounts no Coach and hard-navigates out
  (UserDashboard.V3.tsx:61-63). Third runtime: the SurfaceCoachDock family
  (frontend/src/components/CoachDock/, WorkoutPlannerCoachDock) with its own
  state/transport (useSurfaceCoachDock). DashBoard/v2/shell/DashboardShell is
  DEAD CODE (only importer: playgroundRegistry.ts:80).
  PANEL-MISSED: UserDashboardTeachCoachRoute.ts:1 hardcodes
  /dashboard/client/coach-assistant while /user-dashboard is reachable by any
  role (bare ProtectedRoute at main-routes.tsx:796) -> an admin or trainer
  clicking "Ask Coach" lands on the CLIENT Coach surface. PATH WARNING: the
  live shell-B file is frontend/src/components/UserDashboard/
  UserDashboard.V3.tsx; a stale archived copy under frontend/src/assets/
  user-dashboard/dashboard-export/ does NOT match these citations — do not
  edit it. Shell A resolves activeRole correctly
  (UniversalDashboardLayout.tsx:189).
  ALSO: an orphaned duplicate proposal-render tree —
  SwanCoachAssistantPage.tsx -> SwanCoachMessagesPanel.tsx:96 ->
  CoachMessage.tsx:171 — renders the same proposal cards on an unrouted
  surface.
  FIX-SCOPE: hotfix the role-resolved teach-coach route in Slice 1. The
  shell-B fate (adopt / absorb / retire UserDashboardV3) is an explicit
  DECISION GATE in Slice 5 — present the owner an evidence-backed
  recommendation; do not silently keep both. Delete or absorb
  SwanCoachAssistantPage during unification.

--- ONBOARDING CONTRACTS ---

F1 [P1] Admin onboarding 400s on every submit.
  Evidence: the backend guard requires fullName
  (backend/controllers/onboardingController.mjs:64-68) and .split(' ')[0] at
  :123-124,183-184 would throw regardless. The mounted admin wizard sends
  firstName/lastName and posts formData raw
  (frontend/src/pages/onboarding/ClientOnboardingWizard.tsx:612-613); grep
  for fullName under frontend/src/pages/onboarding/ returns zero hits. The
  client self path is IMMUNE (back-fill at onboardingController.mjs:354).
  frontend/src/services/adminClientService.ts:621
  (adminClientService.submitOnboarding), which posts a correctly-shaped
  payload to a different endpoint, has ZERO callers — dead code.
  FIX-SCOPE: admin/trainer path only. Map firstName+lastName -> fullName at
  the submit boundary (or relax the guard consistently across paths). Decide
  and document the fate of the dead service method. ALSO: in-app guidance at
  DashboardTeachMeGuide.adminOverviewRefiner.ts:34 links users to this broken
  surface — fix the link or the surface, never leave guidance pointing at a
  route that always fails.

F2 [P1] Coach-created clients silently lose questionnaire + coverage data,
  and the loss renders as success.
  Evidence: availability / limitations / pain notes survive only as merged
  free text in ClientTrainerAssignment.notes
  (backend/services/coachClientOnboardingDraftNormalizer.mjs:169-170) —
  unqueryable prose. Questionnaire responses and the coverage ledger are
  computed IN MEMORY and returned in the HTTP response
  (backend/services/coachClientOnboardingApprovalService.mjs:193-224) AFTER
  transaction.commit() at :188. No ClientOnboardingQuestionnaire.create and
  no ClientOnboardingCoverageItem write occur on this path. Also silently
  dropped: communicationStyle, motivationStyle, preferredContactMethod,
  nutritionPrefs, preferredTrainingDays.
  FIX-SCOPE: persist questionnaire + coverage + the dropped fields inside
  the transaction. Any field intentionally not persisted must be logged
  loudly, never returned to the UI as though it were saved. Combine with
  F12/F14 — these are the same disease.

F6 [P1] Sensitive drafts in plaintext localStorage, never purged on logout.
  Evidence: onboarding draft key swan.onboarding.draft
  (frontend/src/pages/onboarding/useOnboardingDraft.ts:33,110) — plaintext
  JSON of all eight sections including health/medical and emergency
  contacts, 30-day TTL, cleared only on successful submit. Workout draft key
  ss-workout-draft:${userId}:${clientId}:${date}
  (frontend/src/components/WorkoutLogger/useWorkoutDraft.tsx:32,64) embeds a
  client id, so trainer devices retain client-attributable data, 7-day TTL.
  No logout path touches either prefix:
  frontend/src/context/AuthContextProvider.tsx:338-367,
  frontend/src/utils/tokenCleanup.ts:36-52, authSlice.ts:172-182.
  (IndexedDB is E2EE key storage, e2eeCrypto.ts:64 — not drafts.)
  FIX-SCOPE: purge both prefixes on logout; minimize what is persisted
  (health/medical should not sit in plaintext for 30 days); shorten TTLs;
  consider sessionStorage for the workout draft.

--- AUTHORIZATION / PAYMENTS / CART ---

F7 [P0] A trainer can block calendar time under another trainer's ID;
  recurrence multiplies it; the correct guard is on a dead router.
  Evidence: the live route is POST /api/sessions/block
  (backend/routes/sessions.mjs:2064-2067, mounted backend/core/routes.mjs:418)
  and it passes req.body through raw. The guard middleware is role-only
  (backend/middleware/authMiddleware.mjs:540-542). The defect is
  backend/services/sessions/session.service.mjs:1260 —
    trainerId: trainerId || (user.role === 'trainer' ? user.id : null)
  — body wins over identity. Recurrence at :1243 turns one request into N
  blocked slots on the victim's calendar. The CORRECT guard exists at
  backend/routes/sessionRoutes.mjs:2737 but that router is shadowed and
  unreachable (core/routes.mjs:322-337,833), as is its correctly-scoped
  unblock (:2825-2829); sessions.mjs has no unblock equivalent. No test
  asserts block scoping.
  FIX-SCOPE: (a) immediately force trainerId = req.user.id for trainer-role
  callers on the LIVE router; (b) reconcile the shadowed router pair — merge
  the correct scoping and the unblock into the live router and retire the
  dead one, or document why both must exist; (c) add the missing scoping
  test. Do not "add validation" without resolving the shadow — the next
  agent will patch the dead file otherwise.

F10 [P2] Five payment webhook surfaces, no env switch — the real risk is
  configuration coverage, not double-fulfillment.
  Evidence: /webhooks/stripe and the /api/webhook/stripe alias
  (backend/core/routes.mjs:777,779), /api/cart/webhook
  (backend/routes/cartRoutes.mjs:974), /api/session-packages/webhook
  (backend/routes/sessionPackageRoutes.mjs:212), /api/subscriptions/webhook
  (separate secret). The canonical router binds two sub-paths to one handler
  (backend/webhooks/stripeWebhook.mjs:312,314). Cart double-fulfillment IS
  guarded — atomic claim at stripeWebhook.mjs:531-540, grantSessionsForCart
  returning alreadyProcessed under a row lock
  (backend/services/SessionGrantService.mjs:199), legacy mount delegating to
  canonical (cartRoutes.mjs:1040-1045) — but this was read statically, so
  treat it as "guarded on the cart path, unproven elsewhere." The apex
  /webhooks/* SPA-swallow hazard is FIXED (render.yaml:196-216); do not
  recount it as open.
  REAL residual risks: (a) endpoints fulfill DISJOINT metadata shapes
  (backend/services/sessionPackageCheckoutFulfillmentService.mjs:34-52 needs
  packageId+sessions; the canonical handler ignores anything without cartId
  or a known type, stripeWebhook.mjs:131) -> pointing Stripe at one URL
  silently un-fulfills the other product line, a dashboard-config fact
  invisible in code; (b) no cross-endpoint Stripe event.id dedupe ledger;
  (c) the hand-maintained express.json bypass list
  (backend/core/middleware/index.mjs:39-48) silently breaks signature
  verification for any future webhook not added to it.
  FIX-SCOPE: config-and-coverage, NOT rearchitecture. Add the event.id dedupe
  ledger; add a boot-time assertion/log of which webhook secrets are present;
  document the required Stripe dashboard URL set in the repo; add a test
  asserting every mounted webhook path is in the bypass list. DO NOT
  consolidate the mounts — naive consolidation drops a product line.

F11 [P2] The cart silent-failure is one layer below the components.
  Evidence: four pre-flight branches at
  frontend/src/context/CartContextProvider.tsx:107-128 setError + throw
  BEFORE the try block that owns the role="status" notification
  (frontend/src/context/cartNotification.ts:2-46), so they emit nothing. All
  five add-to-cart components otherwise toast; YourSpecialCard.tsx:61-70 has
  a bare catch{} whose comment correctly notes the context notifies.
  FIX-SCOPE: route pre-flight failures through the same notification
  channel. Leave YourSpecialCard's catch alone once the context covers all
  paths.

## 6. ARCHITECTURE DECISION (amended — supersedes the panel's spec)

ENDORSED DIRECTION: one authenticated Coach runtime; voice-first with manual
forms always available; every voice-originated write behind an explicit
Apply tap; durable server-side action state; read-back verification; one
authoritative onboarding draft shared by speech, typing and forms; adapter
order Logger -> Onboarding -> Planner. UI model: Quiet Rail (desktop), Thumb
Dock (mobile), Command Room (deep review). Routine success uses the standard
cyan accent; gold is reserved for warning / luxury / milestone; reuse the
existing Crystallize effect only for genuinely verified moments; completion
announcements are non-interruptive.

AMENDED PROPORTIONALITY (mandatory). The deployment is a SINGLE Render
instance with PostgreSQL and no Redis. Build the minimal trustworthy
substrate, not the panel's full ActionRun spec:

  - Idempotency = UUID column + unique index + conflict-returns-existing.
    The /api/workouts implementation is the in-repo reference.
  - Durable pending actions = ONE Postgres table (suggested pending_action:
    id, user_id, action_kind, payload, hmac, expires_at, status) replacing
    the pendingOps Map. The DB row IS the lease; its unique constraint IS
    the fence. No fencing tokens, no lease protocol.
  - Apply gate = ADOPT the existing machinery, do not rebuild it. Verified
    working, with the exact files to adopt FROM:
      approval call site: frontend/src/components/DashBoard/Pages/
        coach-assistant/CoachActionProposalCard.tsx:124 —
        const result = await approveCoachProposal(proposal.id, reviewToken);
      service:            frontend/src/services/coachProposalService.ts:105
        (defines approveCoachProposal)
      event-publish helper (NOT the approval path — do not mistake it for
        one): CoachActionProposalCard.logic.ts:12-21 (publishProposalAction,
        called at CoachActionProposalCard.tsx:127 AFTER approval returns)
      render site:        CoachCommandLogEntry.tsx:162
      payload lift:       CoachCommandCenter.chatResponse.ts:79-86
    and the staff voice->onboarding proposal lane
    (backend/services/ai/commandRegistry/clientCommands.mjs:34-45,
    commandDispatcher.mjs:228,
    backend/services/ai/dispatchers/clientOnboardingProposalDispatcher.mjs,
    CoachCommandCenter.voiceCapture.ts:82-85).
    THE LINE, stated explicitly: proposal cards and approval tokens are
    ADOPTED; the pendingOps confirmation substrate is REPLACED. Do not build
    a fourth Coach runtime or a parallel proposal renderer.
  - Read-back verifier = a distinct server re-read after write, rendered in
    the UI. NOT signed receipts. Defer hash-chained audit artifacts until a
    written trigger fires: multi-instance deploy, a demonstrated
    idempotency-violation incident, or offline-replay volume that requires
    durable fencing.
  - Route-family unification (F5) is a PREREQUISITE for logger idempotency.
    The contract must name the route explicitly.

## 7. GAP-CLOSURES AND ENHANCEMENTS (verify, then implement)

G2 Offline / gym-floor hardening. Beyond F5's keys: define and implement
  conflict semantics when the offline queue replays against state that
  moved. Server-wins-with-user-visible-diff is acceptable; silent overwrite
  is not. Surface queued-offline state distinctly from saved state.

G3 Concurrency policy. Trainer tablet plus client phone on one session or
  draft. Implement at minimum optimistic conflict detection on workout-log
  writes and a defined last-writer policy for drafts; document it.

G4 Voice parse correctness (the "225 for 5" heard as "22 for 55" class).
  The pre-Apply review card MUST render parsed load / reps / sets as
  first-class large-type fields, not buried in prose. Units (lb/kg) explicit
  per user preference. Exercise names matched against the canonical in-app
  exercise list with match confidence shown. Low-confidence parses visually
  flagged; never silently applied.

G5 Fast manual correction. Voice deletions are forbidden, so provide a
  one-tap manual undo/edit path for the most recent applied write, per
  surface. Define the window and the mechanism.

G6 Latency budget. Target utterance -> review card in <= 2 seconds on a
  healthy connection. If STT makes that impossible, state the measured
  number and design the degradation UX explicitly.

G7 Trust ledger ("did today's logs land?"). A per-day view listing
  everything written, by whom, via which input mode (voice / form / offline
  replay), with read-back mismatches flagged. This is a product feature
  feeding the progress-proof loop, not just ops tooling.

G8 Voice-first accessibility. Mic-permission failure states; noisy-gym
  degradation path; transcript always visible for review before Apply; every
  new Rail / Dock / Room surface meets the §3 constraints (44px, 4.5:1,
  reduced-motion); voice is never the only path to any action.

G9 Audio / transcript data lifecycle. Specify and implement where raw audio
  goes, retention, what is sent to which external provider, and what enters
  logs. Transcripts of client dictation contain PII (names, injuries, health
  notes), so the zero-PII-to-LLM constraint applies to transcripts — define
  the scrubbing boundary explicitly. Align with F6 draft minimization.

G10 Multi-client context. Trainer dictation must carry explicit client
  context, and the Coach must REFUSE an ambiguous target-client command
  rather than guess. Draft keys already embed clientId — extend that
  discipline to the command lane.

## 8. SLICED BUILD ORDER (parallel tracks where marked)

Every slice requires: file:line evidence of the change, the tests specified,
and a written proof (what you ran, what you observed). No slice ships
without its acceptance criteria met. Commit per slice; push per batch.

SLICE 0 — Verification report. No code.
  Confirm / refute F1–F15 with fresh file:line evidence. Report adjacent
  defects found while verifying (remember: the prior round graded a claim
  list, it did not sweep). State your recommendation on F15's contract
  question.
  ACCEPTANCE: written scoreboard covering all fifteen findings; F15
  recommendation stated with evidence.

SLICE 1 — Contract hotfixes (small, independent, high value).
  F1 (fullName mapping + dead-service decision + guidance link), F3
  (allowlist + defaultOpen gate), F7a (live-router ownership guard +
  scoping test), F8 hotfix half (OPERATION_SIGNING_KEY into render.yaml and
  render.env.example, fail-fast in production, HMAC on ALL confirmation
  kinds), F9 hotfix half (role-resolved teach-coach route), F11.
  ACCEPTANCE: admin onboarding returns 2xx; client Coach send does not 403
  (or the panel is gated closed); a test proves a trainer cannot pass another
  trainer's id; all confirmation kinds signed with a real key; teach route
  resolves per activeRole; pre-flight cart failures notify the user.

SLICE 2 — Truth of save. [Track A]
  F4 (await before ack; ack carries the real outcome), F5 (route decision
  documented, idempotency on the actual logger route, offline-queue keys),
  F6 (purge on logout, minimization, TTLs), G2 (offline replay conflict
  semantics — server-wins-with-visible-diff, queued state shown distinctly
  from saved state), G3 (optimistic conflict detection on workout-log
  writes plus a documented last-writer policy for drafts).
  ACCEPTANCE: a failing save surfaces failure and never success; replaying
  the same offline payload twice produces exactly one server row (test);
  logout leaves zero draft keys (test); a replay against moved state
  produces a visible diff rather than a silent overwrite (test); two
  concurrent writers to one log are detected, not silently merged (test).

SLICE 2' — Onboarding data integrity + dictation spike. [Track B, parallel]
  F12 (field-name reconciliation, injuries/limitations first, plus the
  no-silent-drop test), F13 (read from responsesJson or existing columns,
  plus the schema-drift test), F14 (single canonical write path). Then wire
  the EXISTING dictation pattern (JarvisVoiceMode and useNutritionDictation
  are the in-repo references — add no new dependency) into client
  onboarding, sharing one authoritative draft across speech, typing and
  forms, honoring G4's review-card rules.
  ACCEPTANCE: a typed injury demonstrably appears in the generated prompt
  payload (test or traced evidence); no wizard field drops silently (test);
  a client can dictate through onboarding sections, review parsed fields and
  apply; form entry remains fully functional; the draft is the same record
  either way.
  NOTE: this track carries the owner's stated top priority and the two P0
  safety findings. It runs in parallel with Slice 2, not behind it.

SLICE 3 — Minimal durable action substrate.
  pending_action table replacing pendingOps; adopt the proposal-card /
  approval-token machinery as the Apply gate; read-back verifier (a rendered
  re-read, not signed receipts); absorb the F8 hotfix into durable storage.
  ACCEPTANCE: a pending action survives a process restart (test: create,
  restart, confirm); expired actions refuse; double-apply is a no-op that
  returns the original result.

SLICE 4 — Program-generation contract.
  F2 (persist questionnaire / coverage / dropped fields in-transaction) and
  F15 per the Slice 0 recommendation, plus G9 lifecycle and G10 client-
  context discipline.
  ACCEPTANCE: a coach-created client round-trips all captured data queryably
  (test asserts DB rows, not the HTTP response); a generated program
  demonstrably consumes the client's onboarding fields (trace or test), or
  the trainer-driven contract is documented and the UI stops implying
  otherwise.

SLICE 5 — Retire the dead twins + one-runtime unification.
  This slice's theme is: every surface in this codebase that has a live copy
  and a dead/shadowed copy gets reconciled to one.
  F7b (reconcile the shadowed session router pair — merge the correct
  trainer scoping AND the correctly-scoped unblock from the dead
  sessionRoutes.mjs into the LIVE sessions.mjs, then retire the dead router,
  or document why both must exist. NOTE: F7a in Slice 1 stops the bleeding;
  this is the structural fix and it must not be skipped — an unreconciled
  shadow means the next agent patches the dead file and believes it shipped).
  Shell-B decision gate (evidence-backed recommendation to adopt / absorb /
  retire UserDashboardV3 — owner signs off), then converge on one Coach
  runtime with Quiet Rail / Thumb Dock / Command Room per §6; delete or
  absorb SwanCoachAssistantPage and the dead DashboardShell. G5, G6, G7, G8
  land here.
  ACCEPTANCE: one runtime serves both shells; zero imports of removed
  surfaces; exactly one reachable /block and one reachable unblock handler,
  both with ownership tests; the day-ledger renders voice / form / offline
  writes distinctly; the new surfaces pass an accessibility audit against §3.

SLICE 6 — Webhook coverage.
  F10 residual work: event.id dedupe ledger, boot-time secret assertion,
  documented dashboard URL set, bypass-list coverage test.
  ACCEPTANCE: a duplicate event.id delivery processes exactly once (test);
  a webhook path missing from the bypass list fails a test loudly.

SLICE 7 — Release gate.
  Re-run full verification against the new HEAD; certify the SHA; land any
  reconstructed blueprint artifacts into the repo.
  ACCEPTANCE: every F- and G-item closed with evidence or explicitly
  deferred with owner sign-off.

## 9. FORBIDDEN ACTIONS

- No Next.js anything. No new frameworks or runtime dependencies without a
  written blocker justification naming the rejected in-repo alternative.
- No Material-UI, no hardcoded hex, no Galaxy-Swan tokens (#0a0a1a,
  #00FFFF, #7851A9), no files over 300 lines, no Recharts.
- No voice-executed payments, auth/role changes, deletions, or
  bulk/irreversible operations — including in new code you write.
- No PII to LLMs (IDs and roles only) — including voice transcripts (G9).
- No destructive database operations. Backfilling the bad masterPromptJson
  blobs from F13 requires explicit owner approval before execution.
- Do not consolidate the five webhook mounts.
- Do not recount the fixed apex /webhooks/* SPA-swallow hazard as open.
- Do not build a fourth Coach runtime or a parallel proposal-card renderer.
- Do not build leases, fencing tokens, or signed receipts beyond §6's
  minimal substrate unless a written trigger condition has been met.
- Do not invent file paths, line numbers, symbols, or APIs. Label inference
  [INFERENCE]. If you cannot verify something, say so and proceed from code.
- Do not claim work is done without current-session proof (command output,
  a passing test that exercises the real caller path) plus a hostile review
  pass that came back clean. "Should work" is not done.
- Do not soften findings or silently descope acceptance criteria. Deferrals
  require explicit owner sign-off and must be stated as deferrals.

## 10. REQUIRED OUTPUT FORMAT

Deliver in order:
  1. WORKING-BASE REPORT: branch, distance from origin/main, chosen base,
     lane claims made.
  2. SLICE 0 VERIFICATION REPORT: scoreboard of F1–F15 (confirmed /
     refuted / corrected, each with fresh file:line), G2–G10 verification
     notes, your F15 recommendation, and any newly discovered defects.
  3. IMPLEMENTATION PLAN: per-slice approach, files to be touched, estimates
     labeled [ESTIMATE], and the Track A / Track B parallelization.
  4. PER-SLICE BUILD REPORTS: diff summary, evidence, tests added,
     acceptance criteria checked off one by one, deviations flagged.
  5. FINAL CERTIFICATION: closed / deferred status of every F- and G-item,
     the certified SHA, and everything deferred with reasons.

Repository truth outranks this document. When they disagree, follow the repo
and say so.
================================================================================
