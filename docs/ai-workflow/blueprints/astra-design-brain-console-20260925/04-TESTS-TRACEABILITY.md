# Astra — Test Plan and Traceability

Test IDs are stable. Every test names the requirement it serves, its level, and its command.
**A1's tests have now RUN** — 30 pass / 0 fail, captured in `scripts/astra/evidence/a1-tests.txt`.
Everything from A2 onward is still the plan, not a result. Two rows below were **corrected** before
they ran: `T-U-05` and `T-U-07` were not executable as written — see `A1-CORRECTIONS.md` C11 and C10.

**STATUS AS OF A5 (2026-09-25).** A1–A5 have landed. **167 Astra tests / 37 smoke checks / 70 shared
tests, all green** — `scripts/astra/evidence/a5-tests.txt`. A5's corrections to this file are worth
reading before the R5 rows: `C42` (the R5 rows claimed PASS for the **core** and were silent about the
**surface**, while `/law` and `/state` still rendered "not built yet"), `C46` (`AC5.4` was written as a
UI fact — "no enabling control" — when the requirement is about the **operation**, and a button count
cannot refuse anything), `C44`/`C45` (`/law` had a route and no screen spec, and §4.1 had no
`LawRow`), and `C49` (`AC5.4`'s transport half could not see pane routes at all — it scanned an
exported list while the pane dispatch was an `if` chain with no list). See `A5-CORRECTIONS.md`.

---

## 1. Test plan

### 1.1 Unit / component

| ID | Serves | Test | Expected observable result | Forbidden side effect |
|---|---|---|---|---|
| `T-U-01` | R2/AC2.1 | `directions(fixtureBrief, 3)` | returns 3 `Direction`, each with all 6 required fields | **any provider transport invoked** — asserted by a spy that fails the test |
| `T-U-02` | R2/AC2.2 | render a `tier:'prior'` direction | the string `PRIOR` appears in the card's visible text | the word `EVIDENCE` on the same card |
| `T-U-03` | R2/AC2.3 | derive swatches from fixed facets twice | byte-identical swatch output | any network fetch for image bytes |
| `T-U-04` | R1/AC1.2 | `explain(fixtureCompile)` | `lawChecks.length` equals the compiler's, passes **and** fails both present | dropping a failing check |
| `T-U-05` | R1/AC1.3 | **CORRECTED (C11):** `readBrainVersion()` equals the live export, **and** no version literal exists in Astra's source (comments stripped) | both hold | a hardcoded version surviving the scan |
| `T-U-06` | R3/AC3.3 | set slot 4 via `personify()` | legal form produced | a raw `"[subject] by [artist]"` string passing |
| `T-U-07` | R5/AC5.1 | **CORRECTED (C10):** `capabilities()` — RETIRED = `attest`,`redact-provenance`,`log-spec`; REFUSED = `corroborate`,`adjudicate`,`emit-vault`; ACTIVE = `synthesize`,`log-receipt`,`reference-modes`,`packet`,`novelty`. **A5 (C42) adds the SURFACE half:** the `/state` pane renders every lane with its `file:line` and its gate, and `lawBoard()` does the same for the 6 laws | every row carries a live `file:line`, and a bogus marker degrades to INCONCLUSIVE — on the **board** and on the **pane** | any lane reported ACTIVE without a code source |
| `T-U-08` | R5/AC5.3 | capability declared `claimed` | rendered as not-verified, **and `claimed` never appears without its consequence** (A5 `D44`) | rendering `claimed` as if it were `verified` |
| `T-U-09` | R4/AC4.1 | mutate `tuning.json`, re-read | UI reflects the new value with no code change | a hardcoded default winning |
| `T-U-10` | R8/AC8.1 | `bind('0.0.0.0')` | refuses, non-zero exit | binding succeeds |
| `T-U-11` | R5/AC5.1 | **NEW (A5):** `lawBoard()` — the 6 laws from `LAW_NAMES`, each with an enforcement **marker** | every row resolves to a live `file:line` in `shared/swanLawFilter.mjs` that really contains its marker; a row whose marker is gone degrades to INCONCLUSIVE; the marker is the enforcement **expression**, not the law's name | a row reported ENFORCED with no enforcement site — a citation that merely *resolves* read as one that *means something* (`A5-CORRECTIONS.md` §5, mutation `M2`) |

### 1.2 Integration / contract

| ID | Serves | Test | Expected observable result | Forbidden side effect |
|---|---|---|---|---|
| `T-I-01` | R3/AC3.1, R3/AC3.2 | submit brief, stage overrides, re-read persisted `text` | byte-identical to what was typed; the override layer changes SLOTS only | in-place mutation of `text` |
| `T-I-02` | R4/AC4.2 | stage → preview → commit | three distinct states observed in order | a commit occurring before a preview |
| `T-I-03` | R4/AC4.3 | concurrent read during a commit | reader sees old **or** new bytes, never a partial file | a torn read |
| `T-I-04` | R4/AC4.4 | commit then revert | restored file hash == pre-commit hash | losing the prior bytes |
| `T-I-05` | R4/AC4.5 | change `auto.S` | blast radius names the auto-corroboration gate | a commit with an empty note |
| `T-I-06` | R6/AC6.2 | record with `estimatedCents ≠ actualCents` | drift visible | averaging the two into one number |
| `T-I-07` | R1 | compile a fixture that fails a LAW check | `E_LAW_VIOLATION` with the offending slot named | any silent strip; any override affordance |
| `T-I-08` | R7/AC7.1 | MCP `brain.reject` without `confirm` | refused | the write occurring |
| `T-I-09` | R7/AC7.3 | MCP `brain.capabilities` vs the surface's board | identical output from one source | two independently-derived boards |
| `T-I-10` | R8/AC8.2 | mutation without the token | 401 | the mutation applying |

### 1.3 End-to-end

| ID | Serves | Test | Expected observable result |
|---|---|---|---|
| `T-E-01` | R1,R2,R3 | brief → directions → choose → compile → explain | the Think pane shows 12 slots, every lawCheck, and the pinned version |
| `T-E-02` | R4 | tune → preview → commit → revert | knob restored to its original value |
| `T-E-03` | R6 | compile → reject-all in one action | the ledger's rejected count increments by exactly 1 |
| `T-E-04` | R5 | open `/state` with the taste brain down | every lane still correct; only the taste row degrades |

### 1.4 Responsive / accessibility

| ID | Serves | Test | Expected observable result |
|---|---|---|---|
| `T-A-01` | §2.5 | 360 / 560 / 768 / 1024 / 1440 px | no horizontal overflow at any width |
| `T-A-02` | §2.5 | narrow viewport | tier badge and palette line still visible |
| `T-A-03` | §2.6 | keyboard-only traversal | every control reachable, focus ring visible, no trap |
| `T-A-04` | §2.6 | contrast audit | text meets the repo's contrast rules (the `audit-contrast.mjs` instrument in `packages/swan-forge`) |
| `T-A-05` | §2.6 | `prefers-reduced-motion` | no motion beyond the gate |

### 1.5 Permissions, malformed data, races, interruption

| ID | Serves | Test | Expected observable result |
|---|---|---|---|
| `T-P-01` | §6.2 | **CORRECTED (A5, C46):** `auditEnable()` calls `attemptEnable()` once for **every actor against every target** and returns the attempts that switched something on. A3 claimed only the `AC4.6` registry half. | no actor enables a REFUSED lane or spec mode — measured as an **empty `enabled` list over 60 attempts** (5 actors × 12 lanes), not as the absence of a button |
| `T-P-02` | INV1 | scan Astra's write paths | **zero** writes to `taste/events/*.jsonl` or `taste/*.md` |
| `T-P-03` | INV2 | scan Astra's write paths | zero writes under `docs/ai-workflow/design-brain/` or to any token value |
| `T-M-01` | §2.6 | `tuning.json` truncated / invalid JSON | named error, no crash, no write |
| `T-M-02` | §2.6 | `tuning.json` containing an unknown key | key preserved on write, reported, not dropped |
| `T-M-03` | §2.6 | compile record missing `lawChecks` | rendered as partial with a banner, never as "0 checks passed" |
| `T-M-04` | §2.6 | duplicate `reject` for one compile | idempotent; count increments once |
| `T-M-05` | §2.6 | taste brain times out | tiers degrade to `prior` and the card says so |
| `T-M-06` | §2.6 | commit interrupted mid-write | file is old or new, never partial |
| `T-M-07` | §2.6 | CRLF vs LF in `tuning.json` | **byte-for-byte preservation of the untouched regions** — the representation-dependent-verifier class |

### 1.6 Performance budgets (measurable, with an owner)

| ID | Budget | Owner |
|---|---|---|
| `T-F-01` | `directions()` returns in < 300 ms with the taste brain up; < 1.5 s on timeout | builder |
| `T-F-02` | `/api/explain/:id` renders in < 200 ms | builder |
| `T-F-03` | tuning preview over 12 fixture pairs in < 2 s | builder |
| `T-F-04` | no Astra module exceeds the Rule 4 300-line budget without a declared exception | builder |

**`T-F-04` measured at A1:** largest touched module `shared/swanLawFilter.mjs` at **294 / 300**. Within
budget, but four modules sit above 280 — the next edit to any of them should expect to split.

**`T-F-04` measured at A4b — and the scope was the defect.** A4b turned this row from a remembered
number into a test (`a4b-budget.test.mjs`), and widening the scope is what found the problem: every
prior claim counted `.mjs` modules and said nothing about the two **shipped static assets** the browser
loads. `static/astra.js` was **320 lines** — over the cap, and out of scope the whole time. The scope is
now three trees (`.mjs`/`.js`/`.css` for `scripts/astra`, `.mjs` for `shared`, `.mjs` for the shared
compiler's own tests), with a **declared-exception list** asserted in both directions. Measured at A4b:
**0 offenders across all three scopes**, largest in-scope file `server.mjs` at **297**, and exactly one
declared exception (`variantRun.test.mjs`, pre-existing, owned by another workstream). See
`A4b-CORRECTIONS.md` C39.

### 1.7 Commands

```bash
# unit + integration — RUN at A4b: 138 pass / 0 fail  (A1: 30, A2: 51, A3: 79, A4: 113, A4b: 138)
node --test scripts/astra/tests/*.test.mjs

# the smoke runner — RUN at A4b: 34 passed, 0 failed  (A4: 29)
# it now also fails if a MUTATION_ROUTES entry has no check naming it (D39)
node scripts/astra/surface/smoke.mjs --port 0

# the A1 exit command — prints an ExplainView for both a lawful and a blocked compile
node scripts/astra/cli.mjs explain fixtures/brief-hero.json
node scripts/astra/cli.mjs explain fixtures/law-violation.json

# the loopback refusal — must exit non-zero
node scripts/astra/cli.mjs bind 0.0.0.0

# the honest board
node scripts/astra/cli.mjs state

# surface smoke — RUN at A4: 29 checks, 29 passed, exit 0. The file did not exist
# before A3 (A3-CORRECTIONS.md C26). Mutation-tested TWICE: emptying MUTATION_ROUTES in
# server.mjs turns it RED (2 failed, exit 1) on exactly the two token-gate checks (A3),
# and making GET /api/tuning ignore the session stage turns it RED on exactly the
# "carries the stage" check (A4 — see a4-tests.txt §5, mutations M1-M4).
node scripts/astra/surface/smoke.mjs --port 7411

# MCP tool listing (A2)
node scripts/astra/mcp/server.mjs --list-tools

# accessibility + contrast
# The swan-forge instrument audits its OWN theme packs. Astra's palette is audited
# with the same rule by importing its exported contrastRatio — T-A-04 in
# scripts/astra/tests/a3-choose.test.mjs. Worst measured text pair: 5.16:1 (fail on panel).
node packages/swan-forge/scripts/audit-contrast.mjs
```

---

## 2. Fixtures

| Fixture | Purpose | Notes |
|---|---|---|
| `fixtures/brief-hero.json` | a complete valid brief | the happy path |
| `fixtures/brief-video-no-init.json` | video compile without an init image | must raise `E_IMAGE_FIRST_REQUIRED` |
| `fixtures/caps-claimed.json` | `honorsNegativePrompt: 'claimed'` | must be treated as false |
| `fixtures/law-violation.json` | a brief that trips the kill-list | must raise `E_LAW_VIOLATION` with the slot |
| `fixtures/tuning-live.json` | a copy of the real `tuning.json` | never the live file |
| `fixtures/tuning-unknown-key.json` | an extra key | preserved on write |
| `fixtures/tuning-crlf.json` | CRLF line endings | byte-preservation check |
| `fixtures/pairs-12.jsonl` | 12 claim pairs for novelty preview | so preview is deterministic |

**Fixtures are isolated.** No test writes to `scripts/design-brain/config/tuning.json`, the variant
store, or the taste repo. Every write test uses a temp copy and asserts the original's hash is
unchanged.

---

## 3. Traceability

| Req | AC | Artifact / component | Test | Slice | Evidence / status |
|---|---|---|---|---|---|
| R1 | AC1.1 | `shared/swanExplain.mjs`, Think pane | `T-U-04`, `T-M-03`, `T-E-01` | A1, A3 | **T-U-04 PASS** (A1); **T-M-03 PASS** (A3 — and it FAILED first: a partial record rendered "0 checks passed"); T-E-01 not run |
| R1 | AC1.2 | `shared/swanExplain.mjs` | `T-U-04` | A1 | **PASS** |
| R1 | AC1.3 | `core/brain.mjs` version read | `T-U-05` | A1 | **PASS** |
| R2 | AC2.1 | `shared/swanDirections.mjs` | `T-U-01` | A1 | **PASS** |
| R2 | AC2.2 | Choose pane | `T-U-02`, `T-A-02` | A3 | **PASS** — T-A-02 as a real 360px browser measurement; T-U-02 asserts a `prior` card never contains the word `EVIDENCE` |
| R2 | AC2.3 | swatch derivation | `T-U-03` | A3 | **PASS** — byte-identical across renders; no data-URI / url() / http in the strip |
| R2 | AC2.4 | preview gate | `T-I-07` (no-override half) | A3 | **PASS (no-override half)** — the Law and State panes render ZERO registry controls, so no affordance can exist. The `E_LAW_VIOLATION` half is A1. |
| R3 | AC3.1 | brief text immutability | `T-I-01` | A1, **A4b**, A6 | **PASS for the SURFACE half (A4b); the PERSISTENCE half is A6.** `a4b-editor.test.mjs` — "AC3.1 staging an override never mutates the brief text". Staging is the ONE layer `resolveSlots` applies LAST, so it is the only thing that can overwrite a decided value; the test submits an awkward brief (quotes, `&`, angle brackets, a newline), stages an override, re-reads the pane, and asserts the text is byte-identical — then asserts the stage really landed, so the immutability claim cannot pass on a no-op. Mutation-proven: making `overrides-stage` write through to `state.brief.text` reddens exactly this test. **What this does NOT cover:** AC3.1's other half — *"persisted `text` byte-identical for a `briefId`"*, whose test target is `core/variants.mjs` — needs the brief store, which does not exist yet. **A6 owns that half.** Do not read this row as closing AC3.1. |
| R3 | AC3.2 | override layer | `T-I-01` | A1, A3, A4, **A4b** | **PASS (A4b) — CLOSED.** A4 recorded this as *"not run, and the test does not exist"*, and correctly diagnosed why: `slots.stageOverrides` rendered on Compose with no handler, because `renderSlots` drew the 12 slots as read-only cells. A4b built the editor (11 editable inputs + 1 locked row, `STAGE OVERRIDES` / `RESET`, session-only) and the tests now exist across `a4b-editor.test.mjs` (the pane), `a4b-overrides.test.mjs` (the boundary) and `a4b-surface.test.mjs`. `UNWIRED_CONTROLS` — the in-code record of the gap — is now **empty**. **Closing this gap exposed a defect the gap had hidden**: `slotOverrides` was an unvalidated passthrough into the last-applied layer, so `{"negative": ""}` deleted LAW 3's kill-list and the compile still reported all six lawChecks green. Fixed at two layers (`shared/swanLawFilter.mjs`'s LAW 3 second condition, and `core/overrides.mjs`'s fence). See `A4b-CORRECTIONS.md` §2, D36. |
| R3 | AC3.3 | `personify()` gate | `T-U-06` | A1 | **PASS** |
| R4 | AC4.1 | `core/tuning.mjs` | `T-U-09` | A4 | **PASS** — `tuningView()` reads the LIVE file (never a cached default), and the pane renders one editable `<input>` per knob, so it is an editor and not a display. The AC4.6 cross-check FAILED first: `tuning.knob` was declared `element: 'input'`, `rendered: true`, `repeated: 'per knob'` while the markup showed read-only text (`A4-CORRECTIONS.md` D30). |
| R4 | AC4.2 | stage/preview/commit | `T-I-02` | A4 | **PASS** — the three states are visually distinct (`state-live` / `state-staged`), and the fixture preview runs against a fixed 12-pair set so the operator sees the CONSEQUENCE (`auto-merges 1/12 → 8/12`) before committing the NUMBER. Staging writes nothing: the config hash is byte-identical after a stage. |
| R4 | AC4.3 | atomic write | `T-I-03`, `T-M-06` | A4 | **PASS** — temp file + `renameSync`; `crashAfterTemp` interrupts between the two steps and the old file survives. A commit with no note is refused (`E_NOTE_REQUIRED`). Measured end to end: commit changed **2 of 14 lines**, the other 12 byte-identical, `$comment` and CRLF intact. `T-I-03` (concurrent read during commit) remains **simulated** — see §3.2. |
| R4 | AC4.4 | revert | `T-I-04` | A4 | **PASS** — byte-exact, because it restores the stored bytes rather than re-deriving them. Measured: the original hash returns exactly. A second revert in a row is refused (`E_ALREADY_REVERTED`) rather than silently toggling the config back to the value the operator just rejected. |
| R4 | AC4.5 | blast radius | `T-I-05` | A4 | **PASS** — `auto.` and `weights.` are reported as `gate: true` and rendered as a ⚠ block, not a column. A4 shipped the pane with NO stylesheet rules for `.blast`, so the warning was indistinguishable from a table cell until D35 was fixed. |
| R4 | AC4.6 | control registry | `T-P-01` (**registry half**) | A3, A4 | **PASS** — **25 controls, 20 DIAL / 5 PROPOSAL**, `proposalThatWrites: []`, `writeWithoutToken: []`, and the markup agrees with the registry in BOTH directions. The sweep now visits **every pane that renders a control** and asserts its own route table is COMPLETE, so a new pane fails the test until its route is added (`A4-CORRECTIONS.md` C29). The wiring check fails a rendered control with no handler (`C33`) — it found `think.whyNot` (D34). |
| R5 | AC5.1 | `core/capabilities.mjs` **+ `core/lawBoard.mjs`** | `T-U-07`, `T-U-11` | A5 | **PASS** — and the SURFACE half is now real too (`C42`). `/state` renders all 12 lanes, each with its `file:line` and its gate; `/law` renders the 6 laws, each with the enforcement site that runs it. Measured: **6 of 6 laws cited, 12 of 12 lanes cited, 0 inconclusive.** Both panes emit **0 controls**. |
| R5 | AC5.2 | spec-mode read | `T-U-07` | A5 | **PASS** — `readSpecMode()` reports the CONFIG (`enabled: false`), the pane prints it with `no control to change it`, and the fail-open branch is **shown firing**: an unreadable config reports CLOSED (`D45`). |
| R5 | AC5.3 | claimed→false | `T-U-08` | A5 | **PASS** — and the pane half now asserts the vocabulary split, because the first draft was a **tautology** (`D44`). |
| R5 | AC5.4 | no actor enables a REFUSED lane or spec mode | `T-P-01` (**authority half**) | A5 | **PASS** — measured, not asserted: **60 attempts (5 actors × 12 targets), `enabled: []`**, with the codes accounting for the board exactly (15 RETIRED, 15 REFUSED, 25 ALREADY-ACTIVE, 5 MODE-GATED). The refusal is **uniform, including for Sean** — §6.2's strongest cell in either enabling column is `propose`, and `propose` is not enable. Plus the transport half: no mutation route names an enable action. `T-P-01` is ONE id serving two requirements in two slices; A3 claimed only the `AC4.6` half (`A3-CORRECTIONS.md` C18) and A5 did **not** re-claim it. |
| R6 | AC6.1 | `core/ledger.mjs` | `T-E-03` | A6 | not run |
| R6 | AC6.2 | cost drift | `T-I-06` | A6 | not run |
| R6 | AC6.3 | trend view | `T-E-03` | A6 | not run |
| R7 | AC7.1 | `mcp/tools.mjs` | `T-I-08` | A2 | **PASS** — refused, and the registry still shows `outcome: 'pending'` |
| R7 | AC7.2 | MCP surface audit | `T-P-02` | A2 | **PASS** — 21 forbidden names refused; no env read; no write path in `mcp/` |
| R7 | AC7.3 | one board, two consumers | `T-I-09` | A2 | **PASS** — `deepEqual` against the live `capabilities()` |
| R8 | AC8.1 | `core/bind.mjs` | `T-U-10` | A1 | **PASS** |
| R8 | AC8.2 | mutation token | `T-I-10` | **A3** | **PASS** — 401 on missing AND wrong token; the gate runs BEFORE the handler; cookie is `SameSite=Strict`. Moved from A1: A1 had no server to test it against. |
| R8 | AC8.3 | no secret in surface | `T-P-02` | A2 | **PASS** — no `process.env`, no dotenv import in Astra's shipped source |
| INV1 | — | write-path scan | `T-P-02` | A2 | **PASS** — one mutating call in `mcp/`, and it is `brain.reject`'s |
| INV2 | — | write-path scan | `T-P-03` | A1 | not run |
| INV3 | — | LAW gate | `T-I-07` | A1 | **not run** — A5 landed the *structural* half of `T-I-07` (both boards emit zero controls, asserted against the rendered function AND against the bytes the server sent), but INV3 is the LAW gate itself and still has no test. |
| INV4 | — | spend gate | `T-U-01`, `T-I-07` | A1, A3 | **T-U-01 PASS**; T-I-07's structural half PASS (A5); the spend gate's own test is still open |
| INV5 | — | version read | `T-U-05` | A1 | **PASS** |
| INV6 | — | immutability | `T-I-01` | A1, **A4b**, A6 | **PASS for the surface half (A4b)** — the brief text is asserted byte-identical across a stage, with the stage asserted to have happened. **The persisted-brief half (`core/variants.mjs`) is A6.** See the R3/AC3.1 row. |
| INV7 | — | fail-closed | `T-I-07` | A1 | **not run** — but A5 closes the fail-closed case for spec mode specifically (`D45`: an unreadable gate reports CLOSED, and the test shows it firing). |
| INV8 | — | no fake metrics | `T-U-07`, `T-U-11` | A5 | **PASS** — every lane **and** every law needs a source, and the degradation is proven to fire on both boards. The `AC5.4` sweep is the same rule applied to a verdict: the claim is a list produced by running, not a sentence. |
| INV9 | — | loopback | `T-U-10` | A1 | **PASS** |
| INV10 | — | lane isolation | `T-P-02`, `T-P-03` | A1 | not run |

### 3.1 Uncovered requirements

**None.** Every R and every INV has at least one test ID and at least one slice.

### 3.2 Boundaries covered only by mocks — flagged

- **`T-M-05`** (taste-brain timeout) is exercised with a stub, not the real private repo. The real
  integration is **unverified** and is named in `05` §4 as a residual.
- **`T-I-03`** (concurrent read during commit) is simulated. A true concurrent-writer test needs a
  second process; scheduled in A4 but **not yet designed**.
- **Provider capability probes** (`seedIsDeterministic: 'verified'`) are **not** tested by Astra —
  they require real generations and spend. Astra only *renders* the tri-state. The promotion path is
  out of scope.
- **One flaky failure in the Astra suite — observed once, not diagnosed.** Immediately after A5's
  mutation run, one full-suite run reported 163 pass / 1 fail. The test's name was not captured and
  **20 subsequent full-suite runs were clean**, as were 10 runs of the six filesystem-touching suites
  in isolation. It is not config corruption (`tuning.json` and `spec-mode.json` are byte-identical to
  `HEAD` after every run) and not the mutation driver leaving state behind (all six mutated files
  verified restored by hash). **Recorded, not diagnosed** — diagnosing it needs the failing test's
  name, which means a loop with a reporter that preserves it. `A5-CORRECTIONS.md` §7 is the full
  account. This is the one place in A5 where the evidence is weaker than the claim it supports.
- **The `gatedBy` strings on REFUSED lanes are prose.** `AC5.4` refuses the operation and cites the
  gate; nothing verifies that the named authority adapter is really absent. Named in
  `A5-CORRECTIONS.md` §6.
