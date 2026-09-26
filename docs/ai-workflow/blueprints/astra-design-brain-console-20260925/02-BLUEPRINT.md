# Astra — Blueprint

---

## 1. Responsibilities and boundaries

**Astra Core** — one adapter layer that wraps the Design Brain and exposes a stable, typed surface.
Owns: implementing `directions()` and `explain()`, the staged tuning writer, the honest state board,
the ledger. Does **not** own: the compiler, the LAW filter, the corpus, the variant store, taste.

**Astra Surface** — a loopback web UI. Owns: rendering, dial staging, the token gate. Does **not**
own: any authoritative state (§6).

**Astra MCP** — a server exposing Astra Core's read surface plus one guarded write tool.

**Astra Shell** — a Tauri window around the proven Surface. Owns: window lifecycle, OS keychain.

### The one-sentence boundary

> **Astra reads the brain, renders its reasoning, and turns three named dials. It owns no truth.**

Anything that would make Astra authoritative — a cached token table, a duplicated capability list, a
second taste store — is a defect, not a feature. Two sources of truth is the drift this whole design
exists to kill (`forge-compiler-contract.md` §0.5).

---

## 2. Component map

```
astra/
  core/
    brain.mjs          wraps swanPromptCompiler: compileImage, resolveSlots, personify, FACETS, BRAIN_VERSION
    directions.mjs     implements directions(brief, n) -> Direction[]        [R2 · G1]
    explain.mjs        implements explain(record) -> ExplainView             [R1 · G2]
    capabilities.mjs   the honest ACTIVE/REFUSED/RETIRED board               [R5]
    tuning.mjs         read / stage / preview / commit (atomic) / revert     [R4]
    variants.mjs       reads the variant store: bracket, pick, refine, review-answer
    ledger.mjs         rejected_all + estimated-vs-actual cost drift         [R6]
    bind.mjs           loopback-only bind guard + mutation token             [R8]
    paths.mjs          resolves the design-brain root; single place paths live
  surface/
    server.mjs         HTTP, 127.0.0.1 only
    panes/             compose · think · choose · tune · law · state · ledger
    static/            index.html · app.js · astra.css
  mcp/
    server.mjs         stdio MCP
    tools.mjs          read tools + one guarded write tool                   [R7]
apps/
  astra-shell/         Tauri wrapper                                          [A8]
```

---

## 3. Exact integration points

| Astra module | Talks to | How | Verified |
|---|---|---|---|
| `core/brain.mjs` | `shared/swanPromptCompiler.mjs` | `import { compileImage, resolveSlots, personify, FACETS, BRAIN_VERSION }` | exports confirmed at `:30,:39,:46,:53,:97,:136` |
| `core/variants.mjs` | the variant store | **A0 must locate it.** `scripts/forge.mjs` reads it via `unitCost(root)`/`cmdList`; the store path is not asserted here because it was not read | **A0** |
| `core/tuning.mjs` | `scripts/design-brain/config/tuning.json` | read whole file; write temp + rename | file read; keys confirmed (`auto.S/O/margin/minTokens`, `mergeBand.low`, `weights.*`, `novelty.*`) |
| `core/capabilities.mjs` | `scripts/design-brain/config/spec-mode.json` + the refusal paths in `src/*.mjs` | read config; the REFUSED list is derived from `scripts/design-brain/README.md` §Refused **and must be re-derived from code in A0** | config read; refusal list is prose — **A0** |
| `core/ledger.mjs` | the variant store's records | read `outcome`, `estimatedCents`, `actualCents` | ~~fields specified `forge-compiler-contract.md:167`~~ — **MEASURABLY FALSE, see the note below (`A6`, `C50`)** |
| `surface/panes/choose` | `swan-taste-brain` `/api/profile` | `GET`, read-only, optional | external; degrades gracefully (A4) |

**No Astra module imports the taste repo's event files, and none imports `scripts/swan-brain-console/`.**

> **NOTE (`A6`, `C50`) — the `core/ledger.mjs` row above was false in all three of its fields, and it
> was never measured until A6.** *"read `outcome`, `estimatedCents`, `actualCents`"*:
> - **`outcome` is not on the variant store.** The store's record has no such field. `rejected_all`
>   is written by **Astra's own** `core/session.mjs`'s `setOutcome()` against a **COMPILE**, and that
>   is where the Ledger reads it. §6's *"variant store … appends `outcome`"* is wrong for the same
>   reason.
> - **`estimatedCents` and `actualCents` exist nowhere in shipped code.** The contract
>   `forge-compiler-contract.md` §7 *specified* them; the implementation shipped **`costUsd`**. A6
>   satisfies `AC6.2` by **conversion** and left the requirement text alone (`C50`).
> - The `Verified` cell read *"fields specified `forge-compiler-contract.md:167`"* — **a citation is
>   not a measurement**, and this is the same defect class as A5's `M2` (a marker that merely
>   *resolves* read as one that *means something*). The contract specifying a field is not evidence
>   that the field exists.
>
> **The lesson for this table:** every other row's `Verified` cell names where the claim was
> **checked**. This row named where the claim was **written down**, and the difference went unnoticed
> for five slices because the cell's format made them look alike.

---

## 4. The dial / proposal split

Requirements `01` §4 states the rule. Here is how the boundary is *mechanically* enforced rather than
trusted:

- **One control registry.** Every interactive control in the surface is declared once in
  `surface/controls.mjs` with `kind: 'dial' | 'proposal'`. The renderer reads that registry; there is
  no second place a button can be defined. `AC4.6`'s test walks the registry and fails on any control
  carrying neither label — so a new button cannot ship unclassified.
- **Proposal controls do not mutate.** They produce an artifact (a drafted proposal file) and show
  where it was written. There is no code path from a proposal control to a write.
- **The dials are enumerated, and the list is closed.** Adding a fourth dial is a packet change, not a
  config change. This is deliberate: the value of the split is that it is small enough to audit.

**Why this is the centrepiece.** The tempting build is a console where any knob is turnable, because
that is what "alter how it thinks in real time" sounds like. That build would let one session silently
change whether claims auto-merge, or edit a token value that canon owns, or write taste that only the
probe may write — and none of it would look wrong on screen. The split is what keeps Astra a console
instead of a corruption surface.

---

## 5. The seven panes

Ordered as Sean meets them.

| # | Pane | Answers | Read | Write | Dial/Proposal |
|---|---|---|---|---|---|
| 1 | **Compose** | "What am I asking for?" | brief text, intent, aspect, surfaceClass | brief fields, `slotOverrides` | dial |
| 2 | **Choose** | "What are my options?" | `directions(brief, n)` — free | the chosen direction | dial |
| 3 | **Think** | "Why that?" | `explain(record)`: slots, facets, every lawCheck, seed, provider, brainVersion | — | read-only |
| 4 | **Tune** | "What if I change my mind?" | `tuning.json` knobs | staged → previewed → committed | dial |
| 5 | **Law** | "What's banned?" | every LAW check, pass/fail, offending slot | — | read-only **by design** |
| 6 | **State** | "What's actually switched on?" | ACTIVE/REFUSED/RETIRED + capability tri-state + `spec-mode` | — | read-only |
| 7 | **Ledger** | "What's it learning?" | `rejected_all` trend, cost drift | `rejected_all` | dial |

**Pane 5 is read-only on purpose.** A failed check blocks the compile and Astra offers no override —
*"silent stripping teaches the operator nothing and hides taste failures"*. A console with an "ignore"
button here would be the most expensive feature in the product.

**Pane 6 is the pane that makes Astra trustworthy.** Much of the design brain is deliberately
non-operational. A console that rendered those lanes as merely empty would be lying by omission, and
that is the exact failure class this repo has been fixing all engagement: *a check that cannot RUN
must not read as a check that FOUND something.* Astra inherits that lesson as a product requirement.

---

## 6. State ownership — "Astra owns no truth"

| State | Owner | Astra's relationship |
|---|---|---|
| `tuning.json` | the design brain | reads; writes only through staged commit with a prior-value record |
| variant store | the Forge CLI | reads. ~~appends `outcome` through the CLI's own path~~ — **CORRECTED (`A6`, `C50`/`C51`): Astra does not write the variant store at all, and the store carries no `outcome`.** The store's record has no such field; `rejected_all` is Astra's own, written against a **compile** (see §3's note and `core/session.mjs`'s `setOutcome()`) |
| **the brief store** — `.ai-workflow/astra/briefs.jsonl` | **Astra** (`A6`, `C51`) | **owns, and it is the SECOND thing Astra owns.** Created by A6 as `BRIEF_STORE_PATH` in `core/paths.mjs`. Append-only, one JSONL row per `briefId`; the text is **immutable** (`E_BRIEF_IMMUTABLE` — idempotent on identical text, refused on different text). It sits **one level above** `.ai-workflow/forge-runs/` on purpose: `forge-prune`'s `assertInsideArtifactRoot()` can only delete inside `forge-runs`, so a prune **cannot reach** it |
| the doctrine corpus | the design brain | reads |
| `BRAIN_VERSION` | `shared/swanPromptCompiler.mjs` | reads at run time; never caches, never literals |
| capability declarations | the provider adapters | reads; the `claimed`→false rule is applied on read |
| taste events | `swan-taste-brain` | **never** — reads `/api/profile` at most |
| UI state (open pane, staged knobs) | Astra | owns, and it is the *only* thing Astra owns |

Astra's own persistence is one file: the staged tuning draft. Nothing else survives a restart except
what it wrote through a dial.

---

## 7. What to reuse from `scripts/swan-brain-console/`, and what not to

That console was hardened across this engagement and its patterns are now trustworthy. Reuse the
**patterns**; do not share the **data**.

**Reuse (patterns):**
- Loopback app shape and `app/` pane layout.
- MCP server shape: `mcp/server.mjs` + `mcp/tools.mjs`, with the standing rule that **an MCP tool must
  never write without explicit confirmation** (asserted in `mcp/server.test.mjs`).
- `searchDoctrine.mjs` as the model for a doctrine-search tool.
- **Stage classification with an explicit `BLOCKED` vs `FAILED` distinction** — the R21/R22 lesson.
- The **reconcile-the-two-instruments** pattern (R28): when a fast probe and the authoritative result
  can disagree, print one line saying so rather than letting the reader guess.
- Line-budget discipline (Rule 4, 300 lines) and declared-exception lists.

**Do not reuse:**
- Its state directory, its test registry, or its `contractSuites` lists — those belong to the verify
  brain and would couple the two consoles.
- Its `RED —` naming convention for Astra's tests: that convention is defined for the verify lane.

**Standing risk, named:** a third console appearing later would be the third instance of one shape.
The right answer is **one console framework, two brains** — but that refactor is not in this packet.
Recorded so it is a decision, not an accident.

---

## 8. Tradeoffs

| Decision | Chosen | Rejected alternative | Why |
|---|---|---|---|
| Shell | loopback web app now, Tauri later | Tauri/Electron from day one | The loopback pattern is already proven twice in this repo (taste probe `:7331`, the verify console). A new toolchain on day one buys nothing the surface needs yet and delays the first look |
| `directions()` location | in `swanPromptCompiler.mjs` (U1 default) | an Astra-only module | One brain, three consumers. Putting it in Astra gives the CLI and MCP nothing and creates a second brain |
| Explain source | derived from the compiler's own returned `lawChecks`/`slots` | a separate reasoning log | A second log can disagree with the compile; a derived view cannot |
| Tuning writes | staged + previewed + atomic + reverted by bytes | direct edit | A direct edit to `tuning.json` can change auto-merge gating with no record and no rollback |
| Law pane | read-only | read-only-with-override | The override is the whole risk |
| Pane 6 | shows refused lanes with reasons | hides them | Hiding is lying by omission |
| Preview generation | explicit, cost-shown, opt-in | auto-preview the 3 directions | Triples spend before a choice is made |

---

## 9. Dependencies

- **Hard:** `shared/swanPromptCompiler.mjs` (exists) · `scripts/design-brain/config/*.json` (exist) ·
  Node 22 (present in this environment).
- **Hard, unresolved:** the variant store's location and record shape (**A0**).
- **Soft:** `swan-taste-brain` on `127.0.0.1:7331` — optional; absence degrades one pane.
- **Later:** the Rust toolchain, only for A8.
- **None:** no new npm runtime dependency is introduced by A1–A7. The surface is plain HTML/CSS/JS, as
  the existing consoles are.

---

## 10. Existing patterns Astra must follow

- **Rule 4** — 300-line file budget, measured as `readFileSync(...).split('\n').length`. A1's modules
  are sized to fit; the largest planned module is `explain.mjs` at an estimated ~180 lines.
- **Rule 86** — Astra's build gets a hostile review filed to `Z:\HostileReviews`, and the review is
  superseded rather than edited.
- **Rule 40** — `swan-design-router` stays the design entry point; Astra loads what it loads.
- **Rule 26** — a mounted-surface receipt before any UI fix.
- **Fail-closed** — inherited from the deleted service's one good property: *the app never fabricates
  generated media*.
- **No fake metrics** — no score without a derivation, no count without a source.
