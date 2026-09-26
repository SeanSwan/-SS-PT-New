**Candidate r3 — 2026-09-24. Owner: Astra document repair. Design contract only; implementation and product tests NOT RUN.**

Mandatory companion to [01-architecture.md](01-architecture.md); same scope, bindings, and pending approvals.

**Logical data relationships**

The following is a **proposed wire-domain ERD**. Field types are exact JSON-contract types; it is not a representation of current PostgreSQL columns.

```mermaid
erDiagram
    Subject ||--o{ Connection : owns
    Subject ||--o{ ConsentEvent : authorizes
    Connection ||--o{ Observation : supplies
    ImportBatch ||--o{ Observation : imports
    Observation ||--o{ ObservationRevision : revises
    CoachSnapshot }o--o{ Observation : references
    Subject ||--o{ VideoSession : participates
    VideoSession ||--o{ AssessmentNote : records
    EarningsPolicy ||--o{ EarningsEvent : governs
    EarningsEvent ||--|{ JournalLine : posts
    Payout ||--o{ EarningsEvent : reconciles

    Subject {
        string id PK
        string userId
        string dataGeneration
    }
    Connection {
        string id PK
        string subjectId FK
        string provider
        string status
        string sourceLabel
        string connectedAt
    }
    ImportBatch {
        string id PK
        string subjectId FK
        string source
        string fileHash
        string parserVersion
        string status
        string receivedAt
    }
    Observation {
        string id PK
        string subjectId FK
        string connectionId FK
        string importId FK
        string metric
        number value
        string unit
        string observedStart
        string observedEnd
        string receivedAt
        string sourceKey
        string provenanceHash
        string originalRecordKey
        string sourceRevision
        string quality
        string supersedesId
    }
    ObservationRevision {
        string id PK
        string observationId FK
        string supersedesId FK
        string reason
        string createdAt
    }
    ConsentEvent {
        string id PK
        string subjectId FK
        string actorUserId
        string purpose
        boolean granted
        string textVersion
        string recordedAt
    }
    CoachSnapshot {
        string id PK
        string subjectId FK
        string approvedByUserId
        string createdAt
        string contentHash
    }
    VideoSession {
        string id PK
        string trainerUserId
        string clientUserId
        string status
        number version
        string createdAt
    }
    AssessmentNote {
        string id PK
        string sessionId FK
        string authorUserId
        string text
        number version
        string createdAt
    }
    EarningsPolicy {
        string id PK
        string trainerUserId
        string currency
        number trainerBps
        number platformBps
        string effectiveAt
        string status
    }
    EarningsEvent {
        string id PK
        string trainerUserId
        string policyId FK
        string sourceEventKey
        string kind
        string occurredAt
        string currency
    }
    JournalLine {
        string id PK
        string eventId FK
        string account
        string debitMinor
        string creditMinor
        string currency
    }
    Payout {
        string id PK
        string trainerUserId
        string sourcePayoutKey
        string amountMinor
        string currency
        string status
        string reconciledAt
    }
```


The observation is the immutable clinical revision; `ObservationRevision` is its audit metadata, not another competing value store. Active-reading views exclude quarantined, superseded, or erased observations. Previews reference exact observation IDs/revisions plus the subject generation; approval never recomputes different content silently. These are logical requirements, not authority to infer physical SQL types.
