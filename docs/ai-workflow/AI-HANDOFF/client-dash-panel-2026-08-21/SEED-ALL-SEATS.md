# PANEL REPLIES + RESOLVED LOOKUPS (seed for Final Decider)

# ADDENDUM — required lookups the panel asked for, now RESOLVED

Every panel seat listed open lookups under CONFIDENCE. These were executed
against the audited commit `66ffde607` **after** the packet was sent, so no seat
had them. They change several verdicts. Fable must weigh these over any panel
statement they contradict.

---

## A1. RESOLVED — The messaging gate is enforced SERVER-SIDE, not UI-only
Kimi, GLM, DeepSeek-Pro and Sol all flagged this as `[UNCERTAIN]`.

`backend/routes/messagingRoutes.mjs`:
```
24: import { protect } from '../middleware/auth.mjs';
25: import { requireTier } from '../middleware/requireTier.mjs';
28: const messagingTier = requireTier('elite', 'trainer.messaging');
33: router.get   ('/conversations',                       protect, messagingTier, getConversations);
36: router.post  ('/conversations',                       protect, messagingTier, ...);
44: router.patch ('/conversations/:id',                   protect, messagingTier, ...);
50: router.post  ('/conversations/:id/participants',      protect, messagingTier, ...);
57: router.patch ('/conversations/:id/participants/:userId', protect, messagingTier, ...);
64: router.delete('/conversations/:id/participants/:userId', protect, messagingTier, ...);
70: router.delete('/conversations/:id',                   protect, messagingTier, deleteConversation);
73: router.get   ('/conversations/:id/messages',          protect, messagingTier, getMessagesForConversation);
76: router.post  ('/conversations/:id/messages',          protect, messagingTier, sendMessage);
79: router.get   ('/users/search',                        protect, searchUsers);   // <- only ungated route
```

**Consequences:**
1. The fix is **three layers**, not one line: backend middleware +
   `MessagingView.tsx:30` + the contract test. Any estimate treating P0.2 as a
   frontend one-liner is wrong.
2. **The permission key is literally `'trainer.messaging'`.** A capability named
   for the coaching relationship is gated on the billing tier. The semantic
   drift the audit alleges is not inferred — it is spelled out in the code.
3. **No relationship check exists anywhere on the messaging path.** Not
   frontend, not backend. `requireTier` is the only gate.

## A2. RESOLVED — Training packages do NOT grant `tier`. My claim is now cited.
GLM's Blocker 1 correctly called my "$8.4k packages don't set tier" claim
uncited and load-bearing. Executed repo-wide.

Every non-test runtime write of subscription tier:
```
12  backend/routes/subscriptionRoutes.mjs      <- subscription checkout / donation / trial ONLY
 2  backend/middleware/requireSubscription.mjs
 1  backend/middleware/requireTier.mjs
 4  backend/scripts/backfill-video-catalog.mjs (script, not a request path)
 1  backend/migrations/retired-mjs-.../...     (retired migration)
```
Then every controller handling package/session purchase was checked for a tier
write — `orderController`, `sessionPackageController`, `creditsController`,
`userCreditsController`, `sessionController`, `sessionSyncController`,
`adminClientController`, `achPaymentRoutes`, `renewalAlertController`,
`userManagementController`: **zero write `tier`.**

**CONFIRMED:** buying a $33,600 training package leaves `tier === 'free'`, which
fails `requireTier('elite')`, which **403/402s the client out of messaging their
trainer server-side.** GLM's "if packages DO grant a tier, severity drops"
branch is closed — severity stands at the higher reading.

## A3. RESOLVED — The relationship-aware primitives the audit says to BUILD already exist
This is the single largest cost correction in the review.

| Primitive the audit prescribes building | What already exists at `66ffde607` |
|---|---|
| Relationship-derived capability | `checkTrainerClientRelationship()` in `backend/middleware/authMiddleware.mjs` |
| Ownership-or-trainer gate | `requireOwnershipOrTrainer` — already applied across ~19 analytics chart routes (`analyticsRoutes.mjs:162-183`) |
| Relationship entity | `backend/models/ClientTrainerAssignment.mjs` (junction table; `authMiddleware.mjs:156` documents it "enforces trainer-client scope") |
| Feature-key capability registry | `FEATURE_GATES` + `backend/config/tierCatalog.mjs`, keys like `'trainer.messaging'`, `'charts.full'` |
| Audited read-only impersonation | `viewAsGuard.mjs` (fail-closed) + `adminImpersonationService.mjs` + audit-log migration |
| IDOR sweep tooling | `backend/scripts/audit-idor-surface.mjs` |

**Therefore the correct framing of P0.1/P0.2 is composition, not greenfield.**
`requireOwnershipOrTrainer` is the exact pattern the audit's
`DashboardCapabilityPolicy` describes — it is simply not applied to messaging.
A plan that says "build DashboardActorContext + DashboardCapabilityPolicy +
DashboardActionRouter" as new architecture is pricing work the repo has already
paid for, and risks a 22nd competing context (GLM Blocker 5).

## A4. RESOLVED — `requireTier` treats a live trial as elite; the FRONTEND does not
`backend/middleware/requireTier.mjs`:
```
const TRIAL_EFFECTIVE_TIER = 'elite';
// "A live trial intentionally receives an elite-equivalent effective tier"
```
Frontend `MessagingView.tsx:30` = `isStaffRole || isElite` — **excludes `isTrial`**,
while `useSubscription.ts:183` defines `hasCrystallineAccess = isElite || isTrial`.

**A trialing user is permitted by the API and blocked by the UI.** A confirmed
frontend/backend entitlement divergence, in the opposite direction from the
paying-client bug. Both are symptoms of one disease: entitlement is computed
independently in two places from two different rules.

Also note: `requireTier` has an emergency kill-switch env `TIER_GATING_ENABLED`,
falls back to the JWT claim on DB error, and **admin/trainer always bypass**.

## A5. RESOLVED — GitHub rulesets are ALSO paywalled. The escape hatch is closed.
Kimi and GLM both proposed rulesets as a possible substitute for branch protection.
```
GET /repos/SeanSwan/-SS-PT-New/rulesets
-> 403 "Upgrade to GitHub Pro or make this repository public"
```
Same 403 as branch protection. **Neither mechanism is available on this plan.**
GLM's "just buy GitHub Pro for ~$4/month, day one, non-blocking" is therefore
the only remedy that actually restores an enforceable gate. Pre-push hooks are
bypassable with `--no-verify` and are not a substitute.

## A6. RESOLVED — Citation drift check: all packet citations remain valid
`git diff --name-only 66ffde607..origin/main` = **47 files**. **None** is a file
cited in the packet. Citations stand.

**But the diff carries a planning-relevant signal:** the changed files include
`Social/Feed/PostCard.tsx`, `Social/Feed/components/PostContent.tsx`,
`PostHeader.tsx`, `PostWorkoutDetailsModal.tsx`, `hooks/usePostCardModeration.ts`,
`styles/PostCardStyles.ts`, `types/PostCardTypes.ts`.

**The canonical feed is under active development right now.** That is decisive
against the audit's stage-1 "temporarily mount the canonical feed in Client
Community": it is a moving target this week. It strengthens the panel consensus
to extract the canonical post *card* later, not mount the whole feed now.

## A7. NEW — House-rule (300-line) violations in the consent surfaces
GLM inferred these from interior line numbers I cited. Confirmed and worse:

| File | Lines | Cap |
|---|---|---|
| `frontend/src/pages/onboarding/ClientOnboardingWizard.tsx` | **789** | 300 |
| `frontend/src/components/DashBoard/Pages/client-dashboard/AiConsentScreen.tsx` | **770** | 300 |
| `frontend/src/pages/onboarding/components/ConsentSection.tsx` | **304** | 300 |
| `frontend/src/components/Social/Messaging/MessagingView.tsx` | 269 | ok |
| `frontend/src/hooks/useSubscription.ts` | 235 | ok |
| `frontend/src/context/GlobalClientContext.tsx` | 172 | ok |

The two worst offenders are **exactly the two consent surfaces** that must be
edited for the highest-ranked P0. Consent copy work and a file split land in the
same commit whether planned or not.

---

## What Fable must decide, given A1-A7

1. Does A3 (primitives already exist) collapse the audit's stage-2
   "architecture consolidation" from a program into a wiring task? Price it.
2. Does A1 + A2 make the messaging fix the #1 item, or does consent still lead?
   Five of seven seats named consent highest-risk **without knowing A1/A2**.
3. Does A6 kill the community item from stage 1 entirely, and to when?
4. Is A5 enough to move branch gates to "buy Pro, day one, non-blocking," and
   what enforces the gate suite until then?
5. What is the final ordered, executable slice list — each slice independently
   shippable, with acceptance criteria a worker-bot can satisfy with zero
   further questions?


==================================================
SEAT: SOL-PANEL-REVIEW.md
==================================================
# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 55693 in / 30370 out · **Cost:** ~$0.3943 · **Wall:** 272.9s · **finish:** stop

---

## VERDICT

REVISE — The audit identifies real production risks, but its blueprint would duplicate an existing security subsystem, deadlock on a paywalled gate, mishandle stale authorization snapshots, and potentially delete client-specific community functionality.

## BLOCKERS

1. **P0 — Misleading AI consent plus prohibited sensitive-data handling.** A client accepts “anonymous” processing, but a stable client pseudonym and health-related attributes may be processed; that makes consent materially misleading and violates the house rule allowing only IDs, not medical conditions, injuries, pain, measurements, age, or gender, to reach an LLM. Correcting copy alone does not fix the outbound data policy. Evidence: `AiConsentScreen.tsx:659`, `ConsentSection.tsx:209,232,257`, `ClientOnboardingWizard.tsx:735`, `deIdentificationService.mjs:185`; packet §3.6.

2. **P0 — Paying training clients can be denied their operational support channel.** An active package client whose subscription tier is neither `elite` nor `premium` opens the unconditional Messages route and receives a premium gate instead of reaching the assigned trainer. Evidence: `MessagingView.tsx:30`, `useSubscription.ts:176,183`, `ClientStellarSidebar.tsx:84`; the incorrect behavior is pinned by `useMessaging.tierGate.test.ts:56`.

3. **P1 — “Add View-as-Client” can duplicate and weaken a fail-closed subsystem.** Following the prescription literally could create a second impersonation mechanism that bypasses the existing read-only endpoint allowlist, mutation denial, validation, and audit logging. The real work is to extend and surface the existing mechanism, not replace it. Evidence: `backend/middleware/viewAsGuard.mjs` described in §3.4, `backend/config/viewAsSupportedEndpoints.mjs`, `adminImpersonationService.mjs`, and the listed unit/API tests.

4. **P1 — Stage 1 is blocked by an unavailable branch-protection capability.** Starting with “require checks on main” produces either a deadlocked implementation stage or pressure to make a private production repository public. Local hooks and red-CI conventions remain bypassable and do not satisfy “no direct push.” Evidence: GitHub API response in §3.5: `403 "Upgrade to GitHub Pro or make this repository public"`.

5. **P1 — The proposed actor context can preserve revoked authority.** Consent, entitlement, trainer assignment, or tenant membership changes mid-session while an immutable context still carries old `capabilities`, `entitlementSnapshot`, and `consentSnapshot`; a later mutation or Coach generation succeeds if those frontend snapshots are treated as authorization. The context must be advisory, while every sensitive server operation re-resolves live policy or validates a short-lived version. Evidence: prescribed `DashboardActorContext` fields in P0.1.

6. **P1 — The URL-context migration is internally under-scoped and sequenced twice.** Stage 1 demands an opaque context ID, while the actual server-backed envelope is deferred to Stage 3. An ad hoc Stage-1 token implementation will be thrown away or lack actor binding, expiry, replay protection, and revision checks. It must also migrate the admin planner, not only client routes. Evidence: `ClientObservatoryData.ts:114`, `ClientCurrentWorkoutCoachAction.ts:81`, `ClientMyWorkoutsPage.logic.ts:78`, `workoutPlannerHandoffRoutes.ts:193`.

7. **P1 — Literal retirement of Client Community can delete live systems.** Replacing the whole client page with the canonical feed can remove faction, party, event, challenge, leaderboard, hashtag, and quick-post behavior. Extract or mount the canonical post interaction layer while preserving the surrounding client composition until a feature-parity matrix proves otherwise. Evidence: `ClientCommunityPage.tsx` findings in §3.7.

8. **P1 — “Relationship-aware messaging” is not executable without relationship semantics.** “Active relationship” is undefined for pending, paused, reassigned, terminated, refunded, delinquent, blocked, guardian-managed, or cross-tenant relationships. Guessing those transitions can either deny legitimate support or create an IDOR. No relationship schema or server authorization contract is supplied in the packet.

9. **P2 — Binding file-size rules are already violated and absent from remediation.** Consent changes would continue modifying files that demonstrably exceed the 300-line maximum: `AiConsentScreen.tsx:659` and `ClientOnboardingWizard.tsx:735`. These must be decomposed rather than further expanded.

## ATTACKS

- **Correctness**

  **1. Kill list**

  - **Kill “add an audited View-as-Client subsystem.”** The backend subsystem already exists and is deliberately fail-closed. Replace the item with: expose the existing session state in the frontend, add the persistent banner and exit, preserve mutation denial, and expand the GET allowlist only endpoint by endpoint. Cost of scheduling the original item: duplicate identity state, conflicting audit records, and potentially weaker authorization.

  - **Kill “retire the client-only Community renderer” as a page-level replacement.** Preserve the client page’s RPG, challenge, hashtag, leaderboard, event, and composer systems. Reuse the canonical post card, interaction controls, moderation policy, pagination contract, and accessibility behavior inside that composition. Cost of the literal prescription: visible feature loss and likely a file-size regression from the current 297-line page.

  - **Kill branch protection as an unconditional first engineering task.** Preserve it as a release requirement, but first make an owner-level decision to upgrade the GitHub plan or migrate to a host that enforces protected private branches. Rulesets count only if an API check proves they are enforceable on this repository. Pre-push hooks and “red means stop” conventions are not equivalent controls.

  - **Kill any interpretation of `DashboardActorContext` as authorization.** A frontend context is useful for consistent presentation and request construction, but the server must remain authoritative for tenant, subject, relationship, consent, and entitlement checks. Its snapshots may explain a denial; they must not grant access.

  - **Kill the big-bang five-destination navigation collapse.** The IA diagnosis survives—15 destinations are still excessive—but route removal before telemetry, redirects, deep-link inventory, and support review will break bookmarks and workflows. Introduce the five destinations as a shell while retaining aliases and an `Explore` escape hatch, then retire routes based on evidence.

  - **Do not treat `useMessaging.tierGate.test.ts:56` as proof of a valid business decision.** It proves the behavior was deliberately frozen, not that product, legal, or support approved it. Replace the source-string assertion with server-backed behavior tests after the relationship policy is signed off.

  - **Re-check every “add X” prescription against the tree.** At minimum: capability policy, action routing, accessible primitives, canonical social components, context-token infrastructure, and Coach receipts. The demonstrated View-as miss makes existence checks mandatory before estimates.

  What survives: the messaging diagnosis, subject-state concern, removal of editable context from URLs, canonical moderation parity, persistent View-as disclosure, drawer focus handling, JWT-derived self analytics, review-first Coach behavior, and centralized consent enforcement.

  **2. Severity re-rank — cost of being wrong × likelihood**

  1. **Consent/LLM disclosure — P0, do first.** The inaccurate copy and stable pseudonym framing are confirmed in onboarding and settings, while sensitive health attributes are reportedly retained. It also conflicts directly with the IDs-only LLM rule. Immediate action: block noncompliant outbound payloads, then correct all consent surfaces.
  2. **P0.2 messaging — P0.** The gate is confirmed and directly affects support, pain follow-up, scheduling, and a high-value paid relationship. The replacement must be server-authorized from a defined relationship model, not merely another frontend Boolean.
  3. **P0.1 actor/subject drift — P1 pending endpoint proof.** Potential impact is cross-client disclosure or incorrect action, but the audit explicitly did not verify an exploit and credits JWT-derived self analytics. Elevate back to P0 if an endpoint matrix demonstrates a cross-subject read/write or cached client data survives an actor change.
  4. **P0.4 URL `teachPrompt` — P1.** Leakage and stale/editable context are confirmed across client and admin handoffs. The client lane is chat-only, reducing immediate write impact, but URL history/log/referrer exposure and prompt injection remain real.
  5. **P0.5 release controls — P1.** This is a serious risk multiplier, not a demonstrated customer failure. Its prescribed remedy is currently unavailable, so it needs an owner/platform decision rather than a fictitious code hotfix.
  6. **P0.3 Community divergence — P1, not P0 on supplied evidence.** Parallel interaction and moderation code will drift, but the page is not the trivial author/body/time feed described. A page replacement could be more harmful than the current divergence.

  **4. Order attack — corrected order**

  0. **Same-day containment**
     - Activate a server-side kill switch for any Coach path that sends disallowed client attributes; retain it until outbound payload tests prove compliance.
     - Correct anonymity claims in all four identified surfaces.
     - Stop adding new URL prompt producers.
     - Begin a narrow freeze only on new AI, impersonation, authorization, and parallel social surfaces—not on production fixes.

  1. **Settle facts and ownership before architecture**
     - Diff the audited commit against the eight newer commits.
     - Inventory existing actor/subject, capability, relationship, Coach-context, receipt, social-card, and accessible-primitive implementations.
     - Define the trainer-client relationship lifecycle, tenant boundary, guardian/minor policy, entitlement precedence, and server-side message authorization.
     - Produce endpoint matrices for self, View-as, trainer-selected subject, admin, revoked consent, revoked entitlement, and cross-tenant attempts.

  2. **Resolve release enforcement**
     - Cheapest credible remedy is generally upgrading to a GitHub plan that supports protected private branches; verify availability and cost rather than assuming it.
     - If the owner refuses, migrate the private repository to a platform/plan with enforceable protected branches.
     - Rulesets are acceptable only after repository API evidence shows they apply and cannot be bypassed.
     - Until then, reviewed PRs and green CI are temporary compensating procedures, explicitly not fulfillment of the release requirement.

  3. **Ship narrow vertical security fixes**
     - Replace the messaging tier gate with the approved server relationship capability and tests.
     - Surface the existing View-as implementation with banner and exit; keep all mutations blocked.
     - Build one minimal server-backed context-envelope implementation and migrate every known producer, including the admin planner. Do not build a disposable Stage-1 token.
     - Reauthorize consent, entitlement, relationship, and tenant scope at generation/write time.
     - Add idempotency keys, replay handling, and authoritative receipts before enabling client Coach writes.

  4. **Consolidate incrementally**
     - Introduce actor context as a frontend view model plus centralized server policy.
     - Migrate routes one vertical slice at a time with mismatch telemetry.
     - Extract canonical post interactions into Client Community without removing its surrounding systems.
     - Add drawer/accessibility primitives and split files before modification.

  5. **Only then simplify IA, Progress, and signature experiences**
     - Add route aliases and migration telemetry before removing destinations.
     - Gate richer Coach and Progress features on real authenticated performance, accessibility, and partial-failure testing.

  **5. Over-correction risk**

  A blanket “stop expanding the dashboard” freeze is not justified for a live business. It would delay revenue fixes, trainer communication, accessibility remediation, security patches, support tooling, and contractual customer work.

  Apply a **risk-scoped freeze** to new authorization-sensitive surfaces, new LLM data flows, additional impersonation paths, parallel social renderers, and major IA rewrites. Continue shipping:

  - Security, privacy, messaging, billing, and data-correction fixes.
  - Trainer/client support and incident tooling.
  - Accessibility and 44px touch-target fixes.
  - Performance and reliability work.
  - Narrow contractual deliverables that reuse existing policy and components.
  - Tests, observability, file decomposition, and dependency maintenance.

- **Security**

  **3. Missing P0s**

  The packet proves one omitted P0: **AI disclosure/data handling**. The following are mandatory P0 investigations, but the packet does not prove they are current exploits:

  - **Trainer-client relationship as a first-class authorization entity.** `[UNCERTAIN]` Required evidence: schema/migrations, lifecycle states, tenant keys, assignment history, backend policy, and revocation tests. Messaging cannot be safely fixed without this.
  - **Multi-tenant scoping.** JWT-derived self analytics protects one class of access, not all 21 consumers of global client state. Required evidence: endpoint-by-endpoint authorization tests attempting cross-tenant IDs, View-as IDs, and stale selected clients.
  - **Billing-to-relationship truth.** `[UNCERTAIN]` Package payment, subscription tier, coach assignment, and communication entitlement may be separate facts. Required evidence: billing webhook handlers, idempotency/replay behavior, refund/chargeback handling, and the transaction that creates or terminates a relationship.
  - **Minors and guardians.** `[UNCERTAIN]` If minors are supported, guardian consent, coach messaging, community visibility, AI processing, and notification delivery need separate policy. If minors are categorically prohibited and enforced, document that instead.
  - **In-flight revocation.** Consent withdrawal, entitlement loss, relationship termination, or tenant removal must invalidate queued Coach jobs, cached envelopes, websocket subscriptions, notification jobs, offline writes, and open message composers. Snapshot versions alone are insufficient.
  - **Offline and failed-write truthfulness.** Preview/confirmation/receipt covers successful workflows but not timeout-after-commit, duplicate retry, optimistic UI rollback, or queued writes after revocation. Every mutation needs an idempotency key and a way to query authoritative completion.
  - **Notification/consent interaction.** Withdrawal must stop future AI generation and queued AI-derived notifications without falsely deleting records that must legally or operationally remain.
  - **Context-token attacks.** The envelope needs high-entropy opaque IDs, actor and subject binding, tenant scope, expiry, purpose restriction, rate limits, replay rules, and audit records. A signature alone does not prevent replay.
  - **Prompt injection.** Typed entities must not become arbitrary untrusted prose. The server should select approved fields and treat assignment/community text as data, not instructions.
  - **Session-storage actor changes.** `[UNCERTAIN]` If logout does not clear viewer-bound selected-client state, another login in the same tab may rehydrate the prior subject. Evidence: `GlobalClientContext.tsx:93,129,135,136,141`. Required test: logout/login under a different actor with the same tab and storage.

  No SSRF or secret-handling defect is established by this packet; those require endpoint and deployment evidence rather than speculation.

- **Data-truth / schema drift**

  **6. Blueprint readiness — unresolved decisions**

  This is not ready for an executable Mermaid flow until these decisions are settled:

  1. The canonical actor, experience-role, subject, tenant, and mode types—and which layer may change each.
  2. Whether IDs are numeric everywhere; the current View-as validator assumes positive integers.
  3. The trainer-client relationship table/entity, states, FK targets, tenant key, effective dates, suspension/termination semantics, and guardian support.
  4. Entitlement precedence among package purchase, subscription, trial, manual grant, trainer assignment, refund, and chargeback.
  5. Message authorization and history rules after reassignment, termination, blocking, or tenant transfer.
  6. Whether View-as remains strictly read-only and which exact GET endpoints are safe to add.
  7. Whether `DashboardActorContext` is per-route or application-wide, how it is invalidated, and how stale async responses are discarded after a subject switch.
  8. The envelope storage design: random reference versus signed token, TTL, single-use/replay policy, revision validation, return URL allowlist, and deletion.
  9. The exact outbound LLM field allowlist, provider, retention, deletion, logging, consent version, and behavior for already queued work.
  10. Coach write idempotency, timeout-after-commit reconciliation, receipt schema, undo scope, and source-record linkage.
  11. A complete inventory of every `teachPrompt` producer; the four confirmed producers prove this is not client-only.
  12. Canonical feed/card API and response shape, moderation controls, pagination, visibility rules, and a feature-parity matrix for client-specific systems.
  13. Route aliases, redirects, bookmarks, notification deep links, white-label routes, and telemetry needed before the five-destination IA migration.
  14. Offline and websocket behavior during actor, relationship, entitlement, or consent changes.
  15. Billing webhook replay and atomicity between payment truth, coach assignment, and communication access.
  16. The protected-branch platform decision and the smallest enforceable required-check set.
  17. Current-main reconciliation for the eight commits after the audited commit.
  18. House-rule acceptance criteria: styled-components only, Victory only, palette tokens with fallbacks, Dual-Button Glow, 44px targets, dark-first rendering, 4.5:1 contrast, and file-size enforcement. The packet does not verify existing library compliance.
  19. File decomposition boundaries for the confirmed over-300-line consent/onboarding components.
  20. Accessibility behavior for drawers, dialogs, confirmations, charts, tables, toasts, and focus restoration at required breakpoints.

  The eventual Mermaid should show separate browser, application server, policy engine, data store, job queue, notification service, and LLM-provider trust boundaries, including denial, expiry, revocation, retry, and partial-failure branches—not only the happy path.

## HIGHEST RISK

The most dangerous item is continued LLM processing under misleading “anonymous” consent while stable pseudonyms and health-related attributes may be included. The cheapest de-risking step is to enable a server-side kill switch or outbound allowlist that rejects noncompliant client fields, patch every identified consent surface, and keep affected generation paths disabled until request-level tests prove only permitted data leaves the server.

## CONFIDENCE

High confidence in the messaging gate, URL prompts, session-storage subject state, existing fail-closed View-as subsystem, GitHub protection paywall, consent-copy locations, and over-300-line violations because the packet supplies direct file or API evidence.

`[UNCERTAIN]` I could not verify the full 1,687-line audit, the eight commits after the audited commit, production behavior, backend messaging authorization, relationship or tenant schemas, actual outbound LLM payloads, minors support, billing webhooks, websocket/offline behavior, canonical-feed feature parity, current GitHub ruleset eligibility, or compliance with the visual/component house rules.

Evidence that would settle those gaps:

- A current-main checkout and commit diff.
- Schema/migrations and server authorization middleware.
- Authenticated cross-role and cross-tenant API tests.
- Captured/redacted outbound LLM request schemas and centralized policy tests.
- Billing webhook and idempotency tests.
- Logout/login, revocation, offline-retry, websocket, and timeout-after-commit tests.
- Canonical-versus-client feed component and moderation matrices.
- GitHub settings/API evidence after the owner chooses a plan.
- Authenticated Playwright, keyboard/screen-reader, contrast, touch-target, visual, and performance results.
- Dependency/import scans for prohibited UI and chart libraries.

A verified cross-subject read/write would move actor/subject drift back to the top P0 tier. Proof that sensitive attributes never leave the application server would reduce the AI item’s security severity, but the misleading consent language and stable-pseudonym disclosure would still require correction.

==================================================
SEAT: KIMI-PANEL-REVIEW.md
==================================================
# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 6756 in / 1576 out | **Cost:** ~$0.0439 | **Wall:** 9.4s | **finish_reason:** stop

---

## VERDICT
REVISE — the audit's core diagnoses (P0.1, P0.2, P0.4) survive independent verification, but its #1 hotfix is paywalled and non-executable, one prescription targets a subsystem that already exists fail-closed, and the consent-wording issue is mis-severitied.

## BLOCKERS
1. **P0 — Hotfix #1.1 is a dead end.** Input: follow stage 1, step 1 ("protect main, require checks") → output: `403 "Upgrade to GitHub Pro or make this repository public"` (§3.5). The plan's first action cannot be executed on this account/plan, and it gates everything behind it. Evidence: §3.5 direct API result. Any blueprint inheriting this order starts blocked.
2. **P0 — Prescription "add an audited View-as-Client mode" builds a duplicate of an existing fail-closed subsystem.** `backend/middleware/viewAsGuard.mjs` (145 lines, 403s all mutations, strict positive-int validation), `adminImpersonationService.mjs`, audit-log migration, and three test files already exist (§3.4). Cost if scheduled anyway: a second, likely weaker impersonation path — the worst possible outcome for an auth-adjacent feature. Real gap is frontend banner/exit + allowlist breadth only.
3. **P0 — Consent wording is mis-severitied as "major," not P0.** "Your identity is hidden / anonymous client ID" appears at the onboarding consent-capture moment (`ConsentSection.tsx:232,209,257`, `ClientOnboardingWizard.tsx:735`) while a **stable** pseudonym plus medical conditions, injuries, current pain, measurements, age, gender are transmitted (`deIdentificationService.mjs:185`, §3.6). Consent captured under a false description of processing is a validity/disclosure defect, and it's the cheapest P0 to fix. The audit's own ranking under-weights it.
4. **P1 — P0.3 prescription ("retire the client-only renderer") would delete faction/party/challenge/hashtag systems** (`FactionLeaderboard`, `PartyHPBar`, `PartyCreateJoin`, `EventsList`, §3.7) with no evidence the canonical feed has equivalents. Literal execution = feature regression on a live production surface.
5. **P1 — P0.2 fix will collide with a deliberate contract-test lock.** `useMessaging.tierGate.test.ts:56` pins `messagingEnabled = isStaffRole || isElite` (§3.1). Someone froze this behavior intentionally; the plan never asks *why* before overturning it. If it encodes a real business decision (upsell gate), the "fix" is a revenue-policy change smuggled in as engineering.

## ATTACKS
- **Correctness:** The audit's own numbers are sloppy — "sixteen sidebar destinations" vs. 15 verified (§3.8); "essentially author, body, and time" vs. a page carrying RPG social systems (§3.7). Two factual misses in verifiable claims means every unverified claim in the unseen 1,687 lines must be treated as suspect. The plan also never addresses mid-session entitlement change: `isElite`/`hasCrystallineAccess` are derived per-render from a cached subscription object — a client whose subscription lapses mid-session keeps stale capability until refetch, and nothing in the packet describes invalidation. `sessionStorage`-persisted active client (§3.3) survives tab reload but not the actor's role/entitlement changing — classic stale-subject race the `DashboardActorContext` prescription gestures at but doesn't sequence against the sessionStorage rehydration path.
- **Security:** `teachPrompt` in URLs (§3.2) leaks workout/assignment content into browser history, server logs, analytics, and Referer headers — and the pattern is **not client-only** (`workoutPlannerHandoffRoutes.ts:193` admin path), so the envelope migration is wider than scoped. The packet never examines whether the view-as allowlist's 4 gamification GETs leak cross-tenant data when `GlobalClientContext` sessionStorage state disagrees with the server-side `viewAs` parameter — client-side subject state and server-side view-as are two parallel impersonation mechanisms with no documented reconciliation. That's an IDOR-shaped gap neither the audit nor the verifier closed. Messaging gate: sidebar link is unconditional (§3.1) — the route itself presumably renders the wall, but if the gate is UI-only (`MessagingView.tsx:30` is a frontend const), the underlying messaging API authorization is unverified in this packet. [UNCERTAIN — needs the messaging API route handler.]
- **Data-truth / schema drift:** `isElite` conflates subscription tier with training-client status (§3.1) — a semantic drift between the billing model ($175/session packages don't set `tier`) and the authorization model. The consent screen's claims have drifted from what `deIdentificationService` actually does (stable pseudonym, retained medical fields). The audit's "anonymous" language and the backend comment (`deIdentificationService.mjs:185`) show the drift is repo-wide, docs-to-code.

## HIGHEST RISK
The consent-validity defect (§3.6). It's the only finding that is simultaneously: load-bearing at a legal moment (onboarding consent capture), factually false as stated to the user, transmitting medical data under a stable pseudonym, and cheap to fix. Cheapest de-risk before ship: a copy-only hotfix — replace "anonymous/identity hidden" with accurate pseudonymization language in the four frontend locations, plus a one-paragraph server-side policy statement of fields processed/removed/retained. No schema change, no migration, shippable in a day, and it doesn't depend on the paywalled branch-protection item or any architectural work.

## CONFIDENCE
I could not verify from this packet: (1) whether the messaging API enforces its own authorization server-side or relies on the frontend `messagingEnabled` const — the route handler would settle it; (2) whether the tier-gate contract test encodes a deliberate revenue decision — git blame/commit message on `useMessaging.tierGate.test.ts` would settle it; (3) whether the canonical social feed has faction/party/challenge equivalents — a tree read of the canonical feed components would settle it; (4) whether GitHub rulesets are available on this private/free repo as a branch-protection substitute — `GET /repos/.../rulesets` would settle it; (5) anything in the ~1,600 unseen audit lines, including whether P0.1's "competing contexts" rise to an actual cross-user data path or remain architectural smell — the audit itself disclaims a verified exploit. My severity upgrade of the consent issue is my judgment call; if counsel or a privacy review has already signed off on the current wording, that would change my mind, but nothing in the packet indicates that.

==================================================
SEAT: GLM-PANEL-REVIEW.md
==================================================
# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Tokens:** 6708 in / 12392 out (reasoning: 9560) | total 19100
**Wall:** 183.3s

---

## VERDICT
REVISE — the packet's section-3 verification is the strongest artifact in the chain, but it ships one load-bearing claim with no citation, leaves a $4/month decision "open for panel debate," and misses the systemic disease behind P0.2, a staleness flaw in the audit's own favorite prescription, and two house-rule violations its own line numbers expose.

## BLOCKERS

1. **P0 — Entitlement-source conflation is systemic; the audit found one symptom and the packet declared it "worse than stated" without proving the worst part.** Scenario: client with an $8.4k package (`tier` never set) opens Messages → denied contact with the trainer they're paying; a trial user simultaneously gets `hasCrystallineAccess` social surfaces. The unexamined question is every *other* consumer of `tier` — Book Session, package credits, coach-assistant, community posting. Evidence: `MessagingView.tsx:30`, `useSubscription.ts:176,183`, `ClientStellarSidebar.tsx:84`. Critically, the packet asserts "those purchases do not set `tier === 'elite'`" with **no file:line** — this is the load-bearing claim for the "highest-paying clients gated out" sharpening and it is uncited. Required lookup: the billing webhook / wherever `subscription.tier` is written. If packages DO grant a tier, P0.2's severity drops a notch; if they don't, the missing P0 is the whole *class*, not messaging.

2. **P0 — Consent is not a wording problem, and the packet's "cheapest P0 on the list" framing understates it.** Under binding house rules (**zero PII to LLMs — IDs only**), the de-identification service preserving age, gender, measurements, medical conditions, injuries, current pain, supplements, sleep, stress under a *stable* pseudonym is a rule conflict no copy edit resolves — a trainer with a few dozen clients can identify "Client #7, 54, post-knee-surgery, pain 7/10" trivially. Evidence: `AiConsentScreen.tsx:659`, `ConsentSection.tsx:209,232,257`, `ClientOnboardingWizard.tsx:735`, `deIdentificationService.mjs:185`. Two unmade decisions block ship: (a) which fields actually go to the LLM vs. which the disclosure lists; (b) whether users consented under the false "identity is hidden" description get re-prompted — new wording means a new `consentVersion`, and old consents were arguably obtained under a materially false processing description. Re-consent is a churn event; not re-consenting is a legal exposure. Nobody in the chain raised the retroactivity question.

3. **P0 — `teachPrompt` is a data-leak, not just an authority problem.** Everyone framed P0.4 as "text in URL is not a typed context." The sharper failure: prompt builders consuming workout *snapshots* (`ClientMyWorkoutsPage.logic.ts:78`) plausibly carry pain/injury narrative into query strings → browser history, server access logs, analytics, referrers, with zero retention control. Evidence: `ClientObservatoryData.ts:114`, `ClientCurrentWorkoutCoachAction.ts:81`, `workoutPlannerHandoffRoutes.ts:193` — and the planner citation proves migration scope exceeds the client dashboard; any envelope plan scoped to "client dashboard" under-counts the work.

4. **P1 — Two of five stage-1 items are provably wrong as written, and the packet wavers on the fix.** (a) View-as exists, fail-closed, tested (3.4) — the real work is the banner/exit (audit's own #1.7) plus *deliberate* allowlist extension; a builder told to "add" it will ship a second, worse subsystem. (b) Branch protection returns 403 paywalled (3.5). The correct remedy is not a panel debate: a business billing $175/session and $8.4k–$33.6k packages buys GitHub Pro for ~$4/month the same day. Check rulesets-on-plan availability as a bonus, never make the repo public, and stop listing "pre-push hooks + convention" as candidates — `--no-verify` and convention are exactly what produced the D release-confidence grade. Cost if uncorrected: the first sprint of the remediation burns on dead ends and the plan loses the team's trust.

5. **P1 — The `DashboardActorContext` prescription contains its own staleness bug.** An `entitlementSnapshot` cached in frontend context with no specified TTL or mutation-time revalidation means a lapsed subscription or terminated coach relationship keeps granting until the next context hydration — deny-by-default plus a stale cache equals a stale-*allow* window, the worst direction, on money-adjacent capabilities. And if deny-by-default is enforced client-side only, it is decoration; the repo's genuine strength (per the audit itself) is server-side JWT derivation. The context must be a cache of server-issued truth, validated server-side at mutation time, and must *replace* `GlobalClientContext` for its 21 consumers — otherwise P0.1's fix adds a 22nd competing context and recreates the disease.

6. **P1 — `CoachContextEnvelope` as specified is a bearer-capability replay risk.** If `permittedActions` travels client-side and only the signature is checked, an envelope replayed within `expiresAt` still authorizes after consent withdrawal — `consentVersion` must be re-checked at *execution*, not issuance, and the consent kill-switch must invalidate outstanding `contextId`s server-side. Storage backend, TTL, and signing-key management are all undecided, which alone makes stage 3 not blueprint-ready.

7. **P2 — House-rule violations the packet's own citations expose but nobody flagged.** `AiConsentScreen.tsx` has content at line 659 and `ClientOnboardingWizard.tsx` at line 735 → both provably exceed the ≤300-line rule (the packet checked `ClientCommunityPage.tsx`'s 297 and missed these two). The audit's release-gate list omits 44px touch targets, WCAG 4.5:1 verification, Victory-only (no Recharts), styled-components-only (no MUI), and `var(--token,#fallback)` palette checks — the gate suite should encode the house rules, or they drift again.

**Re-ranked order (cost-of-wrong × likelihood):** (1) consent — cheapest, and every day compounds new consents captured under a false description; (2) entitlement-source matrix → messaging fix — confirmed live revenue harm, but *after* the one-day matrix so the fix generalizes; (3) `teachPrompt` → opaque server-stored context with TTL; (4) actor context as server-authoritative wrapper; (5) branch gates — $4, day one, parallel, not blocking; (6) community canonical-card extraction, last. The frozen contract test (`useMessaging.tierGate.test.ts:56`) is a change-detector asserting a source string — an anti-pattern — but someone froze it deliberately; find the decision owner via git blame/PR *before* replacing it with two behavioral tests (relationship lane, social lane). Do not silently delete.

## ATTACKS
- **Correctness:** Progress surfaces collapse failures to "unavailable/null" per the audit — if any chart maps null to 0, clients see fake regression; one targeted test settles it. `GlobalClientContext` rehydrating from `sessionStorage` across 21 consumers is textbook stale-subject: surface A initializes with client X, trainer switches to Y elsewhere, A keeps acting on X. The sidebar off-by-one (16 claimed, 15 actual per 3.8) is cosmetic but proves number hygiene in the audit is loose — nothing numeric goes into the blueprint unverified. The plan also lacks freeze carve-outs: "stop expanding the dashboard" on a live product must exempt booking/payment, security fixes, and trainer-side revenue surfaces, and the actor-context migration must be strangler-fig (route-by-route behind gates), not big-bang — 8 commits of drift have already accumulated against a pinned audit.
- **Security:** The messaging capability split is cosmetic unless the backend validates the coach-client relationship on *send* — packet supplies no evidence it does; required lookup. Audit P0.1's "client mode passes authenticated viewer ID into shared scheduling" is an unverified write-as-wrong-subject — one authenticated test in client-mode attempting a booking settles it cheaply; schedule it stage 1. `viewAs` appears to travel as a request parameter — same log-leak class as `teachPrompt` (subject IDs into access logs); allowlist extension must keep the existing per-endpoint reasoning discipline (`'unsafe'`/`'self-only'`). The new client action lane is an LLM cost/DoS surface — no rate-limit spec anywhere in the packet. Envelope signing keys: generation, storage, rotation — unspecified.
- **Data-truth / schema drift:** The core drift here is *semantic*: `subscription.tier` (a billing column) repurposed by callers as a relationship proxy — the worst kind of model-vs-caller drift because both sides "work." `teachPrompt` built from snapshots with no revision binding means Coach explains a stale workout after the trainer edits the plan mid-session — the audit's "no source-record version," concretized. The prescribed `entitlementVersion` field assumes a version column exists; schema lookup required. Mounting the canonical feed needs a response-shape/prop inventory proving parity with the client mini-feed's RPG surroundings (`FactionLeaderboard`, `PartyHPBar`, `useFaction` etc., per 3.7) — that evidence does not exist yet, which is exactly why "temporarily mount the canonical feed" in stage 1 is wrong: extract the canonical post *card* into the client page, keep the client-specific systems, and port RPG into canonical only after extension points are proven. No PascalCase/snake_case table drift is evidenced in this packet — I won't invent it; add it to the gate as a check, not as a finding.

## HIGHEST RISK
**Entitlement-source conflation (Blocker 1).** One instance is confirmed in code, a second flag (`hasCrystallineAccess` treating trial as paid) shares the same hook, and the blast radius includes money paths nobody has looked at — it silently mis-prices access and mis-gates the highest-revenue clients, and the packet's key claim about it is uncited. Cheapest de-risk, do it before any stage-1 code: a one-day matrix — grep every consumer of `useSubscription` / `isElite` / `hasCrystallineAccess` / `tier`; locate the tier writer (billing webhook); classify each surface's *correct* entitlement source (subscription vs. coach-client relationship vs. package); review the table with the product owner who froze the tier-gate test. That single artifact also scopes P0.2's fix honestly — if no queryable relationship entity exists, "fix messaging" is stage-2 schema work wearing a hotfix costume.

## CONFIDENCE
I could not verify from the packet alone, with the evidence that would settle each: **(1)** whether package purchases ever set `tier` — read the billing webhook/tier writer; this flips P0.2's severity narrative. **(2)** Whether the messaging backend validates the trainer relationship server-side — read the messaging send endpoint/controller. **(3)** Whether client-mode scheduling mutations actually write the wrong subject — one authenticated request in client-mode. **(4)** Whether the canonical post layer has extension points for the RPG systems — component/prop inventory of the canonical feed. **(5)** What `teachPrompt` snapshot text actually contains (PII audit of the prompt builders) — determines whether Blocker 3 is P0 or P1. **(6)** Whether repository rulesets are available on this account's plan — check org settings; my knowledge of GitHub's plan matrix may be stale, which is exactly why I'd pay the $4 rather than research it. **(7)** Whether the 8 commits since `66ffde607` touch any cited file — `git diff 66ffde607..origin/main` over the cited paths; every line citation in this packet is pinned to a commit the tree has moved past. **(8)** Actual field map of `deIdentificationService` output, total line counts of the files only cited by interior line, whether white-label implies multi-tenant scoping (if yes, that's an unexamined P0 class), and whether minors exist in the client cohort while `age` is transmitted. I am also treating section 3's tree reads as accurate on faith — if another panel seat contradicts 3.4's fail-closed characterization, Blocker 4(a) weakens and the audit's "add view-as" partially revives. My severity upgrade of consent (Blocker 2) is the judgment call I'd most want challenged: if the actual LLM payload turns out to be IDs plus coarse non-identifying fields only, it drops back to copy-fix territory.

==================================================
SEAT: GROK-PANEL-REVIEW.md
==================================================
# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `x-ai/grok-4.6` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 7053 in / 12612 out · **Cost:** ~$0.0896 · **Wall:** 263.8s · **finish:** stop

---

## VERDICT
REVISE — the audit’s diagnoses for messaging, URL-borne Coach context, and competing subject state are real, but as a build blueprint it is not executable: it leads with a paywalled GitHub action, tells you to invent a fail-closed view-as system that already exists, and would delete a richer Community surface it did not actually read.

## BLOCKERS
1. **P0 — Stage-1 item 1 is a dead end, and it is first on purpose.** Failure: team opens “protect `main` + required checks,” `GET /repos/SeanSwan/-SS-PT-New/branches/main/protection` returns 403 (“Upgrade to GitHub Pro or make this repository public”), Stage 1 stops or someone makes a private production SaaS public. Evidence: packet §3.5; audit P0.5 / recommended order step 1. Symptom is right (unguarded `main`, 8 commits of drift, four workflows that are not a dashboard gate). Cause and remedy are wrong. Making the repo public is a worse incident than the one being fixed.

2. **P0 — Hotfix “add an audited View-as-Client mode” rebuilds a safer system that already shipped.** Failure: builder follows audit §P0.1 / order 1.3, stands up a second impersonation path, now two definitions of “who am I reading as” exist, and the new one is unlikely to 403 every `viewAs` mutation, reject arrays/empties, or keep `/api/messaging/*`, `/api/consent/*`, `/api/auth/*` off-limits. Evidence: §3.4 — `backend/middleware/viewAsGuard.mjs` (145), `adminImpersonationService.mjs` (254), `viewAsSupportedEndpoints.mjs` (26), migration `20260623000100-create-admin-account-audit-logs.cjs`, tests `getEffectiveReadUserId.test.mjs`, `gamificationViewAs.test.mjs`, `adminImpersonationService.test.mjs`. Allowlist is four gamification GETs. Real gaps are frontend banner/exit (audit 1.7) and allowlist breadth — not “add view-as.”

3. **P0 — P0.3 prescription, executed literally, deletes live client social systems.** Failure: “retire the client-only renderer and mount the canonical feed” lands; `ClientCommunityPage.tsx` (297) loses hashtag discovery, `FeedFilterBar`, inline post+hashtag extract, challenge progress, live leaderboard, `FactionLeaderboard`, `PartyHPBar`, `PartyCreateJoin`, `EventsList`, `useFaction`, `useParty`. Audit described this page as “essentially author, body, and time” (§P0.3). §3.7 shows that is false. Canonical feed is not shown to have RPG/challenge equivalents. Do not schedule the retirement.

4. **P1 — P0.2 fix will be another wrong proxy unless the relationship entity is found first.** Failure: `canMessageAssignedCoach` is derived from “whatever we can join this week” (last booking, any assignment row, package SKU, `isElite` inverted); a $8.4k-package client still hits the wall, or a lapsed client messages a trainer they no longer have. Evidence: `MessagingView.tsx:30` `messagingEnabled = isStaffRole || isElite`; `useSubscription.ts:176` `isElite` is `tier === 'elite' | 'premium'`; sidebar `ClientStellarSidebar.tsx:84` is unconditional; `useMessaging.tierGate.test.ts:56` pins the exact gate string. Packet §3.1: training packages do not set `tier === 'elite'`. The test means this was frozen on purpose — split the lock, do not delete it.

5. **P1 — Stage-1 “opaque context ID” without a server envelope breaks Coach in the gap before Stage 3.** Failure: query `teachPrompt` is removed (§3.2: `ClientObservatoryData.ts:114`, `ClientCurrentWorkoutCoachAction.ts:81`, `ClientMyWorkoutsPage.logic.ts:78`, and admin `workoutPlannerHandoffRoutes.ts:193`); Coach opens with an ID nothing redeems; client action “ask Coach about this assignment” no-ops or teaches from stale text still sitting in history. Envelope is Stage 3. Handoff is also admin, not client-only.

If those four prescriptions are rewritten, there is no remaining “do not start” blocker on the *diagnoses*. The god-object `DashboardActorContext` (viewer / experienceRole / subject / mode / capabilities / entitlementSnapshot / consentSnapshot / auditSessionId, consumed by every route/query/mutation/Coach/message/chart/schedule, deny-by-default) is not a ship blocker; it is a multi-sprint rewrite that will 403 legitimate self-service clients the first week the relationship graph is incomplete. Do not treat it as a gate.

## ATTACKS
- Correctness: Happy-path-only logic is the audit’s own method — static, commit-pinned, no authenticated session, no CWV, no websocket, no Playwright (§0). It still scored Performance C- and Release D against numbers it never measured; those grades are rhetoric. P0.1 is real state drift (`GlobalClientContext.tsx:93,129,135,136,141` rehydrates subject from `sessionStorage`, ≥21 consumers) but the audit never shows a write that trusts that ID over the JWT. Backend already has `getEffectiveReadUserId` + fail-closed `viewAsGuard`. Replacing sessionStorage with a new frontend mega-context that is *not* a projection of JWT + server view-as is the same bug with a better name. Deny-by-default on “relationship cannot be proven” will lock a paying client out of their own Today/log loop. Off-by-one: sidebar is 15 entries, not 16 (§3.8) — IA argument survives, any plan that quotes “16” as a KPI does not. Unhandled error path the audit under-plays: workout log looks successful and does not persist — not in the five P0s, despite being the core loop in the “definition of flawless.” P0.3 direction is right (two post cards will drift on report/mute/block); degree and prescription are wrong. Consent “major finding” is under-scoped: the lie is load-bearing at legal capture, not just a settings screen — `AiConsentScreen.tsx:659`, `ConsentSection.tsx:209,232,257`, `ClientOnboardingWizard.tsx:735`, `deIdentificationService.mjs:185`. `AiConsentScreen` is already ≥659 lines (house rule: ≤300). Stage order couples a paywall, a legal copy fix, a business-rule change, a Community rewrite, and a drawer focus trap into one “hotfix”; that is how the cheap fixes wait on the impossible ones.

- Security: Authz/IDOR — audit correctly does *not* claim a verified cross-user exploit and credits JWT-derived analytics. What it missed: `viewAs` is already the control plane; `/api/consent/*` is correctly `self-only` and must stay that way when someone “adds view-as” to the dashboard. Injection/SSRF not evidenced. Secret handling not evidenced. Replay/idempotency: Coach writes need preview→confirm→execute→verify→receipt; that part of P0.4 is correct and must be preserved, including the tested line “Do not claim the workout was logged” (`ClientCurrentWorkoutCard.test.tsx:136`). Multi-tenant / white-label: audit says “preserve white-label awareness” and never checks whether `sessionStorage` subject IDs, community feed, or messaging can cross a tenant — required lookup, not a finding I will invent. Rate-limit/DoS not in scope. House-rule collision: “zero PII to LLMs (IDs only)” — `teachPrompt` in the query string is already a violation if the builder sends assignment prose rather than IDs; the envelope is the compliant shape *only if* `entities[]` stay identifiers + revisions. Do not put medical/pain/injury text in the LLM payload. Existing view-as correctly refuses to impersonate consent and messaging; any frontend “view-as the whole dashboard” that then calls those APIs as the subject is an IDOR you would be *introducing*.

- Data-truth / schema drift: Root drift is not PascalCase. It is **three entitlement languages that do not join**: `subscription.tier` (`elite`/`premium`/`trial`), training packages that §3.1 says never set that tier, and trainer–client relationship (unspecified schema). `hasCrystallineAccess = isElite || isTrial` (`useSubscription.ts:183`) is a fourth local oracle. Messaging uses `isElite`; sidebar uses nothing; Crystalline uses trial-or-elite. That is the same class of bug as column-vs-caller drift. `DashboardActorContext.entitlementSnapshot` will snapshot whichever of those is wrong unless billing→package→relationship→tier is mapped first. Frontend response-shape drift: client Community cards vs canonical post layer is real; the surrounding page is a different product, not a stale card. Consent copy says “anonymous” / “identity hidden” / “personal details are never sent” while the de-ID service keeps a *stable* `Client #ID` plus age, gender, measurements, medical conditions, injuries, current pain, supplements, sleep, stress, activity — that is schema-truth vs UI-truth, and it is the moment consent is captured. Chart/progress “theatrical” surface (cockpit, 3D cube, war room, constellation) is a response-shape and a11y problem; simplification is right. Any rewrite must stay Victory-only, styled-components-only, `var(--token,#fallback)`, Dual-Button Glow, 44px, dark-first, WCAG 4.5:1 — the audit never binds those, so a builder will reach for Recharts/MUI and 800-line providers. Flag now: that would be a house-rule reject even if the IA is perfect. Credentials language and “yoga/meditation” are not present in the plan; keep them that way. “NASM-certified” must not appear in Coach/consent/progress copy.

**Kill list (schedule-anyway cost):**
- “Add view-as” (§2 hotfix 1.3) — dual impersonation, likely weaker than `viewAsGuard`. Replace with: banner + one-click exit + deliberate GET allowlist expansion.
- “Protect `main`” as written (§2 P0.5, order 1) — blocked or repo becomes public. Replace with: paid GitHub Team as a *parallel ops* ticket; near-term rulesets-if-available / CODEOWNERS / CI-red-means-stop / pre-push. Never public.
- “Retire client Community renderer” (§2 P0.3) — deletes faction/party/challenge/hashtag. Replace with: extract the canonical *post card* into the client page; keep surrounding systems until a side-by-side inventory exists.
- “Sixteen destinations” — wrong number. Kill the numeral.
- Immutable deny-by-default `DashboardActorContext` as Stage-2 gate — months of rework, self-lockout. Replace with a thin projection of JWT + `getEffectiveReadUserId` / view-as session, used first by messaging, Coach handoff, and current-workout.
- “Stop expanding until five unifications complete” — see over-correction below. Kill the freeze; keep the “no new subject-context consumers” rule.

**Severity re-rank (cost of being wrong × likelihood). Do #1 this week.**
1. **P0.2 messaging gate** — likelihood 1 if any non-elite paying trainee exists; cost is retention, safety (pain/recovery), and the product promise. Understated, not overstated. First.
2. **Consent misrepresentation (§3.6)** — upgrade to P0-legal is justified, not because copy is glamorous, but because onboarding is the capture moment and the processing description is false for health fields under a stable pseudonym. Cheapest P0. Ranked below messaging because nobody is blocked from training today by a word; ranked above URL leakage because consent validity is the thing you cannot patch after the fact. Not over-weighted vs “major”; slightly over-weighted if it is allowed to jump P0.2.
3. **P0.4 `teachPrompt` in URLs** — confirmed, also admin; leaks into history/logs/referrers; violates IDs-only LLM rule. Interim: stop adding new `teachPrompt`s; pass assignment/workout IDs only.
4. **P0.1 actor/subject drift** — keep P0 as architecture, not as “confirmed IDOR.” Concrete risk today is wrong-subject UX and view-as allowlist that cannot see the dashboard (four gamification GETs).
5. **P0.5 release intent** — keep; change remedy; do not block product fixes on a SKU.
6. **P0.3 dual Community** — demote to P1. Real moderation-drift risk; naive fix is more dangerous than the bug.

**Missing P0s the audit did not raise**
- **Entitlement is not a model.** `tier`, trial, package purchase, and trainer relationship are unjoined. P0.2 is a symptom. `hasCrystallineAccess` says the proxy has already spread. Without this map, every later snapshot field is fiction.
- **Trainer–client relationship is not established as a first-class row the messaging fix can read.** Scheduling “client mode” passing the *viewer* ID (§P0.1) is the same hole.
- **View-as cannot see the client dashboard.** Misdiagnosed as “missing subsystem.” Trainers still cannot do the “definition of flawless” view-as scenario against Today/Training/Progress.
- **Core-loop write honesty.** Log/progress/Coach “success” without an authoritative read-back. Audit wants receipts for Coach writes and ignores the workout log.
- Minors’ health data + stable pseudonym + Coach: not raised. I will not promote it to P0 without an age field — required lookup. Same for tenant scope and billing webhooks; given packages do not set `tier`, billing→entitlement is the likely money P0 and should be grepped before Stage 2.

**Order attack (corrected)**
Do not wait on GitHub Pro. Do not rebuild view-as. Do not mount canonical feed in week 1. Do not remove `teachPrompt` until an ID redeems.

0. **Ops, parallel, non-blocking:** price GitHub Team; check rulesets; CODEOWNERS on auth/privacy/Coach/shell; existing four workflows stay red-means-stop. Repo stays private.
1. **This week, live harm:** (a) product-intent read on `useMessaging.tierGate.test.ts` — if Elite-only *community* DMs are a sale, keep that test and add `canMessageAssignedCoach` from an *active relationship*; if the test is accidental, still split, do not just delete. (b) Correct anonymity language in all four UI sites plus the backend comment; do not wait for a centralized policy service to stop lying. (c) Persistent view-as banner + one-click exit on top of *existing* guard. (d) Ban new `teachPrompt` query params; handoff assignment ID only.
2. **Stop encoding the wrong subject:** thin effective-actor projection aligned with `getEffectiveReadUserId`; expand view-as GET allowlist *deliberately* for dashboard reads; never view-as consent/messaging/auth; extract canonical post *card* only; drawer focus trap; inventory every `isElite` / `hasCrystallineAccess` / `tier ===` call site.
3. **Coach + Progress after 1–2:** `CoachContextEnvelope` (IDs, revisions, expiry, signature), client action lane with receipts, `ClientProgressStory`, Victory/table equivalents, typed “ask Coach about this datum.” Admin planner migrates in the same change, or you leave a second leak.
4. **Signature experiences only after 1–3** — agree with the audit.

**Over-correction:** “Stop expanding until five things unify” is right for *new surfaces that add sessionStorage subject readers* and wrong as a business freeze. Live package clients still need content, scheduling, billing fixes, challenge campaigns, and incident patches. If the freeze is read as “no messaging fix until `DashboardActorContext` ships,” you extend the outage the audit exists to close. Keep shipping: P0.2, consent copy, production defects, billing, trainer tools that do not invent a new subject source, seasonal/challenge *content*. Freeze: new Explore destinations, theatrical Progress modes, a second Community stack, any new Coach URL text.

**Blueprint readiness (unresolved — no Mermaid until these are looked up, not guessed):**
1. Why `useMessaging.tierGate.test.ts:56` exists (monetization vs characterization).
2. Actual tables for client↔trainer, packages, subscriptions, assignments — and whether a package write ever sets `tier`.
3. Canonical feed vs client page: feature matrix (reactions, report/mute/block, faction, party, challenges, hashtags).
4. Account plan / rulesets availability.
5. Full bodies of `currentAssignmentPrompt` / `buildClientWorkoutsCoachPrompt` (PII vs IDs).
6. Privacy policy vs onboarding string (if legal already says pseudonymized, this is UI alignment; if not, it is a legal change).
7. Age gate / minor clients.
8. White-label tenant key and whether `GlobalClientContext` is tenant-scoped.
9. What the 8 post-audit commits already changed.
10. Repo-wide `isElite` / `hasCrystallineAccess` / `teachPrompt` / `sessionStorage` subject writes.
11. Whether any Coach context envelope already exists server-side (audit missed view-as; it can miss this).
12. Which dashboard GETs are safe to add to `VIEW_AS_SUPPORTED_ENDPOINTS` without pulling messaging/consent.

## HIGHEST RISK
Following the plan *as written*: Stage 1 blocks on a GitHub SKU, a second impersonation stack is built beside a fail-closed one, and Client Community’s faction/party/challenge surface is retired — while the highest-paying trainees still cannot message the trainer they are paying (`MessagingView.tsx:30` + `useSubscription.ts:176` + sidebar always-on Messages). Cheapest de-risk before any “architecture consolidation”: (1) confirm or refute the tier-gate test as a business rule in one conversation, (2) ship `canMessageAssignedCoach` off the real relationship row and split the contract test, (3) rewrite the four anonymity strings, (4) add the view-as banner on the *existing* guard, (5) strike “protect main / add view-as / retire client feed” from Stage 1. That is a week; the god-object is not.

## CONFIDENCE
I could not open the 1,687-line audit, the tree, or production. Everything above that is not a path cited in §1–§3 is inference. I cannot verify package prices, that purchases never set `tier`, that no frontend view-as banner exists, that rulesets are unavailable, that the canonical feed lacks RPG systems, or what the 8 later commits did. `[UNCERTAIN]` on minors, tenants, billing webhooks, and whether `sessionStorage` is ever honored on a mutating endpoint (the whole P0.1 exploit story hangs on that). Settling evidence: the lookups in Blueprint #1–#12, plus one authenticated pass at `/dashboard/client/messages` as a non-elite package client, one view-as GET at a dashboard route, and the privacy policy paragraph that onboarding is supposed to summarize. A confident approve of this packet as a blueprint would be the wrong kind of confidence.

==================================================
SEAT: DEEPSEEK-V4-PRO-PANEL-REVIEW.md
==================================================
# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 6831 in / 6467 out · **Cost:** ~$0.0074 · **Wall:** 136.0s · **finish:** stop

---

## VERDICT: REVISE — the plan contains a fatal factual error (view‑as subsystem already exists, §3.4), a dead‑end first step (branch protection paywalled, §3.5), a dangerous community prescription (§3.7), and a consent severity under‑grade (§3.6). It cannot be executed as written.

---

### (b) Correctness attacks

1. **Hotfix #1.3 is a phantom task**  
   The audit demands *“Add an explicit, audited trainer/admin View‑as‑Client mode.”*  
   Evidence: §3.4 shows a 145‑line `viewAsGuard.mjs`, a 254‑line `adminImpersonationService.mjs`, a controller, a migration, and three test suites. The subsystem is fail‑closed, mutation‑blocking, and deliberately narrow.  
   **Cost if scheduled:** a builder constructs a duplicate, likely less safe than the existing fail‑closed design, wasting weeks and introducing regression risk.

2. **Hotfix #1.1 is blocked by a paywall, not negligence**  
   The audit says *“Protect main and make checks required”* as the very first action.  
   Evidence: §3.5 — `GET /repos/…/branches/main/protection` returns `403` because branch protection is a paid feature on private repos for this account’s plan.  
   **Consequence:** Stage 1 cannot start; the entire four‑stage order stalls on day 0.

3. **Community prescription is destructive**  
   The audit says *“retire the client‑only post renderer”* and mount the canonical feed.  
   Evidence: §3.7 — the client page carries faction/party RPG systems, challenge progress bars, hashtag discovery, and a live leaderboard. The audit does not establish that the canonical feed has equivalents.  
   **Cost if executed literally:** deletion of working social‑game features with no replacement, breaking the client community experience.

4. **Consent wording is a P0, not a “major finding”**  
   The audit rates the over‑claiming language as a non‑P0.  
   Evidence: §3.6 — the same “anonymous client ID” claim appears in the onboarding consent flow where legal consent is captured, while the de‑identification service transmits a stable pseudonym with medical conditions, injuries, measurements, age, and gender.  
   **Correctness gap:** the plan’s severity ranking is wrong; fixing this late risks consent‑validity challenges.

5. **Off‑by‑one in sidebar count**  
   The audit claims *“Sixteen visible sidebar destinations.”*  
   Evidence: §3.8 — `ClientStellarSidebar.tsx` declares 15 unconditional entries. The IA argument is unaffected, but the error signals that the audit’s numbers were not verified against the tree.

6. **No error‑path for the `CoachContextEnvelope`**  
   The plan prescribes a short‑lived server‑backed envelope with a signature. It does not address:  
   - What happens when the envelope expires mid‑action.  
   - How the client recovers from a failed `execute` after `confirm`.  
   - How to handle a lost receipt when the authoritative result succeeded.  
   - Key rotation or signature verification failure.  
   These gaps will produce silent failures or stuck states.

7. **Race condition in `DashboardActorContext` migration**  
   The plan demands an immutable context consumed by every route, query, and mutation, replacing the current `sessionStorage`‑backed `GlobalClientContext` and Redux‑initialized role.  
   **Missing:** a migration strategy that handles in‑flight sessions where both old and new contexts coexist. Without it, the dashboard will read stale subject state during rollout.

8. **Performance budgets are unvalidated**  
   The plan gates the progress upgrade on p75 LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.  
   **Gap:** no current Core Web Vitals data exists (the audit was static, no production session). Setting budgets without a baseline is arbitrary and may force premature optimisation or block shipping.

---

### (c) Security attacks

1. **Replay of `CoachContextEnvelope`**  
   The plan’s envelope includes `issuedAt`, `expiresAt`, and a signature, but does not mandate a nonce or one‑time use. An attacker who captures a valid envelope could replay it within the expiry window, triggering repeated writes (e.g., log drafts, reminders).  
   **Fix:** require a single‑use `contextId` with server‑side consumption tracking.

2. **IDOR via `viewAs` allowlist expansion**  
   The existing `viewAsGuard` is deliberately narrow (4 gamification GETs). The plan’s hotfix #1.3 (which is actually about frontend surfacing) may lead to expanding the allowlist without the same fail‑closed rigour. If a developer adds a mutation‑capable endpoint to the allowlist, the impersonation guard is bypassed.  
   **Risk:** the plan does not warn against allowlist creep.

3. **Injection via `teachPrompt` migration**  
   The plan replaces URL‑embedded text with an opaque context ID. However, the `CoachContextEnvelope` still carries *“typed entities[] with revisions”* that will be rendered or processed. If those entities include user‑generated content (workout names, notes), they must be sanitised before reaching Coach or any log. The plan is silent on output encoding.

4. **Multi‑tenant scope leak in Community unification**  
   Mounting the canonical feed in the client dashboard must enforce that the client sees only their assigned trainer’s community, accountability group, and challenges. The plan says *“role‑aware configuration”* but does not specify how the backend scopes queries. A missing tenant filter could expose other trainers’ clients’ posts.

5. **Consent kill‑switch incompleteness**  
   The plan’s P0.5 requires an *“AI‑consent and kill‑switch route inventory.”* The audit found consent wording in four locations (§3.6). If the kill‑switch does not cover all four, a withdrawn consent could leave generation paths active. The plan does not mandate a single server‑side policy enforcement point; it only says *“enforced through one centralized server policy”* for the wording fix, not for the kill‑switch.

6. **Secret handling in release gates**  
   The plan prescribes *“dependency review and secret scanning.”* It does not specify that the scanning must run on every push, not just on `main`, and must block merges. Without pre‑receive hooks, a secret can land in the history before the gate fires.

---

### (d) Data‑truth / schema‑drift

1. **`CoachContextEnvelope` schema undefined**  
   The plan lists fields (`contextId`, `actorId`, `subjectId`, `typed entities[] with revisions`, `permittedActions`, `consentVersion`, `entitlementVersion`, `signature`). No table or column mapping is provided.  
   **Drift risk:** the frontend will build against an assumed shape; if the backend uses `snake_case` while the frontend expects `camelCase`, the envelope will silently fail to deserialise.

2. **`DashboardActorContext` vs existing `GlobalClientContext`**  
   The current `GlobalClientContext` stores `activeClient` in `sessionStorage` with keys like `activeClientId`. The new immutable context introduces `subject{type,id,source}`.  
   **Drift:** if the migration does not rename or map the old keys, two sources of truth will coexist, and components reading from the old context will show the wrong client.

3. **Messaging entitlement model change**  
   The plan splits `canMessageAssignedCoach` (relationship‑based) from `canUseCommunityDirectMessages` (subscription‑gated).  
   **Schema impact:** the `subscriptions` table currently drives `isElite`. The new rule requires a `trainer_client_relationships` table or equivalent. The plan does not confirm that such a table exists or that the backend can derive the relationship from the JWT.

4. **Frontend response‑shape drift in Community unification**  
   The canonical feed likely returns a different post shape than the client‑specific `FeedPost`. The plan says *“mount the canonical feed via role‑aware configuration”* but does not address the data transformation layer. The client dashboard will break if it expects `author, body, time` but receives a nested `user`, `content`, `metadata` structure.

---

### (e) House‑rule violations

1. **No mandate for styled‑components or Victory charts**  
   The plan prescribes *“shared accessible primitives”* and *“chart registry and toggle parity”* but never requires that new UI use `styled‑components` (no MUI) or that charts use Victory (no Recharts). A builder following the plan could introduce MUI or Recharts, violating the non‑negotiable house rules.

2. **No enforcement of Crystalline Swan palette, Dual‑Button Glow, 44 px touch targets, dark‑first, or WCAG 4.5:1**  
   The plan mentions *“Crystalline Swan design identity (with less nested glass/simultaneous glow)”* but does not codify the token‑based palette (`var(--token,#fallback)`), the Dual‑Button Glow pattern, or the 44 px minimum touch target. The accessibility section mentions *“keyboard + automated a11y”* but does not set the 4.5:1 contrast ratio as a gate. These omissions mean the plan could produce a UI that fails the house rules.

3. **Speculative‑success language**  
   The audit’s own text is not included in full, but the packet quotes the audit’s *“definition of flawless”* which uses *“Client opens Today -> understands assignment -> asks Coach -> returns -> logs it -> sees verified Progress update.”* This is a happy‑path scenario with no error states. The plan does not define what *“understands assignment”* means in a measurable way, nor how the system verifies that the client actually understood. This is a speculative‑success description, not a testable requirement.

4. **File‑length rule (≤300 lines)**  
   The plan does not mention the 300‑line file limit. The existing `ClientCommunityPage.tsx` is 297 lines (§3.7); any unification or refactor could easily exceed the limit. The plan should require that new files stay under 300 lines.

5. **Zero PII to LLMs**  
   The plan’s P0.4 addresses Coach context, but the consent wording fix must ensure that the stable pseudonym is not treated as “anonymous” and that no PII is sent to the LLM. The plan does not explicitly state that the de‑identification service must strip all 18 HIPAA identifiers (if applicable) or that the Coach integration must never receive raw PII. This is a gap.

---

### (f) SINGLE highest‑risk item

**The paywall‑dead‑end first step combined with the “stop expanding” freeze order.**  
The plan’s Stage 1 begins with *“Protect main and make checks required”* — impossible on the current GitHub plan (§3.5). Meanwhile, the audit’s decisive recommendation is to *“stop expanding the client dashboard”* until five architectural unifications are complete. If the team follows the plan literally, they will:

- Hit an immediate blocker (branch protection) and stall.
- Freeze all feature work for a production business with live paying clients ($175/session, $8.4k–$33.6k packages).
- Risk losing clients to competitors while the team debates how to unblock Stage 1.

**De‑risk before build/ship:**
1. **Resolve the branch‑protection mechanism within 48 hours.** Evaluate:  
   - Upgrading to GitHub Team (paid) to enable branch protection.  
   - Using GitHub Rulesets (check if available on the free private plan; if not, rulesets may also be paywalled).  
   - Implementing a client‑side gate: pre‑push hooks that run the full gate suite (typecheck, tests, a11y, visual snapshots, performance budgets) and block the push if any fail, enforced by convention and peer review.  
   - If none are acceptable, accept the risk and reorder so that the gate suite runs in CI and the team treats a red CI as a stop signal, with the understanding that direct pushes to `main` are still possible but audited.  
2. **Lift the absolute freeze.** Replace *“stop expanding”* with a **feature‑flag‑driven parallel track**:  
   - All new client‑facing features ship behind a flag, off by default.  
   - The architectural unification work proceeds on a separate branch, integrated behind a flag.  
   - Critical business features (e.g., booking, payment, trainer communication) continue to ship with the existing architecture, with the understanding that they will be migrated later.  
3. **Re‑sequence the plan** so that the paywall‑dependent item does not block the entire remediation. Move the release‑gate work to a parallel track that does not halt other stages.

This single change prevents the plan from becoming a business‑halting document while preserving the architectural goals.

==================================================
SEAT: DEEPSEEK-V4-FLASH-PANEL-REVIEW.md
==================================================
# Grok 4.6 — Hostile Gate Review

**Reviewer:** OpenRouter `deepseek/deepseek-v4-flash` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 6837 in / 6433 out · **Cost:** ~$0.0028 · **Wall:** 55.4s · **finish:** stop

---

## VERDICT: REVISE  
The plan is directionally correct but contains multiple factual errors (view-as subsystem exists, branch protection paywalled, community richness underestimated) and under‑weights consent‑validity risk. The plan must be rewritten to account for existing infrastructure, reorder stages to avoid the paywall dead end, and elevate consent to a P0.

---

## 1. KILL LIST

### 1.1 Hotfix #1.3 – “Add an explicit, audited trainer/admin View‑as‑Client mode”  
**Evidence:** The audit commit contains a full, fail‑closed view‑as subsystem:  
- `backend/middleware/viewAsGuard.mjs` (145 lines) – 403s every mutation, strictly validates integer `viewAs`, narrow allowlist.  
- `backend/services/auth/adminImpersonationService.mjs` (254 lines)  
- `backend/config/viewAsSupportedEndpoints.mjs` (26 lines) – only 4 GET routes.  
- Tests: `backend/tests/unit/getEffectiveReadUserId.test.mjs`, `backend/tests/api/gamificationViewAs.test.mjs`, `backend/tests/unit/adminImpersonationService.test.mjs`.  

**Cost of scheduling anyway:** re‑building a subsystem that already exists, likely less safely than the fail‑closed version already shipped. The real gap is frontend surfacing (persistent banner + one‑click exit), which the audit lists separately as hotfix #1.7 and is genuinely missing. Prescription should be changed from “add view‑as mode” to “add frontend banner and exit UI for the existing view‑as subsystem.”

### 1.2 Hotfix #1 – “Protect main and make checks required” (first action)  
**Evidence:**  
```
GET /repos/SeanSwan/-SS-PT-New/branches/main/protection → 403  
“Upgrade to GitHub Pro or make this repository public to enable this feature.”  
Repo: {“private”: true, “default_branch”: “main”}
```  
Branch protection is paywalled on private repos for this account’s plan. The audit states the symptom correctly but prescribes an impossible remedy as the very first step.  

**Correct remedy:** either (a) upgrade GitHub plan, (b) evaluate GitHub **rulesets** (check availability on free private repos – if unavailable, this is still a dead end), (c) enforce gates via pre‑push hooks + required local gates + CI convention (treat CI red as stop signal). The plan must choose one and document the decision; it cannot list “protect main” as a concrete action without confirming feasibility.

### 1.3 P0.3 – “Retire the client‑only post renderer and mount the canonical feed”  
**Evidence:** `ClientCommunityPage.tsx` (297 lines) already carries faction/party/challenge/hashtag integration (`FactionLeaderboard`, `PartyHPBar`, `EventsList`, `useFaction`, `useParty`). The audit described the mini‑feed as “essentially author, body, and time” – an understatement. The canonical feed may not have equivalents for these RPG social systems.  

**Cost of scheduling as written:** deleting team‑built features unless the canonical feed already supports them. The correct move is to extract the canonical post *card* into the client page while preserving the client‑specific surrounding systems (faction, party, challenges). The plan must first verify which canonical feed capabilities exist, then decide merge strategy.

### 1.4 Minor: “Sixteen visible sidebar destinations” – actually 15 unconditional entries  
**Evidence:** `ClientStellarSidebar.tsx` declares 15 unconditional entries. The off‑by‑one does not change the IA argument (15 is still too many), but the plan should not quote the audit’s number without verification.

---

## 2. SEVERITY RE‑RANK

Ordered by **cost of being wrong × likelihood** (high to low):

| Rank | Finding | Rationale |
|------|---------|-----------|
| **P0a** | Consent wording overstates anonymity (section 3.6) | Legal consent obtained under false description of processing. Medical conditions, age, gender, measurements, injuries, pain, supplements, sleep, stress, activity level are transmitted under a stable pseudonym. This is a consent‑validity and regulatory risk (GDPR, CCPA, HIPAA). Cheapest to fix (copy + one policy surface). **The audit rated it a “major finding” – I upgrade to P0.** |
| **P0b** | Messaging gate (P0.2) – subscription tier vs. active coaching relationship | `isElite = subscription?.tier === 'elite' || 'premium'` gates the highest‑paying clients ($175/session, $8.4k–$33.6k packages) out of contacting their trainer. The contract test (`useMessaging.tierGate.test.ts:56`) pins the broken logic. Fixing unlocks accountability, scheduling, Coach‑to‑human escalation, pain/recovery follow‑up, retention. |
| **P0c** | Actor‑subject context (P0.1) – competing state in sessionStorage, 21 files | Architectural risk that grows with every new dashboard feature. High cost to fix, but the risk is real and broad. Needs a unified `DashboardActorContext`. |
| **P0d** | Release controls (P0.5) – blocked by paywall, but risk is real | The plan’s first action is dead‑ended. Even with alternative gates, the lack of CI enforcement is a release‑quality risk. However, no known exploit has occurred. Re‑rank down because the fix is not urgent *if* the team adopts manual conventions. |
| **P0e** | Coach context envelope (P0.4) – teachPrompt in URL | Text in URL leaks into history, logs, analytics, referrers. The audit’s credit for “review‑first truthfulness” is correct. The risk is moderate; the backend already has typed Coach command machinery for trainer/admin. The envelope is a build‑intensive item. |
| **P0f** | Community consolidation (P0.3) – parallel social surface | Real, but the client page already has substantial features that the canonical feed may lack. The risk of harm from doing nothing is lower than the risk of breaking existing functionality. Should be done last, after the canonical feed is verified to cover the missing parts. |

**Single item to do first:** Consent wording fix – it is cheap, high legal risk, and blocks no other work.

---

## 3. MISSING P0s

### 3.1 Billing / money paths (attribution, payment, subscription state)  
The plan says nothing about how the client dashboard interacts with billing. A client may see a workout recommendation while subscription is past due, or a coach‑assigned plan while payment is pending. The `entitlementSnapshot` in the proposed `DashboardActorContext` is a start, but the plan does not prescribe how mid‑session entitlement changes (e.g., trial ends) affect in‑flight state, cached data, or active Coach interactions. **This is a P0 for a production business with live paying clients.**

### 3.2 Offline / failed‑write truthfulness  
The “definition of flawless” includes “slow‑API / partial‑failure / offline states stay truthful,” but the plan has no concrete prescription for how the client dashboard handles write failures (e.g., logging a workout, sending a message). The audit’s `CoachContextEnvelope` mentions “preview → confirmation → execute → verify → receipt → recovery/undo” but only for Coach writes. The same pattern is needed for client‑initiated writes (log a set, save a pain entry, submit a challenge). **Missing: an offline‑first write queue with conflict resolution and truthful status display.**

### 3.3 Multi‑tenant scope leaks (cross‑client data exposure)  
The audit notes that the backend derives client ID from the JWT, which is a strength. But the plan does not require a dedicated contract test that verifies *no endpoint* serving the client dashboard can return data for a different `subjectId` than the authenticated actor’s assigned clients. The `viewAs` subsystem is narrow, but the dashboard shell itself may have unguarded endpoints. **Missing: a route‑by‑route authorization audit of every client dashboard API call, enforced by automated tests.**

### 3.4 Minors’ data  
SwanStudios is a personal‑training SaaS. The plan does not address whether the client dashboard can be used by minors, and if so, what consent/guardian requirements apply. The AI consent screen uses “anonymous client ID” framing that may be insufficient if the client is under 13 (COPPA) or under 16 (GDPR child consent). **This is a legal/compliance P0 that the audit missed entirely.**

### 3.5 Notification / consent interaction  
The plan does not address how the client dashboard handles notifications (push, in‑app, email) when AI consent is withdrawn. The audit’s consent lifecycle is real, but it does not prescribe that notification generation pipelines also check the consent status. A client who withdraws consent could still receive a Coach‑generated notification that contains processed data. **Missing: a cross‑cutting consent check before any notification delivery to a client dashboard user.**

### 3.6 Mid‑session entitlement change  
The plan’s `DashboardActorContext` includes `entitlementSnapshot`, but the plan does not prescribe how the dashboard reacts when entitlement changes mid‑session (e.g., trial expires while viewing a page). Does the UI redirect, show a banner, disable features, or keep stale data? **Missing: a state machine for entitlement‑driven UI transitions, with tests.**

---

## 4. ORDER ATTACK (corrected order)

The audit’s four‑stage order has a critical dead end: **Stage 1 starts with “Release hotfix gate”** which is blocked by the GitHub paywall (section 3.5). If the team cannot immediately upgrade the plan or use rulesets, Stage 1 cannot start. This stalls the entire remediation.

**Corrected order:**

### Stage 0 (immediate, <1 week): Consent fix + messaging gate patch  
- Reword consent screens (`AiConsentScreen.tsx:659`, `ConsentSection.tsx:232`, `ClientOnboardingWizard.tsx:735`) to accurately describe pseudonymization and list retained fields.  
- Patch `MessagingView.tsx:30` to use `canMessageAssignedCoach` derived from active coach‑client relationship, not `isElite`. Update the contract test (`useMessaging.tierGate.test.ts:56`) to match new logic.  
- **Why first:** These are cheap, high‑risk fixes that can be shipped independently of architecture work.

### Stage 1 (1–2 weeks): Release gates (alternative implementation)  
- Adopt pre‑push hooks + required local gates (typecheck, unit tests, contract tests).  
- Configure CI to run the full gate suite and treat red as a stop signal (convention, not enforcement).  
- Evaluate GitHub rulesets (if available on free private) or budget a paid plan upgrade.  
- Add the missing frontend surfacing for view‑as (persistent banner, one‑click exit) – this is the only “new” code in this stage.  
- **Do not block other stages on this – run in parallel with Stage 2.**

### Stage 2 (2–3 weeks): Architecture consolidation  
- Implement `DashboardActorContext` (viewer, experienceRole, subject, mode, capabilities, entitlementSnapshot, consentSnapshot, auditSessionId).  
- Merge/replace `GlobalClientContext` (sessionStorage rehydration).  
- Route all dashboard queries and mutations through the context; deny by default when actor‑to‑subject relationship is unproven.  
- Collapse navigation to 5 destinations (Today, Training, Progress, Community, Profile) + Explore for secondary features.  
- Split `canMessageAssignedCoach` from `canUseCommunityDirectMessages` at the policy layer.  
- **Why this stage: Must be done before Coach and Progress upgrades depend on the unified context.**

### Stage 3 (3–4 weeks): Coach context envelope + Progress story  
- Implement `CoachContextEnvelope` (server‑backed, short‑lived, signed) and replace all `teachPrompt` query strings.  
- Implement restricted client action lane (open assignment, stage log draft, recovery check‑in, request trainer review, propose booking, explain chart point, create reminder, prepare challenge check‑in).  
- Replace Progress with `ClientProgressStory` (one primary insight, 2–4 relevant charts, time‑range controls, PR/goal markers, coach annotations, datum drill‑down, accessible table equivalents).  
- **Why after Stage 2: The envelope must reference the actor context; the progress story must trust the unified identity.**

### Stage 4 (4–5 weeks): Community consolidation + signature experience  
- Extract canonical post card into client community page while preserving faction/party/challenge/hashtag integration.  
- Verify canonical feed can render the missing features; if not, port them into the canonical feed behind role‑aware config.  
- Add signature features (Weekly Swan Story, Workout Replay, coach‑annotated progress, Accountability Circles, PR/consistency cards, challenge check‑in streams, recovery‑aware streak grace, “Train This” workout sharing).  
- **Only after core gates pass (Stage 2) and Coach context is stable (Stage 3).**

---

## 5. OVER‑CORRECTION RISK

The audit says “Stop expanding the client dashboard until actor/subject identity, trainer communication, canonical community, typed Coach context, and enforced release gates are unified.”  

**Freeze cost:**  
- A production business with live paying clients loses the ability to ship new features, fix bugs, or respond to competitive pressure. Trainers cannot offer new dashboard capabilities to clients.  
- The freeze is partially justified for the five items (especially actor context and messaging gate), but it is **too broad** if interpreted as “no code changes to the client dashboard at all.”  

**What must keep shipping during the freeze:**  
- Bug fixes and security patches (e.g., XSS mitigation, auth bypass fixes).  
- Backend changes that do not affect the client dashboard surface (e.g., database migrations, performance improvements, payment processing).  
- Low‑risk frontend changes that do not touch the actor context, messaging, or coach prompt (e.g., styling updates, a11y improvements, static content).  
- The consent wording fix and messaging gate patch (Stage 0) – these are *required* to fix existing issues, not expansions.  

**Is the freeze justified?** Partially. The five items are real P0s, but the freeze should be scoped to *new feature development* that depends on the unified context. The team should explicitly define a “freeze boundary” – e.g., no new routes, no new database tables, no new coach interactions – while allowing bug fixes and the Stage 0–2 work. The freeze should be time‑boxed (max 4 weeks) to avoid indefinite delay.

---

## 6. BLUEPRINT READINESS (unresolved decisions)

The plan is **not ready** to become an executable build blueprint. The following specific decisions must be made and documented:

1. **DashboardActorContext implementation details:**  
   - How does it merge with existing `GlobalClientContext` (sessionStorage)?  
   - What is the rehydration strategy? (avoid race with route load)  
   - How does it interact with the existing view‑as subsystem? (must consume the same `viewAs` parameter)  

2. **Release gates workaround:**  
   - Choose one: GitHub paid plan, rulesets, or pre‑push hooks + CI convention.  
   - If pre‑push hooks: what is the exact hook script? How is it distributed to all developers?  

3. **Consent wording changes:**  
   - Must be reviewed by legal counsel. The plan must produce the exact new copy and the list of fields retained/pseudonymized.  

4. **View‑as allowlist expansion:**  
   - Should the current 4‑endpoint allowlist be expanded to cover more client dashboard endpoints? Each addition needs a security review.  

5. **Community consolidation strategy:**  
   - Verify which features the canonical feed already supports (reactions, comments, replies, report, mute/block, repost, workout details, pagination, visibility handling).  
   - Decide whether to keep faction/party systems in the client community page or port them to the canonical feed.  

6. **CoachContextEnvelope – backend scope:**  
   - Which endpoints issue envelopes? What is the expiration TTL? How is the signature verified?  
   - How does the envelope interact with the existing `adminImpersonationService`?  

7. **Progress story replacement:**  
   - Define “primary insight” algorithmically (e.g., biggest change from baseline, closest to goal, coach‑selected).  
   - Chart datum drill‑down: which underlying data sources are linked? (workout sets, measurement entries, pain logs)  

8. **Mobile drawer accessibility:**  
   - Build a shared Drawer/Dialog/Toast/Switch/DataTable primitive set. Must comply with WCAG 4.5:1 contrast, 44px touch targets, focus containment, and inert background.  

9. **Data retention for Coach interactions:**  
   - What is the deletion policy for Coach prompts and receipts? Does the stable pseudonym create a re‑identification risk over time? Need a privacy impact assessment.  

10. **Mid‑session entitlement change handling:**  
    - Define the UI behavior when entitlement changes (e.g., trial ends, subscription downgrade). Must be tested.

---

## CONFIDENCE + WHAT WOULD CHANGE MY MIND

**Confidence:** High on the factual errors (view‑as exists, branch protection paywall, community richness). Moderate on the severity of consent issue (legal risk is real but depends on jurisdiction – if the business has a legal opinion that the wording is compliant, the P0 upgrade is overruled). Lower on the exact order because it depends on team capacity and the availability of GitHub rulesets for free private repos.

**What would change my mind:**  
- If GitHub **rulesets** are available on the current plan (free private), then the release gate stage can be moved earlier and the paywall dead end is resolved.  
- If the team demonstrates that the view‑as subsystem is **insufficient** for client dashboard operations (e.g., it cannot support the required endpoints without security holes), then the audit’s prescription to “add an audited view‑as mode” may be justified.  
- If legal counsel confirms the current consent wording is compliant, the consent P0 downgrades to a “major finding” as the audit originally rated it.  
- If the canonical feed already supports faction/party/challenge/hashtag features, then the community consolidation prescription is safe and the risk of data loss is lower.

==================================================
SEAT: QWEN-PANEL-REVIEW.md
==================================================
# Qwen Consult (LOCAL)

**Model:** `qwen3.8:27b-mtp-q4_K_M` via Ollama (5090, $0, private)
**Document:** docs/ai-workflow/AI-HANDOFF/CLIENT-DASHBOARD-AUDIT-HOSTILE-REVIEW-PACKET-2026-08-21.md
**Tokens (Ollama):** 6967 in / 1870 out | **Wall:** 19.5s | **done_reason:** stop

---
## VERDICT
REVISE — The audit correctly identifies a critical identity/authorization drift and a consent validity crisis, but it prescribes building existing systems (View-As) and executing impossible tasks (GitHub branch protection on a free plan), making the current plan a liability if followed literally.

## BLOCKERS
1. **P0 (Execution Failure): The "Protect Main" hotfix is impossible on the current infrastructure.**
   - **Failure Scenario:** The audit mandates protecting `main` as Step 1. The repository is private and on a free GitHub plan. GitHub branch protection rulesets are paywalled (Pro/Team/Enterprise) or require the repo to be public.
   - **Evidence:** Section 3.5 explicitly states: `GET /repos/.../branches/main/protection -> 403 "Upgrade to GitHub Pro... or make this repository public"`.
   - **Impact:** The build order is blocked immediately. A developer following this plan will stall at Step 1, or worse, attempt to make the private production repo public, exposing PII and proprietary code.

2. **P1 (Regression/Redundancy): "Add explicit, audited trainer/admin View-as-Client mode" duplicates existing secure infrastructure.**
   - **Failure Scenario:** A developer builds a new View-As implementation from scratch based on the audit's prescription, potentially bypassing the existing fail-closed guards, creating a security hole or redundant code paths.
   - **Evidence:** Section 3.4 lists `backend/middleware/viewAsGuard.mjs` (145 lines), `adminImpersonationService.mjs`, and tests. The existing system is fail-closed (403s mutations) and tested.
   - **Impact:** Wasted engineering effort and risk of introducing a less secure duplicate of a secure subsystem.

3. **P1 (Legal/Compliance): Consent wording is a P0, not a "Major Finding."**
   - **Failure Scenario:** The audit treats the "anonymous ID" claim as a minor copy fix. In reality, the system transmits medical conditions, injuries, and pain levels under a *stable* pseudonym. This is pseudonymization, not anonymization.
   - **Evidence:** Section 3.6 cites `AiConsentScreen.tsx:659` ("Your identity is hidden") and `deIdentificationService.mjs:185` ("Replace name fields with anonymous client ID") while retaining age, gender, medical conditions.
   - **Impact:** If a data breach occurs, the "anonymous" claim is legally false. This invalidates the consent obtained during onboarding (`ClientOnboardingWizard.tsx:735`). This is a GDPR/CCPA liability, not a UI polish issue.

## ATTACKS
- **Correctness:**
  - **Stale State / Race Condition:** The audit claims `GlobalClientContext` uses `sessionStorage` (Section 3.3). `sessionStorage` is tab-specific. If a user opens two tabs (one as Trainer, one as Client), the context can desynchronize. The audit prescribes a `DashboardActorContext` but doesn't address cross-tab synchronization or the race condition of rehydrating from `sessionStorage` while a mutation is in flight.
  - **Happy-Path Logic:** The audit assumes `isElite` is the only gate for messaging. Section 3.1 shows `useSubscription.ts:176` defines `isElite` as `tier === 'elite' || tier === 'premium'`. However, Section 3.1 also notes that high-paying PT clients ($175/session) do *not* set `tier === 'elite'`. The audit's fix (`canMessageAssignedCoach`) is correct, but it fails to address that the *current* logic is actively blocking paying clients. The audit calls this a "premium wall" issue; it is actually a **revenue-blocking bug**.

- **Security:**
  - **IDOR / Multi-Tenant Scope Leak:** The audit credits the backend for deriving client ID from JWT (P0.1). However, Section 3.2 shows `teachPrompt` in the URL query string. While the audit says PII is stripped, `URLSearchParams` are logged in server access logs, browser history, and analytics. If the `teachPrompt` contains any derived state (e.g., "Workout: Deadlifts, 5x5, Pain: Low"), this is a data leak vector. The audit's `CoachContextEnvelope` is the correct fix, but it must be enforced *server-side* to ignore any `teachPrompt` param, not just stop sending it.
  - **AuthN/AuthZ:** The audit misses the **Trainer-Client Relationship Model** as a first-class entity. It treats "assigned trainer" as an implicit attribute. If the relationship is stored in a `subscriptions` table with a `tier` field, and the messaging gate checks `tier`, then the relationship is not first-class. The audit's `canMessageAssignedCoach` is a good start, but it must be backed by a `trainer_client_relationships` table with status (active/paused/cancelled), not just a subscription tier.

- **Data-Truth / Schema Drift:**
  - **Frontend Response-Shape Drift:** The audit prescribes mounting the "canonical feed" in Client Community (P0.3). Section 3.7 shows the client feed has `FactionLeaderboard`, `PartyHPBar`, `useFaction`. If the canonical feed does not have these fields, the client page will crash or render `undefined`. The audit does not verify that the canonical feed *supports* these RPG/social systems. This is a schema drift risk.
  - **PascalCase vs snake_case:** The audit does not mention API casing. If `GlobalClientContext` expects `clientName` (camelCase) but the backend returns `client_name` (snake_case) in some endpoints, the context will be stale. This is a common source of the "drift" the audit complains about, but it is not diagnosed.

## HIGHEST RISK
**The Consent Validity Crisis (Section 3.6).**
The system is transmitting sensitive medical data (injuries, pain, conditions) under a stable pseudonym while telling users their identity is "hidden" and they are "anonymous." This is a legal misrepresentation. If a client sues or a regulator investigates, the "anonymous" claim is indefensible.
**Cheapest De-risk:**
1.  **Immediate Copy Change:** Update `AiConsentScreen.tsx`, `ConsentSection.tsx`, and `ClientOnboardingWizard.tsx` to say: *"Your data is pseudonymized. We use a stable ID to link your progress, but we do not share your name/email with third parties. We process medical conditions to personalize coaching."*
2.  **Backend Audit:** Verify `deIdentificationService.mjs` does not log the stable ID alongside the PII in any non-encrypted log.
3.  **Legal Review:** Have counsel confirm that "pseudonymized" is an acceptable term for the current data flow.

## CONFIDENCE
**What I could NOT verify:**
1.  **Canonical Feed Capabilities:** I cannot see the code for the "canonical social post layer" mentioned in P0.3. I am assuming it does *not* have `FactionLeaderboard` or `PartyHPBar` because the audit says the client page is "simplified." If the canonical feed *does* have these, the audit's prescription is safer. If it doesn't, the audit's prescription will break the client experience. **Evidence needed:** A diff of the canonical feed component's props vs. the client feed's props.
2.  **GitHub Rulesets Availability:** I am relying on Section 3.5's claim that branch protection is paywalled. GitHub has introduced "Rulesets" which may have different pricing tiers. **Evidence needed:** Check if `rulesets` are available on the free private plan for this specific repo.
3.  **Trainer-Client Relationship Schema:** I am assuming the relationship is not a first-class entity. **Evidence needed:** `backend/models/` or `backend/migrations/` to see if there is a `trainer_client_relationships` table or if it is derived from `subscriptions`.

**My Uncertainty:**
I am confident that the "Protect Main" step is a blocker because the API error is explicit. I am confident that the View-As system exists because the files are listed. I am *less* confident about the "Canonical Feed" risk because I haven't seen the canonical feed code. I am *highly* confident that the consent wording is a P0 because the legal distinction between anonymous and pseudonymous is clear.
