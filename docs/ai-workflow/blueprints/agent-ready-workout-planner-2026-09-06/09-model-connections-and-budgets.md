# Model connections, privacy policy and spending controls

Version 2.0 · Proposed contracts, not installed runtime.
This extends 02-agent-contracts.md. It governs OpenRouter, the built-in Coach and all future connected brains.

## Product decision

Keep **Swan Coach** as the default, with a bounded included allowance and no API setup. Add **My OpenRouter** and **My local agent** as explicit personal choices. Keep one Swan training/context/permission/proposal layer above all model adapters. Do not turn every customer into an API operator, and do not use provider branding as the identity of Swan's coaching knowledge.

The default model cannot be selected responsibly on the assumption that present middleware prevents all disclosure. The current source has multiple dispatch paths and the gaps in 10. Default Coach can remain available under existing operations; the proposed replacement system must first establish a verified outbound policy, then select a managed provider that satisfies it. A Swan-hosted private inference tier is an optional later deployment, requiring measured capacity, isolation, retention and cost evidence. No hardware purchase or model training is authorized here.

Customer agents never inherit Sean's private Hermes memory, Wiki, operator shell or database access. “Swan brain” is a reviewed retrieval corpus plus current authorized application facts; it is not a copy of private consultant/customer knowledge.

## Actual integration seams

| Existing consumer | Current caller / implementation | Proposed change |
|---|---|---|
| Coach chat | useAIChat → /api/ai-chat/conversations/:id/messages → aiChatService.sendChatMessage | Preserve conversation UX; dispatch through a shared authorization/privacy/budget broker |
| Commands | /api/ai-command/execute → commandExecutor → intentClassifier → sendChatMessage | Sanitize the complete classifier envelope; deterministic classification first where useful; count classifier and any subsequent generation within the same task |
| Workout / long horizon | aiWorkoutController / longHorizonController → providerRouter.routeAiGeneration → registered adapters | Reuse schemas, validators, adapter normalization and existing save/approval lifecycle; replace unbounded caller-independent fallback with task-approved routing |
| Voice | /api/ai-chat/transcribe and /tts → direct Google calls | Separate modality policy and explicit consent before any raw audio leaves; local-only device mode must cover speech too |
| Personal agents | New scoped MCP gateway + outbound companion bridge described in 02 | Same backend capabilities, authorization, client eligibility and proposal writer; an agent is never a more privileged bypass |

The existing OpenAI-compatible workout adapter has a useful baseURL/model seam. Changing that seam alone does not connect chat or speech. Current code also uses provider retries and fallback, which must be subordinate to one shared task allowance. No site-wide OPENROUTER_API_KEY fallback is permitted for a personal account.

## OpenRouter connection contract

OpenRouter's documented S256 PKCE flow exchanges a short-lived code for a **user-controlled API key**. It does not document a conventional access/refresh-token pair. Use a backend-owned verifier, single-use nonce and session-bound callback transaction; allowlist the callback and enforce CSRF protection. Never log code, verifier or key. Store the returned key encrypted with key version and owner binding; expose only an opaque connection ID. Strip callback query data before normal navigation/analytics. Reconnection rotates credentials and invalidates queued work under the old version. [Official PKCE flow](https://openrouter.ai/docs/guides/overview/auth/oauth).

Read the connected key's allowance using GET /api/v1/key. Its fields distinguish configured limit, remaining limit and usage windows. Null/missing values mean unavailable or uncapped at the provider, never permission for unlimited Swan spending. Display **Connection allowance**, timestamp and freshness, rather than pretending it is the account wallet. [Current-key API](https://openrouter.ai/docs/api/api-reference/api-keys/get-current-api-key).

Account-wide credit retrieval requires a management key; do not request one merely to render a balance. Link the owner to OpenRouter funding/activity instead. [Credits API](https://openrouter.ai/docs/api/api-reference/credits/get-remaining-credits).

Proposed server routing pins an allowlisted model/provider and rejects unsupported privacy or parameter requirements. Set no implicit provider fallback, deny data collection, require supported parameters and use ZDR-compatible routing where that policy is selected. Provider max_price is a unit-price bound, not a total task budget. ZDR is a provider retention property, not proof of anonymization, local execution or compliance. [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [ZDR](https://openrouter.ai/docs/guides/features/zdr).

These are Swan's proposed conservative policies derived from documented mechanisms. Exact model IDs, supported parameters, prices and provider policy versions must be freshly verified during implementation; the preview uses illustrative estimates and does not recommend or price a real model.

## Proposed API and storage

New connection endpoints coexist with existing Planner APIs. Names below are proposed, not discovered routes.

| Endpoint | Input | Output / invariant |
|---|---|---|
| POST /api/ai/connections/openrouter/start | authenticated session + CSRF | one-time authorization transaction and safe redirect; server binds actor |
| GET /api/ai/connections/openrouter/callback | code + bound nonce/session | backend exchange; opaque connection receipt; no key returned to frontend |
| GET /api/ai/connections | none | current actor's redacted connections and supported capabilities |
| PATCH /api/ai/connections/:id/policy | expectedPolicyVersion, numeric caps, allowlisted model/provider selection | owner-only revision-checked policy; agents cannot call this |
| DELETE /api/ai/connections/:id | expected credential version | revoke Swan access, cancel queued jobs, stop new dispatch; guide provider-side revocation if remote deletion is unavailable |
| POST /api/ai/tasks/preflight | targetId, connectionId, action, draftVersion, bounded request digest | authorized context manifest + price snapshot + maximum reservation + signed expiring quote |
| POST /api/ai/tasks | quoteId, requestId, expected draft/policy version | atomically reserved logical task; actor/payer derived server-side; same ID+digest returns same task |
| GET /api/ai/tasks/:id | owner or separately scoped auditor | redacted status/cost receipt; never raw secrets/prompts |
| POST /api/ai/tasks/:id/cancel | expected task version | cooperative cancellation; accepted/uncertain provider charges remain held |
| POST /api/ai/tasks/:id/reconcile | same task ID | status lookup only; no generation retry |
| POST /api/ai/tasks/pause | owner session | prevent new dispatch for every owned connection; no automatic restart |

Connection: id, ownerUserId, kind, encryptedCredentialRef/deviceId, credentialVersion, capabilities, policyVersion, status, lastCheckedAt. No raw key in generic JSON.
Policy: immutable versions of model/provider allowlist, modality/data categories, maxInputTokens, maxOutputTokens, maxCalls, maxToolSteps, runTimeoutMs, maxConcurrency, run/day/month currency ceilings, timezone and reset rules.
Task: rootTaskId, actorId, targetId, payerId, connectionId, versions, requestId, requestDigest, contextDigest, quoteId, state, revision, reservation, settledCost, uncertainCost, providerRequestId, createdAt, deadline.
Ledger: immutable reserve/reconcile/settle/release entries with integer micro-USD values, currency, timestamp and rootTaskId.
Proposal: retain existing expected contentRevision, exercise identities, immutable candidate digest, violations and human approval receipt.
Unique constraints: owner+requestId; provider request receipt identity; ledger operation ID. Changed payload with an existing requestId returns 409, not new work.

Secrets use authenticated encryption with a managed key outside the DB. RLS/object checks remain server-side. Log only opaque IDs, policy versions, reason codes, aggregate tokens/costs and timings. Hashes of sensitive low-entropy fields are not anonymization. No raw prompts/audio/provider error bodies in logs, traces, alerts or review tools.

## Gates that stop a 105-call loop

Defaults are an initial product policy: **one generation call**, one active task per payer, ten bounded read/tool steps, 60-second task deadline, no automatic provider retry or fallback. Owner caps default to the illustrative $0.10/task, $1/day and $10/month in the preview; actual launch defaults require pricing and included-allowance decisions. Free models still consume call/tool/time allowances.

1. Resolve current actor, target access, age/guardian eligibility, consent and connection ownership before loading context.
2. Construct a schema-allowlisted final envelope. Treat prompts, history, retrieved notes, metadata, attachments and tool results as untrusted data. Resolve functional restrictions from reviewed structured data; do not insert raw clinical history.
3. Enforce provider/modality/privacy allowlists. Local-only failure blocks, including speech, embeddings, memory, retrieval summarization and model fallback. Hosted Swan APIs still use the network.
4. Calculate a conservative maximum from a fresh price snapshot and bounded input/output/reasoning tokens. Disable plugins, web search and other billable tools until their costs can be bounded. Unknown pricing or allowance blocks paid dispatch.
5. In one serializable transaction or equivalent locked update, reserve against task, daily, monthly and outstanding payer usage. Use integer units. Check all workers/tabs; a frontend counter or per-process mutex is insufficient. Reservations count across resets until settled.
6. Bind all child generations, classification, repairs, retries, tool executions, speech and embedding calls to the original rootTaskId. A child cannot mint a new budget or change payer/provider/ceiling.
7. Atomically claim a permitted call before dispatch. Reject repeated prompt/tool fingerprints and cycles with no progress. Do not deduct the same request twice. One admitted call exhausts the default generation allowance.
8. Stop before the next dispatch on any limit, deadline, revocation, repeated tool outcome or kill switch. Human review may authorize a new task; an agent may not resume itself, raise limits, buy credits or fall back to Swan's key.
9. On ambiguous acceptance, hold the reservation. Reconcile by known provider/task receipt. A disconnect, timeout or partial stream does not establish zero cost. Never blindly resend. If the provider cannot establish the charge, keep it uncertain and require operator/owner resolution.
10. Settle actual verified charges and release only proven-unused reservation amounts. Cancelling a model call does not reverse completed provider work or committed plan writes.

The database can strictly limit admitted work and conservative reservations under a bounded provider contract. Swan cannot control consumption of the same OpenRouter key in another app, independently run agent calls outside Swan, changed provider billing semantics or an unbounded paid tool. State these limits rather than promising a mathematically perfect dollar ceiling from estimates.

Run states: quoted → reserved → dispatching → awaiting_receipt → proposal_ready → reviewed; blocked, cancelled, uncertain and settled are explicit states. Never recycle an uncertain reservation automatically. Idempotent recovery and budget reset races require real DB tests.

## Privacy profile and permissions

Default external context: pseudonymous session-scoped subject alias, canonical exercise IDs, prescriptions, coarse training goals, available equipment and reviewed functional restrictions. Exclude names, contacts, full DOB, raw medical records/medications, child narratives, attachment text, direct identifiers, private notes and operator memory. This is stricter than today's identity-blind-but-medically-informed implementation.

A child or unknown-age subject is ineligible for the new cloud path until authoritative age/guardian policy and verified grants are implemented. No age threshold is invented here. Collect the minimum necessary eligibility fact; do not disclose birth dates to a model. Non-AI/manual app features remain available as authorized. A guardian path must not depend on a self-asserted checkbox. This is an implementation blocker, not legal certification.

| Actor | Default Coach | Own connections | Other-client data | Consent / budget changes |
|---|---|---|---|---|
| user / client | own eligible context | owner-only | denied | self policy only; cannot grant for another client |
| trainer | eligible assigned client | trainer pays using own connection | recheck current assignment every task/read/save | cannot manufacture client/guardian consent |
| admin | separately authorized training operations | personal or explicit managed Swan policy | explicit scoped access and auditable purpose | no silent override of withdrawal in new cloud path |
| agent | scoped read/propose tools | opaque task capability only | intersection of grant + role + object + eligibility | cannot change credentials, budgets, consent, role or billing |
| consultant | optional time-limited setup support | customer retains ownership | none by default | separately granted/revocable support; no master credential |

## Requirements, slices and acceptance

| ID | Acceptance | Test / slice |
|---|---|---|
| R-B01 | Default Coach works without API setup; optional connections preserve target/payer separation | T-CON01 preview + real auth contract; C1 |
| R-B02 | Personal PKCE, encrypted owner-bound storage, credential rotation and revocation | T-CON02 real callback/replay/cross-owner tests; C2 |
| R-B03 | One root-task reservation across workers, tabs, retries and children; 105 attempts never admit 105 calls | T-CON03 DB concurrency/idempotency/loop suite; C3 |
| R-B04 | Unknown cost/allowance/acceptance blocks another paid dispatch; no hidden fallback | T-CON04 injected timeout/stream/disconnect and provider-capture tests; C3 |
| R-B05 | Final outbound envelope enforces identity, medical, child and modality policy; opt-out terminal | T-CON05 synthetic canaries at every real HTTP sink; C0/C1 |
| R-B06 | Local-only tasks produce zero disallowed cloud calls across every modality/failure | T-CON06 real companion and denied-egress negative controls; C4 |
| R-B07 | Current roles/assignment/consent checked before enrichment and save; agent cannot alter policy | T-CON07 permission matrix, demotion/reassignment/revoke races; C0/C1 |
| R-B08 | Exact prescription diff, stale rejection and retained mobile/Program Map state | T-CON08 preview + app component/E2E; P2 |

C0: reconcile the current-checkout findings onto current main; preserve governed ownership and reproduce intended failing privacy tests. Repair consent ownership/withdrawal/verification, current-role access and final-envelope privacy before introducing new sinks.
C1: shared broker and complete typed privacy contract; migrate one chat consumer behind a flag, keep existing writer.
C2: personal OpenRouter lifecycle and setup; no paid dispatch until C3.
C3: durable budget ledger, root-task bounds and uncertain-charge recovery. Prove across two processes and tabs with a disposable DB and provider capture stub, then separately approved low-cost real provider smoke.
C4: authenticated MCP plus local companion as two distinct milestones. Pin supported Hermes/client versions; verify device revoke and network denial behavior.
P2: integrate reviewed Training Studio into existing mounted Planner; preserve Rolodex contract, backups, blends, PDF and logger semantics.

Entry: owned refreshed tree, preservation, source manifest, RED tests. Exit: GREEN source/contract tests, true boundary evidence, privacy-safe logs, rollback test and established final review authority. No deployment or paid verification is authorized by this plan-only pass.

## Operational failure, recovery and rollback

Owner: Swan backend maintainer for broker/ledger; account owner for personal connection policy; privacy owner for data categories/guardian rules; Sean/final decider for release.
Feature flags independently disable provider dispatch, personal connections, local jobs and new Planner UI. Rollback disables new dispatch but retains ledger, uncertainty and proposal receipts. Never drop reservation tables or reinterpret unsettled tasks as zero cost. Existing/manual planning must stay available where authorization permits.
Expand-only migrations first; encrypted connection backfill is opt-in, no copied site keys. Old clients receive stable typed errors and can continue manual workflows. Restores run against isolated backups with credential references disabled.
Metrics: admitted/denied calls per root task; reserve/settle mismatch; uncertain tasks; retry attempts denied; revocation latency; privacy decisions by reason code; zero raw prompt dimensions. Alert on orphaned reservations and calls lacking task IDs.
Initial budgets: eligibility+reservation p95 <300ms excluding provider latency, proposal rendering p95 <100ms on a representative client, UI interaction <200ms, connection cancellation prevents the next unclaimed dispatch immediately; in-flight transport abort is best effort. Load test 25 concurrent task attempts and 1k Rolodex items; avoid inventing benchmark results.
