# Astra — A3 Landing Record: Surface v1 (Compose · Choose · Think)

- **Date:** 2026-09-26 · **Author:** sable (WorkBuddy AI) · **Slice:** A3 (`05-SLICES-AND-REVIEW.md` §1)
- **Base:** `4eb34f3ad` (A2). **Supersedes, for the sections it names:** `04-TESTS-TRACEABILITY.md`
  rows R2/AC2.2, R4/AC4.6, R8/AC8.2 and the A3 test rows, plus `05` §1's A3 entry.
- **Read this before coding A4.** Astra now has a face, and the way it avoids becoming a fourth brain
  is that every control is declared once, in one registry, with a label the operator can read.

---

## 1. What A3 actually built

| Artifact | Lines | What it is |
|---|---|---|
| `scripts/astra/surface/controls.mjs` | 211 | **NEW** — the control registry. `AC4.6`'s single source. |
| `scripts/astra/surface/shell.mjs` | 159 | **NEW** — layout, the DIAL/PROPOSAL badge, all §2.6 states. |
| `scripts/astra/surface/panes.mjs` | 289 | **NEW** — Compose, Choose and Think, rendered from plain data. |
| `scripts/astra/surface/api.mjs` | 151 | **NEW** — the JSON routes. `preview` is a named 501. |
| `scripts/astra/surface/server.mjs` | 268 | **NEW** — the loopback HTTP server, token gate, static serving. |
| `scripts/astra/static/astra.css` | ~9.5 KB | **NEW** — no `overflow-x: hidden`, by design (see §3). |
| `scripts/astra/static/astra.js` | ~5.7 KB | **NEW** — delegates clicks; never intercepts Tab. |
| `scripts/astra/tests/helpers/cdp.mjs` | — | **NEW** — CDP driver. Zero new dependencies. |
| `scripts/astra/tests/a3-browser.test.mjs` | 232 | **NEW** — T-A-01/02/03/05/06 as real browser measurements. |
| `scripts/astra/tests/a3-surface.test.mjs` | 273 | **NEW** — T-P-01 (AC4.6), T-I-10, T-M-03, §2.6, AC2.1. |
| `scripts/astra/tests/a3-choose.test.mjs` | 199 | **NEW** — T-U-02, T-U-03, T-I-07, T-A-04. Four tests §3 assigned to A3 and A3 had not built (C25). |
| `scripts/astra/surface/smoke.mjs` | 290 | **NEW** — the 26-check route proof the packet named and no slice had built (C26). Mutation-tested. |
| `scripts/astra/evidence/a3-tests.txt` | — | The captured exit evidence + 4 screenshots. |

**Rule 4 budget (`T-F-04`), measured:** **0 of 28 modules over 300.** Largest is `smoke.mjs` at **290**,
then `panes.mjs` at **289**. Single-digit headroom on both, and **A4 will not fit** — see §5.

**Measured:** `node --test scripts/astra/tests/*.test.mjs` → **79 pass / 0 fail** (was 51).
`79 = A1 18 + A5 12 + A2 21 + A3 28`. No regression.

---

## 2. The design decision the whole slice turns on: the dial / proposal split

Three legal dials are applied **instantly** — tuning knobs, `slotOverrides`, and the brief fields
(`seed`/`aspect`/`intent`/`surfaceClass`). One channel is routed to Sean and **never applied**:
tokens, canon, LAW, spec mode, taste. `AC4.6` requires every control to be labelled, and the label is
not decoration — it is the only thing standing between "the operator turned a knob" and "the operator
silently changed canon".

Measured registry state:

```
verifyControls(): { ok: true, total: 23, dials: 18, proposals: 5, rendered: 14,
                    badKind: [], duplicates: [], missingFields: [],
                    writeWithoutToken: [], proposalThatWrites: [] }
```

**`proposalThatWrites` is EMPTY, and that is the definition of the channel.** A proposal that writes is
not a proposal; it is a dial wearing a proposal's label. The registry enforces that, rather than
trusting the label.

**Nine controls are declared and not yet rendered — and every one names its slice.** `0` are unplanned:

| Pane | Kind | Id | `plannedIn` |
|---|---|---|---|
| tune | dial | `tuning.knob` | A4 |
| tune | dial | `tuning.stage` | A4 |
| tune | dial | `tuning.commit` | A4 |
| tune | dial | `tuning.revert` | A4 |
| proposal | proposal | `proposal.newToken` | A7 |
| proposal | proposal | `proposal.canonChange` | A7 |
| proposal | proposal | `proposal.lawChange` | A7 |
| proposal | proposal | `proposal.specModeActivation` | A7 |
| proposal | proposal | `proposal.tasteChange` | A7 |

This is the difference between a gap and a hole. A rail that omits the Tune button tells the operator
nothing; a rail that shows it, disabled, with "not built until A4" on it, tells them the truth.

**The declaration was measured against the enforcement.** The one control that writes,
`think.markRejectedAll`, is declared `writes: true, token: true`. The client calls `api('reject', …)`,
and `reject` **is** in the server's `MUTATION_ROUTES`, so the token gate at `server.mjs:146` runs
*before* the handler. A registry that declares a token while the server treats the route as
non-mutating would be a silent CSRF hole; these two were checked against each other, not assumed.

---

## 3. Why the accessibility tests are measurements, not proxies

Playwright is **not resolvable** and there is **no `node_modules`** — but a real Chromium is cached, and
Node 22 has a global `WebSocket`, so the suite drives a real browser over CDP with **zero new
dependencies**. `--no-sandbox` is required or the page target crashes.

Two decisions make the results worth trusting:

1. **T-A-01 includes a deliberate-overflow probe.** The test injects a wide element and confirms the
   detector *can* report overflow. Without that probe, a green result would only prove the detector was
   broken — the same defect class as `T-M-03` below.
2. **The stylesheet contains no `overflow-x: hidden`.** A clip would make the measurement physically
   unable to fail. The layout is fixed at the cause (`min-width: 0` on flex/grid children,
   `min(260px, 100%)` grid floors, `overflow-wrap: anywhere`) rather than by hiding the symptom.

Screenshots written by the run, verified as real PNGs at the requested widths:

```
a3-compose-360.png   | PNG | 360x900  |  40899 bytes
a3-compose-768.png   | PNG | 768x900  |  66767 bytes
a3-compose-1440.png  | PNG | 1440x900 |  80703 bytes
a3-think-1440.png    | PNG | 1440x900 | 115874 bytes
```

---

## 4. Corrections to the packet

| # | Packet said | Code says | Action |
|---|---|---|---|
| **C18** | `04` R4: `AC4.6` → test **`T-P-01`**, slice A3. `04` R5: `AC5.4` → test **`T-P-01`**, slice A5. | `T-P-01` is **one id serving two different requirements** (`04` line 65 defines it as *"each actor against the authority matrix"*). Two rows pointing at one id, in two slices, means **neither slice owns the split** and each may assume the other ran it. | A3 lands the **registry half** (AC4.6) and now names its three tests `T-P-01 (AC4.6) …` so the row resolves. The **authority half (AC5.4) is explicitly NOT claimed by A3** and remains A5's. Recorded so A5 cannot inherit a false green. |
| **C19** | `03` §2.6 lists the required states as a set of **names** (loading / empty / partial / denied / failure / validation / retry). | A state that *can* be rendered without its reason is a state that eventually *will* be. | Each state is a **function that takes its reason as an argument** — there is no way to emit `statePartial` without saying what is missing. `statePartial` also requires `shown` and `total`, so "3 of 5 shown" is structural, not optional. |
| **C20** | `AC4.6`: every control is labelled `DIAL` or `PROPOSAL`. | The label is necessary and not sufficient — a control can carry the right word and do the wrong thing. | The registry additionally enforces what the label *means*: `proposalThatWrites` (a proposal must never write) and `writeWithoutToken` (a write must require the token). Both measured empty. |
| **C21** | The packet never says what to do about controls belonging to panes that are not built yet. | Silence here produces either a missing button or an unlabelled one. | **Declare it with `plannedIn`.** The registry is complete for the rail from the start; 9 controls are declared with `rendered: false` and a slice name, and `0` are unplanned. |
| **C22** | `04` R8: `AC8.2` (mutation token) → `T-I-10`, slice **A1**, "not run". | The token gate is a **surface** property; A1 could not have tested it because no server existed. | `T-I-10` landed in A3 and passes (401 on missing *and* wrong token; gate-before-handler; `SameSite=Strict`). Row moves to A3. |
| **C23** | `04` R2: `AC2.2` (Choose pane) → `T-U-02`, `T-A-02`, slice A3. | `T-A-02` is a **browser** test (badge + palette legible at 360px) and is covered here. `T-U-02` is a core test and is **not** A3's. | `T-A-02` marked PASS under A3. `T-U-02` left as its own row rather than being absorbed by association. |
| **C24** | `00-PACKET.md` §2.1 calls **`G3`** *"no MCP server"*. `05`'s A2 section calls **`G3`** *"no Astra-scoped module smoke guard"*. | Two unrelated gaps share one id, in two files. A future agent reading either one gets the wrong answer about the other — one is **closed** (A2 built the MCP server) and the other is **open**. | The smoke guard is renumbered **`G5`** in both files, and `00-PACKET.md` §2.1 now marks `G3` ✅ CLOSED in A2 and `G4` ✅ CLOSED in A3. |
| **C25** | `04` §3 assigns **`T-U-02`, `T-U-03`, `T-I-07` and `T-A-04`** to slice A3. | A3's **exit criterion** is only `T-A-01`/`T-A-03`/`T-A-05` + `AC4.6`, all of which passed — so the slice could be declared done while four of its own assigned tests did not exist. | **All four built** in `tests/a3-choose.test.mjs` (7 tests). Recording them as "not run" would have been the silent omission this packet keeps fixing. `T-A-04` is measured with the **repo's own** `contrastRatio`, not a second implementation. |
| **C26** | `04` §1.7 names `node scripts/astra/surface/smoke.mjs`, and A3's evidence line in `05` names **"the smoke output"**. | The file **did not exist**. A packet can name a command and an evidence artifact that no slice ever built, and nothing catches it — the same shape as C25, one level up: not a missing test, a missing *instrument*. | Built: **290 lines, 26 checks, exit 0**, with a **mutation test** proving the checks can fail (§5, D23–D26). |

---

## 5. Defects found and fixed during A3

| # | Defect | Class |
|---|---|---|
| **D15** | **`T-M-03` failed, and the renderer was wrong, not the test.** `renderThink` always emitted its count heading, so a partial record with an empty `lawChecks` printed the literal text **`0 run, 0 passed`**. | **A finding the data cannot support.** Zero passes and five unrun checks are different findings, and only one of them is a problem with the compile. Fixed in `panes.mjs`: *a count is a claim about completeness*, so it is only made when the record can support it. The heading now reads `counts withheld — this record is PARTIAL`. **The complete case still shows its real count**, so the fix distinguishes rather than blanket-suppresses. |
| **D16** | **A record that never reported `lawChecks` at all** (not `partial`, field simply absent) rendered an **empty `<tbody>`** — which renders as *nothing*, and reads as *"all clear"*. | Found **while fixing D15**, by probing four cases instead of the two the suite covered. Same class as D15: absence rendered as a verdict. Now the heading says `not reported in this record` and the table is replaced by a sentence saying that is **not** the same as every law passing. |
| **D17** | `AC4.6`'s test carried the id **`AC4.6`**, but the packet's id for that test is **`T-P-01`** — so the traceability row could not resolve to any test in the suite. | **An id that does not resolve is a row that cannot fail.** Renamed all three to `T-P-01 (AC4.6) …`. See C18 for the deeper half: the id covers two requirements in two slices. |
| **D18** | My working notes recorded the control inventory as **25 controls / 20 rendered**. The registry measures **23 / 14**. | **A remembered number reported as a measured one.** The notes were wrong and the code was right; the evidence file records the measured values. Same discipline as A2's D10: assert against the thing, not against your recollection of it. |
| **D19** | `panes.mjs` is at **289 lines** — 11 under Rule 4's cap, and the Tune pane (A4) will not fit in that. | Not yet a failure; recorded so **A4 starts by splitting** rather than by discovering the cap. The house pattern: split into a sibling module, import it for local use, **and re-export** — `export … from` alone creates no local binding. |
| **D20** | My first `T-I-07` grepped control ids for `/override|force|skip|bypass/` and **fired on `slots.stageOverrides`** — one of the three **LEGAL DIALS**, whose name contains the word. | **A scan reading a name as the thing it names** — A2's D11 class, third appearance across the engagement. Rewritten to assert the structural property: the Law and State panes render **zero** registry controls, and every control a blocked compile emits belongs to a pane that is not read-only. |
| **D21** | `a3-choose.test.mjs`'s first run failed with `ERR_MODULE_NOT_FOUND`: I wrote `../../../../shared/` from `scripts/astra/tests/`. | One level too many. The worktree root is **three** levels up (`tests` → `astra` → `scripts` → root), which `a1-core.test.mjs` already demonstrates. Fixed by matching the existing file rather than re-deriving the path. |
| **D22** | `T-A-04`'s first draft asserted on the **`effect`** field of `slots.stageOverrides` expecting `/slot/i`; the field reads `"one compile"`. | **Reading a field for something it does not hold.** In this registry `effect` means *what it affects* and `label` carries the human name. The assertion was wrong, not the data — the same shape as A2's D10 (`lane.state` vs `lane.status`). |
| **D23** | `smoke.mjs`'s first run **failed 5 of 24**, and the first failure was its own overflow scan matching the stylesheet's **comment** reading *"NO `overflow-x: hidden` ANYWHERE"*. | **The scan read a declaration as the thing declared** — the D11/D20 class, **fourth appearance in this engagement**. Fixed by stripping comments before scanning. A scan over prose will always find the words that describe the thing it forbids. |
| **D24** | The smoke runner's traversal check used **`fetch`**, which normalises `..` out of the path before the request is ever sent — so it tested the **URL parser**, not the server, and would have passed against a server that served the whole repo. | The existing `a3-surface` test already documents exactly this and uses a raw socket. The smoke runner now does too. **A check that cannot reach the code under test is not a weaker check — it is a check of something else.** |
| **D25** | The smoke runner's token sentinel used `undefined` to mean *"no token"*, but `undefined` was also the *"not specified"* value — so the check labelled **"NO token"** actually **sent a valid token** and passed a 200. | **The check reported the opposite of what it claimed.** A test that cannot express its own precondition will silently test its negation. Fixed with an explicit `'none'`. |
| **D26** | The smoke runner expected `lawChecks` at the **top level** of the compile response; they live on `view.lawChecks`. | Wrong expectation, not a code defect — and the response shape is correct, because it is the same shape `renderThink` reads. Corrected in the check. |

**The smoke runner was then mutation-tested, because a check that cannot fail is not a check.**
`MUTATION_ROUTES` was emptied in the shipped `server.mjs` (byte-exact backup taken first) and the
runner re-run: **24 passed, 2 failed, exit 1** — and the two failures were *exactly* the two
token-gate checks. The file was restored and verified **byte-identical** (`cmp` clean), returning to
26/26. Without this step, 26 green checks would only have proven the runner could print `ok`.

**Two properties are now proven rather than promised:**

1. **The registry and the markup agree in both directions.** Every control claiming `rendered: true`
   appears in the markup, **and** every `data-control` in the markup is registered. A one-directional
   check passes against either bug — a control declared and never built, or a control shipped with no
   DIAL/PROPOSAL label, which is the exact failure `AC4.6` exists to prevent.
2. **The overflow detector can fail.** T-A-01's deliberate-overflow probe proves the instrument works,
   which is what makes the five green widths mean something. This is the A2 lesson (D7: a filter that
   could not read its input was indistinguishable from one that rejected everything) applied to layout.

---

## 6. What is explicitly NOT done

- **The Tune pane is not built.** Its 4 controls are declared with `plannedIn: "A4"`, so the rail is
  complete and the gap is visible rather than absent.
- **The proposal channel is not built.** Its 5 controls are declared with `plannedIn: "A7"`, and every
  one is `writes: false`, so no code path can apply a proposal.
- **`/api/preview` returns `501 E_GENERATION_DISABLED`; the tuning routes return `501 E_NOT_BUILT`.**
  Named refusals — not silent 404s, not empty 200s. The app never fabricates generated media.
- **`AC5.4`'s half of `T-P-01` is not claimed here** (C18). A5 still owes it.
- **No Astra-scoped module smoke guard exists (named gap G3).** `moduleSmoke.test.mjs` covers `shared/`
  only. Astra is now **28 modules** and the repo's own orphaned-code lesson applies directly. Deferred
  until after A8, and named rather than silently skipped.

---

## 7. Exit evidence

`scripts/astra/evidence/a3-tests.txt` — the three directions from a real brief at **zero cost**
(`estimatedCents: 0`, `provider: none`, all three honestly `PRIOR`), `BRAIN_VERSION` traced to the
compiler's live export, the measured `AC4.6` registry (`23 / 18 dial / 5 proposal / 14 rendered`,
`0` unplanned), the registry-vs-server token cross-check, the CDP run (6/6) with four verified
screenshots, the `T-M-03` fix measured across four cases, the 79-test suite, the smoke run **and its mutation test**, and the Rule 4 budget
(`0 of 28 over 300`, max 290).

**A4 is unblocked** (entry: A3 exit met — three directions render at zero cost, `BRAIN_VERSION` from
code, `T-A-01`/`T-A-03`/`T-A-05` pass, `AC4.6`'s registry test passes).

**A4 starts by splitting `panes.mjs`** (D19), then: staged knobs, fixture preview, atomic commit with
note, byte-exact revert — `T-I-02`, `T-I-03`, `T-I-04`, `T-I-05`, `T-M-01`, `T-M-02`, `T-M-06`, `T-M-07`,
`T-U-09`.
