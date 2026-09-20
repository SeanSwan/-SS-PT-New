# 04 — Flows (Mermaid) — Creator Brains Console

Rendering note: authored as valid mermaid source; this packet was written in a terminal agent — open in any mermaid-capable viewer (GitHub renders these in-place). Diagrams cover happy, blocked, error, cancel/defer, retry and recovery paths.

## F1 — Daily pass from the console (happy + blocked + error + recovery)

```mermaid
flowchart TD
  A[Operator clicks RUN\nops/hour default 20] --> B{Client validation\npositive integer?}
  B -- no --> B1[inline refusal\nnothing sent]
  B -- yes --> C[POST /api/run/daily]
  C --> D{Bridge: lock free\nand inputs valid?}
  D -- no --> D1[409 RUN_LOCKED\nshow holder pid/host]
  D -- yes --> E[Spawn run-daily.mjs\nreturn run id]
  E --> F[Poll /api/run every ~2s\njournal + budget + throttle + lock]
  F --> G{journal.status?}
  G -- running --> F
  G -- ok --> H[verdict: COMPLETED\ncounts + digest link]
  G -- failed --> I[verdict: FAILED\nphase + reason surfaced\nexit-code contract]
  I --> J{Recovery choices}
  J -- throttle tripped --> K[show cooldown +\nthrottle --clear hint T2]
  J -- yt-dlp missing --> L[canary CTA T0]
  J -- transient --> A
  H --> M[node pulse ≤1 beat\ncoverage arcs update]
```

## F2 — Add creator → enable → daily fold-in (happy + validation + refused)

```mermaid
sequenceDiagram
  participant O as Operator
  participant UI as Console
  participant BR as Bridge
  participant EN as Engine lib
  O->>UI: paste @handle / URL / UCid
  UI->>BR: POST /api/creators {ref}
  BR->>EN: addCreator({ref})
  alt invalid ref
    EN-->>BR: refused reason
    BR-->>UI: 422 + reason (inline, nothing mutated)
  else ok
    EN-->>BR: creator (DISABLED)
    BR-->>UI: 201 row (arrives OFF — deliberate act to enable)
  end
  O->>UI: pick row → ENABLE
  UI->>BR: PATCH /api/creators/:channelId {enabled:true}
  BR->>EN: setEnabled(...)
  EN-->>BR: creator ON
  BR-->>UI: 200 (toast "ON — daily pass will build this brain")
  Note over EN: next daily pass discovers + fetches + rebuilds<br/>damaged registry ⇒ 409 STORE_DAMAGED naming file
```

## F3 — Ask the brains (happy / no-hit / damaged / skipped honesty)

```mermaid
flowchart TD
  A[Query box + optional creator filter] --> B[GET /api/query]
  B --> C{current.json pointer\nresolves?}
  C -- no --> C1[empty generation ⇒ honest zero hits\ncreator publishes empty, not stale]
  C -- yes --> D[queryBrains on published rules.jsonl]
  D --> E{hits?}
  E -- yes --> F[cited rows: key phrase, creator,\n▶watch at t_start_ms]
  E -- no --> G[zero-hit copy NAMES the searched terms\nnever "creator never said that"]
  D --> H[skipped/unparseable rows rendered\nas visible ⚠ list]
```

## F4 — Bridge failure & rollback paths

```mermaid
flowchart TD
  A[Bridge error paths] --> B[store read damaged]
  A --> C[unknown route]
  A --> D[mutation refused by engine]
  A --> E[bridge process dead]
  B --> B1[409 STORE_DAMAGED {file}\nUI refusal banner - action blocked not faked]
  C --> C1[404 envelope]
  D --> D1[422 + engine reason string verbatim]
  E --> E1[.cmd closed / bridge restart = full recovery\nstore is on disk - console holds no truth]
  F[Rollback whole console] --> F1[delete console/ dir + Desktop cmd\nengine CLI unchanged - zero data impact]
```

## F5 — Best-state transfer to SwanGuard (gated slice S7 — runs only on Sean's go)

```mermaid
flowchart TD
  A[S0-S6 exit evidence green] --> B[Design dual-pass + QA matrix pass]
  B --> C[Snapshot: git tag + copied tree + hashes recorded]
  C --> D{Sean says transfer}
  D -- no --> E[standalone remains canonical\ncopy stays in snapshot]
  D -- yes --> F[Copy package into SwanGuard-Newsroom\nSwanGuardAdapter spec handed off]
  F --> G[SwanGuard builds + its own review chain\nSS-PT console untouched]
```
