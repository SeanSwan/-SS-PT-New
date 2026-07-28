# Memory & State (Level 4)

- **Date:** 2026-07-03 · **Author:** Fable (claude-fable-5) · **Status:** CANONICAL — the three-brain memory model
- **Companions:** `./architecture.md` §3 (runtime summary this file expands) · `../design-brain/obsidian/index.md` (vault bridge policies in detail) · `../design-brain/graphify/index.md` (graph quarantine/promotion) · `./run-logs-and-self-improvement.md` (the runs/ lane's contents)
- **Tier vocabulary:** `../references/HERMES-SWANSTUDIOS-OPERATOR-BRIDGE.md` §4.

---

## 1. Three brains, one hierarchy

| Brain | What it is | Holds | Never holds |
|---|---|---|---|
| **Hermes working memory** (5090, local) | The operator's short-term context | Preferences ("brief me at 06:00, headline first"), routing notes ("deploy questions → health sweep first"), approval-queue state, **approved durable summaries** — distillations Sean has explicitly said to keep | Client PII, credentials, raw transcripts, anything Postgres owns |
| **Obsidian/Karpathy vault** | The long-term knowledge brain | Structured knowledge, run history, deliverables, ingested references — everything worth knowing in six months | Source-of-truth business data, unredacted anything, secrets |
| **SwanStudios Postgres** | The **only source of truth** for client and business data | Clients, sessions, workouts, payments, leads, packages | Operator preferences, agent scratch state, wiki prose |

The hierarchy is absolute: wikis and working memory are **derived views** and never overrule the database (bridge boundary 8). When a vault note disagrees with an API read, the note is wrong by definition — it gets a stale-date, not an argument. Nothing in either upper brain is ever treated as the current session count, the current package balance, or the current anything; those are API reads at time of use.

## 2. The vault folder law

The vault's lanes, each with a job (detailed bridge policies: `../design-brain/obsidian/`):

- `raw/` — unprocessed intake: clippings, exports, notes-to-self. Nothing cites raw/; it is compost, not reference.
- `wiki/` — the curated brain: one topic per note, promoted from raw/ deliberately, provenance frontmatter mandatory (§5).
- `outputs/` — deliverables the system produced: briefings, snapshots, proposals. Immutable once delivered; superseded, never edited.
- `runs/` — receipts, run logs, queue history (`./audit-receipts.md` §3, `./run-logs-and-self-improvement.md` §1). Append-only.
- `graph-imports/` — Graphify quarantine. Machine-generated graph output waits here until a human promotes it (registry §10); nothing in quarantine is citable.
- `references/` — third-party material kept verbatim (specs, standards, exported docs), never edited, cited by pointer. Mobbin-derived material is not copied here unless it is a permitted citation/export; default storage is a distilled receipt in `outputs/` or `runs/`, with raw screenshots and connector URLs excluded.
- `templates/` — note and receipt scaffolds, versioned like the prompts they resemble.

**The index.md law:** every lane carries an `index.md` stating what belongs, what does not, and where to go next. A folder without an index is a junk drawer with ambitions; agents may not write to a lane whose index they haven't honored.

## 3. Evergreen context vs changing connection data

Two kinds of knowledge, and the model treats them oppositely:

- **Evergreen** — how Sean thinks, house style, protocol knowledge, decided policies, the shape of the business. Belongs in wiki/ and working-memory summaries; safe to cache, cheap to trust, reviewed on a slow cadence.
- **Changing connection data** — who trained this week, package balances, deploy state, open leads. Lives in Postgres (or the live service) and is **fetched at time of use, never memorized**. A briefing embeds today's stale-client list as *output*; the vault never stores it as *knowledge*. Caching changing data in the brain lanes is how a system starts confidently telling you last month's truth.

## 4. Full-document markdown vs semantic search vs graph

Three retrieval modes; each wins somewhere and the vault serves all three:

- **Full-document markdown wins** when authority and nuance matter: policy docs, protocol references, anything an agent will act on. Load the whole note; excerpts of governance docs are how rules get half-followed. This is why the load-bearing docs in this folder are short enough to read fully.
- **Semantic search wins** when the question is "have we seen something like this" across a large corpus: raw/ intake, old outputs, run-log prose. Results are *leads*, cited by note path and verified by reading, never pasted as truth.
- **Graph wins** when the question is relational: what connects this exercise to that injury pattern, which topics cluster around a client segment. Graphify builds it; imports quarantine in `graph-imports/` until promoted (`../design-brain/graphify/`). The graph proposes connections; a human ratifies them.

Default order for an agent answering a question: Postgres (if it's business state) → wiki/ full read (if it's policy/knowledge) → semantic search (if it's recall) → graph (if it's relationships). Never the reverse.

## 5. Provenance and staleness

Every note ingested into wiki/ or references/ carries frontmatter: `source` (where it came from — URL, export, conversation, receipt id), `ingested` (date), `stale-after` (date the content should be re-verified or demoted), `confidence` (verified / reported / speculative). The stale-date is not decoration: search and briefing surfaces flag notes past `stale-after`, and an agent citing a stale note must say so. Knowledge without provenance is rumor with formatting, and it does not enter the brain lanes.

## 6. Mobbin/reference intake floor

Mobbin and similar design-reference connectors feed the UI brain through distilled receipts only. Hermes may keep the Swan translation, decision impact, and query intent, but not raw screenshots, connector URLs, OAuth material, account data, or copied product layouts. If a Mobbin-derived principle becomes reusable doctrine, it is promoted through the normal vault workflow with provenance and a note that external references informed the pattern.

## 7. Privacy floor

- **Zero client PII in the vault.** Client references are IDs and roles only (rule 8); names are mapped client-side in product surfaces, never in brain lanes. A vault note that needs a client's name to be useful is a note that belongs in the product database instead.
- **PLAUD and transcripts are local-private, redaction-first** (bridge §6): raw audio and raw transcripts never enter the vault, the repo, or any chat context. Redaction (names, identifiers, health specifics) runs *before* any external LLM sees text; what the vault may eventually hold is the approved, redacted, structured artifact — and even that lives in the product's approval-gated pipeline first.
- Secrets never enter any brain. Not in notes, not in run logs (`./run-logs-and-self-improvement.md` §2), not in "temporary" scratch files. Rule 44/59 posture applies to memory exactly as it applies to chat.

## 8. Write rules per brain

Who may write where — the memory model's enforcement summary:

| Brain | Who writes | Gate |
|---|---|---|
| Hermes working memory | Hermes (`memory-note`, T2 standing allowlist); durable summaries only after Sean's explicit "keep that" | Allowlist row + receipt |
| Vault `raw/` / `outputs/` / `runs/` | Agents and scripts, per lane index | Lane index honored; append-only where the lane says so |
| Vault `wiki/` / `references/` | Human-promoted only (or human-applied proposals) | Provenance frontmatter complete (§5) |
| Vault `graph-imports/` | Graphify output lands here automatically | Promotion out is human-reviewed (`../design-brain/graphify/`) |
| SwanStudios Postgres | **SwanStudios APIs only** — never a brain-lane process | Bridge boundary 7; product auth + validation |

The asymmetry is the design: machines fill the cheap lanes freely, humans ratify anything that becomes citable knowledge, and nothing in the memory system can touch the source of truth except through the same API door every product user walks through.
