# Completion architecture

## Ownership

| Responsibility | Existing owner |
|---|---|
| Selection/admission/publication | `useCoachSessionSelection` and its existing state/admission/commit leaves |
| Created-thread adoption lifetime | `useCoachCreatedThreadAdoption` |
| Independent adoption settlement | Existing controller/router composing layer; exact call sites required by C0 |
| Dirty draft | Existing plan-51 shell owner |
| Blocked navigation | `useCoachSelectionNavigationBlocker` |
| Memory mutation | Scoped route → correction/read/policy services → `CoachFact` |
| Consent merge | Shared preference updater participating in both controller writers |
| Rest deadline | Existing `useRestTimer` |
| Logger command lifetime | Existing Logger scope and dictation hooks |
| Mobile top reserve | Universal layout styles and Coach bridge height styles |
| Database lifecycle | Owned verification harness, not application startup |
| Domain writes | Existing reviewed proposal service; no new authority |

## User and subsystem flows

```mermaid
flowchart TD
  Entry["Existing mounted surfaces"] --> Coach["Coach Command Center"]
  Entry --> Settings["Settings"]
  Entry --> Logger["Workout Logger"]

  Coach --> Select["One selection adapter"]
  Select --> Admit["Authorized target read"]
  Admit --> Decision{"Protected draft?"}
  Decision -->|Yes| Human["Explicit owner decision"]
  Decision -->|No| Ticket["One-use commit"]
  Human -->|Approved destination| Ticket
  Human -->|Return| Original["Original selection or blocked-navigation reset"]
  Ticket --> Apply["Apply owned route, pin and thread changes"]
  Apply --> Observe["Independent committed observations"]
  Observe -->|Exact current match| Publish["Publish current snapshot"]
  Observe -->|Mismatch or deadline| Recover["Retry, Return or Leave"]
  Recover -->|Retry| Admit
  Recover -->|Leave| Retire["Retire local interest"]

  Publish --> Memory["Open admitted-target memory"]
  Settings --> SelfMemory["Open authenticated self memory"]
  Memory --> MemoryAPI["Authorized memory API"]
  SelfMemory --> MemoryAPI
  MemoryAPI --> Facts["Scoped facts and transactional correction"]

  Settings --> Consent["Self-only consent patch"]
  Consent --> Merge["Lock current Users row and merge intended fields"]

  Logger --> Scope["Capture committed Logger lifetime"]
  Scope --> Command["Existing command API"]
  Command --> Receiver["Strict local rest event receiver"]
  Receiver --> Timer["Adjust existing deadline"]
```

```mermaid
flowchart TD
  Inputs["Frozen source and runner contracts"] --> Identity["Verify owned PostgreSQL identity"]
  Identity --> Fresh["Zero-table UTF8 chain"]
  Identity --> Upgrade["Synthetic installed-history fixture"]
  Identity --> App["Application persistence suites"]
  Fresh --> Catalog["Assert exact columns, FKs and indexes"]
  Upgrade --> Catalog
  App --> Behavior["Assert atomicity, replay and concurrent merges"]
  Catalog --> Receipt["Separate bounded evidence receipts"]
  Behavior --> Receipt
  Receipt --> Stop["Stop owned cluster and verify shutdown"]
  Identity -->|Mismatch| Halt["HALT before migration or reset"]
```

## Selection states

`committing` includes waiting for independent settlement. `settling` is not a new enum member.

```mermaid
stateDiagram-v2
  [*] --> unadmitted
  unadmitted --> checking: request
  ready --> checking: new candidate
  checking --> decision: protected draft
  checking --> committing: admitted
  checking --> invalid: malformed
  checking --> denied: unauthorized
  checking --> unavailable: failed read
  decision --> checking: fresh decision admission
  decision --> blocked_return: return cannot complete
  committing --> ready: independent ack
  committing --> unavailable: mismatch or deadline
  unavailable --> checking: explicit retry
  blocked_return --> checking: explicit recovery
  ready --> retired: actor change or leave
  checking --> retired: superseded or unmounted
  committing --> retired: superseded or unmounted
  retired --> unadmitted: new live lifecycle
```

Superseded work cannot publish a failure into a newer lifecycle. Retirement clears publication and invalidates the old ticket.

## API interaction sequences

Endpoint labels marked **C0-bound** must be replaced by supplied exact methods/paths before execution. They are not invented route contracts.

```mermaid
sequenceDiagram
  participant UI as Coach producer
  participant Owner as Selection adapter
  participant API as C0-bound target-access GET
  participant Live as Router, pin and active thread
  UI->>Owner: requestSelection(candidate)
  Owner->>API: Current actor/audience and validated candidate
  API-->>Owner: Admission or bounded denial
  alt Current admission and owner decision permit
    Owner->>Live: Consume ticket and apply once
    Live-->>Owner: Independent committed observation
    Owner->>Owner: ackCommit and publish
  else Superseded or denied
    Owner-->>UI: No publication; current recovery only
  end
```

```mermaid
sequenceDiagram
  participant Chat as Existing useAIChat
  participant API as C0-bound thread creation API
  participant Adopt as Existing adoption hook
  participant Live as Router and active-thread owner
  Chat->>API: Create thread for captured current send
  API-->>Chat: Created thread
  Chat->>Adopt: adoptCreatedThread(args)
  Adopt->>Live: Apply owned null-to-created transition once
  alt Independent observations match and operation remains current
    Live-->>Adopt: Settled route and active thread
    Adopt-->>Chat: Same-generation adopted snapshot
    Chat->>API: Existing follow-on message operation once
  else Abort, timeout, mismatch or independent selection
    Adopt-->>Chat: null
    Chat->>Chat: No follow-on message
  end
```

```mermaid
sequenceDiagram
  participant UI as Memory drawer
  participant API as C0-bound memory list API
  participant DB as PostgreSQL
  UI->>API: Authorized target, filter, limit and cursor
  API->>API: Authenticate and ensureClientAccess
  API->>DB: Scoped readable rows ordered by id DESC, limit plus one
  DB-->>API: Rows
  API-->>UI: Existing envelope plus nextCursor
  UI->>UI: Publish only for current actor, target and request ordinal
```

```mermaid
sequenceDiagram
  participant UI as Correction editor
  participant API as C0-bound correction API
  participant DB as PostgreSQL
  participant Cache as Existing context invalidation
  UI->>API: Normalized input and stable Idempotency-Key
  API->>API: Authorize and validate
  API->>DB: Begin and lock scoped predecessor
  alt Matching committed replay
    DB-->>API: Existing readable successor or bounded unavailable result
  else New permitted correction
    API->>DB: Create successor and supersede predecessor atomically
    API->>DB: Commit
    API->>Cache: Invalidate after commit
  end
  API-->>UI: Committed result, conflict, or ambiguous response
  Note over UI,API: Ambiguous response retries the same key and body
```

```mermaid
sequenceDiagram
  participant UI as Forget confirmation
  participant API as C0-bound forget API
  participant DB as PostgreSQL
  participant Context as Retrieval boundary
  UI->>API: Explicit selected version
  API->>API: Authorize target and version
  API->>DB: Serialize with correction; tombstone selected version
  API->>DB: Commit without extending an existing purge deadline
  API->>Context: Invalidate current retrieval
  API-->>UI: Actual version result
  Note over UI,Context: Success excludes retrieval; it does not certify physical purge
```

```mermaid
sequenceDiagram
  participant UI as Self consent controls
  participant API as PUT /api/notification-settings/coach-nudges
  participant Merge as Shared preference updater
  participant DB as PostgreSQL
  UI->>API: Only intentionally changed Coach keys
  API->>API: Authenticate self and validate exact keys
  API->>Merge: Validated patch
  Merge->>DB: Lock current Users row and merge inside transaction
  DB-->>Merge: Committed current preferences
  API-->>UI: C0-bound existing response envelope
```

```mermaid
sequenceDiagram
  participant UI as Existing profile control
  participant API as PUT /api/profile
  participant Merge as Shared preference updater
  participant DB as PostgreSQL
  UI->>API: Intended profile fields and non-Coach preference patch
  API->>API: Reject Coach-owned keys
  API->>Merge: Validated combined update
  Merge->>DB: One transaction for profile and preferences
  alt Any failure
    Merge->>DB: Roll back both
  else Success
    Merge->>DB: Commit both
  end
  API-->>UI: C0-bound existing response envelope
```

```mermaid
sequenceDiagram
  participant UI as Logger dictation
  participant Hook as Bound command hook
  participant API as C0-bound execute or confirm API
  participant Timer as Real receiver and timer
  UI->>Hook: Capture actor, target, enabled generation and send identity
  Hook->>API: Existing command request
  API-->>Hook: Registry-valid response
  alt Scope remains current
    Hook->>Timer: Dispatch deltaSeconds
    Timer-->>Hook: Applied boolean ACK
    Hook-->>UI: Truthful current receipt
  else Retired scope
    Hook->>Hook: Suppress dispatch and result mutations
  end
```

Existing self-consent read and conversation list/detail APIs are also exercised by the mounted tests. Their exact contracts are absent. C0 must supply them and append their sequences before C4; they may not be substituted with assumed requests.

## Memory and timer states

```mermaid
stateDiagram-v2
  [*] --> proposed
  proposed --> active: explicit human approval
  proposed --> rejected: explicit rejection
  active --> invalidated: atomic correction links successor
  active --> forgotten: explicit forget
  proposed --> forgotten: authorized forget
  rejected --> forgotten: authorized forget
  invalidated --> forgotten: forget chosen version
  forgotten --> deleted: eligible purge under separately enabled operation
```

`forgotten` is a conceptual state represented by `forgottenAt`; it is not a new `status` enum value.

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> active: manual existing start
  active --> active: valid bounded delta
  active --> active: declined adjustment
  active --> idle: natural completion once or stop
  active --> disposed: cleanup
  idle --> disposed: cleanup
  disposed --> idle: valid new setup
```

## ERD — exact supplied fields

This is a **column projection**, not the complete schemas of referenced parent tables. Parent columns not supplied are deliberately absent. Existing PostgreSQL enum type names are not supplied; `enum` denotes the Sequelize enum fields and their exact members are in `03-contracts.md`.

```mermaid
erDiagram
  Users ||--o{ coach_facts : client
  Users ||--o{ coach_facts : creator
  Users o|--o{ coach_facts : approver
  coach_facts o|--o{ coach_facts : supersedes
  client_pain_entries ||--o{ PainEntryCorrectiveExercises : contains
  Exercises ||--o{ PainEntryCorrectiveExercises : prescribes
  Users ||--o{ UserAchievements : earns
  Achievements ||--o{ UserAchievements : defines

  Users {
    integer id PK
  }
  coach_facts {
    integer id PK
    integer userId FK
    enum category
    text statement
    jsonb structured
    enum status
    date validFrom
    date validTo
    timestamptz invalidatedAt
    integer invalidatedByFactId FK
    enum sourceType
    jsonb sourceRef
    integer createdByUserId FK
    integer approvedByUserId FK
    timestamptz approvedAt
    timestamptz forgottenAt
    timestamptz purgeAfterAt
    jsonb conflictMetadata
    varchar_128 correctionRequestKey
    char_64 correctionRequestHash
  }
  client_pain_entries {
    integer id PK
  }
  Exercises {
    uuid id PK
  }
  PainEntryCorrectiveExercises {
    integer id PK
    integer painEntryId FK
    uuid exerciseId FK
    varchar_20 phase
    integer sortOrder
    text aiNotes
    jsonb prescription
    varchar_20 source
    timestamptz createdAt
    timestamptz updatedAt
  }
  Achievements {
    integer id PK
  }
  UserAchievements {
    integer id PK
    integer userId FK
    integer achievementId FK
    timestamptz earnedAt
    float progress
    boolean isCompleted
    integer pointsAwarded
    boolean notificationSent
    timestamptz createdAt
    timestamptz updatedAt
  }
```

`CoachFact` has `timestamps:true`; the effective timestamp attribute names and live definitions must be confirmed through C0 because global Sequelize configuration is absent.

The consent storage column definition is also absent. No guessed JSONB field is added to this ERD.

**N/A:** new billing, deployment-topology and provider diagrams—this package creates none of those boundaries. Mermaid rendering is **NOT RUN**.
