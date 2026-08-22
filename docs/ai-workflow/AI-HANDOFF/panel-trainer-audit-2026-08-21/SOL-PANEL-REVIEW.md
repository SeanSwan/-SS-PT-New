# GPT-5.6 Sol — Hostile Gate Review

**Reviewer:** OpenRouter `openai/gpt-5.6-sol-pro` (effort: high)
**Document:** docs/ai-workflow/AI-HANDOFF/TRAINER-DASHBOARD-AUDIT-REVIEW-PACKET-2026-08-21.md
**Seed:** (none)
**Tokens:** 51997 in / 31866 out · **Cost:** ~$0.4062 · **Wall:** 356.8s · **finish:** stop

---

## VERDICT

**REJECT** — The plan is not safe to build from until its alleged cross-tenant paths are reproduced against current `origin/main`, its severity ranking is corrected, and rollout/migration controls are designed for the live trainer population.

## WHERE THE AUDIT IS PROBABLY WRONG

1. **Challenge moderation is not yet a demonstrated P0.**  
   - **Claim:** “No active trainer-client assignment is checked before starting review, requesting changes, rejecting, or approving the submission.”  
   - **Alternative:** Effective authorization may exist in route middleware, a model scope, a challenge ownership association, a feature flag that disables the API in production, or PostgreSQL row-level security. A source comment and an unscoped-looking service are strong warning signs, but not proof of effective cross-tenant access.  
   - **Probe:** With fixtures for trainer A/client A and trainer B/client B, use trainer A’s token to list, retrieve, and mutate client B’s submission through the deployed route.  
   - **Severity:** If reproduced, this is likely P1-high insider cross-tenant read/write, not automatically P0. It becomes P0 only if moderation exposes highly sensitive material, permits broad publication/destruction, or is cheaply exploitable at scale.

2. **The Coach finding describes post-revocation access, not arbitrary cross-tenant access.**  
   - **Claim:** “A trainer can create a conversation with a client audience role and a target client… the thread can continue without the current assignment being revalidated.”  
   - **Alternative:** The conversation-role combination may be impossible under the creation schema; `conversation.role` may mean actor role rather than audience role; the enrichment layer may independently recheck assignment; or post-revocation messages may retain old thread text without fetching current client data. The production soft flag may also be unset despite existing in source.  
   - **Probe:** In the production-equivalent configuration, create a client-bound thread, unassign the trainer, then attempt send, retrieve, export, metadata update, and archive while tracing whether new client data reaches the model or response.  
   - **Severity:** P1 if current sensitive data remains accessible after revocation; P2 if only previously authorized thread content remains and no new enrichment occurs. The report has not established P0.

3. **The schedule fix assumes the authentication ID and schedule trainer ID are identical.**  
   - **Claim:** “Force `trainerId = req.user.id` for trainers.”  
   - **Alternative:** `sessions.trainerId` may refer to a trainer profile, employee record, or differently cased user table rather than the authenticated user PK. Existing middleware may resolve that mapping. Blindly forcing `req.user.id` could make every legitimate conflict check return false or fail, creating double bookings.  
   - **Probe:** Inspect the `sessions.trainerId` foreign key and Sequelize association, then compare it with `req.user.id` for a real trainer using an `information_schema` query and sample join. Confirm the FK targets `"Users"` where required.  
   - **Severity:** If arbitrary IDs really disclose names and schedules, this is P1 confidentiality exposure by a contracted insider. Calling it P0 without proving ID discoverability, response contents, and cross-tenant behavior is inflation.

4. **Selected-client state is not itself a server authorization vulnerability.**  
   - **Claim:** “For a health and fitness system, that is a release-blocking wrong-subject risk.”  
   - **Alternative:** The stale object may affect labels and prompts while every server write and data fetch is independently authorized. Logout logic outside the provider may clear all session storage. Because session storage is tab-scoped, the persistence window is also narrower than the report implies.  
   - **Probe:** In one browser tab, select client A, log out, log in as another trainer or revoke the assignment, then attempt every client-bound write while capturing network requests and database effects.  
   - **Severity:** P2 correctness/privacy if the UI displays stale formerly authorized data but the server rejects operations; P1 only if it causes a write against the wrong authorized subject. It is not a demonstrated P0. The report even concedes that “the backend later rejects a write,” contradicting the P0 framing.

5. **The audit reasons from absence around the assignment contract.**  
   - **Claim:** Wrapper-versus-array responses and `status` versus `isActive` “can produce `.filter is not a function`, a silent no-op, or a 404.”  
   - **Alternative:** API adapters, interceptors, generated hooks, or per-call normalization may unwrap and map the response before the cited callers receive it. The nonexistent endpoint may be dead code.  
   - **Probe:** Run the current reassign and deactivate paths against seeded assignments while recording requests, responses, and final database state.  
   - **Severity:** This is a likely reliability defect, but no severity can be assigned from incompatible type declarations alone.

6. **The central Coach authorization finding is explicitly speculative.**  
   - **Claim:** “The dispatcher performs no central role, assignment, consent, or resource-version authorization.”  
   - **Alternative:** Every registered handler may already enforce the relevant invariant, or handlers may call scoped repositories that cannot access unauthorized rows. Centralization is maintainability hardening unless a bypassing handler exists.  
   - **Probe:** Enumerate the handler registry and run a table-driven test for every handler after assignment revocation, role change, resource-version change, and operation replay.  
   - **Severity:** A missing architectural guarantee is not itself an exploit. The report says handlers “may protect themselves,” which undercuts treating this as a known vulnerability.

7. **Process-local pending operations are primarily an availability problem.**  
   - **Claim:** The local `Map` and random signing key cause unreliable confirmations across restarts and replicas.  
   - **Alternative:** Production may run one instance, confirmations may be intentionally ephemeral, and a restart-generated key invalidates old operations safely. Handler-level idempotency may already prevent duplicate writes.  
   - **Probe:** Inspect Render instance count and environment configuration, then create an operation, restart or route confirmation to another instance, and attempt replay.  
   - **Severity:** Usually P1/P2 product reliability. It becomes a security issue only if inconsistent consumption permits replay or bypass, which was not shown.

8. **“AI consent fails open” may misstate the consent model.**  
   - **Claim:** “The chat path allows AI processing when no consent row exists.”  
   - **Alternative:** Consent may be established through a contract, account-level terms, a legacy field, or a separate privacy system; absence of this particular row may intentionally represent a migrated cohort. Conversely, consent does not make sending PII to an LLM compliant with the binding zero-PII rule.  
   - **Probe:** Join recent client-bound Coach usage to every recognized consent source and inspect the governing product/legal rule for what a missing row means.  
   - **Severity:** Unknown until the actual consent contract is established. Immediate fail-closed behavior could lock out a large legitimate cohort without improving compliance.

9. **Browser-readable tokens are a hardening finding, not evidence of active credential compromise.**  
   - **Claim:** “Access and refresh credentials are exposed to browser JavaScript.”  
   - **Alternative:** This requires malicious script execution, a compromised dependency, or browser extension access. Strong CSP, output encoding, and dependency controls may substantially reduce likelihood. Moving only the refresh token does not protect an in-memory access token during active script execution.  
   - **Probe:** Review CSP and all HTML/Markdown/chat rendering sinks, then run an authenticated XSS test that attempts token access.  
   - **Severity:** Commonly P1/P2 depending on XSS exposure and token lifetime, not a standalone P0.

10. **The upload finding may be more serious than several listed P0s—but is also unproved.**  
    - **Claim:** “The primary voice-upload and historical-preview paths do not” check assignment.  
    - **Alternative:** Multipart middleware, a parent router, a scoped storage service, or a preprocessing guard may authorize before the cited helper. A frontend-only limitation would not be sufficient, but it could explain why the reviewer did not see normal exploitation paths.  
    - **Probe:** Upload a synthetic file as trainer A using client B’s ID and trace storage, transcription, model invocation, response, and billing effects.  
    - **Severity:** If reproduced, this is a direct cross-tenant integrity/cost and possibly sensitive-data problem. Ranking it below stale browser selection shows the severity model is inconsistent.

11. **Optional permission failure may be intentional compatibility behavior.**  
    - **Claim:** “An outage disables the permission restriction.”  
    - **Alternative:** These permissions may only hide optional features while role and assignment checks remain mandatory. No rows may deliberately mean unrestricted legacy access. A database failure may cause the underlying protected query to fail anyway.  
    - **Probe:** Fault-inject the permission lookup while exercising each permission-gated action and observe whether unauthorized data or mutations actually succeed.  
    - **Severity:** Depends entirely on what the optional permission gates protect.

12. **The branch-protection conclusion is stale process evidence, not an application release blocker.**  
    - **Claim:** “`main` is unprotected.”  
    - **Alternative:** Protection may have changed during the eight later commits, or releases may be gated outside GitHub. Conversely, scripts present in the repository prove nothing about release enforcement.  
    - **Probe:** Query current branch rulesets and the checks attached to the actual production deployment SHA through the GitHub and Render APIs.  
    - **Severity:** Important governance debt, but not equivalent to a remotely exploitable P0.

13. **The attacker model reduces some likelihood but does not erase insider risk.**  
    Every alleged exploit requires an authenticated, contracted trainer account. That adds identity, contractual deterrence, telemetry, and account-removal options, so schedule probing and stale state should not be ranked like anonymous compromise. It does not excuse cross-tenant access: compromised trainer accounts and malicious insiders remain credible, especially where ordinary UI reveals target IDs. The report never consistently incorporates this distinction.

14. **The plan contradicts itself about where authorization belongs.**  
    Gate 1 says both Coach lanes receive the universal boundary, while Gate 2 separately says Coach confirmation must be reauthorized. Consent is placed in the Gate 1 function but deferred until Gate 3. Challenge moderation is simultaneously to be admin-only and assignment-scoped. These are unresolved policy decisions, not implementation sequencing.

## WHAT THE AUDIT MISSED (absence-first)

- **A current, exhaustive endpoint authorization matrix.** Dump the actual Express route stack at current `origin/main`, including method, middleware order, accepted actor roles, subject/resource IDs, ownership rule, and response fields. Cover exports, search, autocomplete, bulk actions, nested resources, deleted assignments, historical records, and indirect identifiers—not only the named route families.
- **Shared client and admin surfaces.** The client and admin dashboards may use the same contexts, Coach handlers, assignment services, and selected-subject helpers. Test role confusion, admin impersonation/delegated preview, client-to-client ID tampering, and a trainer reaching admin-only behavior through shared components.
- **Authorization inside data access.** Determine whether Sequelize scopes, hooks, association loaders, raw SQL, or PostgreSQL row-level policies alter the apparent controller behavior. Inspect every `unscoped()`, raw query, and `findByPk` on tenant-bearing models.
- **Session and JWT lifecycle.** Verify signing algorithms, key rotation, issuer/audience validation, expiration, clock skew, revocation after password or role change, logout-all-devices, refresh-token races, token-family reuse detection, session fixation, CORS, and CSRF behavior.
- **Identity/schema integrity.** Audit the dual `users`/`"Users"` hazard across all migrations, models, FKs, raw SQL, seeds, and restore scripts. Query for orphaned assignments and sessions. Ensure every required FK targets `"Users"` and that model `tableName`/quoting cannot silently hit the wrong table.
- **Migration and schema drift.** Compare production schema with Sequelize migrations, including enum values, indexes, constraints, partial unique indexes, down migrations, and startup synchronization settings.
- **File-upload security.** Check byte-signature validation rather than MIME alone, size limits, decompression bombs, filename/path traversal, malware scanning, object-store ACLs, signed URL lifetime, retention/deletion, duplicate processing, and authorization before expensive transcription.
- **Actual LLM payloads.** Inspect all outbound prompts, tool arguments, tracing, provider logs, retries, and transcript processing. Free text, audio transcripts, names, contact details, health notes, and logs must not reach an LLM under the zero-PII rule. Consent does not override that rule.
- **Prompt/tool abuse.** Test prompt injection from uploaded transcripts, challenge content, messages, and client notes; enforce server-side tool allowlists and authorization independently of model output.
- **PII in observability.** Review application logs, audit events, Sentry/error payloads, analytics, request bodies, model traces, screenshots, Playwright artifacts, and support tooling for names, contact details, tokens, and health information.
- **Rate limiting and abuse economics.** Measure limits on login, refresh, Coach messages, confirmations, conflict probing, exports, uploads, transcription, password reset, invitation, and enumeration endpoints. Include per-user, per-tenant, per-IP, and cost ceilings.
- **Audit logging and incident detection.** Require actor, effective role, subject, resource, action, authorization result, request ID, and mutation outcome without raw PII. Alert on repeated cross-tenant denials, high-rate ID probing, unusual exports, token reuse, and bulk Coach writes.
- **WebSocket or socket authorization.** Verify handshake authentication, room membership, client/trainer channel naming, reconnect after token expiry, revocation on unassignment, and forced disconnect after role change.
- **Stored and reflected script injection.** Exercise Coach output, transcripts, challenge content, client notes, names, filenames, notifications, and chart labels. Review CSP and unsafe HTML rendering.
- **Billing adjacency.** Verify Stripe webhook signatures, replay/idempotency, trainer entitlement changes, account/tenant binding, refunds, cancellation timing, and whether a billing state can accidentally grant or revoke dashboard access.
- **Availability and query behavior.** Profile N+1 association loads, roster refreshes, charts, schedule conflict ranges, challenge queues, and the proposed authorization query. Test realistic concurrent trainers and degraded database latency.
- **Backups and recovery.** Verify encrypted backups, point-in-time recovery, restore drills, object-store recovery, key recovery, retention, and that restoring does not revive revoked tokens or stale assignments.
- **Secrets and deployment boundaries.** Check Render environment separation, signing-key rotation, database credentials, model-provider keys, webhook secrets, preview environments, and accidental production data use in tests.
- **Data retention and subject rights.** Define retention and deletion for conversations, audio, transcripts, exports, pending operations, audit records, and former-client history.
- **House-rule enforcement.** The plan does not specify CI checks for styled-components-only UI, Victory-only charts, tokenized Crystalline Swan colors, Dual-Button Glow, dark-first behavior, 44px targets, contrast, or the 300-line limit. The proposed shared policy function is especially likely to become an oversized policy file. Any client-specific LLM enrichment containing more than IDs and roles would directly violate the zero-PII rule.

## BLAST RADIUS OF THE FIX

1. **Gate 1: universal assignment boundary**
   - **Who breaks:** Trainers with orphaned or legacy assignments, delayed reassignment records, historical former-client access, delegates, admins using trainer routes, background jobs without an actor, and any route whose `trainerId` is not the authenticated user PK.
   - **Mid-session presentation:** Workout logging, note saving, conflict checks, uploads, or Coach confirmation may suddenly return 403/503. A trainer could lose an unsaved session record while standing with a client. That is worse than several unproved findings.
   - **Query cost:** A naïve implementation adds at least one assignment lookup per subject operation and possibly several per request when resource ownership, permissions, and consent are separate. Roster pages and bulk operations can turn this into N+1 load. Require a composite index matching trainer, client, status, and soft-delete/date predicates; benchmark p50/p95/p99 before enforcement.
   - **Cold cache/outage:** Cold caches create database bursts. If the assignment table is slow, fail-closed behavior turns a partial database problem into a dashboard-wide outage. Do not fail open; return an explicit retryable 503, preserve drafts locally, and keep non-client-bound functions available.
   - **Rollout/rollback:** First run shadow evaluation that records disagreements without blocking. Canary by route and trainer cohort. Roll back individual policy bindings, not a global “allow all” flag. Keep known-vulnerable routes server-disabled rather than bypassing all authorization.

2. **Gate 2: stale-client clearing and revocation**
   - **Who breaks:** Trainers with an in-progress draft when roster refresh temporarily fails, trainers reviewing legitimate historical records, and shared-device users whose current workflow depends on persisted selection.
   - **Mid-session presentation:** A transient roster error could clear the active client, erase pending Coach context, or redirect during logging. Absence from an authoritative successful roster response must be distinguished from network failure.
   - **Safe behavior:** Freeze client-bound writes on uncertain state, preserve the unsent draft, and ask the trainer to reselect after recovery. Do not silently retarget.
   - **Rollback:** Feature-flag namespaced storage and reconciliation independently. Maintain a one-release reader for the legacy key, but only accept its ID after authoritative rehydration.

3. **Revoking existing Coach conversations**
   - **Who breaks:** Trainers needing historical continuity, compliance records, or notes created while legitimately assigned.
   - **Mid-session presentation:** A message or confirmation can fail immediately after reassignment, potentially after the trainer has composed it.
   - **Required policy decision:** Separate access to old immutable conversation history from access to current enrichment and new writes. “De-identify immediately” is underspecified and may destroy required records.
   - **Rollback:** Disable new enrichment and writes without deleting history. Restore access only after an explicit former-client/history policy is approved.

4. **AI consent fail-closed**
   - **Who breaks:** Unknown. The report provides no count of trainers using Coach against clients with no recognized consent record.
   - **Required pre-deploy query:** Count distinct active trainer-client pairs with recent Coach use and classify them as explicit consent, legacy evidence, revoked consent, or no evidence.
   - **Migration:** Backfill only where auditable evidence exists; never fabricate consent. For everyone else, offer a non-client-specific Coach mode and an explicit client consent flow.
   - **Mid-session presentation:** Client enrichment or confirmation becomes unavailable with a clear reason, while ordinary dashboard and draft preservation continue.
   - **Rollback:** Roll back to non-enriched operation, not fail-open processing. Consent-store outages should produce a bounded 503 for affected AI functions only.

5. **Pending-operation durability and stable signing key**
   - **Who breaks:** Outstanding operations signed under the old random key and requests split between old and new storage.
   - **Mid-session presentation:** A trainer clicks confirm and receives “expired” or “not found” after a deploy.
   - **Rollout:** Drain or explicitly invalidate old operations with UI notice, support dual key verification during rotation, and dual-write/read through the migration if necessary. Test atomic consume and replay across replicas.
   - **Rollback:** Retain the previous verification key and storage reader for a bounded window; never restore non-atomic duplicate execution.

6. **Refresh token migration**
   - **Who breaks:** Every existing session if local-storage refresh tokens stop being accepted immediately; mobile webviews with restricted cookies; cross-origin frontend/API deployments with incorrect SameSite/CORS settings; and CLI or other non-browser clients.
   - **Mid-session presentation:** Silent renewal fails and the trainer is thrown to login during a workout.
   - **Migration:** Use a versioned dual-acceptance window. On a valid legacy refresh, rotate into the cookie-backed token family. Validate Secure, domain/path, SameSite, CSRF, webview, and cross-origin behavior before enforcement. Define a separate authenticated flow for non-browser clients.
   - **Rollback:** Temporarily accept unexpired legacy refresh tokens while preserving revocation telemetry; do not reissue indefinite browser-readable refresh credentials.
   - **Plan defect:** This required remediation appears in the definition of done but is assigned to none of the five gates.

7. **Temporary admin-only challenge moderation**
   - **Who breaks:** Any trainers actually performing moderation through direct links, bookmarks, or undocumented workflows.
   - **Operational consequence:** Queues accumulate unless named administrators have capacity, alerts, ownership, and response-time expectations. Hiding the sidebar does not prove zero usage.
   - **Rollout:** Measure route usage and queue volume first, notify affected trainers, assign administrators, and provide a disabled-state explanation.
   - **Exit criterion:** Assignment-scoped list/retrieve/mutation tests pass; assignment is rechecked transactionally; no response leaks unrelated submissions; production telemetry shows expected denials.
   - **Rollback:** Restore only the scoped trainer capability, never the current global role gate.

8. **Gate 4 enforcement**
   - **Who breaks:** Everyone shipping hotfixes if existing flaky or excessively slow checks suddenly become mandatory.
   - **Rollout:** Establish check reliability and emergency procedures before requiring them. Branch protection should precede risky remediation, but must include a controlled, audited break-glass path.

9. **UI implementation constraints**
   - The persistent subject indicator and disabled/retry states must use styled-components, tokenized Crystalline Swan colors, dark-first design, 4.5:1 contrast, and 44px interactive targets. No plan item authorizes alternative component or chart libraries. Split policy and UI modules to remain below 300 lines.

## SEQUENCING AND PLAN QUALITY

The five-gate order is wrong because evidence and release controls come after broad production changes.

1. **Gate 0: resynchronize and reproduce.** Re-audit current `origin/main`, diff all eight later commits around the cited paths, capture route middleware order, query production configuration without secrets, and reproduce each alleged P0 with two-tenant fixtures. No broad refactor should begin from an unavailable evidence index and stale feature-branch merge.
2. **Move the useful parts of Gate 4 first.** Protect `main` with a small, reliable authorization test suite and current build/type checks before changing authorization. Add the full accessibility and crawl suite later if they are not yet stable.
3. **Ship narrow confirmed containment.** If reproduced, the smallest high-value day-one change is to bind schedule checks to the authenticated trainer’s resolved schedule identity and sanitize conflict responses. This has less operational impact than globally disabling trainer features. Apply a route-local assignment guard before upload processing if that bypass is also reproduced.
4. **Build an explicit policy matrix before the shared boundary.** Decide which actions require current assignment, historical assignment, ownership, consent, capability, or admin delegation. “Every trainer operation involving a client” is too crude; former-client history and current-client writes may require different rules.
5. **Enforce structurally, not by convention.** A helper that callers may forget is not a boundary. Use declarative route metadata validated at startup, router-level mandatory middleware, and scoped repository methods that require an authorization capability or actor context. For sensitive mutations, combine assignment predicates into the SQL operation or transaction to avoid check-then-use races. PostgreSQL row-level policy may add defense in depth, but only if pooled connection context is set and cleared safely.
6. **Avoid the authorization god function.** The proposed function combines assignment, permissions, consent, resource ownership, and actions. A bug or database slowdown becomes a single point of failure for almost every trainer route, and the implementation is likely to violate the 300-line rule. Split policy definitions from enforcement and keep domain-specific checks testable.
7. **Then ship Gate 2 with draft-safe UX.** Selected-subject reconciliation can proceed in parallel with server policy work, but must distinguish authoritative revocation from temporary roster failure.
8. **Run durability/contracts in parallel.** Assignment contract repair and pending-operation persistence are largely independent projects. Do not bundle them into one deployment.
9. **Treat consent and token migration as separate migrations.** Both require population/client telemetry and rollback plans. Neither should be hidden inside a generic hardening gate.
10. **Ship product refinements last.** Navigation, landing route, KPI changes, and dormant-page cleanup are correctly nonblocking unless current KPI claims cause contractual or billing errors.

The mechanism least likely to be skipped is a combination of mandatory route metadata plus tenant-scoped data access. A precheck helper alone remains bypassable; a scoped query such as “update this resource only where its client has an active assignment to this actor” makes authorization part of the data operation.

## HIGHEST RISK

The most dangerous omission is that the report discusses client-specific enrichment, voice transcripts, and AI consent without verifying the actual outbound LLM payloads, despite the binding rule that only IDs and roles may be sent. Audio and free-text transcripts can contain names, contact information, health details, and third-party information; consent does not cure that house-rule violation.

Before writing remediation code, inventory every model-provider call at current production SHA and inspect redacted request shapes, tool arguments, tracing, retries, and provider retention settings using synthetic canary data. If any transcript, name, note, or other PII leaves the service, disable that enrichment/upload path with the existing kill switch until a deterministic server-side minimization design is proven.

## CONFIDENCE

I could not determine the following from this document alone:

- **Whether any P0 is exploitable now:** Requires two-trainer/two-client integration tests against current `origin/main` and a production-equivalent deployment.
- **Whether the eight later commits fixed or changed findings:** Requires `git diff 66ffde6..978f5d197` focused on routes, middleware, Coach, assignments, sessions, uploads, and auth.
- **Whether hidden controls exist:** Requires the Express route stack, middleware ordering, Sequelize scopes/hooks, raw-query inventory, and `pg_policies` output.
- **Whether challenge APIs are used or enabled in production:** Requires feature-flag configuration, route telemetry, queue volume, and trainer/admin usage counts.
- **Whether the Coach role combination is constructible:** Requires conversation schema validation, creation tests, and persisted production-safe sample rows.
- **Whether the soft-access flag is active:** Requires Render environment inspection and startup logs, not source defaults.
- **Whether schedule IDs match authentication IDs:** Requires FK metadata, Sequelize associations, and sample trainer/session joins against `"Users"`.
- **Whether conflict responses leak the stated fields:** Requires an actual cross-trainer request and captured serialized response.
- **Whether stale client context can cause a wrong-subject mutation:** Requires logout, actor-switch, unassignment, roster-failure, and write-path browser tests with database verification.
- **Whether handler-level Coach authorization is sufficient:** Requires a complete handler registry and revocation/replay matrix.
- **Whether local pending operations fail in production:** Requires instance count, routing behavior, deployment restart tests, signing-key configuration, and handler idempotency evidence.
- **How many users fail a consent cutover:** Requires a database count joining recent Coach use, active assignments, and all valid consent sources.
- **Whether cookie migration supports all clients:** Requires client inventory, webview testing, API-origin topology, CORS/SameSite configuration, and refresh telemetry.
- **What Gate 1 costs:** Requires current request volume, assignment-table indexes and cardinality, query plans, and load tests with cold caches and injected database latency.
- **Whether branch protection remains absent:** Requires current GitHub ruleset and production deployment evidence.
- **Whether PII reaches LLMs or logs:** Requires outbound payload inspection, provider settings, application/error logs, tracing configuration, and synthetic canary tests.
- **Whether the proposed changes obey UI house rules:** No implementation exists. CI must verify dependency bans, styling tokens, chart library, contrast, target size, dark-first behavior, required button treatment, forbidden copy, credential wording, and file length before merge.
