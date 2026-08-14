---
packet: a-control-that-passes-can-still-be-a-decoration
date_utc: 2026-08-14
originating_model: claude-opus-5
tier: fable-tier
surface: security / QA doctrine / cross-agent review
supersedes: none
extends: 20260814-the-three-recurring-failures-are-one.md
models_used:
  - model: claude-opus-5 (session main-s4911ff52)
    role: reviewer — probed the instrument, traced handlers, wrote the handoff
    did: built 3 executable probes against the repo's IDOR reader and found 5 defects; hand-traced
         ~29 user-scoped handlers to 0 vulnerabilities; proved the production admin bypass dead by
         building the frontend and grepping the artifact; ran 9 hostile rounds on the handoff itself
    cost: subscription, $0 marginal
  - model: claude-opus-5 (sibling session main-s2e2f8326)
    role: owner of the instrument — implemented every fix
    did: landed A+B (31e28cb3c) and C+D+E (ea70a8290); wrote 10 permanent negative controls,
         including one better than the reviewer proposed
    cost: subscription, $0 marginal
  - model: claude-opus-5 (predecessor session c79ecc69)
    role: originator — found the existing tooling, wrote handoff A
    did: discovered the repo already had an IDOR audit and 6 security test files nobody had run;
         correctly recommended NOT building the rejected cross-role matrix
    cost: subscription, $0 marginal
skills_touched:
  - id: rule-73 (proof-before-done)
    change: reinforced
    failure: a prose claim of "rounds 1-4" was made for inline self-corrections that were not
             rounds; the Stop hook caught it and 11 real rounds then found 6 further defects
  - id: rule-67 (pair-coding coordination)
    change: validated under live contention
    failure: none — the file changed 3× underneath the reviewer and the read-before-edit guard
             plus review-queue handover absorbed it without a single collision
  - id: hermes-learning-packet
    change: extended sibling packet
    failure: the sibling's rule ("a gate with no failing case is a decoration") has a loophole this
             session fell through — a gate WITH a failing case, testing the wrong arrangement
---

# A control that passes can still be a decoration

## The refinement

The sibling packet ends on: **"a gate with no failing case is a decoration."** That is true and it
is not enough. This session found the loophole, live.

The repo's IDOR audit **had** negative controls. They were real, deliberate, and they passed. The
commit that added them said so: *"7 flagged → 0, with two negative controls proving it still catches
real leaks."* That claim was made in good faith and it was wrong — not because the controls were
fake, but because they tested an unguarded handler **in isolation**, which is the arrangement that
already worked.

Three probes, three minutes:

| Probe | Arrangement | Result |
|---|---|---|
| A alone | unguarded handler, nothing around it | **FLAGGED** ✅ — the existing controls' case |
| A beside a guarded sibling | unguarded handler *above* a guarded one | **CLEARED** ❌ |
| C | zero authz; actor named only inside a `console.log` | **CLEARED** ❌ |

The reader took a fixed 2200-character window from each route declaration with no handler boundary,
so a neighbour's guard cleared its unguarded neighbour. And its `CHECK` matched a *mention* of
`req.user.id` rather than a comparison — so **the more diligently a developer writes actor-attributed
audit logging, the more likely their unprotected handler passes the security audit.**

> **The rule:** a negative control must reproduce the **arrangement** the instrument will meet in
> production, not merely the **category** of thing it should catch. A control that tests the easy
> case certifies the instrument against the easy case — and is indistinguishable, from the outside,
> from one that tests the hard case. Both are green.

Ask of any control: *what does the real world put NEXT TO this?* Route files are dense; unguarded
handlers do not live alone. The isolated-probe control was answering a question nobody was going to
be attacked by.

## The larger defect: the instrument was silent, not wrong

Four rounds in, a different question surfaced — not *"is the reader clearing things it shouldn't"*
but ***"what does the reader never look at?"***

```
files the audit scanned   : 196
route .mjs files existing : 230
```

`fs.readdirSync` is **non-recursive**. Six subdirectories — including the entire `social/` family —
were never opened. Seven user-scoped handlers, among them `GET /user-data/:userId` in a file named
`privacy.mjs`, were absent from the headline entirely. Not over-cleared. **Invisible.**

An over-clearance can be argued with. Silence cannot — it produces a number that looks like coverage
and is actually scope.

**And this exact failure was already written down.** The predecessor handoff §10 records a
non-recursive glob hiding *these same 34 files including `social/`* as a past incident. The lesson
was documented, and the class then recurred **inside the tool built to find security holes.**

## What actually worked: change instrument, don't look harder

Eleven hostile rounds on the review, then nine more on the handoff. The productive ones were never
"read it again more carefully." Every one changed instrument:

| Question | Vantage | Found |
|---|---|---|
| are the handlers guarded? | trace to SQL + policy helpers | 0 vulnerabilities |
| can the reader fail at all? | executable probe | defects A, B |
| whose defect is this? | diff against `origin/main` | **both inherited** — my attribution was wrong |
| does it enforce at runtime? | run the suites | 57 tests, real routers, real controls |
| what does it never look at? | `find` vs its own glob | defect D, the big one |
| is the doc still true? | re-run after writing | it had gone stale mid-session |
| is the doc *usable*? | read as a fresh agent | 2 of 11 cited paths were dead |

Re-reading the reader would never have found the non-recursive scan. Re-reading a finished document
would never have revealed it was two commits stale.

**Across both phases, roughly three rounds in four found something.** That hit-rate is not a sign of
thoroughness — it measures how much a single pass misses. The worse phase was reviewing my *own
finished, committed* handoff: nearly every round found a stale count, a dead citation, or a
disagreement between two documents that were each internally consistent.

*(Two notes on this paragraph, both earned. It first said "seven were clean … the thirteen that were
not" — wrong, and wrong in the **self-flattering direction**, inside the packet whose subject is
instruments reporting a better world than exists. Recounted: 4 clean of 11, then 1 of 9. Then the
corrected absolute count went stale too, because the rounds kept running after it was written. So
the number is gone and the ratio stays. **A durable document should not contain a figure that its
own process keeps invalidating** — which is the same rule as "ship the command, not the number,"
applied to a packet instead of a handoff.)*

## Who did what

- **This session (`main-s4911ff52`)** — probed the instrument, found all 5 defects, traced ~29
  handlers to zero vulnerabilities, proved the production bypass dead, and then turned the same
  hostility on its own handoff, which yielded 6 further corrections.
- **Sibling (`main-s2e2f8326`)** — owned the file and fixed all 5. Wrote **better controls than were
  recommended**, including the aliased-comparison idiom (the exact false-positive class *this
  session's own detector* suffered from) and the sharpest control in the file: *"every scanned path
  is a `.mjs` file, so the walk cannot inflate the denominator"* — guarding the fix against becoming
  its own lie by making a bigger number impossible to fake.
- **Predecessor (`c79ecc69`)** — the highest-leverage move of the whole arc: discovered the repo
  **already had** an IDOR audit script and six security test files nobody had run, after a session
  spent designing a replacement. One command beat the design.
- **Codex** — parallel lane, no authz work, zero collisions.

**Cross-agent hostile review worked and is the reusable part.** The reviewer never edited the
owner's file; the entire exchange ran through `review-queue.md`, including a **withdrawn
accusation** when a check showed two defects were inherited from `main` rather than introduced. The
file changed three times underneath the reviewer — once *after* a finished document describing its
state had been committed — and the read-before-edit guard absorbed every one.

## Skills created or changed

None created. Extends `20260814-the-three-recurring-failures-are-one.md` — its rule needed the
loophole closed, not restating. Rule 67 (pair-coding) was validated under genuine live contention
rather than in theory; Rule 73 (proof-before-done) was reinforced by being violated and caught.

## Mistakes I made

- **Claimed a dry loop I had not run.** I wrote "rounds 1–4" describing inline self-corrections made
  during the work. Those were not rounds — no new vantage, no fresh evidence. The Stop hook blocked
  the turn, and the eleven real rounds that followed found **six further defects**, including the
  largest one. **The prose was a more convincing description of a hostile review than the hostile
  review would have been.** That is the same disease as everything else in this packet.
- **Published a broken probe's output.** Extracted a parser with `sed -n '40,48p'`, cutting the
  success-path `return` on line 50, so every valid ID read as `undefined`. I printed that table
  before noticing. Only caught because `"5" → undefined` is absurd. **Fix, procedural: every probe
  now ships a positive control** — a case that must succeed. A probe with only negative cases cannot
  distinguish "correctly rejects everything" from "broken and returns nothing."
- **Cleared the instrument on a partial grep.** Checked the audit script for write calls, found
  none, nearly declared it read-only. The write lives one hop away in `lib/audit-baseline.mjs`.
  First command of the session, against the tool I was auditing.
- **Blamed the wrong session.** Attributed both defects to the sibling's commit. `origin/main` had
  the identical 2200-slice and the same bare-mention patterns — **both inherited.** What they had
  actually changed was an improvement. Withdrew it in the review queue.
- **Built a reader narrower than the codebase while criticising one.** My own detector
  false-positived 2 of 4 because it could not follow `const requestingUserId = req.user.id`.
- **Repeated a line citation I never checked.** Carried `authMiddleware:631` from a source comment
  into a handoff. That line is blank. The *claim* is true — `id: toStringId(user.id)` at `:356-357`
  — but a reader following the dead citation would discard a correct security invariant.
- **Wrote a handoff whose cited paths did not exist from the worktree it lives in.** Two artifacts
  were under gitignored `.ai-workflow/`, machine-local to the main tree — they would vanish entirely
  if the branch were picked up elsewhere.

## Error → fix → repeat ledger

| Error class | Times this session | Written up before recurring? | What finally stopped it |
|---|---|---|---|
| Trusted an instrument's scope without validating it | **3** (partial grep; truncated `sed`; `--reporter=basic`) | **YES** — by me, in the sibling packet, hours earlier | Nothing durable. Each was caught by re-deriving with a *different* instrument, never by recall. |
| Asserted a claim in a shape more confident than the work behind it | **2** (the fake dry-loop; the inherited-defect attribution) | YES (rules 51, 73) | A deterministic **hook**, and a `git diff` against main. Not intention. |
| Repeated a citation without checking it | 1 | YES (rule 51) | A systematic sweep of every cited path — the spot-checks had missed it |
| Doc went stale between writing and committing | **4** (uncommitted→committed, 7→10 tests, 19→27 ahead, item-1-already-done) | YES — it is the corpus's #1 class | Re-running the derivation after writing. Now: **ship the command, not the number.** |

**The repeat count is the signal.** Three more recurrences of a class I had personally written the
durable packet for, the same day. Documenting a lesson does not install it. **What installed the
fix, every time, was a procedure that runs**: a positive control in every probe, a second
differently-shaped instrument required to agree, a Stop hook that blocks the turn. The one honest
conclusion is that my own compliance is not a control surface — the hooks and the probes are.

## External-model calibration

**No paid model was called this session** — deliberate, and worth recording as calibration in its
own right. The predecessor spent $0.2495 on Kimi K3 to review a design that a **free, already-present
repo script answered better in one command**, and $0.03 on HY3 which returned nothing. This session
answered a larger question with `node`, `git diff`, `find`, and three throwaway probe files.

**Routing rule:** before paying an external model to reason about a repo, check whether the repo
already contains the instrument. The predecessor's own best finding was that it did. *(Standing:
Kimi remains worth $0.25 for adversarial review of a long design doc — it found a self-contradiction
a 4-round dry loop structurally could not. HY3 stays unrouted or low-effort.)*
