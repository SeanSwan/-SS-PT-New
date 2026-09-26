**Architecture**

Keep the current Express/Sequelize and React stack. Add a small purchase snapshot and credit-provenance boundary, then make existing entry points delegate to it. Do not introduce another commerce platform or replace the scheduling system.

**Ownership**

- Existing first-mounted workout controller owns common session CRUD.
- `assertAssignmentOrAdmin` owns active-assignment authorization.
- Checkout preparation owns immutable purchased terms.
- Payment-event ingestion owns signature verification, normalization, and durable receipt.
- Purchase fulfillment owns grant, balance, inventory, accounting, and allocation claim.
- Refund reconciliation owns purchase-specific reversal.
- Frontend receipt views render backend state; they do not infer fulfillment from payment alone.

**Rendered surfaces**

```text
main-routes.tsx
├─ /checkout → ProtectedRoute → CheckoutView
├─ /checkout/success → SuccessPage
│  ├─ existing receipt/details components
│  └─ SuccessPage.stateViews
└─ /waiver → PublicWaiverPage.V3
   └─ V2 fallback retains the same submission-state contract
```

**User/data flow**

```mermaid
flowchart TD
    U[Authenticated buyer] --> C[Existing checkout]
    C --> P[Lock cart and create immutable attempt plus order]
    P --> X[Create Stripe checkout using attempt idempotency key]
    X --> B[Persist provider session identity]
    B --> R[Redirect buyer]
    R --> V[Verify-session]
    X --> W[Signed webhook]
    V --> N[Normalize provider evidence]
    W --> N
    N --> E[Persist payment event]
    E --> Q{Identity, amount, currency and state valid?}
    Q -->|No| H[Durable review state]
    Q -->|Yes| T[One fulfillment transaction]
    T --> G[Grant plus balance plus financial row plus claims]
    T -->|Failure| Y[Retryable event]
    G --> S[Receipt reports fulfilled]
    H --> S
    Y --> S
```

**Checkout creation interaction**

```mermaid
sequenceDiagram
    participant UI as CheckoutView
    participant API as create-checkout-session
    participant DB as PostgreSQL
    participant SP as Stripe
    UI->>API: POST cartId and fulfillmentIntent
    API->>DB: Lock cart; validate; snapshot; create pending order/attempt
    DB-->>API: attemptId
    API->>SP: Create session; idempotencyKey=attemptId
    alt Response received
        SP-->>API: sessionId and URL
        API->>DB: Conditional bind of sessionId to attempt
        API-->>UI: Checkout URL
    else Timeout or response lost
        API->>DB: Keep prepared attempt recoverable
        API-->>UI: 503 CHECKOUT_PREPARING
        UI->>API: Retry same cart
        API->>SP: Retry same attempt key and parameters
    end
```

**Cart mutation interactions**

```mermaid
sequenceDiagram
    participant UI as Cart
    participant API as Cart mutation routes
    participant DB as PostgreSQL
    UI->>API: POST add / PUT update / DELETE remove or clear
    API->>DB: Lock owning cart in transaction
    alt Active prepared/open attempt
        API-->>UI: 409 CART_CHECKOUT_LOCKED
    else Editable cart
        API->>DB: Validate ownership; mutate rows; update totals
        DB-->>API: Commit
        API-->>UI: Existing success envelope
    end
```

**Payment verification interaction**

```mermaid
sequenceDiagram
    participant UI as SuccessPage
    participant API as verify-session
    participant SP as Stripe
    participant DB as PostgreSQL
    UI->>API: POST sessionId
    API->>SP: Retrieve session
    API->>DB: Resolve owned attempt and durable payment state
    alt Verified paid and reconcilable
        API->>DB: Apply idempotent fulfillment
        API-->>UI: 200 fulfilled
    else Paid but unresolved
        API->>DB: Persist review or pending status
        API-->>UI: 409 review or 503 pending
    else Not paid
        API-->>UI: 409 PAYMENT_NOT_COMPLETE
    end
```

**Webhook and refund interactions**

```mermaid
sequenceDiagram
    participant SP as Stripe
    participant API as Both webhook aliases
    participant DB as PostgreSQL
    SP->>API: Signed completion, expiry, failure or refund event
    API->>API: Verify raw-body signature; normalize allowlisted fields
    API->>DB: Insert unique provider event
    alt Duplicate applied event
        API-->>SP: 200
    else Valid event
        API->>DB: Lock purchase; apply transition and effects
        alt Commit succeeds
            API-->>SP: 200
        else Transient persistence failure
            API-->>SP: 500
        end
    else Permanent mismatch
        API->>DB: Persist review reason
        API-->>SP: 200 only after review receipt commits
    end
```

**Manual payment interaction**

```mermaid
sequenceDiagram
    participant A as Admin
    participant API as apply-payment
    participant DB as PostgreSQL
    A->>API: POST orderId, method, reference, notes
    API->>API: Require admin; validate manual method and reference
    API->>DB: Create/reuse unique manual-payment evidence
    API->>DB: Apply shared fulfillment transaction
    alt Complete
        API-->>A: 200 fulfilled
    else Incomplete
        API-->>A: 503 ALLOCATION_PENDING
    end
```

**Private-media interaction**

```mermaid
sequenceDiagram
    participant UI as Existing media consumer
    participant API as Protected media stream
    participant DB as Ownership/assignment records
    participant S as Private object storage
    UI->>API: Authenticated request for opaque media identity
    API->>DB: Resolve owner and current access
    alt Allowed
        API->>S: Fetch bytes privately
        API-->>UI: Stream; Cache-Control private,no-store
    else Denied or unknown
        API-->>UI: 404
    end
```

**Waiver and AI interactions**

```mermaid
sequenceDiagram
    participant U as Existing intake UI
    participant API as Waiver or onboarding API
    participant DB as PostgreSQL
    participant AI as Provider boundary
    U->>API: Submit intake
    alt Anonymous waiver
        API->>DB: Save unlinked submission
        API-->>U: Received; account verification pending
    else Authenticated self waiver
        API->>DB: Verify version/signature and bind authenticated identity
        API-->>U: Recorded
    else New-client identity capture
        API->>DB: Authorized local form save
        API-->>U: Local draft/result
        Note over API,AI: No identity-bearing provider request
    end
```

**Proposed schema**

This ERD is an exact projection of touched existing columns plus proposed tables. It is **not a claim about deployed schema**. PostgreSQL `timestamptz` corresponds to Sequelize `DATE`; mixed-case columns remain quoted.

```mermaid
erDiagram
    Users ||--o{ shopping_carts : owns
    Users ||--o{ orders : owns
    shopping_carts ||--o{ checkout_attempts : snapshots
    orders ||--o| checkout_attempts : belongs_to
    checkout_attempts ||--o{ payment_events : receives
    orders ||--o| session_credit_grants : grants
    session_credit_grants ||--o{ session_credit_uses : funds
    sessions ||--o{ session_credit_uses : spends

    Users {
        integer id PK
        integer availableSessions
    }
    shopping_carts {
        integer id PK
        integer userId FK
        varchar checkoutSessionId
        varchar paymentIntentId
        boolean sessionsGranted
        numeric total
        numeric subtotal
    }
    orders {
        integer id PK
        integer userId FK
        integer cartId FK
        numeric totalAmount
        timestamptz paymentAppliedAt
    }
    checkout_attempts {
        uuid id PK
        integer cartId FK
        integer orderId FK
        integer userId FK
        varchar state
        varchar currency
        bigint subtotalCents
        jsonb lines
        varchar stripeSessionId UK
        varchar paymentIntentId UK
        varchar reviewCode
        timestamptz expiresAt
        timestamptz createdAt
        timestamptz updatedAt
    }
    payment_events {
        varchar id PK
        uuid attemptId FK
        varchar kind
        jsonb evidence
        varchar state
        integer attempts
        varchar lastErrorCode
        timestamptz nextAttemptAt
        timestamptz receivedAt
        timestamptz processedAt
    }
    session_credit_grants {
        uuid id PK
        integer orderId FK
        integer userId FK
        varchar sourceKey UK
        integer granted
        integer consumed
        integer reversed
        varchar state
        timestamptz appliedAt
    }
    sessions {
        integer id PK
        integer userId FK
        boolean sessionDeducted
    }
    session_credit_uses {
        uuid id PK
        uuid grantId FK
        integer sessionId FK
        integer credits
        varchar state
        timestamptz createdAt
        timestamptz updatedAt
    }
```

**Attempt state machine**

```mermaid
stateDiagram-v2
    [*] --> prepared
    prepared --> open: provider session bound
    prepared --> review: irreconcilable provider response
    open --> expired: provider confirms expiry
    open --> cancelled: provider confirms cancellation
    open --> paid: verified payment
    expired --> paid: delayed verified payment for same attempt
    cancelled --> review: unexpected verified payment
    paid --> fulfilled: atomic allocation
    paid --> review: invalid terms or unavailable fulfillment
    fulfilled --> review: partial refund or ambiguous reversal
    fulfilled --> refunded: full purchase-specific reversal
    paid --> refunded: full refund before allocation
    review --> fulfilled: authorized evidence-backed resolution
    review --> refunded: verified refund resolution
```

**Startup flow**

```mermaid
flowchart LR
    B[Boot] --> V[Verify required migration/schema versions]
    V -->|Match| L[Listen and mark ready]
    V -->|Mismatch| F[Exit nonzero; readiness false]
    M[Separately approved migration job] --> V
```

Out of scope: marketing redesign, new subscription tiers, new AI providers, a new admin dashboard, and autonomous production repair.
