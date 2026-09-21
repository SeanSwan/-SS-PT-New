**Responsibilities**

| Component | Responsibility | Boundary |
|---|---|---|
| `scripts/hooks/lane-session-start.mjs` | Resolve its checkout root and invoke orientation. | No retention, claims, releases, or filesystem discovery implementation. |
| `scripts/lib/lane-orientation.mjs` — NEW/UNVERIFIED | Execute and classify the existing digest; render recovery commands. | Does not parse lane records or infer ownership. |
| `scripts/lane-at-root.mjs` — NEW/UNVERIFIED | Forward supported commands to that checkout’s `lane.mjs` with pinned cwd. | Does not implement ledger truth. |
| Existing `scripts/lane.mjs` | Remain the authoritative ledger implementation. | Add complete discovery only after its implementation closure is supplied. |
| Harness adapter | Invoke the hook or teach the verified manual procedure. | Configuration presence does not prove execution. |
| Instruction documents | Explain discovery, claiming, and limitations. | No hardcoded seat-file lists. |

[VERIFIED] Absolute helper resolution and `cwd: ROOT` are the existing working pattern in `lane-session-start.mjs:36-54`.

**Startup flow**

```mermaid
flowchart TD
    A[Session begins] --> B{Hook execution verified for this harness?}
    B -->|Yes| C[Run orientation hook]
    B -->|No| D[Run documented manual orientation]
    C --> E[Resolve root from entry point location]
    D --> E
    E --> F[Run lane digest with cwd pinned to root]
    F --> G{Expected summary markers and no failure marker?}
    G -->|Yes| H[Report summary]
    G -->|No, error, or timeout| I[Report degraded orientation]
    H --> J[Print root-pinned recovery commands and absolute review queue]
    I --> J
    J --> K[Read review queue]
    K --> L[Complete discovery required before editing]
```

**Discovery and edit-decision flow**

```mermaid
flowchart TD
    A[Known target files] --> B[Request complete discovery]
    B --> C[Resolve self and enumerate lane files]
    C --> D[Read every enumerated entry through authoritative parser]
    D --> E{Complete response and unambiguous identity?}
    E -->|No| F[Defer editing and report missing evidence]
    E -->|Yes| G{Peer claim overlaps target?}
    G -->|Yes or uncertain| H[Choose other work or request coordination]
    G -->|No| I[Claim exact target files in own lane]
    I --> J[Request complete discovery again]
    J --> K{Own claim correct and no peer overlap?}
    K -->|No| H
    K -->|Yes| L[Proceed under cooperative protocol]
    H --> M{Resolved explicitly?}
    M -->|Yes| B
    M -->|No| F
    L --> N[Finish slice and release own claim]
```

The second check reduces races; it does not create mutual exclusion.

**Process interaction**

```mermaid
sequenceDiagram
    participant H as Harness
    participant O as Orientation hook
    participant L as lane.mjs
    participant G as Git and ledger reads
    H->>O: Session event or manual invocation
    O->>L: process.execPath, digest, cwd=entry root
    L->>G: Existing discovery operations
    G-->>L: Existing data or failure
    L-->>O: stdout, exit status, or timeout
    O-->>H: summary or degraded, recovery commands, review queue
    Note over O,H: Hook exit zero is not edit clearance
```

**Complete-discovery interaction — NEW/UNVERIFIED**

```mermaid
sequenceDiagram
    participant S as Seat
    participant W as Root-pinned entry
    participant L as lane.mjs
    participant I as Existing identity resolver
    participant F as Ledger filesystem
    S->>W: orientation --json
    W->>L: Forward argv with cwd=entry root
    L->>I: Resolve own lane
    I-->>L: Exact lane path or identity error
    L->>F: Enumerate lane entries
    loop Every enumerated entry
        L->>F: Read lane
        F-->>L: Content or explicit read error
    end
    L-->>W: Complete or incomplete discovery JSON
    W-->>S: Unmodified stdout and exit status
```

**Orientation state**

```mermaid
stateDiagram-v2
    [*] --> Unoriented
    Unoriented --> Summary: digest validated
    Unoriented --> Degraded: missing, invalid, failed, or timed out
    Summary --> Checking: complete discovery requested
    Degraded --> Checking: explicit recovery
    Checking --> Deferred: incomplete or conflicting
    Checking --> Claimed: no observed conflict and own claim recorded
    Claimed --> Checking: mandatory recheck
    Checking --> CooperativeProceed: own claim verified and no observed conflict
    CooperativeProceed --> Unoriented: target set changes
    CooperativeProceed --> Released: slice finished
    Deferred --> Checking: conflict resolved
    Released --> [*]
```

**Diagram applicability**

- HTTP/API sequence diagrams: **N/A — no HTTP endpoints or remote APIs are introduced.** The applicable subprocess interactions are diagrammed above.
- `erDiagram`: **N/A — no relational database or tables are created or touched.** File-record fields are specified in `03-contracts.md`.
- GUI component tree: **N/A — headless command and instruction layer.**
- Trust boundary: lane contents are untrusted coordination data. Never execute their text or interpolate it into shell commands.

Mermaid source is supplied; rendered previews were not verified in this review.
