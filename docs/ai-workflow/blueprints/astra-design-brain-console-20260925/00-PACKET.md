# Astra — Design Brain Console · Build Packet

- **Date:** 2026-09-25 · **Author:** sable (WorkBuddy AI, deepseek-v4.1-flash) · **Requested by:** Sean
- **Status:** **A0 ✅ DONE** · **A1 ✅ DONE** (30/30 tests green) · **A2 ✅ DONE** (9 MCP tools; evidence in `scripts/astra/evidence/a2-tests.txt`) · **A3 ✅ DONE** (the loopback surface, 3 panes; **79/79 tests green**; evidence in `scripts/astra/evidence/a3-tests.txt` + 4 screenshots) · **A4 ✅ DONE** (the Tune pane: staged knobs, fixture preview, atomic commit, byte-exact revert; **113/113 tests green**, 29/29 smoke; evidence in `scripts/astra/evidence/a4-tests.txt`) · **A4b ✅ DONE** (the override editor, and the LAW 3 carry guard that closes the hole it exposed; **138/138 tests green**, 34/34 smoke, 0 Rule 4 offenders over three scopes; see `A4b-CORRECTIONS.md`) · **A5 ✅ DONE** (the Law + State boards as panes, and `T-P-01`'s authority half — `AC5.4` is now an executable sweep, not a button count; **164/164 tests green** → re-measured after A5's hostile-review round: **167/167 tests green**, 37/37 smoke, 70/70 shared, 0 Rule 4 offenders; see `A5-CORRECTIONS.md` — including the three findings that round produced (`C49`, `D48`, `D49`) and the "flake" that turned out to be a measurement taken while the tree was being edited (§7)) · **A6 ✅ DONE** (the Ledger pane + its one dial, the `rejected_all` trend, `AC6.2`'s **pinned** cost-drift mirror, and the brief store that closes `AC3.1`'s persistence half; **207/207 tests green**, 41/41 smoke, 70/70 shared, 0 Rule 4 offenders; see `A6-CORRECTIONS.md` — including all **eight** findings from its own hostile-review round (round 34, `DEFECTS-FOUND` 0/0/4/4), **three of which were introduced by the fixes for the other five**) · A7–A8 **not started** · **R3/AC3.2 (`T-I-01`) ✅ CLOSED in A4b**; **R3/AC3.1 ✅ CLOSED in A6** — the SURFACE half in A4b, the PERSISTENCE half in A6 (`briefId` round-trip through `core/variants.mjs`, `text` byte-identical, the write asserted to have happened).
- **Read the corrections before coding on:** `A0-SEAM-AUDIT.md` (5 corrections), **`A1-CORRECTIONS.md` (11)**, **`A2-CORRECTIONS.md` (6 + 9 defects)**, **`A3-CORRECTIONS.md` (9 + 11 defects)**, **`A4-CORRECTIONS.md` (9 + 9 defects)** and **`A4b-CORRECTIONS.md` (6 + 5 defects)** supersede the sections they name in this packet. `A1-CORRECTIONS.md` §3 replaces `A0-SEAM-AUDIT.md` §6 outright — three of A0's REFUSED lanes were measured ACTIVE. `A2-CORRECTIONS.md` §4 records the two defects that mattered most: a CRLF file that made every anchored regex fail **silently**, and a licence filter that rejected all 18 worlds because it read the palette law at the wrong line offset. `A3-CORRECTIONS.md` §5 records the defect that matters most there: a partial compile record rendered as **"0 checks passed"** — a finding the data could not support. `A4-CORRECTIONS.md` §2 generalises it: **a refusal is also a claim**, and a `ReferenceError` reported as a `400` under a real domain code is a perfect impression of the gate working. `A4b-CORRECTIONS.md` §2 completes the turn: **a PASS is also a claim** — the override layer could delete a LAW and the compile still reported all six checks green, and three of A4b's five defects were defects **in the checks themselves**, found by mutation-testing the checks. **`A5-CORRECTIONS.md` (7 + 5 defects)** applies the same rule to a slice that was mostly *claiming*: `AC5.4` had been written as a UI fact (*"no enabling control"*) when the requirement is about the OPERATION — a button count cannot refuse anything — so it landed as a sweep that tries every actor against every lane. A5's `C42` is the sibling of A4b's central finding: the R5 rows claimed **PASS** for the core while `/law` and `/state` still rendered *"not built yet"* — *the claim was true of the set measured and silent about the set excluded*. A5's `D44` is A4b's `D40a` again, one slice later: a **tautology** in the new test, caught by asking what would have to be true for it to fail. `A3-CORRECTIONS.md` C18 is a **live trap for A5**: `T-P-01` is one id serving two requirements in two slices, and A3 and A4 claim only the `AC4.6` half — A5 claimed the authority half and **did not re-claim the registry half**. **`A6-CORRECTIONS.md` (7 + 8 defects)** is the slice where the defect class turned on the fix that was repairing it: its cost section rendered a store that **could not be read** as *"no generations recorded"* (the banner explaining it was computed *after* the early return that fires in exactly that case), its header printed *"17 rejected of 41"* above *"no compiles yet"*, and then **the fix for the third instance asserted a summary that was never drawn** — the same claim-true-of-the-set-measured defect, inside the sentence written to stop it. Three of A6's eight defects were introduced by the fixes for the other five, and were found only because the fixes got their own adversarial pass. A6's `C50` is the other kind: `AC6.2` is phrased in two field names that **do not exist anywhere in the shipped code**, and A6 satisfies it by conversion rather than by rewording the requirement to match the implementation. A6's `C55` is the **fourth** correction of one number — the control registry's count, which lives in **four files** and which each slice has been updating a subset of (`A3-CORRECTIONS.md` `D18`, `A4-CORRECTIONS.md` `C28`, and `04-TESTS-TRACEABILITY.md` row 207 from A4b until A6). It is the clearest case in the packet of a **stale evidence sentence under a correct verdict**: the row's test asserts *consistency*, not a number, so it passed at every slice while the number beside it drifted. A6's `C56` is the same error made about a **file** rather than a number: the slice's own handoff note said to *exclude* `evidence/a3-think-1440.png` as *"stat-dirty only, another workstream's"*, and the measurement says the opposite on both counts — the blob differs from `HEAD` at an identical byte size, and the cause is A6's own change to the Think pane (the three Compose screenshots are byte-identical to `HEAD`; only the Think one moved). **Following that instruction would have shipped code and evidence from two different revisions.** *A generated artifact is the evidence for the code that generates it.* And `C56`'s own first draft then over-claimed *what a reader would see* in that screenshot: unfiltering both PNGs shows **rows 0–898 byte-identical** and exactly **one scanline** differing — a 144 px element shifted 77 px right, because the changed row sits at the viewport's bottom edge. **The attribution was measured; the description of the visible consequence was not.**
- **Mega Blueprints:** this is the packet. Read `00` → `05` in order before writing code.
- **Repo/worktree:** `SS-PT` @ `tmp/worktrees/brain-console-salvage-20260918`
- **Branch:** `swan-brain-console-v3-salvage-20260918` · **Commit:** `e29508664`
- **Product name (Sean, 2026-09-25):** **Astra**

---

## 1. What Astra is, in one paragraph

The Design Brain today is **one brain with three named consumers** — the backend service, the CLI
(`scripts/forge.mjs`), and (the contract says) "later, an MCP server". Astra is **the fourth consumer,
and the first one Sean can look at.** It is a local console that answers two questions the brain can
currently only answer if you already know which shell command to type:

1. **"Why did it decide that?"** — every resolved slot, every applied facet, every LAW check pass *or
   fail*, the pinned `brainVersion`, the seed, the provider, and each capability marked
   `verified` / `claimed` / `false`.
2. **"What if I change my mind?"** — the free Gate-0 directions, a slot editor that never mutates
   Sean's own words, the real tuning knobs, and one keystroke to record the highest-value signal the
   system produces (`rejected_all`).

**The honest constraint that shapes everything below:** Astra is not a way to reach into the brain and
rewrite it. The corpus is explicit that taste has exactly one writer, canon has a proposal channel,
the LAW filter is never skippable, and spec mode is `enabled:false`. Astra therefore splits "change
how it thinks" into **three legal dials (instant, reversible, logged)** and **one proposal channel
(slow, routed to Sean)**. That split is the central design decision — see `02-BLUEPRINT.md` §4.

---

## 2. Verified baseline — what actually exists (A0 partially done)

Measured on this worktree at `e29508664`; the A1 rows re-measured at `40d32c7ad`. Not quoted from the contract.

| Thing | Status | Evidence |
|---|---|---|
| Prompt compiler | **EXISTS** — 287 lines (was 274; +re-exports in A1) | `shared/swanPromptCompiler.mjs` |
| `BRAIN_VERSION` | **`'0.2.0'`** | `shared/swanPromptCompiler.mjs:39` |
| `personify()` — slot 4's only legal form | **EXISTS** | `shared/swanPromptCompiler.mjs:53` |
| `resolveSlots(brief)` — the SlotMap | **EXISTS** | `shared/swanPromptCompiler.mjs:97` |
| `compileImage(brief, caps)` | **EXISTS**, carries `lawChecks` | `:136`, `:267` |
| Per-provider serializers | **EXISTS** | `strategyFor, serializeFor, fitToBudget, SERIALIZERS` (`:30`) |
| `FACETS` | **EXISTS** | `:46` |
| LAW filter, fail-closed | **EXISTS** — throws `E_LAW_VIOLATION`, `E_CAPABILITY_UNVERIFIED` | `:134` |
| Forge CLI | **EXISTS** — 289 lines | `scripts/forge.mjs` |
| CLI `bracket` (n variants) / `pick --winner` / `refine` / `list` / `prune` / `review-answer` | **EXIST** | `scripts/forge.mjs:58-71` |
| Spend gate | **EXISTS** — `--confirm-spend` required for any generation | `scripts/forge.mjs:32,93` |
| Variant store with lineage, retention, winners-never-pruned | **EXISTS** | `scripts/forge.mjs:229-242` |
| **`directions()` — Gate 0, zero cost** | **✅ EXISTS (A1)** — 208 lines, pure | `shared/swanDirections.mjs` |
| **`explain()` / `ExplainView` — the "Why this?" view** | **✅ EXISTS (A1)** — 192 lines | `shared/swanExplain.mjs` |
| **Astra core + CLI** | **✅ EXISTS (A1)** | `scripts/astra/{core,cli.mjs,tests,fixtures,evidence}` |
| **The honest lane board** | **✅ EXISTS (A1/A5)** — every row code-verified | `scripts/astra/core/capabilities.mjs` |
| **MCP server for the design brain** | **✅ EXISTS (A2)** — 9 tools, 1 guarded write | `scripts/astra/mcp/{server,tools}.mjs` |
| **The World Engine catalogue + roulette** | **✅ EXISTS (A2)** — 18 worlds / 5 families, deterministic | `scripts/astra/core/{worlds,worldRoulette}.mjs` |
| **Bounded doctrine search** | **✅ EXISTS (A2)** — pattern reused, module not shared | `scripts/astra/core/doctrine.mjs` |
| **Console surface — the loopback server + the control registry** | **✅ EXISTS (A3/A4/A4b/A6)** — **27 controls (22 DIAL / 5 PROPOSAL, 22 rendered)**, measured at A6 via `verifyControls()`; token-gated mutations, loopback-only. **This count lives in FOUR files** (`00-PACKET.md`, `04-TESTS-TRACEABILITY.md` row 207, `05-SLICES-AND-REVIEW.md`, `A6-CORRECTIONS.md` `C55`) and has now been wrong **four times** — `A3-CORRECTIONS.md` `D18`, `A4-CORRECTIONS.md` `C28`, and row 207 from A4b until A6. Re-measure all four together, not one | `scripts/astra/surface/{controls,shell,panes,paneSlots,paneLedger,paneLedgerDrift,paneTune,slotView,routes,api,server,paneRoutes,smokeLedger}.mjs` |
| **The override editor (the third legal dial)** | **✅ EXISTS (A4b)** — 11 editable slot inputs + 1 locked row, `STAGE OVERRIDES` / `RESET`, session-only. `negative` is deliberately **not** offered, and the pane renders the same reason the API's `400` returns | `surface/paneSlots.mjs`, `core/overrides.mjs` |
| **The three panes: Compose · Choose · Think** | **✅ EXISTS (A3)** — all §2.6 states; `AC4.6`'s registry test passes | `scripts/astra/static/`, `surface/panes.mjs` |
| **Browser-measured accessibility** | **✅ EXISTS (A3)** — real Chromium over CDP, **zero new dependencies** | `scripts/astra/tests/helpers/cdp.mjs`, `a3-browser.test.mjs` |
| **The Tune pane** | **✅ EXISTS (A4)** — editable knobs, fixture preview, atomic commit with a required note, byte-exact revert | `surface/paneTune.mjs`, `core/{tuningStage,tuningPreview}.mjs`, `fixtures/pairs-12.jsonl` |
| `/law` + `/state` panes | **✅ EXISTS (A5)** — both render from the board, **both emit ZERO controls**, and both render their `READ_ONLY_PANES` reason verbatim | `surface/{paneLaw,paneState}.mjs`, `core/{capabilities,lawBoard}.mjs` |
| **The Law board — 6 laws, each with the site that ENFORCES it** | **✅ EXISTS (A5)** — 6 of 6 cited to a live `file:line` in `shared/swanLawFilter.mjs`, 0 inconclusive. The marker is the enforcement **expression**, not the law's name | `scripts/astra/core/lawBoard.mjs` |
| **`AC5.4` — no actor enables a REFUSED lane or spec mode** | **✅ EXISTS (A5)** — measured as an **empty `enabled` list over 60 attempts** (5 actors × 12 lanes), plus a scan asserting no route names an enable action | `scripts/astra/core/authority.mjs` |
| **The Ledger pane — `rejected_all`, the trend, and cost drift** | **✅ EXISTS (A6)** — three sections; ONE dial (`ledger.markRejectedAll`, the pane's only control, emitted only on a `pending` row); the trend readable by slot and by facet; the cost estimate a **marker-pinned MIRROR** of `unitCost()`'s rule, withheld with a named reason when the pin stops resolving. Refuses to draw when its ledger and its batch list disagree (`D51`) | `surface/{paneLedger,paneLedgerDrift}.mjs`, `core/{ledger,ledgerTrend}.mjs` |
| **The brief store — `AC3.1`'s persistence half** | **✅ EXISTS (A6)** — `.ai-workflow/astra/briefs.jsonl`, one brief per line, `text` byte-identical on read-back, IMMUTABLE (a second write with different text is refused, not applied). Deliberately **one level above** the prunable `.ai-workflow/forge-runs`, so `forge-prune`'s `assertInsideArtifactRoot()` cannot reach it | `scripts/astra/core/variants.mjs`, `core/paths.mjs` |
| **`T-P-02`/`T-P-03`/INV2 — the write-path scan** | **✅ EXISTS (A6)** — was *"not run"* since A4b. Two declared writers, each importing its destination from `paths.mjs`; no mutating call spells a literal destination; every path constant resolves outside the taste / docs / token trees. Covers the **path** half; the **value** half is named as owed | `scripts/astra/tests/a6-briefs.test.mjs` |
| **Module census** | **MEASURED at A6 (`C52`): 65 `.mjs` + 7 `.txt` + 4 `.css` + 4 `.json` + 4 `.png` + 3 `.js` + 1 `.jsonl` = 88 files** under `scripts/astra` (was 75 at A5) | `find scripts/astra -type f`, carried in `a6-tests.txt` §5b |
| Doctrine corpus | **EXISTS** — ~25 files, ~400 KB | `docs/ai-workflow/design-brain/` |
| Style taxonomy ("MidJourney Brain") | **EXISTS** | `design-brain/style-taxonomy.md` |
| World Engine (18 DNA recipes) | **EXISTS** (doctrine) | `design-brain/worlds.md` |
| Tuning knobs | **EXIST** | `scripts/design-brain/config/tuning.json` |
| Taste Brain (separate private repo) | **EXISTS, external** | `swan-taste-brain`, probe `127.0.0.1:7331/probe` |

### 2.1 Four gaps Astra exists to close

- **G1 — `directions()` was missing. ✅ CLOSED in A1.** The contract's Gate 0 returns 3 text directions
  at **zero cost**. Before A1 the only way to see options was `forge bracket … --confirm-spend`, which
  *generates and bills*. Now `shared/swanDirections.mjs` implements it, and `T-U-01` proves the
  zero-spend property twice over: a transport spy that fails the test if it fires, and a check that the
  module's **entire import list** is `./swanVocabulary.mjs` and nothing else.
- **G2 — `explain()` was missing. ✅ CLOSED in A1.** `lawChecks` were computed and attached to the
  result, and nothing rendered them. `shared/swanExplain.mjs` implements it; the CLI prints a full
  `ExplainView` for both a lawful compile and a blocked one.
- **G3 — no MCP server**, so no agent can ask the design brain anything without shelling out.
  **✅ CLOSED in A2.** `scripts/astra/mcp/` — 9 tools, exactly one of which writes, and that one
  refuses without `confirm: true`.
- **G4 — no surface**, so the loop (bracket → pick → refine → review-answer → prune) is a sequence of
  commands only its author remembers. **✅ CLOSED in A3**, and **extended in A4** — the Tune pane landed,
  so the operator can now see a knob change's effect before committing it. **Extended again in A5** — the
  Law and State boards are real panes, both read-only by design with the reason rendered on them. The
  remaining panes (Ledger, the proposal channel) are named gaps with declared controls, not silent
  omissions.
- **G5 — no Astra-scoped module smoke guard.** *(partially addressed in A4b, extended in A5)* `backend/tests/node-runner/moduleSmoke.test.mjs`
  covers `shared/` only, so a new `scripts/astra/core/*.mjs` is verified only by whichever test happens
  to import it. Astra is now **65 `.mjs` modules + 3 `.js` + 4 `.css` = 72 shipped files** (re-measured
  at A6, `C52`; A5 measured 54 `.mjs` at `C48`, A4b measured 44 — and the count has been wrong **every
  time** it was typed rather than measured, which is now three slices running. See `C52`).
  A4b's widened Rule 4 guard walks `scripts/astra` **whole** —
  including the shipped `.js`/`.css` assets — and asserts it reaches every subtree, so a new module
  cannot be silently excluded from the *budget* check. It still says nothing about whether a module
  **loads and runs**, so the guard is not closed; the original deferral (write it once, against the
  final module set, after A8) stands. **Renumbered from G3** — see `A3-CORRECTIONS.md` C24: `G3` was
  used for two unrelated gaps in two files.
- **G6 — no override editor, so `R3 / AC3.2` cannot be exercised. ✅ CLOSED in A4b.** `04` recorded
  `T-I-01` as **"not run"** and the test did not exist. The editor is now real — 11 editable slots and
  one locked one — and `T-I-01` passes in full. The registry's `UNWIRED_CONTROLS` list, which recorded
  the gap in code rather than in a note (`A4-CORRECTIONS.md` §6), is now **empty**. Closing this gap
  exposed a defect the gap had been hiding: `slotOverrides` was an unvalidated passthrough into the one
  layer `resolveSlots` applies LAST, so it could delete LAW 3's kill-list and still report all six
  checks green. See `A4b-CORRECTIONS.md` §2.

### 2.2 Two drift findings

- **D-A — version drift.** `forge-compiler-contract.md` is headed **v0.1.0**; the implementation reports
  **`BRAIN_VERSION = '0.2.0'`**. The contract's own §0.5 says *"`brainVersion` pinned by every consumer
  — CLI on v1 + backend on v2 = the drift this whole design exists to kill."* The doc has drifted from
  the code. **Astra displays `BRAIN_VERSION` read from the code, never a literal** — and `T-U-05` now
  enforces that by scanning Astra's own source for the literal, comments stripped.
- **D-B — the contract's `SlotMap` field names are unverified against the implementation. ✅ CLOSED in
  A0.** `resolveSlots()`'s accepted key set was read at `compiler:97-130`; the packet's 12 slot names
  were **correct**. See `A0-SEAM-AUDIT.md` §1.

---

## 3. Applicability matrix (Mega Blueprints §1–10)

Every required part is accounted for. "N/A" entries carry a reason.

| # | Required part | Where | Status |
|---|---|---|---|
| 1 | Requirements | `01-REQUIREMENTS.md` | Complete |
| 2 | Blueprint | `02-BLUEPRINT.md` | Complete |
| 3 | Wireframes | `03-INTERFACE.md` §2 | Complete — ASCII, desktop-first + narrow, all states |
| 4 | Flowchart + Mermaid | `03-INTERFACE.md` §3 | Complete — valid Mermaid source |
| 5 | Contracts + conditional diagrams | `03-INTERFACE.md` §4–§6 | Complete — types, API, state, sequence, ERD, permissions matrix |
| 6 | Test plan + executable tests | `04-TESTS-TRACEABILITY.md` §1–§2 | Complete — req-linked test IDs |
| 7 | Traceability | `04-TESTS-TRACEABILITY.md` §3 | Complete |
| 8 | Implementation + operations | `05-SLICES-AND-REVIEW.md` §1–§3 | Complete — 9 ordered slices |
| 9 | Hostile review + decisions | `05-SLICES-AND-REVIEW.md` §4–§5 | Complete — 8 findings, 5 resolved in-plan |
| 10 | Readiness receipt | `00-PACKET.md` §5 | Complete — **honest: not ready to claim readiness** |

**Rendered Mermaid preview:** not available in this environment — the Mermaid in `03` is **source only,
unrendered**. Disclosed per Mega Blueprints §4 rather than silently skipped.

---

## 4. How to use this packet while coding

1. Read `01` (what and why), then `02` (how), then `03` (exact shapes).
2. Pick the lowest-numbered slice in `05` §1 that is not yet done. Each slice names its **entry
   evidence** and **exit evidence** — do not start a slice whose entry evidence is unmet.
3. **Before writing A1 code, do slice A0.** It is a reading task with a written output, and it exists
   because §2.2 D-B is an unverified interface. Coding against a guessed interface is the failure this
   packet is meant to prevent.
4. `04` §3 is the traceability matrix. If you add a requirement, add its row, its AC, its test ID and
   its slice in the same pass — that is the rule that stops a packet rotting.
5. Anything marked **PROPOSAL-ONLY** in `02` §4 is not a build target. Do not implement it as a dial.

---

## 5. Readiness receipt

**Verdict: NOT READY — and saying so is the point.** This packet is complete as a *plan* and
incomplete as a *readiness claim*, because two of its own inputs are unverified.

| Item | State |
|---|---|
| Canonical artifact | this directory, `docs/ai-workflow/blueprints/astra-design-brain-console-20260925/` |
| Preservation proof | new directory; nothing overwritten. Verified: `mkdir -p` on a path that did not exist |
| Baseline verified | §2 — every row is a file that was read or grepped in this pass |
| **Blocking gap 1** | **D-B** — `resolveSlots()`'s accepted key set is unread. Slice **A0** closes it |
| **Blocking gap 2** | **D-A** — contract v0.1.0 vs code `0.2.0`. Astra reads the code, so it is not blocked *by* this, but the contract should be corrected |
| Test commands run | **none** — no code written yet. This packet makes no claim that any test passes |
| Unresolved decisions | 4 — `05` §5. All four are Sean's or the design-brain owner's, none block A0 |
| Coverage gaps | the taste loop (`swan-taste-brain`) is an external private repo and is **out of scope**; Astra reads its `/api/profile` at most |
| Next authorized slice | **A0 — Seam audit.** Read-only. No code, no spend, no writes outside the packet directory |

**A passing structural check is not a certification.** This packet has no `check-readiness.mjs` run
against it, and even a green one would only mean the *document* is well-formed — it would say nothing
about whether Astra works, because Astra does not exist yet.
