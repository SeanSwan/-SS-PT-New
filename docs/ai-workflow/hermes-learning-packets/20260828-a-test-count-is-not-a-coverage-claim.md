---
originating_model: claude-opus-5
date: 2026-08-28
surface: swan-taste-brain / favourites
board: SWA-186
decision: "A test count measures assertions, not coverage. 581 passing assertions over one input shape proved the happy path and nothing else; two free reviewers found six real defects in it, one of them unconditional silent data loss. Before reporting a suite as verification, name the input SHAPES it exercises — and confirm every write by reading it back rather than by the absence of an error."
status: shipped
supersedes: none
privacy: IDs and roles only. No PII, no keys, no client names.
models_used:
  - model: claude-opus-5
    role: builder, then arbiter of the panel's findings
    did: "Built F0/F1/F2. Reported F1 verified on 581 assertions that used one input shape. Reproduced 9 of 10 panel findings against shipped code, refuted 1, fixed 6 real defects, then shipped F2 with a further defect the suite caught."
    cost: $0.00 (subscription)
  - model: glm-5.3
    role: hostile reviewer (free seat)
    did: "Found the P0 (uncompensated unshelve + unchecked subprocess + substring-vs-line-exact duplicate check), the silent no-op writer, the heart-demotes-a-steering-prompt contradiction, and the sean/default fallback. Labelled its own unverifiable claims HYPOTHESIS with exact conditionals."
    cost: $0.00
  - model: glm-5.3-flash
    role: hostile reviewer (free seat, edge-case remit)
    did: "Found the paren/backtick round-trip blackhole — stored, unreadable, infinitely duplicable, undeletable. One claim wrong (bullet-leading prompts round-trip fine)."
    cost: $0.00
skills_touched:
  - id: "rule 73 (proof-before-done)"
    action: amended
    motivating_failure: "A completion claim cited a test count as its proof. The count was true and the implied coverage claim was false. Proof must name what was exercised, not how many assertions ran."
  - id: "instrument-check skill"
    action: proposed
    motivating_failure: "Its remit is validating an instrument before believing a negative. The gap here is adjacent and unlisted: a suite that runs, passes, and measures one input shape. Worth an explicit line about input-shape coverage alongside the positive-control procedure."
  - id: "heredoc hazard (working notes)"
    action: retired
    motivating_failure: "Documented, re-documented in a packet the same morning, and recurred EIGHT times that day. Prose does not hold it; it needs a hook like the exit-status gate, which stopped its error class dead on first contact."
---

# A test count is not a coverage claim

## The lesson

I shipped a store and reported it verified: **581 passing assertions, 12 suites, exit 0.** Every
number was true. Two free reviewers then found **six real defects**, one of them unconditional
silent data loss on the primary user's own path.

They were not subtle. Every one lived in a category the suite had never entered:

- a file that does not end in a newline
- a prompt starting `(`, or wrapped in backticks
- a subprocess that exits **0** having done nothing
- a transaction that fails halfway

**581 assertions, one input shape.** The suite exercised the happy path exhaustively and the failure
surface not at all. The count was a measure of how thoroughly I had tested *what I thought of*, and
I reported it as though it measured what the code would survive.

**The rule: a proof statement must name the input SHAPES exercised, not the number of assertions.**
"591/591" says nothing a reader can act on. "591 assertions, covering well-formed input only — no
malformed-file, adversarial-string, or mid-transaction-failure cases" is a claim someone can
falsify, and would have invited exactly the review that found these.

## The fix that closed most of them is one sentence

**Confirm a write by reading it back.** Not the absence of an error. Not an exit code. The file.

That single principle fixed:

- **the P0** — verify `kept.md` actually gained the line *before* removing it from the shelf;
- **two silent no-op writers** — a heading with no trailing newline made a string replace match
  nothing, so the file was written back byte-identical while the call returned ok;
- **the round-trip class** — validate a prompt by passing it through the **real reader** and
  requiring it back unchanged, rather than restating the reader's rules.

The last one has a property worth stealing: because the check *calls* the reader, a future change to
the reader tightens the writer automatically. A restatement of its rules would have silently drifted.

## Who did what

**The unreliable component was me, and the record should be plain about it.** In one slice I:

- reported a coverage claim my tests did not support;
- wrote a file header stating that an operation's ordering is deliberate so "a failure can only ever
  leave it where it started" — and then, two hours later in the adjacent file, wrote the route that
  removes an item *before* an unchecked subprocess call;
- shipped a ♥ button able to **reduce** generation weight while its tooltip promised it changes
  nothing;
- made the one memory governed by a third-party licence the **fallback destination** for malformed
  requests;
- shipped a drawer that made the entire page unclickable after one open — and looked perfect.

**GLM 5.3** did the best structural work: it traced the failure path through a subprocess it could
not see and labelled that dependency as a conditional rather than asserting it. **GLM 5.3 Flash**
found the highest-value single defect (the round-trip blackhole). **8 of their 9 unique claims
held.** The ninth — that bullet-leading prompts fail the same way — is false; the reader strips
exactly one marker, so they round-trip fine.

**Reproducing before adopting mattered as much for the eight that were right as for the one that was
not.** Taking the ninth on trust would have added a user-hostile rule for a defect that does not
exist. A reviewer's finding is a hypothesis until you run it.

## Skills created or changed

- **`--require`** on the browser suite: a skip becomes a **failure**. *Motivating failure:* a skip
  that exits 0 is indistinguishable from a pass to anything reading exit codes, and the suite is now
  a gate. Positive-controlled both directions.
- **Cleanup on `process.on('exit')`**, not at the end of the happy path. *Motivating failure:* the
  suites leaked five throwaway directories across a crash and two timeouts — **a harness that tidies
  up only when it passes litters exactly when something has gone wrong**, which is when you are
  least likely to look.
- **Panel-reproduction cases** folded into the suite permanently, each carrying the finding that
  motivated it, so the category cannot quietly leave coverage again.

## Mistakes I made

1. **Reported a test count as a coverage claim.** True number, false implication.
2. **Broke a rule I had written in the adjacent file two hours earlier**, in the same slice.
3. **Shipped a gesture that contradicted its own tooltip** — ♥ could remove a top-weight exemplar.
4. **Inverted defence in depth** — omitting a field routed the write to the most consequential memory.
5. **Shipped a drawer that swallowed every click** and looked entirely correct.
6. **Heredoc backslash mangling, eight times in one day** — including one syntax error that made a
   suite fail to parse, from which I briefly read "0 failures" as good news.
7. **Used `cmd | tail; echo $?`**, reading `tail`'s status. A hook stopped it.

## Error → fix → repeat ledger

| Error class | Recurrences | Documented before recurring? | What actually stopped it |
|---|---|---|---|
| **Heredoc/backslash mangling** | **8 in one day** | **Yes — my own notes, AND a packet I wrote that morning about how documenting a hazard does not fix it** | **Nothing yet.** Tool-switching works when remembered; it was not. This needs a hook. |
| **A green whose scope was never examined** | **2** (a file-scoped sweep; then 581-assertions-one-shape) | Yes — the same morning's packet | An external reviewer. Both times. |
| Breaking a rule stated in my own adjacent file | 1 | n/a | The panel |
| `$?` after a pipeline | 1 | Yes — rule + **hook** | **The hook. First contact. No recurrence.** |
| Cleanup only on the happy path | 1 | No | Noticing five stray directories |

**Read rows one and four together.** Same author, same day. The class with only prose behind it
recurred eight times. The class with a **deterministic hook** was stopped on first contact and never
recurred. That is not a claim about discipline; it is a controlled comparison, and it says the
remedy for a recurring model error is a gate, not a better-written note.

## External-model calibration

| Seat | Cost | Real / disproven | Worth it? |
|---|---|---|---|
| GLM 5.3 | $0.00 | 5 / 0 (plus correctly-flagged hypotheses) | **Yes** — run on any data-integrity surface |
| GLM 5.3 Flash | $0.00 | 3 / 1 | **Yes** — best per-token edge-case yield |

Total external spend for the whole workstream (F0+F1+F2): **$0.00**. Both seats returned in about
two minutes and between them prevented an unconditional data-loss bug from sitting in the owner's
own path. **A free hostile review before declaring a slice done is not optional overhead.**

## Transferable rules

1. **State the input shapes a suite exercises, not the assertion count.** A number that cannot be
   falsified is not a proof.
2. **Confirm every write by reading it back.** An exit code and an absent error are not evidence.
3. **Derive a validator from the real reader**, never from a restatement of its rules.
4. **Validate before mutating.** A rollback that re-enters the same validator will refuse for the
   same reason, and then you have destroyed the thing you were protecting.
5. **A reviewer's finding is a hypothesis.** Reproduce all of them — the ones you believe most of all.
6. **Never let an under-specified request fall back to the most privileged target.**
7. **Clean up on exit, not on success.**
8. **A model error that recurs after being documented needs a hook.** Compare: eight recurrences with
   prose, zero with a gate — same author, same day.
