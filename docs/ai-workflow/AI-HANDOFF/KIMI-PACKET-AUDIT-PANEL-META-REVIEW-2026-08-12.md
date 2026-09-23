# Kimi K3 Packet — Meta-Review of the SwanStudios Audit Chain + Master Prompt Authoring

> **Packet date:** 2026-08-12 · **Requested by:** Sean (owner) · **Assembled by:** Claude (Fable-tier, Final Decider seat)
> **Bound repo state:** `origin/main` @ `0bff35fc8`
> **This is ONE call doing TWO jobs.** Do both. Do not ask clarifying questions — emit the deliverables.

---

## 0. YOUR TWO JOBS

**JOB A — Hostile meta-review.** Attack the review in §3 (authored by Claude/Fable) the way a rival principal engineer would. It reviewed the audit chain in §2. You are reviewing *the reviewer*. Find where §3 is wrong, credulous, over-confident, mis-scoped, or blind. Rank by severity. If §3 is right about something, say so briefly and move on — do not pad.

**JOB B — Author the master prompt.** Produce a single, self-contained, copy-pasteable prompt that Sean will hand to a downstream AI agent whose job is to review ALL of these reviews and then drive the build. That prompt must:
- carry every surviving verified finding with its file:line evidence,
- carry the corrected fix-scopes (not the original mis-scoped framings),
- carry the architecture direction and its amendments,
- **add the enhancements, upgrades, and missing gaps that nobody in the chain asked for** — this is explicitly requested; Sean wants you to find what he did not know to ask,
- state its own acceptance criteria and forbidden actions,
- be executable with zero further questions back to the author.

---

## 1. CONTEXT YOU NEED

**Product:** SwanStudios — a production personal-training SaaS (React 18 + TypeScript + styled-components frontend; Node/Express + Sequelize + PostgreSQL backend; deployed on Render). Roles: admin (the owner, a working trainer), trainer, client.

**The owner's core vision, verbatim in intent:**
> "The drive system is extremely important. I need to be able to just dictate, and as I dictate to the Swan Coach, it's able to change the UI/UX and manipulate it so that we can log workouts and do everything that we're supposed to do. Everything should be done by **dictation first**, or by the AI coach, and **secondary is actually filling in the forms**. And the **onboarding process** is very important too — the onboarding process is where I'm going to be pouring all my data so that we can build these customized workouts based off the client's goals and history."

So: voice → Coach → real state change, with manual forms as the always-available fallback. Onboarding is the data intake that feeds program generation.

**Product loop:** log the workout → save it → turn it into charts/progress proof → decide the next training action → make milestones shareable. Trainer-led B2B2C; the coaching record (programs, assignments, logs, notes, adherence) is first-party and canonical.

**Hard constraints (non-negotiable, reject any recommendation violating these):**
- No Material-UI. styled-components only, with `var(--token, #fallback)` colors — no hardcoded hex.
- Dark-first "Crystalline Swan" palette. Retired "Galaxy-Swan" tokens (`#0a0a1a`, `#00FFFF`, `#7851A9`) must never appear.
- 44px minimum touch targets. WCAG 4.5:1. `prefers-reduced-motion` respected.
- Files ≤300 lines. Victory for charts (never Recharts).
- Stack is **Vite + React Router**. NOT Next.js. (An earlier reviewer in this chain hallucinated Next.js files — do not repeat that.)
- **Zero new frameworks and zero new runtime dependencies** unless you justify it as a blocker with no in-repo alternative.
- Zero PII to LLMs; client IDs and roles only.
- No voice-executed payments, auth changes, role changes, deletions, or bulk/irreversible operations.

---

## 2. THE AUDIT CHAIN BEING REVIEWED

An external agent (GPT-5.6-class) produced a deep static audit of the app, then self-hostile-reviewed it, then convened a paid panel (Opus 5, Kimi K3, Tencent HY3, a Fable seat via API, and a multi-brain "AI Village") and synthesized their outputs into a proposed architecture.

### 2.1 The panel's ten headline findings (as stated by the panel)

1. Admin onboarding sends `firstName`/`lastName` while its backend handler requires `fullName` (→ HTTP 400).
2. Coach-created clients receive a user record and trainer assignment, but their questionnaire and coverage data are not persisted.
3. The client Workout Logger invokes a trainer-oriented Coach context and can receive a 403.
4. Workout voice submission reports "handled" before the asynchronous save finishes.
5. Canonical workout submission does not carry the existing `clientRequestId` idempotency field.
6. Workout and onboarding drafts retain rich data in raw browser storage and are not purged on logout.
7. Trainers can submit another trainer's ID when blocking calendar time.
8. Command confirmations use process-local memory with a random signing-key fallback.
9. No shared Coach runtime spans both authenticated dashboard shells.
10. Competing payment webhook paths remain a financial release risk.

### 2.2 The panel's proposed architecture — "Balanced Crystalline Coach Layer"

- One Coach runtime across both authenticated shells.
- Voice first, Coach-guided review second, manual forms always available.
- Every voice-originated write requires an explicit **Apply** action (a tap).
- Server-owned **ActionRun** lifecycle: idempotency, database lease/fencing, encrypted sensitive input, approval-token replay protection, signed read-back receipts.
- One authoritative onboarding draft shared by speech, typing, and forms.
- First write adapters in order: Workout Logger → Onboarding → Workout Planner.
- No voice-executed irreversible operations.
- UI model: **Quiet Rail** (desktop), **Thumb Dock** (mobile), **Command Room** (deep review).
- Flow: input (voice/text/form/audio-device) → one Coach runtime → deterministic-first server intent router → durable ActionRun → branch: read/navigation executes and explains; **any write** waits for user Apply → idempotent fenced executor → a *distinct* server read-back verifier → signed canonical receipt → surfaced in Rail/Dock/Room.
- Design direction chosen independently by two reviewers: routine success uses the standard cyan accent; gold is reserved for warning/luxury/milestone only; an existing "Crystallize" effect is reused only for meaningful verified moments; completion announcements are non-interruptive.

### 2.3 Known process facts about that panel run

- One reviewer seat was terminated locally, then its async completion was counted anyway — a no-retry protocol violation, though the output was usable.
- The multi-brain Village seat hallucinated Next.js files and proposed a new NLP dependency; both were correctly rejected by the synthesizer.
- The panel's nine artifact documents (blueprint, wireframes, contracts, per-reviewer outputs) exist **only in the external agent's environment — they are NOT in the repository.**
- A requested reviewer named "Vida" could not be identified and was correctly not fabricated.

---

## 3. THE DOCUMENT UNDER HOSTILE META-REVIEW

The following is the Fable-seat hostile review of everything in §2. It was produced by dispatching four independent read-only verification agents against a clean checkout of `origin/main` @ `0bff35fc8` and checking every claim against real mounted code.

---

### 3.1 Overall verdict rendered

The package is substantively trustworthy — all ten headline findings verified against real mounted code, none fabricated. However: four findings are framed in ways that would send a builder to the wrong file or the wrong fix; two are materially understated; one is overstated; and verification surfaced three defects the entire panel missed.

### 3.2 Claim-by-claim scoreboard rendered

| # | Panel claim | Verdict | Correction |
|---|---|---|---|
| 1 | Admin onboarding `firstName`/`lastName` vs required `fullName` → 400 | VERIFIED | Admin/trainer path only. Client self path immune — `onboardingController.mjs:354` back-fills `formData.fullName \|\| firstName + ' ' + lastName`. Live wizard posts `formData` raw (`pages/onboarding/ClientOnboardingWizard.tsx:612-613`); `grep fullName frontend/src/pages/onboarding/` returns zero hits. Backend guard `onboardingController.mjs:64-68`, and `.split(' ')[0]` at `:123-124,183-184` would throw anyway. The correctly-shaped `adminClientService.submitOnboarding()` (`adminClientService.ts:621`) posting to a properly-shaped endpoint has **zero callers** — dead code. |
| 2 | Coach-created clients drop questionnaire + coverage | VERIFIED | Nuance: availability/limitations/pain notes DO survive — merged into free text and stored in `ClientTrainerAssignment.notes` (`coachClientOnboardingDraftNormalizer.mjs:169-170`), i.e. unqueryable prose. Questionnaire responses + coverage ledger are computed **in memory** and returned in the HTTP response (`coachClientOnboardingApprovalService.mjs:193-224`) after `transaction.commit()` at `:186` — so the loss *renders as success* in the UI. No `ClientOnboardingQuestionnaire.create` / `ClientOnboardingCoverageItem` write on this path. Also silently dropped: `communicationStyle`, `motivationStyle`, `preferredContactMethod`, `nutritionPrefs`, `preferredTrainingDays`. |
| 3 | Client Workout Logger hits trainer Coach context → 403 | VERIFIED, understated | Deterministic, not conditional. `WorkoutLoggerCoachTerminal.tsx:128` hardcodes `context="workout_generation"`; client allowlist `aiChatRoutes.mjs:322` omits it; rejection at `:349-355`. `WorkoutLogger.tsx:602` mounts unconditionally (`selfMode` is cosmetic copy only), and the panel is `defaultOpen` (`:139`). Every client Coach send 403s. |
| 4 | Voice submission reports "handled" before async save | VERIFIED, understated | `useWorkoutSubmit.ts:228-229`: `detail.acknowledgeAIWorkoutEvent?.(); void handleSubmit(...)` — ack precedes an un-awaited save whose API call is at `:147`. Dispatcher is synchronous by spec (`aiWorkoutEvents.ts:113-130`) and returns `handled` immediately; `useCoachCommand.ts:148` captures that premature `true`; `useWorkoutLoggerDictation.ts:94` renders it as a success receipt. Every failure branch — session-balance block `:107`, incomplete sets `:111`, 4xx `:190`, timeout `:180`, offline requeue `:192` — fires *after* the user was told it worked. Even synchronous validation rejections report handled. |
| 5 | Canonical workout submission missing `clientRequestId` | VERIFIED, **fix-scope wrong** | The panel implies a missing payload field. Reality: the logger submits to `/api/workout-forms` (`nasmApiService.ts:711,735` → `dailyWorkoutFormRoutes.mjs`), which contains **no `clientRequestId` reference at all**. The idempotency machinery — model attribute `WorkoutSession.mjs:50`, partial unique index migration `20260718120000-*`, whitelist `workoutController.mjs:315-330`, unique-violation-returns-existing-row `workoutService.mjs:238,252,274-282` — lives on `/api/workouts`, a route the logger never calls. A frontend-only fix is silently dropped. This is a cross-route change. The offline queue replays identical `entry.formData` with no key (`useOfflineQueue.ts:98`) — precisely the duplicate-write path idempotency exists for. |
| 6 | Drafts in raw browser storage, not purged on logout | VERIFIED | localStorage only — the IndexedDB mention is wrong (that is E2EE key storage, `e2eeCrypto.ts:64`). Onboarding draft `swan.onboarding.draft` (`useOnboardingDraft.ts:33,110`) is plaintext JSON of all 8 sections incl. health/medical + emergency contacts, 30-day TTL, cleared only on successful submit. Workout draft key `ss-workout-draft:${userId}:${clientId}:${date}` (`useWorkoutDraft.tsx:32,64`) embeds a client id → trainer devices retain client-attributable data, 7-day TTL. No logout path touches either prefix: `AuthContextProvider.tsx:338-367`, `tokenCleanup.ts:36-52`, `authSlice.ts:172-182`. |
| 7 | Trainer can block time under another trainer's ID | VERIFIED, understated | Live route is `POST /api/sessions/block` in `routes/sessions.mjs:2064-2067`, mounted at `core/routes.mjs:418` — passes `req.body` through raw. `middleware/authMiddleware.mjs:540-542` (`trainerOrAdminOnly`) is role-only. Defect at `services/sessions/session.service.mjs:1260`: `trainerId: trainerId \|\| (user.role === 'trainer' ? user.id : null)` — body wins over identity. Recurrence (`:1243`) turns one request into N blocked slots on the victim's calendar. **The correct guard exists** at `sessionRoutes.mjs:2737` (`role === 'trainer' ? req.user.id : ...`) but that router is shadowed and unreachable (`core/routes.mjs:322-337,833`), as is its correctly-scoped unblock (`:2825-2829`); `sessions.mjs` has no unblock equivalent. No test asserts block scoping. |
| 8 | Confirmations: process-local memory + random signing key | VERIFIED, understated twice | `services/ai/destructiveOperations.mjs:17` — `const pendingOps = new Map()`; the "or Redis when available" comment at `:110` is aspirational, no Redis code path exists, and Redis is commented out in `render.yaml:276`. `:12` — `process.env.OPERATION_SIGNING_KEY \|\| crypto.randomBytes(32).toString('hex')`, feeding `createHmac` at `:39`. **`OPERATION_SIGNING_KEY` appears in no deploy manifest** (`render.yaml`, `render.env.example`) → the random branch is the only production branch, and two internal design docs specify the correct no-fallback form, so this is a regression against its own spec. Worse: `preparePendingConfirmation:197` has **no HMAC at all** — Map custody + an owner-id check at `:255`. 120s TTL. Restart/deploy kills pending confirmations; multi-instance yields false "tampering detected" alarms (`:172`). Wired live via `commandExecutor.mjs:27-30,510,536,804,934`. |
| 9 | No shared Coach runtime across both shells | VERIFIED, **wrong second shell named** | Shell A: `UniversalDashboardLayout` at `dashboard/*` (`main-routes.tsx:940`), where Coach is a per-role route registered three separate times (`UniversalDashboardLayout.routes.tsx:108` admin, `:209` trainer, `:236` client). Shell B is **`UserDashboardV3`** at `/user-dashboard` (`main-routes.tsx:796-812`), which mounts no Coach and hard-navigates out (`UserDashboard.V3.tsx:61-63`). The `DashBoard/v2/shell/DashboardShell` some material pointed at is **dead code**, importable only from `playgroundRegistry.ts:80`, with zero Coach references. A third, separate presentational runtime exists: the `SurfaceCoachDock` family (`components/CoachDock/`, `WorkoutPlannerCoachDock`) with its own state/transport in `useSurfaceCoachDock`, bolted onto individual surfaces. Three runtimes; none shared. |
| 10 | Competing payment webhook paths = financial release risk | **PARTIAL — overstated** | Five webhook surfaces, all unconditionally mounted, no env switch: `/webhooks/stripe` + `/api/webhook/stripe` alias (`core/routes.mjs:777,779`), `/api/cart/webhook` (`cartRoutes.mjs:974`), `/api/session-packages/webhook` (`sessionPackageRoutes.mjs:212`), `/api/subscriptions/webhook` (separate secret). Canonical router binds two sub-paths to one handler (`stripeWebhook.mjs:312,314`). But fulfillment is now shared and idempotent: both cart paths call `grantSessionsForCart`, which returns `alreadyProcessed:true` under a row lock (`SessionGrantService.mjs:199`); the legacy cart mount delegates to canonical `processCompletedOrder` (`cartRoutes.mjs:1040-1045`); double-fulfillment is guarded by an atomic claim `Order.update({paymentAppliedAt},{where:{id,paymentAppliedAt:null}})` (`stripeWebhook.mjs:531-540`). Real residual risks are different: (a) endpoints fulfill **disjoint** metadata shapes (`sessionPackageCheckoutFulfillmentService.mjs:34-52` requires `packageId`+`sessions` and no cart markers; canonical ignores anything with no `cartId`/known type at `stripeWebhook.mjs:131`) → pointing Stripe at one URL silently un-fulfills the other product line, a dashboard-config fact invisible in code; (b) no cross-endpoint Stripe `event.id` dedupe ledger; (c) the hand-maintained `express.json` bypass list (`core/middleware/index.mjs:39-48`) breaks signature verification for any future webhook not added to it. The apex `/webhooks/*` SPA-swallow hazard is **FIXED** (`render.yaml:196-216`) and must not be recounted as open. |

### 3.3 Panel "corrections" cross-checked

- Proposal cards carried into the canonical conversation — **true** (`CoachCommandLogEntry.tsx:162` maps `entry.proposals` → `CoachActionProposalCard`; payload genuinely populated via `CoachCommandCenter.chatResponse.ts:79-86`, which preserves proposal-only replies with blank bodies). Card is self-sufficient — optional `onProposalAction` falls back to a global event bus (`CoachActionProposalCard.logic.ts:8,12-21`) and `runApprove` carries its own review token.
- Staff voice→onboarding proposals exist — **true**: `commandRegistry/clientCommands.mjs:34-45` (`create_client`, `roleRequired: ['admin','trainer']`) → `commandDispatcher.mjs:228` → `clientOnboardingProposalDispatcher.mjs` (proposal only; records created solely after approval). Voice ingress via `CoachCommandCenter.voiceCapture.ts:82-85` into the standard command lane. It is dictation + human Send, not autonomous.
- Client self-onboarding manual-first — **true**, and sharper than stated: dictation already exists for clients on workout (`JarvisVoiceMode`, `WorkoutLogger.tsx:6,871`) and nutrition (`useNutritionDictation.ts`) surfaces. It was simply never wired into onboarding — the longest form a client fills. Zero functional voice/mic/speech hits in `frontend/src/pages/onboarding/`.
- Cart feedback — the panel's own correction was still wrong in direction (see 3.4 item 3).

### 3.4 Three findings the entire panel missed

1. **[P1] Cross-shell Coach role-routing bug.** `UserDashboardTeachCoachRoute.ts:1` hardcodes `/dashboard/client/coach-assistant`; `/user-dashboard` is gated by a bare `ProtectedRoute` (`main-routes.tsx:797`) so any role reaches it. An admin or trainer clicking "Ask Coach" from shell B lands on the **client-role** Coach surface, while shell A resolves `activeRole` correctly (`UniversalDashboardLayout.tsx:189`).
2. **[P1] Live-vs-dead router split on session blocking** (detail in row 7). The fix is not "add validation" — it is "reconcile the shadowed router pair." The panel's blueprint never mentions the shadow.
3. **[P2] The cart silent-failure is one layer below where the panel pointed.** All five add-to-cart *components* handle errors with toasts (`StoreV3.tsx:762`, `StoreV2.tsx:643`, `store-v4/hooks/useCartBinding.ts` → `StoreV4.tsx:66-68`, `ProductDetail.tsx:422`) except `YourSpecialCard.tsx:61-70` (bare `catch {}`), whose comment correctly notes the context notifies (`CartContextProvider.tsx:153` → `cartNotification.ts:2-46`, a `role="status"` banner). The real defect: four pre-flight branches at `CartContextProvider.tsx:107-128` `setError`+`throw` *before* the try block that owns the notification, so they emit nothing.
4. **[P2] Orphaned duplicate proposal-render tree.** `SwanCoachAssistantPage.tsx` → `SwanCoachMessagesPanel.tsx:96` → `CoachMessage.tsx:171` renders the same proposal cards in a fully parallel, unrouted surface — drift risk for the exact contract the blueprint centralizes.
5. **[P2] In-app guidance advertises the broken admin onboarding.** `DashboardTeachMeGuide.adminOverviewRefiner.ts:34` links users to `/dashboard/admin/client-onboarding`, which 400s on every submit.

### 3.5 Opinion rendered on the architecture

The direction is right and endorsed. One authenticated Coach runtime; voice-first with manual forms always available; every voice write behind an explicit Apply; server-owned durable ActionRun with idempotency and read-back receipts; adapter order Logger → Onboarding → Planner. Each element maps 1:1 onto a verified defect — minimal shape, not architecture-astronautics. The ordering (broken contracts first, then durable runs, then the global operator) matches what the evidence demands.

**Amendments required before a builder touches it:**
- **A1** — Route-family unification is a prerequisite, not a detail. ActionRun idempotency cannot sit on `/api/workout-forms` as specced; either the logger moves to the session route or the form route gains column + conflict semantics. The contract must name the route explicitly.
- **A2** — Extend, don't rebuild. Proposal cards, approval tokens, staff voice→onboarding proposals and voice capture already exist and work. Write the blueprint as *adopting* `CoachActionProposalCard` / `approveCoachProposal` into the ActionRun contract, or the builder will produce a parallel fourth runtime. Delete or absorb `SwanCoachAssistantPage` in the same slice.
- **A3** — Shell-B decision is missing. The blueprint mounts one runtime "across both shells" but never decides `UserDashboardV3`'s fate (adopt / absorb / retire). At minimum the hardcoded client path must become role-resolved.
- **A4** — The confirmation substrate slice must include ops config. `OPERATION_SIGNING_KEY` into the deploy manifest + HMAC on *all* confirmation kinds is a one-day fix removing the worst live risk; do not let it wait for the big ActionRun slice.
- **A5** — Webhook work is config-and-coverage, not rearchitecture. Add the `event.id` dedupe ledger and a coverage assertion test; document the required dashboard URL set. Naive consolidation of five mounts silently drops a product line.

### 3.6 Amended build order proposed

1. **Contract hotfixes** (small, independent): admin onboarding `fullName` mapping · client Coach context allowlist/downgrade · `OPERATION_SIGNING_KEY` + HMAC-all-confirmations · block-time ownership guard on the LIVE router · role-resolved teach-coach route.
2. **Truth-of-save slice:** await-before-ack in `useWorkoutSubmit` · idempotency on the actual `/api/workout-forms` route · offline-queue keys · draft purge-on-logout + minimization.
3. **ActionRun substrate** (durable runs, Apply gate, receipts) absorbing existing proposal/approval machinery.
4. **One-runtime unification** (shell decision, Quiet Rail / Thumb Dock / Command Room) + onboarding dictation adapter.
5. **Webhook dedupe ledger + coverage tests**; then release-gate SHA certification.

### 3.7 Explicitly disclosed as unverified

Public-site crawler/pre-render claims (no live probe run). The panel's nine off-repo artifacts. Real-device voice behavior, authenticated production journeys, and the Stripe dashboard's actual configured webhook URL set.

---

## 4. WHAT TO ATTACK IN §3 (do not limit yourself to this list)

- Is the **verdict distribution** suspicious? Nine VERIFIED and one PARTIAL from a hostile review is a high confirmation rate. Did the verification agents confirm what they were told to look for (confirmation bias by construction), and would an independent sweep have found *different* defects rather than grading the given ten?
- Is the **"direction is right and endorsed"** conclusion earned, or is it deference to a large paid panel? Attack ActionRun itself: is a server-owned durable run-lifecycle with leases, fencing, encrypted payloads, replay-protected tokens and signed receipts **proportionate** for a single-tenant-scale trainer app on one Render instance, or is it enterprise cosplay that will take months and delay the dictation loop the owner actually asked for? What is the *smallest* thing that delivers trustworthy voice→save?
- The review says "extend, don't rebuild" but also endorses a new ActionRun substrate. Is that internally inconsistent?
- The build order puts the dictation-first vision (step 4) **behind** three infrastructure steps. The owner's stated priority is dictation. Is that ordering defensible, or does it bury the product win behind plumbing?
- Onboarding: the owner says onboarding is where he pours the data that generates customized workouts. §3 treats onboarding mostly as bug-fixing (`fullName`, dropped questionnaire). **Is the chain missing the actual product requirement** — that onboarding data must flow into program generation at all? Does anything in §2 or §3 verify that link exists?
- What did **everyone** miss: offline/gym-floor reality (dead zones mid-session), concurrency (two devices logging one client), audio/transcription accuracy for exercise names and load/rep numbers, undo/correction after a wrong voice write, accessibility of a voice-first UI, latency budget for a trainer mid-set, what happens when the model misparses "225 for 5" as "22 for 55", multi-client session context switching, and the trust/observability surface (how does the owner *know* the day's logs all landed?).

## 5. OUTPUT FORMAT — EXACTLY THESE TWO PARTS

### PART A — HOSTILE META-REVIEW
- `## A1. Verdict` — one paragraph: is §3 safe to hand a builder as-is? ACCEPT / ACCEPT-WITH-CORRECTIONS / REJECT.
- `## A2. Where §3 is wrong or credulous` — numbered, severity-tagged `[P0]/[P1]/[P2]`, each with the specific claim quoted and your counter-argument. Say plainly when you cannot verify from the packet — no invented file:line.
- `## A3. Where §3 is right and should be preserved verbatim` — brief.
- `## A4. Architecture challenge` — your independent position on ActionRun vs. a smaller alternative, with the trade-off stated in build-weeks.
- `## A5. Gaps nobody in the chain surfaced` — the unrequested findings. This section matters most.

### PART B — THE MASTER PROMPT
Output inside a single fenced block, self-contained, addressed to the downstream reviewing/building agent. It must contain: mission · repo/stack constraints · the verified findings with evidence and corrected fix-scopes · the architecture decision with amendments · your added enhancements and gap-closures · a sliced build order with per-slice acceptance criteria and proof requirements · explicit forbidden actions · the required output format from that agent. Assume that agent has repo access but no memory of this conversation.

---

## 6. RULES FOR YOUR OWN OUTPUT

- Never invent a file path, line number, symbol, or API. If you infer, label it `[INFERENCE]`. If you cannot verify, say so.
- Repository truth outranks every model in this chain, including you and including §3.
- Do not propose Next.js, a new NLP library, a vector DB, or any new runtime dependency without naming the in-repo alternative you rejected and why.
- Do not soften. Sean asked for the next level, not agreement.
