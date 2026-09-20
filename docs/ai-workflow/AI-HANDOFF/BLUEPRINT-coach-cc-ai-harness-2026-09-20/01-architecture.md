**Responsibilities**

- `CoachCommandCenterPage` owns the existing shell and accessible regions.
- Controller/actions own submission identity and route/client selection.
- A pure outcome reducer determines the next UI state.
- `useCoachCommand` owns command HTTP transport.
- `useAIChat` owns conversation transport; it never interprets a command error as permission to send chat.
- Command middleware authenticates, validates, limits, and checks lane controls.
- The registry owns permission metadata and write classification.
- The operation service owns previews, replay, confirmation serialization, and committed receipts.
- Dispatchers own domain effects through a supplied transaction.
- Provider admission owns the final outbound model payload.
- Output validation owns acceptance of generated material.
- Existing proposal services own human approval; generated text cannot call approval itself.

**User and data flow**

```mermaid
flowchart TD
  T[Talk submission] --> K[Create request key and freeze local scope]
  K --> E[Command execute endpoint]
  E --> A{Authenticated and authorized?}
  A -- No --> D[Denied; no chat fallback]
  A -- Yes --> G{Lane enabled?}
  G -- No --> P[Paused; no mutation]
  G -- Yes --> C[Classify against registry]
  C --> R{Validated outcome}
  R -- Read command --> RD[Authorized read dispatcher]
  R -- Write command --> W{Writes enabled and supported?}
  W -- No --> NW[Unavailable; no chat fallback]
  W -- Yes --> PR[Persist server-owned preview]
  PR --> V[Review tab]
  V --> CF[Confirm or cancel by operation ID]
  CF --> TX[Lock operation; reauthorize; check versions]
  TX --> DB[Domain effect plus audit plus receipt in one transaction]
  DB --> H[History receipt]
  R -- Explicit non-action question --> CHAT[Chat admission]
  CHAT --> PP{Approved template and fields?}
  PP -- No --> CL[Local clarification]
  PP -- Yes --> LLM[Provider adapter]
  LLM --> OV[Output validation]
  OV --> TXT[Validated answer or proposal]
  TXT --> V
  RD --> H
  E -. Network outcome unknown .-> U[Reconcile existing request]
  U --> H
  U --> V
```

**Execute API interaction**

```mermaid
sequenceDiagram
  participant UI as Mounted actions
  participant API as Command route
  participant REG as Registry/classifier
  participant OPS as Operation service
  UI->>API: POST /api/ai-command/execute
  API->>API: Authenticate, limit, validate, lane switch
  API->>REG: Resolve command and authorized scope
  alt Explicit non-action
    API-->>UI: fallback_to_chat
  else Authorized read
    API->>REG: Dispatch authorized read
    API-->>UI: executed read receipt
  else Supported write
    API->>API: Registry write guard
    API->>OPS: Create/replay immutable preview
    OPS-->>API: Pending operation
    API-->>UI: confirmation_required
  else Denied, ambiguous, unsupported, or failed
    API-->>UI: Typed non-fallback outcome
  end
```

**Confirmation, cancellation, and recovery interactions**

```mermaid
sequenceDiagram
  participant UI
  participant API
  participant DB as Same database
  participant DISP as Transactional dispatcher
  alt Confirm
    UI->>API: POST /api/ai-command/confirm {operationId}
    API->>DB: Begin transaction; lock owned operation
    API->>API: Check expiry, switches, access, registry and data versions
    API->>DISP: Execute with transaction and immutable parameters
    DISP->>DB: Domain writes and audit
    API->>DB: Store terminal receipt; commit
    API-->>UI: executed receipt
  else Cancel
    UI->>API: POST /api/ai-command/cancel {operationId}
    API->>DB: Lock; change PENDING to CANCELLED
    API-->>UI: Authoritative operation state
  else Recover known operation
    UI->>API: GET /api/ai-command/operations/:operationId
    API->>DB: Read owned operation
    API-->>UI: State and permitted receipt
  else Recover lost execute response
    UI->>API: GET /api/ai-command/requests/:requestKey
    API->>DB: Find by authenticated actor and request key
    API-->>UI: Existing operation or request_not_found
  end
```

**Chat interactions**

```mermaid
sequenceDiagram
  participant UI
  participant CHAT as Chat routes
  participant ADMIT as Provider admission
  participant MODEL as Provider adapter
  participant VALID as Output/proposal validation
  alt Create conversation
    UI->>CHAT: POST /api/ai-chat/conversations
    CHAT-->>UI: Existing verified conversation contract
  else List or load
    UI->>CHAT: GET /conversations or /conversations/:id
    CHAT-->>UI: Authorized conversation data
  else Send admitted question
    UI->>CHAT: POST /conversations/:id/messages
    CHAT->>CHAT: Ownership, subscription, limits, PII/input checks
    CHAT->>ADMIT: Server-selected template and structured context
    ADMIT->>MODEL: Validated provider envelope only
    MODEL-->>VALID: Untrusted output
    VALID-->>CHAT: Validated answer/proposal or rejection
    CHAT-->>UI: Existing message envelope plus verified outcome metadata
  else Update conversation
    UI->>CHAT: PATCH /conversations/:id
    CHAT-->>UI: Existing verified update contract
  else Delete conversation
    UI->>CHAT: DELETE /conversations/:id
    CHAT-->>UI: Existing verified deletion contract
  end
```

All abbreviated chat paths above are prefixed `/api/ai-chat`. Existing lifecycle response shapes are not supplied; S0 must supply them before changing that transport.

**Proposal interactions**

```mermaid
sequenceDiagram
  participant UI as Review panel
  participant API as Proposal routes
  participant AUTH as Access and policy checks
  participant SERVICE as Existing proposal services
  UI->>API: GET /api/coach/proposals/:id
  API->>AUTH: Verify actor and current target access
  API->>SERVICE: Load sanitized detail
  API-->>UI: Verified detail contract
  alt Approve
    UI->>API: POST /:id/approve
    API->>AUTH: Revalidate scope, freshness, switches and permissions
    API->>SERVICE: Approve through verified mutation boundary
  else Clarify
    UI->>API: POST /:id/clarification-answer
    API->>AUTH: Validate answer and current access
    API->>SERVICE: Update proposal through existing contract
  else Reject
    UI->>API: POST /:id/reject
    API->>AUTH: Verify ownership/access
    API->>SERVICE: Reject pending proposal
  end
  SERVICE-->>UI: Authoritative proposal result
```

Proposal state names, storage, and request bodies are not invented here. S4 is blocked until their source contracts are supplied. A chat proposal cannot bypass the write pause simply because it uses a different endpoint.

**UI state**

```mermaid
stateDiagram-v2
  [*] --> Ready
  Ready --> Submitting: Send
  Submitting --> Answer: Authorized read or validated chat
  Submitting --> Review: Server preview
  Submitting --> Unavailable: Denied or unsupported
  Submitting --> OutcomeUnknown: Transport interruption
  Review --> Confirming: Explicit confirm
  Review --> Cancelling: Explicit cancel
  Review --> Stale: Scope or version changed
  Confirming --> Completed: Committed receipt
  Confirming --> OutcomeUnknown: Response lost
  Confirming --> Stale: Server invalidates preview
  Cancelling --> Cancelled: Server confirms cancellation
  Cancelling --> Completed: Execution won race
  Cancelling --> OutcomeUnknown: Response lost
  OutcomeUnknown --> Review: Reconciled pending
  OutcomeUnknown --> Completed: Reconciled success
  OutcomeUnknown --> Cancelled: Reconciled cancellation
  OutcomeUnknown --> Unavailable: Expired or invalidated
  Stale --> Ready: Create new preview
```

**Proposed operation ledger**

This is a **new target schema**, not a claim about existing tables. S0 first determines whether the current store already satisfies the contract. No migration proceeds without that adjudication.

```mermaid
erDiagram
  CoachHarnessOperations {
    UUID id PK
    STRING64 actor_key UK
    UUID request_key UK
    STRING64 request_hash
    STRING96 command
    STRING64 registry_version
    STRING64 scope_hash
    TEXT request_ciphertext
    TEXT result_ciphertext
    STRING64 key_id
    ENUM state
    DATE request_issued_at
    DATE expires_at
    DATE created_at
    DATE updated_at
    INTEGER version
  }
```

`UK` denotes the **composite** unique index `(actor_key, request_key)`, not independent uniqueness.

Existing domain tables and proposal tables are not diagrammed: their definitions were not supplied. This is an explicit unresolved schema-evidence requirement, not an N/A claim. Their exact ERDs and model definitions must enter the S0 supplement before a dispatcher touching them is enabled.

**Persisted operation state**

```mermaid
stateDiagram-v2
  [*] --> PENDING
  PENDING --> SUCCEEDED: Effect and audit commit atomically
  PENDING --> CANCELLED: Cancel acquires lock first
  PENDING --> EXPIRED: Server expiry
  PENDING --> INVALIDATED: Changed access, registry, or data
```

Terminal states are immutable. “Outcome unknown” is a client observation, not a successful or failed database state. Execution holds the operation lock inside the transaction; it does not publish a misleading intermediate success.
