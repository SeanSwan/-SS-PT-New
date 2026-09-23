---
artifact_id: SWAN-CHART-V3-FLOWS
owner: lead Codex
version: 3.0
status: PLANNED MERMAID CONTRACT
supersedes: happy-path-only chart migration diagrams
---

# Architecture and failure paths

These describe the target, not the currently installed system. NEW nodes are explicitly marked.
No schema/ERD is needed: V3 uses existing Session→Log and User→Measurement relationships.
Any schema expansion is a stop-and-ask change, not an implied migration.

## F1 — one consumer system, progressive disclosure

```mermaid
flowchart TD
  Route[Existing client progress route] --> Gate[NEW ClientProgressStoryGate]
  Gate -->|flag false or gate failure| Legacy[Previous page composition]
  Gate -->|flag true and shell valid| Story[NEW ClientProgressStoryV3]
  Story --> Overview[Overview: rhythm and one supporting story]
  Story --> Library[All charts: search and filters]
  Overview --> Store[NEW subject-scoped resources]
  Library --> Store
  Store --> API[NEW version 3 analytics reads]
  API --> Auth{JWT and capabilities valid?}
  Auth -->|no| Denied[Clear data; sign in or locked state]
  Auth -->|yes| Source[Existing sessions, logs, measurements]
  Source --> Normalize[NEW unit and period normalization]
  Normalize -->|query failed| Error[Retryable error, never empty]
  Normalize -->|valid| Envelope[Typed snapshot and capability envelope]
  Envelope --> Frame[Existing SwanChart evolved]
  Frame --> Plot[Victory body: marks only]
  Frame --> Table[Same data and formatters: accessible table]
  Frame --> Detail[One evidence dialog]
  Detail -->|snapshot changed| Refresh[Refresh parent; preserve user intent]
  Story -->|rollback flag| Legacy
```

## F2 — resource lifecycle, including stale and revoked data

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> loading: request known key
  loading --> ready: valid points
  loading --> empty: successful covered query, no observations
  loading --> locked: 402
  loading --> denied: 401 or 403
  loading --> error: transport or decoder failure
  ready --> refreshing: same-key refresh
  empty --> refreshing: explicit refresh or successful save event
  refreshing --> ready: valid replacement
  refreshing --> empty: valid empty replacement
  refreshing --> staleError: failed replacement with previous snapshot
  refreshing --> locked: capability withdrawn
  staleError --> refreshing: manual retry
  error --> loading: manual retry
  locked --> loading: verified entitlement update
  ready --> idle: different query, invalidate selection
  staleError --> idle: different query
  ready --> denied: identity or permission invalid
  refreshing --> denied: identity or permission invalid
  denied --> idle: authenticated new generation
```

Every identity/permission change from ANY state clears sensitive memory before paint. Late
responses carry the old generation and are discarded, including after denied/closed/flag-off.
Range/unit changes may display explicitly labeled old, noninteractive content while fetching;
that visual retention is not cache identity or a state transition back to ready.

## F3 — datum to evidence, cancellation and exact identity

```mermaid
sequenceDiagram
  actor Client
  participant View as Plot or keyboard table
  participant Store as Subject-scoped resource
  participant Sheet as Single evidence dialog
  participant API as V3 detail endpoint
  Client->>View: Activate seriesKey + pointKey
  View->>Store: Resolve current snapshot and capability
  alt detail locked
    Store->>Sheet: Explain required tier; no detail request
  else detail allowed and current
    Store->>Sheet: Loading with captured generation
    Sheet->>API: Authenticated query + snapshotId + asOf
    alt source edited or snapshot expired
      API-->>Sheet: 409 SOURCE_CHANGED or SNAPSHOT_EXPIRED
      Sheet-->>Client: Refresh chart to see current records
    else success
      API-->>Sheet: Owned sessions or measurement, matched total
      Sheet->>Store: Is key and generation still current?
      alt yes
        Store-->>Sheet: Render exact source records
        Client->>Sheet: Open session; inspect full sets
      else no
        Store-->>Sheet: Discard response
      end
    else 401 or 403
      API-->>Store: Permission invalid
      Store->>Sheet: Clear and close
    else temporary failure
      API-->>Sheet: Safe error, manual retry
    end
  end
  Client->>Sheet: Close or navigate back
  Sheet->>Store: Abort and increment generation
  Sheet-->>View: Restore trigger focus and chart scroll
```

## F4 — share is a separate, intentional write

```mermaid
flowchart TD
  Open[Select Share from current owner chart] --> Eligible{Server allowlist and source current?}
  Eligible -->|no| Block[Reason; no preview data or post]
  Eligible -->|yes| Preview[NEW owner-bound preview: metric and period only]
  Preview --> Cancel[Close: no post]
  Preview --> Confirm{Explicit Publish to feed?}
  Confirm -->|no| Preview
  Confirm -->|yes| Check[Recheck identity, expiry, source and idempotency]
  Check -->|revoked or stale| Reject[Refuse; refresh preview]
  Check -->|valid| Post[Existing social service via NEW gated adapter]
  Post -->|success| Receipt[Show posted link once]
  Post -->|ambiguous network result| Status[Resolve existing idempotency result]
  Status -->|already posted| Receipt
  Status -->|unknown| Pause[Stop; do not publish again automatically]
```

## F5 — Luna's slice gate and rollback

```mermaid
flowchart TD
  Start[Read frozen packet and establish current base] --> Claim[Claim exact nonconflicting files]
  Claim --> Audit{Source contract matches plan?}
  Audit -->|no| Ask[Stop affected slice; evidence and one question]
  Audit -->|yes| Red[Run focused behavioral acceptance: expected RED]
  Red -->|already green| Investigate[Prove existing behavior; skip duplicate code]
  Red -->|unexpected failure| Diagnose[Fix test environment, not acceptance meaning]
  Red -->|expected missing behavior| Build[Implement one authorized slice]
  Build --> Green[Focused and sibling tests]
  Green -->|fail| Build
  Green -->|pass| Browser[Mounted route and visual matrix]
  Browser --> Review[Lead hostile review and final decision gate]
  Review -->|revise| Build
  Review -->|accepted| Next[Receipt, release files, next slice]
  Review -->|critical runtime regression| Off[Keep flag off or request authorized rollback]
  Off --> Legacy[Previous composition; additive API remains unused]
  Next --> Deploy{Sean explicitly approves release?}
  Deploy -->|no| Hold[Local tested changes only]
  Deploy -->|yes| Release[Reconcile main and execute release protocol]
```

## Deferred and recovery outcomes

- Missing production-safe test DB: stop integration layer; no default local dev against production.
- Missing exact logger/export/idempotency contract: stop that slice; no invented endpoint.
- Lost network: stale frame labeled; no auto-retry storm; manual retry preserves context.
- Browser refresh: restores no sensitive cache; fetch current subject again. Saved chart IDs only
  may restore after matching identity; selection is not a persisted private record.
- Feature flag off during overlay: close/abort/clear V3, mount whole previous composition;
  never mix a legacy frame and V3 data silently.
- Rollback needs no destructive migration; source data remains authoritative and unchanged.
