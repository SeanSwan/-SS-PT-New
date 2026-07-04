# Design Brain — Graphify Bridge Index

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL (policy layer only)

---

## 1. Quarantine-first, stated up front

**Nothing Graphify produces is trusted until a human-reviewed promotion pass says so.** All Graphify output lands in the vault's `graph-imports/` quarantine lane, uncitable and clearly labeled, until each concept individually earns promotion into `wiki/` via the checklist in `graphify-policy.md`. Bulk imports are forbidden; unreviewed graph nodes are noise wearing a knowledge costume. If in doubt, the answer is: it stays quarantined.

## 2. Purpose

Graphify turns documents into relationship graphs. Used well, it answers **multi-hop chain questions** ("which surfaces inherit this pattern, and which decisions constrain those surfaces?") that flat search answers badly. Used lazily, it floods the vault with hundreds of auto-generated stubs that no one vetted. This folder exists to get the first outcome and structurally prevent the second — per the registry (`docs/ai-workflow/references/SWANSTUDIOS-AI-SKILL-AND-OPERATOR-REGISTRY.md` §10: quarantine import + promotion checklist).

## 3. Map

| File | What it governs |
|---|---|
| `graphify-policy.md` | Integration preconditions, quarantine mechanics, the promotion checklist, removability, when to use a graph at all |
| `templates.md` | Copy-paste concept-stub and source-wiring templates |

Consumers arrive via `../adapters/knowledge.md`; the vault-lane definitions this depends on live in `../obsidian/vault-routing.md`.

## 4. What belongs here / what does not

- **Belongs:** the run/quarantine/promotion policy, the two templates, records of what the policy requires per import (source, reason, promotion decision).
- **Does not belong:** actual graph exports or concept stubs (→ vault `graph-imports/`), Graphify installation/config instructions for a specific machine (→ an ops runbook when one exists), design rules (→ `../design.md`), and anything PII-bearing — graphs fan out relationships, which makes PII leakage worse, not better; IDs/roles only (rule 8).

## 5. Canonical status & where next

- These docs are **canonical for how Graphify touches the SwanStudios knowledge system**, subordinate to the operator bridge (Graphify is T1; import/promotion is a human-reviewed step — bridge §3) and to the vault routing policy.
- Reading order: this file → `graphify-policy.md` → `templates.md` when writing stubs. Promotion destinations and lane law: `../obsidian/vault-routing.md`.
