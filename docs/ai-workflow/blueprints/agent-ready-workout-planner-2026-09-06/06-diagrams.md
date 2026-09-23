# Flow, state, sequence and data diagrams

Artifact: SWAN-AGENT-PLANNER-DIAGRAMS · v2.0 · 2026-09-06 · Owner: Sean
Status: proposed Mermaid source. See [contracts](02-agent-contracts.md).
Rendered preview: [five local diagrams](diagrams.html), using pinned Mermaid
11.12.0. No diagram content is submitted to an external rendering service.
These diagrams define planned behavior; they are not evidence that it runs.

## Training workflow, errors and rollback

```mermaid
flowchart TD
  U[Choose client and scope] --> C[Resolve permissions and constraints]
  C -->|Denied or missing context| B[Explain block and retain safe draft]
  B -->|Resolve then retry| C
  C -->|Allowed| M{Draft source}
  M --> S[Manual or Swan Coach]
  M --> L[Personal agent]
  L -->|Device offline| O[Pause local job]
  O -->|Reconnect| L
  O -->|Defer| D[Keep draft]
  L --> V[Validate candidate against Swan contracts]
  S --> V
  V -->|Invalid| E[Field errors and violations]
  E -->|Revise| M
  V -->|Valid| P[Preview exact changes]
  P -->|Cancel or defer| D
  P -->|Human approves bound version| A[Recheck access and expected revision]
  A -->|Stale| X[Compare with current revision]
  X -->|Rebase or copy| V
  A -->|Allowed| T[Existing transactional plan writer]
  T -->|Known failure| E
  T -->|Lost response| Q[Lookup same proposal and receipt]
  Q -->|Unknown| Q2[Show pending recovery without resaving]
  Q2 -->|Retry read| Q
  Q -->|Committed| R[Read back persisted revision]
  T -->|Committed| R
  R -->|Verified| F[Saved and checked]
  R -->|Unavailable| Q2
  F --> W[Log workout and view actual progress]
  F -->|Restore requested| H[Review prior snapshot as a new revision]
  H --> A
```

## Durable proposal and device states

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Validating: submit bounded candidate
  Validating --> NeedsChanges: violations
  NeedsChanges --> Draft: edit
  Validating --> AwaitingReview: valid
  AwaitingReview --> Cancelled: cancel or expiry
  AwaitingReview --> Conflict: context changed
  Conflict --> Draft: deliberate rebase
  AwaitingReview --> Applying: human approval and current access
  Applying --> Failed: transaction rolled back
  Applying --> Reconciling: response lost
  Applying --> CommittedUnverified: commit acknowledged
  Reconciling --> CommittedUnverified: receipt found
  Reconciling --> Failed: rollback proven
  CommittedUnverified --> Verified: semantic read-back
  CommittedUnverified --> CommittedUnverified: retry verification
  Verified --> [*]
  Failed --> Draft: new reviewed proposal
  Cancelled --> [*]
```

Device lifecycle: unpaired → pairing → connected → unknown → offline → reconnect.
Any non-revoked state can become revoked; re-pairing creates a new grant/key
binding. A delayed response from a revoked device never resurrects a cancelled job.

## Authorization and write sequence

```mermaid
sequenceDiagram
  actor H as Human
  participant E as Personal agent
  participant G as Swan gateway
  participant P as Policy and proposal service
  participant W as Existing plan writer
  participant DB as PostgreSQL
  H->>G: Sign in and consent to selected capabilities
  G-->>E: Audience-bound authorization result
  E->>G: Request minimized training context
  G->>P: Check grant and current target access
  alt Missing or revoked authority
    P-->>E: Denied without private details
  else Allowed
    P-->>E: Typed context and snapshot reference
    E->>G: Propose candidate with request ID and revision
    G->>P: Validate and deduplicate
    P-->>H: Review exact candidate and violations
    alt Human cancels or defers
      H->>P: Cancel or retain draft
    else Human approves
      H->>P: Bound approval proof
      P->>DB: Begin transaction and check current authority
      P->>W: Apply with expected revision and same transaction
      W->>DB: Persist plan and proposal outcome
      DB-->>P: Commit outcome
      alt Commit known
        P->>DB: Read back semantic result
        P-->>H: Verified or saved-checking receipt
      else Response uncertain
        P-->>H: Check same proposal without saving again
      end
    end
  end
```

## Proposed records and existing authority

```mermaid
erDiagram
  USER ||--o{ AGENT_CONNECTION : owns
  AGENT_CONNECTION ||--o{ AGENT_GRANT : authorizes
  AGENT_CONNECTION ||--o{ AGENT_DEVICE : pairs
  AGENT_GRANT ||--o{ AGENT_JOB : bounds
  AGENT_JOB o|--o| COACH_PROPOSAL : produces
  USER ||--o{ WORKOUT_PLAN : owns_training_record
  COACH_PROPOSAL o|--o| WORKOUT_PLAN : applies_via_existing_writer
  WORKOUT_PLAN ||--o{ PLAN_REVISION_SNAPSHOT : preserves
  WORKOUT_PLAN {
    uuid id PK
    int userId FK
    int trainerId
    int contentRevision
    string contentHash
    json planData
  }
  AGENT_GRANT {
    uuid id PK
    uuid connectionId FK
    json capabilityScopes
    string targetBinding
    datetime expiresAt
    int revocationEpoch
  }
```

## Privacy and trust boundaries

```mermaid
flowchart LR
  subgraph DEVICE[User-controlled device]
    E[Hermes or supported companion]
    M[Local model and local auxiliary models]
    E <--> M
  end
  subgraph SWAN[Swan hosted application]
    UI[Human UI and consent]
    G[New authenticated gateway]
    P[Policy and minimized context]
    D[(Canonical training data)]
    W[Existing guarded writer]
    UI --> G
    G --> P
    P -->|Authorized selected fields| D
    P -->|Human-bound reviewed change| W
    W --> D
  end
  E -->|Outbound HTTPS scoped tools| G
  P -->|Pseudonymous typed response| E
  E -. Managed local profile blocks .-> CLOUD[Cloud inference destinations]
  PRIVATE[Private operator Wiki and infrastructure] -. No customer capability .-> G
```

MCP does not control an arbitrary external agent's downstream model or network.
The dotted blocks are product requirements proved by managed-profile tests,
not a security boundary that Swan can impose on every customer's software.


## September 7–8 v2 addendum

The canonical direction is Training Studio with optional Program Map. Read 08-design-synthesis.md for the governing visual decisions, 09-model-connections-and-budgets.md for default Coach/personal OpenRouter/local policy and durable spending controls, and 10-coach-privacy-audit.md for current-source privacy gaps and release prerequisites. Earlier baseline results remain dated historical evidence. This pass changes the blueprint and synthetic preview only.

## V2 default Coach, personal credits and local dispatch

```mermaid
flowchart TD
  Start[Choose task and source] --> Auth[Current actor and target authorization]
  Auth --> Consent{Consent and age eligibility verified}
  Consent -->|No or unknown| Deny[Block and keep authorized manual draft]
  Consent -->|Yes| Envelope[Build allowlisted final context]
  Envelope --> Privacy{Every field and modality allowed}
  Privacy -->|No| Deny
  Privacy -->|Yes| Source{Source selected}
  Source -->|Local| Device{Paired device available}
  Device -->|No| Offline[Keep task paused - no cloud fallback]
  Device -->|Yes| Limits[Claim bounded root task]
  Source -->|Swan or personal OpenRouter| Price{Fresh allowance and bounded price}
  Price -->|Unknown or insufficient| Budget[Explain block - no payer switch]
  Price -->|Valid| Reserve[Atomic reservation across all workers]
  Reserve -->|Duplicate| Existing[Return same task]
  Reserve -->|Conflict or ceiling| Budget
  Reserve -->|Admitted| Limits
  Limits -->|Call or tool cap reached| Stop[Stop loop and require human review]
  Limits -->|Allowed| Dispatch[Dispatch approved envelope once]
  Dispatch -->|Timeout or lost response| Uncertain[Hold reservation and reconcile]
  Uncertain -->|Unknown| Pending[Display checking - no resend]
  Pending -->|Status lookup| Uncertain
  Dispatch -->|Known result| Settle[Settle verified charge]
  Uncertain -->|Receipt found| Settle
  Settle --> Validate[Validate exact proposal]
  Validate -->|Invalid| Revise[Manual revision or new reviewed task]
  Validate -->|Valid| Review[Human reviews bound version]
  Review -->|Cancel| Keep[Retain draft]
  Review -->|Approve| Save[Existing writer rechecks role and revision]
  Save -->|Conflict| Keep
  Save -->|Committed| Receipt[Read persisted receipt]
  Receipt -->|Rollback requested| Restore[Review old snapshot as new revision]
```

## V2 spend lifecycle

```mermaid
stateDiagram-v2
  [*] --> Quoted
  Quoted --> Blocked: stale price or eligibility denied
  Quoted --> Reserved: atomic claim
  Reserved --> Cancelled: cancelled before dispatch
  Reserved --> Dispatching: one admitted call
  Dispatching --> Uncertain: timeout or lost receipt
  Uncertain --> Uncertain: status lookup only
  Uncertain --> Settled: verified receipt
  Dispatching --> Settled: verified result and cost
  Settled --> ProposalReady: valid output
  Settled --> NeedsReview: invalid output
  ProposalReady --> Reviewed: human decision
  Reviewed --> Saved: current authorization and revision
  Reviewed --> Deferred: cancel or stale
  Blocked --> [*]
  Cancelled --> [*]
  Saved --> [*]
```

## V2 shared task reservation sequence

```mermaid
sequenceDiagram
  actor Owner
  participant Swan
  participant Policy
  participant Ledger
  participant Provider
  Owner->>Swan: Select own connection and training target
  Swan->>Policy: Current role, consent, subject, modality
  Policy-->>Swan: Allowed envelope or denial
  Swan-->>Owner: Context manifest, payer, ceiling and quote
  Owner->>Swan: Approve one task and request ID
  Swan->>Ledger: Atomic idempotent reservation
  alt Denied or duplicate
    Ledger-->>Swan: Block or return existing task
  else Admitted
    Ledger-->>Swan: Root task and call allowance
    Swan->>Provider: Bound request, no hidden retry
    alt Ambiguous acceptance
      Swan->>Ledger: Hold uncertain reservation
      Swan-->>Owner: Checking charge - no new dispatch
    else Verified receipt
      Provider-->>Swan: Result and usage receipt
      Swan->>Ledger: Settle verified cost
      Swan-->>Owner: Exact proposal for review
    end
  end
```
