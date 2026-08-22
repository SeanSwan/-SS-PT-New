# SwanGuard news lane — hostile review + completion blueprint request

**For:** Kimi K3 · GLM 5.3 · Grok 4.6 · DeepSeek V4 Pro. **Final seat:** Fable 5 (arbitrates).
**Date:** 2026-08-22. **Repo:** SwanGuard-Newsroom, branch `merge/newsroom-mainline-v3`, HEAD `88f1543`.

You are reviewing a real, running system, not a proposal. Two things are wanted, in this order:

1. **A hostile review of everything built so far** (§2–§4). Find defects, unsafe assumptions, and
   claims the evidence does not support. Be specific: file, symptom, reproduction.
2. **A completion blueprint** for the remaining slices (§5): the best wireframe / architecture /
   **Mermaid flowchart** you can give for finishing this lane end to end. Concrete enough that a
   builder executes it without asking you a question.

---

## 1. What the product is

SwanGuard is a **news source-trust** product. Its architecture doc (`267-wikibrain-architecture-plan.md`,
panel-reviewed) fixes three load-bearing calls:

- **A disagreement map, NOT a truth oracle.** Show who claims what, from which source, when, and
  where sources disagree, with the primary document attached. **Verdicts stay human-set.**
- **Not RAG.** Normalised tables + deterministic clustering. Embeddings reopen only on demonstrated
  failure.
- **Syndication keys on SOURCE-side evidence**, never on LLM-restated text — restated text makes
  independent reports look identical and therefore *hides* corroboration.

Ingestion is **shadow-only** today: RSS headline + snippet + link-out, under an explicit licence
posture. Nothing is republished.

---

## 2. What exists and is verified (do not re-derive; attack it)

### 2.1 Connector runtime
- Connector families: `cpsc_recalls`, `nws_alerts`, `federal_register`, `news_rss`.
- **Per-outlet keys**: each news outlet syncs under `news_rss:<outletId>` so runs, receipts, quota
  and health are isolated. Type: `OfficialConnectorKey = LiteralKey | \`news_rss:${string}\``.
- Enabling requires, in order: contract gates signed → kill switch clear → exact activation phrase
  → `setOwnerEnabled` → `sync()`. Both contract gates for the news lane are already signed.
- **Live DB (2026-08-22, one query):** creator 51 (0 enabled) · news_rss_sources 39 (all
  `lifecycle=dormant`) · outlets 39 · official_connector_items 10 · official_connector_states 1
  (`news_rss:npr_news`, owner_enabled=true, quota_spent 2) · contract_approvals 2 · creator_item 0.

### 2.2 Slices completed this week
| Slice | Commit | What landed |
|---|---|---|
| A | `c212d41` | Deliberate sweep of every `connectorKey` comparison for per-outlet blindness (three such bugs had been found by accident; the worst discarded every fetched item while reporting `itemsFetched: 10`). No fourth site. A **lexical tripwire** test scans `apps/api/src`, `apps/web/src`, `packages/domain/src`, `packages/database/src` for 8 bug shapes and fails unless `isNewsRssOutletKey` is consulted; it self-tests that it fires on each shape. |
| B0 | `0622ca8` | `listOutletStatuses()` + `GET /api/owner/official-connectors/outlets`. Read cost **constant in outlet count** (one read each: approvals, kill switches, states, registry) via a new `store.listStates()`. Listing = registry ∪ per-outlet keys holding state without a registry row (an orphan lists as `provider_not_configured`, not as nothing). `listStatuses()` kept its four-family contract but batched. Live-Postgres verified. |
| B1a | `9cfcb9b` | Owner console's `OfficialConnectorKey` listed **three** families while the API returns four → the news card rendered an activation-phrase input that could never validate (correct phrase, disabled button, no explanation). Fixed; phrase map typed `Record<FamilyKey,…>` so a forgotten family is a compile error. Read-only outlet panel added. |
| — | `366d6ab` | `listKillSwitches()` issued **nine INSERTs on every read** (catalog re-seeding) before its select. Every connector status check goes through it. Now the select decides; seeding only when a default key is absent, as one multi-row insert. Live listing 742ms → 45ms, zero writes (asserted). |
| B1b | `5fd3450`, `88f1543` | Batch enable/disable: selection + one activation phrase + one confirm, **no per-row switch**. Sequential per-key PUTs (`setOutletsEnabled`), one result row per key, ledger reports "N of M" and names failures — a partial batch cannot be rounded up. Only outlets whose **sole** blocker is `owner_not_enabled` are selectable for enabling. Disable needs no phrase (matches server). Warns when the filter hides still-selected rows. |

### 2.3 Test baseline (2026-08-22)
`scripts` 138/0 · `api` 516 pass **+1 pre-existing red** (`civicOfficialSourcesRoutes.test.ts`,
"returns nothing while gated…") · `web` 401 · `database` 90 · `domain` 242 · type-check clean.

---

## 3. Known defects and open questions — attack these hardest

1. **The owner console is not in the production bundle.** `apps/web/src/App.tsx`, which renders
   every owner panel (including the connector wall that predates this work by many phases), is
   imported by exactly one file: `src/testAppHarness.ts`. Production entry is `main.tsx → RootApp`,
   which renders `AuthGate` + `NewsroomShell` only. `vite build` transforms 1,673 modules into one
   320 KB chunk containing `createRoot`/`themeEngine` but **zero** occurrences of
   `official-connectors-title`, `owner-console`, `Kill switch` or `Watchtower`. The build is
   deterministic (a probe line moves the hash; removing it restores it exactly).
   **Consequence: B1a and B1b are tested code that no user can reach.** Whether the console should
   ship from this entry, live behind a Newsroom route, or stay parked is the owner's decision.
   *Tell us the right resolution and what it costs.*
2. **A pre-existing red test** sits in the api baseline. A baseline whose expected output includes a
   failure cannot distinguish "same old red" from "old red plus new red" without reading the name.
3. **`legalApprovalRecorded` is an attestation, not a config flag** — signed once, on the owner's
   explicit instruction. Whether one attestation covers 107 not-yet-imported feeds is unresolved.
4. **A percent-encoded path** (`/official-connectors/out%6Cets`) misses the literal `/outlets` route
   and falls to the generic `:connectorKey` matcher → 405. House-wide behaviour, not specific to
   this route.
5. **Unknown outlet vs not-ready are indistinguishable at HTTP.** Enabling `news_rss:ghost` returns
   409 `connector_not_ready`, not 404, because the family definition resolves for any `news_rss:*`
   key and the missing provider becomes a blocker.

---

## 4. The standing laws this lane is built on (say if any is wrong)

1. **An absent value is not an instruction to erase.** Upserts use `coalesce(excluded.x, table.x)`;
   the jsonb form is
   `config = news_rss_sources.config || jsonb_strip_nulls(excluded.config) || jsonb_build_object('lifecycle', coalesce(config->>'lifecycle','dormant'))`.
   Known caveat: `||` is a **shallow** merge — safe only while `config` stays flat.
2. **Born disabled / born dormant.** Never write `enabled` or `lifecycle` from the seed in a
   `DO UPDATE SET`. Guards are structural: the column is absent from INSERT and UPDATE, a test pins
   the exact statement, and migration 0028 triggers refuse `enabled=true` on insert and any
   false→true without an owner-attributed event. (A runtime "count unmoved" assertion was
   deliberately removed after it false-positived twice under READ COMMITTED.)
3. **A fake-client suite proves the question; only a live run proves the answer.** Two bugs passed
   the fake suite and died on real Postgres.
4. **A regression test never run against the broken code is a decoration.**
5. **A read must not write.**
6. **Do not spoof a publisher's block.** 23 candidate feeds were dead and excluded; several others
   403 non-browser agents and were dropped on purpose.

---

## 5. WHAT WE NEED FROM YOU — the completion blueprint

Remaining slices, as currently planned. **Challenge the decomposition itself if it is wrong.**

| Slice | Intent |
|---|---|
| **B2** | Re-probe the 107 verified candidates (`config/verified-feed-candidates.json`; probed 2026-08-21, liveness decays and the file carries no re-probe step). Define what "zero overlap with the existing 39" was measured over — it was feed-URL string equality, not outlet identity or content. Supply `termsUrl` and `ownership` **per outlet** (absent from probe output; every entry needs a real terms URL — that is the licence posture). |
| **B3** | Merge the 107 into `config/owner-news-sources.json` **born dormant**, then enable in batches, with a retention/volume budget set **before** first ingest (2,951 items available at probe time; today the whole system holds 10 items). |
| **C (W0)** | Wire `news` as a third `WikiSourceModule`. `intelligenceWiki.ts` accepts only `comment_intel` / `influence_intel`. Previously mis-sized as "one line"; it is a module interface + ingestion mapping + tests. |
| **D (W1)** | Claim extraction — the first step toward scoring. Doc 267 §4 governs the licence boundary. |
| **later** | Clustering / syndication detection on **source-side** evidence; the disagreement map surface. |

**Deliver, concretely:**

1. **A hostile review** of §2–§4: what is wrong, what is fragile, what is claimed beyond its
   evidence. Rank by severity, name file/symptom/reproduction.
2. **The slice plan to completion** — correct the decomposition above if it is wrong, give ordering
   with explicit dependencies, and name the acceptance evidence each slice must produce.
3. **A Mermaid flowchart** (```mermaid fenced) of the end-to-end lane: feed candidate → probe →
   seed (dormant) → owner enable → sync → items → claim extraction → clustering → disagreement map,
   showing every governance gate (contract, kill switch, phrase, quota, retention) as a decision
   node, and where a failure lands (receipt, blocker, ledger).
4. **A wireframe** (ASCII or Mermaid) for the operator surface that makes 146 outlets governable:
   what an operator must see, in what density, to enable feeds in batches safely and to notice a
   feed going stale. State where it should live given finding §3.1.
5. **The data model delta** for claim extraction and syndication that honours "source-side evidence,
   not restated text" — tables, columns, and the provenance fields that make corroboration
   detectable.
6. **The three biggest risks** to finishing this lane, each with a mitigation that is a build step,
   not an intention.

Assume competence and be blunt. Where you disagree with a decision above, say so and give the
better one. Where evidence is missing, say what to run rather than guessing.
