# Astra — A4 Landing Record: the Tune pane (staged knobs, fixture preview, atomic commit)

- **Date:** 2026-09-26 · **Author:** sable (WorkBuddy AI) · **Slice:** A4 (`05-SLICES-AND-REVIEW.md` §1)
- **Base:** `86f734d27` (A3). **Supersedes, for the sections it names:** `04-TESTS-TRACEABILITY.md`
  rows R4/AC4.1–AC4.3 and the A4 test rows, plus `05` §1's A4 entry.
- **Read this before coding A5.** A4's lesson is not about knobs. It is that **the four defects a
  screenshot could not show were all found by writing a check** — and that one of them hid behind an
  error code that looked exactly like the gate working.

---

## 1. What A4 actually built

| Artifact | Lines | What it is |
|---|---|---|
| `scripts/astra/core/tuningStage.mjs` | 237 | **NEW** — surgical text patch, atomic write, byte-exact revert, prior-value records. |
| `scripts/astra/core/tuningPreview.mjs` | 165 | **NEW** — the fixture preview. Uses the engine's own `scorePair`/`bestMatches` and the verbatim AUTO gate. |
| `scripts/astra/fixtures/pairs-12.jsonl` | 13 (12 records) | **NEW** — 12 domain-distinct pairs, bands `{auto:1, merge-band:3, fresh:8}`. |
| `scripts/astra/surface/paneTune.mjs` | 189 | **NEW** — the pane. Three visually distinct states, blast radius as a warning. |
| `scripts/astra/surface/smokeHarness.mjs` | 111 | **NEW** — the smoke runner's plumbing, split out of `smoke.mjs` (C34). |
| `scripts/astra/core/paths.mjs` | 72 | +`PAIRS_12_PATH`. |
| `scripts/astra/surface/controls.mjs` | 262 | +`tuning.discard`, +`tuning.note`, +`UNWIRED_CONTROLS`. Tune controls now `rendered`. |
| `scripts/astra/surface/api.mjs` | 276 | The four real tuning routes, and the `domainError` classifier (C32). |
| `scripts/astra/surface/server.mjs` | 300 | `/tune` wired, session state for `staged`/`note`/`lastCommit`. |
| `scripts/astra/surface/smoke.mjs` | 289 | 26 → **29 checks**, incl. the D28 guard. |
| `scripts/astra/static/astra.js` | 255 | The four Tune handlers, and the `think.whyNot` fix (D34). |
| `scripts/astra/static/astra.css` | 256 | **+~60 lines**: the Tune pane had NO styles at all (D35). |
| `scripts/astra/tests/a4-tune.test.mjs` | 283 | **NEW** — T-M-01/02/06/07, T-I-02/03/04/05 at the unit level. |
| `scripts/astra/tests/a4-preview.test.mjs` | 93 | **NEW** — split out of the above at the "writes vs writes nothing" seam. |
| `scripts/astra/tests/a4-surface.test.mjs` | 198 | **NEW** — the pane, the registry, and the wiring check. |
| `scripts/astra/tests/a4-routes.test.mjs` | 224 | **NEW** — the routes, and the classifier's failure mode. |
| `scripts/astra/tests/a3-surface.test.mjs` | 200 | The AC4.6 sweep now visits **every pane that renders a control**, and asserts its own route table is complete. |
| `scripts/astra/tests/a3-transport.test.mjs` | 162 | **NEW** — T-I-10 + the escaping/traversal boundary, split out of the above. |
| `scripts/astra/evidence/a4-tests.txt` | 266 | The captured evidence, including the before/after hashes. |

**Rule 4 budget (`T-F-04`), measured:** **0 of 35 modules over 300.** Largest is `server.mjs` at
**exactly 300** — at the cap, not over it, and therefore the first thing A5 will have to split.
`smoke.mjs` reached 335 during A4 and three files were split at real seams (C34).

**Measured:** `node --test scripts/astra/tests/*.test.mjs` → **113 pass / 0 fail** (was 79).
`113 = A1 18 + A5 12 + A2 21 + A3 28 + A4 34`. No regression.

**Measured:** `node scripts/astra/surface/smoke.mjs` → **29 passed, 0 failed** (was 26).

---

## 2. The central correction: a count is a claim about completeness, and so is a refusal

A3's landing record established that **a count may only be made when the record can support it**
(`T-M-03`). A4's version of the same defect is subtler and more dangerous:

> **A REFUSAL IS ALSO A CLAIM, and a bug that produces a plausible refusal is invisible.**

`TUNING_PATH` was used in `api.mjs` without being imported. Every catch site read
`e.code ?? 'E_SOMETHING'`, and a `ReferenceError` has no `.code` — so the resulting crash was
reported as **HTTP 400 with a real domain code**. The status was plausible, the code was real, and
the console was broken. The smoke runner caught it only because it checks the **code** and not just
the status, and only because a second check happened to depend on the first having done its job.

The fix is a classifier that refuses to let an unclassified throw wear a domain code: a thrown value
with an `E_`-prefixed `.code` is a verdict about the operator's input and keeps the route's status;
anything else is a **500 `E_ASTRA_INTERNAL`** naming the error class. A programming error can no
longer be mistaken for a gate, by a test or by Sean.

The generalised rule, which is the durable part:

| Claim | What must be true before it is made |
|---|---|
| "3 checks passed" | the record carries a check list |
| "the config is live" | the view is reading the config, and nothing is staged |
| "that key is invalid" | the validator that runs is the one the write will run |
| "the pane is built" | every control it renders does something when used |
| "this button is a warning" | the stylesheet makes it look like one |

---

## 3. Corrections to the packet and to A3's record

| # | What was wrong | Correction |
|---|---|---|
| **C27** | `04` §1.7 and A3's evidence name `smoke.mjs`; it exists, but nothing asserted that its checks can FAIL. | Mutation-tested: 4 mechanisms deleted in turn, each going red on exactly its own check. Recorded in `a4-tests.txt` §5. |
| **C28** | A3's landing record states the registry as **25 controls / 20 rendered**. The registry measures **23 / 14** at that commit. | The measurement wins. A4 states 25/20 for the **A4** commit, where it is true. A remembered number reported as measured is the `T-M-03` defect. |
| **C29** | A3's AC4.6 sweep gathered markup from `/` and `/think` only, so a pane's controls could be declared `rendered` and never looked for. | The sweep now derives its pane list from the registry and asserts its own route table is **complete** — a new pane fails the test until its route is added. |
| **C30** | `04` records `R3 / AC3.2 / T-I-01` as **"not run"**, and `T-I-01` exists nowhere in `scripts/astra/`. | Kept as an open item, and now **recorded in code**: `UNWIRED_CONTROLS` names `slots.stageOverrides` with a reason and an owner. See §6. |
| **C31** | A3's `T-I-10` test used `tuning-commit` as the vehicle to prove the token gate runs before the handler. A4 built that route. | The vehicle moved to `preview` (still refused, `E_GENERATION_DISABLED`). The test now names why the vehicle is chosen, so the next slice does not pick "whatever is left". |
| **C32** | Every `catch` in `api.mjs` used `e.code ?? 'E_SOMETHING'`, so an unclassified throw was reported as a domain refusal. | The `domainError` classifier. An unrecognised throw is a 500 `E_ASTRA_INTERNAL`. |
| **C33** | `panes.mjs` renders `[STAGE OVERRIDES]` and `[WHY NOT?]`; `astra.js` had no handler for either. Nothing checked. | `think.whyNot` is **fixed** (D34). `slots.stageOverrides` is recorded in `UNWIRED_CONTROLS`. A **wiring check** now fails if a rendered control is neither dispatched by id nor reached by its dashed DOM id. |
| **C34** | `smoke.mjs` reached 335 lines; two test files crossed 300. | Split at real seams, not trimmed: plumbing vs checks; pane vs routes; panes vs transport. |
| **C35** | `03-INTERFACE.md` §2.3's flow diagram says `T2[Sean edits knobs]` and `01-REQUIREMENTS.md` AC4.1 calls the surface "the knob editor", but the pane rendered knob values as read-only text. | The STAGED column is now a real `<input type="number">` per knob, with `data-current` so the client can tell "unchanged" from "edited back". |

---

## 4. Defects found in A4

| # | Defect | Evidence | Status |
|---|---|---|---|
| **D27** | `tuning-stage` validated only via `previewStaged`, which **ignores an unknown key** — so a typo was accepted and the refusal surfaced at COMMIT, after the operator had written a note. | smoke: `unknown key REFUSED` returned **200**; `tuning-commit` then returned `E_TUNING_KEY_UNKNOWN` instead of `E_TUNING_NO_CHANGES`. | Fixed: the stage path runs `applyPatch`, the same validator the commit uses. Mutation M2. |
| **D28** | `GET /api/tuning` returned `tuningView()`, which hard-codes `staged: {}`. After a real stage the pane said `STAGED (1)` and the API said nothing was staged. | Probe: `state.staged = {"mergeBand.low":0.4}`, view returned `staged:{}`, `changedKeys:[]`. | Fixed. Mutation M1. |
| **D29** | `TUNING_PATH` used without an import; the `ReferenceError` was reported as a **400 domain refusal**. | smoke: `E_TUNING_STAGE` / `"TUNING_PATH is not defined"`. | Fixed by C32. Mutation M3. |
| **D30** | The knobs rendered as **read-only text**, so the pane was not an editor (`AC4.1`), and the registry's `tuning.knob` (`element: 'input'`, `rendered: true`, `repeated: 'per knob'`) was a claim the markup did not support. | The AC4.6 cross-check failed: `tuning.knob` declared rendered, never found. | Fixed. |
| **D31** | The pane had no **DISCARD STAGE**, which `03-INTERFACE.md` §2.3 draws and §3's flow makes the "changed my mind" branch. Abandoning a draft required committing it or reloading. | The mock's third button. | Fixed: `tuning.discard`, a fourth control. |
| **D32** | The note `<textarea>` carried `tuning.stage`'s id. The client dispatches on `closest('[data-control]')`, so **a click into the note field fired the stage action**. | Latent until the client learned `tuning.stage`; live the moment it did. | Fixed: the field has its own id, `tuning.note`, and the client no-ops it explicitly. |
| **D33** | The patcher writes the value's canonical JS form, so a staged `0.40` lands as `0.4` and `0.90` as `0.9`. Numerically identical; the lexical form is not preserved. | Evidence §2: `"mergeBand": { "low": 0.4 }`. | **Recorded, not fixed.** Within the changed region, so `T-M-07` is not violated, and the prior record holds the original bytes so a revert restores the spelling. Fixing it would mean parsing the operator's text, which is a bigger change than the defect. |
| **D34** | `think.whyNot` rendered, took focus, announced "Why not?" and **did nothing**. | The wiring check. | Fixed: it highlights and scrolls to the LAW section and states why no override is offered. Mutation M4. |
| **D35** | The Tune pane shipped **unstyled** — `.knobs`, `.knob-input`, `.gate-mark`, `.blast`, `.delta`, `.state-live/.state-staged` had no rules. The blast radius that `T-I-05` requires to read **as a warning** was indistinguishable from a table cell. | Grep of `astra.css` for each class the pane references: all zero. | Fixed, using only existing variables and the two literal backgrounds already paired with `--ink`, so no new contrast pair escapes the `T-A-04` audit. |

**D30, D31, D34 and D35 were all found by writing a check, not by looking at the app.** Two by the
AC4.6 cross-check, one by the wiring check, one by asking which classes the pane references and
grepping the stylesheet. None of them is visible in a screenshot of a pane that renders.

---

## 5. What the mutation tests prove

The tree was backed up byte-exactly before each mutation and restored byte-exactly after (sha256
verified equal every time). No mutation was left in place.

| # | Mechanism deleted | Result |
|---|---|---|
| M1 | `GET /api/tuning` made to ignore the session stage (reproducing D28) | 28 passed, **1 failed** — only "carries the stage" |
| M2 | `tuning-stage`'s `applyPatch` validation removed (reproducing D27) | 27 passed, **2 failed** — the unknown-key check, and the commit check downstream of it |
| M3 | The classifier made to fall back to a domain code (reproducing D29) | 12 pass, **1 fail** — "a bug can never wear a domain refusal" |
| M4 | The client's `tuning.discard` handler renamed so it no longer matches its control | **1 fail** — "a rendered control with no handler is a dead control" |

---

## 6. Still open, named rather than omitted

**`slots.stageOverrides` is a rendered control with no handler.** It is recorded in
`UNWIRED_CONTROLS` with a reason and an owner, so it cannot be lost — and the wiring check asserts
the list has no stale entries, so it cannot quietly become permanent.

What it needs is the **override editor**: `03-INTERFACE.md` §2.3's "12 SLOTS (override layer — the
brief above never changes)" drawn as editable cells, with `STAGE OVERRIDES` collecting them into
`brief.slotOverrides` and `RESET` discarding them. The engine and `/api/compile` already accept
`slotOverrides`; only the surface is missing. This is `R3 / AC3.2 / T-I-01`, which `04` records as
**"not run"** and for which `T-I-01` was never written. It is the next piece of work, ahead of A5's
Law and State panes, because it is a requirement already marked not-run rather than a new one.

**`server.mjs` is exactly 300 lines.** A5 adds two panes. It will need splitting first.

**G5** (no Astra-scoped module smoke guard) remains open by design, deferred until after A8.

---

## 7. Handoff to A5 — Law + State

- **`T-P-01`'s `AC5.4` half is still owed.** `T-P-01` is ONE id serving TWO requirements in TWO
  slices: `AC4.6` (the registry, claimed by A3 and A4) and `AC5.4` (the authority matrix). A5 claims
  only the `AC5.4` half, and names its tests `T-P-01 (AC5.4) …`.
- **The read-only panes already carry their reasons** in `READ_ONLY_PANES`, and both are asserted to
  have zero registered controls. Do not add a control to them without deleting an entry that says why.
- **`T-I-07`'s structural form** (Law and State render ZERO controls) is already in
  `a3-choose.test.mjs`. A5 must keep it passing while adding content.
- **Split `server.mjs` before adding routes.** It is at exactly 300.
