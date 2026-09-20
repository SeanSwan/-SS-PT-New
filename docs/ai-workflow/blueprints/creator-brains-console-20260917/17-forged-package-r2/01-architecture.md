**Mounted surface and ownership**

[VERIFIED] `W/src/main.tsx:15` mounts `<App/>`; `App.tsx:85` creates the adapter/poller and `:103` mounts StatusBoard. Other product panels are planned.

[VERIFIED] `C/server.mjs:94` constructs the Node HTTP server; gates precede `dispatch` at `:130`. `C/routes.mjs:84` begins the ordered read routes, `:99` the writes, and `:113` the unknown-route refusal. No Express/production-backend mount belongs to this surface.

The bridge owns validation, worker lifecycle and safe response projection. Engine setters own registry writes. Engine runners own acquisition/repair and their private internal processing. Console presentation reads only validated derived files and metadata.

```mermaid
flowchart TD
  Launch["Desktop launcher"] --> Bind["Claim instance; bind 127.0.0.1:0"]
  Bind --> Open["Open browser after listen"]
  Open --> App["App / adapter / polling coordinator"]
  App --> Status["StatusBoard"]
  App --> Roster["Roster and Add form"]
  App --> Query["QueryConsole"]
  App --> Run["RunConsole"]
  App --> Ops["Canary / Repair / blocked Backup"]
  App --> Scene["Eligible constellation enhancement"]
  Roster --> Drawer["BrainDrawer"]
  Scene --> Drawer
  App --> Gate["Host and request validation"]
  Gate --> Reads["Metadata composition / contained derived reader"]
  Gate --> Writes["Origin / custom header / JSON gate"]
  Writes --> Resolve["Resolve in worker; commit with engine setter"]
  Writes --> Runner["Engine-owned daily or repair process"]
  Reads --> Store["Authoritative engine store"]
  Runner --> Store
  Store --> Result{"Valid observation?"}
  Result -->|Yes| Ready["Render values and provenance"]
  Result -->|Partial| Partial["Retain independent facts; show skipped/damage"]
  Result -->|No| Refusal["Named failure; explicit Retry"]
  Refusal --> Gate
  Writes -->|Response lost| Unknown["Outcome unknown; reconcile before retry"]
  Ops -->|Backup| Blocked["Explain policy gate; send no request"]
  App -->|Cancel before submit| Idle["No request"]
  App -->|Close after submit| Continuing["Operation continues"]
  Launch -->|Stop / app rollback| Retain["Preserve store; CLI remains available"]
```

**API sequences**

Common to every sequence: rejected Host never reaches dispatch. Invalid requests receive named errors. Transport loss after mutation dispatch is uncertain.

```mermaid
sequenceDiagram
  participant U as StatusBoard
  participant B as Bridge
  participant H as Health worker
  participant E as Engine metadata
  U->>B: GET /api/status
  B->>H: Request refresh if due; do not wait
  B->>E: Read independent instruments
  E-->>B: Values and damage reports
  B-->>U: 200 StatusInstrument with provenance
```

```mermaid
sequenceDiagram
  participant U as Roster
  participant B as Bridge
  participant E as Engine
  U->>B: GET /api/creators
  B->>E: listCreatorsSafe and readState
  E-->>B: Registry and counts
  B-->>U: 200 CreatorRow[] or 409 STORE_DAMAGED
```

```mermaid
sequenceDiagram
  participant U as Add form
  participant B as Bridge
  participant W as Resolver worker
  participant E as Engine
  U->>B: POST /api/creators {ref}
  B->>B: Validate; claim add slot
  B->>W: Resolve validated reference
  W-->>B: Validated channel identity
  B->>E: addCreator with synchronous resolved-value hook
  Note over E: Fresh registry read occurs after resolution
  E-->>B: Persisted creator
  B-->>U: 201 CreatorRow; release slot
```

```mermaid
sequenceDiagram
  participant U as Roster
  participant B as Bridge
  participant E as Engine
  U->>B: PATCH /api/creators/:channelId {enabled}
  B->>E: setEnabled
  E-->>B: Persisted creator
  B-->>U: 200 CreatorRow with measured or null counts
  U->>B: Refresh authoritative roster
```

```mermaid
sequenceDiagram
  participant U as Drawer
  participant B as Bridge
  participant R as Contained reader
  U->>B: GET /api/brains/:channelId
  B->>R: Validate namespace; pin pointer once
  R->>R: Validate paths; read four files from pinned generation
  R-->>B: Documents, validated claims, skipped reports
  B-->>U: 200 BrainDoc or named refusal
```

```mermaid
sequenceDiagram
  participant U as QueryConsole
  participant B as Bridge
  participant R as Contained reader
  U->>B: GET /api/query?q=...&creator=...
  B->>R: Enumerate and pin eligible published generations
  R-->>B: Validated derived claims and skipped reports
  B->>B: Bounded engine-equivalent term scoring
  B-->>U: 200 QueryResult
```

```mermaid
sequenceDiagram
  participant U as Polling coordinator
  participant B as Bridge
  participant E as Engine store
  U->>B: GET /api/run
  B->>E: Read journal, lock, budget, throttle and records
  E-->>B: Authoritative observations
  B->>B: Correlate with ephemeral launch metadata
  B-->>U: 200 RunState
```

```mermaid
sequenceDiagram
  participant U as Backlog consumer
  participant B as Bridge
  participant E as Engine
  U->>B: GET /api/backlog
  B->>E: backlogReport and formatting
  E-->>B: Lines or state damage
  B-->>U: 200 lines or 409 STORE_DAMAGED
```

```mermaid
sequenceDiagram
  participant U as OpsRail
  participant B as Bridge
  participant H as Health worker
  U->>B: GET /api/canary
  B->>H: Start refresh if TTL expired
  B-->>U: 200 current reading; pending/history labelled
  H-->>B: Epoch-tagged result or failure
  U->>B: Subsequent scheduled read
  B-->>U: Updated reading
```

```mermaid
sequenceDiagram
  participant U as RunConsole
  participant B as Bridge
  participant C as Daily child
  participant E as Engine store
  U->>B: POST /api/run/daily {perHour}
  B->>B: Validate; claim operation slot; check lock
  B->>C: Spawn fixed engine entry and arguments
  B-->>U: 202 requestId and null runId
  C->>E: Engine journal and terminal record
  U->>B: GET /api/run
  B->>E: Read matching evidence
  B-->>U: Correlated phase or unknown
```

```mermaid
sequenceDiagram
  participant U as OpsRail
  participant B as Bridge
  participant W as Repair worker
  U->>B: POST /api/repair {}
  B->>B: Claim shared operation slot; check lock
  B->>W: runDaily only reconcile/build/export
  Note over W: Engine internal processing remains engine-owned
  W-->>B: Run record
  B-->>U: 200 RepairResult including ok and runId
```

Backup has no API interaction: its disabled control explains the gate. An otherwise policy-valid direct `POST /api/backup` receives 404.

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Ready: validated reading
  Loading --> Refused: named failure
  Ready --> Partial: independent instrument damaged
  Ready --> Stale: read timeout
  Partial --> Ready: validated refresh
  Stale --> Ready: validated refresh
  Refused --> Loading: explicit Retry
  Ready --> Fault: render exception
  Fault --> Loading: explicit Reload
```

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Starting: accepted launch
  Starting --> Running: matching journal
  Starting --> Completed: matching terminal success
  Starting --> Failed: matching terminal failure
  Starting --> Unknown: uncorrelated exit
  Running --> Completed: matching successful record
  Running --> Failed: matching failed record
  Running --> Interrupted: child gone without terminal result
  Running --> Unknown: evidence lost or replaced
  Unknown --> Completed: matching record recovered
  Unknown --> Failed: matching record recovered
  Completed --> Idle: next explicit action
  Failed --> Idle: reconciled explicit retry
```

No relational schema is touched. This ER diagram describes **transport fields**, not database columns; complete field definitions are in `03-contracts.md`.

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
    string_or_null generation
    string title
    string index
    string topics
    string timeline
  }
  QueryHit {
    string claimId
    string creatorId FK
    string creatorTitle
    string videoId
    number tStartMs
    string keyPhrase
    string statement
    string topic
    string watchUrl
  }
  LaunchReceipt {
    string requestId PK
    string_or_null runId
  }
  CreatorRow ||--o| BrainDoc : "channelId equals slug"
  BrainDoc ||--o{ QueryHit : claims
```
