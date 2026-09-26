# Astra — A4b Landing Record: the override editor, and the law it could delete

- **Date:** 2026-09-26 · **Author:** sable (WorkBuddy AI) · **Slice:** A4b (unplanned; carved out of `05-SLICES-AND-REVIEW.md` §1's A4 handoff)
- **Base:** `947a856b2` (A4). **Supersedes, for the sections it names:** `04-TESTS-TRACEABILITY.md`
  rows `T-I-01` / R3-AC3.1 / R3-AC3.2 / INV6, and `05` §1's A4 handoff bullets.
- **Read this before coding A5.** A4's lesson was *a refusal is also a claim*. A4b's is the next turn
  of the same screw, and it is about the checks themselves:

  > **A PASS IS ALSO A CLAIM — and a check that cannot fail for the reason it names is worse than no
  > check, because it reports safety.**

  Three of the defects below are defects **in checks**, found by mutation-testing the checks. One of
  them was a tautology in this slice's own brand-new test file, and it was caught only because the
  mutation run disagreed with the suite.

---

## 1. What A4b actually built

| Artifact | Lines | What it is |
|---|---|---|
| `scripts/astra/core/overrides.mjs` | 103 | **NEW** — the override FENCE: `BLOCKED_OVERRIDE_KEYS`, `validateOverrides`, `overridableKeys`. ONE policy, read by the pane and the API. |
| `scripts/astra/surface/paneSlots.mjs` | 126 | **NEW** — the 12-slot table as an EDITOR: 11 editable inputs + 1 locked row. |
| `scripts/astra/surface/slotView.mjs` | 71 | **NEW** — `SLOT_ORDER`, `slotsFromBrief`, `slotsForEditor` (effective value **and** baseline). |
| `scripts/astra/surface/routes.mjs` | 33 | **NEW** — `MUTATION_ROUTES` / `POST_ONLY` as one derived list. |
| `scripts/astra/surface/smokeOverrides.mjs` | 96 | **NEW** — A4b's smoke checks, and the COVERAGE guard (D39). |
| `scripts/astra/surface/api.mjs` | 286 | The compile fence; the `overrides-stage` route; D37's dead branch removed. |
| `scripts/astra/surface/server.mjs` | 297 | Compose wired to the editor; `slotOverrides` in session state. |
| `scripts/astra/surface/controls.mjs` | 267 | +`slots.override`; **`UNWIRED_CONTROLS` emptied** (C36). |
| `scripts/astra/surface/panes.mjs` | 264 | `renderSlots` moved out and re-exported. |
| `scripts/astra/static/astra-core.js` | 158 | **NEW** — client plumbing (`api`, `post`, `briefFrom`, …). |
| `scripts/astra/static/astra-actions.js` | 177 | **NEW** — the `ACTIONS` table, keyed by control id. |
| `scripts/astra/static/astra.js` | 20 | Now a thin entry: import, bind, set motion preference. |
| `scripts/astra/static/astra.css` | 295 | Editor styles; **D38** fixed. |
| `shared/swanLawPatterns.mjs` | 167 | **NEW** — the law DATA half (patterns, `KILL_LIST`, `KILL_LIST_TEXT`, `KILL_LIST_PROSE`). |
| `shared/swanLawFilter.mjs` | 242 | Rewritten as the RUNNER; **LAW 3's second condition**. |
| `shared/swanPromptCompiler.mjs` | 289 | Imports `KILL_LIST_PROSE` — one definition, not two. |
| `scripts/astra/tests/a4b-budget.test.mjs` | 240 | **NEW** — Rule 4 as a measured invariant, three scopes, declared exceptions. |
| `scripts/astra/tests/a4b-overrides.test.mjs` | 156 | **NEW** — the fence. |
| `scripts/astra/tests/a4b-editor.test.mjs` | 276 | **NEW** — the pane, including the AC3.1 immutability test. |
| `scripts/astra/tests/helpers/serverHarness.mjs` | 63 | **NEW** — one `withServer` for new suites. |
| `scripts/astra/tests/a4-surface.test.mjs` | 213 | Enumerates the client modules **from disk**. |
| `backend/tests/node-runner/swanLawFilterKillList.test.mjs` | 95 | **NEW** — the 7 LAW 3 carriage tests, split out for Rule 4. |
| `backend/tests/node-runner/swanLawFilter.test.mjs` | 240 | **Restored to its committed bytes** by the split — `git hash-object` == `HEAD:` (see §5). |
| `backend/tests/node-runner/swanPromptCompiler.test.mjs` | 286 | +1 regression: an override cannot delete the kill-list. |

**Rule 4 budget (`T-F-04`), measured:** **0 offenders across three scopes** —
`scripts/astra` (`.mjs`/`.js`/`.css`), `shared` (`.mjs`), and `backend/tests/node-runner` (`.mjs`) —
**with 1 declared exception** (`variantRun.test.mjs`, see §6). Largest in-scope file is
`server.mjs` at **297**. `smoke.mjs` is at **299**, which is legal and is the next thing A5 will
have to split.

**Measured:** `node --test scripts/astra/tests/*.test.mjs` → **138 pass / 0 fail** (was 113).
**Measured:** `node scripts/astra/surface/smoke.mjs` → **34 passed, 0 failed** (was 29).
**Measured:** the two suites A4b touches in the shared tree → **67 pass / 0 fail**.

**NOT green, and reported rather than hidden:** the `backend/tests/node-runner` tree as a whole is
**181 pass / 6 fail**. All 6 are pre-existing and environmental — see §6.

**Evidence:** `scripts/astra/evidence/a4b-tests.txt` (1465 lines) — **captured, not transcribed**:
the full suite transcript, the smoke runner's one-screen report, the three shared suites, the budget
guard, the split-out LAW 3 suite on its own, the git hash comparison that proves the split lossless,
and the named pre-existing failures. The seven mutations in §5 are run by throwaway drivers outside
the repo, so a mutated file can never be committed; their results are the table in §5.

---

## 2. The central correction: a pass is also a claim

`T-M-03` said a count may only be made when the record can support it. A4 added: a refusal is a claim
too, and a bug wearing a plausible refusal is invisible. A4b's version is about the guard itself.

The measured hole: `resolveSlots` applies `brief.slotOverrides` **LAST**, after the kill-list is set.
The compile route passed the request body's `slotOverrides` straight through, unvalidated:

```js
if (body.slotOverrides) brief.slotOverrides = body.slotOverrides;   // any key, any value, any type
```

So `{"slotOverrides": {"negative": ""}}` **deleted LAW 3's kill-list** — and returned a compile
reporting all six lawChecks green, including `LAW3-kill-list`. Nothing failed, because LAW 3's loop
scans positive slots only (`filter(([k]) => k !== 'negative')`).

Two independent guards now exist, and the reason there are two is the durable part:

| Layer | Mechanism | Why it is not sufficient alone |
|---|---|---|
| `shared/swanLawFilter.mjs` | LAW 3 refuses a `negative` slot that is PRESENT but names no family | It fires **after** the deletion. A guard that fires after the harm is a net, not a fence. |
| `core/overrides.mjs` | The boundary refuses `negative` outright, before any compile | It cannot see a deletion performed by a caller that bypasses HTTP (the CLI, the MCP server). |

The LAW 3 guard is keyed on **presence**, not truthiness, and that is not a style choice: three
production callers pass a partial map with no `negative` key — `scripts/forge.mjs:156` calls
`assertLawful({ subject: change }, [])` — and two landed hostile-review regressions depend on a
**partial** negative passing. An absent key is a partial call; a present-but-empty one is a verdict.

| Claim | What must be true before it is made |
|---|---|
| "all six lawChecks passed" | the record carries a check list, and the law's *input* still exists |
| "that key is refused" | the refusal happens **before** the effect, not after |
| "the editor offers 11 slots" | the pane's set is derived from the API's policy, not re-typed |
| "the smoke suite covers the surface" | every declared route has a check naming it |
| "the tree is within budget" | the scope includes what ships, not just what was convenient |

**And the rule caught this record's own author.** Writing C37 — which closes `T-I-01` as PASS — required
checking each of its two halves. The AC3.2 half (the override layer) had tests. The **AC3.1** half —
*"submit brief, stage overrides, re-read persisted `text` → byte-identical to what was typed"* — did
**not**, and it was about to be marked PASS on the strength of an argument: staging returns
`wrote: false`, and the pane reads the brief from `state.brief`. That argument is plausible and it is not
a measurement. So the test was written instead: an awkward brief (quotes, `&`, angle brackets, a
newline), a stage, a re-read, and an assertion that the text is byte-identical **plus** an assertion that
the stage actually landed — without which the immutability check would pass on a no-op. Then it was
mutation-proven (M8). A requirement marked PASS because nothing in it looks wrong is the `T-M-03`
defect with the sign flipped.

---

## 3. Corrections to the packet and to A4's record

| # | What was wrong | Correction |
|---|---|---|
| **C36** | `A4-CORRECTIONS.md` C33/§6 records `slots.stageOverrides` in `UNWIRED_CONTROLS` as a rendered control with no handler. | The editor exists, so the list is **EMPTY** — kept as an empty list rather than deleted, because it is the exclusion list for a check that must fail loudly when a rendered control loses its handler. A deleted list is a deleted check. |
| **C37** | `04` §3 records `R3 / AC3.1 / AC3.2 / INV6` (`T-I-01`) as **"not run"**, and says the test does not exist. | The test exists and passes. `T-I-01` is claimed **in full** now — the stage round-trip, the persisted-brief immutability, and the override layer — across `a4b-editor.test.mjs`, `a4b-overrides.test.mjs` and `a4-surface.test.mjs`. |
| **C38** | `A4-CORRECTIONS.md` §1 and §6 state `server.mjs` is at **exactly 300** lines and that A5 must split it first. | It is **297** — A4b split it (`routes.mjs`, `slotView.mjs`) to make room for the fence and the new route. A5 still has almost no room, so the advice stands, but the number was a measurement of a file that has since moved. |
| **C39** | Every prior slice's Rule 4 claim counted `.mjs` modules, and said nothing about the two SHIPPED STATIC ASSETS the browser loads. | The scope is now `.mjs`/`.js`/`.css` for the Astra tree. Widening it immediately showed **`astra.js` at 320 lines** — over the cap, and out of scope the whole time. The client is now three modules. **The claim was true of the set measured and silent about the set excluded** — the same defect as `T-M-03`, applied to the project's own housekeeping. |
| **C40** | `04` §1.7 and A4's evidence describe `smoke.mjs` by its check count (29), which reads as a coverage claim. | The count was a **list length**, and the list is hand-kept: `overrides-stage` — a real, token-gated route A4b added — had no check at all. There is now a COVERAGE check that fails if any `MUTATION_ROUTES` entry has no check naming it. |
| **C41** | `backend/tests/known-failing-baseline.json` lists `tests/unit/prune.test.mjs`, `tests/unit/swanLawFilter.corpus.test.mjs` and `tests/unit/swanLawFilter.test.mjs`. | The paths are **stale** — those files live in `tests/node-runner/`, not `tests/unit/`. And `swanLawFilter.test.mjs` is **green** (30/30 under `node --test`), so the baseline names a passing suite as failing. A baseline that rots this way is the `T-M-03` family: a record stating something the data does not support. Recorded, not edited — it belongs to the backend test workstream, not to Astra. |

---

## 4. Defects found in A4b

| # | Defect | Evidence | Status |
|---|---|---|---|
| **D36** | `slotOverrides` was an **unvalidated passthrough** from the HTTP body into the layer `resolveSlots` applies LAST — so it could delete a LAW. | Probe: `{"slotOverrides": {"negative": ""}}` returned a compile with `ok: true` and all six `lawChecks` green, with the kill-list gone. | **Fixed at both layers** — LAW 3's second condition, and `core/overrides.mjs`. Mutations M1–M3. |
| **D37** | `api.mjs` contained a **second, unreachable** `if (route === 'tuning')` branch returning `{current, staged, note, lastCommit}` — a **different shape** from the live branch above it. | Probe: the live branch returns `changedKeys`/`blastRadius`/`state`; the dead one never could. The first probe used `current` as its discriminator, which appears in **both** shapes, and so proved nothing. | Removed, with the finding recorded in place. Deleting the **live** branch as "the duplicate" would have changed the API's response without failing a single test. |
| **D38** | `astra.css` targeted `#tune-note`; the note field's id is `tuning-note`. A **dead rule** — the field had no focus ring. | Grep of the stylesheet against the rendered id. | Fixed. |
| **D39** | `smoke.mjs`'s `29 checks` was a **list length presented as a coverage claim**. `overrides-stage` — real, token-gated, added by this slice — had no check. | Reading the check list against `MUTATION_ROUTES`. | Fixed: 4 checks added, plus a COVERAGE check that fails on any uncovered mutation route. Mutations M1–M2. |
| **D40** | **Three defects in the CHECKS THEMSELVES**, all in A4b's own new tests, all found by mutation-testing them. (a) A **tautological** assertion: the editor test read the expected reason from `BLOCKED_OVERRIDE_KEYS` and asserted the markup contained it — so replacing the reason with `"x"` left it green. (b) A **loose discriminator**: `row.includes('negative')` matched slot 5, because `composition`'s default value is *"single dominant gesture, generous negative space"*. (c) An **inner-only capture**: the row regex dropped the opening `<tr>`, so a class assertion failed against markup that carried the class. | Mutation M2 reddened the fence file and left the editor file untouched — the disagreement is what exposed (a). (b) and (c) failed on the first run, for the right reasons. | Fixed: a property assertion plus a cross-surface agreement check; `rowKey(row)` reads the key CELL; `rows()` returns the whole row. |

**D39 and D40 are the same defect one level up.** D39 is a suite that claimed completeness it had not
measured; D40 is three checks that claimed to test something they did not. Neither is visible by
reading the app, and neither is visible by reading the test file — only by asking what would have to
be true for the check to FAIL, and whether that is the same thing as the invariant it names.

---

## 5. What the mutation tests prove

Every mutation was asserted to have **landed on disk** before the run — a mutation that silently fails
to apply produces a green suite that proves nothing, which is a trap already paid for once in this
work. The tree was restored byte-exactly afterwards, sha256-verified every time.

| # | Mechanism removed / altered | Result |
|---|---|---|
| M1 | `BLOCKED_OVERRIDE_KEYS` emptied — `negative` becomes an ordinary key | **7 failed** across both halves: the editor's locked row, the STAGE refusal, and all five fence tests. One deletion, both surfaces — that is the shared policy working. |
| M2 | The block keeps its key but loses its reason | **4 failed**, including the editor test (a) — the red that exposed D40's tautology. |
| M3 | The reason survives but stops naming LAW 3 | **4 failed** — the property assertion, not a string comparison. |
| M4 | `overrides-stage` loses its token requirement | **1 failed** — the smoke gate check. Exit 1. |
| M5 | A mutation route is declared that no check names | **1 failed** — COVERAGE. Exit 1. |
| M6 | The Rule 4 exception is re-keyed to a file that is not over the cap | **3 failed** — the budget test **and** the staleness test, i.e. both directions of the exception list. |
| M7 | The split-out LAW 3 suite is padded to 305 lines | **2 failed** — the third scope names it. |
| M8 | `overrides-stage` made to write through to `state.brief.text` | **1 failed** — the AC3.1 immutability test, and only it. Exit 1. |

**The split itself is proven lossless by git, not by inspection.** `swanLawFilter.test.mjs` was
truncated at the seam and its four now-unused imports removed; the result hashes **identical to
`HEAD:backend/tests/node-runner/swanLawFilter.test.mjs`** (`198e50d2…`). A mechanical edit that
restores a file to its committed bytes moved exactly the lines it claimed to move.

---

## 6. Still open, named rather than omitted

**Six pre-existing failures in `backend/tests/node-runner`.** `prune.test.mjs` 5, and
`sharedSchemaResolution.test.mjs` 1. **All six are `spawnSync … EBUSY`** — every failing test launches
node as a child process, and this sandbox refuses `spawnSync`/`execFileSync` on the managed node
binary. They fail **identically in isolation**, so it is not cross-file interference; neither file is
modified by A4b; and neither imports a module A4b touched. They are **environmental, not product
defects** — reported because "shared 67/67" is true of the suites A4b touches and would be a false
claim about the tree. **Not** papered over with a skip: a test that skips when it cannot spawn is a
test that reports safety.

**`backend/tests/node-runner/variantRun.test.mjs` is over Rule 4's cap (316) and is a DECLARED
EXCEPTION**, recorded in `a4b-budget.test.mjs` with a reason and an owner. It was over the cap before
A4b touched anything (committed at `015eac6c3`), and it belongs to the variant-store workstream
(EX-0 / SWA-231). The exception list is asserted in **both** directions, so it cannot silently excuse
a future overflow of the same path.

**`smoke.mjs` is at 299 lines.** Legal, and the first thing A5 will have to split.

**G5 — no Astra-scoped module smoke guard — is PARTIALLY addressed, not closed.** The widened Rule 4
guard now walks `scripts/astra` **whole**, including the shipped `.js`/`.css` assets, and asserts it
reaches every subtree — so a new Astra module cannot be silently excluded from the *budget* check. It
still says nothing about whether a new module **loads and runs**. The original deferral (write it once,
against the final module set, after A8) stands.

**`serverHarness.mjs` is the home for new suites; four older ones still carry their own `withServer`
copy** (`a3-surface`, `a3-transport`, `a4-routes`, `a4-surface`). They had already diverged — some sent
the token as a header, some omitted it and relied on the route being free. Migrating them is mechanical
and touches four files this slice does not otherwise edit; doing it here would bury the override work
in a test refactor.

---

## 7. Handoff to A5 — Law + State

- **Split `smoke.mjs` (299) and expect `server.mjs` (297) to need it.** Both are at the cap.
- **`T-P-01`'s `AC5.4` half is still owed.** `T-P-01` is ONE id serving TWO requirements in TWO slices:
  `AC4.6` (the registry) and `AC5.4` (the authority matrix). A4b changed the registry's shape —
  `UNWIRED_CONTROLS` is empty and `slots.override` is new — so A5 should re-read it rather than trust
  the A3 count. Name A5's tests `T-P-01 (AC5.4) …`.
- **The registry is now 26 controls: 21 DIAL / 5 PROPOSAL, 21 rendered.** That is a measurement of the
  A4b commit, not a remembered number.
- **The read-only panes already carry their reasons** in `READ_ONLY_PANES`, and both are asserted to
  have zero registered controls. Do not add a control to them without deleting an entry that says why.
- **`T-I-07`'s structural form** (Law and State render ZERO controls) is already in `a3-choose.test.mjs`.
  A5 must keep it passing while adding content.
- **Do not re-derive the override policy.** `core/overrides.mjs` is the single definition; the pane and
  the API both read it, and a mutation that empties it reddens both. A second copy is how a pane invites
  a control the API refuses.
- **Rule 4's guard now has three scopes and a declared-exception list.** A new tree added to this
  project should be added to the guard in the same pass, or the guard's green is silent about it.
