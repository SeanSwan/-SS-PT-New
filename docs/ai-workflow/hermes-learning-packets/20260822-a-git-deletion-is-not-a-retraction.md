---
title: "A git deletion is not a retraction — and a panel over your own handoff is the cheapest audit you will ever buy"
originating_model: "claude-fable-5"
tier_basis: "claude-fable-5 is the Final Decider and a Rule-68 learning source by definition; this session ran as Fable 5, ordered and arbitrated the panel, and authored every fix and verification here."
privacy: "IDs and roles only. No client names, no PII, no credentials, no absolute paths, no key values. Secret-scanned clean before commit."
date: 2026-08-22
surface: "swan-taste-brain (Hermes vault export, local write API) / SwanGuard connector tripwire / master handoff"
decision: "Deleting a source file retracts nothing that was already exported, indexed, cached or copied; 'deleted' is a claim about every copy, so name every copy. And: a hostile panel over a handoff you just wrote finds the places where you patched the top and left the body stale — every seat found it."
status: shipped
supersedes: none
models_used:
  - model: "claude-fable-5"
    role: "builder + final seat + final decider"
    did: "ran the six-seat panel once (Sean's order); verified every finding against code, the live vault and the live DB before acting; fixed the real ones; recorded the disputed ones with reasons; rewrote every stale section of the handoff; ran a 4-round dry-loop over its own fixes"
    cost: "subscription"
  - model: "openai/gpt-5.6-sol-pro"
    role: "external hostile review"
    did: "found the drive-by-writable localhost write API (real, fixed with live curl proof) and the vault contamination (real); correctly called the tripwire lexical; 45k output tokens"
    cost: "$0.55 against a $0.10 estimate"
  - model: "moonshotai/kimi-k3"
    role: "external hostile review"
    did: "found Law 3 described a runtime assertion the code had deliberately removed (real, unique); every stale-section finding; sharpest on the document contradicting itself"
    cost: "$0.085"
  - model: "glm-5.3"
    role: "external hostile review"
    did: "found the vault contamination (real, first to say it); measured-vs-claimed kept share (real — 7.5% not 25%); jsonb || is shallow (real caveat); Decision 5 deadline wrong (adopted)"
    cost: "subscription"
  - model: "deepseek/deepseek-v4-pro"
    role: "external hostile review"
    did: "restated the stale-§12 and slice-B findings; 'Law 6 contradicts itself' was a misread (before/after)"
    cost: "$0.0065"
  - model: "deepseek/deepseek-v4-flash"
    role: "external hostile review"
    did: "independent, fair challenge to Decision 1 (Midlibrary email is not acquisition); otherwise restated; 'Law 5 is a tautology' rejected"
    cost: "$0.0014"
  - model: "x-ai/grok-4.6"
    role: "external hostile review"
    did: "returned 317 tokens of 'I'll start by…' and no findings"
    cost: "$0.013 — a dud seat; drop from future panels"
skills_touched:
  - id: "consult-panel.mjs (seat routing)"
    change: "proposed"
    motivating_failure: "Grok 4.6 returned zero findings; Sol Pro overshot its estimate 5×. Proposal: drop grok from the default seat list; pass an output cap to sol."
  - id: "hermes-learning-packet (20260821-a-parser-that-reads-the-whole-file-obeys-no-heading)"
    change: "amended"
    motivating_failure: "The packet claimed 'deleted' and 'fails on any new one' the same day both were disproven. A correction block was added rather than rewriting history."
  - id: "trailhead_truth_rule_75"
    change: "reinforced"
    motivating_failure: "--stats never printed the kept count — the compounding channel the whole product is built on was invisible in its own status screen. Found by running the handoff's verification block verbatim."
---

# A git deletion is not a retraction

## Context

Sean ordered a hostile panel (Sol 5.6 Pro, Kimi K3, GLM 5.3, Grok 4.6, DeepSeek V4 Pro, DeepSeek V4
Flash, each paid seat once, Fable as final seat) over the master handoff and the two slices shipped
after it. Est. $0.26, actual $0.66. Six seats returned; five had findings.

## The transferable lessons

**1. "Deleted" is a claim about every copy.** I deleted the agent-written taste prompts from
`taste/kept.md`, ran the tests, and wrote "deleted" in three places. The previous session had already
exported them into the Hermes brain-vault (not git), and the FTS index had them too. A git deletion
retracted nothing. The retraction was: re-export with clean taste (the exporter supersedes the prior
timestamp), then rebuild the index, then grep the vault and search the index for a distinctive phrase
and get zero. **Before writing "deleted", enumerate where the data went: exports, indexes, caches,
mirrors, other machines. Each one is its own deletion with its own proof.**

**2. Patching the top of a document and leaving the body stale is the most reliably caught defect
in the corpus.** Every seat found §12/§2/§9/Law 2 contradicting the addendum I had put at the top. The
section written to stop stale handoffs would have fired a false alarm on the document's own
successor state. The fix is procedural: after any addendum, grep the document for every SHA, count
and status word the addendum changed, and rewrite each site — never "see addendum".

**3. A localhost bind is not a browser defence.** `127.0.0.1` stops the network; any web page the
machine visits can still POST to it as a simple cross-origin request, and with
`access-control-allow-origin: *` even preflighted ones passed. Reads can stay open; writes need Host
(DNS rebinding) + Origin (absent for non-browser callers, or the server's own page). Proven with curl:
foreign Origin 403, rebinding Host 403, no-Origin 200.

**4. Measure the number you are about to repeat.** "Kept prompts steer a quarter of every batch" came
from a code comment's guess and was repeated into a handoff as the urgency argument for FIRST ACTION
#1. Ten seeds × 40 prompts: 7.5%. The comment now carries measured figures and says so.

**5. A law that restates a control must cite the control's file:line — because the control may have
been deliberately removed.** Law 3 said imports "assert the enabled count is unmoved and abort". The
code has a 35-line comment explaining why that assertion was removed (READ COMMITTED false positives,
twice) and what replaced it (column absent from INSERT/UPDATE, a pinned-statement test, DB triggers).
The law was aspirational prose over real engineering that had already moved on.

## Who did what

See `models_used`. Fable 5 arbitrated; the seats' replies are committed verbatim under
`docs/ai-workflow/AI-HANDOFF/panel-master-handoff-2026-08-22/`. Calibration for routing: **Kimi K3
and GLM 5.3 are the highest findings-per-dollar**; Sol Pro found the two security-class defects but at
5× its estimate; the DeepSeek seats are cheap corroboration; Grok 4.6 produced nothing.

## Skills created or changed

See `skills_touched`. No skill created.

## Mistakes I made

- **Wrote "deleted" when only the git copy was gone.** The vault and index still served the agent
  prompts. Two seats caught it.
- **Updated the paste-ready prompt but not the handoff body**, then told the closeout both were
  current. Every seat caught it.
- **Called a one-root sweep "complete".** Four roots exist; the tripwire also matched only 3 of the
  8 shapes it now matches.
- **Repeated "a quarter of every batch" without measuring.** 7.5%.
- **Restated Law 3's assertion without reading the code** that had removed it on purpose.
- **Wrote "54 checks" in a commit message from memory.** 52. Follow-up commit, not an amend.
- **Wrote "1 live" under the sources table** for a fact from the connector-states table.
- **Reached for an inline node edit script with four sequential replacements; replacement 1 changed
  the text replacement 4 was anchored on, and it reported a false "anchor missing".** Switched to the
  editor. Same law as yesterday; same tool preference pulling the other way.
- **Wrote "≈ $0.75" for the panel spend before summing the headers.** $0.66. Fixed before commit.
- **The `serve.mjs` vantage in round 2 hung my own shell** because the module listens on import.
  Harness error, not a code defect; killed the process and moved on.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What finally stopped it |
|---|---|---|---|
| Claim of completeness over a subset (deleted / swept / verified / unchanged) | **5** (git-only delete; one-root sweep; 3-of-6 counts; "1 live"; "panel deferred" not in addendum) | yes — Law 7 + Law 11 in the very document | The panel. Nothing internal caught any of them |
| Number repeated without measuring | 3 (25%; 54 checks; $0.75) | yes — Law 7 | Measuring before writing, enforced by the panel once and by habit twice |
| Stale document body after a top-of-file addendum | 1 (five sections) | no | Grep every changed SHA/count after any addendum |
| Inline edit script instead of editor | 1 | yes — prior session, 9×; this session's memo, 1× | Switched on first failure |

Row 1 is the finding: **five unscoped completeness claims in one session, all in a document whose own
laws forbid them, and all caught only by an external panel.** The written laws had a zero catch rate on
their author. The control that worked cost $0.66.

## External-model calibration

| Seat | Real | Disproven / misread | Unique | Cost |
|---|---|---|---|---|
| Sol 5.6 Pro | 6 | 1 (tripwire "theatre" — half right) | write-API drive-by (security) | $0.55 |
| Kimi K3 | 8 | 0 | Law 3 false assertion | $0.085 |
| GLM 5.3 | 7 | 1 (creator_item repro irrelevant) | vault contamination first; 7.5% math | $0 (sub) |
| DeepSeek V4 Pro | 3 | 1 (Law 6 "contradiction") | — | $0.0065 |
| DeepSeek V4 Flash | 3 | 2 (Law 5 tautology; Law 12 wording) | Decision 1 fallback | $0.0014 |
| Grok 4.6 | 0 | — | — | $0.013 |

## Verification carried in this packet

- Vault: `grep -rl "<deleted phrase>" brain-vault/collections/swan-visual-taste/` → 0; index rebuilt
  (4,416 docs), taste collection 5 → 3 docs; search → 0 taste hits.
- Origin gate: live curl — foreign Origin 403, rebinding Host 403, `kept.md` unchanged; no-Origin 200
  and wrote; GET cross-origin 200. `node prompter/test.mjs` → 52 PASS (38 → 40 → 52, counted).
- Tripwire: planted `connectorKey === 'news_rss'` in `apps/web/src` → suite fails at that line;
  removed. Full `npm test`: scripts 138/0, api 503 + 1 pre-existing red, web 379, database 90,
  domain 242.
- Handoff §12 run verbatim after the rewrite: every expected value reproduced (found and fixed the
  missing `kept` stats line on the way).
