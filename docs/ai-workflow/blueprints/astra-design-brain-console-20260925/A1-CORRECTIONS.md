# Astra — A1 Corrections and Landing Record

- **Date:** 2026-09-26 · **Author:** sable (WorkBuddy AI) · **Slice:** A1 (`05-SLICES-AND-REVIEW.md` §1)
- **Supersedes, for the sections it names:** `03-INTERFACE.md` §4.1/§4.3, `04-TESTS-TRACEABILITY.md`
  T-U-05/T-U-07 and the A1 traceability rows, and `A0-SEAM-AUDIT.md` §6.
- **Read this before coding A2 onward.** The packet's own instruction is that a stale interface is the
  failure the packet exists to prevent; this file is where the interface stopped being stale.

---

## 1. What A1 actually built

| Artifact | Lines | What it is |
|---|---|---|
| `shared/swanDirections.mjs` | 208 | Gate 0 — `directions(brief, n, opts)`. PURE: no I/O, no network, no clock, no random. |
| `shared/swanExplain.mjs` | 192 | `explain(input, opts)` — the "Why this?" view, derived only from the compile record. |
| `shared/swanLawFilter.mjs` | 294 | **EDITED** — added the exported `LAW_NAMES`; `applyLaws` now uses it (see D1). |
| `shared/swanPromptCompiler.mjs` | 287 | **EDITED** — re-exports `directions` and `explain`. |
| `scripts/astra/core/paths.mjs` | 65 | Every path Astra touches, in one place. |
| `scripts/astra/core/bind.mjs` | 78 | The loopback refusal — `E_NOT_LOOPBACK`. |
| `scripts/astra/core/tuning.mjs` | 146 | The knobs, READ-ONLY, plus the blast radius per family. |
| `scripts/astra/core/brain.mjs` | 79 | Astra's ONE import path to the brain. |
| `scripts/astra/core/capabilities.mjs` | 229 | The honest lane board — every row verified against live code. |
| `scripts/astra/cli.mjs` | 185 | `version · directions · explain · law · state · bind`. |
| `scripts/astra/tests/a1-core.test.mjs` | 287 | T-U-01, T-U-04, T-U-05, T-U-06, T-U-10. |
| `scripts/astra/tests/a5-capabilities.test.mjs` | 156 | T-U-07, T-U-08. |
| `scripts/astra/fixtures/*.json` | 4 files | brief-hero, caps-verified, caps-claimed, law-violation. |
| `scripts/astra/evidence/a1-tests.txt` | 183 | The captured exit evidence. |

**Rule 4 budget (`T-F-04`), measured:** the largest module touched is `swanLawFilter.mjs` at **294 / 300**.
No module exceeds the cap; four sit above 280, so the next edit to any of them should expect to split.

**Measured:** `node --test scripts/astra/tests/*.test.mjs` → **30 pass / 0 fail**. The six pre-existing
compiler/law/forge suites → **79 pass / 0 fail**. No regression.

---

## 2. Corrections to the packet

Each row is *packet said* → *code says* → *action taken*. C1–C5 come from A0 and are applied here;
C6–C11 are new, found by writing A1.

| # | Packet said | Code says | Action |
|---|---|---|---|
| **C1** | `ExplainView.lawChecks: {law, passed, detail?}[]` | `checks` is `{law, passed}` only — **no detail**; `detail` lives on `violations` = `{law, slot, detail}` | `explain()` **merges both sources**. `passed: null` = NOT OBSERVED. Shape kept as the packet wanted; sourcing corrected. |
| **C2** | `E_IMAGE_FIRST_REQUIRED` is an Astra error | **`compileVideo` was REMOVED** (`compiler:271-275`) — that guard belongs to the video lane's tree | **Deleted** from the error contract (§4.3 of `03`). |
| **C3** | `E_PROVIDER_UNCONFIGURED`, `E_BRAIN_VERSION_MISMATCH` listed | neither is thrown by this compiler | Error table replaced with the codes that exist: `E_LAW_VIOLATION`, `E_CAPABILITY_UNVERIFIED`, `E_CAPABILITY_UNAVAILABLE`, `E_EMPTY_PROMPT`, `E_SPEC_MODE_DISABLED`, `E_LEGACY_MODE_REFUSED`, plus the two A1 adds `E_NOT_LOOPBACK`, `E_BAD_PORT`. |
| **C4** | `ExplainView` had no `aspect`, `aspectDivergence`, `truncated`, `droppedSegments`, `promptStyle` | all five are on the compile result | **Added.** `truncated` in particular is a silent quality loss and the CLI now prints it loudly. |
| **C5** | `U1` unresolved — `directions()` "in the compiler" | the compiler is at **287/300** lines; the house rule is *split at the cap, import, re-export* | **RESOLVED** — sibling modules, re-exported. See C8. |
| **C6** | A0 §6: `synthesize`, `log-receipt`, `reference-modes` = **REFUSED** | all three **IMPORT and RUN**. `synthesize.mjs:118` prints `REFUSED <receiptId>` for a *receipt* that failed validation — a per-receipt report line, not a lane refusal | **Reclassified to ACTIVE.** Measured board below. `log-spec` also upgraded from prose-sourced to code-sourced (`E_SPEC_PERSISTENCE_DISABLED` at `:2`). |
| **C7** | `LaneState.status: 'ACTIVE'\|'REFUSED'\|'RETIRED'` | spec mode is a fourth thing, and a row whose source cannot be found must not assert a status | **Added `DISABLED` and `INCONCLUSIVE`.** `INCONCLUSIVE` is what makes INV8 enforceable rather than aspirational. |
| **C8** | `core/directions.mjs`, `core/explain.mjs` | the primitives live in `shared/`, beside the compiler, because the CLI and the MCP must import ONE brain | **`core/brain.mjs` is the single import path**; there is no `core/directions.mjs`. Traceability rows R1/R2 corrected. |
| **C9** | `E_NOT_LOOPBACK` — "bind address was not `127.0.0.1`" | implemented, and **`localhost` is refused too** | Documented in `bind.mjs`. `localhost` is a NAME resolved through the hosts file; a hosts entry can point it at a LAN address. Only literal `127.0.0.1` and `::1` are accepted. |
| **C10** | T-U-07 expected `synthesize`/`corroborate`/`adjudicate`/`emit-vault`/`log-receipt` = REFUSED | see C6 | The **test asserts the measurement**, not the guess. A test that asserted the packet would have locked a wrong board in place with a green tick. |
| **C11** | T-U-05: "mutate `BRAIN_VERSION` export, re-read the UI string" | **ESM exports cannot be mutated from outside** — the test as written cannot execute | Replaced with a stronger, executable form: (a) `readBrainVersion()` equals the live export, and (b) **no version literal exists anywhere in Astra's source**, comments stripped. Proves the value can only have come from the code. |

---

## 3. The corrected lane board (measured, not read)

`node scripts/astra/cli.mjs state` → **exit 0**, `RETIRED=3  REFUSED=3  ACTIVE=5  DISABLED=1`.

| Lane | Status | Source (live-resolved) | Guard |
|---|---|---|---|
| `attest` | RETIRED | `design-brain/src/attest.mjs:2` | `E_INSPECT_RETIRED` — throws on import |
| `redact-provenance` | RETIRED | `design-brain/src/redact-provenance.mjs:2` | `E_INSPECT_RETIRED` — throws on import |
| `log-spec` | RETIRED | `design-brain/src/log-spec.mjs:2` | `E_SPEC_PERSISTENCE_DISABLED` — throws on import |
| `corroborate` | REFUSED | `design-brain/src/corroborate.mjs:163` | `E_CORROBORATION_DISABLED` — **unconditional** |
| `adjudicate` | REFUSED | `design-brain/src/adjudicate.mjs:68` | needs signed adjudication authority (conditional guard) |
| `emit-vault` | REFUSED | `design-brain/src/emit-vault.mjs:14` | needs signed receipt provenance (conditional guard) |
| `synthesize` | **ACTIVE** | `design-brain/src/synthesize.mjs:42` | none — writes `claims-proposed.jsonl` |
| `log-receipt` | **ACTIVE** | `design-brain/src/log-receipt.mjs:56` | none — appends a VALID receipt |
| `reference-modes` | **ACTIVE** | `design-brain/src/reference-modes.mjs:13` | none — legacy modes refused *within* the lane |
| `packet` | ACTIVE | `design-brain/src/packet.mjs:61` | none |
| `novelty` | ACTIVE | `design-brain/src/novelty.mjs:89` | none |
| `spec-mode` | DISABLED | `design-brain/src/spec-contract.mjs:65` | `config/spec-mode.json` `enabled:false` |

**The classification rule, so it can be argued with:** ACTIVE = completes its primary durable action
in the shipped config · REFUSED = a code guard stops it and the guard's condition is unmet · RETIRED =
throws on import · DISABLED = a mode, not a lane.

**Why every row carries a `source`:** `capabilities()` does not assert the table, it **checks** it. Each
row names a `marker` string that must exist in the lane's own file; the module reads the file, finds
the marker, and reports the live line number. A row whose marker is gone comes back **INCONCLUSIVE**,
never ACTIVE. This is INV8 implemented as a check that RUNS.

---

## 4. Defects found and fixed during A1

All five are recorded because each is a recurring class in this repo, not a one-off slip.

| # | Defect | Class |
|---|---|---|
| **D1** | `swanLawFilter.mjs` kept a **second hand-written copy** of the law list inside `applyLaws`, while `LAW_NAMES` — added by the same edit — was supposed to be the single definition. A law added later would be enforced by the loops and **omitted from `checks`**, and the explainer's table would have shown five rows and looked complete. | Drift between two definitions of one fact. Fixed: `applyLaws` uses `LAW_NAMES`. The `LAW_NAMES` comment warns about this exact failure — written by the edit that committed it. |
| **D2** | CLI fixture resolver used `isAbsolute(p) \|\| existsSync(p)`. `join()` returns an **absolute** path, so the predicate was TRUE for every candidate and the first joined one won unconditionally. **The selector could not select.** | A guard that admits the opposite. Fixed to existence-only. |
| **D3** | The capability board's `spec-mode` row resolved to a non-existent `spec-mode.mjs` (the real file is `spec-contract.mjs`) and came back INCONCLUSIVE. | **The mechanism caught its own author's table.** Fixed with a separate `file` field. If the board had asserted the status, the wrong source would have shipped. |
| **D4** | Two of my own tests matched inside **comments**: the purity check flagged `swanDirections.mjs:118` (a comment asserting purity, `"no Math.random"`), and the version check flagged its own author's trailing `// e.g. '0.2.0'`. | The exact class round 32 found in a coverage sweep that counted a module as tested because its name appeared in a comment. Fixed: comments stripped before matching. |
| **D5** | `spawnSync` on Windows failed with **EBUSY** and presented as `stdout: undefined`, which reads as a missing-output bug rather than a spawn failure. | Environment trap. Fixed: `stdio: ['ignore','pipe','pipe']` — a piped-but-unwritten stdin is the trigger. |

---

## 5. What is explicitly NOT done

- **A2–A8 are not started.** No MCP server, no HTTP surface, no Tune commit path, no Ledger, no Tauri.
- **`directions()` gets no evidence injection.** The taste probe is not called, so with no injection
  every direction is `prior`. **That is the honest cold-start state**, not a placeholder: fabricating
  `evidence` would be a lie about Sean's own picks.
- **`tuning.mjs` has no write path.** Staging, preview, atomic commit and revert are A4. This is
  load-bearing rather than merely unfinished — `T-M-01` (corrupt config → named error, **no write**) is
  only provable while there is no write path to accidentally reach.
- **No test has been run against a real provider, and none should be.** `T-U-01`'s zero-spend claim is
  proven by a transport spy and by the module's import list; provider capability promotion is out of
  scope by design.
- **The Mermaid diagrams in `03` §3 remain source-only and unrendered** in this environment.

---

## 6. Exit evidence

`scripts/astra/evidence/a1-tests.txt` — 183 lines: the 30 test results, `explain` on the happy path
(12 slots, 6 LAW checks all PASS, version `0.2.0` read from code), `explain` on the blocked path
(1 FAIL with its slot and detail, **5 × NOT OBSERVED** and zero PASS), the `E_NOT_LOOPBACK` refusal,
and the board.

**A2 is unblocked** (entry: A1 exit met). **A5's entry is also met** — its board is already built and
its rows are code-sourced.
