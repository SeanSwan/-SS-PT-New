# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/brain-review/KIMI-PASS-D.md
**Seed:** .ai-workflow/brain-review/KIMI-PASS-C-HOSTILE.md
**Tokens:** 7783 in / 6849 out · **Cost:** ~$0.1261 · **Wall:** 281.8s

---

# KIMI PASS D — UNIFICATION: ONE BRAIN OR TWO?

**Stance:** I wrote Pass C. Sean accepted it. New evidence says part of it was designing around an absence that didn't exist, and missed a live exposure path I should have caught. Both errors get corrected here. The MVE ruling survives; its shape gets smaller and its start date gets earlier.

---

## 1. REVISED VERDICT

1. The MVE stands: writer-first, mechanical confidence, packet adjudication, Sean-is-the-gate. Nothing in §2 resurrects the broker, the coverage matrix, or the wiki emitter.
2. **The week-6 gate's first item — 5 MCP read tools, ~150 lines, 1 day — is deleted, not deferred.** [VERIFIED] `brain_search(query, collection=...)` already exists. Citation retrieval arrives day 5 for the cost of an emitter (~60 lines), not a server.
3. **The design-claims corpus becomes a collection in the existing vault index. One brain.** [VERIFIED as ruling; reasoning §2 below]
4. **New highest-severity finding: `--include-private` is a one-flag silent PII exposure path.** [VERIFIED] It outranks everything else in this pass. Guard + segregate, half a day, Monday.
5. **A fully D1-independent plan now exists.** [VERIFIED as logical consequence] Repo-corpus ingestion + claims plumbing + the PII guard all pay off whether or not Mobbin agent-inspection survives Sean's ToS reading. Pass C said "if D1 is bad, build nothing." That was correct *for the Mobbin-dependent plan*. It is no longer the whole plan.
6. Net effect: the plan Pass C priced at "~790 lines, 5 days, week-6 evidence gate" is now "~700 lines, 5 days, and the gate's best item is already free." Smaller and sooner. That is the good outcome and I am saying so.

---

## 2. ONE BRAIN OR TWO

**Ruling: ONE BRAIN. `design-claims` becomes a collection in the existing index, alongside `books`, `desktop-c-pdfs`, etc.** [VERIFIED as my ruling]

**Why Pass 0's "separate indexes per trust zone" no longer holds:**

- Pass 0's argument was "merging re-opens the PII-exclusion question for zero benefit." That was written assuming trust separation required physical separation. It doesn't. A collection label is mechanically-enforced trust separation — `PRIVATE_COLLECTIONS = {"clients-private"}` proves the mechanism already works at build time (87 files, 0 rows indexed [VERIFIED]), and `brain_search(collection=...)` enforces it at query time [VERIFIED]. The label *is* the fence. Pass 0 was solving a problem the codebase had already solved.
- **What separate indexes actually buy** is blast-radius containment for the `--include-private` failure mode. That is a real benefit — and it is exactly why the §3 ruling puts private builds in a *separate DB file* while everything else shares one index. You get physical segregation precisely where the trust boundary is sharp (client PII) and label segregation where it's soft (claims vs. books). Two fences, each at the right boundary. Building a third index for design-claims buys nothing the label doesn't already provide.

**Ranking degradation concern (the honest attack on one-brain):** [HYPOTHESIS] Mixing ~70 claim rows into an FTS table with 3,094 books could bury claims in unscoped queries. But `brain_search`'s collection filter means scoped queries (`collection='design-claims'`) rank only within the collection — unaffected. Unscoped queries returning books ahead of claims is *correct behavior* for a reference corpus. Empirical check on day 2 (§7): run three claim-shaped queries scoped and unscoped; if unscoped ranking is useless, that changes nothing, because every real consumer scopes.

**The reverse direction — should design work cite the book corpus? YES, plainly.** [VERIFIED as ruling] This is not scope creep; it is the entire Karpathy thesis finally firing. 3,094 indexed books + `brain_search` + zero new code = the adjudication packet can carry one "corpus echoes" line per claim (agent runs one scoped search while drafting; if nothing relevant, the line says "none"). Cost: a paragraph in `synthesize.mjs`'s prompt and a line in the packet template. ~10 lines. A claim about progress visualization citing both a shipped product and Tufte is a capability no competitor workflow has, and it costs less than the meeting you'd have about whether to build it. The only failure mode is the agent padding packets with spurious citations [HYPOTHESIS] — mitigated by Sean already reading every packet; he deletes noise in seconds.

**Cold-client install** [LIKELY]: one index is *simpler* to port, not harder — copy vault, run `build`, done. The consultancy story gets better, not worse.

---

## 3. THE `--include-private` RULING

**[VERIFIED as exposure path]** Today: one invocation of `build --include-private` — by Sean, by any agent with shell access, by a future client-install script copy-pasted from a blog post — silently indexes 87 client files into a 535 MB index queryable by every MCP consumer including Hermes. No confirmation, no audit trail, no signal except row-count drift. In a system that otherwise gets privacy right (default exclusion working, 0 rows indexed), this is a loaded gun with the safety on *only* because nobody has touched the trigger yet. With multi-client consultancy planned, the corpus of indexable private material is about to grow across client boundaries, where a leak isn't just embarrassing — it's a cross-client confidentiality breach.

**Ruling: GUARD + SEGREGATE. Do not remove.** Removing the flag entirely forecloses a legitimate future use (Sean may someday *want* his own private material searchable by his own local tools [HYPOTHESIS]) and invites someone to re-add it worse. The fix has four parts, ~50 lines, half a day:

1. **Physical segregation — the load-bearing change.** `--include-private` builds private collections into a **separate database file** (e.g., `brain_index_private.db` alongside `brain_index.db`). The main index file — the one the MCP server opens, the one that gets backed up, demoed, and eventually copied into client installs — becomes *structurally incapable* of containing private rows. This converts "silent content contamination" into "a separate file exists," which is visible, auditable, and excludable from any demo or handoff by filename.
2. **The MCP server never opens the private DB.** Not behind a flag, not behind a param — the server code has no path to it. If Sean later wants private search, he runs the CLI against the private DB directly, in his own terminal, where he is the consumer. Hermes and every future MCP consumer are excluded by construction.
3. **Interactive confirmation + audit.** `build --include-private` prompts: `This will index 87 files from collections: clients-private. Type the collection name to confirm:` — refuses in non-interactive shells unless an explicit `--yes-i-understand` flag is present, and **appends one line to an audit log** (`logs/private-builds.jsonl`: timestamp, collection, file count, DB path, invoker from env). Audit entry survives even if the build is later deleted.
4. **`brain_status` warns.** If a private DB file exists, `brain_status` includes `"private_index": {"present": true, "built": "<date>", "rows": N}` — so the daily-brief surface Sean already looks at carries the signal. [UNKNOWN whether `brain_status` currently reports anything like this; assume not, add it.]

**What this is not:** it is not a broker, not a gate state machine, not ceremony. It is four mechanical facts: private rows can't touch the main file, the server can't touch the private file, every inclusion leaves a line in a log, and the status tool says so out loud. Each is independently verifiable in one test. Total: ~50 lines + ~40 lines of tests. **This is the Monday task (§8).**

---

## 4. REVISED MVE

Pass C's file list, corrected:

```
scripts/design-brain/                 (unchanged from Pass C except:)
  src/paths.mjs          ~40          — jail root (Day 1)
  src/writer.mjs         ~120         — jail, symlink, atomic rename, audit log (Day 1)
  tests/writer.test.mjs  ~120         — the 9 acceptance tests, unchanged (Day 1)
  schemas/*.json                      — receipt, claim (Day 2)
  src/validate.mjs       ~60          (Day 2)
  src/log-receipt.mjs    ~80          (Day 2)
  src/synthesize.mjs     ~160         — mechanical confidence + ONE corpus-echoes
                                        search per claim via brain_search CLI (Day 3)
  src/packet.mjs         ~100         — BATCH-Wnn.md + corpus-echoes line (Day 3–4)
  src/adjudicate.mjs     ~120         — letters in, claims.jsonl updated (Day 4)
  src/emit-vault.mjs     ~60   [NEW]  — accepted claims → one .md note per claim in
                                        vault/design-claims/, then shell out to
                                        `hermes2_brain_search.py build` (Day 4–5)
  config/domains.json · config/doctrine.md   (Day 5, Sean, 2h)

DELETED from the plan entirely:
  ✗ week-6 gate item 1: "5 read-only MCP tools, ~150 lines, 1 day"
    — replaced by emit-vault.mjs + the existing brain_search. Retrieval is free.
```

**Net: ~760 lines, still 5 days, and the corpus is FTS-searchable through the existing MCP server from day 5 instead of week 6+1.**

**Does `INDEX.md` survive? YES — rule stated honestly:** [VERIFIED as judgment] FTS ranks; grep does not — but Sean doesn't grep his claims corpus, he *reads* it, all of it, weekly, N≈70. `INDEX.md` is 20 lines inside `adjudicate.mjs` and serves the human scan. `brain_search(collection='design-claims')` serves agent/builder retrieval. Different consumers, both nearly free, no conflict. The day `INDEX.md` regen costs more than zero, kill it — that day is not this week.

**`claims.jsonl` remains the source of truth.** [VERIFIED] Vault notes are a *derived, regenerable* read-model (same discipline as Pass C's wiki verdict — the difference is this read-model costs 60 lines and rides an index that already exists, instead of 180 lines and a graph nobody needs). The single-store rule survives: claims live in one ledger; the vault collection is a projection.

---

## 5. THE D1-INDEPENDENT PATH

**[VERIFIED as the most important correction in this pass]** Pass C said: "If D1 resolves risky, build nothing and send Sean to look at good apps for 16.5 hours." Under the old facts that was right — every component of the plan was downstream of agent Mobbin inspection. Under the new facts it is wrong, and I am reversing it:

**None of the following requires Mobbin agent-inspection:**

| Work item | D1-dependent? | Pays off if D1 fails? |
|---|---|---|
| `--include-private` guard (§3) | No | Yes — protects the consultancy business itself |
| Repo-corpus ingestion (~100 handoffs, review queue, 145 Hermes memos → `repo-docs` collection) | No | Yes — 2.2 GB brain finally sees the project that built it |
| Writer + schemas + synthesize + packet + adjudicate | No | Yes — the structuring engine works with *any* inspector, including Sean dictating notes (Pass C's own fallback) |
| `emit-vault.mjs` + design-claims collection | No | Yes — same |
| **Mobbin harvest (agent inspection runs)** | **Yes — gated on D1** | — |

Even in the worst D1 branch, Sean ends up with: a private-data guard his consultancy needs regardless, a brain that can search its own repo, and a claims engine fed by his personal Mobbin browsing (which is unambiguously within terms). Pass C priced that fallback as "do-nothing plus a markdown template." That was too cheap on the structuring side — with retrieval now free, the engine-plus-template gap is ~5 days of build that produces a durable, citable, client-demonstrable asset. **A plan that pays off either way beats one that waits. Sean starts Monday. D1 stops being a blocker and becomes a scope dial: it sizes the harvest, not the project.**

---

## 6. GAP RULINGS

1. **Ingestion cadence / staleness — BUILD SMALL.** [LIKELY] Add `index_age_days` and `newest_source_date` to `brain_status` if absent [UNKNOWN — check Monday, ~15 lines], and one shell alias Sean runs when he drops new PDFs in (`brain-build`). Defer cron/launchd automation until the second time he forgets — the reminder is the status output he already reads.
2. **Repo corpus — BUILD, and it goes FIRST** (before design claims; §7). One-day job now that `build_index` and its conventions are known [LIKELY]. Immediate value, D1-independent, and it *rehearses* the exact add-a-collection mechanics that design-claims will use the same week. **Gate: secret-scan the repo docs before indexing** [UNKNOWN whether handoffs/memos contain API keys, client names] — a `gitleaks`/`grep` pass, 30 minutes, non-negotiable.
3. **Build→brain feedback loop — BUILD THE 15-LINE VERSION, week 2.** Cheapest honest form: `log-usage.mjs` — one CLI appending `{claim_id, used_in, outcome: worked|failed|unclear}` to `usage.jsonl`; `packet.mjs` header prints usage counts per claim. This is the only loop that makes the corpus compound and the only defense against claims becoming mythos. It does not earn automation, dashboards, or Linear sync.
4. **Multi-client isolation — BUILD THE FOUNDATION NOW, defer the runbook.** The §3 segregation (separate private DB, server can't open it) *is* the multi-client foundation. The full install runbook stays deferred until a second client exists [VERIFIED — Pass C stands].
5. **Consultancy artifact — DEFER to after the pilot, then build the 2-pager.** Smallest demonstrable artifact: a 2-page methodology ("how I run a design-claims engine") written from *real week-2 evidence*, plus one live `brain_search` demo on the public book corpus. Written before the pilot it's marketing; written after, it's evidence. Sean's preference says finish rather than perfect — the 2-pager writes itself once the pilot exists.
6. **What Sean and prior passes both missed — the self-reference loop.** [HYPOTHESIS, name it now] Ingesting 145 Hermes memos and months of agent brainstorms into a corpus that *Hermes itself queries via MCP* means the agent's prior outputs become retrievable "evidence" for its future outputs. Unmanaged, this is a confidence-laundering machine: an agent asserts something, the memo gets indexed, a later search surfaces the assertion as corroboration. **Rule: `repo-docs` collection rows are excluded from corroboration logic by label** (same mechanism as trust tiers — agent-generated text never raises a claim's confidence; only products and books do) and the packet's corpus-echoes line searches `books` only. Cost: one line in `synthesize.mjs`. Second missed item: **the 535 MB index is a derived artifact — never back it up** [VERIFIED as judgment]; it rebuilds from source via `build`. Backup policy covers source PDFs + `claims.jsonl` + audit logs only. Saves real time and money at 2.2 GB scale.

---

## 7. SEQUENCING

**Order: PII guard → repo corpus → claims engine → (D1-gated) Mobbin harvest.**

1. **Guard first** because it is the highest-severity item in the review, it's half a day, and everything after it touches the index. [VERIFIED]
2. **Repo corpus second** because it rehearses add-a-collection mechanics on low-stakes data before the claims pipeline depends on them, it's D1-independent, and it's the single biggest value-per-hour item available (a day to make the brain see its own project). [LIKELY]
3. **Claims engine third** (Days 3–5) on now-proven collection conventions. Friday pilot: one D01 surface, 4 products — **inspector = agent if D1 is resolved clean, Sean dictating structural notes if not.** The pilot runs either way; only its fuel changes.
4. **Mobbin harvest last and gated.** If D1 resolves risky, the harvest shrinks to Sean-bound observation and the engine still earns its keep (§5). D3 (depth-domain swap) stands as Pass C ruled — the new evidence doesn't touch it, but the 3-month-stale priorities doc it rests on gets re-read during Sean's Day-5 config block, not before. [VERIFIED — cheapest honest handling]

---

## 8. THE MONDAY TASK

**SWA-16: Close the `--include-private` exposure path.** Sean or an agent, one sitting, ~half a day.

**Files:**
- `~/hermes2/brain-vault/tools/hermes2_brain_search.py` — modify the `build` subcommand
- `~/hermes2/brain-vault/tools/hermes2_brain_mcp_server.py` — verify (do not "add") that no code path opens the private DB
- New: `~/hermes2/brain-vault/tools/tests/test_private_guard.py`

**Spec:**
1. `build --include-private` writes rows from `PRIVATE_COLLECTIONS` into `brain_index_private.db`; `brain_index.db` byte-content is unchanged by the flag (assert via checksum before/after in test).
2. Interactive run: prompt requires typing `clients-private` to proceed. Non-interactive (no TTY): refuses unless `--yes-i-understand` is also passed.
3. Every invocation appends `{ts, collections, file_count, db_path, user}` to `logs/private-builds.jsonl`.
4. `brain_status()` output includes `private_index: {present, built, rows}` (absent DB → `present: false`).
5. Test file asserts: default build → 0 private rows in main DB [matches today's VERIFIED state]; flagged build → rows land only in private DB; non-interactive flagged build without `--yes-i-understand` → non-zero exit, no rows written, no audit line.

**Commands (adapt paths if they differ):**
```
cd ~/hermes2/brain-vault/tools
python -m pytest tests/test_private_guard.py -v
python hermes2_brain_search.py build                       # default path still clean
python hermes2_brain_search.py status                      # shows private_index block
```

**Acceptance test:** all guard tests pass; a deliberate `build --include-private < /dev/null` refuses; a confirmed test build produces `brain_index_private.db` and exactly one audit line; then **delete the test private DB and confirm `status` returns `present: false`.** Stop condition unchanged in spirit from Pass C: nothing else gets built until the guard is green. Tuesday starts the repo-corpus ingestion (Gap 2).

---

## 9. WHAT I STILL WOULD NOT BUILD

Everything Pass C cut stays cut — none of the new evidence resurrects any of it: broker, circuit-breaker, `authorizedRuns`/`control.mjs` gate, 55-cell coverage matrix, trigram dedupe (until the merge problem *appears*), `doctrineConflictCheck`, wiki-emit + Mermaid, the 10-question eval harness, Linear sync, the multi-client runbook before client two. **Newly added to the do-not-build list:** a second MCP server or second design-claims index (the collection label does the job — building either is re-buying separation you already own); vector embeddings over the vault (FTS + scoped collections is strictly sufficient at this scale [HYPOTHESIS]); backup infrastructure for the derived index; and any automation of the private-build path beyond the §3 guard — that path should *stay* slightly annoying. Friction is the feature there.

---

## 10. OPEN QUESTIONS

- **[UNKNOWN — D1]** Mobbin ToS. Still Sean's read, still unmitigated-by-design in the permission sense — but no longer blocking anything on this page except the harvest's *scale*.
- **[UNKNOWN]** Does `build_index` add a new collection by directory convention alone, or does it need a config/registry edit? Day-2 task opens with 30 minutes of reading; if it's worse than a config line, the repo-corpus day slips, not the week.
- **[UNKNOWN]** Does `brain_status`/`daily_brief` already report index age or source freshness? Check before writing Gap-1 lines.
- **[UNKNOWN]** Do repo handoffs/memos contain secrets or client names? Gate on Day 2; secret-scan is non-negotiable before indexing.
- **[UNKNOWN]** Empirical FTS behavior of a 70-row collection inside a 535 MB index — scoped queries should be clean, but the day-2 ranking check is the verification, not an assumption.
- **[UNKNOWN]** Whether `books` collection contains anything client-adjacent that shouldn't be in a consultancy demo. [LIKELY clean — 3,094 books — but a 10-minute spot-check precedes any client-facing demo.]
- **[UNKNOWN]** K1–K4 composition — now relevant only if a later integration with `evidence-gate.mjs` is ever authorized; the 30-minute read Pass C prescribed still costs 30 minutes and is still optional.

**Bottom line, no authorship attached:** Pass C's spine was right and its map was wrong — it routed around an MCP surface that already existed and walked past a live PII trigger. The corrected plan is smaller (one gate item deleted), sooner (Monday start, fully D1-independent), and safer (the exposure path gets closed before the corpus grows across client boundaries). Guard Monday, repo corpus Tuesday, claims engine by Friday, and D1 — whenever Sean reads it — adjusts the throttle, not the direction.
