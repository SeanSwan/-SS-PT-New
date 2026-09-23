---
decision: Master prompt v2 — six-round review chain consolidated; F14 corrected per GPT-5.6; architecture re-based on the existing coach_action_proposals substrate; charter/slices governance split
status: open
supersedes: docs/ai-workflow/AI-HANDOFF/SWAN-COACH-ONBOARDING-MASTER-PROMPT-2026-08-12.md
---

# MASTER PROMPT V2 — SwanStudios Coach / Onboarding Remediation + Build

> **Assembled:** 2026-08-12 · **Repo truth:** `origin/main` (citations re-verified today; bound near `0bff35fc8`..`4d01e5140`, intervening commits do not touch audited surfaces)
> **Chain:** GPT-class audit → self-review → paid panel (Opus 5/Kimi K3/HY3/Fable seat/Village) → Fable hostile verification → Kimi meta-review → GPT-5.6 counter-review → Kimi + HY3 + Fable adjudication of the counter-review → this consolidation.
> **Everything below the line is the prompt.**

## Provenance notes for Sean (NOT part of the prompt)

- GPT-5.6's counter-review was **substantially right**: 8 of 10 corrections conceded outright. Its headline catch — my F14 was false; a service abstraction (`persistCompletedOnboardingQuestionnaire`) persists the questionnaire on the staff path — is confirmed line-for-line. My error class: treating absence of a grep string as absence of behavior.
- Kimi ($0.12) and HY3 ($0.0035) both convicted GPT on **sequencing**: its plan gated a live, exploitable authorization defect behind owner dashboard checks and a full CI build. Both overruled GPT's severity call on the false save receipt — for a product whose core loop is the trusted workout record, silent save-loss is P0.
- Kimi flagged three GPT assertions as unverified; on checking, `dateOfBirth`-vs-`age` **verified true** (wizard `BasicInfoSection.tsx:95` vs transform `onboardingMasterPromptBuilder.mjs:28`); the v3/v5 *shape-divergence details* and `coach_intake_items/events` *capability claims* remain unverified → carried as verify-or-strike items in the charter.
- One false finding was caused by my own packet wording (Kimi accused GPT of stealing credit for the injection finding; injection was genuinely GPT's contribution). Recorded; no action.

---

================================================================================
MASTER PROMPT V2 — SwanStudios Coach/Onboarding Remediation + Build
You have repo access. You have no memory of any prior conversation. This
document is the complete spec. Where it says VERIFY, verify against mounted
code and report. Repository truth outranks this document — when they
disagree, follow the repo and say so.
================================================================================

## 0. BEFORE YOU READ CODE

The local working tree may be on a stale branch far behind `origin/main`.
REQUIRED FIRST ACTIONS: (1) `git fetch origin main`; (2) read code via
`git show origin/main:<path>` / `git grep <pattern> origin/main -- <path>`
until your working base is provably current; (3) report branch, distance
from origin/main, and chosen base before any other work.

Other agents may work this tree in parallel. Before editing any file, check
`.ai-workflow/coordination/*.lane.md` for locks; claim your files in your
own lane; never `git add -A`. `main` auto-deploys to production on push.

## 1. GOVERNANCE — TWO PHASES, SEPARATELY AUTHORIZED

PHASE A — VERIFICATION CHARTER (read-only for product code).
  You may: read, trace, enumerate, write failing-test SPECIFICATIONS, write
  reports. You may NOT: commit product-code changes, run migrations, push,
  deploy, or "fix while you're in there."
  Deliverables in §7. Phase A ends with the owner decision list.

PHASE B — IMPLEMENTATION SLICES (each separately approved).
  One PR-sized slice at a time from §8, in order unless the owner reorders.
  Every slice: exact files, tests that prove it, rollback note, no
  production push without approval, no migration against production without
  explicit approval. Slice B1 (authz hotfixes) may be approved
  simultaneously with the charter — it must not wait for full charter
  completion (see §8 rationale).

## 2. PRODUCT CONTEXT

Roles: admin (the owner — a working trainer), trainer, client. Trainer-led
B2B2C. The coaching record (programs, assignments, logs, notes, adherence)
is first-party and canonical.

Owner's vision (verbatim intent): "Dictation first. As I dictate to the
Swan Coach, it changes the UI/UX and logs workouts. Manual forms are the
always-available fallback. Onboarding is where I pour all my data so we can
build customized workouts based on the client's goals and history."

Product loop: log workout -> save -> charts/progress proof -> next training
action -> shareable milestones. The single most corrosive defect class for
this product is a record the trainer BELIEVES saved that did not.

## 3. HARD CONSTRAINTS (reject any plan violating these)

- Vite + React Router + React 18 + TypeScript + styled-components. NOT
  Next.js (a prior reviewer hallucinated Next.js files).
- No Material-UI; styled-components with var(--token, #fallback); no
  hardcoded hex; dark-first Crystalline Swan; retired Galaxy-Swan tokens
  (#0a0a1a, #00FFFF, #7851A9) never appear; 44px touch targets; WCAG
  4.5:1; prefers-reduced-motion; files <= 300 lines; Victory (no Recharts).
- ZERO new frameworks or runtime dependencies without a written blocker
  justification naming the rejected in-repo alternative.
- TOPOLOGY-INDEPENDENT PERSISTENCE: deployment topology is UNKNOWN —
  render.yaml declares itself inert and non-authoritative (render.yaml:9-11).
  Never assume single-instance; never require Redis. Use PostgreSQL
  transactions, unique constraints, conditional updates, and idempotency
  keys that are safe on one OR many instances. In-process state for
  cross-request workflows is forbidden in new code.
- PRIVACY (replaces "IDs and roles only"): NO direct identifiers to model
  providers (names, contact info, DOB, exact addresses). The minimum
  necessary, consented, de-identified training/safety context (goals,
  injuries, pain, experience, equipment) MAY be sent via an explicit
  ALLOWLISTED payload — the de-identification service is a denylist today
  (deIdentificationService.mjs); the target state is an allowlist
  projection with an auditable outbound-field list. Client aliases remain
  pseudonymous, not anonymous. Audio boundary: text redaction after cloud
  STT does not protect audio already sent — the audio/transcript provider
  path, retention, and consent must be documented before any expansion of
  voice surfaces.
- APPLY FOLLOWS THE ACTION, NOT THE INPUT: any AI-originated mutation —
  voice OR typed — requires preview + explicit Apply. AI read/navigation
  needs no Apply. AI form-preparation must be reversible preview. Manual
  form saves keep their normal confirmation contract. Financial / auth /
  role / destructive actions never execute through the AI lane at all.
- No destructive DB work without explicit owner approval; migrations
  reversible; no sync({force}); no unbounded UPDATE/DELETE.
- PROMPT-INJECTION POSTURE (new, mandatory before widening any model
  payload): client-authored free text is EVIDENCE, never instruction.
  Structured fields wherever possible; untrusted-data delimiters around
  client text in prompts; injection test strings in the test suite;
  deterministic safety filters that do not depend on model output.

## 4. PROVENANCE — HOW MUCH TO TRUST WHAT FOLLOWS

- Findings below survived a six-round adversarial chain, but the chain
  graded claims more than it swept cold, and its two worst errors were
  execution-shaped (a false-absence from literal grep; a guarded handler
  on a dead router found by luck). Treat citations as high-confidence
  pointers, not gospel; re-anchor on mismatch and report it.
- VERIFY-OR-STRIKE (asserted upstream, not yet evidence-backed): (a) the
  specific v3/v5 shape divergences (client vs clientProfile, training vs
  fitnessBackground, health.injuries vs painAndInjuries); (b)
  coach_intake_items / coach_intake_events capabilities. Verify before
  building on either.
- The panel's original nine artifact documents exist only outside this
  repo. THIS document is the spec.

## 5. FINDINGS MATRIX (corrected; verify each fresh in Phase A)

Severity scale: P0 = exploitable authz, silent core-loop data loss, unsafe
program generation, payment loss, active privacy breach. P1 = broken core
workflow, non-durable confirmation, incomplete personalization, release
blocker. P2 = orphans, messaging, cleanup.

--- P0 ---

F7 [P0 — ships first] Trainer can block another trainer's calendar; the
  guard exists only on a dead router.
  Live: POST /api/sessions/block (routes/sessions.mjs:2064-2067, mounted
  core/routes.mjs:418) passes req.body raw; role-only guard
  (authMiddleware.mjs:540-542); defect session.service.mjs:1260
  (`trainerId: trainerId || (user.role === 'trainer' ? user.id : null)` —
  body wins); recurrence :1243 multiplies. Correct guard on SHADOWED
  router: sessionRoutes.mjs:2737 (+ scoped unblock :2825-2829), unreachable
  per core/routes.mjs:322-337,833. No scoping test exists.
  FIX: derive trainerId from the authenticated session for trainer-role
  callers on the LIVE router NOW (hotfix); reconcile/retire the shadowed
  pair in B9 (a surviving dead twin invites the next agent to patch the
  wrong file); add the scoping test.

F4 [P0 — core-loop truth] Voice workout submission acks success before the
  un-awaited save; failures fire after "handled."
  useWorkoutSubmit.ts:228-229 (`acknowledgeAIWorkoutEvent?.(); void
  handleSubmit(...)`, API await at :147); synchronous dispatcher
  aiWorkoutEvents.ts:113-130; premature true captured useCoachCommand.ts:148;
  rendered as success useWorkoutLoggerDictation.ts:94. Failure branches
  (balance :107, incomplete :111, 4xx :190, timeout :180, offline :192)
  all post-ack.
  FIX: await before ack; ack carries the real outcome (saved /
  queued-offline / failed-with-reason). AND (new, from adjudication): the
  spoken utterance must be DURABLY CAPTURED before processing so a failed
  save is retryable — a loud failure that still evaporates the trainer's
  words is not acceptable for a dictation-first product. Candidate store:
  the existing intake tables (verify capabilities first, §4).

F12 [P0 — safety contract] Onboarding-captured safety data is silently
  dropped or malformed before reaching the onboarding-derived AI context.
  Wizard collects `injuries` (HealthSection.tsx:106); transform reads
  `pastInjuries` (onboardingMasterPromptBuilder.mjs:65) -> health.injuries
  always empty. Also: `doctorClearance` vs `doctorCleared` (:62);
  `dateOfBirth` collected (BasicInfoSection.tsx:95) while the transform
  reads `formData.age` (:28) [VERIFIED]; `yes()` at :22 is
  `value === 'yes'` — real STT emits "Yes.", "Yeah", "Yep", so the
  dictation path fails this check ~always; ~12 further field-name drops
  (movementLimitations, trainingExperience, activityLevel, typicalDiet,
  mealsPerDay, customGoal, sessionsPerWeek, trainingPackage...).
  SCOPE HONESTY: generation separately loads pain entries, waiver records,
  movement analyses — independent safety sources exist; the onboarding
  CONTRACT is what is broken. Do not claim "the AI never sees injuries."
  FIX: not renames — ONE shared structured intake schema (PAR-Q style:
  boolean|unknown fields, InjuryIntake[], MovementLimitation[], clearance
  enum, explicit units), consumed identically by form, validation,
  persistence, Coach extraction, and generation. Interim hotfix in B3;
  full schema in B6. A no-silent-drop test: every wizard field maps to a
  schema path or is explicitly listed as intentionally unmapped.

F13 [P0] The auto-build fallback reads six columns that do not exist and
  persists the all-defaults result.
  masterPromptBuilder.mjs:257-270 reads secondaryGoals/goalNotes/
  experienceLevel/activityLevel/preferredExercises/dislikedExercises; the
  model + migration define only userId/createdBy/questionnaireVersion/
  status/responsesJson/primaryGoal/trainingTier/commitmentLevel/healthRisk/
  nutritionPrefs/completedAt. Every read is undefined -> 'beginner' +
  empties, persisted back via aiWorkoutController.mjs:366 (freezing it).
  responsesJson — which holds the real answers — is never opened here.
  The v5 builder IS reachable (imported by aiWorkoutController and
  longHorizonController) — this is live behavior, not dead code.
  FIX: read responsesJson or existing columns; schema-drift test asserting
  every field the builder reads exists on the model. Backfill of already-
  frozen wrong blobs is DESTRUCTIVE-ADJACENT: owner approval required.

--- P1 ---

F14 [P1 — REWRITTEN after counter-review; supersedes all prior F14 text]
  Staff onboarding: blocking contract mismatch, then non-atomic racy
  persistence. NOT a missing questionnaire write.
  The staff path DOES persist both artifacts: onboardingController.mjs:139
  and :206 call persistCompletedOnboardingQuestionnaire
  (onboardingCompletionPersistenceService.mjs:38-52), which does
  findOne(userId, latest) -> update-or-create. The real defects:
  (a) BLOCKING: admin wizard sends firstName/lastName raw
      (ClientOnboardingWizard.tsx:612-613); backend requires fullName
      (onboardingController.mjs:64-68; would throw at :123-124,:183-184).
      400 fires before ANY persistence. Client self path immune (:354
      back-fills).
  (b) NON-ATOMIC: user write, questionnaire upsert, pii write, automation
      are separate operations — partial completion possible. The helper
      takes no transaction.
  (c) RACE: no unique userId constraint on the questionnaire (normal index
      only) — concurrent submissions can create duplicate "current" rows.
  (d) PATH C: clientOnboardingController.mjs:191-226 writes ONLY the
      questionnaire row, never masterPromptJson — data entered there
      reaches no generator.
  FIX: fullName mapping at the submit boundary (B3 hotfix); wrap staff
  completion in one transaction + partial-unique "current" constraint
  (B4); route Path C through the same completion service (B4).
  LESSON ENCODED FOR YOU, THE BUILDER: the prior reviewer "proved" the
  questionnaire write absent by grepping for a literal .create() call and
  missed the service abstraction. Absence claims require call-graph
  tracing (who can write this table?), never string matching.

F1 [P1] Admin onboarding 400s on every submit (the F14(a) mismatch, plus:
  in-app guidance links to the broken surface —
  DashboardTeachMeGuide.adminOverviewRefiner.ts:34; dead correctly-shaped
  adminClientService.submitOnboarding (adminClientService.ts:621), zero
  callers — decide wire-or-delete).

F2 [P1] Coach-created clients (proposal approval path) drop questionnaire +
  coverage: computed in memory and returned AFTER transaction.commit()
  (coachClientOnboardingApprovalService.mjs:193-224, commit :188) — loss
  renders as success. Availability survives only as free text in
  ClientTrainerAssignment.notes (coachClientOnboardingDraftNormalizer.mjs:
  169-170). Also dropped: communicationStyle, motivationStyle,
  preferredContactMethod, nutritionPrefs, preferredTrainingDays.
  FIX: persist inside the transaction (B4, same slice as F14 atomicity).

F3 [P1 — hotfix slice] Client Workout Logger Coach panel 403s on every
  send and is default-open: WorkoutLoggerCoachTerminal.tsx:128 hardcodes
  context="workout_generation"; client allowlist aiChatRoutes.mjs:322
  omits it; 403 at :349-355; mounted unconditionally WorkoutLogger.tsx:602;
  defaultOpen :139. FIX: client-safe context or role-downgrade + gate
  defaultOpen on availability (B1 — never show a dead panel as the
  product's centerpiece).

F5 [P1] Idempotency lives on a route the logger never calls: logger ->
  /api/workout-forms (nasmApiService.ts:711,735 ->
  dailyWorkoutFormRoutes.mjs, zero clientRequestId); machinery on
  /api/workouts only (WorkoutSession.mjs:50; migration
  20260718120000-add-client-request-id-to-workout-sessions.cjs;
  workoutController.mjs:315-330; workoutService.mjs:238,252,274-282).
  Offline queue replays identical formData keyless (useOfflineQueue.ts:98).
  FIX (B2): pick the route, document why; key generated at draft creation,
  threaded through offline replay; frontend-only fix is silently dropped.

F8 [P1 structural / hotfix half in B1] Confirmation substrate: in-process
  Map (destructiveOperations.mjs:17; "or Redis" comment :110 aspirational);
  signing key falls back to randomBytes (:12) and OPERATION_SIGNING_KEY is
  in NO deploy manifest; preparePendingConfirmation (:197) has no HMAC at
  all (custody + owner check :255); 120s TTL; wired live
  (commandExecutor.mjs:27-30,510,536,804,934).
  HOTFIX (B1): key into deploy config, fail-fast in prod if unset, HMAC
  all kinds. NOTE (adjudicated): the key alone does NOT fix this — the
  Map itself violates the topology-independence constraint (dies on
  restart; diverges across instances). STRUCTURAL FIX (B7): migrate
  pendingOps into the durable proposal substrate (§6).

F6 [P1] Plaintext drafts, never purged: swan.onboarding.draft
  (useOnboardingDraft.ts:33,110 — all 8 sections incl. health + emergency
  contacts, 30-day TTL); ss-workout-draft:${userId}:${clientId}:${date}
  (useWorkoutDraft.tsx:32,64 — client-attributable on trainer devices,
  7-day TTL); no logout path touches either prefix
  (frontend/src/context/AuthContextProvider.tsx:338-367,
  tokenCleanup.ts:36-52, authSlice.ts:172-182).
  FIX (B2): purge on logout AND account-switch AND role-switch; minimize
  (health/medical out of long-lived plaintext); shorten TTLs; direction =
  server-synced drafts while online + minimized offline store. Client-side
  encryption is OPTIONAL and only if cheap (WebCrypto, non-extractable):
  it defends against casual device inspection only — never claim more.
  sessionStorage is NOT the fix (dies with the tab; gym-floor recovery
  matters).

F9 [P1] Three Coach runtimes, none shared; cross-shell role bug: shell A
  UniversalDashboardLayout (main-routes.tsx:940; per-role coach routes
  UniversalDashboardLayout.routes.tsx:108,209,236); shell B UserDashboardV3
  (main-routes.tsx:796-812) mounts no Coach and hard-navigates via
  UserDashboardTeachCoachRoute.ts:1 hardcoded to
  /dashboard/client/coach-assistant behind a bare ProtectedRoute
  (main-routes.tsx:796) -> admins/trainers land on the CLIENT coach.
  Third runtime: SurfaceCoachDock family. DashBoard/v2 shell is dead
  (playgroundRegistry.ts:80 only). Orphaned duplicate proposal renderer:
  SwanCoachAssistantPage -> SwanCoachMessagesPanel.tsx:96 ->
  CoachMessage.tsx:171. PATH WARNING: live shell-B file is
  frontend/src/components/UserDashboard/UserDashboard.V3.tsx; a stale
  archived copy under frontend/src/assets/ does not match citations.
  FIX: role-resolved teach route in B1; shell-B fate = OWNER DECISION
  (charter); unify + delete orphans in B9.

F16 [P1 — root cause class] Master-prompt schema fragmentation: v3.0
  transform (onboardingMasterPromptBuilder.mjs:206) vs v5.0 fallback
  builder (masterPromptBuilder.mjs:241), both live. F12/F13 are symptoms.
  FIX (B6): ONE canonical versioned ClientTrainingContext — shared
  validator, v3/v5 source adapters, legacy-read compatibility, one write
  version, provenance + schema version stamped into every generated plan's
  evidence, migration/backfill rules (backfill owner-gated). Verify the
  claimed shape divergences first (§4 verify-or-strike).

F17 [P1] Prompt-injection boundary (client free text -> model context;
  de-identification is identity-scrubbing, not instruction sanitization).
  FIX (B6, before widening any outbound payload): §3 injection posture +
  injection-string tests.

F18 [P1 — blocks B7] Approval-authorization matrix is missing: the
  proposal substrate scopes claim/approval to created_by_user_id
  (coachActionProposalPersistenceService.mjs:41-60) — creator approves own
  proposal. Generalized app-wide, that lets a client self-approve an
  AI-originated mutation, which guts the Apply gate. A per-role matrix
  (who may apply which proposal type for which subject; self-approval
  banned where it matters) MUST precede any generalization.

F19 [P1] De-identification denylist will rot: every new intake field can
  silently bypass it. FIX (B6): regression corpus asserting outbound
  payloads contain no direct identifiers + a routing check that new intake
  fields pass through the de-id boundary. (Also note: the denylist
  "preserves" injuries/pain — but F12 means what it preserves is currently
  EMPTY. Fixing F12 makes F19 matter more, not less.)

F21 [P1] Parallel safety loaders need a retirement plan: generation loads
  pain entries / waivers / movement analyses independently of the
  onboarding context; B6 adds a canonical context. Specify which source
  wins during transition and when parallel paths are deleted — two
  drifting safety sources are worse than one broken one.

--- P2 ---

F10 [P2] Five webhook surfaces (core/routes.mjs:777,779; cartRoutes.mjs:974
  + delegation :1040-1045; sessionPackageRoutes.mjs:212; subscriptions
  separate secret; canonical dual-bind stripeWebhook.mjs:312,314). Cart
  double-fulfillment guarded (atomic paymentAppliedAt claim :531-540;
  SessionGrantService.mjs:199 row-lock replay) — statically read; treat as
  guarded-on-cart-path, unproven elsewhere. Apex SPA-swallow FIXED
  (render.yaml:196-216) — do not recount. Real risks: disjoint metadata
  shapes (sessionPackageCheckoutFulfillmentService.mjs:34-52 vs
  stripeWebhook.mjs:131) = config-coverage exposure; no cross-endpoint
  event.id dedupe; hand-maintained express.json bypass list
  (core/middleware/index.mjs:39-48).
  FIX (B10): event.id dedupe ledger; boot-time secret assertion;
  documented Stripe URL set; bypass-list coverage test. Consolidation is
  NOT banned forever: inventory event types + metadata contracts, add
  idempotency + coverage tests, and a PROVEN canonical dispatcher may
  then be adopted. Never consolidate blind.

F11 [P2] Cart silent pre-flight failures: CartContextProvider.tsx:107-128
  setError+throw before the try that owns the role="status" notification
  (cartNotification.ts:2-46); YourSpecialCard.tsx:61-70 bare catch{}.
  FIX (B1): route pre-flight failures through the notification channel.

F15 [P1 — OWNER DECISION] Deterministic builder ignores onboarding: goal
  from request body (workoutBuilderService.mjs:486-511;
  workoutBuilderRoutes.mjs:169,193; adminClientController.mjs:1650-1659
  passes none); stored goal only prints a disclaimer (:880-885); sole
  generation-affecting responsesJson read = 3 safety regexes
  (clientIntelligenceService.mjs:97-122 -> safety gate
  swanCoachPlanningSafetyGateService.mjs:91-97); commitmentLevel/
  trainingTier/coverage rows read by no generator.
  DECISION for the owner: builder consumes canonical onboarding context
  with explicit trainer override, or stays trainer-driven and the UI stops
  implying otherwise. Implement per verdict in B6/B8.

## 6. ARCHITECTURE DECISION (v2 — supersedes v1's §6)

ENDORSED: one authenticated Coach runtime; voice-first, manual forms
always; Apply on every AI-originated mutation (any input mode); durable
server-side action state; read-back verification (a distinct server
re-read rendered in the UI — NOT signed receipts); one authoritative
onboarding record; adapter order Logger -> Onboarding -> Planner; Quiet
Rail / Thumb Dock / Command Room; cyan for routine success, gold reserved,
Crystallize only for verified moments; non-interruptive completions.

SUBSTRATE (corrected): do NOT build a new pending_action table. The repo
already has a durable encrypted action system — coach_action_proposals:
encrypted payloads (coachActionProposalService.mjs:11,197), lifecycle
PENDING/APPLYING/APPROVED/APPLIED/REJECTED/FAILED (:20-27), 9 proposal
types (:29-39), review tokens (coachActionProposalApprovalService.mjs:69,
83), atomic claim via conditional UPDATE...RETURNING
(coachActionProposalPersistenceService.mjs:41-60), applied_result_json,
intake linkage. Plan of record:
  1. Gap analysis (charter): proposal substrate vs pendingOps vs the
     desired app-wide contract — including the intake tables'
     verify-or-strike items.
  2. Extend the proposal substrate: action family/command type; entity id
     + entity version; expiry; client idempotency key; verification
     status + evidence; retention rules.
  3. F18 approval matrix FIRST (blocks generalization).
  4. Migrate destructiveOperations pendingOps into it; delete the Map.
  5. applied_result_json policy BEFORE it becomes the universal receipt:
     what may be stored, retention, minimization (IDs + hashes over
     duplicated health data), who may read receipts.
All of it topology-independent (PG row is the lease; unique constraint is
the fence; conditional update is the claim — the pattern the substrate
already uses).

## 7. PHASE A CHARTER DELIVERABLES

A1 Working-base report (§0) + lane claims.
A2 Fresh findings scoreboard: confirm/refute/correct F1-F21 with fresh
   file:line; run the §4 verify-or-strike list; report adjacent defects
   (the chain graded claims; you sweep).
A3 MOUNTED ROUTE TABLE: boot or statically walk core/routes.mjs; dump
   every mounted route in order; assert every guarded handler is the one
   actually serving its path; enumerate ALL shadowed/dead routers (the
   block-time shadow was found by luck — audit the class).
A4 Builder reachability: which callers reach the v3 transform vs the v5
   fallback; sizes the F16 migration.
A5 Execution-harness SPEC (no new deps): docker-compose Postgres -> clean
   migrate -> boot -> four probes: (i) onboarding submit through
   prompt-build asserting safety fields present; (ii) voice submit with DB
   killed mid-save asserting no success ack + recoverable transcript;
   (iii) signed Stripe event replay incl. duplicate event.id; (iv) route
   table dump diffed against A3. Every major miss in this chain would have
   been caught by one of these.
A6 OWNER DECISION LIST (each with your evidence-backed recommendation):
   shell-B fate (adopt/absorb/retire UserDashboardV3); canonical workout
   route (F5); F15 contract; F13 backfill; applied_result_json retention;
   webhook consolidation posture.
   OWNER OPS ASKS (parallel, non-blocking for B1-B5): live Render service
   inventory + instance count; Stripe dashboard webhook URL set;
   OPERATION_SIGNING_KEY provisioning. These gate only topology-sensitive
   and webhook slices.
A7 Failing characterization-test SPECIFICATIONS for every P0/P1 (specs in
   the charter; implementations land inside their slices).

## 8. PHASE B SLICES (each separately approved; acceptance = proof, not prose)

RATIONALE (adjudicated over GPT's staging): hotfixes for exploitable authz
and core-loop truth ship FIRST with targeted tests through today's CI;
they do not wait for owner dashboard checks or a full release gate.
The release gate lands as B5 — before any large structural slice, after
the bleeding stops.

B1 — Hotfixes (may run parallel to charter completion).
  F7 live-router trainerId from session; F3 client context + defaultOpen
  gate; F8 hotfix half (key provisioned, fail-fast, HMAC all kinds); F9
  role-resolved teach route; F11 pre-flight notifications; F1 fullName
  mapping + guidance link + dead-service decision.
  PROOF: request-level tests — cross-trainer block returns 4xx and writes
  nothing; client coach send succeeds or panel gated closed; unsigned/
  wrong-key confirmation rejected; teach route resolves per role; a
  pre-flight cart failure notifies; admin onboarding returns 2xx.

B2 — Truth of save.
  F4 await-before-ack + durable utterance capture; F5 idempotency on the
  actual route + offline-queue keys; F6 purge/minimize.
  PROOF: fault-injection test (DB down mid-save) -> failure surfaced, zero
  success acks, transcript recoverable; duplicate replay -> exactly one
  row; logout/account-switch/role-switch -> zero draft keys.

B3 — Onboarding contract hotfix.
  F12 interim: injuries/pastInjuries, doctorClearance/doctorCleared,
  dateOfBirth->age, yes() normalization (trimmed, case-insensitive,
  STT variants "Yes."/"Yeah"/"Yep"); no-silent-drop test.
  PROOF: one characterization test posts the real wizard payload and
  asserts the persisted questionnaire row AND the built master-prompt JSON
  both contain the injury + clearance + age data.

B4 — Onboarding atomicity.
  F14(b)(c): one transaction around staff completion; partial-unique
  "current questionnaire" constraint; F14(d)+F2: Path C and the coach
  approval path route through the same completion service, persisting
  inside the transaction.
  PROOF: concurrent double-submit -> exactly one current row; injected
  mid-write failure -> no partial state; coach-created client round-trips
  questionnaire + coverage queryably (DB rows, not HTTP echo).

B5 — Minimal release gate (implements A5).
  Clean-DB migrate + boot + the B1-B4 characterization tests + route-table
  assertion as ONE required commit status.
  PROOF: CI fails on regression of any B1-B4 item or when a guarded
  handler is not the live-mounted one.

B6 — Canonical context + injection controls.
  F16 ClientTrainingContext (+adapters, provenance, validator); F12 full
  structured intake schema; F17 injection posture + tests; F19 de-id
  regression corpus; F21 loader-retirement plan; F15 per owner verdict.
  PROOF: synthetic injury traverses wizard -> schema -> BOTH builders ->
  generation context (test); injection strings neutralized (test); de-id
  corpus green; one documented winner per safety-context source.

B7 — Action-substrate unification.
  §6 plan: gap analysis ratified, F18 approval matrix implemented, extend
  proposal table, migrate pendingOps, delete the Map, receipt
  retention policy.
  PROOF: pending action survives restart (create -> restart -> apply);
  double-apply no-op returns original result; cross-role approval matrix
  enforced by tests (client cannot self-approve a plan_edit); zero
  remaining pendingOps references.

B8 — Dictation-first surfaces (the owner's product priority).
  Onboarding voice-to-draft + workout voice-to-draft on the proposal/Apply
  gate, using in-repo dictation patterns (JarvisVoiceMode,
  useNutritionDictation — no new deps). G-series UX from v1 carries
  forward: parsed load/reps as first-class large-type fields with explicit
  units and match-confidence; low-confidence never silently applied;
  one-tap undo/edit of the last applied write; utterance -> review card
  <= 2s target measured, degradation UX designed; mic-permission +
  noisy-gym failure states; transcript always visible pre-Apply; explicit
  client-context required, ambiguous target refused; per-day trust ledger
  (voice/form/offline provenance per write, read-back mismatches flagged).
  PROOF: at 320/375/414px — dictate onboarding section and a workout set,
  see structured draft, Apply, verify persisted row; zero horizontal
  overflow; reduced-motion pass; latency measured and reported.

B9 — One-runtime unification + dead-twin retirement.
  Shell-B per owner decision; converge Coach runtimes; delete/absorb
  SwanCoachAssistantPage + dead DashboardShell; retire the shadowed
  session router (F7 structural half).
  PROOF: one runtime both shells; zero imports of removed surfaces;
  exactly one reachable /block + unblock, both ownership-tested.

B10 — Webhook coverage (owner ops input needed).
  F10 fixes; consolidation only per owner posture + proven dispatcher.
  PROOF: duplicate event.id processes once; missing bypass-list path fails
  a test; documented URL set matches dashboard (owner-verified).

## 9. FORBIDDEN ACTIONS

- No Next.js; no new frameworks/deps without written blocker justification.
- No new pending_action table (extend the proposal substrate per §6).
- No single-instance or Redis-present assumptions; no in-process
  cross-request state in new code.
- No direct identifiers to model providers; no outbound-payload widening
  before F17/F19 controls; transcripts are PII until scrubbed.
- No Apply-less AI mutations, voice or typed. No AI-lane execution of
  financial/auth/role/destructive actions.
- No destructive DB ops or backfills without explicit owner approval.
- No blind webhook consolidation; do not recount the fixed apex
  /webhooks/* hazard.
- No "done/fixed/passing" without current-session proof + a clean hostile
  pass; subagent claims are hypotheses until you verify them.
- Absence claims require call-graph tracing, never string matching alone.
  Negative tool results require proof the tool ran (assert file existence,
  check exit codes) — this chain produced two false all-clears from
  silently-failed tooling.
- Do not soften findings or silently descope acceptance criteria;
  deferrals need owner sign-off, stated as deferrals.

## 10. REQUIRED OUTPUT FORMAT

1. Working-base report (branch, distance, base, lane claims).
2. Phase A charter deliverables A2-A7 (scoreboard, route table,
   reachability, harness spec, owner decisions + ops asks, test specs).
3. Await approvals; then per-slice build reports: diff summary, tests
   added, acceptance proofs checked one by one, deviations flagged.
4. Final certification: closed/deferred status per finding, certified SHA,
   deferrals with reasons.

Repository truth outranks this document. When they disagree, follow the
repo and say so.
================================================================================
