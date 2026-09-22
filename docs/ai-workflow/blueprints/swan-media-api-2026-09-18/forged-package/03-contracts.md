**Common types and validation**

```ts
type Micros = string; // canonical nonnegative integer: /^(0|[1-9][0-9]*)$/
type USD = string;    // canonical decimal with exactly six fractional digits
type UTC = string;    // valid UTC ISO-8601 timestamp
type Evidence = "probed" | "published" | "claimed";
type PrincipalType = "human" | "agent" | "service";
type State =
  | "queued" | "submitting" | "running" | "reconciling"
  | "finalizing" | "succeeded" | "failed" | "nsfw" | "canceled";
```

Use `BigInt` for authoritative micro-dollar calculations. Reject malformed, negative, nonfinite, exponential, boolean, array, and overprecision monetary inputs. Do not silently round a maximum charge downward. A contract requiring finer units is unsupported until an explicit precision migration.

All request objects reject unknown fields. JSON body limit remains 262,144 bytes. IDs are server-generated UUIDs; malformed or unauthorized object IDs return `404`. Authenticate before object lookup.

Every JSON response includes `request_id`. Binary responses carry `X-Request-Id`.

**Generation specification**

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

The profile name is reserved pending identification of the actual graph.

Rules:

- Exactly one of `route.provider_model` or `route.model`.
- Local execution requires `execution_profile`.
- `operation`: `text-to-video`, `image-to-video`, or `text-to-image`, additionally capability-gated.
- `seed`: integer `0..4294967295`; absent seed is generated once and persisted in the quote.
- Prompt: nonempty string, at most 8,000 Unicode code points, then existing prompt policy.
- `input.image_asset_id` is required only for image-conditioned operations.
- `duration_mode:"profile"` forbids `duration_seconds`.
- `duration_mode:"seconds"` requires a finite positive number accepted by the retrieved route schema.
- No generic width/height/tuning passthrough in this revision.
- Commercial context can become stricter server-side, never weaker.
- Preview and input assets must belong to the principal, remain available, and satisfy the existing content/preview policy.
- No upload route is added. Missing qualifying assets block the operation. A generated image is not automatically an approved preview.

**REST contract**

All routes require a nonrevoked per-principal bearer credential.

| Endpoint | Scope | Request | Success |
|---|---|---|---|
| `GET /health` | Any valid principal | None | `200 {ok:true, request_id}`; liveness only |
| `GET /v1/models` | `models:read` | None | `200 {models:Model[], request_id}` |
| `POST /v1/estimate` | `models:read` | Generation specification | `200 {estimate:Estimate, request_id}`; no quote/reservation |
| `POST /v1/quotes` | `quotes:create` | Generation specification | `201 {quote:Quote, request_id}` |
| `POST /v1/jobs` | `jobs:create` | `{quote_id,max_cost_usd}` and `Idempotency-Key` | `202 {job:Job,request_id}`, `Location` |
| `GET /v1/jobs/:id` | `jobs:read` | None | `200 {job:Job,request_id}` |
| `POST /v1/jobs/:id/cancel` | `jobs:cancel` | `{}` | `200` canceled/already canceled; `202` cancellation requested |
| `GET /v1/assets/:id` | `assets:read` | None | `200 {asset:Asset,request_id}` |
| `GET /v1/assets/:id/content` | `assets:read` | Optional single byte range | `200` or `206` binary |
| `GET /v1/wallet` | `wallet:read` | None | `200 {wallet:Wallet,request_id}` |

`max_cost_usd` is required even for local execution; use `"0.000000"`.

`Idempotency-Key` is 16–128 printable ASCII characters. Persist its digest, principal, and canonical fingerprint of `{quote_id,max_cost_usd}`. Same principal/key/fingerprint returns the existing job without new accounting. A changed fingerprint returns `409 E_IDEMPOTENCY_CONFLICT`.

Quotes are single-use for **new** admissions. Same-key replay remains valid after quote consumption or expiry. Different key against consumed quote returns `409 E_QUOTE_USED`.

**Response record definitions**

```ts
type Model = {
  id: string;
  model_family: string;
  model_version: string | null;
  enabled: boolean;
  capabilities: Record<string, {
    value: unknown | null; provenance: Evidence; source_ref: string | null
  }>;
  readiness: {
    runnable: boolean;
    profile_hash: string | null;
    observed_at: UTC | null;
    blockers: string[];
  };
};

type Pricing = {
  currency: "USD";
  basis: "none" | "output_second" | "generation" | "image";
  rate_usd: USD | null;
  rate_provenance: Evidence | null;
  rate_source: string | null;
  rate_checked_at: UTC | null;
  price_version: string | null;
  billable_quantity: number | null;
  estimated_micros: Micros | null;
  reservation_micros: Micros | null;
  estimated_usd: USD | null;
  reservation_usd: USD | null;
  charge_bound_verified: boolean;
  bound_basis: object | null;
};

type Estimate = {
  selected_route: string;
  pricing: Pricing;
  admissible: false;
  message: string;
};

type Quote = {
  id: string;
  created_at: UTC;
  expires_at: UTC;
  normalized_request_hash: string;
  selected_route: string;
  execution_profile_hash: string | null;
  hosted_schema_hash: string | null;
  requested_output: object;
  duration_binding: "profile" | "seconds";
  licence_decision: {
    allowed: true;
    policy_version: string;
    grant_recorded: boolean;
    grant_evidence_ref: string | null;
  };
  capability_evidence: object;
  pricing: Pricing;
  cancellation: { supported_now: boolean; reason: string };
  requirements: string[];
};

type Billing = {
  estimated_micros: Micros;
  reserved_micros: Micros;
  vendor_reported_gross_micros: Micros | null;
  vendor_reported_refund_micros: Micros | null;
  settled_net_micros: Micros | null;
  settlement_status: "pending" | "reconciled" | "disputed";
  settlement_evidence: object[];
};

type Job = {
  id: string;
  state: State;
  state_reason: string | null;
  created_at: UTC;
  updated_at: UTC;
  selected_route: string;
  execution_profile: string | null;
  requested_output: object;
  execution: {
    kind: "local_gpu" | "hosted";
    backend_outcome: "unknown" | "running" | "completed" | "failed" | "nsfw" | "canceled";
    gpu_occupancy_seconds: number | null;
    render_wall_seconds: number | null;
    model_version: string | null;
    model_version_provenance: "declared" | "observed" | null;
    graph_hash: string | null;
  };
  billing: Billing;
  cancellation: {
    supported_now: boolean;
    requested_at: UTC | null;
    effective_at: UTC | null;
    reason: string;
  };
  assets: string[];
  error: { code: string; message: string; retryable: false } | null;
};

type Asset = {
  id: string;
  job_id: string;
  sha256: string;
  bytes: number;
  mime: string;
  media: {
    duration_seconds: number | null;
    width: number | null;
    height: number | null;
    frame_count: number | null;
  };
  provenance: object;
  expires_at: UTC | null;
};

type Wallet = {
  day: string;
  admitted_runs: number;
  limits: object;
  reserved_micros: Micros;
  unresolved_exposure_micros: Micros;
  settled_net_today_micros: Micros;
  available_micros: Micros | null;
  gpu_occupancy_seconds: number | null;
  gpu_budget_enforcement: "metered_only";
  accounting_status: "healthy" | "blocked";
};
```

Public responses exclude backend credentials, vendor URLs, internal filesystem paths, and raw prompts. Existing provenance may retain bounded prompt text internally under its existing commitment; public projection returns the prompt hash rather than that text.

**Error envelope**

```json
{
  "error": {
    "code": "E_DURATION_UNBOUND",
    "message": "This profile does not accept duration in seconds.",
    "retryable": false,
    "details": {}
  },
  "request_id": "server-generated-id"
}
```

| Status | Codes |
|---|---|
| 400 | `E_BAD_JSON`, `E_NO_IDEMPOTENCY_KEY` |
| 401 | `E_UNAUTHORIZED` |
| 403 | `E_SCOPE_DENIED`, existing licence refusals, `E_PROVIDER_DISABLED`, `E_PREVIEW_REQUIRED`, `E_BUDGET_EXCEEDED` |
| 404 | `E_NO_ROUTE`, `E_OBJECT_NOT_FOUND` |
| 409 | `E_ROUTE_SELECTION_REQUIRED`, `E_QUOTE_CHANGED`, `E_QUOTE_USED`, `E_IDEMPOTENCY_CONFLICT`, `E_CANCEL_TOO_LATE`, `E_CANCEL_UNAVAILABLE` |
| 410 | `E_QUOTE_EXPIRED`, `E_ARTIFACT_EXPIRED`, `E_IDEMPOTENCY_EXPIRED` |
| 413 | `E_BODY_TOO_LARGE`, `E_INPUT_TOO_LARGE` |
| 416 | `E_RANGE_UNSATISFIABLE` |
| 422 | `E_INVALID_REQUEST`, `E_CAPABILITY_UNSUPPORTED`, `E_DURATION_UNBOUND`, `E_PRICE_UNBOUNDED`, `E_PROFILE_UNVERIFIED` |
| 429 | `E_RUN_LIMIT`, `E_QUEUE_FULL`, `E_RATE_LIMIT` |
| 503 | `E_STORE_UNAVAILABLE`, `E_ACCOUNTING_UNAVAILABLE`, `E_RESOURCE_UNAVAILABLE` |

Preserve existing named licence codes and map them consistently. Adapter failure after admission appears in the job returned by `GET`, not as a replacement HTTP status for the earlier `202`.

**Money and volume**

- Defaults: zero paid allowance; 50 admitted jobs per UTC day.
- Principal-specific limits may only narrow global limits.
- Atomic admission increments volume and reserves the documented maximum charge.
- Failed and canceled admitted jobs retain volume consumption.
- Idempotent replays consume nothing.
- Free local execution reserves zero USD, but still consumes volume and exclusive GPU occupancy.
- All unresolved reservations count across midnight.
- UTC clock rollback blocks new admissions; it cannot reopen a spending period.
- Separate lifetime funding exposure prevents midnight from creating credit.
- Unknown price or maximum quantity means no quote.
- Failed or `nsfw` status alone never releases paid exposure.
- Settlement records gross, refund, and net independently with evidence.
- Charges above reservation are recorded in full and stop further paid admission.
- GPU occupancy is nullable until measured; `metered_only` is not evidence that a measurement exists.

The supplied `$0.13 × 6 = $0.78` remains published-rate arithmetic, not a verified endpoint capability, charge cap, or invoice.

**Persistence and recovery**

Use a required OS-restricted state root outside the checkout. Extend the existing ledger; the journal is recovery machinery, not another monetary authority.

Admission transaction:

1. Validate authenticated identity and immutable request.
2. Resolve replay/conflict.
3. Revalidate quote, licence, preview, profile/schema, pricing and limits.
4. Prepare one journal transaction for quote consumption, job, idempotency, run volume and reservation.
5. Durably write and flush prepared intent.
6. Apply idempotent record updates and flush.
7. Commit transaction.
8. Only then make the job dispatchable and return `202`.

Startup blocks dispatch until journal recovery, accounting validation, and resource ownership reconciliation finish. Process locks must not be removed solely because a PID appears stale.

Submission requires a separate persisted attempt identity. If backend acceptance is uncertain, retain `reconciling`; never issue another generation POST automatically.

**Retention**

- Unresolved jobs, reservations, leases and journals: no automatic purge.
- Terminal jobs: 90 days.
- Assets: 30 days unless pinned.
- Ledger events: at least 365 days, plus any unresolved dependencies.
- Provenance: at least asset lifetime and longer if the existing licensor commitment requires it.
- Idempotency tombstones: retained indefinitely; at capacity, refuse new admissions rather than discard replay protection.
- Expired owned assets: `410`; foreign or unknown IDs: `404`.

**Migration and rollback**

Legacy stores are imported read-only first. Produce a migration report and preserve original bytes/hashes.

- Unknown legacy execution becomes `reconciling`.
- Unknown historical charge remains unknown.
- Legacy monetary values must be exactly representable on the target micro-dollar grid; otherwise block migration.
- Missing legacy caller attribution is not assigned to a fabricated principal.
- No automatic deletion or “start fresh” repair.
- Rollback stops dispatch, preserves all current journals and unresolved exposure, and restores code separately from state.
- Never restore pre-submission accounting over later external execution.
- No production DB migration is required.

**Configuration**

Existing variables remain recognizable, but the target configuration is stricter:

| Variable | Target handling |
|---|---|
| `SWAN_MEDIA_API_HOST` | Only `127.0.0.1` or explicitly configured `::1` |
| `SWAN_MEDIA_API_PORT` | Integer `1..65535`; default 8788 |
| `SWAN_MEDIA_API_ALLOW_NON_LOOPBACK` | Rejected when set; cannot relax binding |
| `SWAN_MEDIA_API_STATE_DIR` | New required absolute path outside checkout |
| `SWAN_MEDIA_API_PRINCIPALS_FILE` | New restricted credential-verifier/policy file |
| `SWAN_MEDIA_API_TOKEN` | Legacy only; no shared-owner fallback in target auth |
| `SWAN_VIDEO_PROVIDERS_ENABLED` | Empty by default; configuration alone cannot bypass readiness |
| Existing global/per-caller caps | Parsed into integer authority; invalid values block startup |
| Existing ComfyUI graph/binding variables | Must match pinned profile; duration stays unbound for H3 |
| Higgsfield credentials | Unprovisioned; never required for offline tests |

No environment values or credentials belong in the package.

**Asset and network rules**

- Local artifact path must resolve inside the configured output root and be a regular file; reject traversal and links escaping the root.
- Hosted downloads require a retrieved destination policy, public-address validation, bounded bytes, TLS, redirect revalidation, and no vendor authorization header on CDN requests.
- No guessed CDN allowlist.
- Default maximum artifact size: 512 MiB; larger supported media requires an explicit profile amendment.
- Single byte-range support only; malformed/multiple ranges return `416`.
- Verify media with local inspection before publication; filename extension alone is insufficient.
- Poll retry is observation only. Submission retry is forbidden.
- Stop polling is not cancellation.

**New adapter seam**

```ts
interface LifecycleAdapter {
  inspect(profile: object): Promise<object>; // no generation
  submitOnce(attempt: object): Promise<
    | { kind: "accepted"; backend_id: string; evidence: object }
    | { kind: "rejected"; error: object }
    | { kind: "uncertain"; evidence: object }
  >;
  observe(backendId: string, binding: object): Promise<object>;
  cancelOwned(backendId: string, ownership: object): Promise<object>;
}
```

Preserve the current `generate()` compatibility export for existing callers. The gateway must use lifecycle operations so backend identity is persisted before completion. Compatibility callers must not become a reservation bypass.
