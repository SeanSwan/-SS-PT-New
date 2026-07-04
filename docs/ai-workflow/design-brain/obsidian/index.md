# Design Brain — Obsidian Bridge Index

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (policy layer only — the vault itself lives outside this repo)

---

## 1. Purpose

This folder is the **policy bridge** between SwanStudios design work and the Obsidian/Karpathy-wiki knowledge vault. It defines how design knowledge is routed, logged, and promoted — so the vault compounds instead of silting up. It is the "second brain" contract referenced by the registry (`docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` §10: "Obsidian/Karpathy wiki routing … + index.md law").

## 2. Map

| File | What it governs |
|---|---|
| `vault-routing.md` | The lane structure (raw/wiki/outputs/runs/graph-imports/references/templates), the index.md law, the command-center bridge, the doc-family → lane map, anti-pollution rules |
| `design-decision-log-policy.md` | Format, location, and citation discipline for design decision log entries |

Consumers arrive here via `../adapters/knowledge.md`. The Graphify side is `../graphify/index.md`.

## 3. What belongs here / what does not

- **Belongs:** routing policy, lane definitions, the index.md law, decision-log policy, anti-pollution rules, the vault↔command-center read-only bridge contract.
- **Does not belong:**
  - **Actual vault content.** Notes, decisions, run logs, and wiki pages live in the vault, not in this repo folder. This folder tells you *where* they go, it never *is* them.
  - **PII.** Zero client names, health specifics, family/immigration data, or any rule-8-class content — in this folder or in any vault lane an LLM reads. IDs and roles only.
  - **Secrets.** No keys, tokens, DB URLs, or credential fingerprints, ever (rules 44/59).
  - New visual rules (→ `../design.md` / the cinematic design system) or tier/security policy (→ the operator bridge).

## 4. Canonical status & where next

- These two policy docs are **canonical for vault routing of design knowledge**, subordinate to the operator bridge (the vault is T1 — notes/docs, never a command channel) and to CLAUDE.md privacy rules.
- The vault's own per-folder `index.md` files are governed by the index.md law in `vault-routing.md` §2 — this repo file is itself written to that law.
- Reading order for a fresh agent: this file → `vault-routing.md` → (if logging a decision) `design-decision-log-policy.md`. Graph promotion questions continue at `../graphify/graphify-policy.md`.
