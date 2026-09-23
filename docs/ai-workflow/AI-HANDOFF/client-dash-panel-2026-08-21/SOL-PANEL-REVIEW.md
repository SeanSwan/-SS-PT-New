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
