# SCU-FLOWS — architecture, failure, and recovery

Owner: Codex. Version: 3.0. Status: target diagrams, not runtime receipts.
Supersedes: v2 diagrams implying all mounts or durable settlement already exist.

## 1. System and trust boundaries

```mermaid
flowchart LR
  UI[Role page and surface docks] --> Input[Typed input and context binding]
  Input --> Auth[Server identity and capability policy]
  Auth -->|denied| Deny[Minimal denial receipt]
  Auth --> Context[Quality tagged context]
  Context --> Model[Allowed provider interprets or answers]
  Model -->|typed proposal only| Registry[Registry and owner resolver]
  Registry --> Review[Stored preview and human review]
  Review -->|cancel or expired| Pause[Preserve draft]
  Review --> Domain[Existing proposal and domain services]
  Domain --> DB[(Domain DB plus intent receipt)]
  DB --> Readback[Authorized independent read-back]
  Readback -->|match| Proof[Verified timeline and progress]
  Readback -->|lost or mismatch| Recover[Unknown and reconciliation]
  Recover --> Readback
  Model -. no direct DB writes .-> Deny
```

## 2. Workout happy path and lost-response path

```mermaid
sequenceDiagram
  actor Person
  participant Desk
  participant Policy
  participant Proposal
  participant Domain
  participant DB
  Person->>Desk: Dictate sets and correct one load
  Desk->>Policy: Input origin, target, context version
  Policy-->>Desk: Draft with units and evidence
  Person->>Desk: Review and approve exact draft
  Desk->>Proposal: Approved proposal linked to stable intent
  Proposal->>Policy: Revalidate role, target and preconditions
  alt denied or stale
    Policy-->>Desk: Refuse or refresh preview; no effect
  else permitted
    Proposal->>Domain: Existing daily-form writer
    Domain->>DB: Commit domain records and receipt atomically
    alt response received
      DB-->>Desk: Committed receipt
    else response lost
      Desk->>Policy: Query same intent; do not reissue
      Policy->>DB: Load receipt with current access check
      DB-->>Desk: Committed, pending or unknown
    end
    Desk->>Policy: Verify record refs and versions
    Policy-->>Desk: Verified result or reconciliation needed
  end
```

## 3. Intent lifecycle

```mermaid
stateDiagram-v2
  [*] --> drafted
  drafted --> refused: policy denied
  drafted --> awaiting_approval: valid proposal
  awaiting_approval --> cancelled: explicit cancel
  awaiting_approval --> drafted: edit or expired preview
  awaiting_approval --> executing: valid approval and atomic claim
  executing --> failed: proven transaction rollback
  executing --> committed_unverified: durable commit
  executing --> unknown: timeout or lost outcome
  committed_unverified --> verified: read-back matches
  committed_unverified --> unknown: read-back unavailable or differs
  unknown --> committed_unverified: receipt found
  unknown --> failed: authoritative no-effect proof
  failed --> awaiting_approval: explicit retry with same intent identity
  verified --> [*]
  cancelled --> [*]
  refused --> [*]
```

Unknown is not retriable until an authoritative outcome is established. A rollback
of code stops new work; it does not reset persisted state transitions.

## 4. Scope, readiness, and owner checks

```mermaid
flowchart TD
  A[Authenticated actor] --> B{Client self or authorized staff?}
  B -->|no| X[Denied with zero effects]
  B -->|yes| C[Resolve entity owner and current target]
  C --> D{Conversation, selection and owner agree?}
  D -->|no| R[Re-anchor preview; no execution]
  D -->|yes| E{Required context available and readiness satisfied?}
  E -->|no| P[Manual path or one clarification]
  E -->|yes| F[Compute server approval policy]
  F --> G[Human reviews stored operation]
  G --> H{Recheck permission and version at execution}
  H -->|changed| R
  H -->|allowed| I[Existing domain service]
```

## 5. Proposed persistence relationships

```mermaid
erDiagram
  Users ||--o{ coach_intents : actor
  Users o|--o{ coach_intents : target
  ai_conversations o|--o{ coach_intents : context
  coach_action_proposals o|--o{ coach_intents : reviewed_authority
  coach_intents ||--o{ domain_record_refs : receipt_contains
  Users ||--o{ coach_facts : subject
  coach_intents o|--o{ coach_facts : evidence
```

`domain_record_refs` is a logical receipt array, NOT a proposed extra SQL table.
One intent may have successive approval attempts, but at most one committed effect.
This ERD does not authorize creating coach_facts; reuse its separately reconciled design.

## 6. Voice interruption and cancellation

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> listening: explicit microphone gesture
  listening --> draft: final transcript with voice provenance
  listening --> idle: stop or permission denied
  draft --> thinking: user submits
  thinking --> speaking: response available
  speaking --> listening: explicit interrupt; stop audio
  thinking --> draft: cancel response generation
  draft --> review: proposed write
  review --> draft: edit or cancel
  review --> verifying: deliberate confirmation
  verifying --> result: committed and read back
  verifying --> unknown: transport interrupted
  unknown --> result: reconcile same intent
```

Stopping audio does not cancel a database transaction. Navigating, logging out,
locking the device or backgrounding the app closes media tracks and speech output.

## 7. Memory lifecycle and deletion

```mermaid
flowchart TD
  S[User statement or verified result] --> C[Candidate with provenance]
  C --> P{Policy, scope and consent allow storage?}
  P -->|no| T[Current conversation only]
  P -->|yes| R[Review or explicit remember request]
  R --> M[Versioned memory]
  M --> Q{Conflicts with authoritative record?}
  Q -->|yes| U[Mark disputed; ask once]
  Q -->|no| Read[Authorized context use]
  M --> Delete[Forget request]
  Delete --> Tomb[Invalidate cache and retrieval now]
  Tomb --> Purge[Purge retained content by retention job]
```

## 8. Rollout and stop conditions

```mermaid
flowchart LR
  Base[Reconcile branch and baseline] --> Red[Reproduce failing acceptance]
  Red --> Slice[One scoped build card]
  Slice --> Tests[Behavior, negative controls and hostile pass]
  Tests -->|fail| Slice
  Tests --> Stage[Isolated staging plus browser proof]
  Stage -->|approved| Canary[Small opt-in canary]
  Canary -->|bad scope, duplicate or false success| Stop[Disable new AI writes; retain receipt reads]
  Stop --> Reconcile[Reconcile outstanding intents]
  Canary -->|gates hold| Expand[Expand one capability]
```
