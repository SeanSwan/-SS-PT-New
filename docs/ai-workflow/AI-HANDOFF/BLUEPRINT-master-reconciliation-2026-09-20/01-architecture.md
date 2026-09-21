**System boundary**

**[VERIFIED — decision]** The master operates on repository artifacts, local preservation copies, test evidence and archive records. It introduces no product screen, application API, database table, provider integration or production background service.

Existing mechanisms are treated as follows:

| Mechanism | Treatment |
|---|---|
| Mega Blueprint mandate library | Adopt; do not duplicate its output-contract responsibility |
| Blueprint splitter | Adopt for document extraction; splitting is not semantic acceptance |
| Existing consultation transports | Retain; invocation requires the frozen lane policy and existing authorization |
| Archive tooling | Adopt; caller files and indexes reviews |
| Missing workflow controller/hook | Do not build here; remove claims that they enforce the current process |
| Existing lane runtime code | Preserve and classify before choosing adoption or extension |

**Preservation flow**

```mermaid
flowchart TD
    A[Identify each L6 candidate location] --> B[Take provisional local rescue copy]
    B --> C[Mark copy unverified and inventory gaps]
    C --> D[Obtain source-owner quiescence]
    D --> E[Inventory every in-scope source file]
    E --> F[Compare original and salvage candidates]
    F --> G{Missing or conflicting versions?}
    G -->|Yes| H[Preserve all versions and resolve provenance]
    H --> E
    G -->|No unresolved gaps| I[Copy to two independent storage failure domains]
    I --> J[Verify exact inventories and file hashes]
    J --> K{Verification complete?}
    K -->|No| L[Keep all sources and copies; block S0 exit]
    L --> E
    K -->|Yes| M[Record preservation receipt]
```

**Admission flow**

```mermaid
flowchart TD
    A[Resolve registry and applicable lane authority] --> B[Select exact source and dependency closure]
    B --> C[Prepare isolated revision]
    C --> D[Run lane acceptance tests]
    D --> E{Required behavior evidence passes?}
    E -->|No| F[Repair or record blocker]
    F --> C
    E -->|Yes| G[Freeze source, policy and required test IDs]
    G --> H[Run evidence preflight]
    H --> I{Bytes and metadata match?}
    I -->|No| J[Mark revision stale and create new revision]
    J --> C
    I -->|Yes| K[Run existing required reviews in frozen order]
    K --> L{Approve, reject, unknown or defer?}
    L -->|Reject| F
    L -->|Unknown or defer| M[Pause with evidence preserved]
    M --> N[Recheck source and policy before resumption]
    N --> H
    L -->|Approve| O[Caller files review evidence]
    O --> P[Final authority admits exact revision]
    P --> Q[Integrate serially]
    Q --> R[Bind resulting tree and rerun affected checks]
    R --> S{Integration accepted?}
    S -->|No| T[Revert lane integration or repair in new revision]
    T --> C
    S -->|Yes| U[Implementation verified within recorded scope]
    U --> V[Separate deployment authorization and live proof]
```

**Review handoff sequence**

This is a file/actor interaction, not a newly introduced application API.

```mermaid
sequenceDiagram
    participant B as Lane builder
    participant O as Integration owner
    participant R as Required reviewer
    participant A as Archive caller
    participant F as Existing final authority

    B->>O: Exact revision, test results and lane authority references
    O->>O: Freeze snapshot and verify source hashes
    O->>R: Authorized packet bound to snapshot digest
    R-->>O: Terminal review result and identity evidence
    alt Findings or unknown execution
        O-->>B: Blocked revision with preserved evidence
    else Required review stage accepted
        O->>A: Review body and snapshot binding
        A-->>O: Filed review ID, path and artifact hash
        O->>O: Repeat for remaining required stages in order
        O->>F: Complete exact-revision admission record
        F-->>O: Admit or reject
    end
```

**State machine**

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> SourceBound: Ownership and contracts resolved
    SourceBound --> Frozen: Source and policy sealed
    Frozen --> Validated: Required tests and preflight pass
    Validated --> Reviewing: Authorized required sequence starts
    Reviewing --> Admitted: Filed reviews and final approval
    Admitted --> Integrated: Serialized integration
    Integrated --> ImplementationVerified: Resulting tree verified
    ImplementationVerified --> Deployed: Separate release and live evidence

    SourceBound --> Blocked: Missing boundary evidence
    Frozen --> Stale: Source or policy changed
    Validated --> Stale: Source or policy changed
    Reviewing --> Stale: Source or policy changed
    Reviewing --> Blocked: Findings or unknown execution
    Reviewing --> Paused: Cancel or defer
    Paused --> Frozen: Unchanged revision revalidated
    Paused --> Stale: Revision changed
    Admitted --> Stale: Bytes changed before integration
    Integrated --> Blocked: Integration regression
    Blocked --> Draft: Repair under new revision
    Stale --> Draft: New revision required
```

**Dependency model**

| Edge | Classification | Reason |
|---|---|---|
| L6 provisional rescue → stable preservation | Mandatory preservation order | A rescue copy alone is not verified S0 evidence |
| Shared admission substrate → every implementation slice | Mandatory gate | Common source, reference and review truth |
| L6 verified preservation → L6 integration | Mandatory | Prevent losing uncommitted candidates |
| L1 B Stage 1 → L1 B Stage 2 | Inherited hard dependency | L1’s explicit migration order |
| L1 A → neither B stage | No prerequisite edge | L1 explicitly makes A independent |
| L7 Phase 0 → Phase 1 → Phase 2 | Inherited hard dependency | Foundation/contracts precede the native vertical slice |
| L8 ↔ L1 shared theme/capability contract | Mandatory **boundary gate if overlap is confirmed** | Public theme state and capability selection must not acquire competing owners |
| L3 → L2 | Conditional | Hard only if a bound L2 slice consumes L3’s new rules or events |
| L3 → L4 | Conditional | Hard only if a bound L4 slice consumes L3’s new events |
| L6 fleet → L1 | Conditional | Hard only if a bound public-home slice actually adopts those assets |
| Shared API change → L7 contract revalidation | Mandatory when API changes | Mobile remains an unchanged-API consumer |

**[VERIFIED — decision]** Until a consumer receipt proves a conditional edge, it must not be used either to block an independent lane indefinitely or to justify an unreviewed integration.

**Diagram applicability**

- Application `sequenceDiagram` per API: **N/A — the master adds no application API interaction.** Each lane must retain or refresh its own diagrams against its actual endpoint contracts before admission.
- Relational `erDiagram`: **N/A — the master adds no relational storage or database columns.** L3 and any other database-changing lane remain blocked until their actual model/migration schemas are available; column names will not be invented.
- Product screen flows: **N/A at master scope.** Per-lane requirements are listed in `02-wireframes.md`.
- Permissions: builder prepares source; integration owner freezes and integrates; required reviewers review; caller files; existing final authority admits; deployment requires separate authority.
- Privacy boundary: preservation and raw evidence remain local. Only separately authorized, appropriately sanitized review packets may leave that boundary.
