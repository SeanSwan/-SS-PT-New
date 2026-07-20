# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/brain-review/KIMI-DOC-V2.md
**Seed:** (none)
**Tokens:** 25908 in / 9600 out · **Cost:** ~$0.2217 · **Wall:** 304.1s

---

# HOSTILE ARCHITECTURE REVIEW — SWAN BRAIN UNIFICATION

---

## 1. VERDICT

**Hybrid, and narrower than the proposal.** Adopt the Recall/Canon trust split. Reject "Distillation as a layer" — it's a pipeline stage, not a tier. The decisive facts:

- Step 1 of the Cerebras model (ingest→index→serve) is **already built and working** on the vault side (FTS5, 535 MB, PII gate holding). The proposal as framed implies a build; the reality is an *extension*.
- **Vector search: NO, not now.** Not at 2.2 GB / 3,658 docs with a working BM25 index. The threshold for revisiting is *measured FTS5 failure on Sean's own eval set*, not a corpus-size number anyone can honestly give you a priori.
- **The honest core answer: you already have most of what you need.** Add four small things — (1) eval harness, (2) repo-corpus ingestion into the existing FTS5 spine, (3) enforced staleness/recency weighting, (4) one query CLI — and stop. Everything else is deferred behind eval evidence.
- The Cerebras 17/20 number is a vendor blog claim with no published methodology [UNKNOWN]. It is marketing until replicated. Which is exactly why the eval harness is the first slice.
- Sean's instinct ("the transcript is the future") is half-right: what transfers is the **metadata discipline** (question/summary/source/timestamp/author), not the embeddings.

---

## 2. WHERE THE PROPOSED POSITION IS WRONG

**W1. "Distillation is the actual innovation." Rejected.**
At Swan's scale the innovation is *having retrieval at all on the repo side*. The operational corpus is 2.3 MB — distilling it is a rounding error of value compared to making 145 memos, a 228 KB queue, and ~100 handoffs *findable* (broken things #1–#3). Cerebras distills because at 10⁵ docs and 15k queries/day, raw chunks drown the context window. Sean has the opposite problem: his corpus is so small the bottleneck is *discovery*, not compression. Distillation is a second-order optimization being proposed as the centerpiece. [VERIFIED — corpus sizes from §3/§5]

**W2. "Three layers" conflates trust tiers with pipeline stages.**
Recall vs Canon is a *trust* distinction — correct and worth keeping. Distillation is a *transform applied during ingestion*. Its outputs are not a third tier; they are recall-tier records with `type=distillate` and lower authority weight. Naming it a layer invites people to treat distillates as a thing you *consult* rather than a thing that *points*. The proposal's own safety property ("RAG output is a pointer, never doctrine") is enforced by the two-tier trust model; the third "layer" adds vocabulary without adding enforcement.

**W3. The framing accepts the Cerebras problem statement.**
The video's question is "how do I search everything I've ever seen across a company." Sean's actual broken list (§5) is: no cross-session recall, two disconnected brains, undetected staleness, no eval. Three of those four are solved by boring FTS extension + a lint job. The proposal risks importing an enterprise architecture to solve a solo-operator problem.

**W4. The "Why It's Better Than RAG" table is right about vectors and wrong about retrieval — and the proposal didn't say so.**
Row-by-row (§2a's demand):

| Master-plan row | Hostile verdict |
|---|---|
| "Retrieves raw chunks vs compiles once" | True, and a *feature*: raw chunks with provenance stay verifiable; compiled wiki prose drifts silently (§2e is the proof — the wiki's own ops doc pointed at a dead Pi for months). Compilation without retrieval-backed verification is how you get confident staleness. |
| "Re-derives answers every query" | Valid cost argument at 15k queries/day. Irrelevant at Sean's query volume [LIKELY — 1 human + 2–4 agents]. |
| "No accumulation between sessions" | Solved by the file-back loop, which is orthogonal to retrieval technology. Not a RAG-vs-wiki property. |
| "Needs vector database, embeddings infrastructure" | **False as stated.** It conflates RAG with vector search. FTS5/BM25 *is* retrieval, and it's already running. This row is the strongest argument in the table and it argues against a strawman. |
| "Retrieval noise at scale" | Swan is not at scale. 3,658 docs is well within BM25's comfort zone [LIKELY]. |
| "Multi-doc synthesis must be re-pieced every time" | **The one genuinely correct row.** That's what the wiki/canon layer is for. It's an argument for synthesis *on top of* retrieval, not instead of it. |

Net: the table attacked vector RAG, not retrieval. Wiki (synthesis) and FTS (recall) are complements. Both the old plan and the new proposal got this wrong in opposite directions.

**W5. "Never citable as truth" is unenforced as stated.**
A norm in a prompt is not a control. §2e proved norms decay: `stale_after_days` existed in frontmatter and *nothing enforced it*. Any recall/canon separation that lives only in prose will be violated by the first agent in a hurry. It needs a mechanical output contract (§7.Q9).

**W6. Portability is asserted, not designed.**
The proposal never names which artifacts are the portable IP. Under the consultancy lens, half of what exists (68 numbered rules, agent-CEO mythology, hardcoded Pi paths, the design.html hand-mirror) is a liability to a paying client. A plan that doesn't explicitly partition "reusable IP" from "SwanStudios scaffolding" fails its own primary success test.

**W7. Gravity appears in §7 unanswered.**
The v2 brief itself flags Gravity as UNKNOWN (§2g). Any plan that quietly assumes it is inventing facts. Declared out of scope (§7.Q23).

---

## 3. SUCCESSOR PLAN — replaces `HERMES-WIKI-MYTHOS-MASTER-PLAN.md`

**Audit verdict on the old plan (historical artifact, do not patch):**

*Still valid (carry forward):*
- Hermes-as-operator with persistent local memory; security isolation of the operator host; zero-PII-to-LLM posture; privacy-proxy pattern; "boring self-hosted tech" instinct; Linear as work-state owner; the wiki's immutability rules (raw/ read-only, human-gated promotion).

*Falsified by events (retire):*
- Vault location: every `/home/kali/` path (retired Pi). The plan's own ops doc is Exhibit A for the staleness failure.
- The Mythos availability timeline, Glasswing pricing, Polymarket odds, and model-tier claims — unverifiable as written [UNKNOWN]; Fable's arrival was not anticipated by the plan, which alone disqualifies it as a living document.
- The "Why It's Better Than RAG" framing (see W4).
- The 13-agent fleet as a *near-term* build — it was aspirational when written and remains so; carrying it forward as a plan is scope debt.

**Successor plan (one page, Fable-era):**

1. **Two trust tiers, one retrieval spine.** Canon = human-adjudicated doctrine (repo docs, design.md, promoted wiki pages). Recall = FTS5-indexed raw material + distillates, always provenance-tagged, never doctrine. Nothing else exists.
2. **One query interface, federated indexes.** Vault index stays on WSL; repo corpus gets its own index built by the same ingestion code; a single CLI/MCP façade queries both and labels results by brain + collection.
3. **Eval before expansion.** No new retrieval capability ships without moving the golden-set score.
4. **Distillation is a gated experiment**, not a commitment: one inbox batch, human-reviewed, measured against the eval set, then decided.
5. **The protocol is the product.** Every artifact is written as if a cold client repo is the next install target. SwanStudios specifics live in config, not code.
6. **L6/L7 and the PII gate are untouchable.** Stated once, tested mechanically, never renegotiated.

---

## 4. RANKED SLICE SEQUENCE

| # | Slice | Effort [HYPOTHESIS] | Stop condition |
|---|---|---|---|
| 1 | **Eval harness**: 40–60 golden Q&A pairs mined from real history (memos, handoffs, review-queue, decisions). Blind runner: no-KB baseline vs FTS recall. Metrics: recall@5, answer-correct. | 1 day | Stop when the harness runs end-to-end and produces a baseline number — even an embarrassing one. Do NOT grow the question set past 60 before slice 2. |
| 2 | **Repo-corpus ingestion into the FTS5 spine**: design-brain, handoffs, continuity, coordination, hermes-inbox, fusion, qa → own collection(s) in a sibling index; provenance metadata mandatory; `clients-private` exclusion pattern generalized as a hardcoded denylist + regression test. | 1–2 days | Stop when the golden-set recall@5 beats the no-KB baseline by a wide margin (expect large; the baseline is ~0). Do not tune ranking yet. |
| 3 | **Staleness + weighting pass**: enforce `stale_after_days` in lint; add recency + author-authority boost to ranking (metadata columns already exist); fix all retired-Pi paths; index-freshness check (built_utc vs max source mtime) with a warning in the CLI. | 1 day | Stop when the eval set includes ≥5 "stale vs fresh" trap questions and the weighted ranker beats plain BM25 on them. |
| 4 | **Unified query CLI/MCP façade** across both brains, with the recall output contract (§7.Q9). Reuse `hermes2_brain_mcp_server.py`; do not write a second server. | 1 day | Stop when one command returns merged, labeled results from both brains. |
| 5 (gated) | **Distillation spike**: one hermes-inbox batch → structured metadata (question/summary/systems/source/timestamp/author) → indexed as `type=distillate`, authority-weighted *below* raw sources. Human spot-check ≥20%. | 2 days | Stop and *decide*: ship only if it moves the eval score; otherwise record the negative result and shelve distillation. A documented negative is a deliverable. |
| 6 (deferred) | **K5 semantic dedupe**: trigram (`pg_trgm`) or embedding candidate-pair generator feeding a *human* merge queue. The only genuinely embedding-shaped task in the system — but build it only when K5 review burden is actually felt, not before. | 1–2 days | Stop condition defined at build time via eval. |

**Total to a working unified brain: ~5 days.** Everything after slice 4 is evidence-gated.

---

## 5. THE EVAL DESIGN

**The golden set (40–60 items, three strata):**
1. **Recall questions** ("what did we decide about Victory vs Nivo and why", "what's in the evidence schema v2") — answers exist verbatim in memos/handoffs. Measure recall@5.
2. **Provenance traps** ("where does the live vault live") — the retired-Pi path *is in the corpus*; the correct behavior is returning the fresh answer ranked above the stale one. Directly tests slice 3. [VERIFIED trap exists — §2e]
3. **Negative controls** — questions with no answer in the corpus; correct behavior is "not found," not a hallucinated distillate. This is the anti-theater stratum.

**Protocol:**
- Run blind: (a) no KB, (b) plain FTS5, (c) FTS5 + weighting, (d) later, + distillates. Grade answer-correctness by hand (Sean) on a 0/1 scale; it's 60 questions, not 15,000.
- The set lives in the repo, versioned, and is itself portable IP — the same harness drops into a client install with a swapped question set.
- Rerun on every retrieval change. A change that doesn't move the number doesn't ship.
- The Cerebras 17/20 claim gets treated as a hypothesis Sean tests on his own data, not a fact he imports.

**Dependence metric (Q20):** per canonical principle, count distinct independent sources; track the share of canon with single-source support (Mobbin-only) over time. Target: declining single-source share quarter over quarter. [HYPOTHESIS — targets set after first measurement.]

---

## 6. THE PORTABLE PROTOCOL (cold-repo install)

**Name it something boring. Half a day to install. Five artifacts:**

1. `SCHEMA.md` — trust tiers (canon vs recall), provenance fields, PII/secrets denylist, promotion gate definition. *This document is the product.*
2. `ingest` — walks configurable corpus paths, extracts text, attaches provenance (source path, mtime, author, collection), runs the denylist + secrets scan, loads an SQLite FTS5 index (build-to-new-file, atomic swap).
3. `query` — CLI (MCP wrapper optional, thin) with the labeled output contract.
4. `lint` — staleness enforcement, index-freshness check, broken-path scan, exclusion regression test.
5. `eval/` — harness + template golden set the client fills in from *their* history.

**Client rules:** one vault + one index *per client*, physical separation, denylist applied at ingestion (not just at search), engagement-end = delete directory + index file (provable, attestable). No vectors, no daemons, no required cloud anything. If the LLM vendor disappears, ingestion/query/lint/eval all still work; only the optional distillation stage goes dark, and it's behind one model-agnostic function.

**Reusable IP vs scaffolding (the explicit partition):**
- **IP:** the five artifacts above; the evidence-gate pattern (schema-validated, exclusive-create, human-gated) generalized; the PII exclusion pattern; the eval methodology; the trust-tier doctrine.
- **Scaffolding (never carry):** the 68-rule corpus as-is, agent-CEO hierarchy mythology, hardcoded paths and collection names, the design.html hand-mirror, MEMORY.md as a mechanism, anything referencing Fable/Hermes/Mythos by name in protocol code.

---

## 7. ANSWERS TO §7 Q1–Q26

1. **Three-layer split correct?** Two trust tiers (Recall/Canon) — yes. Distillation as a "layer" — no; it's an ingestion transform whose outputs are recall-tier records with `type=distillate` and sub-source authority weight.
2. **Vector search justified?** No. Honest threshold: there is no defensible a-priori corpus-size number [UNKNOWN]; the threshold is *measured* — e.g., FTS5+weighting recall@5 falls below ~0.8 on the golden set with failures dominated by synonymy/paraphrase, or K5 dedupe burden becomes a standing human chore. FTS5's synonymy blindness is real but matters less here because Sean's queries are mostly proper-noun/artifact queries (filenames, decisions, rule numbers, exercise names) [HYPOTHESIS — the eval set will confirm or refute].
3. **Merge, federate, or separate?** Federate behind one query interface; keep separate indexes per trust zone. Merging into one index re-opens the PII-exclusion question for zero benefit.
4. **Different architectures for the two corpora?** Different *treatment* — ingestion cadence, weighting, trust defaults — but the *same* index technology. The 2.3 MB corpus needs no architecture beyond "index all of it."
5. **Where do indexes live?** WSL side, beside the existing index and MCP server; repo corpus ingested via the WSL mount. One machine boundary, one query home.
6. **First slice?** Eval harness (§4 slice 1), immediately followed by repo ingestion (slice 2) as its first subject. Ranking: b → a → e → f → c(gated) → d(deferred).
7. **Which broken things fixed?** Slices 1–3 fix #1, #2, #3, #5, and partially #8 (rules become searchable) and #9. They do **not** fix #4 (K5 — deferred), #6 (design.html drift — delete the mirror instead, §9), #7 (MEMORY.md — becomes redundant once recall works; retire by policy, not code).
8. **Not build:** §9.
9. **Provenance through retrieval:** mandatory metadata on every row (already the vault schema's pattern); the query output contract is `RECALL | collection | source_path | indexed_utc | snippet` with a standing "not canon — verify at source" banner; agents may cite canon or verified-at-source material in commits, never raw recall hits; a CI grep rejects commit messages/bodies citing the recall format. Mechanical, not normative — because §2e proved norms decay.
10. **T0–T4:** T0 read-only retrieval — autonomous. T1 local reversible writes (index rebuilds, lint) — autonomous. T2 shared-state writes (review queue, handoffs, wiki file-backs) — agent-drafted, human-committed. T3 external ingestion (email, Slack, client data) and all paid distillation runs — per-run human approval (Rule 16). T4 canon promotion (L6/L7) — human-only, untouchable, no MCP path exists to it.
11. **clients-private design:** correct *for solo use today only because the exclusion is a hardcoded constant* — keep it that way and add a regression test asserting 0 rows. For the consultancy: **wrong design.** Don't ingest client data into a shared vault at all; per-client physical vaults/indexes with ingestion-time denial. Exclusion-by-config is one rename away from a leak (§8 scenario 4).
12. **Index as leak surface:** pre-ingestion secrets scan (gitleaks-class tool) + path denylist (.env, keys, certs) as hard fail; index file permissions = corpus permissions; index is always rebuildable, so purge = delete + rebuild; treat a stolen index as equivalent to a stolen corpus in the threat model. Never ingested: secrets, client PII, anything matching the denylist.
13. **Decay/staleness:** enforce the existing `stale_after_days` in lint (it's defined but unenforced [VERIFIED §2e]); index-freshness delta warning in the CLI; conclusions cite source-baseline versions, so a baseline bump auto-flags dependent conclusions for human re-review. Contradictions are never auto-resolved — both sides indexed, conflict surfaced to the human.
14. **Pile-of-observations prevention:** the compounding loop (answers filed back) routes through the T2/T4 human gates; retrieval alone doesn't compound and shouldn't pretend to. The wiki/canon tier is where connection happens; recall just feeds it.

15. **Reusable IP vs scaffolding:** §6 partition.
16. **Cold install:** §6 — five artifacts, half a day, config-not-code for client specifics.
17. **Multi-client isolation:** per-client vaults, per-client index files, no shared collections, ingestion-time denial, deletion = remove directory + index (attestable via rebuild log).
18. **Vendor disappears:** SQLite/FTS5/markdown/CLI are local and permanent; distillation sits behind one model-agnostic function and is the only thing that goes dark; the eval harness revalidates any replacement model. Degradation is graceful by construction because nothing critical is hosted.
19. **Eval:** §5.
20. **Source-dependence:** §5 dependence metric.
21. **Linear + Hermes:** Linear = work-state system of record, ingested read-only as a recall collection with `source=linear` provenance; it never becomes a KB front-end (per §2f's chosen role). Hermes = operator that queries; it stores nothing canonical. Canon stays in repo docs. Three roles, one writer each — no fourth source of truth.
22. **Next Linear issues:** SWA-10 eval harness; SWA-11 repo-corpus FTS ingestion + denylist regression test; SWA-12 staleness lint + retired-Pi path purge; SWA-13 unified query façade; SWA-14 distillation spike (gated); SWA-15 protocol extraction/packaging. Sequence after SWA-6 closes.
23. **Gravity:** UNKNOWN, out of scope. Needed from Sean: one paragraph — what it is, what it reads/writes, whether it touches canon. Until then, no design decision may depend on it.
24. **Parallelizable vs single-owner:** parallel — ingestion of disjoint corpora, lint, eval runs. Single-owner — the index writer (one builder at a time), canon promotion (Sean, always), schema changes (Sean).
25. **Locking/leasing/budgeting:** don't use leases at all — index builds write to a new file and atomically swap; SQLite single-writer + WAL for any incremental writes; paid-API calls behind a broker with a hard per-run budget and Rule-16 permission gate.
26. **Crashes/abandoned leases/retry storms:** the atomic-swap pattern makes crash-mid-build harmless (old index keeps serving; orphaned temp files reaped by lint); rebuilds are idempotent from source; the API broker enforces backoff + circuit-breaker. The index is disposable by design — the corpus is the asset.

---

## 8. HOSTILE-SCENARIO TABLE

| Scenario | Survives? | Minimum fix |
|---|---|---|
| Concurrent index writers; crashed lease reclaimed twice | **Yes — by refusing the design.** No leases; build-to-new-file + atomic rename; single builder enforced by one lockfile. | The atomic-swap pattern. Reject any lease-based design outright. |
| Stale chunk outranks fresh doctrine (retired-Pi) | **No, today.** This already happened undetected (§2e). | Slice 3: recency/authority weighting + enforced staleness lint + trap questions in the eval set. Canon searched/prepended separately from recall. |
| Recall cited as canon reaches a commit | **No** if it's a prose rule. | Output contract + CI grep on the recall citation format (Q9). Human gates unchanged. |
| clients-private leaks via renamed/moved collection | **Partially.** Hardcoded set survives renames of *other* things, but a renamed *collection* defeats name-based exclusion. | Ingestion-time (not just index-time) path/content denial; regression test asserting 0 rows; consultancy rule: physical per-client separation so no config can bridge it. |
| Secret in an ingested .txt retrievable forever | **No.** | Pre-ingestion secrets scan as hard fail; purge = delete + rebuild (index is disposable); corpus-side remediation is still the human's job. |
| Distillation hallucination outranks source | **No** if distillates rank equally. | `type=distillate` weighted *below* raw source; distillate always returned alongside its source pointer; human spot-check; negative-control stratum in the eval catches confident nonsense. |
| Same K5 principle from two sources; record inflation | **No — current code can't see it** [VERIFIED §2c]. | Slice 6: similarity-generated candidate pairs → human merge queue; count *unique sources*, never records. No auto-merge. |
| Contradiction suppressed by confidence scoring | **No** if scoring resolves conflicts. | Rule: scoring ranks retrieval, never adjudicates. Both contradictory items indexed; conflict flagged to human in lint. |
| Index silently stale for a month | **No** (nothing checks). | built_utc vs max source mtime; CLI warns past threshold; weekly lint reports delta. Cheap, mechanical. |
| Corpus 10× | First to break: **the human gates** (review bandwidth) and the already-broken 228 KB single-file queue [HYPOTHESIS]. FTS5/SQLite scale well past this [LIKELY]. | Shard review queue by month; grow the eval set; revisit vectors only on measured FTS failure. |
| Client engagement ends | **Yes, only with per-client physical indexes.** | Delete client vault + index file; attestation from rebuild log. Impossible to prove with a shared index — another reason for Q11's design. |
| Bus factor / someone else operates it | **No today.** | The §6 runbook *is* the fix — portability work and survivability work are the same work. |

---

## 9. WHAT I WOULD NOT BUILD — AND WHAT I'D DELETE

**Not build:**
- Any vector database, embedding pipeline, or pgvector extension — until the golden set proves FTS5+weighting insufficient.
- Continuous email/Slack ingestion — T3, unbounded scope, and the selling point of a video aimed at enterprises.
- A second MCP server, a graph database, a daemon of any kind, auto-promotion of anything to canon, any "Gravity" integration.
- LLM summarization of the book corpus — 3,658 books distilled is a cost center answering questions nobody asked; ingest metadata + full text (already done) is sufficient.

**Delete / retire:**
- Every `/home/kali/` path in every doc (§2e) — this week, by grep.
- The `design.html` hand-maintained mirror — replace with a *generated* artifact from `design.md` (build step, not a second source of truth) or drop it.
- The "Why It's Better Than RAG" table — replace with the two-tier doctrine (§3); the table argues against a strawman and will keep confusing future reviews.
- The master plan itself — superseded by §3's one-pager, not patched.
- MEMORY.md as a mechanism — once recall works, it's a stale hand-index; retire by policy.

---

## 10. OPEN QUESTIONS FOR SEAN

1. **Gravity** — one paragraph: what it is, what it reads/writes, whether it touches canon. [UNKNOWN — §2g]
2. **Fable's actual role** — the brief says "Fable is now part of Mythos" without defining either's current function. The authority hierarchy (Sean > Fable > Opus…) needs one authoritative written form before weighting is implemented. [UNKNOWN]
3. **clients-private going forward** — is the 87-file exclusion a permanent solo-only arrangement, or should ingestion of that collection stop entirely? My recommendation is the latter; the decision is yours. 
4. **Ingestion host** — repo-to-WSL mount performance for the ingestion path is unmeasured. [UNKNOWN — likely fine at 2.3 MB, measure once.]
5. **Golden-set seeding** — do you have 2–3 hours to hand-write the first 40 questions from memory of real past lookups? The eval is worthless if I generate the questions; they must be *your* real questions.
6. **The eval's home** — repo (portable, versioned) vs vault (near the index). I recommend repo; confirm.
7. **MEMORY.md capacity policy** — what's the intended retirement trigger once recall exists? [UNKNOWN]
8. **Distillation budget ceiling** — what's the per-run dollar cap for the gated spike (Rule 16 needs a number)? [UNKNOWN]

**Bottom line, as requested, unsoftened:** you already have most of what you need. The working FTS5 brain, the PII gate, and the evidence-gate pattern are genuinely good and genuinely portable. Add the eval harness, point the existing index technology at your own operational corpus, enforce the staleness rules you already wrote, wrap it in one query CLI — and stop. Defer distillation behind a gate, defer embeddings behind measured failure, and spend the saved effort packaging the five artifacts as the consultancy product. The Cerebras architecture is a correct answer to a problem you do not have.
