# Knowledge Adapter — Design Knowledge → Obsidian & Graphify

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL as the pointer; real policy lives in `../obsidian/` and `../graphify/`
- **Merged file** (see `index.md` §3): the obsidian + graphify adapters collapsed into this thin router — both were pointers, and pointers don't deserve two files.

---

## 1. What flows where

Design work throws off durable knowledge: decision logs, concept directions, arbitration overrides, QA findings that reveal doctrine gaps. That knowledge has exactly two destinations, in order:

| Artifact | First lands in | Promoted to | Policy doc |
|---|---|---|---|
| Design decision log entries | vault `outputs/design-decisions/` | `wiki/` when reusable across surfaces | `../obsidian/design-decision-log-policy.md` |
| Concept direction docs (Fable §2 gate output) | vault `outputs/` (deliverable) | `wiki/` only if the direction becomes standing doctrine | `../obsidian/vault-routing.md` |
| Arbitration overrides (doctrine vs Gemini/Village) | decision log (above) | same path | `../obsidian/design-decision-log-policy.md` |
| QA receipts / run artifacts | vault `runs/` | rarely promoted; summarized into decisions instead | `../obsidian/vault-routing.md` |
| Mobbin/external-reference receipts | vault `outputs/` or `runs/` | promoted principles only, never raw screenshots/connector URLs | `../external-reference-mcp.md` + `../obsidian/vault-routing.md` |
| Design concepts as **graph nodes** | `graph-imports/` (quarantine) | `wiki/` **only after** the promotion checklist | `../graphify/graphify-policy.md` |

## 2. The two hard rules this adapter enforces

1. **Outputs first, wiki by promotion.** Nothing an agent produces lands directly in `wiki/` — deliverables go to `outputs/`, run logs to `runs/`, and only demonstrated-reusable knowledge is promoted, with provenance frontmatter. Direct-to-wiki writes are pollution (see anti-pollution rules in `../obsidian/vault-routing.md`).
2. **Graph nodes only after promotion.** A design concept becomes a Graphify node only once it has survived quarantine and the promotion checklist in `../graphify/graphify-policy.md`. No agent bulk-imports design docs into the graph; flat lookups don't need a graph at all — Graphify earns its keep only on multi-hop relationship questions.

## 3. What this adapter is NOT

- Not the routing policy (→ `../obsidian/vault-routing.md`)
- Not the decision-log format (→ `../obsidian/design-decision-log-policy.md`)
- Not the quarantine/promotion mechanics (→ `../graphify/graphify-policy.md`, templates in `../graphify/templates.md`)
- Not a license to write PII anywhere: IDs/roles only, zero client names, zero secrets (rule 8) — in vault, logs, and graph alike.
- Not a license to preserve raw Mobbin material: keep distilled principles, Swan translations, and decisions; leave screenshots, connector URLs, account data, and copied UI out of Git and the vault.

## 4. Verification before done (any agent writing design knowledge)

- [ ] Artifact routed per the §1 table — nothing written directly into `wiki/`
- [ ] Decision-worthy outcomes (direction picked, override made, doctrine gap found) actually logged, not just mentioned in chat
- [ ] Provenance + date frontmatter present on anything ingested or promoted
- [ ] Zero PII / secrets in the written artifact
- [ ] External-reference material is distilled only; no raw screenshots, connector URLs, or copied proprietary UI
- [ ] Graph writes (if any) went to `graph-imports/` quarantine, never straight to promoted namespaces
