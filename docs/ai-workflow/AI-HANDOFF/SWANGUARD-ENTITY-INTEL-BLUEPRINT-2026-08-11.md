---
decision: swan-collect is a PORTABLE, zero-dependency entity-intel collector — scope gate + normalized item contract + per-source adapters — consumed by SwanGuard via an operator-assisted ingest. Reusable in any app by copying one folder.
status: open
supersedes: none
---

# SwanGuard Entity Intel — Blueprint

Companion to [`SWANGUARD-ENTITY-INTEL-CONNECTORS-SPEC-2026-08-11.md`](./SWANGUARD-ENTITY-INTEL-CONNECTORS-SPEC-2026-08-11.md)
(the *why*). This is the *how*: architecture, data flow, schema, wireframes, and
the build order.

**Built and passing as of 2026-08-11:** the portable core (`item`, `entity-scope`)
plus the Bluesky and YouTube adapters. 30/30 tests. Bluesky proven live against
the real network. Everything below marked **[BUILT]** exists; **[SPEC]** does not.

---

## 1. The portability contract — why this is a folder, not a feature

Sean's requirement: *"have all these components be something we can use in other
apps too."* That is enforced structurally, not by intent:

| Rule | Consequence |
|---|---|
| **Zero npm dependencies** | Nothing to install. Node built-ins only |
| **Zero repo coupling** | No import escapes `swan-collect/`. No SwanGuard/SS-PT types |
| **All I/O injected** | `fetch` and the clock are parameters. Runs in Node/Deno/Bun/browser, and tests need no network |
| **Pure core** | `item.mjs` imports *nothing at all* |
| **Adapters are data-shaped** | Each exports one frozen `adapter` descriptor. A registry can enumerate without importing internals |

**To reuse: copy `scripts/swan-collect/` into any project.** It works unchanged.
The scope gate is what makes it a *newsroom* tool; drop that and it is a generic
entity collector.

---

## 2. Architecture

```mermaid
graph TB
    subgraph OP["🖥️ Operator machine — residential IP"]
        CLI["swan-collect runner<br/><i>[SPEC]</i>"]
        GATE["entity-scope.mjs<br/>fail-closed allowlist<br/><b>[BUILT]</b>"]
        NORM["item.mjs<br/>normalize · caps · no fabrication<br/><b>[BUILT]</b>"]
        subgraph AD["Adapters — one per source"]
            BS["bluesky.mjs<br/>no key <b>[BUILT]</b>"]
            YT["youtube.mjs<br/>free API <b>[BUILT]</b>"]
            RSS["rss.mjs<br/><i>[SPEC]</i>"]
            MA["mastodon.mjs<br/><i>[SPEC]</i>"]
            XA["x.mjs — vendor<br/><i>[SPEC, LAST]</i>"]
        end
    end

    subgraph SRC["🌐 Sources"]
        S1["Bluesky AppView<br/>public-no-auth"]
        S2["YouTube Data API v3<br/>official-api"]
        S3["RSS / Atom"]
        S4["Mastodon"]
        S5["Vendor API"]
    end

    subgraph SG["🛡️ SwanGuard server — never fetches a platform"]
        ING["POST /connectors/ingest<br/>owner auth · caps · replay guard<br/><i>[SPEC]</i>"]
        REC["reconcile()<br/>added / updated / retracted<br/><b>[BUILT]</b>"]
        DB[("connector_items<br/>+ states + receipts")]
        UI["Entity timeline UI<br/><i>[SPEC]</i>"]
    end

    GATE -->|allowed only| AD
    CLI --> GATE
    BS --> S1
    YT --> S2
    RSS --> S3
    MA --> S4
    XA --> S5
    AD --> NORM
    NORM -->|signed batch| ING
    ING --> REC --> DB --> UI

    style GATE fill:#7f1d1d,stroke:#f87171,color:#fff
    style ING fill:#78350f,stroke:#fbbf24,color:#fff
    style NORM fill:#164e63,stroke:#22d3ee,color:#fff
```

**The load-bearing decision:** the server never makes an outbound call to a social
platform. That is what keeps SwanGuard off datacenter-IP blocklists *and* leaves
the SSRF surface hardened in packet 3 completely untouched.

---

## 3. Collection flow

```mermaid
flowchart TD
    A([Operator names an entity]) --> B{checkEntity}
    B -->|OUT_OF_SCOPE| B1["❌ Deny + explain<br/>'does not build profiles<br/>of private individuals'"]
    B -->|CITATION_REQUIRED| B2["❌ Deny — demand a URL"]
    B -->|allowed| C{Handle bound<br/>for this source?}

    C -->|no| D["Discovery: searchActors<br/>+ getProfiles enrichment"]
    D --> E{"Human confirms<br/>which account"}
    E -->|impersonator| B1
    E -->|confirmed| F[Store handle + DID]
    C -->|yes| F

    F --> G["adapter.collect()"]
    G --> H["normalizeItem()<br/>strip markup · cap · date-or-null"]
    H --> I{windowComplete?}
    I -->|yes| J["reconcile with retraction"]
    I -->|no| K["reconcile WITHOUT retraction<br/>⚠ partial page must never<br/>mass-retract"]
    J --> L[Signed batch → ingest]
    K --> L
    L --> M[(Store + receipt)]

    style B1 fill:#7f1d1d,stroke:#f87171,color:#fff
    style B2 fill:#7f1d1d,stroke:#f87171,color:#fff
    style K fill:#78350f,stroke:#fbbf24,color:#fff
```

## 4. Sync sequence

```mermaid
sequenceDiagram
    autonumber
    participant O as Operator
    participant C as swan-collect
    participant P as Platform
    participant S as SwanGuard API
    participant D as Postgres

    O->>C: collect --entity "Reuters"
    C->>C: assertCollectable() — fail-closed
    C->>P: adapter.collect (paged, bounded)
    P-->>C: raw records + cursor
    C->>C: normalizeItem — caps, strip, date-or-null
    Note over C: publishedAt unparseable → null.<br/>NEVER "now".
    C->>S: POST /ingest {batch, windowComplete, nonce}
    S->>S: owner auth · size cap · replay check
    S->>D: SELECT prior items for (source, entity)
    D-->>S: previous set
    S->>S: reconcile()
    alt windowComplete
        S->>D: UPSERT added/updated + stamp retracted
    else partial
        S->>D: UPSERT added/updated only
        Note over S,D: retraction suppressed —<br/>a truncated page is not evidence<br/>of deletion
    end
    S->>D: write sync receipt (collector identity, counts, quota)
    S-->>O: receipt
```

## 5. Data model

```mermaid
erDiagram
    ENTITY ||--o{ ENTITY_HANDLE : "has"
    ENTITY ||--o{ CONNECTOR_ITEM : "authored"
    SOURCE ||--o{ CONNECTOR_ITEM : "supplied"
    SOURCE ||--o{ SYNC_RECEIPT : "logs"

    ENTITY {
        uuid id PK
        text name
        text category "organization|official|brand_account|public_figure"
        text citation "REQUIRED for official + public_figure"
        timestamptz created_at
    }
    ENTITY_HANDLE {
        uuid entity_id FK
        text source_key
        text handle
        text stable_id "DID / channelId — survives renames"
        bool confirmed "human-confirmed, never auto-bound"
    }
    CONNECTOR_ITEM {
        text source_key PK
        text external_id PK
        uuid entity_id FK
        text kind "post|video|article|release"
        text title
        text body
        text canonical_url
        timestamptz published_at "NULLABLE — never guessed"
        timestamptz fetched_at
        timestamptz last_seen_at
        timestamptz retracted_at "withdrawn by source"
        text source_tier
        text terms_posture "official-api|public-no-auth|vendor-licensed|tos-gray"
        text fetch_method
    }
    SYNC_RECEIPT {
        uuid id PK
        text source_key
        text collector_identity
        int added
        int updated
        int retracted
        bool window_complete
        int quota_units_spent
        timestamptz synced_at
    }
```

`published_at` being **nullable** is the schema encoding the no-fabrication rule.
A `NOT NULL` column would force a guess at insert time — the constraint itself
would manufacture false evidence.

---

## 6. Wireframes

**Desktop — entity timeline**

```
┌──────────────────────────────────────────────────────────────────────────┐
│  SwanGuard ▸ Entities                                    [＋ Add entity] │
├───────────────┬──────────────────────────────────────────────────────────┤
│ ENTITIES      │  Reuters                          🏢 organization        │
│               │  ──────────────────────────────────────────────────────  │
│ 🏢 Reuters  ● │  Sources   ✔ Bluesky @reuters.com   ✔ YouTube @Reuters   │
│ 🏢 AP       ● │            ＋ add source                                  │
│ 🏛 City Hall ⚠│  Last sync 4 min ago · next in 26 min      [Sync now]     │
│ 🏷 Acme Corp● │  ──────────────────────────────────────────────────────  │
│               │  [ All ] [ Posts ] [ Video ] [ Withdrawn 1 ]             │
│ ── filters ── │                                                          │
│ ☑ organization│  ┌────────────────────────────────────────────────────┐  │
│ ☑ official    │  │ 🦋 Bluesky · 2 min ago         public-no-auth  ⓘ  │  │
│ ☑ brand       │  │ Oil, gold prices rise as geopolitical tensions     │  │
│ ☐ public fig. │  │ mount before CPI data                              │  │
│               │  │ ♥ 42  ⇄ 18  💬 7            ↗ open on bsky.app     │  │
│ ── posture ── │  └────────────────────────────────────────────────────┘  │
│ ● official    │  ┌────────────────────────────────────────────────────┐  │
│ ● no-auth     │  │ ▶ YouTube · 3 h ago              official-api  ⓘ  │  │
│ ○ vendor      │  │ Nvidia's plan for the China market — explained     │  │
│ ○ gray        │  │ 12:04 · published 2026-08-11        ↗ youtube.com  │  │
│               │  └────────────────────────────────────────────────────┘  │
│               │  ┌────────────────────────────────────────────────────┐  │
│               │  │ ⊘ WITHDRAWN BY SOURCE · last seen 2026-08-10       │  │
│               │  │ (retained for accountability — not shown as live)  │  │
│               │  └────────────────────────────────────────────────────┘  │
└───────────────┴──────────────────────────────────────────────────────────┘
```

Every card carries its **posture badge**. A reader can always see whether an item
came from an official API or a gray path — the credibility claim is on the card,
not buried in a settings page.

**Add-entity — the scope gate made visible**

```
┌────────────────────────────────────────────┐
│  Add entity                          ✕     │
├────────────────────────────────────────────┤
│  Name                                      │
│  ┌──────────────────────────────────────┐  │
│  │ Reuters                              │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  Category                                  │
│  ( ● ) 🏢 Organization                     │
│  ( ○ ) 🏛 Public official     ← needs cite │
│  ( ○ ) 🏷 Brand account                    │
│  ( ○ ) 👤 Public figure       ← needs cite │
│                                            │
│  ┌────────────────────────────────────────┐│
│  │ ⓘ SwanGuard does not build profiles of ││
│  │   private individuals. Officials and   ││
│  │   public figures need a source showing ││
│  │   why they are public.                 ││
│  └────────────────────────────────────────┘│
│                        [Cancel] [ Continue]│
└────────────────────────────────────────────┘
```

**Handle confirmation — the impersonation defence, driven by real data**

```
┌──────────────────────────────────────────────────────┐
│  Which Bluesky account is Reuters?                    │
├──────────────────────────────────────────────────────┤
│ ( ● ) reuters.com                    346,118 followers│
│       Reuters                              98,879 posts│
│ ─────────────────────────────────────────────────────│
│ ( ○ ) reutersinstitute.bsky.social    31,389 followers│
│       Reuters Institute · "future of journalism"      │
│ ─────────────────────────────────────────────────────│
│ ( ○ ) reuters-world-rss.bsky.social   19,216 followers│
│       ⚠ "This bot completed its mission."             │
│ ─────────────────────────────────────────────────────│
│  Never auto-bound — a wrong bind attributes someone   │
│  else's words to this entity.                         │
│                              [Cancel] [Confirm]       │
└──────────────────────────────────────────────────────┘
```

*(Those three accounts and their counts are **real**, returned live on 2026-08-11.
The third is exactly the failure this screen prevents.)*

**Mobile (375px)**

```
┌─────────────────────┐
│ ☰  Reuters      ⟳   │
├─────────────────────┤
│ 🏢 organization      │
│ ✔ Bluesky ✔ YouTube │
│ synced 4 min ago    │
├─────────────────────┤
│ [All][Post][Vid][⊘] │
├─────────────────────┤
│ ┌─────────────────┐ │
│ │🦋 2 min · no-auth│ │
│ │Oil, gold prices │ │
│ │rise as tensions │ │
│ │mount before CPI │ │
│ │♥42 ⇄18      ↗   │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │▶ 3 h · official │ │
│ │Nvidia's China   │ │
│ │plan — explained │ │
│ │12:04        ↗   │ │
│ └─────────────────┘ │
└─────────────────────┘
  44px targets · single
  column · badge stays
```

---

## 7. Build order

| # | Slice | State |
|---|---|---|
| 1 | Portable core — `item`, `reconcile`, `entity-scope`, `http` | **✅ BUILT** |
| 2 | Bluesky adapter (no key) | **✅ BUILT + live-proven** |
| 3 | YouTube adapter (free API, quota-frugal) | **✅ BUILT — unit-tested only, no key in session** |
| 4 | Runner + registry + store | **✅ BUILT + live-proven** |
| 5 | RSS/Atom adapter | **✅ BUILT + live-proven (NPR, Reddit, YouTube feeds)** |
| 6 | Mastodon adapter | **✅ BUILT + live-proven** |
| 7 | Vendor adapter — X / IG / TikTok / FB / LinkedIn / Threads | **✅ BUILT, ships DISABLED, no provider account to prove it** |
| 8 | Ingest endpoint (auth, caps, replay guard, receipts) | ⬜ **next** — SwanGuard repo, widest attack surface |
| 9 | Entity + handle tables, confirmation UI | ⬜ |
| 10 | Timeline UI incl. withdrawn state | ⬜ |

### Source reality, MEASURED 2026-08-11/12 (residential IP, no credentials)

| Platform | Keyless? | Evidence |
|---|---|---|
| Bluesky | ✅ | search / resolve / paged feed / getProfiles all 200, no auth |
| Mastodon | ✅ | accounts/lookup + statuses 200, no auth |
| RSS/Atom | ✅ | NPR 200 · **Reddit `/r/news/.rss` 200 while its JSON API is 403 even with a browser UA** · YouTube channel feed 200 for some ids, 404 for others |
| YouTube API | ✅ free | 10,000 units/day; `channels`/`playlistItems` = 1 unit each |
| Instagram | ❌ | `?__a=1` → 400 |
| X | ❌ | `cdn.syndication.twimg.com` → 200 with **ZERO bytes** |
| TikTok | ❌ | 200, but 364 KB of SPA shell HTML |
| Facebook | ❌ | 200, but 480 KB of login-walled HTML |

The bottom four are why the vendor adapter exists as ONE component rather than four scrapers.

### Known limitations (stated plainly)

- **RSS never retracts.** A feed is a truncated window, so `windowComplete` is always false and
  items only ever accumulate. If a publisher deletes an article, RSS will not tell us.
- **YouTube and vendor adapters are unit-tested only** — no API key and no vendor account exist
  in this session. Their live behaviour is unproven.
- **Portability is precise:** `core/` and `adapters/` are universal (fetch injected, zero deps).
  `run.mjs` imports `node:url` and is Node-only by nature (it is a CLI); `core/store.mjs` lazily
  imports `node:fs/promises` only when no filesystem is injected.
- **DNS rebinding is unaddressed** in the Mastodon host guard — a hostname that passes validation
  but resolves internally. Low consequence operator-side; would need attention server-side.

## 8. What a hostile reviewer should attack first

Ranked by blast radius:

1. **`/connectors/ingest`** — widest new surface. It accepts attacker-shaped data
   if the operator credential leaks. Batch size caps, replay/nonce handling,
   per-collector attribution, and whether `windowComplete` can be forged to
   trigger mass-retraction (a denial-of-truth attack).
2. **`reconcile` retraction logic** — can a partial page, a duplicate cursor, or a
   source returning `[]` on error cause mass false retraction?
3. **`normalizeItem`** — can markup survive strip→clip? Can a crafted URL pass
   `safeHttpUrl` and still be dangerous downstream? ReDoS on multi-MB text?
4. **`entity-scope`** — any path to a private individual: prototype pollution
   (guarded via `hasOwnProperty` — verify), category confusion, handle injection
   through `sanitizeHandles`.
5. **Adapters** — can a hostile feed body cause unbounded memory? Does the
   YouTube key leak into any log/error? Can a repost be attributed to the wrong
   entity?
6. **Quota** — can a resolve-loop silently burn 10,000 YouTube units?
