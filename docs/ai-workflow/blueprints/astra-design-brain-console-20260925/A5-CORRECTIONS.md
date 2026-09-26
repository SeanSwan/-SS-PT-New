# A5 — CORRECTIONS

**Slice:** A5 — the Law and State boards, and `T-P-01`'s authority half (`AC5.4`).
**Landed:** 2026-09-25. **Branch:** `swan-brain-console-v3-salvage-20260918`.
**Evidence:** `scripts/astra/evidence/a5-tests.txt` (1,798 lines, captured — regenerate with
`python C:/tmp/a5-evidence.py`, which re-runs every command and parses every number back out of
its own output).

This file is the landing record. §1 is what now exists. §2 is the one correction that
changed the SHAPE of the slice. §3 and §4 are the claims and the code that were wrong —
including the three findings from A5's own hostile-review round. §5 is the mutation proof. §6
is what is still owed, named rather than implied. §7 is the "flake" that turned out to be a
measurement taken while the tree was being edited.

---

## §1 What landed

### New modules

| File | Lines | What it is |
|---|---|---|
| `scripts/astra/core/lawBoard.mjs` | 167 | The guardrail board. Six law rows, each with an enforcement `marker`, a live `file:line` citation, and the kill-list with its own citation. Degrades to `INCONCLUSIVE`. |
| `scripts/astra/core/authority.mjs` | 201 | `T-P-01`'s authority half. §6.2 as data, `attemptEnable()`, and `auditEnable()` — the sweep that produces the `AC5.4` claim by running it. |
| `scripts/astra/surface/paneLaw.mjs` | 94 | The `/law` pane. Zero controls. |
| `scripts/astra/surface/paneState.mjs` | 140 | The `/state` pane. Zero controls, and the `AC5.4` sweep rendered on it. Requires its board and its audit — it does no I/O (`D43`) and does not re-read the board (`D48`). |
| `scripts/astra/surface/paneRoutes.mjs` | 178 | The pane dispatch, split out of `server.mjs` for Rule 4 — and rebuilt as a TABLE after `C49`. |
| `scripts/astra/surface/smokeTune.mjs` | 85 | The Tune checks, split out of `smoke.mjs`. |
| `scripts/astra/surface/smokeBoards.mjs` | 133 | A5's smoke checks + the transport half of `AC5.4`, scanning BOTH route sets. |
| `scripts/astra/static/astra-tune.css` | 68 | The Tune styles, split out of `astra.css`. |
| `scripts/astra/static/astra-boards.css` | 79 | The two boards' styles. |
| `scripts/astra/tests/a5-law.test.mjs` | 147 | 10 tests: the guardrail board and the `/law` pane. |
| `scripts/astra/tests/a5-boards.test.mjs` | 225 | 8 tests: the capability board, the `/state` pane, the pane route table, the stylesheet list. |
| `scripts/astra/tests/a5-authority.test.mjs` | 253 | 11 tests: `AC5.4`. |

The three test files are one slice's suites split three ways by SUBJECT. `a5-law.test.mjs` was
extracted when the `D46` helper took `a5-boards.test.mjs` to 328 lines — over Rule 4 — and the
split is by subject rather than by line number, so the law rows moved out with the law board
they are about.

### Changed

`core/capabilities.mjs` (287; +`summarizeBoard()` pure, +`readSpecMode()` injectable path),
`surface/shell.mjs` (215; +`STYLESHEETS`, +`stylesheetsOnDisk()`, +`readOnlyNotice()`),
`surface/server.mjs` (297→249), `surface/api.mjs` (292; dead re-export removed),
`surface/smoke.mjs` (299→277; Tune block out, both route sets scanned), `static/astra.css`
(295→246).

### Measured

Every number below is parsed out of `a5-tests.txt`'s own §1–§8, not typed in.

```
Astra suite            167 pass / 0 fail   (was 138; A5 adds 29)
A5's own suites         29 pass / 0 fail   (10 law + 8 boards + 11 authority)
Smoke runner            37 pass / 0 fail   (was 34; A5 adds 3)
Shared suites           70 pass / 0 fail
Rule 4                  0 over cap, 1 declared exception; worst file A5 touched: 292
Whole node-runner tree 187 tests, 6 fail   (the 6 pre-existing EBUSY failures)
LAWS CITED              6 of 6, 0 inconclusive
LANES CITED            12 of 12
AC5.4 SWEEP            60 attempts, enabled = []
CONTROLS ON BOARDS      0 and 0
MUTATIONS               8 landed, 8 restored, 0 uncovered
```

---

## §2 The correction that changed the shape: `AC5.4` is about the OPERATION

`04-TESTS-TRACEABILITY.md`'s `T-P-01` row reads *"each actor against the authority matrix"*
→ *"no actor enables a REFUSED lane or spec mode"*. `03-INTERFACE.md` §6.2 repeats it and
adds the sentence that makes it a rule: *"Activation requires signed approval outside this
surface."*

**THE OBVIOUS IMPLEMENTATION IS A CLAIM THAT CANNOT FAIL.** Assert that the `/state` pane
renders no enable button, assert the matrix's `enable-spec` column contains no `yes`, and
declare `AC5.4` met. Both assertions are true and neither is the requirement. A pane with no
button says nothing about the MCP server, the CLI, or the route someone adds in A7. A matrix
cell is a string, and a string cannot refuse anything.

**WHAT LANDED INSTEAD.** The matrix is data; `attemptEnable()` is the operation every
consumer would have to go through; and `auditEnable()` calls it **once for every actor
against every target** and returns the list of attempts that switched something on. The
claim under test is that list being empty — produced by trying, not by reading.

Measured: **60 attempts** (5 actors × 12 lanes), `enabled: []`, and the refusal codes account
for the board exactly — 15 `E_LANE_RETIRED` (3×5), 15 `E_LANE_REFUSED` (3×5), 25
`E_ALREADY_ACTIVE` (5×5), 5 `E_MODE_GATED` (1×5).

**THE REFUSAL IS UNIFORM, INCLUDING FOR SEAN.** That is the design, not an oversight:
`corroborate`, `adjudicate` and `emit-vault` are gated on a signed authority adapter that
does not exist, and a console that could switch one on is a console that can mint a claim
into canon without review. §6.2's `propose` is the honest alternative, and `propose` is not
enable — it returns a different code and names the artifact that has to be signed.

**`INCONCLUSIVE` IS REFUSED TOO, AND THAT IS THE SUBTLE ROW.** A lane whose marker vanished
has no defensible status, so enabling it would be switching on something nobody can describe.
Treating "unknown" as "probably fine" is how a fail-closed guard becomes a fail-open one.

---

## §3 Corrections

### C42 — the R5 rows claimed PASS for the CORE and were silent about the SURFACE

`04-TESTS-TRACEABILITY.md` listed `AC5.1`, `AC5.2` and `AC5.3` as **PASS** in A5, with
`core/capabilities.mjs` as the evidence. That was true of the board and false of the
console: `/law` and `/state` were still rendering `renderNotBuilt(... 'A5' ...)`. A
requirement marked PASS while its own screen says "not built yet" is the same defect class as
a count that is not a count — **the claim was true of the set measured and silent about the
set excluded**. The three rows now name both halves.

### C43 — the A5 slice's Exit line read as though `T-U-07`/`T-U-08` were done

The slice text said *"Exit: `T-U-07`, `T-U-08` pass; `T-P-01` not run"* and then, further
down, *"Still to do: the `/law` and `/state` panes"*. Both are accurate and together they
read as a contradiction — an exit criterion met while two of its panes are absent. The
distinction the packet needed was **core vs surface**, and it now says it.

### C44 — `/law` had a ROUTE and no SCREEN SPEC

`03-INTERFACE.md` §1 lists `/law` in the route table. §2.2 is the Think pane's LAW CHECKS
block, §2.3 is Tune, §2.4 is State — **there is no §2.x for the Law pane.** The pane that
A5 had to build therefore had no wireframe, and its shape was derived from the board's own
data rather than specified. Recorded, and §4.1 now carries the `LawRow` interface that did
not exist.

### C45 — §4.1 had no `LawRow`, so the board's contract was unwritten

`03-INTERFACE.md` §4.1 carries `LaneState` in full — including `sourceMissing` and `reason`,
which is what makes the degradation contract explicit. It carried **nothing** for the law
board, so `lawBoard()`'s shape was invented at the keyboard. `LawRow` is now written down.

### C46 — `AC5.4` was written as a UI fact

See §2. The row said *"no enabling control"*; the requirement says *"no actor enables a
REFUSED lane or spec mode"*. The difference is the difference between a button count and a
capability, and only one of them can be measured.

### C47 — the read-only decision was a registry entry nobody rendered

`02-BLUEPRINT.md` §5 gives the reason the Law pane has no "ignore" button: *"a console with
an 'ignore' button here would be the most expensive feature in the product."*
`READ_ONLY_PANES` carries that sentence and `T-P-01 (AC4.6)` asserts it is longer than 40
characters. **Nothing rendered it.** A decision that lives only in a registry is a decision
the next author has to go looking for, and the pane it governs is where they will be looking.
Both panes now render their own reason, from the registry, verbatim.

### C48 — the packet's module count was stale again

A4b corrected `00-PACKET.md` from 37 to 44 `.mjs` by measuring. A5 adds **9 more `.mjs`**
and **2 `.css`**. The count is re-measured in §1 rather than incremented by hand, because the
last two times it was incremented it was wrong.

### C49 — `AC5.4`'s transport half could not see the routes it was supposed to guard

`AC5.4` has a transport half: scan the routes and fail if any of them names an enable action.
The scan read `MUTATION_ROUTES`, which is an **exported list**. Pane routes were an
`if (pathname === '…')` chain with **no list anywhere** — so `GET /state/enable-spec` would have
been invisible to every guard in the tree. `routesThatCouldEnable()` would catch that string if
it ever saw it, and nothing would ever have shown it to it.

This is the slice's own thesis turned on itself: **the claim was true of the set measured and
silent about the set excluded.** `controls.mjs` had already solved the identical problem the
identical way — it made the controls a REGISTRY so `AC4.6` could walk them instead of scraping
markup. `paneRoutes.mjs` is now the same shape: `PANE_ROUTES` is the registry, `PANE_PATHS` is
its index, `checkNoEnableRoute()` scans both route sets, and `a5-boards.test.mjs` asserts the
index covers every path literal in the module **in both directions**.

---

## §4 Defects

### D41 — an orphaned re-export kept alive by a comment that had become false

`surface/api.mjs` re-exported `slotsFromBrief` and `slotsForEditor` under a comment reading
*"`server.mjs` imports `slotsFromBrief` from this module's path."* The moment A5 moved the
pane dispatch into `paneRoutes.mjs`, that sentence became false and the re-export became
dead — `paneRoutes.mjs` and `a4b-editor.test.mjs` both import from `slotView.mjs` directly.
**The split is what exposed it**, which is the usual way: an orphan is invisible until
something moves the thing that was (or was not) holding it up. Removed, and the comment
replaced with the account of why.

### D42 — the `overflow-x` scan named ONE stylesheet by hand

`smoke.mjs` fetched `/static/astra.css` and asserted no `overflow-x: hidden` in it. A5 split
the CSS into three files, and the check would have gone on passing while saying nothing about
two thirds of the stylesheet. This is **the same hole A4b found in the Rule 4 guard**, where
"every module under 300 lines" quietly meant "every `.mjs` module, and not the two shipped
assets". The check now walks `stylesheetsOnDisk()` — discovered from disk, not listed — so a
new stylesheet is scanned the moment it exists. And the stylesheet list itself is asserted
against disk in both directions, because `.panel--notice` and `.panel` have equal specificity
and the load ORDER is load-bearing.

### D43 — the panes did I/O, contradicting their own doctrine

`panes.mjs` states the rule in its header: *"THESE FUNCTIONS DO NO I/O AND IMPORT NO BRAIN.
The server resolves the data and passes it in, so a pane can be rendered in a test from a
literal object."* The first draft of `renderLaw`/`renderState` called `lawBoard()` and
`capabilitySummary()` internally when no board was passed — convenient, and a direct
contradiction. Caught while writing the test that needed to inject a broken board. Both panes
now REQUIRE their data, and its absence is a **named failure** rather than an empty table:
an empty `<tbody>` renders as nothing, and "no laws" / "nothing is switched on" are the two
things these panes must never imply.

### D44 — a TAUTOLOGY in A5's own new test (the most important defect here)

The first draft of the `T-U-08` test asserted:

```js
assert.doesNotMatch(html, /cap-verified/, 'the board carries no capability claims to verify');
```

against the **State** pane — which renders no capability classes at all. The assertion would
have passed **even if the pane rendered `claimed` as if it were verified**, because it was
testing for the absence of a class the pane never had. This is exactly A4b's **D40a**, one
slice later, in a file whose header warns about it.

Caught by the discriminator question the packet now asks of every check: *"what would have to
be true for this to FAIL, and is that the same thing as the invariant I believe it
protects?"* The replacement asserts the real invariant in both directions — the State board
must not borrow the Think pane's capability vocabulary, AND the pane that does carry a
capability claim must render `claimed` with its consequence.

### D45 — the fail-open branch could not be shown firing

`readSpecMode()`'s `catch` returns `enabled: false` with `E_SPEC_MODE_UNREADABLE`, which is
the whole point of the reader: an unreadable gate reports CLOSED, never open. But it read a
fixed path, so the branch was unreachable from a test — and **a guard that cannot be
demonstrated to fire is indistinguishable from one that always passes.** The path is now
injectable, and the test points it at a file that does not exist and asserts the gate
reports closed.

### D46 — A5's own new test scanned the COMMENT, not the code

`a5-boards.test.mjs`'s route-enumerability test reads `paneRoutes.mjs` as text and asserts no
bare `pathname === '…'` comparison survives outside the route table. It failed on its own
docstring: the module header explains the fix by quoting the literals that were removed
(`pathname === '...'`, `pathname === '/'`), and the regex — which scans the whole file — found
the explanation. **The test was measuring the prose that documents the code.**

That is `D44`'s shape once more: the check did not measure the thing it named. Two defects in
one slice's new test code, both found by the same question — *what would have to be true for
this to FAIL?* The fix strips block and full-line comments before scanning, and **the stripper
is itself checked against a synthetic input**, because a stripper that ate too much would make
the assertion beneath it pass vacuously.

### D47 — the mutation driver's suite list went stale, and would have fabricated findings

`C:/tmp/a5-mutations.py` ran each mutation against a hand-written list,
`["a5-boards.test.mjs", "a5-authority.test.mjs"]`. This slice's Rule 4 split moved the law tests
into `a5-law.test.mjs` — so four law mutations (`M1`, `M2`, `M5`, `M6`) would have run against
suites containing no law test, reported **"NO TEST WENT RED"**, and produced four fabricated
findings about coverage.

**The instrument was subject to the defect it was built to detect.** A list of files to check is
a list that silently stops covering the file someone added yesterday — the same sentence
`a4b-budget.test.mjs` writes about its own scope. The driver now GLOBS `a5-*.test.mjs` and
aborts if the glob finds fewer than three, so a new A5 suite is picked up automatically and an
empty glob cannot pass.

### D48 — the State pane re-read the board behind its caller's back

`paneState.mjs`'s `enableAuditSection()` called `auditEnable()` with no argument, and
`auditEnable()` defaults to `capabilities()`. So one `/state` render read the board **twice**:
once for the summary the caller passed in, once for the `AC5.4` sweep. Two reads per request,
and — worse — **two boards inside a single pane**, which can disagree if a file changes between
them. That is the "one board, two consumers" rule broken *inside one consumer*.

Found by handing `renderState()` a two-lane summary and watching it still print the real
board's **sixty** attempts. Fixed by making `audit` a REQUIRED argument — its absence is a named
`E_STATE_BOARD_UNRESOLVED`, never a defaulted re-read — and by extracting a pure
`summarizeBoard(board)` so `paneRoutes.mjs` resolves ONE board and feeds both consumers.

### D49 — a test whose title named a guarantee it never touched

`a5-authority.test.mjs` carried a test called *"the lanes themselves refuse — the fence has a net
behind it"*. It asserted `row.marker` and `row.gatedBy` for each REFUSED lane. Both are true.
Neither exercises a lane: it **restated the board and called the restatement a net**, and the
"fence has a net behind it" phrasing claimed a guarantee the test never went near. **A test
named after a guarantee it does not touch is worse than no test**, because it retires the
suspicion that would have produced the real one.

The lanes are now CALLED — `applyCorroboration()` and `emitCollection()` are imported and
invoked, and each thrown message is required to contain the marker the board cites. The third
lane is handled honestly rather than papered over: `applyDecisions()` refuses at its
**provenance** gate (`:49`) before the **authority** gate (`:68`) the marker names, so reaching
the marker needs a signed receipt chain. The test asserts the refusal that *is* reachable,
declares that boundary in prose, and then asserts the REACHED SET BY NAME
(`EXERCISED = ['corroborate','emit-vault']`, `MARKER_ONLY = ['adjudicate']`) so a fourth REFUSED
lane forces a decision instead of silently widening the title's claim. The phrase *"the fence
has a net behind it"* does not survive.

---

## §5 The mutation proof

Eight mutations, one mechanism each. Every mutation is asserted to have **LANDED** before the
run — a mutation whose anchor is absent aborts the driver rather than counting as a green —
and every file is restored byte-exactly, verified independently with `git hash-object`.

| # | Mutation | Tests reddened |
|---|---|---|
| M1 | `lawBoard` reports `ENFORCED` regardless of the marker | 1 |
| M2 | The LAW4 marker becomes the law's own **name** | 1 |
| M3 | `attemptEnable` reports `enabled: true` | **6** |
| M4 | A `spec-mode-enable` route is added | 1 |
| M5 | The Law pane stops rendering its read-only reason | 1 |
| M6 | The Law pane emits a control | 1 |
| M7 | The base stylesheet loads last | 1 |
| M8 | An unreadable spec-mode config reads as **open** | 1 |

**`M2` is the one worth reading.** Swapping the LAW4 marker from the enforcement EXPRESSION
(`CREATURE.test(withoutIdioms)`) to the law NAME (`LAW4-optics-not-creatures`) leaves the
citation test **GREEN** — the marker still resolves to a real line — and reddens only the
discriminator test. That is the check proving it can tell a citation that *means something*
from one that merely *resolves*. Without that test, the whole board would have been
satisfiable by a table of strings.

**`M3` is the breadth check.** Flipping one boolean reddens six tests, so `AC5.4` is not
resting on a single assertion.

**Re-run after the hostile-review fixes, and the driver's own scope was fixed first.** The
table above is the second run, against the post-review code: 8/8 landed, 8/8 restored, **0
uncovered**. Before that run the driver's suite list was hand-written and had already gone
stale (`D47`); it now globs `a5-*.test.mjs`, so the law split cannot leave four mutations
measured against suites that no longer contain a law test.

**What the mutations do NOT establish, stated so it is not read in.** They prove each
mechanism is load-bearing. They do **not** prove a law still *works*: the board proves an
enforcement expression exists at a line, and `swanLawFilter.test.mjs` carries the behavioural
proof (carriage, bypasses, i18n forms). Neither substitutes for the other.

---

## §6 Still owed, named rather than implied

1. **`gatedBy` is prose, not a check.** The REFUSED rows carry a gate description
   (*"a signed monotonic lifecycle authority (not installed)"*) and A5 **cites** it. Nothing
   verifies that the named adapter is really absent. Closing that means probing for the
   adapter, which belongs with the authority layer rather than the console.
2. **`T-I-07` is still not closed.** `T-I-07` serves three rows — the no-override half
   (A3, PASS), INV3 (the LAW gate), and INV7 (fail-closed). A5 asserts the panes emit no
   control; INV3 and INV7 remain **not run**.
3. **`AC3.1`'s persistence half is still A6's.** `T-I-01`'s surface half landed in A4b; the
   `briefId` round-trip through `core/variants.mjs` needs the brief store.
4. **The 6 `EBUSY` failures in `backend/tests/node-runner` are unchanged and unexplained.**
   Five in `prune.test.mjs`, one in `sharedSchemaResolution.test.mjs`; all `spawnSync`; they
   reproduce under `--test-concurrency=1`; neither file imports anything A4b or A5 touched.
   **A4b reported these and did not fix them; A5 repeats that honestly rather than adding a
   skip.** They are environmental (a sandbox that blocks child-process launch) and they are
   a real finding about this environment, not about the tree.
5. **~~One flaky failure was observed once in the Astra suite and not reproduced in 20
   subsequent runs.~~ CLOSED BY DIAGNOSIS.** It was not a flake. The loop was measuring a tree
   that was being edited in the foreground: **six of twenty** runs failed, each on a real
   intermediate state of the slice, and every one of those states is a bug A5 went on to fix.
   See §7 — which also keeps the wrong disposition in the record on purpose.
6. **Four older suites still carry their own `withServer` copies** (`a3-surface`,
   `a3-transport`, `a4-routes`, `a4-surface`) instead of `helpers/serverHarness.mjs`. Carried
   from A4b, unfixed.
7. **`backend/tests/known-failing-baseline.json` has stale paths** (`tests/unit/` vs the real
   `tests/node-runner/`) and lists the green `swanLawFilter.test.mjs` as failing. Carried
   from A4b, unfixed.

---

## §7 The "flake", diagnosed — it was a concurrent writer

The first version of this section read *"one flaky failure, observed once, not reproduced in 20
runs — recorded, not diagnosed."* **That was wrong, and the 20-run loop that was supposed to
establish it is what disproves it.**

The loop was re-run with the failing test's NAME captured. It failed on **six of twenty runs**,
nowhere near "not reproduced" — and every failure is a snapshot of a state that was being
edited at that moment:

| run | what went red | the edit in flight |
|---|---|---|
| 08 | `E_STATE_BOARD_UNRESOLVED`; `attest is missing from the board` | making `audit` a required argument, before wiring its caller |
| 09 | `ReferenceError: capabilitySummary is not defined` | the dropped import, mid-fix |
| 10–13 | `PANE_PATHS` → `['...', '/']` | the comment-scanning bug in test 16 (`D46`) |
| 14–16 | `a5-boards.test.mjs — 328 lines` | the Rule 4 overflow `codeOnly` introduced |
| 19 | duplicate `/static/astra-boards.css` | the `shell.mjs` / `astra.css` split |

**The measurement was taken while the measured artifact was being rewritten.** There is no
nondeterminism here: each failure is a *truthful* report about a real intermediate state of the
tree, and every one of them is a bug this slice then went on to fix. The suite was never flaky.

What that does and does not license:

- It is **not** config corruption — `tuning.json` and `spec-mode.json` are byte-identical to
  `HEAD` after every run, checked with `git hash-object`.
- It is **not** the mutation driver leaving state behind: all six mutated files verified
  restored by hash.
- It **is** a lesson about the instrument, and it is the same one as `D47`: **a measurement
  whose validity depends on a precondition nobody asserted is not a measurement.** The
  precondition here is *the tree is quiescent*; the loop never checked it, and the foreground
  was editing the tree for the whole run.
- The original disposition — *"a one-in-thirty-five failure is the kind that gets re-run until
  it is green and then blamed on the weather"* — was the correct warning, and it happened to me,
  in this file, about this suite. **It is left here as a correction rather than deleted,
  because the wrong disposition is more instructive than the right one.**

§6's fifth item is therefore **closed by diagnosis**, not by a green re-run.

---

## §8 Handoff to A6

A6 is the **Ledger and the brief store**. It closes `AC3.1`'s persistence half — *"persisted
`text` byte-identical for a `briefId`"* — and the `T-E-03` / `T-I-06` / `AC6.1`–`AC6.3` rows.

Carry into A6:

1. **`/ledger` is the last `renderNotBuilt` stub.** It is the only route still rendering as
   unbuilt, and the smoke runner asserts it names its slice — so A6 flips one check.
2. **The brief store is the first thing in Astra that persists operator text.** `paths.mjs`'s
   header states the write surface is *"`scripts/design-brain/config/tuning.json`, and only
   through the staged-commit path"*. **A6 adds a second write path, and that file's own rule
   says a path assembled inline is a path no scan can see** — so the new store's path must be
   named in `paths.mjs` or `T-P-02`/`T-P-03` go silent about it.
3. **`T-I-01`'s persistence half** is the test to write, and it is an immutability claim:
   the persisted `text` must be byte-identical for a `briefId` across a write and a re-read.
   A4b's surface half is the model — it asserts the bytes AND asserts the write happened,
   because an immutability test over a no-op passes trivially.
4. **`server.mjs` is now 249 and `smoke.mjs` 274**, so A6 has room, but `paneRoutes.mjs`
   (118) is where `/ledger` lands and it is the file to watch.
5. **The `AC5.4` sweep grows automatically.** `enableTargets()` reads the live board, so a
   lane A6 adds is swept without editing a list — and `a5-authority.test.mjs` asserts the
   attempt count is a product rather than a literal, so the growth is checked.
