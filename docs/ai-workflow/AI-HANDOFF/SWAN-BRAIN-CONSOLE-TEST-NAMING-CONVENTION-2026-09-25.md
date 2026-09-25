# Swan Brain Console — the `RED — ` test-name convention

**Dated:** 2026-09-25 · **Written by:** sable (workbuddy/deepseek-v4.1-flash)
**Subject:** what a test whose name begins `RED — ` means, and what it does not mean.

## Why this note exists

A hostile-review packet read the prefix and concluded these were *intentionally-failing acceptance
tests for unbuilt behaviour* — which would put them in the wrong suite, and which would mean a gate
containing them could never pass.

Both halves of that reading are wrong, and the measurement that shows it is below. The prefix has
93 users in this tree and **zero definitions**. That is why the misreading was available to any
reader who grepped for it. This file is the definition.

## The convention

A test named `RED — …` asserts that **a refusal, a red path, or an unmeasured outcome is handled
correctly**. `RED` names the test's SUBJECT — the red outcome being asserted about — not the test's
EXPECTED RESULT. Such a test passes when the product correctly reports the red outcome, and it
fails on an ordinary assertion failure like any other test.

It is **not** a marker for "expected to fail". Nothing in this tree is expected to fail. There is
no separately-invoked RED suite, and there should not be one: a test that asserts a refusal path is
a normal member of the gate, and moving it out would remove coverage of exactly the paths this
subsystem exists to get right.

Examples from the tree:

| Test name | What it asserts |
|---|---|
| `RED — a held lock refuses, and says BUSY rather than failed` | the lock's refusal is distinguishable from a failure |
| `RED — a REAL busy process exits 3, publishes nothing, and leaves the holder alone` | genuine contention exits `EXIT_NOT_STARTED`, not `EXIT_GATE_RED` |
| `RED — a run whose manifest cannot be read publishes a FAILED attempt, not silence` | an unreadable input produces a recorded failure, not a silent success |

## The measurement (2026-09-25)

From one full `npm run verify` run in `tmp/worktrees/brain-console-salvage-20260918`, counted on
the gate's own TAP output rather than by grepping the source:

| | count |
|---|---|
| tests named `RED — ` that node reported `ok` | **91** |
| tests named `RED — ` that node reported `not ok` | **2** |
| of those 2, failing on their own assertion | **0** |
| of those 2, failing on a sandbox delete-budget refusal raised in a `finally` block | **2** |

So 93 `RED — ` tests executed; 91 passed; the two that did not failed on an environment blocker
*after* their assertions had passed. The gate reads `4/6 stages passed · 2 blocked` with no `FAILED`
line, and its node stage reads `# tests 588 · # pass 583 · # fail 5`, where all five failures are
attributable to two environment blockers (one `SPAWN-BLOCKER`, four delete-budget refusals).

### Why the count is measured and not grepped

A static scan of `test(` call sites does **not** reproduce that 93, and the gap is instructive:

| method | finds |
|---|---|
| `test(`/`it(` call sites, top level of `scripts/swan-brain-console/` only | 64 |
| the same scan, recursing into every subdirectory | 84 |
| what the run actually reported | **93** |

The residual gap is names that contain a quotation mark — `… is not "focus the first" in disguise`,
`… other's FRESH lock` — which a naive scanner stops at. A number that changes with how carefully
you look is not a measurement, so the run's number is the authoritative one here.

## What follows

- The prefix is a naming convention, and this file is its contract.
- A `RED — ` test is in the right suite. Do not move it out of the gate.
- If a test is genuinely expected to fail, that is a different thing and needs a different
  mechanism — not this prefix. No such test exists in this tree.
