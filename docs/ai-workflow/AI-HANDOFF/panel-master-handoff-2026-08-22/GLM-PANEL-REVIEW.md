# GLM Consult

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/MASTER-SESSION-HANDOFF-2026-08-21.md
**Tokens:** 5217 in / 21483 out (reasoning: 18202) | total 26700
**Wall:** 296.7s

---

# Hostile Review — Master Handoff 2026-08-21 + Addendum

**Verdict up front:** the document's laws are mostly sound and the document does not obey them. The addendum's two "DONE" slices each violate at least one law the same document canonized, the most consequential damage (Hermes vault contamination) is marked closed while it's open, and the verification ritual in §12 disproves the addendum's own state. Findings ranked; area tags in brackets.

---

## Ranked findings

**1. [Slices/Verification] CRITICAL — "Step 1 DONE" is false: the agent-written taste data is already exported into the irreplaceable vault.**
`taste/kept.md` was deleted, but commit `b45d12c` ("export kept prompts to Hermes") already pushed the 3 agent-written kept prompts into `~/hermes2/brain-vault` — which §8 states is **not a git repo**. No revert exists. Worse: that export ran with the **pre-fix parser**, so if `kept.md` ever held `## Killed` entries (§2.1 counts 1 rejected code), the old parser may have exported *killed* entries as exemplars too. §9.1's stated purpose — "output is partly an agent's guess at Sean's taste" — is still true for every future `swan-brain.mjs` query that surfaces the vault collection. The addendum is silent on retraction or re-export.
*Repro:* `node scripts/swan-brain.mjs "<distinctive phrase from a TEST DATA prompt>"`; read `prompter/export-to-hermes.mjs` merge semantics (overwrite-by-id or append — if append, stale entries persist even after re-export).

**2. [Slices] HIGH — The connectorKey tripwire is unproven and probably vacuous. Law 5, violated by the session that cites it.**
The addendum asserts `officialConnectorKeyUnionSweep.test.ts` "fails on any new one" but records **no failing run** — exactly the decoration Law 5 forbids, in a project where §13 admits a prior vacuous regression test. No detection pattern is documented. A regex/glob sweep has enumerable blind spots: `switch (key) { case 'creator_item' }`, `!=`, `String(key) ===`, `.startsWith('creator_')`, SQL `where connector_key = '...'`, template literals, wrong glob path (§11 records `npx tsc` resolving to a decoy — path resolution is a proven failure mode here).
*Repro:* append `if (c.connectorKey === 'creator_item') {}` to a file in `apps/api/src`, run the tripwire. Then the same line in `apps/web`. Then a `switch/case`. Report which fire.

**3. [Slices/Ordering] HIGH — "Sweep complete" is contradicted by §7's own next row.**
Slice A is marked ✅ with scope `apps/api/src`. Two rows later, the B row admits `apps/web`'s `OfficialConnectorKey` **has no `news_rss` member at all** — which is precisely Law 2's failure class (a place that forgot the union), in the one layer neither swept nor tripwired. `domain/`, `database/`, `scripts/` (all present in §12's test enumeration) are also unswept. "No remaining literal-only comparison in apps/api/src" is a scoped fact wearing an unscoped label ("sweep complete").
*Repro:* try to enable `news_rss:npr_news` from the owner console — no activation phrase exists; then note that any web-side literal comparison added tomorrow triggers nothing.

**4. [Ordering] HIGH — Slice B is scheduled before its own admitted prerequisites, and none of them have a slice.**
The table says B is next. B's own text says B "needs a per-outlet listing **first**" (`listStatuses()` enumerates only the four literal definitions) and that the web union gap makes the owner console useless for news connectors. Add: §7 states there is **no owner-role user** in the dev DB, so "enable in batches" means undocumented service-layer scripts with no listing, no UI, no visibility. And the doc never states whether the 2 signed `contract_approvals` rows are global or per-outlet — if per-outlet, batch-enabling 107 outlets collides head-on with the doc's own "[!] do not sign attestation-shaped gates without his word." B is at minimum three slices (listing fix, web union, merge+enable) mispriced as one.
*Repro:* run `listStatuses()` with per-outlet connectors present; `select * from contract_approvals` and check the key's cardinality.

**5. [Verification] HIGH — §12, the section the document tells you to read FIRST, disproves the addendum.**
§12 expects taste brain `4f4999d` / 38 checks and SwanGuard `670dccd`; the addendum shipped `b36697e` / 40 and `ea76189`. §12's npm-test baseline (scripts 138/0, api 497…) predates the tripwire file, so every suite count is stale by +1 somewhere. §4 Law 2 still says "**OPEN**: nobody has swept deliberately." The doc's own tripwire — "if anything differs, another agent has moved things — re-orient" — fires on the document's legitimate successor state. The +2 test delta (38→40) names only one new test.
*Repro:* execute §12 verbatim; observe two false drift alarms before reading anything useful.

**6. [Verification] MEDIUM-HIGH — "Kept prompts steer roughly a quarter of every batch" is arithmetically incompatible with the stated 12× weight.**
3 kept × 12 / (3×12 + 5,434 corpus) ≈ **0.7%** of generation draws. Even the charitable reading (~1 kept-derived prompt in ~23% of 40-prompt batches) is "a quarter of *batches*," not "a quarter of *every batch*." Either §5's weighting description is wrong or §9.1 inflated the contamination ~35×. The urgency of FIRST ACTION #1 was sold on the inflated figure. Law 7 — ask what a number is a count of — applies to the handoff's own prose.
*Repro:* 100-prompt batch, tag lineage, count kept-derived outputs.

**7. [Decisions] MEDIUM-HIGH — Decision #5's deadline is wrong, and it's the clearest wrong recommendation in the table.**
"Retention/volume budget owed before W3, not before N2" — but slice B (107 feeds, 2,951 items and counting, `quota_spent` semantics, zero retention policy) is the **first** volume event and precedes W3 by two slices. A budget adopted after B's ingest is a purge migration on live rows. The recommendation should read "before B."

**8. [Ordering/Laws/Slices] MEDIUM — The catalog the entire S1 build sits on has a known, unfixed classification defect, and its headline count fails the document's own Law 7.**
Law 8 records that grep-classification filed *"Asymmetrical composition"* as a painter. **No commit in either ledger fixes the catalog pipeline** — the lesson was canonized, the data wasn't rebuilt, and the 51 filters / 4,340 artists inherit unknown contamination. Meanwhile `--stats` was carefully relabelled for 407 headings while presenting **9,521 uncritically**, though the doc's own known-limit says 4,016 of those (42%) are code-less names, confirmed by sampling **3 slugs of 4,016** (0.07% — Law 11's own trap), and the remaining ~5,282 entries' composition is never broken down. There is no data-quality slice anywhere in S0–S5.
*Repro:* search the catalog JSON for "Asymmetrical composition"; report its category field. Count entries by type and reconcile 223 + 4,016 + ? = 9,521.

**9. [Decisions] MEDIUM — Decision #3's "genuine fork; his call" is an abdication the architecture already answers.**
Doc 267's load-bearing rule — syndication keys on **source-side** evidence; restated text hides corroboration — requires provenance columns (canonical source id, fetch time, restatement flag) that `comment_extracted_claims`, a table built for LLM-restated comment claims, does not have. Reuse would embed the exact defect the architecture forbids. The recommendation ("new tables") was derivable from §7's own text and omitted, while slice D is scheduled directly on top of the fork.

**10. [Slices] MEDIUM — The parser fix proved the wrong thing; the loop it guards is untested and currently dormant.**
The failing→passing test covers reader-vs-`## Killed` on a **fixture**. Nothing tests the writer/reader contract: does `POST /api/keep` (and `--keep`) append under exactly `## Kept` in the format the parser now scopes to? With kept = 0 post-deletion, the 12× channel — called "the compounding channel" in §5 — carries no data and cannot fail visibly until Sean's first real keep. Law 4 ("only a live run proves the answer") demanded one keep→regenerate→weight round-trip. Missing.
*Repro:* `node prompter/swan-prompt.mjs --keep "test"`, regenerate, verify lineage weighting, then diff the header the writer emitted against the parser's scope.

**11. [Ordering] MEDIUM — The Studio slice list never wires the learning loop into the product.**
S1–S5 contain no keep/rate surface, though the server exposes `POST /api/keep` and `POST /api/rate` and §5 calls keeping "the compounding channel." Through S5 the workbench is a static generator; rating/keeping stays CLI-only. Additionally, S1 "everything visible and clickable" is advertised on 9,521 entries of which 4,016 are unusable pending S0 (Sean-blocked) — the flagship browser launches with 42% dead cards unless S1 is scoped to code-bearing subsets.

**12. [Verification] MEDIUM — The panel was deferred a sixth time, and the addendum doesn't even flag it.**
§13's own standard: "from the fourth turn it was at least flagged at decision time." The addendum session chose two slices, never mentioned the panel, and didn't extend §13 with its own violations (Findings 2, 5, 14). Also unexplained: the panel command seats kimi/glm/grok while §3 records a four-seat panel including Qwen — the seat set silently changed. Budget $0.12–0.35 against the cost of Finding 1 alone.

**13. [Laws] MEDIUM-LOW — Law 1's jsonb recipe is unsafe as written.**
`table.config || jsonb_strip_nulls(excluded.config)` is a **shallow** merge: an incoming nested object replaces the existing one wholesale, reintroducing the erase-bug one level down — including nested owner state, which collides with Law 3's "never write enabled/lifecycle" if those bits live in config. The recipe also ships with a literal placeholder (`<owner state from existing>`), i.e., it is not a recipe. This is the only law that is *wrong* rather than merely disobeyed.

**14. [Verification] MEDIUM-LOW — "§2.2 counts re-read LIVE … unchanged" covers 6 of §2.2's 10+ numbers, and `npm test` was never re-run post-`ea76189`.**
Outlets (39 — or is the addendum's "39" the sources?), the 1-live-source status, `creator_item`, and the three zero-tables were not re-read; a new test file landed with no updated suite baseline. "Unchanged" is asserted over a subset.

**15. [Verification] LOW — Law 2's "three sites, each failing differently" is supported by one ledger-visible fix.**
Only `c90b270` obviously matches. The other two sites' fixes are unlocatable in §3 — the law's evidence is un-auditable from the document that states it.

---

## The six decisions — verdicts

| # | Verdict |
|---|---|
| 1 | **Oversold.** "One email removes the question" removes the *permission* question, not acquisition: 4,016 per-page renders, drift, site ToS vs donor status — the doc demands real terms URLs for 107 feeds and none for this source. |
| 2 | Defensible but criterion-free: "mechanically satisfiable" is undefined, so the escape hatch swallows the rule on first hard instruction. |
| 3 | **Wrong by abdication** (Finding 9) — the architecture already dictates new tables. |
| 4 | **Miscategorized.** "Does Hermes hold write tools" is a five-minute inspection, not an owner decision — the doc offloads verification onto Sean, against its own Law 11 ethos. |
| 5 | **Wrong recommendation** (Finding 7) — deadline belongs before slice B, not W3. |
| 6 | Misfiled: an approval id, a migration number, and a **known-red test** (`civicOfficialSourcesRoutes.test.ts:55`) are three unrelated items; the red test is a fix task, and a standing red in the baseline is incompatible with the tripwire posture of slice A — that file can regress again and nobody would notice. |

## Minor cluster (LOW)

- "107 feeds, every one fetched and confirmed live" — no probe date; feed liveness decays; slice B contains no re-probe step.
- "S1–S4b need no network" — S4b draws on "the guides," which live in the WSL vault under a cite-never-paste rule, forcing a runtime vault access path the claim glosses over.
- `2,951 items, zero overlap with the existing 39" — overlap of *feeds* or *items*? Method unstated.
- The addendum gives HEADs but no clean-tree claim; §12's ritual includes `git status` for a reason (§2.2 records 2 stray `.bak` files).

## Laws — net answer to (1)

No law is falsified by evidence. Four are contradicted **in application by the same document**: Law 5 (tripwire never shown failing), Law 4 (static proof accepted where a live run was owed — Findings 10, 14), Law 7 (9,521 relabel-in-place), Law 11 (3-slug confirmation, subset re-read). Law 2's `[OPEN]` marker is stale against the addendum. Law 1's jsonb recipe is defective as stated. The laws are fine; the handoff is the newest exhibit in §13 — which the addendum session declined to update.
