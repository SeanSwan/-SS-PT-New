---
title: A safety control that looks armed while bypassable is worse than one that is visibly dead
date: 2026-08-24
originating_model: claude-fable-5
surface: review harness / spend caps / retry policy
decision: Every default in a safety path must point toward refusal — unknown code = no retry, unknown price = worst case, unmatched key = loud
status: shipped
supersedes: none
rule: >
  When you fix a dead control, audit every DEFAULT you introduce: unlisted enum values,
  null/undefined fallbacks, `?? 0`, `!== true`. Each one is a direction. If the direction
  is "proceed" or "cheaper", the control you just revived is bypassable in a way the dead
  one never was — and it now looks healthy.
models_used:
  - model: claude-fable-5
    role: author of the three fixes AND the reviewer who missed both MAJORs
    did: shipped 429 retry, ledger writer, dead-CI probe; wrote the review packet with five self-findings; missed the two worst
    cost: $0 (subscription)
  - model: glm-5.3
    role: hostile reviewer
    did: CONFIRM@84 — 8 findings, 8 enhancements; F1 (fail-open retry) and F4 (silent zero) were the decisive two; F5 "proves the pipe, not the regression" reframed the test
    cost: $0 (subscription)
  - model: stealth/ox-alpha
    role: hostile reviewer ×2 (separate calls, both with provable Served: header)
    did: REJECT@82 and REJECT@80; converged independently on the same two MAJORs; named the disease — "appears armed while being bypassable, strictly worse than visibly dead"
    cost: $0
skills_touched:
  - id: ox-final-review retry policy (scripts/debate/ox-identity.mjs FAULT table)
    change: amended
    motivating_failure: predicate `abort !== true` retried every unlisted code — a closed table closed only for codes someone remembered
  - id: spend-ledger.mjs null-usd policy + topicFromPath
    change: created
    motivating_failure: `cost ?? 0` recorded confident zeros for unpriced calls; guard and writer used different topic keys against a strict-equality match
---

# A safety control that looks armed while bypassable is worse than one that is visibly dead

## The lesson

I revived three dead controls in one commit — a retry policy, a spend ledger, a dead-CI
probe — and put the review packet through GLM 5.3 and two separated Ox calls with five of
my own hostile findings attached. All three seats confirmed my five. All three also found
the same two MAJORs I had not seen, and Ox named what they had in common:

> "The spend-cap enforcement path contains silent fallbacks that make a safety control
> appear armed while being bypassable — strictly worse than the pre-fix state where the
> dead ledger was at least visibly dead."

**Defect 1 — the retry predicate was fail-open.** `FAULT[fault.code]?.abort !== true`.
For any code not in the table, `undefined !== true` is `true`: retryable. I had written
"closed table" in the comment above it. It was closed only for the codes I remembered to
list, and the default for everything else pointed at a second paid attempt. The exact
philosophy the fix stated — "retrying a misconfiguration only spends" — was violated by
its own default.

**Defect 2 — unpriced calls recorded $0.00.** `usd: cost ?? 0`. A model absent from the
price table with no provider-reported cost wrote a confident zero. The caps could then
never fire for precisely the calls of unknown price. It looked like the safe direction —
"don't invent a number" — and was the expensive one.

Both are one shape: **a default that points toward proceeding.** The dead ledger had no
such default; it did nothing and anyone reading it could see it did nothing. The revived
ledger did something, looked healthy, and had two holes in it.

## Who did what

**Fable 5 (me):** wrote the fixes, then wrote the packet with five self-findings — the
exit-1/429 conflation, the topic-key divergence, existence-vs-recency, the 8s timeout, and
the double-ledger-entry question. Every one was confirmed. None was the worst thing in the
code. I attacked what I had *reasoned about* and missed what I had *typed without
reasoning*: two one-line defaults.

**GLM 5.3:** found both MAJORs with a truth-table argument on F1 ("undefined !== true →
retry — the default is retry, the opposite of the fix's own philosophy") and named the
test defect that mattered most: "7→8 proves the write pipe, not the regression." Its E1
(invert to `retry === true`) was the highest-value enhancement and shipped verbatim.
Refuted my 8s-timeout position correctly: once-per-session means a 20s bound is nearly
free and false UNKNOWNs are the expensive outcome.

**Ox Alpha ×2:** both calls independently REJECTed on the same two MAJORs — genuine
corroboration this time, because the `Served:` header proves both were the real seat, not
Grok wearing a label. Call 1 also confirmed the double-entry-is-correct claim ("both
streams billed, two rows is the honest record"). The seat's verdict instability from
earlier rounds did not appear here: both calls agreed.

**What was verified rather than asserted after the review:** 7/7 syntax, 29 tests across
three suites including a new one that proves the *cap accumulates* rather than that the
*pipe writes*; probe 10 live-fired against the repo's real dead-CI state and named the
right branch; the ledger found to be already live — other agents' consults had written
rows through the new writer the same day, unprompted.

## Skills created or changed

- `FAULT` table now carries explicit `abort` and `retry` booleans per code, transport codes
  included, frozen; a test asserts every code has both flags and none has both true.
- `spend-ledger.mjs`: `recordSpend` accepts null; readers count null as `CAPS.perCall`;
  `topicFromPath()` is the single normalizer imported by both the guard hook and the
  transport writer.
- `consult-grok.mjs` exits **75** (EX_TEMPFAIL) on 429/5xx so a launcher can distinguish
  "retry shortly" from "misconfigured" — exit 1 no longer retries anywhere.
- Drift probe 10 disambiguates never-ran / runs-but-fail / stale with one extra call.

## Mistakes I made

- **I hostile-reviewed my reasoning and not my defaults.** Five self-findings, all real,
  all about things I had thought about. The two MAJORs were in lines I had not thought
  about at all: `!== true` and `?? 0`. The review packet's own framing — "attack the
  author's self-findings too" — steered the seats toward my analysis; they were good
  enough to look past it. Next time the self-review starts with a grep for every
  `??`, `||`, `!==`, and `?.` on a safety path, before any reasoning.
- **I nearly committed 13 of another agent's files.** They were sitting staged in the
  shared index when I went to commit; `git diff --cached --stat` showed 21 files where I
  had staged 8. Caught by reading the count, not by discipline — I had not checked the
  index before `git commit` and the number happened to be visible. The procedural fix:
  `git diff --cached --name-only` is the last command before every commit in a shared
  tree, and anything not in the lane claim is unstaged first.
- **I wrote a garbage template literal** into a warning string (`$${'{'}perCall cap${'}'}`)
  and only caught it re-reading the diff. Small, but it would have shipped a nonsense
  message on the exact path that warns about unpriced spend.
- **My first "stage only my hunk" script failed on a brittle regex** and I had to rewrite
  it index-based. Same session, same lesson as the source-lift regex that over-captured
  in the identity tests: regex against source is formatting-coupled; use anchors and
  splice.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before? | What actually stopped it |
|---|---|---|---|
| Safety-path default pointing toward proceed (`!== true`, `?? 0`) | 2 in one commit | Corpus-adjacent ("a signal that is always true detects nothing") | External review. Procedural fix now recorded above: grep the defaults before reasoning. |
| Regex-against-source too brittle | 2 (test lift earlier; staging script now) | Yes — earlier today | Index-based splicing with literal anchors. Held on the second attempt. |
| Committing from a shared index without listing it | 1 near-miss | Yes — the lane guard's own text cites "three times in 24 hours" | Read the staged count. Procedural rule above. |

## External-model calibration

$0 this round. GLM 5.3: 8 findings, all real on verification, two decisive; its refutation
of my timeout position was correct. Ox Alpha: 2 of 3 calls landed (the third was killed by
a process restart, not a provider fault); both REJECTed on identical grounds — the first
time this seat has produced stable, corroborating verdicts across separated calls, and the
first time that corroboration is *provable* rather than assumed. This is the calibration
row the corpus was missing for Ox: **stable when the packet is concrete code; unstable
when it is narrative.**

## Applies to

Any revival of a dead control. Any `?? 0`, `|| 0`, `!== true`, or optional-chain on a path
that decides whether to spend, retry, allow, or proceed. Any review packet you write about
your own work: the seats will attack what you point them at, so point them at your defaults.
