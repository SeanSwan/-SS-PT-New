**Decision:** Preserve the deployed architectural seams. Add console-owned coordination and projections; do not move business writes into the UI.

| Boundary | Owner |
|---|---|
| Host validation, URL parsing, envelope | `server.mjs`; Host before dispatch, parser inside guarded handler |
| Exact endpoint allowlist | `routes.mjs`, with structure tests observing every dispatch site |
| Engine composition | `api.mjs` and bounded console `lib/` modules |
| Registry-write exclusion | Console registry gate; covers add and PATCH |
| Blocking add | Worker invoking the existing engine function |
| Engine durable mutations | Existing engine functions only |
| Published display reads | One contained console reader serving both query and drawer |
| Web transport/validation | Local adapter; no component-side fetch |
| Polling | One coordinator with generation guards and cancellation of obsolete reads |
| View selection | Console shell; one selected channel, drawer origin/focus target, query context |
| S5 | Existing constellation module; receives validated data and selection callbacks |
| Atlas | Optional extension adapter plus lazy 2D evidence view |
| Verification | Development ledger and injected read-only software-verification summary |

**Source-entry obligations:** bind the actual `App.tsx` JSX mount, adapter implementations, worker pattern, contained reader, and engine signatures before changing them. [UNKNOWN] Their complete source definitions are not in the packet.

**System and privacy flow**

```mermaid
flowchart LR
  O[Operator] --> UI[Standalone React console]
  UI --> A[ConsoleDataAdapter]
  A --> H[Loopback bridge security gates]
  H --> R[Exact route table]
  R --> D[Contained derived-data reader]
  D --> C[Registry metadata and published derived files]
  R --> G[Registry mutation gate]
  G --> W[Console-owned add worker]
  G --> P[Engine setEnabled]
  W --> E[Engine addCreator]
  R --> X[Shared run-operation service]
  X --> EN[Existing engine pipeline]
  EN --> B[Private transcript store]
  EN --> C
  B -. No display-plane path .-> STOP[Forbidden]
  A --> EXT[Optional evidence-map projection]
  EXT --> LIST[Accessible evidence list]
  EXT --> MAP[Lazy evidence map]
  V[Development Review Ledger] --> S[Software verification summary]
  S --> UI
```

**Screen/navigation flow**

```mermaid
flowchart TD
  HOME[Status and operations deck] --> ROSTER[Creators]
  ROSTER --> ADD[Add creator]
  ADD -->|Confirmed success| ROSTER
  ADD -->|Unknown outcome| RECON[Refresh roster and reconcile]
  ROSTER --> DRAWER[Brain drawer]
  HOME --> WIRE[Wire query]
  WIRE --> DRAWER
  DRAWER --> LIST[Evidence list]
  LIST -->|Explicit opt-in| MAP[Evidence map]
  MAP -->|Unavailable| LIST
  HOME --> RUN[Daily pass]
  HOME --> OPS[Canary and repair]
  OPS --> BLOCK[Backup blocked pending D4]
  HOME --> VERIFY[Software verification]
  DRAWER -->|Close or Escape| RETURN[Restore originating focus and scroll]
```

**Read API interactions**

Each named message is a separate interaction with the same validated transport boundary.

```mermaid
sequenceDiagram
  participant UI as Screen or polling coordinator
  participant A as Local adapter
  participant BR as Bridge
  participant RD as Approved reader
  UI->>A: getStatus()
  A->>BR: GET /api/status
  BR->>RD: Compose instruments
  RD-->>BR: Values plus damage/provenance fields
  BR-->>A: 200 StatusInstrument
  A-->>UI: Validated reading or PAYLOAD_INVALID
  UI->>A: listCreators()
  A->>BR: GET /api/creators
  BR-->>A: 200 rows or 409 STORE_DAMAGED
  A-->>UI: Validated rows or named refusal
  UI->>A: getRunState(requestId?)
  A->>BR: GET /api/run with optional requestId
  BR-->>A: RunState and supported correlation projection
  A-->>UI: Validated run evidence
  UI->>A: canary()
  A->>BR: GET /api/canary
  BR-->>A: Cached CanaryReading
  A-->>UI: Verdict with source and age
  Note over UI,BR: Diagnostic GET /api/backlog remains compatible
  UI->>BR: GET /api/backlog
  BR-->>UI: lines or named damage refusal
```

**Add and enable interactions**

```mermaid
sequenceDiagram
  participant UI as Roster
  participant BR as Bridge
  participant G as Registry gate
  participant W as Add worker
  participant EN as Engine
  UI->>BR: POST /api/creators {ref}
  BR->>BR: Validate Host, origin, header, JSON, body
  BR->>G: Try acquire
  alt Busy
    G-->>BR: Refuse before dispatch
    BR-->>UI: 409 WRITE_BUSY, outcome not_started
  else Acquired
    BR->>W: Invoke addCreator through fixed worker entry
    W->>EN: Existing engine add
    UI->>BR: GET /api/status while add blocks
    BR-->>UI: Status response before add finishes
    EN-->>W: Engine result
    W-->>BR: Allowlisted result or typed failure
    BR->>G: Release after worker settles
    BR-->>UI: 201 CreatorRow or classified error
  end
  UI->>BR: PATCH /api/creators/channelId {enabled}
  BR->>G: Same non-queued gate
  BR->>EN: setEnabled
  EN-->>BR: Authoritative mutation result
  BR-->>UI: 200 row; counts may be null
  Note over BR,W: Disconnect does not cancel the write or free the gate
```

**Brain and query interactions**

```mermaid
sequenceDiagram
  participant UI as Drawer or Wire
  participant A as Adapter
  participant BR as Bridge
  participant C as Contained publication reader
  UI->>A: getBrain(channelId)
  A->>BR: GET /api/brains/:slug
  BR->>C: Resolve namespace and pin publication once
  C-->>BR: Derived documents, claims, skipped, content digest
  BR-->>A: BrainDoc projection
  A-->>UI: Validated publication or named failure
  UI->>A: query(q, creator?)
  A->>BR: GET /api/query?q=...&creator=...
  BR->>C: Read each selected publication through same boundary
  C-->>BR: Contained derived claim records and skipped sources
  BR-->>A: QueryResult
  A-->>UI: Hits plus completeness warning
```

**Daily/repair interaction**

```mermaid
sequenceDiagram
  participant UI as Run or Ops panel
  participant BR as Bridge
  participant G as Shared run gate
  participant EN as Engine invocation
  UI->>BR: POST /api/run/daily {perHour}
  BR->>G: Validate and acquire supported exclusion
  alt Refused before dispatch
    BR-->>UI: 400 or 409, outcome not_started
  else Accepted
    BR->>EN: Start using verified lock-reuse seam
    BR-->>UI: 202 requestId, runId null
    UI->>BR: GET /api/run?requestId=...
    BR-->>UI: Correlated operation and journal evidence
    EN-->>BR: Correlated terminal evidence
    UI->>BR: GET /api/run?requestId=...
    BR-->>UI: Confirmed terminal verdict or unknown
  end
  UI->>BR: POST /api/repair {}
  BR->>G: Same exclusion path
  BR->>EN: Existing repair configuration
  EN-->>BR: Evidence supporting projected counts
  BR-->>UI: 200 repaired, built, emptied or classified failure
```

**Daily-pass control flow, including recovery and rollback**

```mermaid
flowchart TD
  A[Run daily pass] --> V{Positive safe integer?}
  V -- No --> BAD[Inline validation; no request]
  V -- Yes --> C{Operator confirms dispatch?}
  C -- Cancel --> IDLE[Remain idle]
  C -- Run --> G{Entry safety gates satisfied?}
  G -- No --> BLOCK[Explain blocker; no dispatch]
  G -- Yes --> POST[POST daily]
  POST --> REF[Confirmed refusal]
  REF --> FIX[Correct input or wait for holder]
  FIX --> A
  POST --> ACCEPT[202 accepted; not completed]
  ACCEPT --> POLL[Poll correlated run evidence]
  POLL --> ACTIVE[Running or throttled]
  ACTIVE --> POLL
  POLL --> OK[Confirmed completed]
  POLL --> FAIL[Confirmed failed]
  POLL --> UNKNOWN[Connection or correlation lost]
  UNKNOWN --> REC[Refresh evidence; never auto-replay]
  REC --> POLL
  FAIL --> RETRY[Review reason; explicit new request only]
  RETRY --> A
  FAIL --> APP[Application rollback requested]
  APP --> SETTLE[Stop new dispatch; identify active engine work]
  SETTLE --> REVERT[Revert console deployment only]
  REVERT --> CLI[Engine data retained; CLI remains available]
```

**Verification state machine**

```mermaid
stateDiagram-v2
  [*] --> Candidate
  Candidate --> EvidenceReady: applicable tests pass for exact candidate
  EvidenceReady --> ReviewPending: review requested
  ReviewPending --> ChangesRequired: blocking findings
  ChangesRequired --> Candidate: changed source creates new candidate
  ReviewPending --> Verified: review accepted and anchor valid
  Verified --> Stale: source or required evidence changes
  Verified --> Revoked: new blocking finding
  Stale --> Candidate: new candidate registered
  Revoked --> Candidate: repaired candidate registered
  Candidate --> Inconclusive: missing source or evidence
  EvidenceReady --> Inconclusive: contradictory evidence
  Inconclusive --> Candidate: bounded gaps resolved
```

**Atlas lazy-load sequence**

```mermaid
sequenceDiagram
  participant O as Operator
  participant L as Always-mounted evidence list
  participant A as Extension adapter
  participant D as ConsoleDataAdapter
  participant M as Lazy map module
  O->>L: Open brain
  L->>D: getBrain(channelId)
  D-->>L: Validated BrainDoc
  L-->>O: List, freshness, publication reference
  O->>L: Select Evidence map
  L->>A: getEvidenceMap(channelId, brain)
  A-->>L: Topic and source-video groups
  L->>M: Import map module
  alt Module and data valid
    M-->>O: Non-geographic evidence view
  else Module or renderer fails
    L-->>O: Map unavailable. Evidence list remains available.
  end
  Note over L,M: Reduced motion never requires the three.js chunk
```

**Persisted model ERD**

No engine schema is created or migrated. These are exact fields of the **new console development ledger**, a JSONL file rather than SQL tables.

```mermaid
erDiagram
  VERIFICATION_EVENT {
    int schemaVersion
    int sequence
    string eventId
    string occurredAt
    string kind
    string candidateDigest
    string requirementIdsJson
    string evidenceRefsJson
    string reviewRefJson
    string decision
    string blockingFindingIdsJson
    string supersedesEventId
    string prevHash
    string eventHash
  }
  VERIFICATION_ANCHOR {
    int schemaVersion
    string ledgerId
    int sequence
    string eventHash
    string candidateDigest
    string createdAt
  }
  VERIFICATION_EVENT ||--o| VERIFICATION_ANCHOR : "head independently anchored"
```

`requirementIdsJson`, `evidenceRefsJson`, and `blockingFindingIdsJson` are canonical JSON strings; `reviewRefJson` and `supersedesEventId` are nullable. Field names/types match `03-contracts.md`.

**N/A:** persisted UI preferences, SQL tables, Sequelize models, and foreign keys—none is introduced. Diagram rendering is not certified by this document; the package gate must parse the literal Mermaid sources.
