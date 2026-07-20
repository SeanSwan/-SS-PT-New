# The Brain — what ACTUALLY exists (and what never did)

- **Date:** 2026-07-20 · **Status:** CANONICAL — this one page outranks any doc describing brain
  infrastructure that cannot be verified on disk.
- **The rule (no exceptions):** docs describing non-existent systems are atticked on discovery.
  An agent grepping this repo must hit a tombstone, not a myth. This page exists because an agent
  once planned against a vault path on a Raspberry Pi that had been retired for months.

## What EXISTS (verified 2026-07-20)

| Thing | Where | Facts |
|---|---|---|
| **The brain vault (the real "Karpathy Wiki")** | `~/hermes2/brain-vault` (Windows/WSL) | 2.2 GB · **4,291 indexed docs** — books 3,094 · desktop-c-pdfs 441 · **repo-docs 633** · music-nirvana-misc 90 · bible 33. Karpathy's *purpose* (durable, growing, queryable personal corpus) achieved by a machine-read corpus, not a hand-written wiki. |
| FTS index | `indexes/brain-vault-fts.sqlite` | SQLite FTS5; **derived artifact — never back it up**, rebuild from source via `build`. |
| MCP server | `tools/hermes2_brain_mcp_server.py` | `brain_status` · `brain_search(query, collection, limit)` · `brain_open` · `brain_daily_brief`. **No code path to any private DB** (pinned by test). |
| **PII guard (SWA-16)** | `tools/hermes2_brain_search.py` + `tools/tests/test_private_guard.py` | `clients-private` (87 files) has **0 indexed rows**. Private builds go ONLY to a segregated `brain-vault-fts-private.sqlite`, need typed confirmation or `--yes-i-understand`, and audit to `logs/private-builds.jsonl`. |
| Repo→vault ingester | `scripts/brain/ingest_repo_corpus.py` | Emits the vault's native ledger format; hard secret-scan gate; derived mirror (delete-and-rewrite). Rerun after doc-heavy workstreams. |
| Design-brain MVE engine | `scripts/design-brain/` | Receipts → convergence claims → batch adjudication (Sean's letters) → `design-claims` vault collection. See its README. |
| Client dictation tooling | `scripts/hermes/clientNotes/` | Hermes `state.db` (read-only) → per-client local markdown records. Jailed outside repo + vault. |
| Hermes runtime | `~/hermes2/.hermes/` | `state.db` (sessions/messages, FTS-indexed) · daily 03:00 backups to `Documents/HermesPortableBackups` · morning cron briefs. |

## What DOES NOT exist (and never did)

- **An Obsidian vault.** No `.obsidian` marker anywhere; the "raw/wiki/outputs/runs/graph-imports"
  lane structure was never created. Zero hand-written wiki notes exist.
- **Graphify.** Never installed. No code may import, shell to, or check for it. If a graph tool
  ever arrives, it may *consume* generated views; nothing may depend on it.
- **The Pi vault.** `/home/kali/swanstudios-wiki/` — the Pi is retired. Every doc that pointed
  there is in the attic.
- **`PAUSE_NOVELTY`, resume receipts, L1–L3/L5–L8 as code.** Doctrine prose only; the implemented
  layers are L0 control + L4 evidence-gating (`scripts/ai-workflow/mobbin-learning/`).

## Where the myths went

`docs/_attic/2026-07-wiki-mythos/` — obsidian/ policy docs, graphify/ policy docs,
`KARPATHY-WIKI-OPERATIONS.md`, `HERMES-WIKI-MYTHOS-MASTER-PLAN.md` (pre-Fable-era master plan,
superseded by `docs/ai-workflow/AI-HANDOFF/SWAN-BRAIN-ARCHITECTURE-DECISION-2026-07-19.md`).
Preserved because git history should show what was believed and when it was corrected. Do not
resurrect their prose into active docs.

## Trust tiers (the two-line doctrine that replaced the plan)

**Canon** = human-adjudicated doctrine (design.md, CLAUDE.md rules, doctrine.md) — Sean-edited only.
**Recall** = everything retrievable (vault collections incl. repo-docs and design-claims) — always
provenance-tagged, never citable as doctrine; it tells you *where to look*, not *what is true*.
Agent-generated text (repo-docs, memos) never corroborates a design claim. Only shipped products
and books do.
