# Consult reply — GPT-6 Astra Pro (openai/gpt-6-astra-pro) — 2026-09-18T21:23:38.510Z

> tokens: prompt=30173 completion=15656 | finish_reason: stop | max_tokens: 60000

VERDICT                  **PLAN REVISED**

Adopt a **neutral, asynchronous quote → job → asset API**, with provider-specific execution, duration, pricing, licence and cancellation facts kept visible. Do not make “local GPU execution” and “hosted billable generation” interchangeable merely because both produce video.

**Money is bounded by server-owned caller allowances, atomic reservations before submission, and explicit approval of a priced route—not by an agent’s willingness to supply a spending limit.** Unknown prices, unknown billable quantities and ambiguous submissions must stop further spending rather than trigger retries or fallback.

Below, limits and retention periods are **proposed policy defaults**, not measured performance claims. Packet measurements remain scoped to their recorded configurations; vendor documentation remains `published`.

## D-A SURFACE CONTRACT

### Decision: neutral `/v1` API; do not mirror Higgsfield

Ranked priorities:

1. Prevent unauthorized execution and spending.
2. Preserve durable job identity across crashes.
3. Normalize lifecycle and artifact access.
4. Preserve—not conceal—backend differences.

All endpoints require gateway authentication. JSON responses include `request_id`; timestamps use UTC ISO 8601. Reject unknown request fields.

### Endpoints

| Method and path | Request | Success |
|---|---|---|
| `GET /v1/models` | None | `200 {models:[...]}` |
| `POST /v1/quotes` | Generation specification below | `201 {quote:...}`; creates no provider submission or spending reservation |
| `POST /v1/jobs` | `{quote_id, max_cost_usd}` plus required `Idempotency-Key` header | `202 {job:...}`, `Location: /v1/jobs/:id` |
| `GET /v1/jobs/:id` | None | `200 {job:...}` |
| `POST /v1/jobs/:id/cancel` | `{}` | `202 {job:...}` if cancellation requested; `200` if already canceled |
| `GET /v1/assets/:id` | None | `200` metadata, checksum, media metadata and provenance |
| `GET /v1/assets/:id/content` | None | `200` binary content; `206` for supported range requests |
| `GET /v1/wallet` | None | `200` authorized caller’s limits, reservations, settlements and GPU usage |

No public model-path passthrough, arbitrary graph submission, vendor URL submission or generic proxy endpoint.

### Quote request

```json
{
  "route": {
    "provider_model": "comfyui/wan-2.2",
    "execution_profile": "wan22-ti2v5b-832x480-49f-20steps"
  },
  "operation": "text-to-video",
  "input": {
    "prompt": "A paper sailboat crossing a painted sea",
    "seed": 1234
  },
  "output": {
    "duration_mode": "profile"
  },
  "use_context": {
    "commercial": true
  },
  "preview_asset_id": null
}
```

The profile identifier above is a **proposed identifier for the measured configuration**, not a claim that this profile is already registered.

Rules:

- Exactly one of `route.provider_model` or `route.model`.
- `execution_profile` is required for local execution.
- Operations are an enum: `text-to-video`, `image-to-video`, `text-to-image`; each is additionally gated by that route’s capabilities.
- Image conditioning uses a server-owned `input.image_asset_id`, never an arbitrary URL or filesystem path.
- `output.duration_mode` is either:
  - `profile`: no `duration_seconds` allowed;
  - `seconds`: positive `duration_seconds` required and validated against the retrieved model schema.
- Width, height and other tunables are accepted only where the selected profile/schema explicitly binds them. No generic property forwarding.
- `use_context.commercial` cannot override stricter server-owned licence context.
- `preview_asset_id` invokes the existing image-first policy. A caller-provided boolean such as `preview_done:true` is insufficient.

### Quote response

A quote contains:

```text
id, created_at, expires_at, normalized_request_hash,
selected_route, execution_profile_hash,
requested_output, duration_binding,
licence_decision, capability_evidence,
pricing, cancellation, requirements
```

`pricing` contains:

```text
currency: "USD"
basis: "none" | "output_second" | "generation" | "image"
rate_usd: decimal-string | null
rate_provenance: "probed" | "published" | "claimed" | null
rate_source, rate_checked_at
billable_quantity: number | null
estimated_usd: decimal-string | null
reservation_usd: decimal-string | null
bound_basis: object | null
```

A successful quote must be admissible under current policy. Unpriceable or non-runnable requests receive an error, not a spendable quote with an optimistic zero.

**Policy:** quotes expire after five minutes. Job admission rechecks provider enablement, credentials, price version, licence, preview evidence, profile hash and available budget. A quote is neither a reservation nor permission to execute indefinitely.

### Job response

```text
id, state, state_reason, created_at, updated_at,
selected_route, execution_profile, requested_output,
execution, billing, cancellation, assets, error
```

States:

```text
queued → submitting → running → finalizing → succeeded
                     ↘ reconciling
terminal alternatives: failed | nsfw | canceled
```

`reconciling` is nonterminal and may require operator intervention. A polling timeout is not a provider failure.

Deliberate differences:

| Field | Local | Hosted |
|---|---|---|
| `execution.kind` | `local_gpu` | `hosted` |
| Execution identity | Worker/profile/graph hash | Vendor/model/schema version |
| Duration | Fixed profile unless a mapping is proven | Validated model-specific seconds |
| Money | Zero provider/API charge for audited local graph | Published pricing plus reservation |
| Resource accounting | Exclusive GPU occupancy | Hosted billable units |
| Cancellation | Depends on ownership-safe queue/interrupt support | Published queued-only cancellation |
| Licence | Local weight-execution restrictions | Independently evidenced hosted-service rights |

Expose `cancellation.supported_now` and `cancellation.reason`; never promise that “cancel requested” means “execution stopped” or “not billed.”

### Status and error contract

```json
{
  "error": {
    "code": "DURATION_UNBOUND",
    "message": "This profile does not accept duration in seconds.",
    "retryable": false,
    "details": {}
  },
  "request_id": "..."
}
```

| Status | Meaning |
|---|---|
| `400` | Malformed JSON or missing idempotency header |
| `401` | Missing/invalid authentication |
| `403` | Scope, licence, enablement, preview or allowance refusal |
| `404` | Unknown or unauthorized object |
| `409` | Ambiguous route, changed quote, idempotency conflict or cancellation too late |
| `410` | Expired quote or deleted artifact |
| `413` | Request/input exceeds configured size limit |
| `422` | Unsupported capability, unbound duration, invalid schema or unbounded price |
| `429` | Rate, daily run or queue-admission ceiling |
| `503` | Durable store/resource policy unavailable; admission fails closed |

Budget refusals use `403 BUDGET_EXCEEDED`; include sanitized available/reserved amounts.

An accepted asynchronous job reports subsequent provider failure through its job record, not by retroactively changing its submission HTTP status.

## D-B MODEL IDENTITY + ROUTING

### Decision: provider-qualified execution identity is authoritative

Retain:

- `comfyui/minimax-h3`
- `comfyui/wan-2.2`
- `minimax/hailuo-hosted`

Add Higgsfield identities only as disabled catalogue data until their contracts are retrieved:

- `higgsfield/minimax-h3`
- Corresponding verified catalogue identifiers for other vendor offerings.

Use a separate family identity such as `minimax-h3` for discovery. Also record profile, checkpoint/workflow hash or hosted model version where available.

**The packet establishes common model branding, not identical weights, settings, output quality or execution behaviour.** Hosted/local equivalence is an unmeasured hypothesis; resolving it requires vendor version evidence and controlled comparison runs.

### Model-only requests

Permitted for quoting only when a **server-owned routing profile** maps the model family to exactly one provider-qualified target.

- No profile or multiple candidates: `409 ROUTE_SELECTION_REQUIRED`.
- The quote discloses the selected provider and price.
- Job submission executes only that quoted target.
- No default “cheapest eligible provider” search.
- No bare `generate` advertisement without this routing support.

### Licence order

1. Resolve identity through the explicit request or pinned routing profile.
2. Apply the existing licence gate.
3. Validate capabilities, duration and pricing.
4. Produce a quote.

If the selected local H3 route fails the licence gate, return `403 LICENSE_DENIED`. Do not search for another provider.

Retain the exact distinction between weight execution and output rights. Apply grant and territory rules from the existing licence policy; a caller’s claim of a different location is not evidence.

The packet’s description of hosted H3 as “permitted” is **not sufficient hosted licence evidence**. Retrieve hosted commercial-use and territory terms before enabling that row. Local restrictions neither automatically transfer to hosted execution nor disappear merely because a provider is renamed.

**Silent fallback is prohibited.** A different provider requires a new quote and a new explicit submission. A failed local job must never silently become a paid hosted job.

## D-C WALLET

### Decision: extend the existing ledger into a multi-resource reservation ledger

One wallet accounts for:

```text
admitted runs
USD reserved
USD settled
USD unresolved exposure
GPU occupancy seconds, measured
GPU occupancy seconds, reserved when an enforceable bound exists
```

This is an extension of `spendGuard.mjs`, not a second spending system.

### USD admission

Use fixed-point decimal/integer arithmetic, never binary floating-point money arithmetic.

Before backend submission, atomically check:

```text
settled today
+ all unresolved outstanding reservations
+ new reservation
<= applicable daily USD allowance
```

Also enforce per-job, per-caller and global ceilings. The caller’s `max_cost_usd` can only reduce a server allowance.

Keep the current defaults:

- USD: **$0/day**
- Volume: **50 admitted jobs/day**

Rejected preflight calls consume neither. Admitted jobs consume volume even if subsequently failed or canceled; refunds must not enable unlimited retry traffic. Idempotent replays consume nothing additional.

Outstanding reservations survive midnight and continue reducing available allowance. Also enforce total prepaid funding/exposure limits; a day boundary cannot create credit.

### Per-second pricing

For a contractually fixed billable duration:

```text
estimate = published rate × contract-defined billable seconds × output count
```

For published Higgsfield H3 pricing:

```text
$0.13 × 6 = $0.78
```

That is **published-rate arithmetic**, not a measured invoice and not proof that the unresolved H3 endpoint accepts six seconds.

A reservation requires a documented maximum charge under the actual request schema, including rounding, minimum duration, variants and fees. An arbitrary percentage buffer is not evidence of a bound.

DoP must use its published per-generation basis; images use per-image pricing. Do not infer pricing units from media type.

### Unbound local duration

For the current H3 graph:

- `duration_mode:"profile"` is admissible if all other gates pass.
- Any requested seconds return `422 DURATION_UNBOUND`.
- Never bind seconds to `length`, `frames`, or `value` through name matching.
- Return actual artifact duration after decoding/probing the completed file.
- Do not advertise an inferred input-to-duration mapping.

A paid route with unknown billable duration is refused, regardless of whether another local profile can run.

### GPU budget

**Local runs consume measured GPU-occupancy accounting, but day one does not pretend to enforce a predictive GPU-minute spending budget.**

Start with the existing resource policy’s exclusive lease, admitted-run ceiling and a bounded gateway queue. Proposed queue policy: eight waiting local jobs, one active lease.

Measure occupancy from acquisition through safe release, including loading/finalization while the GPU remains reserved. Record render wall time separately.

An enforceable hard GPU-minute allowance requires:

- A documented maximum lease duration;
- Safe, ownership-scoped termination;
- Recovery proof after timeout.

Until those exist, report `gpu_budget_enforcement:"metered_only"` and refuse requests requiring a guaranteed GPU-time cap.

The recorded Wan and H3 runs establish observed timings and memory peaks, not runtime maxima, sustained throughput or coexistence capacity. Do not size concurrency from them. Extend `worker-resource-policy.mjs`; do not create another GPU lock.

## D-D AUTH + EXPOSURE

### Decision: loopback and per-caller opaque tokens

- Gateway binds `127.0.0.1` only; IPv6, if enabled, binds `::1` explicitly.
- ComfyUI remains loopback-only.
- Remote callers use SSH forwarding exclusively.
- No LAN/tailnet bind, browser credential delivery or direct vendor access.
- Disable browser CORS by default.

Use independently revocable, high-entropy opaque bearer tokens. Store only token verifiers, with constant-time comparison. Server records bind each token to:

```text
principal_id
principal_type: human | agent | service
scopes
allowed_routes
per-job/day/volume limits
routing profile
approval policy
```

Suggested scopes: `models:read`, `quotes:create`, `jobs:create`, `jobs:read`, `jobs:cancel`, `assets:read`, `wallet:read`.

A request is classified by its authenticated principal, **not by a `human:true` body field or User-Agent**. This identifies the credential’s authority; it cannot prove a human physically initiated the request.

Agent tokens default to zero paid allowance. A human-controlled administrative action may establish a capped grant tied to principal, routes, expiry and optional quote/input hash. The agent cannot issue or enlarge its own grant.

Higgsfield key ID and secret remain gateway-only in an OS-restricted secret source. Neither component belongs in the repo.

### Never log

- Authorization headers, caller tokens, vendor key ID or secret;
- Raw vendor error bodies;
- Signed output URLs;
- Raw prompts, reference media or request bodies by default;
- PII, secret-bearing configuration or support dumps.

Log allowlisted identifiers, state transitions, safe error codes and accounting amounts. Redact before serialization and exception reporting.

Zero-PII submission is an admission requirement for both lanes. Use approved synthetic/nonpersonal inputs initially; reject inputs that cannot meet the existing prompt/input policy. Automated PII detection alone cannot honestly guarantee absence of PII.

Vendor polling/cancel URLs are untrusted input: validate against the configured vendor origin and retrieved endpoint contract. Never forward credentials to a supplied alternate host. Downloads require SSRF controls, redirect validation, size limits and no vendor Authorization header leakage.

## D-E JOB STORE

### Decision: readable JSON with one serialized durable writer

Use an OS-restricted runtime directory outside the checkout:

```text
state/
  jobs/<job-id>.json
  quotes/<quote-id>.json
  transactions/<transaction-id>.json
  spend-ledger.json
assets/<asset-id>/...
```

Keep JSON readably formatted. `transactions/` is a crash-recovery journal for updates to the **existing ledger and job records**, not a separate accounting authority.

Require one gateway writer/process lock. Write through temporary files, flush, atomically replace and validate startup recovery on the actual Windows filesystem. A file’s readability is not evidence of crash safety.

### Internal job record

```text
schema_version
id, owner_principal_id
idempotency_key_digest, normalized_request_hash
quote_snapshot
provider_model, model_family, worker_id
execution_profile_hash, graph_hash, schema_hash
licence_snapshot, input_provenance_refs
state, state_reason, transition_timestamps
backend:
  kind, prompt_id?, request_id?, validated_poll_ref?, validated_cancel_ref?
submission:
  attempt_id, intent_persisted_at, dispatch_state
resource_lease_ref
ledger_reservation_ref
cancellation:
  requested_at, provider_acknowledged_at, effective_at, reason
assets[]
sanitized_error
reconciliation:
  last_observed_provider_state, last_poll_at, next_poll_at, operator_required
```

Freeze per-asset provenance using the existing module. The public response excludes credentials, raw vendor URLs and internal filesystem paths.

### Submission and restart rules

1. Validate.
2. Durably commit job, idempotency mapping and reservation.
3. Persist submission intent.
4. Submit once.
5. Persist backend ID.
6. Poll/reconcile.
7. Copy and verify outputs; then publish asset references.

The critical failure window is **backend acceptance before backend ID persistence**.

- Search by durable correlation metadata only if the backend demonstrably supports it.
- Without reliable recovery, enter `reconciling`, keep the reservation and require intervention.
- Never blindly repeat a generation POST.
- `transportRetry.mjs` must distinguish safe GET retries from potentially duplicate paid submissions.

On gateway death during a local render, ComfyUI is a separate process. Expected behaviour is continued rendering, but this lifecycle property must be tested in Slice 1. On restart, reconcile the recorded `prompt_id` against queue/history and the existing resource lease.

Missing history is not proof of failure. Keep the job unresolved until queue/history/artifact or operator evidence settles it.

A gateway crash must not release an active GPU lease or admit an overlapping job. Recovery must use the existing resource-policy authority. If that authority cannot recover ownership, block dispatch.

### Cancellation and completion

- Gateway-queued, undispatched job: cancel locally and release its reservation.
- Dispatched local job: cancel only through ownership-safe adapter behaviour. Never issue a global interrupt that could stop unrelated work.
- Hosted queued job: request cancellation; vendor acknowledgment and accounting evidence are distinct.
- Vendor cancellation `400` after start maps to `409 CANCEL_TOO_LATE`, not `canceled`.

`completed` at the vendor becomes `finalizing` locally. `succeeded` means the artifact has been copied to controlled storage, verified and associated with provenance. Artifact-ingest failure must not erase a successful billable vendor generation.

### Retention policy

Proposed defaults:

- Nonterminal/unresolved jobs and reservations: never automatically purge.
- Terminal job metadata and idempotency records: 90 days.
- Artifacts: 30 days unless pinned.
- Ledger audit events: 365 days.
- Licence/provenance snapshots: at least artifact lifetime, extended by the actual licensor commitment.

Forbid reuse of an expired idempotency key rather than treating it as a fresh paid request. Expired artifacts return `410`.

Higgsfield’s “at least seven days” retention is a **vendor-published claim**. Copy immediately; do not design around waiting until day seven.

## D-F COST TRUTH

### Decision: distinguish price evidence, estimated obligation and settled charge

A `published` rate can support a clearly labeled estimate. It cannot by itself prove the final charge.

Keep separate fields:

```text
estimated_usd
reserved_usd
vendor_reported_gross_usd
vendor_reported_refund_usd
settled_net_usd
settlement_evidence
settlement_status: pending | reconciled | disputed
```

Do not label vendor-reported accounting as independently measured. Preserve source and timestamp.

### Hosted enablement gate

Before enabling a priced route, require:

1. Exact model path and archived request/response schema;
2. Valid duration and output-count constraints;
3. Pricing units, rounding and maximum-charge basis;
4. Hosted licence evidence;
5. Explicit owner acceptance of published pricing for bounded execution;
6. Reconciliation evidence source;
7. Image-first compliance;
8. Explicit provider enablement and positive allowance.

At present, those prerequisites are incomplete. Hosted catalogue discovery may be built, but live hosted submission remains disabled.

Unverifiable estimate or unknown maximum charge: `422 PRICE_UNBOUNDED`. No “submit and learn the invoice.”

Use a configurable pricing-freshness policy; proposed initial default is 24 hours. Freshness is not a vendor price lock. If pricing cannot be revalidated to policy, fail closed.

### Settlement

- Vendor-reported charge: record it with evidence and release only the unused reservation.
- Vendor-reported zero charge: settle at zero.
- Confirmed debit followed by confirmed refund: preserve both events; net them in the wallet.
- Failure without accounting evidence: record the failure and leave settlement pending.
- `nsfw` does not imply a refund; the packet provides no such billing assurance.
- Vendor status `failed` plus a published refund policy is an expected refund, not proof that a particular refund posted.

Thus the ledger **models refunds**, but never fabricates them.

If observed charge exceeds reservation, record the full charge, mark the breach and disable further paid submissions pending review. Accounting must not clip reality to the budget.

### What actually bounds money

The gateway can bound admitted exposure under a validated pricing contract. It cannot force an external vendor to honor that contract.

Use a dedicated funded vendor balance/account where available, prohibit automatic top-ups, and isolate unrelated spending. The published “balance cannot go below zero” statement is an additional **vendor assurance**, not a measured gateway guarantee. If balance isolation cannot be established, do not present account balance as this API’s exclusive spending cap.

Local `$0` means **zero provider/API charge for audited local execution**. It does not establish zero electricity, depreciation, operator time or opportunity cost.

## D-G SLICES (ordered, entry/exit evidence, no-go)

| Slice | Entry evidence | Exit evidence | No-go boundary |
|---|---|---|---|
| **1. Local over-wire vertical slice** | Existing adapter/policy tests; audited Wan workflow matching the measured configuration; resource-policy availability; explicit temporary operator enablement for the test | Authenticated HTTP quote → job → polling → verified downloaded video; durable job and ledger entry; frozen provenance; zero external provider requests; restart mid-poll successfully reconciled | No production-default enablement, H3 licence bypass, 5090 install changes, GSQ changes, paid nodes or remote credentials |
| **2. Admission and crash hardening** | Slice 1 evidence | Concurrent budget/idempotency tests; write-boundary crash recovery; loopback enforcement; licence and duration refusal over HTTP; resource ownership survives restart | No dispatch after uncertain reservation/lease recovery; no blind POST retries |
| **3. Hosted contract, offline only** | Retrieved model-specific OpenAPI and terms, versioned beside code | Disabled catalogue rows; bounded-price calculations; mocked submit/poll/cancel/artifact flows; credential-redaction and refund tests | No guessed paths, live calls, enabled hosted capability or claim of probed verification |
| **4. Optional owner-authorized hosted verification** | Separate explicit spending approval; credentials provisioned securely; all D-F gates met; fixed caller/job/funding ceilings | One approved request’s lifecycle, stored artifact and accounting reconciliation; observed capabilities marked `probed` only for the tested route/configuration | Not authorized by this packet; no run if charge bound or licence evidence is missing |
| **5. Explicit routing profiles and operations** | Proven route-specific contracts; owner-approved profiles | Model-only quoting selects one disclosed target; operator recovery procedure; retention restore test; wallet reflects outstanding and settled exposure | No silent fallback, MiniSwan generation registration or unmeasured latency/quality promises |

Slice 1 is not “build endpoints and mock success.” Its exit is an actual video served over the authenticated API.

If the measured Wan graph is not available to the existing adapter, Slice 1’s entry gate is unmet. Locate and audit the actual graph; do not invent a workflow or quietly switch to restricted H3.

All slices keep modules under the 300-line cap, documentation beside graph JSON, catalogue defaults disabled and `--disable-api-nodes` intact. Audit graph node definitions/categories and nested execution paths—not display names alone—to exclude `partner/` execution.

## D-H TEST IDS (requirement -> test -> evidence)

| Requirement | Test ID and test | Required evidence |
|---|---|---|
| D-A strict validation | **API-001**: malformed JSON, unknown fields, mutually exclusive route/duration fields, invalid enums | Expected `400/422`; adapter call count zero |
| D-A durable async admission | **API-002**: submit through loopback HTTP and retrieve actual local artifact | `202`, durable transitions, checksum, decoded media metadata |
| D-B licence at boundary | **LIC-001**: US commercial local H3 without sufficient recorded grant | `403 LICENSE_DENIED`; no reservation or submission; no hosted fallback |
| D-B truthful model identity | **ROUTE-001**: model-only request with absent/ambiguous profile; selected route becomes ineligible | `409` or explicit refusal; never another provider |
| D-C spend before submission | **PAY-001**: positive-price request with default zero allowance | `403`; vendor transport never called |
| D-C atomic allowances | **PAY-002**: concurrent submissions exceed remaining budget; cross midnight with held reservations | Only admissible reservations commit; exposure remains counted |
| D-C/F price dimensions | **PRICE-001**: published H3 six-second arithmetic, DoP generation pricing, image counts, unknown rounding | `$0.78` labeled published; proper units; unknown bound refused |
| D-C duration trap | **DUR-001**: current H3 receives `duration_seconds:4` | `422 DURATION_UNBOUND`; node 6 `length` unchanged; no submission |
| D-C profile duration | **DUR-002**: run profile-only request and inspect output | No fabricated requested seconds; actual duration from artifact inspection |
| D-C exclusive resource | **GPU-001**: two local jobs, existing competing lease, gateway crash | No overlapping gateway execution or second lock; preserved lease authority |
| D-D authentication | **AUTH-001**: missing/invalid/revoked token and cross-principal job access | `401/404`; no backend calls or object disclosure |
| D-D authority | **AUTH-002**: agent sends `human:true`, larger limits or forged approval | Rejected; server principal/allowances unchanged |
| D-D network boundary | **NET-001**: attempt non-loopback bind, inspect listeners, exercise SSH forwarding | No LAN/tailnet listener; forwarded authenticated call succeeds |
| D-D secret/PII controls | **SEC-001**: injected keys in vendor errors, signed URLs, disallowed inputs, hostile redirects | No secrets in responses/logs; blocked inputs/downloads |
| D-E state reconciliation | **JOB-001**: replay all Higgsfield states, local history states and transient poll failures | Correct mapping; timeout is nonterminal; no premature refund |
| D-E restart mid-job | **JOB-002**: terminate gateway during real local render and restart | Same job/backend identity, one render, recovered lease and artifact |
| D-E uncertain submission | **JOB-003**: crash after backend accepts but before ID persists | Recovered correlation or held `reconciling`; no duplicate POST |
| D-E durable accounting | **STORE-001**: terminate at every journal/write/rename boundary | Recovered job and reservation agree; corrupt state blocks dispatch |
| D-E cancellation | **CANCEL-001**: undispatched local, owned active local, hosted queued and hosted started | Truthful state; no unrelated interrupt; late cancellation `409` |
| D-E artifact ownership | **ASSET-001**: vendor completes but copying fails; later URL expires | No false success or erased charge; eventual recovery or explicit ingest failure |
| D-F refund truth | **BILL-001**: failed without evidence, confirmed zero charge, debit/refund, unbilled `nsfw` evidence | Pending where unknown; zero only with evidence; auditable refund events |
| D-A/B honesty | **CAP-001**: claimed capability, disabled route, missing graph, unbound duration, missing hosted schema | Claimed values remain `null`; `runnable:false` with reasons; quotes refused |
| No paid nodes | **GRAPH-001**: graphs with misleading names, `partner/` categories and indirect forbidden nodes | Rejected before ComfyUI submission |
| Preserve baseline | **REG-001**: existing registry, image-first, provenance and GSQ regression suite | No weakened licence/policy checks, GSQ configuration changes or new competing ledger |

For `CAP-001`, readiness must distinguish:

```text
declared support
evidence level
current enablement
verified executable binding
last readiness observation
```

A published vendor capability may remain visible as published data. It must not become `runnable:true` merely because its name exists in the catalogue.

## IMPOSSIBLE HERE

This API cannot honestly promise:

- Arbitrary local H3 duration in seconds with the present graph.
- Identical local and hosted H3 outputs, weights or quality.
- A render-time SLA, sustainable throughput or safe parallel GPU residency from the recorded single-run observations.
- Hosted eligibility based solely on catalogue branding.
- Exact hosted spending from a list rate without the billable-quantity contract.
- Automatic refund settlement without accounting evidence.
- Exactly-once backend execution across an acceptance/persistence crash window without backend recovery or idempotency support.
- Cancellation after hosted work starts, or ownership-safe local interruption before it is tested.
- Generation on MiniSwan.
- Zero total economic cost for local generation.
- Absolute PII detection or a cryptographic proof that a request was personally initiated by a human.

**Open measurements:** repeat each approved local profile under controlled starting residency to characterize runtime/peak-memory distributions; test crash/cancellation ownership; inspect output duration for each exact graph configuration; reconcile a separately authorized hosted charge against its quote. Until then, those performance, recovery and billing behaviours remain unmeasured hypotheses.

## BIGGEST RISK

**Treating a model name and a published price as an executable, bounded contract.**

That shortcut simultaneously reopens the `duration → length` bug locally and invents hosted request/billing semantics. Days will disappear debugging apparently valid “unified” requests whose units, licence or executable target were never established. Pin exact execution profiles and retrieved hosted schemas before generalizing.

## REJECTED

- **Vendor-shaped public API:** bakes one vendor’s endpoint and cancellation quirks into both lanes.
- **“Same model, interchangeable backend”:** branding is not operational equivalence.
- **“Hosted H3 is permitted” without terms evidence:** unsupported licence conclusion.
- **A flat catalogue `costPerRunUsd` for variable-duration video:** retain compatibility where necessary, but derive the scalar per validated request.
- **Zero as the fallback for unknown cost:** violates existing fail-closed and image-first semantics.
- **Duration name matching:** dimensionally unsafe and already contradicted by observed output.
- **Silent fallback or automatic generation retries:** can duplicate execution and spend.
- **Immediate refund on `failed` or `nsfw`:** confuses a status/policy statement with settlement evidence.
- **Plain JSON writes without transactional recovery:** readable state is not consistent state.
- **Predictive GPU-minute guarantees from smoke timings:** observations are not enforceable maxima.
- **Any second resource lock, ledger or policy engine:** extend the existing authorities.
- **Any implied authorization to enable providers or spend:** neither is granted by this adjudication.

## CONFIDENCE

| Decision | Confidence | Reason |
|---|---|---|
| **D-A** | **High** | Neutral asynchronous admission fits both documented lifecycles without hiding backend differences. |
| **D-B** | **High** | Explicit provider identity and no fallback preserve existing policy; hosted rights remain an enablement gate. |
| **D-C** | **High** | Reservation accounting resolves variable-unit pricing; GPU hard limits correctly remain unavailable without enforcement evidence. |
| **D-D** | **High** | Loopback, SSH-only access and per-principal limits satisfy the stated exposure constraints. |
| **D-E** | **Medium** | Design handles ambiguity explicitly, but Windows crash durability and existing resource-lease recovery require tests. |
| **D-F** | **Medium** | Accounting policy is clear; actual Higgsfield charge bounds and reconciliation interfaces remain unresolved. |
| **D-G** | **High** | First exit is genuine local over-wire execution; paid verification is separately gated. |
| **D-H** | **High** | Tests target the specified failure modes with observable refusal, recovery and accounting evidence. |
