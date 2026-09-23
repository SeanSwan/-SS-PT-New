# 04 — Flowcharts, state and sequence diagrams (Mermaid)

> Rendering disclosure: authored as source only in this planning session — no
> local Mermaid renderer was invoked (disclosed per protocol). Builder task
> S7/B-V4: render with pinned Mermaid and commit `diagrams.html` alongside,
> following the `agent-ready-workout-planner-2026-09-06` packet precedent.
> All paths shown: happy, blocked/denied, error, retry, recovery, rollback.

## 4.1 System context (incl. degrade + kill switch + rollback)

```mermaid
flowchart TD
  subgraph Seats[MCP clients - one per harness]
    CC[Claude Code]
    CX[Codex]
    ZA[ZCode / Z-App]
    KO[Kilo / OpenCode + SuperGrok]
    DS[DeepSeek Harness]
  end
  S[(Swan Coordination MCP server<br/>127.0.0.1:8377 · per-seat tokens)]
  DB[(SQLite WAL<br/>gitignored state)]
  LANE[.ai-workflow/coordination lane projection]
  RQ[review-queue.md append - house format]
  CONSULT[consult-*.mjs child spawns - gated]

  CC & CX & ZA & KO & DS -->|MCP tools| S
  S --> DB
  S -->|project R7| LANE
  S -->|append R5| RQ
  S -->|spawn R6| CONSULT
  OP[Operator Sean] -->|status CLI / force-release| S
  KS{SWAN_COORD_DISABLED?} -->|yes| OFF[server refuses start]
  S -->|crash / killed| DEGRADED[seats fall back to file-lane rules<br/>Rule 67 conventions - no data loss]
  DEGRADED -->|server restart| RESUME[SQLite WAL resume - claims and audit intact]
  ROLLBACK[Rollback = stop server + revert seat configs<br/>file lanes remain authoritative]
```

## 4.2 Claim state machine (R2/R3)

```mermaid
stateDiagram-v2
  [*] --> granted : coord_claim_files path free
  granted --> released : holder coord_release_claims
  granted --> reaped : conflicting claim + PID probe finds holder dead
  granted --> expired : TTL backstop 30 min no renewal
  granted --> force_released : operator status.mjs --force
  released --> [*]
  reaped --> granted : waiting claimer retried and granted
  expired --> granted : next claimer granted
  force_released --> granted : next claimer granted
  note right of granted : conflicting claim while held<br/>returns DENIED_LOCK_HELD + holder + age
```

## 4.3 Sequence — claim conflict, denial, dead-holder recovery (R1–R3, R7)

```mermaid
sequenceDiagram
  participant CX as codex seat
  participant GL as glm seat
  participant S as server
  CX->>S: coord_register agent_id/model/pid
  GL->>S: coord_register agent_id/model/pid
  GL->>S: coord_who_is_active
  S-->>GL: sees codex active within 2 s
  CX->>S: coord_claim_files backend/routes/pay.mjs
  S-->>CX: granted expires_at=+30m
  S->>LANE: project claim to lane file
  GL->>S: coord_claim_files same path
  S->>S: probe codex PID - alive
  S-->>GL: DENIED_LOCK_HELD holder=codex age=41s
  GL->>S: coord_post_activity blocked waiting on pay.mjs
  Note over CX: codex process is killed blue-screen
  GL->>S: coord_claim_files same path retry
  S->>S: probe codex PID - dead reap claim
  S-->>GL: granted audit row reaped written
  S->>LANE: reproject lane file
```

## 4.4 Sequence — gated cross-model consult (R6, Rule 16)

```mermaid
sequenceDiagram
  participant A as any seat
  participant S as server
  participant G as consult-grok.mjs
  A->>S: coord_ask seat=grok confirm_spend=false
  S-->>A: DENIED_SPEND_GATE hint=Rule 16
  A->>S: coord_ask seat=grok confirm_spend=true env unset
  S->>S: SWAN_ALLOW_PAID_CONSULT check
  S-->>A: refused no process spawned audit row
  Note over A,S: Sean sets SWAN_ALLOW_PAID_CONSULT=1 for this run
  A->>S: coord_ask seat=grok confirm_spend=true
  S->>G: spawn --max-tokens 8000 one in flight
  G-->>S: streamed result capped
  S-->>A: ok output_path est_usd counters updated
  A->>S: coord_ask seat=grok second concurrent call
  S-->>A: DENIED_SEAT_BUSY
```
