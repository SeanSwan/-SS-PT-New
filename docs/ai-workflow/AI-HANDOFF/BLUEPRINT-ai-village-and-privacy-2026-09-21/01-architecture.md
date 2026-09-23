**A1 — Ownership**

The new paths below are **proposed implementation targets**, not claims that files exist.

| Proposed path | Responsibility |
|---|---|
| `scripts/village/run.mjs` | CLI parsing, explicit operator actions, exit codes. |
| `scripts/village/manifest.mjs` | Strict artifact schema, provenance classification, size limits. |
| `scripts/village/policy.mjs` | Billing-profile and prohibited-seat decisions. |
| `scripts/village/providers.mjs` | Resolve selected routes through verified adapter capabilities. |
| `scripts/village/remits.mjs` | Full-spectrum reviewer and role-specific adjudicator instructions. |
| `scripts/village/coverage.mjs` | Validate area coverage and artifact references. |
| `scripts/village/findings.mjs` | Stable finding IDs, duplicate resolution, final verdict derivation. |
| `scripts/village/budget.mjs` | Complete-stage reservation and settlement. |
| `scripts/village/freeze.mjs` | Final stage serialization, digests, approval binding. |
| `scripts/village/dispatch.mjs` | Last-send content check and approved adapter invocation. |
| `scripts/village/journal.mjs` | Durable stage, attempt, receipt, and terminal-state recording. |
| `scripts/village/rounds.mjs` | Structured continuation and termination decisions. |
| `scripts/village/engine.mjs` | State transitions and complete-stage execution. |
| `scripts/village/adapters/subscription.mjs` | Verified subscription transport integration. |
| `scripts/village/adapters/openrouter.mjs` | Explicit special-review integration through the existing egress gate. |

Each implementation file stays within 300 lines. Split by the responsibilities above; do not create duplicate engines to satisfy the limit.

Existing integration targets:

- `scripts/lib/redact-egress.mjs`: retain the final HTTP-body gate.
- `scripts/mcp/swan-council-server.mjs`: retain the MCP entry surface.
- `scripts/mcp/swan-council-lib.mjs`: replace model-specific authority/lens instructions with role-based remits.
- `scripts/mcp/swan-council-subscription.mjs`: use only after its real transport and context behavior are inspected.
- `scripts/consult-openrouter-panel.mjs`: retain as a guarded entry point, with orchestration delegated to the new engine.
- Synthesis entry points remain synthesis workflows; they must not become a third review mode.

Existing exported signatures are **UNKNOWN**. No guessed import is authorized.

**A2 — Entry and user flow**

```mermaid
flowchart TD
    A[CLI or existing Council entry] --> B[Validate manifest and selected roster]
    B -->|Invalid or unknown provenance| X[BLOCKED: zero sends]
    B --> C[Verify route evidence and billing profile]
    C -->|Missing or expired evidence| X
    C --> D[Build exact outbound stage]
    D --> E[Apply local privacy controls]
    E -->|Unresolved sensitive content or unsupported attachment| X
    E --> F[Check limits and reserve final adjudication]
    F -->|Insufficient budget| X
    F --> G[Freeze stage and display preflight]
    G --> H{Operator authorizes this stage?}
    H -->|Cancel or defer| W[WAITING_APPROVAL: zero sends]
    H -->|Yes| I[Record reservation and attempts]
    I --> J[Dispatch seats serially]
    J -->|Failure or ambiguous execution| Y[BLOCKED: retain evidence and charges]
    J --> K[Validate complete review stage]
    K -->|Invalid or incomplete| Y
    K --> L{Next action}
    L -->|Another review round| D
    L -->|Fresh adjudication| D
    L -->|Adjudication complete| M[Derive verdict and write report]
    M --> N[Required archive filing by host workflow]
```

**A3 — Privacy and trust flow**

Provider output is untrusted material. It does not become an instruction, an approval, or an automatically sendable artifact.

```mermaid
flowchart LR
    S[Explicit source excerpts and authored synthetic fixtures] --> M[Strict manifest]
    P[Production exports or unknown provenance] --> R[Reject]
    M --> L[Local inspection and minimization]
    L --> D[Existing shape redaction and bounded checks]
    D --> F[Frozen outbound content]
    F --> G[Stage-specific authorization]
    G --> T[Verified adapter boundary]
    T --> E[External provider]
    E --> V[Local output schema and evidence validation]
    V --> Q[Untrusted review artifact]
    Q --> L
```

The last arrow is deliberate: peer reviews and adjudication inputs pass through admission, inspection, freezing, and authorization again.

**A4 — HTTP adapter interaction**

```mermaid
sequenceDiagram
    participant O as Operator
    participant E as Village engine
    participant J as Local journal
    participant D as Dispatcher
    participant G as fetchForEgress
    participant P as Approved provider endpoint

    E->>O: Exact stage digest, roster, limits, spend ceiling
    O->>E: Authorize frozen stage
    E->>J: Persist reservation and STARTED attempt
    E->>D: Approved request and route
    D->>G: Approved serialized body
    G->>D: Final transformed body at send callback
    D->>D: Verify final body digest and approved destination
    alt Exact match and valid authorization
        D->>P: Send once, redirects disabled
        P-->>D: Response or transport failure
        D-->>E: Response and transport receipt
        E->>J: Persist COMPLETE, FAILED, or AMBIGUOUS
    else Any mismatch
        D-->>E: Refuse before socket
        E->>J: Persist blocked attempt
    end
```

The authorization credential is supplied only by the trusted adapter to the approved endpoint. It is not part of review content or a public receipt.

**A5 — Subscription adapter interaction**

```mermaid
sequenceDiagram
    participant O as Operator
    participant E as Village engine
    participant J as Local journal
    participant A as Subscription adapter
    participant C as Verified CLI transport

    E->>A: Request route and isolation evidence
    A-->>E: Verified capability or BLOCKED
    E->>O: Exact application text digest and preflight
    O->>E: Authorize frozen stage
    E->>J: Persist reservation and STARTED attempt
    E->>A: Frozen application text
    A->>A: Verify digest, fixed arguments, isolated context
    A->>C: One bounded invocation
    C-->>A: Result and identity/usage receipt
    A-->>E: Structured result or hard failure
    E->>J: Persist result; retain full charge if execution unknown
```

A subscription text digest is **not represented as a complete network-wire digest**. The adapter must separately demonstrate that it attaches no unapproved repository files, instructions, tool results, or session history.

**A6 — Run state machine**

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> PREFLIGHT
    PREFLIGHT --> BLOCKED: invalid input or missing proof
    PREFLIGHT --> WAITING_APPROVAL: stage frozen
    WAITING_APPROVAL --> CANCELLED: explicit cancel
    WAITING_APPROVAL --> PREFLIGHT: content or policy changed
    WAITING_APPROVAL --> RESERVED: valid authorization
    RESERVED --> DISPATCHING: durable attempt record
    DISPATCHING --> BLOCKED: failed or ambiguous call
    DISPATCHING --> VALIDATING: all selected seats returned
    VALIDATING --> BLOCKED: incomplete or invalid output
    VALIDATING --> PREFLIGHT: another review stage
    VALIDATING --> ADJUDICATION_PENDING: terminal review condition
    ADJUDICATION_PENDING --> PREFLIGHT: freeze adjudication stage
    VALIDATING --> REPORT_READY: valid adjudication
    REPORT_READY --> ARCHIVE_PENDING
    ARCHIVE_PENDING --> COMPLETE: archive receipt recorded
    BLOCKED --> [*]
    CANCELLED --> [*]
    COMPLETE --> [*]
```

`BLOCKED` is terminal for dispatch within that run. A corrected attempt requires a new run linked to the earlier evidence.

**A7 — Data model**

No database migration is proposed.

**ERD: N/A — scope-bounded consult, no repository database surface in scope.** Exact existing columns and types were not supplied, so no database schema is invented.

The file-backed contracts and ownership are specified in `03-contracts-a.md` (C1–C5) and `03-contracts-b.md` (C6–C10).
