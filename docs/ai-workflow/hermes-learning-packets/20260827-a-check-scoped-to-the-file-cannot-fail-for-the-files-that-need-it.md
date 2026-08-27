---
originating_model: claude-opus-5
date: 2026-08-27
surface: swan-taste-brain / taste console
board: SWA-186
decision: "A static check scoped one level too wide cannot fail for exactly the cases it exists to catch. Scope every sweep to the call site, and make it fail on purpose before believing a zero-finding result."
status: shipped
supersedes: none
privacy: IDs and roles only. No PII, no keys, no client names.
models_used:
  - model: claude-opus-5
    role: builder + hostile reviewer + final decider
    did: "Built the world epoch (accessors + setter-placed bump), migrated 2 hand-rolled guards, found and guarded 5 more reads across two hostile rounds, wrote 2 new test suites, wrote the sweep that failed and then the sweep that worked."
    cost: $0.00 (subscription)
skills_touched:
  - id: "rule 73 (proof-before-done)"
    action: reinforced
    motivating_failure: "A completion claim was ready after round 1. Round 2 found two unguarded reads that round 1's own green had hidden. The dry-loop is what caught it, not the test suite."
  - id: "instrument-check skill"
    action: proposed
    motivating_failure: "Its remit covers validating an instrument before believing a NEGATIVE. This session shows the same failure for a zero-finding STATIC SWEEP, where the instrument is scoped too wide rather than broken. Worth an explicit line: a sweep's scope is part of its validity."
  - id: "rule 61 (slice-internal hostile review)"
    action: reinforced
    motivating_failure: "Two of the three finding-rounds happened after the code was already committed and would have been reported as done."
---

# A check scoped to the file cannot fail for the files that need it

## The lesson

I wrote a static sweep to prove that every memory-scoped read in a client codebase captured a
concurrency guard. It reported **zero findings**. It was wrong, and it was wrong in a way that is
structural rather than careless:

```js
// what I wrote — asks whether the FILE contains a guard
const readsMemory = /await .*Swan\.qs\(\)/.test(src);
if (readsMemory && !/const world = Swan\.world\(\);/.test(src)) unguarded.push(f);
```

**A file-level check cannot fail for any file that already contains one guard.** That is not an edge
case — it is precisely the set of files most likely to grow a *second*, unguarded read. The check
was strongest exactly where it was needed least, and blind exactly where it was needed most.

It went green while two files I had just edited each held a second memory-scoped read, in a
different function, with no guard at all.

The corrected form asserts **per call site**:

```js
// for each matching await: guard captured in a window ABOVE it, tested in a window BELOW it
const captured = /const world = Swan\.world\(\);/.test(above);
const tested   = /world\.changed\(\)/.test(below);
```

**Generalisation:** when a sweep answers "does X exist somewhere in this container," ask what the
container is. If the container can hold more than one instance of the thing being checked, the
sweep is measuring the wrong unit and its green means nothing.

## The second lesson, which is about me not the code

**This is the same error the document I was working from warns about, in its most prominent
section.** That handoff's central methodological warning is *"proving the mechanism is not proving
the symptom"* — written after three separate probes reported success while something was broken.
I then proved the mechanism (a guard exists in this file) and not the symptom (this read is guarded).

The write-up was not the fix. **A lesson recorded is not a lesson applied.** What actually caught it
was a procedural habit, not knowledge: *before believing a zero-finding sweep, make it fail on
purpose.* I removed a guard, confirmed the sweep failed, restored it, confirmed it passed. That
positive control is cheap, takes one minute, and is the only thing that separates a real green from
a decorative one.

## Who did what

**`claude-opus-5` (me) was both the builder and the reviewer, and got it wrong twice before getting
it right.** There is no other model to attribute anything to — no paid seat was consulted, and that
was the correct routing for a slice this size. The value came from *iterating the hostile pass*, not
from a second opinion:

- **Round 1** (after implementing): found 3 unguarded memory-scoped reads the plan had not named,
  and one hand-rolled guard in a file the plan never mentioned. Good round.
- **Round 2** (after committing): found that round 1's own sweep was file-level and had hidden 2
  more. **The commit was already landed.** This is the round that would not have happened under a
  build-then-declare workflow.
- **Round 3** (complete enumeration by grep rather than by suite): found a click-time write hazard,
  correctly judged out of scope and flagged rather than fixed.
- **Round 4**: dry.

**A plan-authoring model can name the right mechanism and still leave the hazard open.** The
blueprint for this work correctly specified "a counter bumped on every memory/profile switch." The
obvious implementation of that sentence — bump it where the change-listeners fire — would **not**
have closed the bug, because the listeners fire at the end of an `await`. The bump had to live in
the property setter. **Placement was load-bearing and no plan captured it.** When a plan specifies a
concurrency guard, treat *where the counter moves* as an unsolved sub-problem, not a detail.

## Skills created or changed

- **`prompter/test-world.mjs`** (new, 38 checks) — drives a browser script against a stub DOM via
  `new Function`, no dependencies, no browser. Built because the client-side files had **zero**
  automated coverage while carrying the app's most safety-critical invariant. *Motivating failure:*
  every guard in five prior slices was a hand-written browser probe, thrown away after use.
- **`prompter/test-browser.mjs`** (new, 28 checks) — the real page with a `pageerror` listener
  attached **before navigation**, asserted after every group; reads computed `display` not
  `.hidden`; **presses** controls rather than inferring them. *Motivating failure:* two buttons were
  dead for three slices while their stylesheet and their handler both verified clean, because
  print-media emulation drives the stylesheet and never presses the button.
- **Loud skip** — when the suite cannot run it prints `SKIPPED — proved NOTHING` and never the
  success banner. *Motivating failure:* a skip that exits 0 and looks green is the same failure in
  new clothes.
- **Comment-stripping before static checks** — the codebase documents the guard pattern in its own
  JSDoc, which satisfied the regex. *Motivating failure:* a check a comment can satisfy is a check
  that cannot fail.

## Mistakes I made

1. **Shipped a static sweep that could not fail**, and reported its green as coverage. Root cause:
   scoped to the file, not the call site. Caught by asking what the detector matched.
2. **Repeated the exact error class documented in the file I was reading**, in the slice written to
   fix that class.
3. **Asserted "31/31" for a suite that has 28 checks** — counted off a terminal tail rather than
   grepping. It reached a commit message. Corrected in a follow-up commit, never amended.
4. **Confused stub gaps with product bugs twice** while building the DOM stub. The instructive one:
   a missing element made a real code path silently *not run*, so the assertion about it failed for
   an unrelated reason. An incomplete stub does not fail loudly — it fails plausibly.
5. **Nearly stopped after round 1.** The work was committed and defensible. Two real gaps and one
   flawed instrument were still in the tree.

## Error → fix → repeat ledger

| Error class | Recurrences this session | Written up before recurring? | What finally stopped it |
|---|---|---|---|
| **A check that passes without proving the thing** | **2** (file-scoped sweep; and, in the prior session this built on, print-stylesheet vs print-button) | **Yes — §7 of the open handoff, the document's most prominent section** | Positive control: remove the guard, watch the sweep fail, restore, watch it pass. Procedural, not resolutional. |
| Stating a measured number from recollection | 1 | Yes (`TEST-DELTA DISCLOSURE`) | `\| grep -c '^  PASS'` as the only source for a count |
| Stopping the hostile loop while findings remained | 1 (nearly) | Yes (rule 73, dry-loop law) | Continuing to a genuinely dry round instead of a defensible one |
| Heredoc backslash mangling | 1 | Yes (prior session's working notes) | Write tool / Python heredoc for regex-heavy content |

**The top row is the highest-signal entry in this packet.** The lesson was documented, prominent,
and open in front of me, and I repeated it inside the fix for it. The correction that survived is
procedural — *make the check fail on purpose* — not resolutional. "Be more careful about what a
check proves" would have produced this same packet again next month.

## External-model calibration

No external model was consulted. **Total spend $0.00.** Recorded because the absence is the datum: a
slice of this size, with a clear spec and a testable invariant, did not need a paid seat, and the
three real findings all came from iterating the self-hostile pass. Routing a review here would have
bought a second opinion on code that a positive control diagnosed for free.

## Transferable rules

1. **Ask what unit a sweep measures.** If the container holds more than one instance of the thing
   checked, the sweep is scoped wrong and its green is meaningless.
2. **Make every zero-finding check fail on purpose before believing it.** One minute, both
   directions: break it, watch it fail, restore, watch it pass.
3. **A skip must never look like a pass.** Print what it did *not* prove.
4. **Strip comments before any static code check.** Prose satisfies regexes.
5. **When a plan specifies a concurrency guard, treat placement as unsolved.** Naming the mechanism
   is not specifying it.
6. **Never state a count you did not compute in that command.** Pipe to `grep -c`.
7. **The hostile loop ends when a round is dry, not when the work is defensible.** Round 2 here
   arrived after the commit and found two real gaps.
