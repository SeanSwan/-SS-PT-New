# Astra — Implementation Slices, Operations, Hostile Review

---

## 1. Ordered slices

Each slice names **entry evidence** (what must be true to start) and **exit evidence** (what proves it
is done). Do not start a slice whose entry evidence is unmet. Slices are small on purpose — each is one
sitting.

### A0 — Seam audit (read-only, no code) ← **✅ DONE 2026-09-25**
- **Does:** reads `shared/swanPromptCompiler.mjs`'s `resolveSlots()` key set; locates the variant store
  and its record shape; re-derives the REFUSED/RETIRED lane list from the `scripts/design-brain/src/*`
  refusal paths rather than from prose; confirms whether `directions`/`explain` exist anywhere.
- **Entry:** none.
- **Exit:** a written inventory with `file:line` for every Astra dependency, and **three open questions
  closed**: D-B (`resolveSlots` keys), the variant store path/shape, the refusal list's code source.
- **Evidence:** `A0-SEAM-AUDIT.md` — `D-B` **CLOSED** (the packet's 12 slot names were correct),
  5 packet corrections found. **Its §6 lane list is superseded by `A1-CORRECTIONS.md` §3**, which
  measured three of those rows and found them ACTIVE.
- **Spend:** zero. **Writes:** only inside the packet directory.
- **Why first:** `03-INTERFACE.md` §4.1 is written against the *contract*, and the contract is
  demonstrably stale (D-A). Coding A1 against an unverified interface is the failure this packet
  exists to prevent.

### A1 — Astra Core (adapter, no UI) ← **✅ DONE 2026-09-26**
- **Does:** `brain.mjs`, `directions`, `explain`, `tuning.mjs` (read-only), `bind.mjs`, `paths.mjs`.
  **Where the primitives landed:** `directions()` → `shared/swanDirections.mjs` and `explain()` →
  `shared/swanExplain.mjs`, both **re-exported from the compiler** — so there is no `core/directions.mjs`
  or `core/explain.mjs`, and `core/brain.mjs` is the one import path (see `A1-CORRECTIONS.md` C8).
- **Entry:** A0 exit met. ✅
- **Exit:** `node --test scripts/astra/tests/*.test.mjs` green — **30 pass / 0 fail**;
  `node scripts/astra/cli.mjs explain fixtures/brief-hero.json` prints an `ExplainView` (12 slots,
  6 LAW checks); `T-U-01` proves zero provider calls **twice** (transport spy + import-list scan);
  `T-U-10` proves the loopback refusal including the CLI's non-zero exit.
- **Evidence:** `scripts/astra/evidence/a1-tests.txt` (183 lines) + `A1-CORRECTIONS.md`.
- **Also landed:** the A5 board (`core/capabilities.mjs`), because A0 unblocked it and its rows are
  code-sourced — so **A5's entry is met too**.

### A2 — Astra MCP ← **✅ DONE 2026-09-26**
- **Does:** `mcp/server.mjs`, `mcp/tools.mjs`; read tools + one guarded write.
- **Entry:** A1 exit met. ✅
- **Exit:** `--list-tools` shows 9 tools ✅; `T-I-08` proves the unconfirmed write is refused ✅; `T-I-09`
  proves one board serves both consumers ✅.
- **Evidence:** `scripts/astra/evidence/a2-tests.txt` — the tool list, the refusal output, 51/51 green.
- **Also landed:** the World Engine reader + `world-roulette.v1` (`core/worlds.mjs`,
  `core/worldRoulette.mjs`) and the bounded doctrine search (`core/doctrine.mjs`), because three of the
  nine tools needed them and none existed.
- **Corrections:** `A2-CORRECTIONS.md` — 6 packet corrections (C12–C17) and **9 defects (D6–D14)**.
  Two are worth reading before A3: a CRLF catalogue made every anchored regex fail **silently**, and the
  `swan-brand` licence filter rejected **all 18 worlds** because it read the palette law at the wrong
  line offset. Both are "the instrument was wrong, not the thing it measured".
- **Named gap:** **G5** — there is no Astra-scoped module smoke guard. `moduleSmoke.test.mjs` covers
  `shared/` only, so a new `core/*.mjs` is verified only by whichever test imports it. Deliberately not
  built here; better written once after A8. *(Renumbered from `G3`, which `00-PACKET.md` §2.1 used for
  the missing MCP server — see `A3-CORRECTIONS.md` C24.)*

### A3 — Surface v1 (Compose · Choose · Think) ← **✅ DONE 2026-09-26**
- **Does:** the loopback server, the control registry, three panes, all §2.6 states.
- **Entry:** A1 exit met. ✅
- **Exit:** three directions render from a real brief at **zero cost** ✅ (`estimatedCents: 0`,
  `provider: none`, all three honestly `PRIOR`); `BRAIN_VERSION` displays from code ✅; `T-A-01` ✅ /
  `T-A-03` ✅ / `T-A-05` ✅ pass **as real Chromium measurements over CDP**; `AC4.6`'s registry test ✅.
- **Also built, because §3 assigns them to A3:** `T-U-02`, `T-U-03`, `T-I-07` and `T-A-04` ✅ — the exit
  criterion above did not require them, so the slice could have been called done with four of its own
  assigned tests missing. See `A3-CORRECTIONS.md` C25. `T-A-04` is measured with the **repo's own**
  `contrastRatio` from `packages/swan-forge/scripts/audit-contrast.mjs`.
- **Measured:** `node --test scripts/astra/tests/*.test.mjs` → **79 pass / 0 fail** (was 51);
  Rule 4 → **0 of 28 modules over 300**, max `smoke.mjs` at **290**, then `panes.mjs` at **289**.
- **Evidence:** `scripts/astra/evidence/a3-tests.txt` + screenshots at 360/768/1440 + `A3-CORRECTIONS.md`.
- **The smoke output, which A3's evidence line requires:** `node scripts/astra/surface/smoke.mjs` → **26 checks, 26 passed, exit 0**. The file did not exist before this slice (C26). It was then **mutation-tested** — `MUTATION_ROUTES` emptied in `server.mjs` → **2 failed, exit 1**, exactly the two token-gate checks — then restored byte-identically.
- **Landed beyond the slice's own list:** the control registry enforces two constraints the packet
  implies but never states — a **PROPOSAL must never write** (`proposalThatWrites`, empty) and a **write
  must require the token** (`writeWithoutToken`, empty). The registry's declaration was then checked
  against the server's actual `MUTATION_ROUTES`, so the token claim is enforced, not merely asserted.
- **Defect worth reading before A4:** `T-M-03` failed, and **the renderer was wrong, not the test**. A
  partial compile record printed the literal **"0 run, 0 passed"** — a finding the data could not
  support. Fixed in `panes.mjs`: *a count is a claim about completeness*, so it is only made when the
  record can support it. Fixing it exposed a second case the suite never covered (a record with **no**
  `lawChecks` field rendered an empty table, which reads as "all clear"). See `A3-CORRECTIONS.md` D15/D16.
- **Carry into A4:** `panes.mjs` is at **289/300**. The Tune pane will not fit. Split it first — into a
  sibling module, imported for local use **and re-exported** (`export … from` alone creates no local binding).
- **Trap for A5:** `T-P-01` is **one id serving two requirements in two slices** (see C18). A3 claims
  only the **`AC4.6`** half and names its tests `T-P-01 (AC4.6) …`. **`AC5.4`'s half is still A5's.**

### A4 — Tune pane ← **✅ DONE 2026-09-26**
- **Does:** staged knobs, fixture preview, atomic commit with note, byte-exact revert.
- **Entry:** A3 exit met; `fixtures/pairs-12.jsonl` exists. ✅ (the fixture did **not** exist — A4 built it)
- **Exit:** `T-I-02`, `T-I-03`, `T-I-04`, `T-I-05`, `T-M-06`, `T-M-07` pass. ✅ **113/113 tests**, 29/29 smoke.
- **Evidence:** before/after `tuning.json` hashes — `scripts/astra/evidence/a4-tests.txt` §2.
  Measured against the REAL config through the REAL routes: **stage wrote nothing** (hash unchanged),
  **commit changed 2 of 14 lines** with the other 12 byte-identical and `$comment`/CRLF intact,
  **revert restored the original hash exactly**, and the `.prior.jsonl` runtime artifact was removed so
  the worktree was left as found.
- **Also proven:** putting the old values back reproduces the original file byte-for-byte — an
  INDEPENDENT undo, not a re-run of `applyPatch`. Four mutation tests, each deleted in turn and each
  going red on exactly its own check.
- **Corrections:** 9 (`C27`–`C35`), including the one that matters: **a refusal is also a claim.** A
  `ReferenceError` from a missing import was reported as a `400` under a real domain code — a perfect
  impression of the gate working. Every catch site now classifies, and an unrecognised throw is a `500
  E_ASTRA_INTERNAL`.
- **Defects:** 9 (`D27`–`D35`). **Four were found by writing a check, not by looking**: the knobs
  rendered as read-only text (`D30`), `DISCARD STAGE` was missing (`D31`), `think.whyNot` did nothing
  (`D34`), and the pane shipped with **no stylesheet rules at all** so the blast-radius warning that
  `T-I-05` requires was indistinguishable from a table cell (`D35`).
- **Carry into A5 — ALL THREE ANSWERED by A4b:**
  - **`server.mjs` is at exactly 300 lines.** → **Split in A4b** (`routes.mjs`, `slotView.mjs`); it is now **297**, and `smoke.mjs` is at **299**. Both still need care before A5 adds two panes' routes.
  - **`R3 / AC3.2 / T-I-01` is open and its test does not exist.** → **CLOSED in A4b.** The editor is real and the tests exist.
  - `T-P-01`'s `AC5.4` half is still A5's alone. → still true.

### A4b — the override editor, and the law it could delete ← **✅ DONE 2026-09-26**
- **Why it was carved out:** A4's handoff named `R3 / AC3.2 / T-I-01` as a requirement already marked
  **"not run"** whose test did not exist, and said it should land before A5's new work. It is not a new
  feature; it is a gap in a requirement this packet had already claimed.
- **Does:** the 12 SLOTS table as an EDITOR — 11 editable inputs and 1 deliberately locked row — with
  `STAGE OVERRIDES` / `RESET` collecting them into `brief.slotOverrides` (session-only, no file written).
  Plus the LAW 3 carry guard the editor exposed the need for, and the Rule 4 budget guard as a test.
- **Entry:** A4 exit met. ✅
- **Exit:** `T-I-01` (AC3.1 **and** AC3.2), `INV6`, and `T-F-04` pass. ✅ **138/138 tests**, 34/34 smoke,
  **0 Rule 4 offenders across three scopes** with 1 declared exception.
- **The defect it was hiding.** `slotOverrides` was an **unvalidated passthrough** from the HTTP body
  into the one layer `resolveSlots` applies **LAST** — so it could delete LAW 3's kill-list. Measured:
  `{"slotOverrides": {"negative": ""}}` returned a compile with `ok: true` and **all six lawChecks
  green**. Two guards now exist and both are asserted, because either alone would be a plausible-looking
  fix that misses the other's case: the law filter refuses a `negative` naming no family (a **net**), and
  `core/overrides.mjs` refuses the key outright (a **fence**).
- **Evidence:** `A4b-CORRECTIONS.md` §5 — seven mutations, each asserted to have **landed** before the
  run and each restored byte-exactly. Deleting the shared policy reddens **7 tests across both halves**;
  the split of `swanLawFilter.test.mjs` is proven lossless because the parent's hash is **identical to
  `HEAD:`**.
- **Corrections:** 6 (`C36`–`C41`), including the one that matters: **a PASS is also a claim.**
  `A4-CORRECTIONS.md` §2 established that a refusal is a claim; A4b is the next turn — the compile
  reported all six checks green over a deleted law, and the smoke suite's `29 checks` was a list length
  presented as a coverage claim (`overrides-stage` had no check at all).
- **Defects:** 5 (`D36`–`D40`). **Three of them were defects in the CHECKS themselves**, found by
  mutation-testing the checks: a **tautological** assertion in A4b's own new editor test (it read the
  expected reason from the same module it was testing, so replacing the reason with `"x"` left it
  green), a **loose discriminator** (`row.includes('negative')` matched slot 5, whose default value is
  *"single dominant gesture, generous negative space"*), and an **inner-only capture** (the row regex
  dropped the opening `<tr>`, so a class assertion failed against markup that carried the class).
- **Carry into A5:**
  - **Split `smoke.mjs` (299).** `server.mjs` is 297. Both are at the cap.
  - **`UNWIRED_CONTROLS` is now EMPTY** and `slots.override` is a new registry control, so A5 should
    **re-measure** the registry rather than trust A3's count. Measured at A4b: **26 controls,
    21 DIAL / 5 PROPOSAL, 21 rendered.**
  - **`T-P-01`'s `AC5.4` half is still A5's alone.**
  - **Rule 4's guard now has three scopes and a declared-exception list.** A new tree should be added
    to it in the same pass, or its green is silent about that tree.

### A5 — Law + State boards ← **◐ PARTIAL — the board is built; the UI panes are not**
- **Does:** the LAW rows from the compiler's own `lawChecks`; the honest lane board from A0's code-derived list.
- **Entry:** A0 exit met (the lane list must come from code). ✅
- **Exit:** `T-U-07`, `T-U-08` pass; `T-P-01` not run. Every row shows a reason traceable to a file — and
  the board **verifies** that rather than asserting it.
- **Evidence:** `scripts/astra/core/capabilities.mjs` + `scripts/astra/tests/a5-capabilities.test.mjs`.
  `node scripts/astra/cli.mjs state` → exit 0, `RETIRED=3 REFUSED=3 ACTIVE=5 DISABLED=1`.
- **Corrected input:** A0's lane list was **over-broad** — three lanes it called REFUSED were measured
  ACTIVE. The board is built from the measurement, and each correction is recorded on its own row.
- **Still to do:** the `/law` and `/state` panes — A3's surface now exists, so these are panes **inside**
  it, and the `READ_ONLY_PANES` registry entries for both already carry their reasons; and **`T-P-01`'s
  authority half (`AC5.4`)**: *no actor enables a REFUSED lane or spec mode*. The `AC4.6` registry half of
  `T-P-01` **landed in A3** and is **not A5's to re-claim** — see `A3-CORRECTIONS.md` C18.

### A6 — Ledger
- **Does:** one-action `rejected_all`; cost drift; trends by slot and facet.
- **Entry:** A1 exit met; the variant store is writable through the CLI's own path.
- **Exit:** `T-E-03` and `T-I-06` pass; a reject increments the count by exactly one.
- **Evidence:** the ledger before/after a reject.

### A7 — Proposal channel
- **Does:** drafts token/canon proposals to a file, with the paired `SWAN-CINEMATIC-DESIGN-SYSTEM.md` §B
  reference. **No apply path.**
- **Entry:** A3 exit met.
- **Exit:** a drafted proposal artifact lands where canon changes are filed, and `T-P-03` proves no
  canon file was written.
- **Evidence:** the artifact + the unchanged canon hash.

### A8 — Tauri shell (last)
- **Does:** wraps the proven surface; OS keychain for provider credentials.
- **Entry:** A3–A6 exit met and the surface stable for one full session.
- **Exit:** a window launches the same loopback app; no credential appears in the surface.
- **Evidence:** a launch log; a credential-absence scan.

---

## 2. Slice dependencies

```
A0 ─┬─> A1 ─┬─> A2
    │       ├─> A3 ─┬─> A4
    │       │       ├─> A7
    │       │       └─> A8
    │       └─> A6
    └─> A5
```

**A0 blocks A1 and A5.** Nothing else blocks anything. A2, A4, A5, A6, A7 are independent of each other
and can be done in any order once their entries are met.

---

## 3. Operations

**Rollout.** None — this is a local single-operator tool. There is no deploy, no staging, no migration,
and no schema change. The only persisted artifact Astra writes is `tuning.json`, and only through a
dial.

**Recovery / rollback.**

| Failure | Recovery |
|---|---|
| a bad tuning commit | revert restores prior bytes, hash-compared (`AC4.4`) |
| interrupted commit | temp file is discarded; the original is untouched (`T-M-06`) |
| a crashed surface | restart; Astra owns no state that can be lost |
| a corrupted `tuning.json` | the prior-values record is the recovery source; Astra reports the parse error rather than writing |

**Logs and metrics (all derived, none invented).**

- `directions()` calls and their latency
- compiles by outcome: `pending` / `accepted` / `refined` / `rejected_all`
- **`rejected_all` rate** — the contract calls this *"the highest-value tuning signal the system will
  ever produce and nothing else records it"*. Astra's job is to make it cheap to produce and visible.
- `estimatedCents` vs `actualCents` drift per provider
- preview spend, as a running total (the only billing path)
- LAW check failures by law and by slot — where taste is actually failing

**Owner.** Sean owns canon, spend, and the taste store. The builder agent owns the code. There is no
operational on-call: it is a local tool.

**Performance budgets.** `04` §1.6.

---

## 4. Hostile review of this plan

Written against the plan, before any code — which is when it is cheapest to act on.

### H1 — Astra is a second taste writer [HIGH — RESOLVED IN PLAN]
The request was to "alter how it thinks by choosing options". Choosing *is* what the taste probe does,
and the corpus says the probe page is **the only taste writer** and agents must never write taste.
**Resolution:** `INV1` + `T-P-02`. Astra's choices write to the **brief/direction record**, never to
`taste/events`. Taste changes route to the probe. **Residual:** a user may reasonably expect a choice in
Astra to teach the brain. It does not, and the Choose pane must say so rather than let them assume.
Added as copy, not code.

### H2 — Astra duplicates `scripts/swan-brain-console/` [MEDIUM — NAMED, NOT RESOLVED]
Two consoles, one shape. The verify console was hardened all engagement; Astra re-implements its
patterns. **Resolution:** reuse the *patterns*, share no *data* (`02` §7). **Residual:** a third console
later would make this structural. The right answer is one console framework with two brains, and that
refactor is deliberately **out of scope** — recorded as a decision so it cannot be discovered as an
accident.

### H3 — The fail-closed state may make Astra look empty [MEDIUM — PARTIALLY RESOLVED]
`synthesize`, `corroborate`, `adjudicate`, `emit-vault` and `log-receipt` refuse durable work; spec mode
is `enabled:false`. If the interesting lanes are all refused, what is left? **Resolution:** the live
surface is `directions` + `compileImage` + `explain` + LAW + tuning + variants + worlds + taxonomy, which
is substantial. **Residual:** this is an *estimate* — **A0 must verify it** before A3 is promised. If A0
finds the live surface thinner than this plan assumes, the plan's value drops and Sean should know that
before A3, not after.

### H4 — "Alter how it thinks in real time" is narrower than the request [MEDIUM — RESOLVED BY DISCLOSURE]
Three dials is not a free hand. Doctrine, canon, LAW, taste and spec mode are all walled. **Resolution:**
the dial/proposal split is stated plainly in `01` §4 and every control is labelled. **Residual:** the
honest framing is "turn the dials it actually has" — if the expectation is live doctrine editing, that
expectation is wrong and better corrected now than after A7.

### H5 — `tuning.json` is shared, and its blast radius is real [HIGH — RESOLVED IN PLAN]
A knob change is not cosmetic: `auto.*` feeds the auto-corroboration gate, so raising `auto.S` changes
whether claims merge **without review**. A direct edit could do that silently, and a non-atomic write
could hand a running backend a half-written file. **Resolution:** staged → previewed → atomic → noted →
revertible (`AC4.2`–`AC4.5`), with the blast radius displayed. **Residual:** the preview is against a
fixed 12-pair fixture set, not the live corpus, so the shown delta is indicative, not authoritative —
and the pane must say that.

### H6 — Windows line endings and encoding [MEDIUM — RESOLVED IN PLAN]
`tuning.json` edits on Windows risk CRLF conversion, which would make an untouched region differ. This
is the representation-dependent-verifier class this repo has already been bitten by. **Resolution:**
`T-M-07` asserts byte-for-byte preservation of untouched regions.

### H7 — Loopback is not authentication [MEDIUM — RESOLVED IN PLAN]
Any local process can reach `127.0.0.1:7411`. Reads are fine (the taste probe accepts the same). Writes
are not: `tuning.json` is a real config file and `reject` mutates a record. **Resolution:** token with
`SameSite=Strict` on every mutation (`AC8.2`, `T-I-10`) — the same fix the NIGHTSHIFT build landed.

### H8 — A cold start makes every direction a `prior` [MEDIUM — RESOLVED IN PLAN]
The grill's own evidence floor is *≥8 non-neutral judgements across ≥2 grids*, and an `evidence` tier
needs ≥2 of Sean's own picks. With no taste data, **every direction is `PRIOR`** and the console's most
exciting pane looks like it is guessing. **Resolution:** this is truthful, and the grill already
prescribes the copy — *"from themes.md — not yet backed by your picks; N more closest picks of `<kind>`
would flip it"*. Astra must render that sentence, not a bare badge. A console that hid the cold start
would be the dishonest-dashboard failure again.

### H9 — Contract/implementation drift (D-A) [LOW — RECORDED]
`forge-compiler-contract.md` is headed v0.1.0; the code reports `0.2.0`. **Resolution:** Astra reads the
code (`AC1.3`). **Residual:** the contract document should be corrected, and that is the design-brain
owner's call, not Astra's.

### H10 — `resolveSlots()`'s key set is unverified [BLOCKER — A0 CLOSES IT]
`03` §4.1 lists 12 slot names from the contract. If the implementation accepts different keys, every
slot edit in A3 targets the wrong field. **This is why A0 is the first slice and why A1 must not start
before it.**

### H11 — The proposal channel has no owner [LOW — NAMED]
A7 drafts proposals. If nobody reads them, it is a dead end that looks productive. **Open question for
Sean:** where do drafted token/canon proposals land, and who triages them? Until answered, A7 should
write to a single named inbox path and say so.

### H12 — Explain could drift from the compile [MEDIUM — RESOLVED IN PLAN]
If `ExplainView` were assembled from a separate reasoning log, the log and the compile could disagree —
and the console would confidently explain something that did not happen. **Resolution:** `ExplainView` is
**derived only** from the compile result's own `slots`, `facetsApplied`, `lawChecks` and version. There
is no second source to disagree with.

---

## 5. Decisions and open items

### Decided in this packet
| # | Decision | Where |
|---|---|---|
| D1 | Product name **Astra** | `00` header |
| D2 | Loopback web app first; Tauri is A8 | `02` §8 |
| D3 | The dial/proposal split is the central design constraint | `01` §4, `02` §4 |
| D4 | Astra owns no authoritative state | `02` §6 |
| D5 | `ExplainView` is derived, never a second log | H12 |
| D6 | `directions()` belongs in the compiler, not in Astra (U1 default) | `01` §6 |
| D7 | The Law pane is read-only, with no override | `02` §5 |
| D8 | The State board shows refused lanes and has no control to enable them | `02` §5 |

### Open — needs Sean or the design-brain owner
| # | Question | Blocks | Default if unanswered |
|---|---|---|---|
| U1 | `directions()` in the compiler or in Astra Core? | A1's shape | in the compiler (one brain) |
| U2 | Astra reads the variant store directly, or through a service? | A1 | read directly |
| U3 | Is `review-answer` (`usable`/`onBrand`) surfaced in v1, or is `rejected_all` enough? | A6 | `rejected_all` only |
| U4 | Tauri shell: same repo or a wrapper repo? | A8 | same repo, `apps/astra-shell/` |
| U5 | Where do drafted canon proposals land, and who triages them? (H11) | A7 | one named inbox path |
| U6 | Should the stale `forge-compiler-contract.md` version be corrected to 0.2.0? (D-A) | nothing — cosmetic | leave, and note it |

### Standing risks carried forward
- **H2** — a third console would make the duplication structural. One framework, two brains is the
  eventual answer; not now.
- **H3** — A0 may find the live surface thinner than planned. If so, say so before A3.
- **H5** — the tuning preview is indicative, not authoritative. Say so on the pane.
- **A4's `T-I-03`** — true concurrent-writer testing is not yet designed. `T-M-06` proves the
  atomic-write step in isolation (`crashAfterTemp` interrupts between temp-write and rename, and the
  old file survives), but no test has a second process reading during a commit. A4 did not change this.
- **A4's `D33`** — the patcher writes the value's canonical JS form, so a staged `0.40` lands as `0.4`.
  Numerically identical and within the changed region, so `T-M-07` holds, and the prior-value record
  keeps the original bytes so a revert restores the spelling. Left as-is deliberately: preserving the
  operator's typed form means parsing their text, which is a bigger change than the defect.
- **A4's `G6`** — no override editor, so `R3 / AC3.2` cannot be exercised and `T-I-01` does not exist.
  Carried as `UNWIRED_CONTROLS` in code, not as a note.
- **Taste integration** is exercised only against a stub. The real private repo is unverified.
