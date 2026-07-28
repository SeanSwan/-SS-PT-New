# 01 — Architecture

## Overview

Seven-layer Cortex (v2 spec §B3). Phase 1 builds Layers 1–3 storage + the Layer-4 approval
workflow + one Layer-7 event log:

```mermaid
flowchart TD
    subgraph L1 [Layer 1 - Source Library]
        KS[knowledge_sources] --> SF[source_files metadata only]
        CR[credentials] & CE[continuing_education] & WS[workshops] --> KS
        WN[workshop_notes] --> WS
    end
    subgraph L23 [Layers 2-3 - Concepts and Rules]
        KC[knowledge_concepts]
        KR[knowledge_rules]
        KR -->|rule_sources| KS
        KR --> RV[rule_versions]
        KR --> RC[rule_conflicts]
    end
    subgraph L4 [Layer 4 - SWAN Methodology]
        VAULT[coach-brain vault markdown]
        APPROVE[Sean approval workflow status enum on knowledge_rules]
    end
    subgraph RUNTIME [Runtime]
        SVC[swanCoachCortexService.mjs EXISTING - extended]
        WB[workoutBuilderService.mjs EXISTING - untouched in P1]
    end
    subgraph L7 [Layer 7 - Outcomes]
        PE[progression_events]
        CHARTS[Victory charts and custom chart builder]
    end
    KS --> KC --> KR
    KR -->|Sean Approved only| SVC
    VAULT --> SVC
    SVC --> WB
    PE --> CHARTS
    ADMIN[Admin Knowledge Console UI] --> KR
    ADMIN --> KS
```

Key architectural rulings (already decided — do not re-decide):
- **Vault stays.** `docs/ai-workflow/coach-brain/` markdown remains the doctrine home; the DB
  rules layer complements it. The extended service exposes BOTH under one API.
- **Restricted source binaries live OUTSIDE this repo** (Hermes vault / private R2).
  `source_files` stores metadata + `storageLocation` string only. NEVER file bytes, NEVER a
  public URL to copyrighted material.
- **Approval = fields on `knowledge_rules`** (`status`, `approvedByUserId`, `approvedAt`) copying
  the proven `LongTermProgramPlan` pattern — NOT a separate approvals table. History lives in
  `rule_versions` (immutable snapshots, copying the `WaiverVersion` pattern).
- **Audit:** reuse `AiCommandAuditLog` shape conventions for the new `logKnowledgeAudit` helper —
  do NOT create a fifth audit table; knowledge admin actions write to `rule_versions` +
  a `changeNote`, and destructive-ish actions (reject/merge/archive) also write an
  `AiCommandAuditLog` row (existing model).

## Sequence — Sean approves a rule

```mermaid
sequenceDiagram
    participant UI as Knowledge Console (admin)
    participant API as /api/cortex/rules
    participant DB as PostgreSQL
    participant SVC as swanCoachCortexService
    UI->>API: PUT /api/cortex/rules/:id/status {status:'sean_approved', changeNote}
    API->>API: requireAdmin + flag check
    API->>DB: SELECT rule (404 if missing)
    API->>DB: INSERT rule_versions (snapshot of CURRENT row, versionNumber = n+1)
    API->>DB: UPDATE knowledge_rules SET status, approvedByUserId, approvedAt
    API->>DB: INSERT AiCommandAuditLog (action:'cortex_rule_status')
    API->>SVC: invalidateKnowledgeCache()
    API-->>UI: 200 {success:true, rule}
    Note over SVC: next generation call reloads<br/>Sean-Approved rules from DB
```

## Sequence — runtime rule loading

```mermaid
sequenceDiagram
    participant WB as workoutBuilderService
    participant SVC as swanCoachCortexService
    participant DB as knowledge_rules
    WB->>SVC: getCortexPolicy()
    SVC->>SVC: vault policy (existing, cached)
    SVC->>DB: findAll status='sean_approved' AND isActive (cached 5 min)
    SVC-->>WB: {vaultPolicy, knowledgeRules[]}
    Note over WB: P1 = rules AVAILABLE on the policy object.<br/>Consuming them in candidate filtering is Phase 3.
```

## ER diagram (new tables only; `Users` is the existing PascalCase table)

```mermaid
erDiagram
    Users ||--o{ knowledge_sources : createdBy
    knowledge_sources ||--o{ source_files : has
    workshops ||--o{ workshop_notes : has
    credentials }o--|| knowledge_sources : optional_source
    continuing_education }o--|| knowledge_sources : optional_source
    workshops }o--|| knowledge_sources : optional_source
    knowledge_concepts }o--o{ knowledge_sources : via_conceptSourceIds_JSONB
    knowledge_rules ||--o{ rule_sources : cited_by
    rule_sources }o--|| knowledge_sources : cites
    knowledge_rules ||--o{ rule_versions : snapshots
    knowledge_rules ||--o{ rule_conflicts : sideA
    knowledge_rules ||--o{ rule_conflicts : sideB
    Users ||--o{ knowledge_rules : approvedBy
    Users ||--o{ progression_events : client
    progression_events }o--|| Exercises : optional_exercise
```

Exact columns/types: `03-contracts.md`. 11 new tables total:
`knowledge_sources, source_files, credentials, continuing_education, workshops, workshop_notes,
knowledge_concepts, knowledge_rules, rule_sources, rule_versions, rule_conflicts` + 1 event table
`progression_events` (covers regression too via `direction` enum — one table, ratified 5c).

## Rule status state machine

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> extracted
    draft --> needs_sean_review
    extracted --> needs_source_verification
    extracted --> needs_sean_review
    needs_source_verification --> needs_sean_review
    needs_sean_review --> sean_approved
    needs_sean_review --> draft : rejected (changeNote required)
    sean_approved --> superseded : new version approved
    sean_approved --> deprecated
    sean_approved --> restricted_use
    deprecated --> archived
    superseded --> archived
    note right of sean_approved : ONLY this status is loaded at runtime
```

Full label set from the v1 spec is stored in the `status` ENUM (03-contracts); the state machine
above is the enforced transition set — the API rejects transitions not drawn here (400
`invalid_status_transition`).
