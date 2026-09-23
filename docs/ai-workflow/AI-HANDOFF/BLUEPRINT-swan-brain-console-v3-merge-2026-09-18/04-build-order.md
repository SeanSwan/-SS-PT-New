# 04 — Build order (file-by-file)

Ordered so that **every slice leaves the system bootable**. Paths are relative to the repo root.
Budgets are the Rule 4 cap (≤300 lines) unless noted.

---

## ⚠ READ THIS BEFORE STARTING S0 — eight verified plan defects

> ## ✅ DECIDED — 2026-09-19
> **All eight defects below have been ruled on.** The rulings are authoritative and live in
> **`DECISIONS-D14-D21.md`** in this packet — read that first; it states the exact change for each.
> Two structural consequences you must know before reading further:
> **a new slice `S0b` (manifest port) follows S0**, and **the execution order is
> `S0 → S0b → S1 → S3 → S2 → S4 → S5`** (S3 precedes S2). Slice *IDs* are unchanged so that every
> cross-reference in this packet still resolves; slice *order* is now explicit and is not ID order.
> The tables below are kept as the **evidence record** of what was wrong and are not a to-do list.

Round 3 of the hostile review verified four defects **in this document**, found by Astra
(`gpt-6-astra`). Round 4 then opened the S4/S5 slices — which round 3 had explicitly left unaudited —
and verified four more. **All eight share one shape: a slice's permitted file changes are not
sufficient to make the slice's own deliverable reachable.** Full evidence in
`Z:\HostileReviews\2026-09-19-162019-swan-brain-console-v3-round-3-astra-s-plan.md` (D14–D17) and
`Z:\HostileReviews\2026-09-19-162737-swan-brain-console-v3-round-4-s4-s5-slice.md` (D18–D21).
**Do not execute S0 until D14 is resolved or explicitly accepted.** — *resolved; see the banner above.*

> **Corrected this round.** D17's evidence previously cited `(:58)` for the `gateHealth.mjs` row and
> `(:22)` / `(:17-27)` for the S1 direct imports. Those lines point at this table itself — the
> evidence column cited the block it was written in. **Both are now cited by row name rather than by
> line number**, because a line number inside the document it describes goes stale the next time
> anyone edits above it. The finding was true; its citations were not, and a citation that cannot be
> followed makes the block unfalsifiable for the next reviewer.

| # | Slice | Defect | Verified evidence |
|---|---|---|---|
| **D14** | S0 | **The salvage scope omits the manifest changes that make the workstream runnable.** `npm run verify` exists **only** in the orphan's root `package.json:5`; the destination's root `package.json` contains zero references to `swan-brain-console`. `@types/three` is declared **only** in the orphan's `frontend/package.json:90`; the destination does not declare it. S0 copies "the two scopes" and says *"No source edits in S0"* — so both are lost. | `package.json` pairs compared directly |
| **D15** | S2 | **Judge Mode ships unreachable.** Registering `/app-judge.js` in `ASSET_ROUTES` does not load it: `app/index.html:173-174` loads only `/app.js` and `/onboard.js`, `grep` finds **zero** references to `app-judge` anywhere, and the tab list is a hardcoded literal at `app/app.js:39`. S2's note calls the asset registration *"the only permitted server change"* — so the builder cannot add the tab without violating the slice. | `index.html:173-174`, `app.js:39`, zero grep hits |
| **D16** | S3 | **The registries are unreachable.** `server.mjs:49-55` is a **fixed five-entry** asset map, and its 404 at `:143-147` reports the allowed keys. S3 adds `tabs.json`/`sources.json`/`seats.json`/`app-shell.js` and never extends the map. S3's own acceptance criterion (an 8th registry row renders) cannot be exercised. | `server.mjs:49-55,143-147` |
| **D17** | S1 | **A tool with no data source, plus a contract that contradicts this build order.** `swan_get_gate_health` is backed by gate result files (`03-contracts.md:300`), but `gateHealth.mjs` is not scheduled until **S4** (the `gateHealth.mjs` row in §S4). `swan_list_variants`'s `filter: 'nav_model'` cannot narrow anything. `swan_search_doctrine` has no allowlist or bound. And `03-contracts.md:296` backs `swan_get_state` with **`GET /api/state`** while the §S1 table's **Imports** column imports the reader modules **directly** — both cannot be true. | `03-contracts.md:290-309` vs the §S1 **Imports** column |

**Suggested resolutions** (plan decisions — Sean's or the builder's, not the reviewer's):

- **D14** — salvage the manifest **diffs** as evidence, then port them in a separate integration
  slice without overwriting the destination's manifests. Verify against a clean install.
- **D15** — either add the `index.html` script tag and the tab entry to S2's permitted changes, or
  **move Judge Mode after S3** and let it arrive as one registry row (what S3's acceptance
  criterion is designed to enable). The second is the smaller change.
- **D16** — add a constrained registry-serving namespace to S3 (e.g. `/registry/<known-name>.json`),
  with canonical-root checks, no traversal, no remote modules, and invalid-registry failure
  behaviour. Keep the allowlist fixed — path must still select a key, never a file path.
- **D17** — choose **direct imports** over the HTTP adapter (which makes degraded mode unnecessary
  rather than specified) and delete the adapter claim; or keep the adapter and drop the direct
  imports. Define Gate Health's `NOT_RUN`/`INVALID`/`STALE` states **before S1**, or move the tool to
  S4. Give the search an allowlist and a bound, and fix the `filter` shape.

### D18–D21 — the S4/S5 defects (round 4)

Round 3 named S4/S5 as unopened and "plausibly" carrying the same class. Round 4 opened them, and
**all four items carry it.**

| # | Slice | Defect | Verified evidence |
|---|---|---|---|
| **D18** | S4.3 | **`capProbe.mjs` cannot deliver an adaptive cap — wrong runtime, and no write path to the constant.** `MAX_LIVE_WORLDS` is `export const … = 4` in `renderSlots.ts`, read by `acquireSlot`, `slotStats` and `publishSlotStats`; the file has no setter, no options object and no config read, and an ESM `export const` is a read-only binding. The file is placed in a **Node** directory (`scripts/swan-brain-console/`) while `devicePixelRatio` and SwiftShader detection are browser-only and "publishing" the cap is a DOM write on `documentElement`. Making the cap dynamic also requires `renderSlots.ts` **and** the contract test that asserts the cap *is* the constant — neither is in S4's table. | `renderSlots.ts` (83 lines, read in full); the `capProbe.mjs` row in §S4; `runtime.contract.test.ts` "caps acquisitions at MAX_LIVE_WORLDS" |
| **D19** | S5 (and S4) | **The required `SCENE_SIGNATURES` row has no permitted file, and the type system makes the edit mandatory.** `SCENE_SIGNATURES`, `FAMILY_PARAMS` and `FAMILIES` are all `Record<SceneFamily, …>`, keyed by the closed union in `paramsCore.ts`. Adding a family needs **four edits in `paramsCore.ts`**, and because the records are exhaustive over a closed union, omitting any key is a **compile error** — the builder cannot build without it. `paramsCore.ts` appears in **no** slice's file list, and neither does `looks.ts` (`Record<HeroMechanics, VariantLook>`), which a new family needs before any variant can reach it. **`lit.ts` is also double-assigned**: S4 in the §S4 table, S5 in `05-slices.md`. | `paramsCore.ts` — the union plus three exhaustive records; `looks.ts` — `LOOKS`; the `lit.ts` row in §S4 vs `05-slices.md` §S4/S5 |
| **D20** | S4.2 | **The screenshot-diff step is unimplementable from the slice, and its priority rationale is stale.** The workflow's only render check runs `gallery-verify.mjs`, which screenshots and hashes **every 97th byte** to assert the twenty are *mutually* unique — there is no stored reference. No comparator exists (`pixelmatch`/`pngjs`/`odiff`/`resemble` in neither manifest), and `docs/qa/baseline/` holds exactly one file: the **homepage** `homepage-1280w.png`. An `edit` to the workflow cannot produce a baseline set, a comparator and a tolerance policy. Separately, the rail-reserve class it calls "the highest-value remaining guard" is **already automated**: `gallery-verify.mjs` opens a `LAYOUT OVERLAP GUARD` described as "the repo's most-recurred defect class, finally automated", scoped to the edge-anchored models — and the workflow already runs it. | the workflow's `renders` job; `gallery-verify.mjs` — the digest and the `LAYOUT OVERLAP GUARD`; `docs/qa/baseline/` (1 file) |
| **D21** | S5 | **The teaching example for "state what is built" cites a rename on the wrong axis.** S5 requirement 1 illustrates the `SCENE_SIGNATURES` rule — which is **family**-keyed — with "round 3 renamed `liquid-surface`→`layered-shells`". Both of those are **hero-mechanics** values, not families. The family-axis rename is `refract`→`shells`, documented in `paramsCore.ts`. A reader following the example into `paramsCore.ts` finds nothing. | `threeWorldEntries.ts:123`; `skeletons.ts:36`; the family-rename comment in `paramsCore.ts` |

**Suggested resolutions** (plan decisions — Sean's or the builder's, not the reviewer's):

- **D18** — move the probe into `three-worlds/`, where its three inputs actually exist, and give
  `renderSlots.ts` an injected cap (`configureSlots({ cap })`) with `MAX_LIVE_WORLDS` as the default.
  Add `renderSlots.ts` and the contract test to S4's permitted changes. The test must assert the
  default and the override separately, or it keeps passing once the cap becomes dynamic.
- **D19** — give S5 a real file table, including `scenes/paramsCore.ts` and `scenes/looks.ts`, and
  resolve `lit.ts` to **one** slice. S5 is the smaller change: S4 is otherwise a library/CI slice,
  and `lit.ts` is a scene family.
- **D20** — either scope S4.2 to include the comparator, the baseline directory and the tolerance
  policy, or drop it and keep the overlap guard. If kept, re-rank it on what the digest genuinely
  misses: it is a *sampled* hash compared only within one run, so a **fleet-wide palette/token
  regression** yields twenty unique digests and passes.
- **D21** — use `refract`→`shells` as the example, and mention the mechanics rename separately.

**Inheritance, not a new defect:** S4.1 (the Gate Health tab) is **downstream of D16**. Tabs are a
hardcoded literal in `app.js`, so the tab needs either a shell edit or the S3 registry — and the
registry is unreachable behind the fixed five-entry `ASSET_ROUTES`.

---

## S0 — Salvage (no new files; the workstream moves)

| Step | Action | Purpose |
|---|---|---|
| 0.1 | Create a live worktree from `origin/main` under `tmp/worktrees/` **and register it** | Restores a working git link |
| 0.2 | Copy the two scopes in, preserving paths exactly | Moves the 77 files |
| 0.3 | Prove byte-identity by hash manifest | This is the acceptance criterion |
| 0.4 | Stage explicit paths, commit on a new branch | Never `git add -A` |

No source edits in S0. If a hash differs, **stop** — do not "fix" it in the same slice.

## S0b — Manifest port (NEW; follows S0, precedes S1)

**Ruling: D14 — ⚠ CORRECTED.** **Exactly one one-line addition.** `@types/three` needs **no change**:
`origin/main:frontend/package.json:90` already declares it. D14's original claim that the destination
lacks it was measured against the wrong tree — the currently-checked-out branch instead of `origin/main`,
which is what S0 copies from. **Copying either manifest file is still prohibited**, but for the accurate
reason that the orphan's root manifest is `origin/main` **plus** `verify` **minus** `check-docs-links:in`
and `db:drift-check`. Full correction table in `DECISIONS-D14-D21.md` §D14.

```jsonc
// root package.json — scripts
"verify": "node scripts/swan-brain-console/verify-all.mjs"
```

**M3/M4 (no dependency and no script lost) are RED-first guards.** Remove a destination script, watch
M4 fail, restore it.

## S1 — MCP server (read-only)

| File | Purpose | Budget | Imports | Exports | Mimic |
|---|---|---|---|---|---|
| `scripts/swan-brain-console/mcp/server.mjs` | stdio MCP entry; JSON-RPC routing; degraded mode | ~120 | `node:readline`, `./tools.mjs` | — | `scripts/swan-brain-console/server.mjs` (arg parsing, error shape) |
| `scripts/swan-brain-console/mcp/tools.mjs` | the **four** S1 tool handlers; one exported fn each | ~160 | `../fleetData.mjs`, `../engineState.mjs`, `../doctrine.mjs`, `../copyPack.mjs` | `swanGetState`, `swanListVariants`, `swanGetEngineState`, `swanSearchDoctrine`, `TOOL_NAMES`, `TOOL_SPECS`, `TOOL_REGISTRY`, `callTool`, `FORBIDDEN_NAMES`, `ALLOWED_VERBS` | `fleetData.mjs` (read-time counts) |
| `scripts/swan-brain-console/mcp/tools.test.mjs` | `node:test` guards: the exact-set pin, the forbidden-tool assertion, the structural verb rule, the bounded search | ~260 | `node:test`, `node:assert`, `node:fs` | — | `engine-contract.test.mjs` |
| `scripts/swan-brain-console/mcp/server.test.mjs` | **ADDED AT BUILD TIME** — spawns the real server; transport, handshake, malformed-frame survival | ~115 | `node:test`, `node:child_process` | — | — |
| `scripts/swan-brain-console/mcp/README.md` | how to register the server; the read-only contract | — | — | — | `scripts/design-brain/README.md` |

**Two amendments made while building, both recorded in `05-slices.md` §S1:**
**(1)** `copyPack.mjs` is imported — `swan_get_state` promises "the full snapshot", and the console's
snapshot includes the copy pack, so omitting it would make the promise false.
**(2)** The transport suite is a **separate file**, `server.test.mjs`, because one file covering both
the handlers and the transport was 336 lines — over the Rule 4 cap. S1 therefore ships **five** files.
**`node --test <directory>` does not work** on Node 22 (it tries to *require* the directory and fails
with `MODULE_NOT_FOUND`); both test files must be named explicitly.

**Ruled D17(c): `swan_get_gate_health` is NOT in this table.** It moves to S4 alongside
`gateHealth.mjs`, which is the module that reads gate result files; S1 without it is self-contained.
**The load-bearing test:** assert the exported tool list **exactly equals** the four allowed names
here (and, after S4, exactly five). A future contributor adding a write tool must make that test fail
first — and that RED was observed, not assumed: injecting `promote_variant` turned 6 of 24 assertions
red. The run also exposed a defect in the guard's own diagnostics (see `05-slices.md` §S1).

## S2 — Judge Mode

| File | Purpose | Budget | Notes |
|---|---|---|---|
| `app/app-judge.js` | pairing, keyboard verdicts, localStorage, export | ~200 | mirrors `app/app.js` structure |
| `app/judge.css` | side-by-side layout, 375px stack | ~120 | reuse `app.css` tokens |
| `app/judge-export.mjs` | pure: verdict list → `{json, markdown}` | ~90 | **pure, no DOM** — so it is unit-testable |
| `app/judge-export.test.mjs` | `node:test` over the pure exporter | ~110 | export shape is the promotion evidence |

Register `/app-judge.js` and `/judge.css` in `server.mjs` `ASSET_ROUTES` — that is the **only**
permitted server change in S2, and it is additive.

## S3 — Registries + tab convergence

| File | Purpose | Budget | Notes |
|---|---|---|---|
| `app/tabs.json` | `[{id, label, module, api}]` | data | the shell iterates it; a new panel = one row |
| `app/sources.json` | `[{id, kind, path, note}]` | data | Library/Memory read this |
| `app/seats.json` | `[{seat, script, billing, gate}]` | data | `gate: "relay"` → stop-card, not a Run button |
| `app/app-shell.js` | registry loader + tab controller | ~220 | **replaces** the hardcoded `<nav>` loop in `app.js` |
| `app/app-shell.test.mjs` | registry → rendered tabs | ~120 | prove a new row needs no shell edit |

**Acceptance for "no shell edit":** add a throwaway 8th registry row in a test fixture and assert it
renders without touching `app-shell.js`.

## S4 — Upgrade backlog (independent, order by value)

| File | Purpose | Budget | Notes |
|---|---|---|---|
| `scripts/swan-brain-console/gateHealth.mjs` | read gate result files; `not run` ≠ pass | ~130 | **D17c:** also backs `swan_get_gate_health`, which **moves here from S1**. **D16:** S4.1's Gate Health *tab* needs the S3 registry. |
| `scripts/swan-brain-console/shot-diff.mjs` | Playwright `toHaveScreenshot` + `maxDiffPixelRatio` baseline diff | ~150 | **D20.** The comparator S4.2 assumed existed. |
| `.github/workflows/three-worlds-fleet.yml` | run `shot-diff.mjs` | edit | **D20.** |
| `docs/qa/baseline/three-worlds/` | the committed baseline set **and its update procedure** | data | **D20.** Pattern already in the repo: `docs/qa/baseline/homepage-1280w.png`. |
| `frontend/src/pages/HomePage/three-worlds/capProbe.ts` | derive the cap from `hardwareConcurrency` + SwiftShader detection + `devicePixelRatio` | ~120 | **D18.** Moved out of `scripts/` — the frontend is the only runtime where all three inputs and the DOM write exist. |
| `frontend/src/pages/HomePage/three-worlds/renderSlots.ts` | add `configureSlots({ cap })`; keep `MAX_LIVE_WORLDS = 4` as the default | edit | **D18.** An `export const` is a read-only ESM binding; the cap must become configurable. |
| `frontend/src/pages/HomePage/three-worlds/__tests__/runtime.contract.test.ts` | assert the **default** and the **override** separately | edit | **D18.** The current assertion is written against a constant and would keep passing while testing nothing. |

**Removed from S4 by ruling:** `scripts/swan-brain-console/capProbe.mjs` (D18 — wrong runtime) and
`scenes/lit.ts` (D19 — a scene family, belongs to S5). See `DECISIONS-D14-D21.md`.

**S4.2's rationale is rewritten, not just rescoped (D20).** The rail-reserve class it cited as
*"the highest-value remaining guard"* is **already automated** by the `LAYOUT OVERLAP GUARD` in
`gallery-verify.mjs`. The real gap: the existing digest samples **every 97th byte** and is compared
only within one run, so a **fleet-wide palette/token regression yields twenty unique digests and
passes**. Rank on that.

## S5 — Fidelity (largest visual lever, largest risk)

> ## ⛔ SUPERSEDED — see **D25**. S5 as written is **REJECTED**; `lit.ts` is struck.
> The fleet is deliberately unlit (determinism across GL backends, additive/wireframe language, and
> shader cost under the context cap — D25; note that D25 also **corrects** the retracted crash
> attribution D23 leaned on). The slice's real subject, the **8-families-behind-20-compositions**
> gap, was served by building the missing **signature ↔ construction** guard, now in place. Adding a
> family remains **open for Sean** — it is art direction, not correctness — and the mechanism is
> proven safe, because any new family's `SCENE_SIGNATURES` row is machine-verified as soon as it is
> written. **Read D25 before acting on anything below.**

**Ruling: D19 — this slice now has a file table.** The `SCENE_SIGNATURES` requirement below cannot be
met without editing `scenes/paramsCore.ts`, and the type system makes that edit **compile-mandatory**:
`SCENE_SIGNATURES`, `FAMILY_PARAMS` and `FAMILIES` are all `Record<SceneFamily, …>` over the closed
union at `paramsCore.ts:37-38`, so adding a family needs **four edits in that one file** and an omitted
key is a compile error. `looks.ts` is required separately — `LOOKS` is
`Record<HeroMechanics, VariantLook>` and imports `type SceneFamily`, so without a row there no variant
can reach the new family. Neither file was listed in any slice.

| File | Purpose | Budget | Status after D25 |
|---|---|---|---|
| `frontend/src/pages/HomePage/three-worlds/scenes/lit.ts` | `MeshPhysicalMaterial` + `transmission` families | ~280 | ⛔ **STRUCK** — lit PBR is off-language, not deterministic across GL backends, and heavier under the context cap |
| `frontend/src/pages/HomePage/three-worlds/scenes/paramsCore.ts` | the `SceneFamily` union + `FAMILY_PARAMS` + `FAMILIES` + `SCENE_SIGNATURES` | edit | **unchanged** — the table was verified accurate |
| `frontend/src/pages/HomePage/three-worlds/scenes/looks.ts` | `LOOKS` rows so a variant can reach the new family | edit | **unchanged** — no family added |
| `frontend/src/pages/HomePage/three-worlds/__tests__/scenes.contract.test.ts` | signature ↔ construction agreement | ~120 | ✅ **BUILT** — 283 lines, 21 tests |
| `frontend/src/pages/HomePage/three-worlds/scenes/signatureAudit.ts` | *added by D25* — builds every family, reports the classes actually allocated, compares them to the table, and enforces the unlit rule | 278 | ✅ **BUILT** |

**`lit.ts` belonged to S5** — removed from §S4 by D19, then struck entirely by D25.

Closes the honest **8-families-behind-20-compositions** gap. Every new family must:
1. add a `SCENE_SIGNATURES` row that matches what is actually constructed (round 3 renamed the
   **family** `refract`→`shells` precisely because the label was a claim the material could not keep:
   layered transparent `SphereGeometry` under `MeshBasicMaterial` produces no transmission physics.
   Note the axis — the separate hero-mechanics rename `liquid-surface`→`layered-shells` lives in
   `skeletons.ts`/`looks.ts`, and `threeWorldEntries.ts` still carries the old string in a
   must-not-touch file. See D21);
2. carry `dispose()` releasing geometry, material and attributes;
3. stay ≤300 lines, or split by family.

## Files that must NOT be touched

| Path | Why |
|---|---|
| `frontend/src/main-routes.tsx` | canonical routing; the fleet is parked (I4) |
| `frontend/src/pages/HomePage/**` (except `three-worlds/`) | the live homepage is `HomePage.V4` |
| `scripts/design-brain/**` | fail-closed engine; the console only reads its README |
| `docs/ai-workflow/design-brain/**` | doctrine; canon changes are Sean's hand-edit alone |
| `frontend/src/pages/DesignPlayground/concepts/*Homepage.tsx` | 12 pre-existing files >300 lines; **not ours**, do not "fix" |

## Re-generation over hand-editing

`v01..v20/*.tsx` are **generated** by `scripts/swan-brain-console/generate-worlds.mjs`; the
DesignPlayground wiring by `wire-playground.mjs`. Round 2 verified the generated files are ~1.1KB
wrappers importing `three`, `WorldPage` and their own skeleton — so none of the runtime fixes live
in them and regeneration cannot revert a fix. **Re-run the generator; never hand-edit a generated
file.**
