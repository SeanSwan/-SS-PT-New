# A0 — Seam Audit

- **Date:** 2026-09-25 · **Author:** sable (WorkBuddy AI) · **Slice:** A0 (`05-SLICES-AND-REVIEW.md` §1)
- **Purpose:** close `D-B`, locate the variant store, and re-derive the lane list from code. **Read-only.**
- **Result:** `D-B` **CLOSED** — the packet's 12 slot names were correct. **Five packet corrections found**, listed in §7.

---

## 1. `D-B` CLOSED — `resolveSlots()`'s accepted key set

Read from `shared/swanPromptCompiler.mjs:97-130`. `resolveSlots(brief)` reads exactly these keys:

| Brief key | Effect | Line |
|---|---|---|
| `text` | seeds `slots.subject` | `:100` |
| `facets` | array of `FACETS` keys; each patches slots | `:98`, `:108-116` |
| `intent` | `INTENT_DEFAULTS[intent]` merged; falls back to `hero` | `:105` |
| `surfaceClass` | `SURFACE_RULES[surfaceClass]` merged; falls back to `'in-app'` | `:106` |
| `artist` + `artistMedium` | sets `slots.styleAnchor` via `personify()` | `:118-120` |
| `aspect` | prepended into `slots.output` | `:126` |
| `slotOverrides` | `Object.assign`ed **last** — overrides win over everything | `:128` |
| `briefId` | passed through to the result | `:252` |
| `seed` | used if an integer | `:219` |
| `killList` | per-call override of `KILL_LIST_ENABLED` | `:176` |
| `requireSeed`, `initImage` | capability-request guards | `:68`, `:72` |

**The 12 slot keys, confirmed verbatim at `:99-103`:**
`intent, subject, medium, styleAnchor, composition, optics, light, palette, material, abstraction, negative, output`

**Verdict: `03-INTERFACE.md` §4.1's slot list is correct.** No change needed. `D-B` is closed and **A1 is unblocked**.

---

## 2. `compileImage()`'s real result shape

From `:251-268`. **16 fields**, more than the contract documents:

```
briefId · brainVersion · provider · modelVersion · aspect · aspectDivergence ·
promptStyle · promptText · truncated · droppedSegments · negativeText · seed ·
params · slots · facetsApplied · lawChecks
```

Notable, and each one is a packet correction:

- **`aspect` is a typed field** and `aspectDivergence` is a real object `{declared, inProse}`. The
  comment at `:225-236` explains why: prose is a *projection* of structure, never the reverse. A
  previous version parsed the ratio out of `slots.output` with a regex and sent `aspect_ratio: "10:30"`
  for a brief mentioning "10:30 golden hour light".
- **`truncated` / `droppedSegments`** come from `fitToBudget()`. A truncated prompt is a **silent
  quality loss** unless surfaced — the console must show it.
- **`promptStyle`** is the serializer strategy actually chosen.

## 3. The LAW filter — 6 laws, and `checks` carries no detail

`shared/swanLawFilter.mjs:147-263`. `applyLaws(slots, facets)` returns `{passed, violations, checks}`.

`checks` is `[{law, passed}]` — **`detail` is NOT on `checks`; it lives on `violations`**
(`{law, slot, detail}`). The six laws, from `:256-257`:

`LAW2-gold-allowlist` · `LAW3-kill-list` · `LAW3-banned-facet` · `LAW4-optics-not-creatures` ·
`LAW9-retired-palette` · `LAW10-content`

Two behaviours the console must render honestly:
- **The `negative` slot is exempt from taste law but not content law** (`:225-244`). So a lawful compile
  can still produce a `LAW10-content` violation on `negative` alone.
- **It blocks, never strips** (`:9-12`): *"silently removing an offending phrase teaches the operator
  nothing and hides a taste failure behind a clean-looking result."* This is `INV3`, confirmed in code.

## 4. `KILL_LIST_ENABLED` is OFF — and env-gated

`shared/forgeConfig.mjs`: `export const KILL_LIST_ENABLED = process.env.FORGE_KILL_LIST === '1';`

The file's own argument: the clause costs **~7% more per image**, its fixation risk is **unmeasured**,
and the error costs are **asymmetric** — *"The expensive error is ON-and-bad. So: off, until measured."*
It carries a **named gate condition**: Sean's blind-pair ruling on the 6 images in
`.ai-workflow/forge-runs/ab-avoid/`, recorded via `forge review-answer`.

**Why this matters to Astra:** the kill-list is *most of what separates Swan output from stock AI art*
(the compiler's own comment at `:161-163` says every image so far was generated with **zero**
anti-generic constraints). Its state is a **decision with a named gate**, not a default. **The State
board must show it, and show the gate condition.** A console that omitted this would hide the single
most consequential toggle in the pipeline. Added to the packet as `R5/AC5.5`.

## 5. The variant store is a MODULE SET, not a path

Rooted at `ARTIFACT_ROOT = '.ai-workflow/forge-runs'` (`forgeConfig.mjs`), with a hard allowlist
`assertInsideArtifactRoot()` — *"the only code here that deletes anything… There is no flag to override
it, because a flag is just a slower way to make the mistake."*

| Module | Exports Astra needs |
|---|---|
| `shared/bracket.mjs` | `generateBracket`, `findVariant`, `saveImage`, `storeStatus` |
| `shared/variantRun.mjs` | `readRuns`, `annotateRun`, `generate`, `RUN_DIR_LOCAL` |
| `shared/variantLineage.mjs` | `lineage` |
| `shared/variantVerdict.mjs` | `markWinner` |
| `shared/contactSheet.mjs` | `buildContactSheet` |

**Astra reads through these modules, never by parsing files.** That is `U2` resolved: no service, no
path-guessing — import the store's own API. `forge.mjs:17` is the precedent.

**`RUBRIC` exists** — `forge.mjs:194` iterates it to print questions with `[option | option]` lists, and
`review-answer` writes `{usable, onBrand, note}` into `v.review` (`:217`). So the Ledger pane has a real
rubric to render, and `U3`'s answer is *surface it* — the structure already exists.

## 6. Refusal lanes, derived from code (not prose)

| Lane | Status | Evidence |
|---|---|---|
| `adjudicate.mjs` | **REFUSED** | `:68` `REFUSED: signed claim adjudication authority is required`; `:49,:70` provenance refusals |
| `emit-vault.mjs` | **REFUSED** | `:14` `REFUSED: accepted claim … lacks signed canonical receipt provenance` |
| `log-receipt.mjs` | **REFUSED** | `:50` receipt/1 validation refusal; `:57` idempotency refusal |
| `synthesize.mjs` | **REFUSED** | `:118` prints `REFUSED <receiptId>` for rejected receipts |
| `corroborate.mjs` | **REFUSED** | per `design-brain/README.md`; **no throw site found in this pass** — see §8 |
| `reference-modes.mjs` | **REFUSED (legacy modes)** | `:13` `E_LEGACY_MODE_REFUSED` for unsupported modes |
| `attest.mjs` | **RETIRED** | `:1` *"Inspect attestations were retired by the Opus/Kimi hardening decision."* |
| `redact-provenance.mjs` | **RETIRED** | `:1` same |
| `log-spec.mjs` | **RETIRED** | per `design-brain/README.md`; not opened this pass |
| **spec mode** | **DISABLED** | `spec-contract.mjs:65` throws `E_SPEC_MODE_DISABLED` unless `config.enabled === true`; `config/spec-mode.json` has `"enabled": false` |

**Honest gap:** `corroborate.mjs` and `log-spec.mjs` are listed REFUSED/RETIRED on the strength of the
README, not of a throw site I read. The board must carry the source for each row, and for these two the
source is prose. **Recorded, not smoothed over.**

---

## 7. Packet corrections required (5)

| # | Packet said | Code says | Action |
|---|---|---|---|
| **C1** | `ExplainView.lawChecks: {law, passed, detail?}[]` | `checks` is `{law, passed}` only; `detail` is on `violations` | merge both in `explain()`; keep the packet's richer shape, sourced correctly |
| **C2** | `E_IMAGE_FIRST_REQUIRED` listed as an Astra error | **`compileVideo` was REMOVED** (`compiler:271-275`) — the guard belongs to the video lane's own tree | delete from the error contract |
| **C3** | `E_PROVIDER_UNCONFIGURED`, `E_BRAIN_VERSION_MISMATCH` listed | not thrown by this compiler. Real codes: `E_LAW_VIOLATION`, `E_CAPABILITY_UNVERIFIED`, `E_CAPABILITY_UNAVAILABLE`, `E_EMPTY_PROMPT`, `E_SPEC_MODE_DISABLED`, `E_LEGACY_MODE_REFUSED` | correct the table |
| **C4** | `ExplainView` had no `aspect`, `aspectDivergence`, `truncated`, `droppedSegments`, `promptStyle` | all five are returned | add them — `truncated` in particular is a silent quality loss |
| **C5** | `U1` unresolved: `directions()` "in the compiler" | the compiler is at **274/300 lines**; `swanVocabulary.mjs`'s header documents the house rule: *"Split out … at the 300-line cap (rule 4)"* | **`U1` RESOLVED: sibling module + re-export.** See §9 |

## 8. Minor drift, recorded

- `swanVocabulary.mjs:11-15` says *"deliberately ~60, not the full ~765"*; `FACETS` actually holds
  **23** entries. The *intent* (ship only what the LAWs reference) is right; the number is stale. Not
  Astra's to fix — reported to the design-brain owner.
- `corroborate.mjs` / `log-spec.mjs` status rests on prose (§6).

## 9. `U1` RESOLVED — where `directions()` and `explain()` live

`swanVocabulary.mjs`'s own header settles it:

> *"Split out of `swanPromptCompiler.mjs` at the 300-line cap (rule 4). The seam matches the one already
> proven with the model catalogue: this is DATA … while the compiler is BEHAVIOUR."*

So the house pattern is **split at the cap, import for local use, and re-export** — with a comment at
`compiler:26-28` warning that *"`export … from` alone creates no local binding (bitten 3×)"*.

**Decision:** `directions()` → `shared/swanDirections.mjs`; `explain()` → `shared/swanExplain.mjs`; both
**re-exported from `swanPromptCompiler.mjs`** so the CLI and MCP get them from one import path — which is
what `U1`'s "one brain, not two" actually requires, without breaking Rule 4.

## 10. A0 exit evidence

| Requirement | Met |
|---|---|
| `resolveSlots` key set read, `D-B` closed | **yes** — §1 |
| Variant store located with its record API | **yes** — §5 |
| REFUSED/RETIRED list derived from code | **yes, with two rows honestly marked prose-sourced** — §6 |
| `directions`/`explain` confirmed absent | **yes** — no export exists in any `shared/*.mjs` |
| Packet corrections identified | **yes** — 5, §7 |
| Spend | **zero** |
| Writes outside the packet directory | **none** |

**A1 is unblocked.**
