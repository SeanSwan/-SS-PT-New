# Kimi K3 - Review

**Reviewer:** `moonshotai/kimi-k3` (high)
**Document:** docs/ai-workflow/AI-HANDOFF/MASTER-SESSION-HANDOFF-2026-08-21.md
**Seed:** (none)
**Tokens:** 5193 in / 4615 out | **Cost:** ~$0.0848 | **Wall:** 37.0s | **finish_reason:** stop

---

# HOSTILE REVIEW — Master Session Handoff 2026-08-21 + Addendum

Ranked by severity. Section/line references are to the document as supplied.

---

## CRITICAL

### C1. §12 — the "verify before you trust" protocol now guarantees a false alarm, by the document's own rule
§12 (verification block) still expects: taste brain HEAD `4f4999d`, **38 checks**, SwanGuard HEAD `670dccd`. The addendum (top) says HEAD is now `b36697e` with **40/40 checks**, SwanGuard `ea76189`. §12's own closing line: *"If anything differs, another agent has moved things — re-orient before building."* The addendum author changed every expected value and did not update the one section the document says to read FIRST. Reproduction: run §12 verbatim against the current repos — all four expected values mismatch, and the next agent will either (a) burn time hunting a nonexistent intruder, or (b) learn to ignore §12, which destroys the protocol's value. The document's headline lesson ("a stale handoff nearly caused a duplicate rebuild") was re-committed in the same file, in the same session, in the section written to prevent it.

### C2. §4 Law 2 vs. Addendum vs. §7 — "OPEN: nobody has swept deliberately" contradicts "slice A complete"
Law 2's text still reads **"OPEN: nobody has swept deliberately."** The addendum claims the sweep is done and tripwired. Both statements are live in the same document. Worse, §7 slice B admits `apps/web`'s `OfficialConnectorKey` **has no `news_rss` at all** — that is precisely a "place to forget the union," i.e., a fourth site of the Law-2 defect class, sitting in a package the sweep never covered (`apps/api/src` only, per the addendum). So slice A's row — *"sweep found no fourth site"* — is false by the document's own evidence two rows down. The tripwire test is scoped to `apps/api/src`; the web package can grow a fifth site tomorrow and the tripwire stays green.

### C3. Slice B is mis-sized and its enabling claim is contradicted three ways inside §7
Slice B is labelled "merge the 107 feeds, enable in batches." The same table admits: (a) `listStatuses()` only enumerates the four literal definitions, so 100+ new per-outlet connectors are "reachable by direct URL but never listed — batch-enabling blind is not operable"; (b) the owner console **cannot enable any news connector from the UI**; (c) §7's own warning: **there is no `owner`-role user in the dev DB**, so owner HTTP routes are unusable and the service layer is the only path. So slice B as written requires: an importer, a `listStatuses()` fix, a web-side union extension, an activation phrase, and a dev-DB owner user — none of which are in the slice. Then the kicker: *"Both contract gates are already signed, so further outlets are just enable + sync."* But two paragraphs earlier: `termsUrl` and `ownership` are **not in the probe output** and "every entry needs a real terms URL." That is 107 manual legal/ownership data entries hand-waved into "just enable + sync," and whether the single `legalApprovalRecorded` attestation (signed once, 2026-08-21) even covers 107 not-yet-imported feeds is never examined. §13 lists "Mis-sized slices out loud" as a session failure; §7 repeats it in the very next breath.

---

## HIGH

### H1. Addendum: test-count delta is unaccounted — 38 → 40 with only one regression test described
§2.1/§12: 38 checks. Addendum: 40/40. The addendum describes exactly one new test (the kept-prompt parser regression). Where is the second? Either a second test was added and not recorded (ledger gap in a document whose entire purpose is recording), or the count is wrong. Reproduction: `git diff 4f4999d..b36697e --stat` in swan-taste-brain. In a handoff that exists to prevent stale-state bugs, an unexplained +2 in the verification baseline is disqualifying.

### H2. Addendum §2.2 "re-read LIVE … unchanged" — the verification command only covers 3 of the 6 numbers
Addendum claims six counts re-verified live: 51 / 0 enabled / 39 / 10 / 1 state / 2 approvals. The §12 psql one-liner selects only `creator`, `news_rss_sources`, `official_connector_items`. No command is given for outlets, states, or approvals, and the "0 enabled" sub-count isn't in the query either. Half the "LIVE" claim is not reproducible from the document. Also §2.2's header still says **"LAST VERIFIED EARLIER TODAY, NOT NOW"** — stale after the addendum, same class of bug as C1.

### H3. Kept-prompt parser fix — false-proof against an empty file
The fix scopes the parser to `## Kept`; regression test verified failing→passing against a `## Killed` entry. But the same commit deleted all kept prompts (kept 0). So the parser's production input is now a file with zero kept entries, and the only test fixture is the adversarial `## Killed` case. Untested and unclaimed: empty `## Kept` section, missing `## Kept` heading entirely, case variants (`## kept`), `### Kept` subheadings, a `## Kept` heading appearing inside a code block or quoted section. Law 8 ("parse the structure; do not grep the text") was applied to the catalog but the fix here is a heading-scope check — the document gives no evidence it isn't itself a grep. And with kept=0, the 12x compounding channel (§5) is now inert; no sample generation output is recorded post-deletion to show the generator still produces on-taste output from themes alone. "40/40 checks pass" is a unit-test claim being used to imply a quality claim.

### H4. connectorKey tripwire — a grep-shaped test claiming to prove a negative
`officialConnectorKeyUnionSweep.test.ts` "fails on any new one." Any static sweep for "literal-only comparison" is evadable by aliasing (`const k = item.connectorKey`), computed keys, template literals, or comparisons in helper functions — and the document provides no description of the detection mechanism, so "no remaining literal-only comparison in `apps/api/src`" is an assertion about a negative proven by a tool whose false-negative rate is unknown. Law 11 ("verify before believing an absence") is being violated by the slice that claims to honour Law 2.

### H5. §12 baseline includes a permanently red test — the baseline cannot detect new breakage
`npm test` baseline: "api 497 pass **+1 PRE-EXISTING red**." A verification step whose expected output includes a failure cannot distinguish "same old red" from "old red plus new red" without reading the failure name — and the failing test (`civicOfficialSourcesRoutes.test.ts:55`, buried in decision #6) is not named in §12. The verify-first protocol's SwanGuard leg is decorative until that test is fixed or quarantined.

---

## MEDIUM

### M1. Decision #1 recommendation is wrong or at least unexamined: "Ask Midlibrary first"
§5 establishes the 4,016 `sref-style` rows have empty API fields, hash slugs, and need per-page browser rendering. The recommendation is to email a third-party aggregator for the codes. Problems the document itself should have caught: (a) it elsewhere treats licence/terms boundaries as load-bearing (doc 267 §4, "every entry needs a real terms URL," the brain-vault "cite; never paste" rule) — yet acquiring scraped style codes from a third party gets zero licence scrutiny; (b) "one email removes the question" is false — a "no" or non-reply leaves S0 exactly as blocked, with weeks of latency added; (c) no fallback is specified. The recommendation optimizes for effort-avoidance, not for unblocking S0.

### M2. Law 6's mechanism is now untestable and its claim is stated as fact
"Rating 2 of 223 codes made the generator use only those 2. Exploration decays 100% to a 25% floor." Both rated codes were just deleted (rated 0). The 25%-floor behaviour with **zero** ratings is nowhere evidenced — does the decay schedule divide by zero, clamp, or no-op? The law's enforcement mechanism ("exploration decays… never reaches zero") cites no file or test. As written the law is unenforceable: nothing in §12 verifies the floor exists.

### M3. "107 feeds … zero overlap with the existing 39" — overlap criterion unstated
Zero overlap by feed URL string? Same outlet serving the same content from a different URL passes that check. With 39 existing sources and 107 candidates, content-level duplication (wire copy carried by multiple outlets) is near-certain and directly undermines the syndication/corroboration design in §7 (source-side evidence keying). The claim is presented as verified; the method is absent.

### M4. "Every one fetched and confirmed live, 2,951 items" — a point-in-time probe presented as a durable property
Feeds die, redirect, and rate-limit. "Confirmed live" was true at probe time; the document gives no probe date relative to the merge plan and no re-probe step in slice B. Slice B should begin with a re-probe; it doesn't.

### M5. Slice C described as "one line"
"`intelligenceWiki.ts` accepts only comment_intel / influence_intel; one line between 'has a wiki' and 'fed by the world.'" A new `WikiSourceModule` requires the module interface, ingestion mapping, and at minimum a test — §13 literally lists "Mis-sized slices out loud before reading the code path" as a session sin. Also decision #4 (Hermes write tools, P0/P1 injection boundary) gates W6, but no slice W2–W6 appears in the ordering — the slice list silently skips from W1 to nothing while decisions reference W3, W6.

### M6. Decision #6 is not a decision
"Pre-existing: approval `be60fd2c92e5bc61`, migration 0029 numbering, red test" — three unrelated items, no recommendation, no question. It's a defect list wearing a decision table's clothes, and it's where the known-red test goes to be forgotten (see H5).

---

## LOW

### L1. §2.1 still says "VERIFIED THIS TURN" over data the addendum invalidated
Rated codes 2 / kept 3 / "BOTH AGENT-WRITTEN" — all deleted per the addendum. The section header is now false. Same staleness class as C1/H2; the addendum pattern of patching the top while leaving the body stale is the document's systemic defect.

### L2. §9 "FIRST ACTIONS" still orders the next agent to do completed work
Steps 1–2 are marked DONE in the addendum but remain numbered as first actions. A skimming agent (the stated audience — "Read §12 FIRST") gets three different answers about what to do first depending on which section they land in.

### L3. SS-PT tool built on a branch 2,165 commits behind main, no merge plan
`swan-brain.mjs` + CLAUDE.md/AGENTS.md pointers on `wip/comms-notifications-2026-07-05`. The drift check "flags it every time" and the prescribed response is "verify against origin/main before auditing" — i.e., the plan is to live with it indefinitely. The pointers in CLAUDE.md/AGENTS.md will conflict or rot on any rebase; unaddressed.

### L4. Law 3's enforcement mechanism is asserted, not located
"Imports assert the enabled/live count is unmoved and abort if it moved." No file, no test name. If the assertion exists, cite it; if it doesn't, the law is aspirational. Given this document's own history of "regression tests that passed vacuously," an uncited guard claim deserves suspicion.

### L5. `--stats` relabel fixes the label, not the law
"article headings 407 (NOT a styles count)" is honest, but Law 7's root cause was a human reading a number for weeks without asking what it counted. The relabel helps; nothing verifies the other six numbers in the stats output count what their labels imply. Sibling sweep — the document's own prescribed remedy in Law 1 — was not applied to the stats output.

---

## Summary of the pattern

The addendum session did real work and then committed the exact failure the document exists to prevent: it changed ground truth (HEADs, test counts, taste data, sweep status) without updating the index, the verification protocol, the laws, or the first-actions list. Four sections (§2.1, §2.2, §4 Law 2, §9, §12) are stale in a file whose opening paragraph warns that stale handoffs cause duplicate rebuilds. The two shipped slices are narrower than claimed (api-only sweep; parser fix proven only against a fixture class that no longer exists in production data), and slice B as specified will fail on first contact with the three blockers its own row admits.
