**1. Responsibility and authority**

| Component | Responsibility | Forbidden responsibility |
|---|---|---|
| Catalog observer | Report physical identifiers, column types, defaults, constraints, and metadata | Mutate schema or inspect client records for the review packet |
| Decision receipt | Bind approved relation, PK type, namespace, and observation | Pretend an unknown value has been observed |
| Migration manifest | Bind reviewed files, order, dependencies, and postconditions | Infer that a filename proves a migration ran |
| Runner | Validate configuration, serialize execution, invoke CLI, verify outcome, stop accurately | Convert arbitrary error text into completion |
| Baseline/adoption migration | Establish or verify the approved v2 schema contract | Mark legacy migrations executed |
| Application startup | Require the schema contract before accepting traffic after cutover | Repair production schema through model sync |
| Models | Describe application persistence expectations | Independently change production schema |

**2. Current runner flow**

[VERIFIED] This describes the supplied `safe-migrate.mjs`, not verified deployed behavior.

```mermaid
flowchart TD
    A[Direct invocation guard] --> B[Construct parent connection]
    B --> C{Authentication succeeds?}
    C -- No --> X[Exit nonzero]
    C -- Yes --> D[Discover files and read metadata]
    D --> E[Report inert files to stderr]
    E --> F{Pending executable files?}
    F -- No --> Z[Close connection and return]
    F -- Yes --> G[CLI db:migrate --to target]
    G --> H{Child exit code zero?}
    H -- Yes --> I[Count as applied]
    H -- No --> J{STRICT disabled and output matches already exists?}
    J -- Yes --> K[Insert target into SequelizeMeta]
    J -- No --> L{STRICT enabled?}
    L -- Yes --> X
    L -- No --> M{ALLOW_FAILURE enabled?}
    M -- Yes --> N[Insert failed target into metadata]
    M -- No --> O[Do not insert completion]
    N --> P[Stop remaining chain]
    O --> P
    P --> Q[Close connection]
    Q --> R{ALLOW_FAILURE enabled?}
    R -- Yes --> Z
    R -- No --> X
    I --> F
    K --> F
```

The deployment catch at `backend/scripts/render-start.mjs:95-100` can continue server startup after `X`.

**3. Intended execution paths**

```mermaid
flowchart TD
    A[Operator or deployment invokes runner] --> B[Validate epoch, decision, manifest and config]
    B --> C{Required evidence complete?}
    C -- No --> H[HALT before schema writes]
    C -- Yes --> D[Acquire migration lock and observe catalog]
    D --> E{Database classification}
    E -- Empty application schema --> F[Create v2 baseline transactionally]
    E -- Exact approved existing schema --> G[Verify and adopt v2 baseline]
    E -- Compatible state with approved upgrade --> U[Run the specific approved upgrade]
    E -- Conflicting, incomplete or unknown --> H
    F --> V[Check catalog and data postconditions]
    G --> V
    U --> V
    V --> W{Postconditions and metadata agree?}
    W -- No --> I[Stop and preserve failure evidence]
    W -- Yes --> J[Release lock and report verified epoch]
    J --> K[Application startup checks required contract]
    K --> L{Required contract present?}
    L -- No --> M[Refuse readiness and startup]
    L -- Yes --> N[Start application without production sync DDL]
    I --> O[Inspect actual state before any retry]
    O --> P{Recovery plan authorized and verified?}
    P -- No --> H
    P -- Yes --> A
```

“Empty” means no application relations in the approved ownership manifest. The presence of unrelated relations or uncertain ownership prevents empty-schema classification.

**4. Observation and decision flow**

```mermaid
flowchart LR
    A[Authorized read-only catalog snapshot] --> B[Restricted observation receipt]
    B --> C[Resolve model SQL and reference graph]
    C --> D[Owner selects namespace, relation and PK type]
    D --> E[Architect completes target contract]
    E --> F[Disposable database verification]
    F --> G[Release candidate]
    B --> H[Missing or conflicting evidence]
    C --> H
    H --> I[Dependent work remains BLOCKED]
```

**5. Database interaction sequence**

N/A — there are no HTTP endpoints or screen API interactions. The database/CLI interaction is applicable:

```mermaid
sequenceDiagram
    participant O as Operator or deploy
    participant R as Runner
    participant D as PostgreSQL
    participant C as Sequelize CLI
    participant A as Application
    O->>R: Run selected epoch with approved contract
    R->>R: Resolve and freeze configuration
    R->>D: Authenticate and acquire migration lock
    D-->>R: Identity and catalog snapshot
    R->>R: Validate classification and expected history
    R->>C: Execute --to target with same resolved configuration
    C->>D: Confirm expected database identity
    alt Identity mismatch
        C-->>R: Refuse before migration DDL
    else Identity matches
        C->>D: Run migration-owned transaction
        D-->>C: Commit or error
        C-->>R: Close with code, signal and bounded output
    end
    R->>D: Read actual metadata and postconditions
    alt Verified success
        R-->>O: PASS with evidence
        A->>D: Check required schema contract
        A-->>O: Start only when contract matches
    else Failure or uncertain completion
        R-->>O: Nonzero with observed state
        Note over R,D: Parent rollback does not undo committed child DDL
    end
```

**6. ERD: supplied evidence projection**

[VERIFIED] This is a projection of declarations and claims, **not a complete or observed physical ERD**. Entity prefixes identify their evidence source. Only supplied columns are shown.

```mermaid
erDiagram
    MODEL_Users {
        INTEGER id PK "User.mjs:25-27; autoIncrement"
    }
    MIGRATION_users {
        UUID id PK "create-user-table.cjs:339; UUIDV4 default"
    }
    MIGRATION_orientations {
        UUID userId FK "orientation migration:36; nullable declaration"
    }
    HEADER_sessions {
        UUID userId "UNVERIFIED header claim; no column definition supplied"
    }
    MIGRATION_users |o..o{ MIGRATION_orientations : "declared reference to users.id"
```

[UNKNOWN] Namespace, complete columns, session primary key, actual session FK, orientation primary key, physical constraint existence, and the model’s resolved physical identifier are absent.

The final target ERD must be generated from the approved complete contract and checked against PostgreSQL. Do not manufacture full model definitions or mark this projection as that deliverable.

**7. Runner state machine**

```mermaid
stateDiagram-v2
    [*] --> Preflight
    Preflight --> Blocked: Invalid config or missing approval evidence
    Preflight --> Locked: Lock acquired
    Locked --> Blocked: Catalog conflicts with approved state
    Locked --> Running: Preconditions verified
    Running --> Verifying: Child closes successfully
    Running --> Inspecting: Error, signal, timeout or cancellation
    Verifying --> Complete: Metadata and postconditions agree
    Verifying --> Inspecting: Missing marker or failed postcondition
    Inspecting --> Failed: Outcome established
    Inspecting --> Indeterminate: Outcome cannot be established
    Failed --> [*]
    Indeterminate --> [*]
    Blocked --> [*]
    Complete --> [*]
```

Retry begins a new observation. No automatic transition from Failed or Indeterminate back to Running.
