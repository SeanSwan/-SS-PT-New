# SWAN BRAIN ARCHITECTURE — DECISION RECORD & BUILD PLAN

- **Date:** 2026-07-19
- **Status:** DECIDED (architecture) · PLAN-ONLY (nothing provisioned, no code written, no OAuth, no daemons)
- **Decision owner:** Sean · **Reviewer:** Kimi K3 (4 passes) · **Author:** Claude Opus 4.8
- **Trigger:** Sean supplied a Cerebras knowledge-base transcript proposing a RAG ingestion pipeline and asked
  whether the Swan Design Brain, Karpathy Wiki, and Obsidian brain should be rebuilt around it — and how to make
  the Mobbin MCP subscription pay for itself before it lapses.

> **Read this file first.** It is the honest state of the brain systems as of today, the decisions taken, and what
> Sean still has to answer. The full build blueprint lives in the companion files listed in §8.

---

## 1. THE HEADLINE

**We did not need to build a knowledge base. Two already existed, they could not see each other, and a third was
documented at length but never existed at all.**

The Cerebras architecture is a correct answer to a problem SwanStudios does not have at its current scale. What
transfers is the **metadata discipline**, not the embeddings. Verdict: **hybrid, and much narrower than proposed.**

---

## 2. WHAT WE FOUND (the load-bearing discoveries)

### 2.1 A working retrieval brain already exists — nobody had connected it
`~/hermes2/brain-vault` on Windows/WSL. **[VERIFIED 2026-07-19]**

| Fact | Value |
|---|---|
| Corpus | **2.2 GB · 3,975 files** (3,797 `.txt` PDF extractions, 165 `.csv` ledgers) |
| Index | **`indexes/brain-vault-fts.sqlite` — 535 MB SQLite FTS5, 3,658 docs** |
| Server | **`tools/hermes2_brain_mcp_server.py`** (MCP) + `hermes2_brain_search.py` (CLI) |
| Metadata | `collection, bucket, status, source, source_absolute_path, text_path, title, author, char_count, page_count, truncated, indexed_utc` |
| Collections | `books` 3,094 · `desktop-c-pdfs` 441 · `music-nirvana-misc` 90 · `bible` 33 |
| Freshness | index built 2026-06-30, newest source 2026-06-29 → **current** |

**The PII gate works, in code.** `hermes2_brain_search.py:22` declares `PRIVATE_COLLECTIONS = {"clients-private"}`.
On disk that collection holds **87 files / 23 MB**; in the FTS index it holds **0 rows** (3094+441+90+33 = 3658 =
total). Client data is ingested-but-excluded-from-search **by design, and the design holds.** Preserve this property.

### 2.2 The Obsidian vault, the Karpathy Wiki, and Graphify DO NOT EXIST
**[VERIFIED]** — and this contradicts a large body of policy documentation.

| Documented | Reality on disk |
|---|---|
| Obsidian vault, lanes `raw/ wiki/ outputs/ runs/ graph-imports/ references/ templates/` | **No `.obsidian` marker anywhere.** Lanes do not exist. |
| Karpathy Wiki of promoted notes with `[[wikilinks]]` | **Vault contains ZERO `.md` files.** |
| Graphify available for graph/chain queries | **Not installed.** Not on PATH. `design-brain/graphify/` = 3 policy docs, no tool. |
| Wiki at `/home/kali/swanstudios-wiki/` (Pi) | **Pi retired.** Path wrong in every doc for an unknown period. |

**Three different things share the word "vault" in the docs and only one is real.** Sean has never seen a knowledge
graph because there are no notes and no links to graph. Graphing 3,797 unlinked PDF extractions would be noise.

**"Gravity" was Sean mishearing "Graphify."** Separately, *Google Antigravity* (agentic IDE) may one day be a
**consumer** of the brain via MCP — never a component. No design accommodation made.

### 2.3 The repo brain has zero retrieval — deliberately, and it is documented
`HERMES-WIKI-MYTHOS-MASTER-PLAN.md:79-86` contains a table titled **"Why It's Better Than RAG."** Kimi's ruling:
that table **attacks vector search, not retrieval**, and its key row ("needs vector database, embeddings
infrastructure") is **false as stated** — FTS5/BM25 *is* retrieval and it was already running. Both the old plan and
the new proposal were wrong, in opposite directions. Wiki (synthesis) and FTS (recall) are **complements**.

### 2.4 The Mobbin bottleneck was never Mobbin
Measured: **7 runs → 61 reviewed → 17 accepted (~28%)**; last two batches 1-from-6 and 1-from-4 (~20%); system
**PAUSED** below the 0.34 accept floor. Caps allow 144 reviewed/week.

**Full-cap operation requires 8–10 hrs/week of Sean.** He does not have that, so the system silently de-rated to
~1 run/week. **The caps were never binding. Sean's calendar was.** Every prior plan optimized the wrong resource.

Corollary: **Codex's 600–1,000-reference program and the governance caps contradict each other.** The volumes fit;
the human-inspection assumption does not. Neither document noticed.

### 2.5 The docs overstate what is implemented
**[VERIFIED]** Real code = **972 lines** in `scripts/ai-workflow/mobbin-learning/` implementing **L0 control + L4
gating only**. `PAUSE_NOVELTY` **does not exist as a token anywhere in the repo** — the pause is a human judgement
call wearing the costume of a mechanism. "Resume receipts" do not exist as an artifact. L1/L2/L3/L5/L6/L7/L8 are
doctrine prose. **K1–K5 is exact-string `Set.has()`** (`evidence-gate.mjs:85-92`) — K5 ("same lesson from different
products") is a *semantic* problem currently solved by a human typing a normalized string.

---

## 3. DECISIONS TAKEN

| # | Decision | Rationale |
|---|---|---|
| **D-A** | **Two trust tiers, one retrieval spine.** Canon = human-adjudicated doctrine. Recall = FTS-indexed material, always provenance-tagged, **never citable as doctrine**. | Retrieval and synthesis are complements. Recall answers "what did we see"; canon answers "what is Swan doctrine." |
| **D-B** | **NO vector/embedding infrastructure.** Revisit only on *measured* FTS failure against Sean's own eval set. | 3,658 docs is well inside BM25's comfort zone; FTS5 already runs; `pg_trgm` already installed. No defensible a-priori corpus-size threshold exists. |
| **D-C** | **Distillation is an ingestion transform, not a layer.** Outputs are recall-tier records (`type=distillate`) weighted *below* raw sources. | Prevents hallucinated summaries outranking their own sources. |
| **D-D** | **The unit of evidence changes from the per-reference record to the CONVERGENCE CLAIM** (one principle cited across 2–4 independent products). | This is the whole throughput fix. One human decision per *principle*, not per *observation*. |
| **D-E** | **Agent performs L2 inspection; Sean audits via 15–20% spot-checks.** *(Sean approved.)* | Doctrine says "registered researcher" inspects — a registered agent is one. The staffing assumption died, not the doctrine. **Everything else depends on this.** |
| **D-F** | **Sean batch-adjudicates ~14 claims weekly (~75 min).** Human canon authority (L6/L7) untouched — only its *granularity* changes. | No agent, schedule, loop, or MCP path may ever promote doctrine. |
| **D-G** | **The wiki is BUILT — but generated, never hand-written.** Accepted claims auto-emit markdown via `wiki-emit.mjs`; `rm -rf && regenerate` in seconds. | *"The wiki is a view, not an asset. The corpus is the asset."* Kills the drift class the old docs already suffered from. **This is also how Sean finally gets a real graph** — edges derive from claim fields. |
| **D-H** | **Graphify killed as a component.** No code may import, shell to, or check for it. | Not installed, never was. If a graph tool ever appears it may *consume* the wiki; the wiki must not depend on it. |
| **D-I** | **Five mythos docs → `docs/_attic/2026-07-wiki-mythos/` + tombstones.** New `docs/brain/REALITY.md`. | Docs describing non-existent systems are an active hazard — they already caused planning against a dead Pi path. Attic, not delete: git should preserve what was believed and when it was corrected. |
| **D-J** | **Linear owns work state only, never knowledge.** | Team `SWA`, project *"AI Operations — Human + Agent Workflow"*. `SWA-5` Done, `SWA-6` In Progress. |
| **D-K** | **No Village run.** Free triangle produced nothing (all 3 timed out). | Architecture was coherent; the open question was Sean's to answer, not a model disagreement. |

### 3.1 The honest outcome — stated as a number, not a promise
> **A universally self-sufficient design brain in 11 weeks is NOT achievable** under any rule-compliant design.
>
> **What is:** ~**70 accepted convergence claims** backed by ~**200–280 independent product citations**,
> **3 domains deep**, **8 mapped shallow**, cold-mode-proven in the deep domains, at ~**1.5 hr/week** of Sean's time.
> A documented **45-min/week fallback tier** yields ~50 claims / ~150 citations.
>
> Honest multiple over the old trajectory: **~4–5× per sustainable human-hour** (the "10×" holds only measured as
> coverage-equivalents per hour). *These are plan targets, not promises — rolling 4-run metrics exist to detect
> divergence early.*

---

## 3.2 ⚠ PASS C OVERRULED THE BLUEPRINT — build the Minimum Viable Engine, not the blueprint

Kimi was then asked to attack its own blueprint. Its verdict:

> **"Kill 80%. Build the Minimum Viable Engine (~800 lines, 5 days) and nothing else.** The blueprint is
> individually well-reasoned and collectively indefensible: **4,600 lines and 18 moving parts to manage a 70-node
> graph.** The architecture is not wrong; it is **premature by a factor of five.** Most subsystems answer questions
> that don't exist until the corpus is 5–10× larger than this project will ever produce."

**The three arguments that killed it:**

1. **The spot-check audits existence, not observation quality.** All three spot-check questions (step count,
   surface label, claim visible) verify *that the agent looked at a real screen* — none verify *that it saw
   anything*. An agent emitting correct step counts with vacuous principles ("use clear hierarchy") **passes 100%
   of spot-checks forever.** Worse, ToS hygiene (no screenshots, ≤25-char verbatim) means the corpus *never
   contains the design — only text about design*, while design insight lives disproportionately in the visual
   layer the receipt structurally refuses to capture. **Failure produced:** ~70 generic principles wearing rigorous
   provenance and `confidence: high`, which makes them *harder* to distrust. **This partially undermines D-E, the
   decision everything else rests on.**
2. **The arithmetic never closes once build risk is priced in.** Four `[UNKNOWN]`s sit in the W1–W2 critical path;
   first claims realistically land W3–W4, not W2. Net ~2.5–3 claims/Sean-hour versus **1–2 principles/hour from
   simply looking at apps directly — with first-hand visual context and zero ToS question.** *"The project dies
   with a beautiful control plane and an empty corpus."*
3. **The least-mitigated risk is the load-bearing one.** Every other risk has an engineered mitigation; **D1 (ToS)
   has only a Sean decision**, and it sits under the acquisition layer of the whole engine. If it resolves badly,
   the fallback converges with doing nothing.

### The Minimum Viable Engine — build THIS

**~790 lines + tests · 5 working days · first real pilot run Friday of week 1** (not W3):

```
scripts/design-brain/
  src/paths.mjs         ~40   jail root resolution                    (Day 1)
  src/writer.mjs        ~120  jail, lstat-symlink, binary-magic,      (Day 1)
                              atomic rename, append-only audit log
  tests/writer.test.mjs ~120  9 acceptance tests                      (Day 1)
  schemas/receipt.schema.json + claim.schema.json                     (Day 2)
  src/validate.mjs      ~60   ajv wrapper, nothing else               (Day 2)
  src/log-receipt.mjs   ~80   CLI: append one receipt to jsonl        (Day 2)
  src/synthesize.mjs    ~150  receipts → claims, mechanical confidence(Day 3)
  src/packet.mjs        ~100  render BATCH-Wnn.md, <=8 lines/claim    (Day 3-4)
  src/adjudicate.mjs    ~120  import a/r/t/m, update claims, regen    (Day 4)
  config/domains.json + config/doctrine.md   (Sean, 1h each)          (Day 5)
data root: ~/design-brain/ — receipts.jsonl, claims.jsonl, batches/, ledger/writes.jsonl
```

**What makes it possible:** **Sean is the gate** — he triggers each run by typing
`node src/run.mjs --gap D01-P2`. *"A present human replaces ~300 lines of authorization machinery. Cost: 2 minutes
per run."* No broker (manual runs are concurrency-1 by construction; Sean's eyes are the circuit-breaker). No
coverage matrix (70 claims ÷ 55 cells = 1.3/cell — bookkeeping for a problem Sean holds in his head).
**INDEX.md, not a wiki** (70 notes don't need a graph, they need grep). Spot-checks survive **as a habit**, 12
min Monday, without log schema or auto-pause — an honest downgrade, accepted knowingly.

**Preserved:** agent parallelism (the actual economic win) · mechanical confidence · corpus-as-single-store ·
markdown adjudication at the right friction · human-only canon (Sean hand-edits `doctrine.md`; no `promote.mjs`,
it's an editor).

**Cut:** authorizedRuns/control gate · broker + circuit-breaker · 55-cell matrix + rolling metrics · trigram K5 +
merge queue · `doctrineConflictCheck` (self-admitted ~50% recall — *"a coin-flip attention-director pointing at a
human already looking"*) · spot-check log + auto-pause · **`wiki-emit.mjs` + Mermaid graphs** (*"180 lines serving
an emotional want"* — this reverses D-G) · eval harness (n=10 self-graded, *"measures nothing"*) · **all Linear
sync** (*"a claim living in two places is a claim that drifts"*) · multi-client runbook (keep the discipline,
write the runbook when a second client exists).

**Week-6 evidence gate.** If the corpus holds **≥25 accepted claims** and Sean is still adjudicating weekly, *then*
authorize in order: (1) the 5 read-only MCP tools so builders can cite claims (~150 lines, 1 day); (2) trigram
dedupe *if* the merge problem actually appeared; (3) unattended runs + real gate *if* manual triggering is provably
the bottleneck. **Each must be earned by evidence, not foresight.**

---

## 3.3 PASS D — UNIFICATION: the Karpathy Wiki already exists, and retrieval is free

**The reframe (Sean's, and it is correct):** *the PDF vault **is** the Karpathy Wiki.* Karpathy's idea was never
"Obsidian with a graph" — it was: keep a durable personal corpus, add to it continuously, make it queryable, stop
re-deriving what you already learned. The vault does exactly that. The docs prescribed a *hand-written wiki* as the
mechanism; Sean built a *machine-read corpus*. **Different mechanism, identical purpose.** §2.2's "the wiki doesn't
exist" was a false problem — it exists, it is 2.2 GB, and it had simply never been connected to design work.

**New verified evidence.** `hermes2_brain_mcp_server.py` already exposes exactly four tools —
`brain_status()` · `brain_search(query, collection="", limit=5)` · `brain_open(doc_id, ...)` ·
`brain_daily_brief()` — and **`brain_search` already takes a `collection` filter.**

**Consequences:**

| Ruling | Effect |
|---|---|
| **ONE BRAIN.** design-claims becomes a **collection inside the existing vault index**, not a separate store. | A collection label *is* mechanically-enforced trust separation — the same mechanism already protecting `clients-private`. |
| **The week-6 "5 read-only MCP tools (~150 lines, 1 day)" is DELETED, not deferred.** | Replaced by `emit-vault.mjs` (~60 lines): accepted claims → one `.md` per claim in `vault/design-claims/` → run `build`. **Citation retrieval arrives day 5 instead of week 6+.** |
| `INDEX.md` **survives** | FTS ranks, grep doesn't — but Sean *reads* all ~70 claims weekly. `INDEX.md` (20 lines) serves the human scan; `brain_search(collection='design-claims')` serves agents. Different consumers, both ~free. |
| `claims.jsonl` **remains source of truth** | Vault notes are a derived, regenerable projection. Single-store rule survives. |

**Revised MVE: ~760 lines, still 5 days**, and the corpus is FTS-searchable through the existing MCP server from
day 5. *"Smaller and sooner. That is the good outcome and I am saying so."*

### 🔴 HIGHEST-SEVERITY FINDING — `--include-private` is a one-flag silent PII exposure path

**[VERIFIED]** In `hermes2_brain_search.py`:
```python
if db_path.exists(): db_path.unlink()                              # ~line 99 — destroys & rebuilds the SAME file
if collection in PRIVATE_COLLECTIONS and not include_private:      # ~line 121
    summary["skipped_private_documents"] += 1; continue
payload = build_index(..., include_private=args.include_private)   # ~line 447 — CLI flag
```
`build --include-private` does **not** create a separate private index — it **deletes the safe index and rebuilds
the same default DB file with client data inside it.** Afterwards every MCP consumer, **including Hermes**, can
`brain_search` client records. No confirmation, no audit trail; the only trace is `skipped_private_documents: 0`
in a build summary nobody re-reads.

**Today the default holds — 87 client files on disk, 0 rows indexed.** It is one flag and one command from not
holding. *"A loaded gun with the safety on only because nobody has touched the trigger yet."* With multi-client
consultancy planned, this becomes a **cross-client confidentiality breach**, not an embarrassment.

**Ruling: GUARD + SEGREGATE, do not remove** (~50 lines + ~40 lines of tests, half a day):
1. **Physical segregation (load-bearing):** `--include-private` builds into a **separate DB file**
   (`brain_index_private.db`). The main index — the one the server opens, the one that gets backed up, demoed, and
   copied into client installs — becomes *structurally incapable* of holding private rows.
2. **The MCP server has no code path to the private DB.** Not behind a flag, not behind a param. Hermes and every
   future consumer are excluded by construction.
3. **Interactive confirmation + audit:** typing `clients-private` to confirm; refuses in non-interactive shells
   without `--yes-i-understand`; appends one line to `logs/private-builds.jsonl` that survives DB deletion.
4. **`brain_status` warns** when a private DB exists.

### 🔵 THE D1-INDEPENDENT PATH — Sean starts Monday regardless of the ToS answer

Pass C said *"if D1 resolves badly, build nothing."* **Pass D reverses that**, because most of the plan turned out
not to be downstream of Mobbin at all:

| Work item | Needs D1? | Pays off if D1 fails? |
|---|---|---|
| `--include-private` guard | No | Yes — protects the consultancy business itself |
| Repo-corpus ingestion (~100 handoffs, review queue, 145 memos → `repo-docs` collection) | No | Yes — the 2.2 GB brain finally sees the project that built it |
| Writer · schemas · synthesize · packet · adjudicate | No | Yes — works with **any** inspector, including Sean dictating notes |
| `emit-vault.mjs` + design-claims collection | No | Yes |
| **Mobbin harvest runs** | **Yes** | — |

> **"D1 stops being a blocker and becomes a scope dial: it sizes the harvest, not the project."**

### 🟡 THE SELF-REFERENCE TRAP — found in Pass D, missed by everyone including me

Ingesting 145 Hermes memos and months of agent brainstorms into a corpus that **Hermes itself queries via MCP**
means agent output becomes retrievable "evidence" for future agent output. Unmanaged, this is a
**confidence-laundering machine**: an agent asserts something → the memo is indexed → a later search surfaces that
assertion as corroboration.

**Rule:** `repo-docs` rows are **excluded from corroboration logic by label** — agent-generated text never raises a
claim's confidence; only shipped products and books do. The packet's corpus-echoes search hits `books` only.
**Cost: one line in `synthesize.mjs`.**

Also: **never back up the 535 MB index** — it is a derived artifact that rebuilds from source. Backup policy covers
source PDFs + `claims.jsonl` + audit logs only.

### 📌 THE MONDAY TASK — SWA-16: close the `--include-private` exposure path
Half a day. Files: `hermes2_brain_search.py` (modify `build`), `hermes2_brain_mcp_server.py` (**verify**, do not
add, that no path opens the private DB), new `tools/tests/test_private_guard.py`.
**Acceptance:** default build → 0 private rows in main DB (matches today's verified state) · flagged build → rows
land **only** in the private DB, main DB checksum unchanged · non-interactive flagged build without
`--yes-i-understand` → non-zero exit, no rows, no audit line · delete the test private DB → `status` returns
`present: false`. **Nothing else gets built until the guard is green.** Tuesday: repo-corpus ingestion — gated on a
30-minute secret-scan of the repo docs first, non-negotiable.

---

## 4. WHAT DOES NOT GET BUILT

- Any vector DB / embedding pipeline / pgvector — until measured FTS failure.
- Continuous unattended email/Slack ingestion (T3, unbounded scope, enterprise-shaped).
- A second MCP server, a graph database, any daemon, auto-promotion to canon, any "Gravity" integration.
- LLM summarization of the 3,658-book corpus — a cost centre answering questions nobody asked.

**Retire:** every `/home/kali/` path · the `design.html` hand-mirror (generate it or drop it) · the
"Why It's Better Than RAG" table · the mythos master plan · `MEMORY.md` as a mechanism, once recall works.

---

## 5. OPEN DECISIONS — SEAN MUST ANSWER BEFORE W1

| ID | Decision | Default if unanswered |
|---|---|---|
| **D1** | **Mobbin ToS go/no-go.** Does agent-driven inspection at ~96 runs / 11 weeks sit within Mobbin's terms? Kimi explicitly refused to rule — *"mitigation ≠ permission."* **This is a legal/contractual call, not a technical one.** | **BLOCKS the pilot.** Does not block code. |
| **D2** | Retrofit the 17 existing records → ~5 seed claims? (0.5 day, SKIP-OK) | Do it — it seeds D01. |
| **D3** | **Depth-domain swap:** Kimi swapped `scheduling/trainer-ops` **out** for **`marketing-landing-conversion`** in — because it feeds the live 14-surface overhaul immediately and is the highest-value *portable/consultancy* domain. Deep = **workout-logging · marketing-conversion · progress-analytics**. | Swap stands. Reverting = one field in `config/domains.json`, zero code. |
| **D4** | `BRAIN_DATA_ROOT` location (WSL `~/design-brain` assumed) | One env line. |
| **D5** | Weekly time budget: is **1.5 hr/week** real, or is 45 min the truth? | 1.5 hr; fallback tier is first-class. |

**⚠ D1 is the one that matters.** If the honest reading is that automated inspection of a paid design library at
volume is ToS-risky, that does not merely gate the pilot — it removes D-E, and with it the entire throughput
solution. Sean should read Mobbin's terms directly, or ask Mobbin support, before W1.

---

## 6. WHAT WAS ACTUALLY DONE THIS SESSION

**Nothing was provisioned. No code was written. No OAuth flow was run. No daemon was started. No file was deleted.**

Performed: repo + vault audit (file:line evidence); discovery of the FTS brain and the PII gate; disproof of the
Obsidian/Karpathy/Graphify layer; verification that `PAUSE_NOVELTY` and resume receipts do not exist; Linear
workspace read; 4 Kimi review passes; 2 failed free-triangle attempts; this record.

**Created (all gitignored, working artifacts):** `.ai-workflow/brain-review/` — prompts, assembled packets,
verdicts, and two small assembly scripts with Rule 44/59 secret scanning (**all packets scanned CLEAN before
egress; zero secrets, zero PII transmitted**).

**Hygiene note (Rule 38):** `.ai-workflow/brain-review/` is a new working directory; it is gitignored and prunable.
The durable outputs are this file plus the blueprint copies in §8.

---

## 7. SPEND

| Item | Cost |
|---|---|
| Kimi Pass 0 (broad brain architecture) | $0.2217 · 304 s |
| Kimi Pass A (Mobbin engine architecture) | $0.2175 · 389 s |
| Kimi Pass B (blueprint — truncated at 16k output cap) | $0.2710 · 488 s |
| Kimi Pass B2 (blueprint §6–§12 completion) | $0.2002 · 346 s |
| Kimi Pass C (hostile self-review — killed 80% of the blueprint) | $0.1636 · 310 s |
| Kimi Pass D (unification + PII-flag finding + D1-independent path) | $0.1261 · 282 s |
| Free triangle (Claude+Codex+Gemini) ×2 attempts | **$0 — both failed, all agents timed out** |
| AI Village (19-brain) | **$0 — not run, Sean's call** |
| **Total** | **$1.2001** (6 Kimi passes) |

**Honesty note:** the free triangle failing twice means **Kimi is the sole outside voice on this architecture.**
It is one opinion, not a panel. Treat its confidence accordingly.

---

## 8. COMPANION ARTIFACTS

| File | Contents |
|---|---|
| `KIMI-VERDICT.md` | Pass 0 — broad brain architecture; the no-vectors ruling; the five-artifact portable protocol |
| `KIMI-PASS-A-VERDICT.md` | Pass A — Mobbin engine architecture; kill list; throughput arithmetic; layer model; evidence contract; coverage plan |
| `KIMI-PASS-B-BLUEPRINT.md` | Pass B §1–§5 — build summary; wiki/graph ruling + doc-debt disposition; **4 Mermaid diagrams** (flowchart, stateDiagram-v2, sequenceDiagram, erDiagram); **JSON Schemas**; file tree + ordered build list |
| `KIMI-PASS-B2-BLUEPRINT.md` | Pass B2 §6–§12 — **ASCII wireframes** (batch packet, coverage matrix, claim detail, spot-check); algorithms; weekly runbook; portable install runbook; **Linear/Hermes/MCP/router integration specs**; W1 starter task; risk ledger |
| `KIMI-PASS-C-HOSTILE.md` | Pass C — hostile self-review; **the minimum viable engine**; corrected yield; what to cut |
| `KIMI-PASS-D-UNIFICATION.md` | Pass D — one-brain ruling; **`--include-private` PII exposure finding + guard spec**; the D1-independent Monday path; self-reference trap |

All under `.ai-workflow/brain-review/` (gitignored). **Copy the B/B2/C blueprints into `docs/` before relying on
them long-term** — the working directory is prunable.

---

## 9. NEXT ACTION

1. **Sean answers D1** (Mobbin ToS) — everything else waits on it.
2. Sean answers D2–D5 (one line each).
3. Read `KIMI-PASS-C-HOSTILE.md` §4 **"Minimum Viable Engine"** — build that, not the full blueprint.
4. Then W1 step 1, per Pass B2 §11.

**Do not build the full 4,600-line blueprint before reading Pass C.** It was written specifically to find the
smallest version that still works.
