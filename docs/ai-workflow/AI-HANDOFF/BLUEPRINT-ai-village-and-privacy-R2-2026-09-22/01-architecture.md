**Status:** Proposed controlled-dispatch architecture. Existing implementation conformity is unverified.

**Ownership**

- Admission owns corpus eligibility and restricted-material policy.
- Egress preparation owns transformation, final serialization and preview.
- Approval owns authorization for exact finalized requests.
- Adapters own the last writable boundary and transport capability enforcement.
- The scheduler owns rounds, reservations and incomplete-run handling.
- Reports own evidence and coverage representation.
- The console reads published artifacts; it cannot change engine execution.

**Controlled dispatch flow**

```mermaid
flowchart TD
    A[Select source artifacts] --> B[Classify corpus and provenance]
    B -->|Forbidden or unresolved restricted class| X[Block with reason]
    B --> C[Resolve proven route and billing profile]
    C -->|Unverified route or capability| X
    C --> D[Construct complete outbound request]
    D --> E[Transform and scan all supported outbound fields]
    E -->|Unsupported content or failed control| X
    E --> F[Freeze bytes and request manifest]
    F --> G[Review exact content and authorize]
    G -->|Decline or cancel| Y[Stop without sending]
    G --> H[Acquire dispatch claim and reserve budget]
    H -->|Unavailable or exhausted| X
    H --> I[Validate approval and final writer bytes]
    I -->|Any mismatch| X
    I --> J[Dispatch once]
    J --> K[Record response or execution uncertainty]
    K --> L[Validate report and coverage]
    L --> M[Complete round only when every selected seat completes]
    M --> N[Freeze next debate or adjudication request]
    N --> G
```

**Subsystem and console boundary**

```mermaid
flowchart LR
    P[Corpus preparation] --> A[Admission]
    A --> E[Egress preparation]
    E --> G[Approval and dispatch gate]
    G --> T[Verified adapter]
    T --> J[Run evidence and reports]
    J --> S[Scheduler]
    S --> E
    J --> C[Optional read-only console]
    J --> H[Archive handoff]
    C -. no execution authority .-> C
```

**HTTP interaction**

```mermaid
sequenceDiagram
    participant O as Content approver
    participant D as Dispatcher
    participant A as HTTP adapter
    participant F as Final fetch boundary
    participant P as Provider

    D->>A: Complete request construction
    A->>A: Transform, serialize, scan, freeze
    A-->>O: Exact payload and destination preview
    O-->>D: Approval bound to request digest
    D->>D: Claim dispatch and reserve budget
    D->>A: Approved sealed request
    A->>F: Frozen body and allowlisted request metadata
    F->>F: Assert body digest and destination match
    alt Validation fails
        F-->>D: Block, zero network calls
    else Validation passes
        F->>P: Send once, redirects disabled
        P-->>F: Response or uncertain termination
        F-->>D: Outcome and execution evidence
    end
```

**Subscription CLI interaction**

```mermaid
sequenceDiagram
    participant O as Content approver
    participant D as Dispatcher
    participant S as runCodexSubscription
    participant W as Final stdin writer
    participant C as Codex child process

    D-->>O: Frozen prompt, route, capabilities and budget
    O-->>D: Digest-bound approval
    D->>D: Claim dispatch and reserve budget
    D->>S: Sealed envelope
    S->>S: Validate envelope and bounded child configuration
    alt Bare prompt or invalid approval
        S-->>D: Block before processRunner
    else Valid envelope
        S->>W: Verified command, args, environment and bytes
        W->>W: Assert exact UTF-8 input digest
        W->>C: Write approved bytes once
        C-->>S: Response or uncertain termination
        S-->>D: Outcome, requested identity, served identity unknown
    end
```

**Run state**

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Blocked: Admission or route failure
    Draft --> Frozen: Complete request constructed
    Frozen --> Approved: Exact content approved
    Frozen --> Cancelled: Approval declined
    Approved --> Reserved: Dispatch claim and budget reserved
    Approved --> Blocked: Approval revoked or configuration changed
    Reserved --> Dispatched: Final boundary assertions pass
    Reserved --> Cancelled: Proven no-send cancellation
    Reserved --> Blocked: Final boundary mismatch
    Dispatched --> Recorded: Response durably recorded
    Dispatched --> Uncertain: Timeout, crash or ambiguous delivery
    Recorded --> RoundComplete: All selected reports valid and durable
    Recorded --> Blocked: Missing or invalid report
    RoundComplete --> Frozen: Next permitted round or adjudication
    RoundComplete --> Completed: Adjudication recorded
    Uncertain --> Blocked: Reconciliation required
    Completed --> [*]
    Cancelled --> [*]
```

A later round may start only after the preceding round completes. Adjudication requires all planned review rounds to complete.

**Database diagram:** N/A — scope-bounded consult, no repository surface in scope. No database schema or relational migration is supplied; inventing exact columns or types would misrepresent the evidence.

**Per-screen flows:** N/A — scope-bounded consult, no repository surface in scope. Existing screens and their states were not supplied.

**Rendering:** Literal Mermaid sources are provided; rendered previews were not produced.
