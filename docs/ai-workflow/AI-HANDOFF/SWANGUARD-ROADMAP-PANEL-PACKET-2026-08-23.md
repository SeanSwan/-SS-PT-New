# SwanGuard news lane — hostile review of everything shipped, and the road to done

**For:** Grok 4.6 · DeepSeek V4 Pro · Kimi K3 · GLM 5.3. **Final seat:** Fable 5 — **every finding is
executed before it is acted on.** Two previous panels named a real bug class and the wrong mechanism;
a confidently-wrong mechanism costs more than a missed bug, so mark confidence honestly.

**Repo:** SwanGuard-Newsroom `merge/newsroom-mainline-v3` @ `b58459f`. **Date:** 2026-08-23.
**Suites:** api 523 pass / 0 red · web 402 · domain 242 · database 90 · scripts 153 · type-check clean.

---

## 1. The product, in one paragraph

A news **source-trust** product. Its architecture doc fixes three calls: it is a **disagreement map,
not a truth oracle** (show who claims what, from which source, when, with the primary document
attached; verdicts stay human-set); **not RAG** (normalised tables + deterministic clustering,
embeddings reopen only on demonstrated failure); and **syndication keys on SOURCE-side evidence,
never LLM-restated text** — restated text makes independent reports look identical and therefore
*hides* corroboration. Ingestion is shadow-only: RSS headline + snippet + link-out. Nothing is
republished.

## 2. What is shipped and verified

**Connector runtime.** Four families (`cpsc_recalls`, `nws_alerts`, `federal_register`, `news_rss`)
plus per-outlet keys `news_rss:<outletId>` so each outlet's runs, receipts, quota and health are
isolated. Enabling requires: contract gates signed → kill switch clear → exact activation phrase →
`setOwnerEnabled` → `sync()`.

**Live DB (2026-08-23):** creator 51 (0 enabled) · news_rss_sources 39 (all `lifecycle=dormant`) ·
outlets 39 · official_connector_items 10 · official_connector_states 1 (`news_rss:npr_news`,
owner_enabled, quota_spent 2) · contract_approvals 2.

| Slice | Commit | Shipped |
|---|---|---|
| A | `c212d41` | Deliberate sweep for per-outlet blindness in `connectorKey` comparisons; lexical tripwire over api/web/domain/database, 8 bug shapes, self-tested. |
| B0 | `0622ca8` | `listOutletStatuses()` + `GET /api/owner/official-connectors/outlets`. Read cost **constant in outlet count**. Listing = registry ∪ orphaned state keys. |
| B1a | `9cfcb9b` | Owner console listed 3 connector families while the API returns 4 → the news card was a **dead control**. Fixed; phrase map typed so a forgotten family is a compile error. Read-only outlet panel. |
| B1b | `5fd3450`, `88f1543` | Batch enable/disable: selection + one phrase + one confirm, **no per-row switch**. Sequential per-key PUTs, per-outlet ledger that cannot round a partial batch up. Warns when the filter hides selected rows. |
| — | `366d6ab` | `listKillSwitches()` issued **nine INSERTs on every read**. Now the select decides. Live listing 742ms → 45ms, zero writes. |
| S0 | `d45e0e7`, `ca99643`, `e6bca37` | **Orphan factory closed** (DISABLE on any `news_rss:*` string minted a permanent state row). **9-day-old "pre-existing red" diagnosed, not quarantined** — the civic route used `new Date()` while the connector used an injected clock, so the fixture expired 2026-08-13. **Bundle-reachability control**: `config/bundle-markers.json` declares per surface whether it ships; both arms fail the build. |
| S2 | `ca49041` | **Licence gate**: a per-outlet key with no `termsUrl` gets a `terms_not_recorded` blocker; enable 409s and `sync()` refuses. Verified against the live registry first — 39/39 carry terms. |
| — | `94fea46`, `319d6b3`, `4ff9c17` | Panel fixes: rejection-path scan → keyed lookup; empty marker was vacuous (`''.includes('')`); enable trusts registry only; `hasState()` made explicit; clock defaulted at the root and non-optional downstream; reachability receipt states artifact age. |
| S3a | `b58459f` | **Probe spec + dated manifest** (below). |

## 3. S3a, just shipped — review this hardest, it is newest

`config/probe-spec.json` pins the contract a liveness probe runs under (UA, timeout, redirects,
concurrency, per-host delay, retries, liveness rule), **versioned**, because liveness is a property
of the probe: change the agent or timeout and feeds move between live and dead with nothing having
changed at the publisher.

`scripts/lib/probe-manifest.mjs` — pure builder/classifier/differ:
- **Outcome is three-valued.** `blocked_by_policy` ≠ `dead`. Recording a publisher's 403 as dead
  invites someone to "fix" it by impersonating a browser, which the policy forbids.
- `probedAt` and `specVersion` are **required, never defaulted** — stamping old evidence with
  today's date is the failure this replaces.
- A **cross-spec-version diff refuses**: differences would be attributable to the tool.
- Staleness takes an **injected clock**.

`scripts/build-probe-manifest.mjs` stamps results into a dated manifest, warns when stale, diffs
against the previous. **No network.** `config/probe-manifest.json` now carries the existing 107
stamped with the date they were *actually* probed (2026-08-21), not today.

Also found and fixed: `test:scripts` globbed `scripts/*.test.mjs` only, so `scripts/lib/*.test.mjs`
would never have run — tests passing locally, invisible to the suite.

## 4. Known-open, with my current position

1. **The owner console is not in the production bundle.** `apps/web/src/App.tsx` is imported by
   exactly one file: `src/testAppHarness.ts`. Production renders `AuthGate` + `NewsroomShell`. So
   B1a and B1b are tested code no user can reach. **Owner decision; I have not shipped it.**
2. **`feed_set_hash`** — contract approvals are family-scoped (2 rows). The terms gate narrows the
   exposure; it does not bind an attestation to a specific feed set. Open.
3. **Terms acknowledgement.** 39/39 outlets carry a terms URL; **0/39 have `terms_acknowledged_at`**.
   Gating on acknowledgement is stronger and would block all 39 including the live one — a decision,
   not a fix.
4. **`lifecycle` is display metadata, not a gate.** Verified: nothing in `officialConnectors.ts`
   reads it; the real gate is `owner_enabled`. "Born dormant" describes a control that does not exist.
5. **A percent-encoded path** (`/official-connectors/out%6Cets`) misses the literal route → 405.
   House-wide.
6. **Unknown vs not-ready** are both 409 at HTTP for family keys (per-outlet keys now 404).

## 5. The plan from here — challenge the decomposition itself

| # | Slice | Intent |
|---|---|---|
| S3b | Identity + licence registry | Overlap on **registrable domain + publisher identity + content fingerprint**, not URL strings ("zero overlap with the existing 39" was measured by URL equality). Assign `independence_group_id` — two feeds of one publisher must never read as two independent confirmations. Supply `termsUrl` + `ownership` per outlet; merge script refuses if any row lacks them. |
| S4 | Schema freeze | Provenance columns + retention/volume budget + **enforcement job** + the lifecycle decision. **The only irreversible step:** items ingested without provenance can never support syndication detection, and retention will prune the evidence. |
| S5 | Seed 107 dormant + live batch proof | Merge idempotent. First cohort of 10 live. **Mid-batch abort drill.** Orphan count zero after. Phrase absent from logs. |
| S6 | Scale proof | 146 synthetic outlets + ~3k items on live Postgres; re-run read-cost, ledger and trigger assertions. **Quota ceiling observed firing.** Every perf claim to date was measured at 1 state row and 10 items. |
| S7 | `news` as a third `WikiSourceModule` | `intelligenceWiki.ts` accepts only comment_intel / influence_intel. Adding a family without a mapping should be a compile error. |
| S8 | Claim extraction | Every claim carries `source_item_id`, verbatim span offsets, ≥1 source-side evidence row. A claim with zero source-side evidence is rejected loudly. |
| S9 | Clustering + syndication | Deterministic, no embeddings. Fixture trio: shared GUID → syndication edge **not** corroboration; two feeds of one publisher → same independence group; genuinely independent conflict → one cluster two positions. |
| S10 | Disagreement map | Cluster → outlets → positions with primary-doc link-out. A system-written verdict refused by a trigger. |

## 6. What I want from you

1. **Hostile review of §2–§4.** What is wrong, fragile, or claimed beyond its evidence. File,
   symptom, reproduction, and a confidence mark: **CERTAIN / LIKELY / SPECULATIVE.**
2. **Attack S3a specifically** (§3) — it is a day old and least reviewed. Is the three-valued
   outcome right? Is refusing a cross-version diff too strict to be useful in practice? What does
   the manifest still fail to capture that a merge decision needs?
3. **The road (§5): challenge the decomposition.** Wrong order? Missing slice? A slice that is
   secretly three? What is the **first thing that becomes impossible to fix** if we proceed as
   written — and where exactly does it become irreversible?
4. **The four open decisions in §4** — for each, the call you would make and why. Do not defer them
   back; say what you would do.
5. **What would you do next, and what would you refuse to do?** Concretely: if you had this repo for
   one week, what ships and what gets deleted?
6. **The endgame.** Name the single biggest reason this lane fails to reach a working disagreement
   map, and the build step that prevents it.

Be blunt. Assume competence. No praise, no restating what the code does.
