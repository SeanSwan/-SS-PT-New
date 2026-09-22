**Mounted entry and ownership**

The service is a standalone Node HTTP gateway, not a React or production Express route:

```text
media-api/server.mjs
  buildServer() / start()
    → media-api/router.mjs::matchRoute(method, path)
      → media-api/routes.mjs
      → media-api/routesCatalog.mjs
    → backend/scripts/handlers/generateVideo.mjs
      → existing registry, policy, ceilings, adapters, provenance
```

Verified current route declarations are in `router.mjs`. The current detached runner is at `server.mjs:109–138`. The updated architecture replaces immediate dispatch with durable admission and a scheduler; it does not create another policy engine.

**Authority boundaries**

| Authority | Responsibility |
|---|---|
| Existing registry/licence/prompt modules | Decide provider eligibility and input policy |
| Profile registry | Pin graph, bindings, schema and measured configuration |
| Existing spend ledger, extended | Sole monetary and admitted-volume authority |
| Existing worker resource policy | Sole GPU lease authority |
| Gateway writer/journal | Serialize and recover persistence; grants no GPU authority |
| Backend adapter | Submit once, expose backend identity, observe, cancel where safe |
| Artifact service | Copy, inspect, hash and publish controlled media |
| Sean | Enablement, runtime approval, credentials and spending authorization |

The exact `worker-resource-policy.mjs` implementation and callable lease interface were not established in this checkout during this pass. **Integration is BLOCKED until its actual file, exports, ownership and recovery behavior are captured.** Do not satisfy this dependency with a new lock.

**Route identity**

Provider-qualified identities remain authoritative. Model-only quoting requires exactly one server-pinned routing profile; otherwise return `409 E_ROUTE_SELECTION_REQUIRED`. No cheapest-provider search or silent fallback.

Local profiles contain immutable graph and binding hashes. H3 seconds remain unsupported. Wan Slice 1 requires the actual audited graph corresponding to the recorded configuration; its proposed profile identifier does not prove that graph exists.

**User and subsystem flow**

```mermaid
flowchart TD
    C[Authenticated caller] --> D[Discover models and wallet]
    D --> Q[Request quote for explicit route]
    Q --> V[Validate schema and existing policies]
    V -->|refused| E[Return safe error; no admission]
    V -->|eligible and bounded| F[Persist immutable five-minute quote]
    F --> J[Submit quote with ceiling and idempotency key]
    J --> I{Existing principal and key?}
    I -->|same fingerprint| R[Return existing job]
    I -->|different fingerprint| X[409 conflict]
    I -->|new| A[Recheck policy and atomically admit]
    A -->|budget or store unavailable| E
    A --> W[Durable queued job]
    W -->|cancel wins before intent| K[Cancel; release reservation; retain run count]
    W --> L[Acquire existing resource lease if local]
    L --> S[Persist intent; submit once]
    S -->|unknown acceptance| U[Reconciling; hold lease and exposure]
    S --> P[Persist backend identity; observe]
    P -->|confirmed provider failure| T[Failed or nsfw; settlement independent]
    P -->|completed| G[Finalizing: copy and inspect]
    G -->|verified| H[Succeeded; owned asset available]
    G -->|ingest problem| G
    U --> O[Operator or backend evidence]
    O --> P
```

**Discovery APIs — separate read-only interactions**

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as Gateway
    participant S as Server-owned state
    C->>G: GET /v1/models
    G->>S: Read profiles, enablement and readiness observations
    G-->>C: 200 models with blockers and observation timestamps
    C->>G: GET /v1/wallet
    G->>S: Read caller limits, exposure and settlement
    G-->>C: 200 wallet or 503 if accounting unreadable
    C->>G: GET /health
    G-->>C: 200 authenticated liveness only
```

**Estimate and quote interactions**

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as Gateway
    participant P as Existing policy
    participant S as Store
    C->>G: POST /v1/estimate
    G->>P: Validate identity and arithmetic inputs
    G-->>C: 200 arithmetic; admissible false; no charge bound implied
    C->>G: POST /v1/quotes
    G->>P: Resolve pinned route; evaluate all quote gates
    alt Ineligible or unbounded
        G-->>C: 4xx refusal
    else Eligible
        G->>S: Persist quote snapshot
        G-->>C: 201 quote
    end
```

**Admission and polling**

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as Gateway
    participant J as Journal and existing ledger
    participant D as Dispatcher
    participant B as Backend
    C->>G: POST /v1/jobs plus Idempotency-Key
    G->>J: Atomic replay check or admission transaction
    J-->>G: Durable job and reservation
    G-->>C: 202 job plus Location
    D->>J: Persist submission intent after required lease
    D->>B: One generation submission
    B-->>D: Backend identity or uncertain response
    D->>J: Persist identity or reconciling
    C->>G: GET /v1/jobs/:id
    G->>J: Read owned job
    G-->>C: 200 lifecycle and independent billing state
```

**Cancellation**

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as Gateway
    participant J as Journal
    participant B as Backend
    C->>G: POST /v1/jobs/:id/cancel {}
    G->>J: Serialize against submission intent
    alt Undispatched
        G->>J: Commit canceled and release held exposure
        G-->>C: 200 canceled
    else Safe cancellation supported
        G->>B: Ownership-scoped cancellation request
        B-->>G: Acknowledged, late, or uncertain
        G->>J: Record observation without inventing outcome
        G-->>C: 202 requested or 409 too late
    else Unsupported
        G-->>C: 409 cancellation unavailable
    end
```

**Asset APIs**

```mermaid
sequenceDiagram
    participant C as Caller
    participant G as Gateway
    participant S as Controlled storage
    C->>G: GET /v1/assets/:id
    G->>S: Validate ownership and retained metadata
    G-->>C: 200 metadata or 404/410
    C->>G: GET /v1/assets/:id/content with optional Range
    G->>S: Open validated regular file inside asset root
    G-->>C: 200 full bytes, 206 single range, or 416
```

**Backend interactions**

```mermaid
sequenceDiagram
    participant D as Dispatcher
    participant L as Existing resource authority
    participant B as Selected backend
    participant A as Artifact service
    D->>L: Acquire existing lease for local execution
    L-->>D: Lease identity or refusal
    D->>B: Submit exact pinned graph or retrieved hosted schema
    B-->>D: prompt_id or request_id
    loop Safe observation only
        D->>B: Read status through validated endpoint
        B-->>D: Pending, terminal, or unavailable
    end
    B-->>A: Output reference after confirmed completion
    A->>B: Fetch validated output without leaked credentials
    A->>A: Copy, inspect, hash and freeze provenance
    D->>L: Release only after ownership-safe completion evidence
```

Hosted submission details remain unavailable until retrieved. This diagram defines the adapter seam, not an invented vendor request schema.

**Execution state**

```mermaid
stateDiagram-v2
    [*] --> queued: durable admission
    queued --> canceled: cancel before submission intent
    queued --> submitting: lease and intent committed
    queued --> failed: definitive pre-dispatch refusal
    submitting --> running: backend identity persisted
    submitting --> reconciling: acceptance uncertain
    running --> finalizing: provider completion confirmed
    running --> failed: definitive execution failure
    running --> nsfw: explicit moderation result
    running --> canceled: cancellation confirmed
    running --> reconciling: observation lost
    reconciling --> running: execution recovered
    reconciling --> finalizing: completion recovered
    reconciling --> failed: failure proven
    reconciling --> nsfw: moderation proven
    reconciling --> canceled: cancellation proven
    finalizing --> succeeded: asset verified
    finalizing --> failed: terminal ingest failure recorded
```

An ingest failure preserves `backend_outcome:"completed"` and all financial exposure.

**Logical JSON persistence schema**

These are **new target record fields**, not claimed existing database columns. Nested record types are defined in `03-contracts.md`; no relational database is introduced.

```mermaid
erDiagram
    PRINCIPAL ||--o{ QUOTE : owns
    PRINCIPAL ||--o{ JOB : owns
    QUOTE ||--o| JOB : admits
    JOB ||--|| IDEMPOTENCY : deduplicates
    JOB ||--|| RESERVATION : holds
    JOB ||--o{ ASSET : produces
    JOB ||--o{ LEDGER_EVENT : accounts
    TRANSACTION ||--o{ LEDGER_EVENT : commits

    PRINCIPAL {
        string id PK
        string token_verifier
        string principal_type
        json scopes
        json allowed_routes
        json limits
        string policy_version
        boolean revoked
    }
    QUOTE {
        integer schema_version
        string id PK
        string owner_principal_id FK
        string created_at
        string expires_at
        string normalized_request_hash
        json request
        json route_snapshot
        json licence_decision
        json pricing
        string consumed_by_job_id
    }
    JOB {
        integer schema_version
        string id PK
        string owner_principal_id FK
        string quote_id FK
        json quote_snapshot
        string state
        string state_reason
        string created_at
        string updated_at
        json execution
        json cancellation
        json billing
        json asset_ids
        json error
    }
    IDEMPOTENCY {
        integer schema_version
        string owner_principal_id FK
        string key_digest
        string request_hash
        string job_id FK
        string admitted_at
        boolean tombstone
    }
    RESERVATION {
        integer schema_version
        string id PK
        string job_id FK
        string admitted_day
        string reserved_micros
        string outstanding_micros
        string status
    }
    LEDGER_EVENT {
        integer schema_version
        string id PK
        string transaction_id FK
        string job_id FK
        string kind
        string amount_micros
        string occurred_at
        json evidence
    }
    ASSET {
        integer schema_version
        string id PK
        string job_id FK
        string owner_principal_id FK
        string relative_path
        string sha256
        integer bytes
        string mime
        json media
        json provenance
        string expires_at
        boolean pinned
    }
    TRANSACTION {
        integer schema_version
        string id PK
        string state
        json mutations
        string payload_hash
        string created_at
    }
```

All records reject unknown schema versions and invalid required fields. Nullable fields use explicit `null`, never invented defaults.
