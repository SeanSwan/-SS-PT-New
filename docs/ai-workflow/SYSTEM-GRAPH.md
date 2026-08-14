---
decision: The system graph is a generated, queryable snapshot — not a graph database
status: shipped
supersedes: none
---

# The System Graph — how any agent "sees" SwanStudios

Two artifacts, one source of truth. Regenerate before trusting either.

| Artifact | For | Path |
|---|---|---|
| `system-graph.json` | machines | `docs/ai-workflow/system-graph.json` |
| `query-system-graph.mjs` | agents (query it, don't load it) | `backend/scripts/` |
| Published map | Sean's eyes | artifact `7b4734ab-1743-46c4-935b-90a47ce4ace1` |

## Agents: query, do not load

The snapshot is ~72 KB. Loading it to answer "what touches Users?" wastes context.
Ask instead:

```bash
node backend/scripts/query-system-graph.mjs neighbors workout_logs
node backend/scripts/query-system-graph.mjs path Users workout_logs   # → 2 hops
node backend/scripts/query-system-graph.mjs orphans                   # 33 unattached
node backend/scripts/query-system-graph.mjs components                # 41 clusters
node backend/scripts/query-system-graph.mjs empty --connected         # wired, never used
node backend/scripts/query-system-graph.mjs unindexed                 # rows but no index
node backend/scripts/query-system-graph.mjs hubs 10
```

Table names resolve case-insensitively, so `users` finds `"Users"` without the
caller needing to know Postgres folding rules.

## This is a catalog, not a knowledge graph

Rule 72 stands. There is no vector store, no embedding, no graph engine, no LLM in
the query path — a generated file and a deterministic script, the same shape as
`CATALOG.md`. It earns its place because these are genuinely CHAIN questions
("does anything connect A to B, and through what?") which grep cannot answer.
Flat lookups still belong to grep.

**A row is a pointer, never canon.** The snapshot is true as of `generatedAt`; the
database is the authority. The query tool warns past 7 days. Regenerate with:

```bash
node backend/scripts/export-system-graph.mjs > docs/ai-workflow/system-graph.json
```

The exporter is strictly read-only — `pg_catalog` plus `COUNT(*)`, no DDL, no DML.

## What it showed on first run (2026-08-14)

- **`Users` carries 60% of every foreign key in the database** (238 of 396). It is
  the single point every schema decision routes through.
- **158 of 254 tables (62%) hold zero rows** — the schema is largely scaffolding.
- **41 disconnected components.** Beyond 33 fully-isolated tables, whole features
  have no path to `Users` at all: the 8-table `gallery_*` cluster, `leads` +
  `lead_activities` (marketing data unattached to any user), `Factions` +
  `FactionMemberships`, `flags` + `flag_overrides`, `e2ee_key_bundles` +
  `e2ee_one_time_prekeys`, `Parties` + `PartyMembers`.
- Only `SequelizeMeta` is populated-but-barely-indexed — the 108-index campaign
  did its job.

Whether those detached clusters are correct (deliberately standalone) or drift
(should reference `"Users"`) is a real question for the orphan-disposition slice.
