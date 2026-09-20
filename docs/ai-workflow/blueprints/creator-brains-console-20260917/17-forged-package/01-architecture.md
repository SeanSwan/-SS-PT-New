**Ownership**

The bridge owns HTTP validation, process lifecycle, bounded workers, launch metadata, and response projection. Engine functions own engine mutations. Web components own presentation and ephemeral state. The engine store remains authoritative.

Canonical mount evidence: `W/src/main.tsx:15–19` renders `<App/>`; `App.tsx#App` currently mounts StatusBoard. Future panels mount there. `C/server.mjs#createBridge` gates and dispatches to `C/routes.mjs#dispatch`; there is no Express or production-backend route in this product.

**User and subsystem flows**

```mermaid
flowchart TD
  Desktop["Desktop launcher"] --> Bind["Claim console instance; bind loopback"]
  Bind --> Browser["Open browser after listen"]
  Browser --> Shell["App: status, roster, query, run, operations"]
  Shell --> Read["Adapter read"]
  Read --> Gates["Host gate; URL validation"]
  Gates --> Engine["Engine read functions"]
  Engine --> Truth{"Readable?"}
  Truth -->|Yes| Panels["Render measured data and provenance"]
  Truth -->|Partial| Partial["Keep independent instruments; name damage"]
  Truth -->|No| Refuse["Named refusal; Retry"]
  Shell --> Form["Mutation form"]
  Form --> Validate{"Valid and permitted?"}
  Validate -->|No| Explain["Inline validation or blocked explanation"]
  Validate -->|Cancel before submit| Shell
  Validate -->|Yes| WriteGates["Host; Origin; JSON; custom header"]
  WriteGates --> Work["Console worker or engine setter"]
  Work -->|Confirmed result| Refresh["Re-read affected instruments"]
  Work -->|Response lost| Unknown["Outcome unknown; reconcile; no automatic retry"]
  Refuse --> Read
  Refresh --> Panels
  Panels --> Scene["Eligible idle enhancement"]
  Scene --> Drawer["Same drawer as roster"]
  Shell --> Stop["Close bridge"]
  Stop --> Preserve["Store retained; CLI remains available"]
```

**API interactions**

Every route has its own sequence below. Common refusal branches: Host →403; malformed input →400; unavailable route →404; store damage →409 where the route is not composite; engine pre-write refusal →422. Transport failure leaves mutation outcome uncertain.

```mermaid
sequenceDiagram
  participant U as StatusBoard
  participant B as Bridge
  participant E as Engine
  U->>B: GET /api/status
  B->>E: Compose independent instruments
  E-->>B: Values plus damage/provenance
  B-->>U: 200 StatusInstrument
```

```mermaid
sequenceDiagram
  participant U as CreatorRoster
  participant B as Bridge
  participant E as Engine
  U->>B: GET /api/creators
  B->>E: listCreatorsSafe + readState
  E-->>B: Catalog and counts or damage
  B-->>U: 200 CreatorRow[] or 409
```

```mermaid
sequenceDiagram
  participant U as AddCreatorForm
  participant B as Bridge
  participant W as ResolverWorker
  participant E as Engine
  U->>B: POST /api/creators {ref}
  B->>W: Validate ref; defaultResolveCreator(url)
  W-->>B: Resolved channel or refusal
  B->>E: addCreator with synchronous resolved-value hook
  Note over E: Re-read registry now; preserve existing consent
  E-->>B: Persisted creator
  B-->>U: 201 CreatorRow with measured or null counts
  U->>B: GET /api/creators
```

```mermaid
sequenceDiagram
  participant U as CreatorRoster
  participant B as Bridge
  participant E as Engine
  U->>B: PATCH /api/creators/:channelId {enabled}
  B->>E: setEnabled
  E-->>B: Persisted creator
  B-->>U: 200 CreatorRow
  Note over U: Failed refresh does not undo confirmed write
```

```mermaid
sequenceDiagram
  participant U as QueryConsole
  participant B as Bridge
  participant E as Engine
  U->>B: GET /api/query?q=...&creator=channelId
  B->>E: queryBrains
  E-->>B: Derived hits and skipped rows
  B-->>U: 200 QueryResult
```

```mermaid
sequenceDiagram
  participant U as BrainDrawer
  participant B as Bridge
  participant P as PublishedGeneration
  U->>B: GET /api/brains/:channelId
  B->>P: Validate and pin current.json once
  B->>P: Read index, topics, timeline, rules from pinned generation
  P-->>B: Derived content plus missing/malformed reports
  B-->>U: 200 BrainDoc or named refusal
```

```mermaid
sequenceDiagram
  participant U as RunConsole
  participant B as Bridge
  participant E as Engine
  U->>B: GET /api/run
  B->>E: Journal, lock, budget, throttle, run records
  E-->>B: Authoritative observations
  B-->>U: 200 RunState plus console launch metadata
```

```mermaid
sequenceDiagram
  participant U as StatusConsumer
  participant B as Bridge
  participant E as Engine
  U->>B: GET /api/backlog
  B->>E: backlogReport and formatBacklog
  E-->>B: Projection or state damage
  B-->>U: 200 lines or 409 STORE_DAMAGED
```

```mermaid
sequenceDiagram
  participant U as OpsRail
  participant B as Bridge
  participant W as HealthWorker
  U->>B: GET /api/canary
  alt TTL valid
    B-->>U: Cached reading with age and source
  else TTL expired
    B->>W: One selfCheck refresh
    W-->>B: Probe result
    B-->>U: Resolved probe/history reading with provenance
  end
```

```mermaid
sequenceDiagram
  participant U as RunConsole
  participant B as Bridge
  participant C as DailyChild
  participant E as EngineStore
  U->>B: POST /api/run/daily {perHour}
  B->>B: Validate; claim operation slot; check lock
  B->>C: Spawn fixed run-daily.mjs path
  B-->>U: 202 {requestId,runId:null}
  C->>E: Engine journal, lock and run
  U->>B: GET /api/run
  B->>E: Read journal and matching run record
  B-->>U: Launch correlation and engine verdict
```

```mermaid
sequenceDiagram
  participant U as OpsRail
  participant B as Bridge
  participant W as RepairWorker
  U->>B: POST /api/repair {}
  B->>B: Shared operation-slot and lock checks
  B->>W: runDaily only reconcile/build/export
  W-->>B: Engine run record
  B-->>U: 200 RepairResult or named refusal
```

```mermaid
sequenceDiagram
  participant U as OpsRail
  participant B as Bridge
  U->>U: Backup remains disabled; explain privacy gate
  Note over U,B: No backup request is sent
  U->>B: Direct POST /api/backup before authorized slice
  B-->>U: 404 NOT_FOUND
```

**State machines**

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Ready: validated read
  Loading --> Refused: damage or invalid payload
  Ready --> Stale: timeout or transport failure
  Stale --> Ready: validated newer read
  Stale --> Refused: confirmed damage
  Refused --> Loading: Retry
  Ready --> Fault: render exception
  Fault --> Loading: explicit Reload
```

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Starting: accepted launch
  Starting --> Running: child-correlated journal
  Starting --> Unknown: exit without correlated evidence
  Running --> Completed: matching terminal successful record
  Running --> Failed: matching terminal failed record
  Running --> Interrupted: child gone and no terminal result
  Running --> Unknown: journal replaced or unreadable
  Unknown --> Running: correlation re-established
  Unknown --> Completed: matching terminal record found
  Unknown --> Failed: matching terminal record found
  Completed --> Idle: next explicit action
  Failed --> Idle: explicit retry after reconciliation
```

**Data model**

SQL ERD: **N/A — no relational schema or migration**. This diagram documents exact **transport fields**, not invented database columns:

```mermaid
erDiagram
  CreatorRow {
    string channelId PK
    string title
    boolean enabled
    number_or_null videos
    number_or_null fetched
  }
  BrainDoc {
    string slug PK
    string generation
    string title
    string index
    string topics
    string timeline
  }
  QueryHit {
    string claimId PK
    string creatorId FK
    string creatorTitle
    string videoId
    number tStartMs
    string keyPhrase
    string watchUrl
  }
  CreatorRow ||--o| BrainDoc : "channelId equals slug"
  BrainDoc ||--o{ QueryHit : "claims from pinned generation"
```

**Concurrency and recovery**

- Resolve creator references in a worker; never perform registry writes there.
- Maximum one add-resolution job; second request receives `409 OPERATION_BUSY`.
- Daily and repair share one console operation slot. Engine lock remains required.
- External CLI/scheduler concurrency is a real boundary. A preflight check is not an atomic lock.
- S4 is blocked until the journal/lock race test passes or the engine owner supplies a reviewed correction.
- Browser disconnect does not cancel committed work. No automatic mutation retry.
- Stop/restart does not restore data. Application rollback preserves the store.
