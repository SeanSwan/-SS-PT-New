# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/KIMI-PACKET-AUDIT-PANEL-META-REVIEW-2026-08-12.md
**Seed:** (none)
**Tokens:** 6364 in / 11628 out | **Cost:** ~$0.1935 | **Wall:** 350.8s | **finish_reason:** stop

---

# PART A — HOSTILE META-REVIEW

## A1. Verdict

**ACCEPT-WITH-CORRECTIONS.** §3's claim-by-claim verification work is the strongest artifact in the chain — the fix-scope corrections on findings 5, 7, 9, and 10 are exactly what a builder needs and the panel did not deliver. But §3 is not safe to hand a builder as-is, for four reasons: (1) its verification methodology was confirmation-biased by construction — agents were dispatched to grade ten given claims, not to sweep cold, so "all ten verified" is a statement about the panel's honesty, not about the codebase's defect surface; (2) it endorses the full ActionRun substrate with zero proportionality analysis against a single-Render-instance deployment, and its own evidence (Redis commented out in `render.yaml:276`) contradicts the threat model the substrate is designed for; (3) its build order buries the owner's actual product — dictation-first — behind three plumbing slices; and (4) the entire chain, §3 included, never verifies the one link the owner says the business runs on: onboarding data → program generation. §3 reviewed the audit. It did not review the product.

## A2. Where §3 is wrong or credulous

1. **[P1] The verdict distribution is an artifact of the method, not a finding.** §3 opens with "all ten headline findings verified against real mounted code, none fabricated." Of course they did — the agents were told what to look for and where the panel said it was. That protocol can only confirm or refute; it cannot discover. The three "panel-missed" defects in §3.4 were discovered incidentally while grading adjacent claims, not by an independent sweep, and §3 never says so. A hostile meta-review must state plainly: **the true defect surface of this codebase is unknown; §3 measured the panel's precision, not the panel's recall.** Nothing in the packet tells us what a cold sweep with no claim-list would have found. [Cannot verify from packet — no methodology section in §3 describes any claim-independent exploration.]

2. **[P2] §3.4 is internally sloppy: the header says "three findings," the body lists five.** Numbered 1–5, with #2 explicitly cross-referencing row 7. If the reviewer cannot count its own findings, its "scoreboard" framing deserves less confidence than it projects. Minor in impact, but it is the kind of error §3 would flag in someone else's packet.

3. **[P1] "The direction is right and endorsed" is asserted, not argued — and §3's own evidence argues against part of it.** §3 calls ActionRun "minimal shape, not architecture-astronautics" with no sizing, no alternative costed, and no threat-model check. Meanwhile §3 row 8 documents that this is a deployment where Redis is commented out, pending confirmations live in a process-local `Map`, and a restart kills them — i.e., **a single-instance deployment**. Leases and fencing solve distributed-executor races this deployment does not have. Endorsing them without asking "on one Render instance, what does a DB unique constraint not already give me?" is deference to the paid panel wearing the costume of rigor.

4. **[P1] §3 is internally inconsistent on "extend, don't rebuild."** Amendment A2 says extend the existing proposal/approval machinery. But the existing *confirmation* machinery (`destructiveOperations.mjs` pendingOps, HMAC, TTL) is precisely what ActionRun's durable lifecycle would replace — and §3 row 8 correctly savages that machinery as broken-by-design. So which is it: the proposal layer survives and the confirmation layer is demolished? §3 never draws the line. A builder reading A2 + row 8 + the ActionRun endorsement can justify either adopting `approveCoachProposal` wholesale or writing the fourth runtime §3 warns against. The amendment needs one sentence: **proposal cards and approval tokens are adopted; the `pendingOps` confirmation substrate is replaced, not extended.** §3 implies it and never says it.

5. **[P1] The build order buries the product the owner is paying for.** The owner's verbatim priority is dictation-first. §3's order puts the onboarding dictation adapter in step 4, behind hotfixes, truth-of-save, and the ActionRun substrate. Steps 1–2 are correctly front-loaded — a voice loop that acks before save is worse than no voice loop, and §3 row 4 proves that is the live behavior. But there is no reason the onboarding dictation spike (the *owner's stated top priority*, and per §3.3 the pattern already exists on workout and nutrition surfaces) cannot run parallel to step 2–3 plumbing. §3 serialized what should be a two-track plan and never justified the serialization.

6. **[P0 — product-level] Nobody, including §3, verified the onboarding → program-generation link.** The owner's vision: "the onboarding process is where I'm going to be pouring all my data so that we can build these customized workouts based off the client's goals and history." §3 row 2 proves coach-created-client questionnaire data is *dropped*; it proves client onboarding data is *persisted*. What nothing in §2 or §3 checks is whether the persisted data is *read by anything that generates a program*. A perfectly-persisted questionnaire feeding nothing is the same product failure as a dropped one, wearing better clothes. This is the single largest hole in the chain and §3 walked right past it because it was grading the panel's claims instead of the owner's. [INFERENCE that this link is unverified — it is absent from every finding and correction in the packet; absence of evidence stated plainly.]

7. **[P2] The finding-10 downgrade may itself be over-corrected.** §3 declares double-fulfillment "guarded" based on a static read of a row-lock claim (`stripeWebhook.mjs:531-540`) and a shared `grantSessionsForCart`. Static reading cannot prove the absence of a cross-endpoint race — and §3's own residual risk (a) admits the five endpoints fulfill *disjoint* metadata shapes, meaning the guard only covers paths sharing the cart claim logic. The honest verdict is "overstated for the cart path; unproven for the disjoint paths." §3 said the first half quietly and the second half not at all. [Cannot verify the race either way from the packet — but that is the point: neither can §3, and it rendered a verdict anyway.]

8. **[P2] "One-day fix" (A4) is an unsourced effort estimate presented as fact.** It probably is small — env var into manifest, HMAC on the one un-HMAC'd path — but a hostile review that demands evidence from others should label its own estimates. Flagging so the master prompt does not inherit fake precision.

9. **[P2] §3 never demanded the panel's nine off-repo artifacts be committed.** Blueprint, wireframes, contracts exist only in the external agent's environment. §3 disclosed this (§3.7) and then did nothing about it. If a builder is to execute "the blueprint," the blueprint must exist in the repo or be reconstructed from this packet — otherwise the master prompt *is* the spec, and it should say so.

## A3. Where §3 is right and should be preserved verbatim

- Every fix-scope correction in the scoreboard: finding 1 (admin-only, dead `adminClientService.submitOnboarding`, client path immune via back-fill), finding 2 (loss renders as success post-commit; the silently-dropped field list), finding 3 (deterministic 403, `defaultOpen` making it worse), finding 4 (ack-before-await with the full failure-branch enumeration), finding 5 (cross-route, not a missing field), finding 6 (localStorage-only correction, key embedding a client id), finding 7 (body-wins-over-identity, shadowed correct router, recurrence multiplier), finding 8 (random-key is the *only* production branch, `preparePendingConfirmation` has no HMAC at all), finding 9 (three runtimes, the real shell B, the dead `DashboardShell`), finding 10 (apex hazard FIXED, the disjoint-metadata risk as the real residual).
- §3.4 items 1, 3, 4, 5 as panel-missed defects (item 2 folded into row 7).
- Amendments A1 (route unification is prerequisite), A3 (shell-B decision missing), A5 (webhook work is config-and-coverage, naive consolidation drops a product line).
- The disclosure discipline of §3.7 — the master prompt inherits it.
- "Extend, don't rebuild" as a *principle* — even though §3 misapplies it to the confirmation layer (A2 item 4 above).

## A4. Architecture challenge

**My position: the panel's full ActionRun spec is 60% correct and 40% enterprise cosplay, and §3 should have split it.** [All effort numbers below are INFERENCE — estimates, clearly labeled.]

What the deployment actually is, per §3's own evidence: one Render instance, no Redis, process-local state already breaking on restart. On a single instance with PostgreSQL:

- **Idempotency** = a UUID column with a unique index and conflict-returns-existing. The machinery already exists on `/api/workouts` (§3 row 5). No "substrate" required — a migration and a service-branch. **Days, not weeks.**
- **The Apply gate** = the existing proposal-card/approval-token machinery, adopted per A2. Exists. **Days.**
- **Durable pending confirmations** = one Postgres table (`pending_action`: id, user_id, action_kind, payload, hmac, expires_at, status) replacing the `Map`. The DB row *is* the lease; its unique constraint *is* the fence. **~1 week.**
- **Signed read-back receipts** = overkill. The read-back *verifier* (a distinct server read after write, surfaced to the user) is genuinely valuable — it is the fix for the finding-4 lie. But it needs to be a re-fetch rendered in the UI, not an HMAC-signed artifact. A hash-chained audit log is a v2 nicety for a trainer app. **Verifier: days. Signed receipts: deferred.**
- **Full ActionRun lifecycle with encrypted payloads, fencing tokens, replay-protected approval tokens as specced**: sized honestly at **5–8 build-weeks** [INFERENCE] for one engineer including the UI surfaces, and it delays the dictation loop by exactly that much. The minimal trustworthy path above is **2–3 weeks** [INFERENCE] and converts cleanly: the `pending_action` table grows a status enum and becomes ActionRun when (and only if) the app goes multi-instance or offline-replay volume demands it.

The trigger conditions for upgrading to the full spec should be written down now (multi-instance deploy; offline replay depth > N; a demonstrated idempotency-violation incident) so the decision is evidence-driven instead of panel-driven. §3 endorsed the cathedral because the panel drew one. The owner needs the load-bearing wall.

## A5. Gaps nobody in the chain surfaced

1. **The onboarding → program-generation link (repeated from A2.6 because it is the most important item in this document).** Verify that questionnaire/goals/history data is actually queried by whatever generates programs. If the link doesn't exist, that is the real P0 — above every finding in the chain, because it is the product.
2. **Gym-floor offline reality.** Dead zones mid-session are the norm, not the edge. The offline queue exists (`useOfflineQueue.ts`) and replays identical payloads with no idempotency key — the exact duplicate-write path. Beyond keys: what is the *conflict semantics* when the queue replays against state that moved? Nobody asked.
3. **Concurrency.** Trainer's tablet and client's phone logging the same session; two devices on one draft. No optimistic locking, version vectors, or last-write-wins policy appears anywhere in the packet. [INFERENCE that none exists — no finding mentions one.]
4. **Voice number parsing is a correctness minefield nobody priced.** "225 for 5" → "22 for 55" is a plausible STT/parse failure with *training-load consequences*. Required: the pre-Apply review card must render parsed load/reps as first-class large-type fields (not buried in prose), unit ambiguity (lb/kg) must be explicit per user preference, and exercise names must match against a canonical in-app exercise list with the match confidence shown. Low-confidence parses must be visually flagged, not silently applied.
5. **Undo and correction.** Voice-executed deletions are forbidden (correctly). So after a wrong-but-applied write, what is the manual correction path, and is it one tap or a spelunk? A voice-first system without a fast manual undo is a trap.
6. **Latency budget.** A trainer mid-set will tolerate ~2 seconds from utterance to review card; nobody stated a budget, so nobody will build to one. [Target is INFERENCE/product-judgment.]
7. **Trust and observability for the owner.** How does Sean *know* the day's logs all landed? The honest version of "signed receipts" is a per-day ledger view — everything written, by whom, via which input mode, with any read-back mismatches flagged. This is a product feature (the progress-proof loop's foundation), not just ops tooling, and nobody in the chain proposed it.
8. **Accessibility of a voice-first UI.** Voice cannot be the only path (forms fallback exists — good), but: mic-permission failure states, noisy-gym STT degradation, users who cannot speak, transcript display for review-before-Apply, and WCAG conformance of the new Rail/Dock/Room surfaces (44px, 4.5:1, reduced-motion) are unaddressed. The hard constraints exist; the blueprint's acceptance criteria don't reference them.
9. **Privacy of the audio pipeline.** "Zero PII to LLMs" is stated, but dictating client names, injuries, and health notes into STT produces transcripts full of PII. Where does raw audio go, what is retained, what is sent to which provider, what hits logs? Nobody specified an audio/transcript data lifecycle. The draft-storage finding (row 6) is the same disease in a different organ.
10. **The broken Coach panel is default-open for every client** (§3 row 3: `defaultOpen` at `:139`). The hotfix isn't only the allowlist — it's not presenting a dead panel as the product's centerpiece while the fix ships. UX triage, nobody said it.
11. **Test coverage as a first-class deliverable.** §3 notes no test asserts block scoping. Generalize: there is no evidence of any E2E over voice→save, webhook fulfillment, or onboarding submit. The chain produced ten findings that tests would have caught. Every slice below carries proof requirements for this reason.
12. **Multi-client context switching.** Draft keys embed `clientId` (good), but a trainer running back-to-back sessions needs the Coach to know *which client* a dictation targets — and to refuse ambiguously. Unaddressed anywhere.

---

# PART B — THE MASTER PROMPT

```text
================================================================================
MASTER PROMPT — SwanStudios Coach/Onboarding Remediation + Build
Packet date: 2026-08-12 · Repo: origin/main @ 0bff35fc8
You have repo access. You have no memory of any prior conversation. This
document is the complete spec. Do not ask clarifying questions; where this
document says VERIFY, verify against the mounted code and report the result.
================================================================================

## 1. MISSION

You are the final reviewing-and-building agent for SwanStudios, a production
personal-training SaaS. Three prior review rounds (an external audit, a paid
panel, a hostile verification review, and a hostile meta-review) have already
run. Your job, in order:

  PHASE 1 — VERIFY: independently confirm every claim in §5 below against the
    mounted repo. Confirm, refute, or correct each with file:line evidence.
    Also run the §7 gap-verification tasks. Report anything the whole chain
    missed.
  PHASE 2 — PLAN: produce a slice-by-slice implementation plan per §8, with
    estimates, before writing code.
  PHASE 3 — BUILD: execute slices in order (two parallel tracks where marked),
    meeting each slice's acceptance criteria and proof requirements.

Repository truth outranks every claim in this document, including this
document. If evidence below is stale or wrong, say so and proceed from the
code.

## 2. PRODUCT CONTEXT

Roles: admin (owner, a working trainer), trainer, client. Trainer-led B2B2C.
The coaching record (programs, assignments, logs, notes, adherence) is
first-party and canonical.

Owner's core vision (verbatim intent): "Dictation first. As I dictate to the
Swan Coach, it changes the UI/UX and logs workouts. Manual forms are the
always-available fallback, secondary. Onboarding is where I pour all my data
so we can build customized workouts based on the client's goals and history."

Product loop: log workout → save → charts/progress proof → next training
action → shareable milestones.

## 3. HARD CONSTRAINTS (reject any plan violating these)

- Vite + React Router + React 18 + TypeScript + styled-components. NOT
  Next.js. A prior reviewer hallucinated Next.js files; do not repeat.
- No Material-UI. styled-components only, colors as var(--token, #fallback),
  no hardcoded hex.
- Dark-first "Crystalline Swan" palette. Retired Galaxy-Swan tokens
  (#0a0a1a, #00FFFF, #7851A9) must never appear.
- 44px minimum touch targets. WCAG 4.5:1 contrast. prefers-reduced-motion
  respected.
- Files ≤ 300 lines. Victory for charts (never Recharts).
- ZERO new frameworks and ZERO new runtime dependencies unless you document
  the in-repo alternative you rejected and why it is a blocker.
- Zero PII to LLMs: client IDs and roles only.
- No voice-executed payments, auth changes, role changes, deletions, or
  bulk/irreversible operations.
- Backend: Node/Express + Sequelize + PostgreSQL, deployed on Render, single
  instance, Redis NOT available (commented out in render.yaml).

## 4. PRIOR-CHAIN PROVENANCE (so you can weigh evidence)

- A panel produced ten findings and a "Balanced Crystalline Coach Layer"
  architecture. Its nine artifact documents (blueprint, wireframes,
  contracts) exist ONLY outside this repo. Treat THIS document as the spec;
  if you want blueprint artifacts, reconstruct them into the repo as you go.
- A hostile verification review (four read-only agents) confirmed all ten
  findings against mounted code and produced the fix-scope corrections below.
  Its method was claim-grading, not a cold sweep — the codebase's full defect
  surface is UNKNOWN. Stay alert for adjacent defects while you work.
- A meta-review (this document's source) corrected the architecture's
  proportionality (§6) and added gap-closures (§7).

## 5. VERIFIED FINDINGS WITH EVIDENCE AND CORRECTED FIX-SCOPES

Verify each, then fix per the CORRECTED scope, not the original framing.

F1 [P1] Admin onboarding 400s on every submit.
  Evidence: backend guard requires fullName — onboardingController.mjs:64-68;
  .split(' ')[0] at :123-124,183-184 would throw regardless. Admin wizard
  sends firstName/lastName. Client self-path is IMMUNE (back-fill at
  onboardingController.mjs:354; live wizard posts formData raw at
  pages/onboarding/ClientOnboardingWizard.tsx:612-613).
  adminClientService.submitOnboarding() (adminClientService.ts:621) has ZERO
  callers — dead code.
  FIX-SCOPE: admin/trainer path only. Map firstName+lastName → fullName at
  the submit boundary (or relax the guard consistently). Remove or wire the
  dead service method — decide and document. ALSO: in-app guidance at
  DashboardTeachMeGuide.adminOverviewRefiner.ts:34 links users to this broken
  surface; fix the link or the surface.

F2 [P1] Coach-created clients silently lose questionnaire + coverage data.
  Evidence: availability/limitations/pain notes survive only as merged free
  text in ClientTrainerAssignment.notes
  (coachClientOnboardingDraftNormalizer.mjs:169-170). Questionnaire +
  coverage are computed in memory and returned AFTER transaction.commit()
  (coachClientOnboardingApprovalService.mjs:193-224, commit at :186) — the
  loss renders as SUCCESS in the UI. No ClientOnboardingQuestionnaire.create
  / ClientOnboardingCoverageItem write on this path. Also silently dropped:
  communicationStyle, motivationStyle, preferredContactMethod, nutritionPrefs,
  preferredTrainingDays.
  FIX-SCOPE: persist questionnaire + coverage + the dropped fields inside the
  transaction. If any field is intentionally dropped, log it loudly.

F3 [P1] Client Workout Logger Coach panel 403s on every send — and is
  default-open.
  Evidence: WorkoutLoggerCoachTerminal.tsx:128 hardcodes
  context="workout_generation"; client allowlist aiChatRoutes.mjs:322 omits
  it; rejection at :349-355. WorkoutLogger.tsx:602 mounts it unconditionally;
  panel is defaultOpen (:139). selfMode is cosmetic copy only.
  FIX-SCOPE: add the context to the client allowlist (or a client-safe
  downgrade context) AND gate defaultOpen on Coach availability so clients
  never see a dead panel as the centerpiece.

F4 [P1] Voice submission reports success before the save completes.
  Evidence: useWorkoutSubmit.ts:228-229 — acknowledgeAIWorkoutEvent?.() then
  void handleSubmit(...) (un-awaited; API call at :147). Dispatcher is
  synchronous by spec (aiWorkoutEvents.ts:113-130); useCoachCommand.ts:148
  captures premature true; useWorkoutLoggerDictation.ts:94 renders it as a
  success receipt. Every failure branch fires after the user was told it
  worked: session-balance :107, incomplete sets :111, 4xx :190, timeout :180,
  offline requeue :192.
  FIX-SCOPE: await the save before acknowledging; ack carries the real
  outcome (success / queued-offline / failed-with-reason). This is the
  "truth-of-save" fix and is the behavioral core of the whole program.

F5 [P1] Idempotency lives on a route the logger never calls.
  Evidence: logger submits to /api/workout-forms (nasmApiService.ts:711,735 →
  dailyWorkoutFormRoutes.mjs) which has NO clientRequestId anywhere. The
  machinery — WorkoutSession.mjs:50 attribute, partial unique index migration
  20250918090000-*, whitelist workoutController.mjs:315-330,
  conflict-returns-existing workoutService.mjs:238,252,274-282 — is on
  /api/workouts only. Offline queue replays identical entry.formData with no
  key (useOfflineQueue.ts:98) — the exact duplicate-write path.
  FIX-SCOPE: cross-route change. EITHER move the logger to the session route
  OR give /api/workout-forms column + unique index + conflict-returns-
  existing semantics. Pick one, document why. Generate clientRequestId on
  draft creation; thread it through the offline queue so replays reuse it.
  A frontend-only fix is silently dropped — call this out if attempted.

F6 [P1] Sensitive drafts in plaintext localStorage, never purged on logout.
  Evidence: onboarding draft swan.onboarding.draft (useOnboardingDraft.ts:33,
  110) — plaintext JSON of all 8 sections incl. health/medical + emergency
  contacts, 30-day TTL, cleared only on successful submit. Workout draft key
  ss-workout-draft:${userId}:${clientId}:${date} (useWorkoutDraft.tsx:32,64)
  embeds a client id → trainer devices retain client-attributable data, 7-day
  TTL. No logout path touches either prefix: AuthContextProvider.tsx:338-367,
  tokenCleanup.ts:36-52, authSlice.ts:172-182. (IndexedDB is E2EE key
  storage, e2eeCrypto.ts:64 — not drafts.)
  FIX-SCOPE: purge both prefixes on logout; minimize what is persisted
  (strip health/medical from the stored draft where the form can re-derive
  it); shorten TTLs; consider sessionStorage for the workout draft.

F7 [P0] Trainer can block calendar time under another trainer's ID;
  recurrence multiplies it; the correct router is shadowed.
  Evidence: live route POST /api/sessions/block, routes/sessions.mjs:2064-
  2067, mounted core/routes.mjs:418, passes req.body raw. Role-only guard
  middleware/authMiddleware.mjs:540-542. Defect:
  services/sessions/session.service.mjs:1260 —
  trainerId: trainerId || (user.role === 'trainer' ? user.id : null) — body
  wins over identity. Recurrence at :1243 creates N victim slots. The CORRECT
  guard exists at sessionRoutes.mjs:2737 but that router is shadowed and
  unreachable (core/routes.mjs:322-337,833), as is its correctly-scoped
  unblock (:2825-2829); sessions.mjs has no unblock equivalent. No test
  asserts block scoping.
  FIX-SCOPE: (a) immediately force trainerId = req.user.id for trainer-role
  callers on the LIVE router; (b) reconcile the shadowed router pair — merge
  the correct scoping (and unblock) into the live router and retire the dead
  one, or document why both exist; (c) add the missing scoping test.

F8 [P0] Confirmation substrate is non-durable, unsigned-by-default, and one
  path has no HMAC at all.
  Evidence: services/ai/destructiveOperations.mjs — pendingOps = new Map()
  (:17); "or Redis" comment (:110) is aspirational, no Redis path exists.
  Signing key process.env.OPERATION_SIGNING_KEY || randomBytes (:12) feeding
  createHmac (:39); OPERATION_SIGNING_KEY appears in NO deploy manifest
  (render.yaml, render.env.example) → the random branch is the only
  production branch, against two internal design docs — a regression. Worse:
  preparePendingConfirmation (:197) has NO HMAC — Map custody + owner-id
  check (:255) only. 120s TTL. Restart kills pending confirmations;
  multi-instance would yield false tamper alarms (:172). Wired live via
  commandExecutor.mjs:27-30,510,536,804,934.
  FIX-SCOPE (do this in the hotfix slice, do NOT wait for any substrate
  work): add OPERATION_SIGNING_KEY to render.yaml + render.env.example with
  no random fallback in production (fail fast if unset); HMAC ALL
  confirmation kinds including preparePendingConfirmation. Durable storage
  is Slice 3, below.

F9 [P1] Three Coach runtimes, none shared; shell B hard-navigates out.
  Evidence: Shell A = UniversalDashboardLayout at /dashboard/*
  (main-routes.tsx:940) with Coach as a per-role route registered 3×
  (UniversalDashboardLayout.routes.tsx:108 admin, :209 trainer, :236 client).
  Shell B = UserDashboardV3 at /user-dashboard (main-routes.tsx:796-812),
  mounts no Coach, hard-navigates out (UserDashboard.V3.tsx:61-63). Third
  runtime: SurfaceCoachDock family (components/CoachDock/,
  WorkoutPlannerCoachDock) with own state/transport (useSurfaceCoachDock).
  DashBoard/v2/shell/DashboardShell is DEAD (playgroundRegistry.ts:80 only).
  ALSO (panel-missed): UserDashboardTeachCoachRoute.ts:1 hardcodes
  /dashboard/client/coach-assistant while /user-dashboard is reachable by any
  role (main-routes.tsx:797) → admin/trainer "Ask Coach" lands on the CLIENT
  Coach surface; shell A resolves activeRole correctly
  (UniversalDashboardLayout.tsx:189). ALSO: an orphaned duplicate proposal-
  render tree — SwanCoachAssistantPage.tsx → SwanCoachMessagesPanel.tsx:96 →
  CoachMessage.tsx:171 — renders the same proposal cards in a parallel
  unrouted surface.
  FIX-SCOPE: hotfix the role-resolved teach-coach route immediately. The
  shell-B fate (adopt / absorb / retire UserDashboardV3) is an explicit
  DECISION GATE in Slice 5 — present the owner a recommendation with
  evidence; do not silently keep both. Delete or absorb
  SwanCoachAssistantPage in the unification slice.

F10 [P2] Five payment webhook surfaces, no env switch — real risk is config,
  not double-fulfillment.
  Evidence: /webhooks/stripe + /api/webhook/stripe alias (core/routes.mjs:
  777,779), /api/cart/webhook (cartRoutes.mjs:974), /api/session-packages/
  webhook (sessionPackageRoutes.mjs:212), /api/subscriptions/webhook
  (separate secret). Canonical router binds two sub-paths to one handler
  (stripeWebhook.mjs:312,314). Cart double-fulfillment IS guarded (atomic
  claim stripeWebhook.mjs:531-540; grantSessionsForCart alreadyProcessed
  under row lock, SessionGrantService.mjs:199; legacy mount delegates,
  cartRoutes.mjs:1040-1045) — but this is statically-read; treat as
  "guarded on the cart path, unproven elsewhere." Apex /webhooks/* SPA-swallow
  hazard is FIXED (render.yaml:196-216) — do not recount it as open.
  REAL residual risks: (a) endpoints fulfill DISJOINT metadata shapes
  (sessionPackageCheckoutFulfillmentService.mjs:34-52 needs packageId+
  sessions; canonical ignores anything without cartId/known type,
  stripeWebhook.mjs:131) → pointing Stripe at one URL silently un-fulfills
  the other product line; (b) no cross-endpoint Stripe event.id dedupe
  ledger; (c) the hand-maintained express.json bypass list
  (core/middleware/index.mjs:39-48) silently breaks signature verification
  for any future webhook not added.
  FIX-SCOPE: config-and-coverage, NOT rearchitecture. Add event.id dedupe
  ledger; add a boot-time assertion/log of which webhook secrets are present;
  document the required Stripe dashboard URL set in the repo; add a test
  asserting every mounted webhook path is in the bypass list. Do NOT
  consolidate mounts — naive consolidation drops a product line.

F11 [P2] Cart silent-failure is one layer below the components.
  Evidence: four pre-flight branches at CartContextProvider.tsx:107-128
  setError + throw BEFORE the try block that owns the role="status"
  notification (cartNotification.ts:2-46) → they emit nothing. All five
  add-to-cart components otherwise toast; YourSpecialCard.tsx:61-70 has a
  bare catch{} (its comment correctly notes the context notifies).
  FIX-SCOPE: route pre-flight failures through the same notification channel;
  leave YourSpecialCard's catch as-is if the context now covers all paths.

## 6. ARCHITECTURE DECISION (as amended — this supersedes the panel's spec)

ENDORSED DIRECTION: one authenticated Coach runtime; voice-first with manual
forms always available; every voice-originated write behind an explicit Apply
tap; durable server-side action state; read-back verification; one shared
onboarding draft across speech/typing/forms; adapter order Logger →
Onboarding → Planner. UI model: Quiet Rail (desktop), Thumb Dock (mobile),
Command Room (deep review). Routine success uses the standard cyan accent;
gold reserved for warning/luxury/milestone; reuse the existing Crystallize
effect only for verified meaningful moments; completion announcements
non-interruptive.

AMENDED PROPORTIONALITY (mandatory): the deployment is a single Render
instance with PostgreSQL and no Redis. Build the MINIMAL trustworthy
substrate, not the panel's full ActionRun spec:
  - Idempotency = UUID column + unique index + conflict-returns-existing
    (machinery on /api/workouts is the reference implementation).
  - Durable pending actions = ONE Postgres table (suggested: pending_action:
    id, user_id, action_kind, payload, hmac, expires_at, status) replacing
    the pendingOps Map. The DB row is the lease; its unique constraint is
    the fence. No fencing tokens, no lease protocol.
  - Apply gate = ADOPT the existing machinery: CoachActionProposalCard +
    approveCoachProposal + the existing voice-capture and staff
    voice→onboarding proposal lane (verified working: commandRegistry/
    clientCommands.mjs:34-45, commandDispatcher.mjs:228,
    clientOnboardingProposalDispatcher.mjs, CoachCommandCenter.voiceCapture.
    ts:82-85, CoachCommandCenter.chatResponse.ts:79-86,
    CoachActionProposalCard.logic.ts:8,12-21, CoachCommandLogEntry.tsx:162).
    Do NOT build a parallel fourth runtime. Proposal cards and approval
    tokens are ADOPTED; the pendingOps confirmation substrate is REPLACED.
  - Read-back verifier = a distinct server re-read after write, rendered in
    the UI. NOT signed receipts — defer hash-chained audit artifacts to a
    later version, gated on written trigger conditions: multi-instance
    deploy, demonstrated idempotency-violation incident, or offline-replay
    volume requiring durable fencing.
  - Route-family unification (F5) is a PREREQUISITE for idempotency on the
    logger: the contract must name the route explicitly.

## 7. GAP-CLOSURES AND ENHANCEMENTS (added by meta-review — VERIFY FIRST)

These were not verified by any prior round. Verify each against the repo
before building; report findings; then implement per the verdict.

G1 [P0 — PRODUCT] Verify the onboarding → program-generation link. Trace
  whether persisted questionnaire/goals/history data is READ by whatever
  generates client programs. If the link is missing or partial, this becomes
  the top product priority (above all other findings): onboarding data the
  owner "pours in" must drive customized program generation. Report the data
  flow with file:line evidence either way, then wire what is missing.

G2 Offline/gym-floor hardening. Beyond F5's keys: define and implement
  conflict semantics when the offline queue replays against moved state
  (server-wins-with-user-visible-diff is acceptable; silent overwrite is
  not). Surface queued-offline state distinctly from saved state in the UI.

G3 Concurrency policy. Two devices (trainer tablet + client phone) on one
  session/draft. Implement at minimum optimistic conflict detection on
  workout-log writes and a defined last-writer policy for drafts; document it.

G4 Voice parse correctness (the "225 for 5" → "22 for 55" class). The
  pre-Apply review card MUST render parsed load/reps/sets as first-class
  large-type fields; unit (lb/kg) explicit per user preference; exercise
  names matched against a canonical in-app exercise list; low-confidence
  parses visually flagged. No silent application of low-confidence parses.

G5 Fast manual correction. Since voice deletions are forbidden, provide a
  one-tap manual undo/edit path for the most recent applied write, per
  surface. Define the window and mechanism; keep it irreversible-operation-
  free.

G6 Latency budget. Target: utterance → review card in ≤ 2 seconds on a
  healthy connection (product target, verify feasibility; if STT makes this
  impossible, state the measured number and the degradation UX).

G7 Trust ledger ("did the day's logs land?"). Build a per-day view listing
  everything written, by whom, via which input mode (voice/form/offline
  replay), with read-back mismatches flagged. This is a product feature
  feeding the progress-proof loop, not just ops tooling.

G8 Voice-first accessibility. Mic-permission failure states; noisy-
  environment degradation path; transcript always visible for review before
  Apply; all new Rail/Dock/Room surfaces meet the hard constraints (44px,
  4.5:1, reduced-motion); voice is never the only path.

G9 Audio/transcript data lifecycle. Specify and implement: where raw audio
  goes, retention, what is sent to which external provider, what enters
  logs. Transcripts of client dictation contain PII (names, injuries, health
  notes) — the zero-PII-to-LLM constraint applies to transcripts; define the
  scrubbing/boundary explicitly. Align with F6 draft minimization.

G10 Multi-client context. Trainer dictation must carry explicit client
  context; the Coach must refuse ambiguous target-client commands rather
  than guess. (Draft keys already embed clientId — extend that discipline to
  the command lane.)

## 8. SLICED BUILD ORDER (two tracks where marked)

Every slice: file:line evidence of the change, tests as specified, and a
written proof (what you ran, what you observed). No slice ships without its
acceptance criteria met.

SLICE 0 — Verification report (before any code).
  Confirm/refute F1–F11 with fresh file:line evidence. Execute G1's trace and
  report the onboarding→generation data flow. Report any adjacent defects
  found while verifying. ACCEPTANCE: written scoreboard; G1 verdict stated
  with evidence.

SLICE 1 — Contract hotfixes (small, independent).
  F1 (fullName mapping + dead-service decision + guidance link), F3 (allowlist
  + defaultOpen gate), F7a (live-router ownership guard + scoping test), F8
  hotfix half (OPERATION_SIGNING_KEY in render.yaml + render.env.example,
  fail-fast if unset in production, HMAC on ALL confirmation kinds), F9
  hotfix half (role-resolved teach-coach route), F11.
  ACCEPTANCE: admin onboarding submits 2xx; client Coach send does not 403
  (or panel is gated); trainer cannot pass another trainerId (test proves
  it); confirmations survive with real key and all kinds signed; teach route
  resolves per activeRole; pre-flight cart failures notify.

SLICE 2 — Truth-of-save. [Track A]
  F4 (await-before-ack, real outcome in ack), F5 (route decision documented,
  idempotency on the actual logger route, offline-queue keys), F6 (purge on
  logout + minimization + TTL).
  ACCEPTANCE: failing save surfaces failure, never success; offline replay
  produces exactly one server row (test: replay same payload twice, assert
  one row); logout leaves zero draft keys (test).

SLICE 2′ — Onboarding dictation spike. [Track B, parallel to Slice 2]
  Wire the existing dictation pattern (JarvisVoiceMode / useNutritionDictation
  are the in-repo references — do NOT add a new dependency) into client
  onboarding, one authoritative draft shared by speech/typing/forms, per G4
  review-card rules. This is the owner's stated top priority; it runs in
  parallel, not behind plumbing.
  ACCEPTANCE: a client can dictate through onboarding sections, review parsed
  fields, and apply; form entry remains fully functional; draft is the same
  record either way.

SLICE 3 — Minimal durable action substrate.
  pending_action table replacing pendingOps; adopt proposal-card/approval-
  token machinery as the Apply gate; read-back verifier (re-read rendered,
  no signed receipts); absorb the F8 hotfix into the durable store.
  ACCEPTANCE: pending action survives process restart (test: create, restart,
  confirm); expired actions refuse; double-apply is a no-op returning the
  original result.

SLICE 4 — Onboarding data-flow completion.
  F2 (persist questionnaire/coverage/dropped fields in-transaction) + G1
  implementation (wire onboarding data into program generation per the Slice
  0 verdict) + G9 lifecycle + G10 client-context discipline.
  ACCEPTANCE: coach-created client round-trips all captured data queryably
  (test asserts DB rows, not HTTP response); a generated program demonstrably
  consumes onboarding fields (trace or test).

SLICE 5 — One-runtime unification.
  Shell-B decision gate (present evidence-backed recommendation: adopt /
  absorb / retire UserDashboardV3 — owner signs off), then converge on one
  Coach runtime with Quiet Rail / Thumb Dock / Command Room per §6 design
  rules; delete or absorb SwanCoachAssistantPage and the dead DashboardShell;
  G5, G6, G7, G8 land here.
  ACCEPTANCE: one runtime serves both shells; zero imports of removed
  surfaces; day-ledger view renders voice/form/offline writes distinctly;
  accessibility audit of new surfaces passes the hard constraints.

SLICE 6 — Webhook coverage.
  F10 residual work: event.id dedupe ledger, boot-time secret assertion,
  dashboard URL documentation, bypass-list coverage test.
  ACCEPTANCE: duplicate event.id delivery processes once (test); a webhook
  path missing from the bypass list fails a test loudly.

SLICE 7 — Release gate.
  Full verification re-run against the new HEAD; certify the SHA; update any
  reconstructed blueprint artifacts into the repo.
  ACCEPTANCE: every finding F1–F11 closed with evidence or explicitly
  deferred with owner sign-off.

## 9. FORBIDDEN ACTIONS

- No Next.js anything. No new frameworks or runtime dependencies without a
  written blocker justification naming the rejected in-repo alternative.
- No Material-UI, no hardcoded hex, no Galaxy-Swan tokens (#0a0a1a, #00FFFF,
  #7851A9), no files over 300 lines, no Recharts.
- No voice-executed payments, auth/role changes, deletions, or
  bulk/irreversible operations — including in new code you write.
- No PII to LLMs (IDs and roles only) — including transcripts (G9).
- Do not "consolidate" the five webhook mounts.
- Do not recount the fixed apex /webhooks/* SPA-swallow hazard as open.
- Do not build a fourth Coach runtime or a parallel proposal-card renderer.
- Do not build leases, fencing tokens, or signed receipts beyond §6's minimal
  substrate without a written trigger condition being met.
- Do not invent file paths, line numbers, symbols, or APIs. Label inference
  [INFERENCE]. If you cannot verify something, say so and proceed from code.
- Do not soften findings or silently descope acceptance criteria. Deferrals
  require explicit owner sign-off, stated as deferrals.

## 10. REQUIRED OUTPUT FORMAT FROM YOU

Deliver in order:
  1. SLICE 0 VERIFICATION REPORT: scoreboard of F1–F11 (confirmed / refuted /
     corrected, each with fresh file:line), the G1 data-flow trace verdict,
     G2–G10 verification notes, and any newly discovered defects.
  2. IMPLEMENTATION PLAN: per-slice approach, files to be touched, estimates
     labeled [ESTIMATE], and the Track A / Track B parallelization.
  3. PER-SLICE BUILD REPORTS as you execute: diff summary, evidence, tests
     added, acceptance criteria checked off one by one, deviations flagged.
  4. FINAL CERTIFICATION: closed/deferred status of every F- and G-item, the
     certified SHA, and the list of anything deferred with reasons.

Repository truth outranks this document. When they disagree, follow the repo
and say so.
================================================================================
```
