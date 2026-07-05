# Checkpoint 050 — Obsidian / Karpathy / Graphify Integration (Batch 5)

- **Date:** 2026-07-03 · **Session:** Fable build pass · **Status:** COMPLETE (cross-check verified)

## What exists
- **Vault taxonomy (canonical, both systems):** `raw/` (unstructured input) · `wiki/` (structured reusable knowledge) · `outputs/` (deliverables/specs/reports) · `runs/` (agent run logs) · `graph-imports/` (quarantined Graphify) · `references/` (canonical docs) · `templates/` (repeatable templates).
- **Routing policy:** `design-brain/obsidian/vault-routing.md` (+ index, design-decision-log-policy) — index.md law (every major folder explains what belongs/doesn't/where-next/canonical-vs-temporary-vs-quarantined/full-read-vs-search/anti-pollution), provenance + stale-date frontmatter, zero client PII (IDs/roles only).
- **Graphify policy:** `design-brain/graphify/graphify-policy.md` (+ index, templates) — don't run unless installed and safe; standalone output first; EVERYTHING quarantined under `graph-imports/`; concept stubs wired back to sources; promotion checklist before anything enters `wiki/`; imports removable; relationship-CHAINS-only trigger.
- **Agentic OS side:** `hermes-agentic-os/memory-and-state.md` — three-brain model (Hermes working memory / vault / Postgres-as-truth) pointing at both bridges.

## Cross-check evidence ([VERIFIED] this session, grep)
- Identical 7-lane taxonomy in `memory-and-state.md` and `vault-routing.md` (exact-match lane names, both files).
- `memory-and-state.md` → 4 references to `design-brain/` bridge paths; `adapters/knowledge.md` → points at `../obsidian` and `../graphify`.
- `graphify-policy.md` → 9 quarantine mentions; `vault-routing.md` → 4 index.md-law mentions.

## Decisions encoded
1. The vault is a derived view — SwanStudios Postgres remains the only source of truth for business data.
2. Quarantine-first: no bulk import ever lands directly in `wiki/`; promotion is a human-reviewed step with recorded source/reason/decision.
3. Graphify is for multi-hop relationship questions only; flat lookups use markdown + search.
4. Design decisions get their own log lane (`design-decision-log-policy.md`) so agents cite precedent instead of re-litigating.

## Continue here if session crashes
This batch is complete; the `AI_VILLAGE_GRAPHIFY_OBSIDIAN` mode (130 packet §1) is the review court for the first real import wave.
