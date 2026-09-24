# SCU-FLOWS — v3.2 runtime and recovery specification

Owner: Astra. Version: 3.2, 2026-09-06 UTC. Status: build contract.
Supersedes: conflicting v3.0 state/storage details; complements original diagrams.
These diagrams specify target behavior, not proof it is implemented.

## One Coach, bounded domain adapters

```mermaid
flowchart TD
  Admin[Admin tabs] --> Surface[Registered surface and target]
  Trainer[Trainer tabs] --> Surface
  Client[Client tabs] --> Surface
  User[User dashboard tabs] --> Surface
  Surface --> Access[Authenticated role and current access]
  Access -->|Denied| Denied[Safe unavailable response]
  Access -->|Allowed| Context[Minimal authorized domain evidence]
  Context -->|Required data absent| Clarify[Clarification or manual review]
  Context --> Policy[Provider privacy and budget gate]
  Policy -->|Unavailable| Manual[Manual workflow remains usable]
  Policy --> Interpret[Bounded interpretation and read tools]
  Interpret --> Draft[Typed draft without authority]
  Draft --> Review[Existing domain review]
  Review -->|Declined or stale| Draft
  Review -->|Approved| Writer[Canonical domain transaction]
  Writer --> Receipt[Durable result]
  Receipt --> Read[Authorized independent read-back]
  Read -->|Match| Verified[Verified timeline and tab refresh]
  Read -->|Missing or mismatch| Unknown[Reconciliation without replay]
```

Surface context selects evidence; it does not elevate authority. The model cannot
see every dashboard at once or invoke all registry commands merely by name.

## Durable execution lifecycle

```mermaid
stateDiagram-v2
  [*] --> drafted
  drafted --> awaiting_approval: valid preview
  drafted --> refused: policy refuses
  awaiting_approval --> cancelled: cancel wins CAS
  awaiting_approval --> drafted: semantic edit invalidates preview
  awaiting_approval --> executing: access and version rechecked
  executing --> committed_unverified: domain and receipt commit together
  executing --> failed: proven rollback
  executing --> unknown: outcome not observed
  committed_unverified --> verified: independent matching read
  committed_unverified --> unknown: read-back mismatch
  unknown --> committed_unverified: matching committed receipt found
  unknown --> verified: authorized exact footprint proof
  unknown --> unknown: absent or incomplete evidence
  failed --> awaiting_approval: explicit unchanged-intent retry
  verified --> [*]
  cancelled --> [*]
  refused --> [*]
```

Legacy claimed/completed map conservatively; migration policy is in 13.
"Cancel response" is not a transition in this diagram. Versioned compare-and-set
determines the winner of cancel vs execution. Unknown never ages into retryable.

## Workout transaction and crash windows

```mermaid
sequenceDiagram
  actor Human
  participant UI as Session Desk
  participant API as Proposal approval
  participant DB as PostgreSQL transaction
  participant Writer as Daily-form writer
  participant Read as Authorized read-back
  Human->>UI: Review canonical draft
  UI->>API: Existing reviewToken and intent identity
  API->>Writer: Trusted context, not client result
  Writer->>DB: Begin; lock intent then proposal
  DB-->>Writer: Current state, owner and revision
  alt Access changed or stale
    Writer->>DB: Rollback
    Writer-->>UI: Safe denied or stale preview
  else Approved
    Writer->>DB: Claim proposal and intent
    Writer->>DB: Existing form/session/log and billing writes
    Writer->>DB: Proposal result and actual intent receipt
    alt Any pre-commit failure
      Writer->>DB: Rollback all
      Writer-->>UI: Known no-effect failure
    else Commit
      Writer->>DB: Commit
      Writer-->>UI: Committed receipt, if response arrives
      UI->>Read: Read same intent, including after lost response
      Read->>DB: Current access plus persisted records
      alt Footprint matches
        Read-->>UI: Verified
      else Unavailable or mismatch
        Read-->>UI: Unverified or unknown; never retry write
      end
    end
  end
```

Post-commit earnings/XP notifications retain existing idempotent behavior.
Their failure cannot rewrite the workout's committed truth into failed.

## Logical relations, not unverified SQL DDL

```mermaid
erDiagram
  USER ||--o{ COACH_INTENT : acts
  USER ||--o{ COACH_INTENT : permitted_target
  COACH_INTENT o|--o| COACH_PROPOSAL : immutable_link
  COACH_PROPOSAL o|--o| DAILY_WORKOUT_FORM : workout_result
  DAILY_WORKOUT_FORM }o--|| WORKOUT_SESSION : references
  WORKOUT_SESSION ||--o{ WORKOUT_LOG : contains
  COACH_INTENT ||--o{ RECORD_REFERENCE : proves
```

Record references are bounded receipt entries, not a new table. Some proposal
types create no workout. Exact FK types and nullable relationships come from S0
schema inspection; do not generate SQL from this logical diagram.

## Voice and action states are independent

```mermaid
flowchart LR
  Gesture[Explicit mic gesture] --> Listen[Listen with capture session]
  Listen --> Final[Unique final transcript segment]
  Final --> Draft[Review editable draft]
  Draft -->|Physical approval| Action[Tracked domain action]
  Listen -->|Background or logout| Off[Stop all tracks]
  Speak[Speak response] -->|Barge-in| Off
  Off --> History[Action outcome remains queryable]
  Action -->|Lost response| History
  History -->|Read only| Result[Committed, verified or unknown]
```

## Memory and briefing trust boundary

```mermaid
flowchart TD
  Remember[Explicit remember request] --> Consent[Consent and scope]
  Consent -->|Private or denied| NoStore[No durable extraction]
  Consent -->|Allowed| Fact[Versioned encrypted fact]
  Fact --> Read[Current access and tombstone check]
  Forget[Forget] --> Tombstone[Atomic tombstone and invalidation event]
  Tombstone --> Read
  Tombstone --> Purge[Ciphertext purge within retention deadline]
  Read -->|Allowed| Context[Minimal context]
  OptIn[Explicit briefing opt-in] --> Queue[Existing notification worker]
  Queue --> Recheck[Recheck consent, access, freshness, quiet hours]
  Recheck -->|Denied or opted out| Drop[Remove pending content]
  Recheck -->|Allowed and deduped| Card[One in-app card]
```

## UI projections

The interactive wireframe demonstrates Talk/Workout/Results, draft/review/unknown/
verified/denied/offline states and mobile layout. It uses synthetic data and no API.
Production view transitions must be driven by real receipts; the demo state selector
must never be copied into the application as a source of truth.
