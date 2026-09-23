# DECISIONS — D14–D21

**Authority:** operator directive, 2026-09-19 — *"do the decisions first, then do all the slices after
back to back without stopping."* Sean delegated the rulings; each is recorded with its rationale and
can be overridden by him at any point.

**Status:** decided, not yet implemented. **Nothing committed.**

**How these were made:** every ruling below was checked against the actual trees (`origin/main` at
`53f93854b`, and the orphan at `tmp/worktrees/brain-console-20260913/`) rather than against the
documents that describe them. Three of the eight changed materially once measured — D14 most of all.

---

## Execution order (supersedes slice numbering)

Slice **IDs** are stable so that every existing cross-reference in the packet still resolves. Slice
**order** is now explicit and is not ID order:

```
S0 → S0b → S1 → S3 → S2 → S4 → S5
```

The single change is that **S3 precedes S2**. Rationale in D15. `04-build-order.md` and
`05-slices.md` both state this order at the top of their slice sections.

---

## D14 — S0 loses the manifests · **RULING: one line; never copy a manifest** · ⚠ **CORRECTED 2026-09-19 20:45**

> ### ⚠ CORRECTION — the original ruling was measured against the WRONG TREE
> I compared the orphan against the **currently checked-out branch**
> (`creator-brains-engine-r2-20260915`, `fe388691f`) instead of against **`origin/main`** — which is the
> tree S0 actually copies into, because S0 is `git worktree add … origin/main`. Re-measured against
> `origin/main`, **two of the three claims below are false**:
>
> | Claim as originally filed | Re-measured against `origin/main` |
> |---|---|
> | "`npm run verify` exists **only** in the orphan" | **TRUE** — `origin/main` root `package.json` has **0** matches for `"verify"`; the orphan has it at `:5` |
> | "`@types/three` is declared only in the orphan; **the destination does not declare it**" | **FALSE** — `origin/main:frontend/package.json:90` declares `"@types/three": "^0.169.0"`, identically to the orphan |
> | "copying the frontend manifest would **delete three production dependencies**" | **FALSE** — `barcode-detector`, `dompurify` and `react-big-calendar` are absent from **both** `origin/main` **and** the orphan; they exist only on the unrelated working branch |
>
> Against `origin/main`, the frontend manifests are **identical in every key set** (scripts,
> dependencies, devDependencies) — there is nothing to port on the frontend side at all.
>
> **Corrected ruling: exactly ONE line** — the root `verify` script. `@types/three` needs **no change**;
> M2 is satisfied by the worktree as created. The "never copy a manifest" advice **stands**, but for the
> accurate and much smaller reason that the orphan's root manifest is `origin/main` **plus** `verify`
> **minus** `check-docs-links:in` and `db:drift-check`, so copying it would delete those two scripts.
>
> **Also withdrawn:** my M5 concern that adding `@types/three` would desync `package-lock.json` and break
> `npm ci`. Adding a *script* does not touch the lockfile. The concern was real under the incorrect
> assumption and is moot under the correct one.
>
> **The lesson is the transferable part:** a plan's destination is defined by the **commit it copies
> from**, not by whatever branch happens to be checked out. A manifest comparison that does not name its
> tree is not a comparison.

**Decision.** S0 stays byte-identity-pure (source only, unchanged). A **new slice S0b — Manifest port**
follows it and makes exactly one one-line addition to the root manifest. **Copying either manifest file
is prohibited.**

**Rationale.** The `verify` script is genuinely the only thing the destination needs from the orphan's
root manifest. Verified against `origin/main`:

| Manifest | Only in the orphan | Only in `origin/main` |
|---|---|---|
| root `package.json` | `verify` | `check-docs-links:in`, `db:drift-check` |
| `frontend/package.json` | *(nothing)* | *(nothing)* |

**Exact change (S0b).**

```jsonc
// root package.json — scripts block, one added line
"verify": "node scripts/swan-brain-console/verify-all.mjs"
```

**S0b acceptance criteria.**

| # | Criterion | Command | Expected |
|---|---|---|---|
| M1 | `verify` exists at the root | `node -e "console.log(require('./package.json').scripts.verify)"` | prints the `verify-all.mjs` command |
| M2 | `@types/three` is declared | `node -e "console.log(require('./frontend/package.json').devDependencies['@types/three'])"` | `^0.169.0` — **passes as-created; no edit** |
| M3 | **No dependency was lost** | compare dependency sets before/after | 0 removals |
| M4 | **No script was lost** | compare script sets before/after | 0 removals, 1 addition |
| M5 | A clean install still resolves | `cd frontend && npm ci` | exit 0 |
| M6 | The scoped type check passes with the salvaged files | `npx tsc --noEmit -p tsconfig.three-worlds.json` | exit 0 |

**M3 and M4 are the load-bearing criteria** and are the guard against the regression this ruling exists
to prevent. They must be RED-first: temporarily remove a destination script and confirm M4 fails.

---

## D15 — Judge Mode ships unreachable · **RULING: S2 executes after S3**

**Decision.** Judge Mode arrives as **one registry row**, not as a hardcoded tab. S3 (registries) runs
before S2 (Judge Mode). S2's scope gains the `tabs.json` row and **drops** any `index.html` edit.

**Rationale.** S3's own acceptance criterion is *"a new panel needs no shell edit"*. Judge Mode is the
first real test of that criterion. Building it before S3 means writing tab wiring at `app.js:39` that
S3 then deletes — the same work twice, with the second version unreviewed. The plan's own suggested
resolution already preferred this ("the second is the smaller change").

**Evidence.** `app/index.html:173-174` loads only `/app.js` and `/onboard.js`; `grep` for `app-judge`
returns zero hits; `TAB_IDS` is a hardcoded 8-item literal at `app/app.js:39`.

---

## D16 — S3's registries are unreachable · **RULING: a constrained registry namespace**

**Decision.** S3 adds `GET /registry/<known-name>.json`, where `<known-name>` is validated against a
**fixed allowlist of registry names** (`tabs`, `sources`, `seats`). The path selects a **key**, never a
file path. The five-entry `ASSET_ROUTES` map stays fixed and untouched.

**Rationale.** Extending `ASSET_ROUTES` would turn a fixed key→asset map into a file-path router, which
is the property that currently makes the console safe against traversal. A separate, separately
allowlisted namespace keeps "path selects a key" intact while making the registries reachable.

**Required properties** (all four are acceptance criteria, not notes):
1. `<known-name>` is checked against a literal allowlist — no path concatenation, no globbing.
2. Canonical-root check on any resolved path, belt-and-braces.
3. No traversal, no remote modules, no `..`.
4. An invalid registry name returns the same shape as the existing 404, listing the allowed keys.

**Evidence.** `server.mjs:49-55` is a fixed five-entry asset map; its 404 at `:143-147` reports the
allowed keys; S3 adds four files and never extends the map.

---

## D17 — S1's tools · **RULING: direct imports; four tools in S1, the fifth in S4**

Four sub-decisions, all adopted from the plan's own suggestions after checking them:

**(a) Direct imports, not `GET /api/state`.** The MCP server is a local stdio tool; requiring a running
HTTP console makes it unavailable exactly when it is most useful and creates a second source of truth.
`03-contracts.md`'s `GET /api/state` backing claim is **deleted**; the `Imports` column in
`04-build-order.md` §S1 stands.

**(b) Degraded mode is retained but re-scoped.** With direct imports there is no console to be down, so
the original degraded-mode trigger is vacuous. It is re-scoped to: *the underlying data module fails to
load or a required file is missing → typed error, process does not exit.* The intent of B5 is preserved
— an agent gets a correctable error rather than a dead tool — without the HTTP dependency.

**(c) `swan_get_gate_health` moves from S1 to S4.** It is backed by gate result files, and the module
that reads them (`gateHealth.mjs`) is an S4 artifact. S1 ships **four** tools; S4 adds the fifth and its
acceptance gains *"the MCP tool list is now exactly five"*. This makes S1 self-contained.

**(d) The `filter` shape is fixed, and the search is bounded.**
- `swan_list_variants`: `{ filter?: { field: 'nav_model' | 'hero_mechanics' | 'grid', value: string } }`
  — the old `filter: 'nav_model'` named a *field*, not a value, so it could not narrow anything.
- `swan_search_doctrine`: an explicit directory allowlist (`docs/ai-workflow/design-brain/**`), a
  capped `limit` (default 10, maximum 50), a bounded query length, and `file:line` in every result.

**Evidence.** `03-contracts.md:290-309` (the tool table and the `GET /api/state` backing) vs the §S1
`Imports` column; `gateHealth.mjs` scheduled in §S4.

---

## D18 — The adaptive cap cannot be built · **RULING: move the probe to the frontend; make the cap injectable**

**Decision.**
1. Delete `scripts/swan-brain-console/capProbe.mjs` from §S4.
2. Add `frontend/src/pages/HomePage/three-worlds/capProbe.ts` — where `navigator.hardwareConcurrency`,
   `devicePixelRatio` and a WebGL context actually exist.
3. `renderSlots.ts` gains `configureSlots({ cap })`; `MAX_LIVE_WORLDS = 4` is **retained as the
   default**. `acquireSlot`, `slotStats` and `publishSlotStats` read the configured value.
4. The contract test asserts the **default** and the **override** separately.

**Rationale.** Two independent blockers, and the second is the one that survives even a correct
runtime choice: `MAX_LIVE_WORLDS` is an `export const` — a read-only ESM live binding — so *no* module,
in *any* runtime, can assign to it. The cap must become readable-from-configuration, which means
editing `renderSlots.ts`. And two of the three named inputs plus the entire output (the
`documentElement` dataset write) are browser-only, so a Node file cannot do the job regardless.

**Why the test must assert both cases.** The existing assertion is
`expect(slotStats()).toEqual({ inUse: MAX_LIVE_WORLDS, cap: MAX_LIVE_WORLDS })` — written against a
constant. Once the cap is dynamic that assertion keeps passing while testing nothing, which is the
"green suite certifying a broken invariant" failure this project has already been bitten by.

**Evidence.** `renderSlots.ts` (83 lines, read in full) — `:28` the declaration, `:41`/`:62`/`:75` the
three reads, no setter anywhere; `runtime.contract.test.ts:384-391`.

---

## D19 — S5's `SCENE_SIGNATURES` row has no permitted file · **RULING: give S5 a file table; `lit.ts` is S5**

**Decision.**
1. **`lit.ts` belongs to S5.** Remove it from the §S4 table. S4 is a library/CI slice; `lit.ts` is a
   scene family.
2. S5 gains a real file table:

| File | Purpose | Budget |
|---|---|---|
| `frontend/src/pages/HomePage/three-worlds/scenes/lit.ts` | `MeshPhysicalMaterial` + `transmission` families | ~280 |
| `frontend/src/pages/HomePage/three-worlds/scenes/paramsCore.ts` | the `SceneFamily` union + `FAMILY_PARAMS` + `FAMILIES` + `SCENE_SIGNATURES` | edit |
| `frontend/src/pages/HomePage/three-worlds/scenes/looks.ts` | `LOOKS` rows so a variant can reach the new family | edit |
| `frontend/src/pages/HomePage/three-worlds/__tests__/scenes.contract.test.ts` | signature ↔ construction agreement | ~120 |

**Rationale.** `SCENE_SIGNATURES`, `FAMILY_PARAMS` and `FAMILIES` are all `Record<SceneFamily, …>` over
the **closed** union in `paramsCore.ts`. Adding a family therefore needs **four edits in that one
file**, and because the records are exhaustive an omitted key is a **compile error** — the edit is
mandatory, not optional. `looks.ts` is required separately: `LOOKS` is
`Record<HeroMechanics, VariantLook>` and imports `type SceneFamily`, so without a row there no variant
can reach the new family. Neither file was listed in any slice.

**Evidence.** `paramsCore.ts:37-38`, `:41`, `:52`, `:108`; `looks.ts:31`.

---

## D20 — The screenshot diff · **RULING: narrow it, re-rank it, and use Playwright's built-in baseline mechanism**

**Decision.**
1. S4.2 is **kept but re-scoped** to: `scripts/swan-brain-console/shot-diff.mjs`, a committed baseline
   directory, and the workflow step.
2. The comparator is **Playwright's own `toHaveScreenshot` with `maxDiffPixelRatio`** — Playwright is
   already a dependency and the workflow already installs Chromium, so this adds no new dependency and
   brings baseline storage, tolerance and an update procedure with it.
3. The rationale is **rewritten** (below).

**Rationale — the original rationale was stale.** S4.2 justified itself as *"the rail-reserve class
failed twice, silently, and only a human with DevTools ever caught it. This is the highest-value
remaining guard."* That class **is already automated**: `gallery-verify.mjs` opens a
`LAYOUT OVERLAP GUARD` described as *"the repo's most-recurred defect class, finally automated"*,
scoped to the edge-anchored models — and the workflow already runs that script.

**The real gap, which is the new rationale.** The existing digest is computed by sampling **every 97th
byte** and is compared only *within a single run* (to assert the twenty renders are mutually
distinct). It has no stored reference. Consequence: a **fleet-wide palette/token regression** produces
twenty *unique* digests and **passes**. That is a genuine hole, it is exactly the class this workstream
has been bitten by before, and a baseline diff closes it. Rank S4.2 on that.

**Also required:** a documented baseline-update procedure. A diff gate whose baseline can only be
regenerated by deleting it is a gate that gets deleted.

**Evidence.** `three-worlds-fleet.yml:113`; `gallery-verify.mjs:152-156` (the sampled digest), `:157`
(the overlap guard), `:352-354` (mutual-uniqueness assertion); `docs/qa/baseline/` holds exactly one
file, the homepage `homepage-1280w.png`; no comparator in either manifest.

---

## D21 — The wrong-axis example · **RULING: use the family rename**

**Decision.** `04-build-order.md` §S5 requirement 1 cites `refract`→`shells` as the worked example,
with the hero-mechanics rename `liquid-surface`→`layered-shells` mentioned separately as a different
axis. **Applied in round 4** — recorded here for completeness.

**Rationale.** `SCENE_SIGNATURES` is keyed by **scene family**. `liquid-surface` and `layered-shells`
are **hero-mechanics** values (`threeWorldEntries.ts:123`, `skeletons.ts:36`); the family-axis rename
is `refract`→`shells` (`paramsCore.ts:104-106`). A reader following the example into `paramsCore.ts`
found nothing.

---

## Summary

| # | Slice | Ruling | Type |
|---|---|---|---|
| D14 | S0 | New **S0b**; **one** line (root `verify`); `@types/three` already present in `origin/main`; **never copy a manifest** | plan change · ⚠ **corrected** |
| D15 | S2 | **S3 before S2**; Judge Mode arrives as a registry row | reorder |
| D16 | S3 | Constrained `/registry/<known-name>.json` allowlist | plan change |
| D17 | S1 | Direct imports; **4 tools in S1, the 5th in S4**; bounded search | plan change |
| D18 | S4.3 | Probe moves to the frontend; cap becomes injectable; test both cases | plan change |
| D19 | S5 | S5 gets a file table; `lit.ts` is S5 | plan change |
| D20 | S4.2 | Narrow + re-rank; Playwright baselines | plan change |
| D21 | S5 | Family rename as the example | doc fix (applied) |

**One new slice (S0b) and one reorder (S3 before S2).** Everything else is a scope correction.

**Consequence for the review loop:** D14–D21 are now *decided*, so round 5 can verify them against the
implemented code rather than re-arguing them. The three remaining Astra documentation falsifications
are still open and are pure review work.

---

# D22 and D23 — two defects the S4 BUILD found

Recorded after S4 was implemented and measured. Full evidence: `S4-RESULTS.md`.

## D22 — S4.3 ships a probe with no permitted caller

**Class:** the D14–D21 reachability defect, recurring *inside* S4's own resolution.

D18 correctly diagnosed that `capProbe.mjs` was in the wrong runtime and that `MAX_LIVE_WORLDS` had no
seam. S4.3 implements both fixes: the probe is now `frontend/.../capProbe.ts`, and `renderSlots.ts`
exports `configureSlots({ cap })`.

But **nothing in S4's permitted file table calls it.** Every file that could — a component that mounts
the worlds — lies outside the slice. So `applyDerivedCap()` is exported and uncalled, and in production
the cap is still the static `4`.

The slice's permitted changes cannot reach the slice's deliverable. This is D14's shape exactly, found by
building the fix for a D14-shaped defect.

**Not a reason to reject S4.3** — the seam is real and the derivation is tested. It is a reason to say
plainly that the adaptive cap is *available*, not *active*, and to name the one-line change that would
activate it.

## D23 — S5's lit families reverse a documented decision, and break S4.2

**Class:** a slice whose deliverable contradicts a decision the codebase already recorded.

`SCENE_SIGNATURES`' own comment in `paramsCore.ts` states:

> "Every material below is MeshBasicMaterial / PointsMaterial / LineBasicMaterial — that is what the
> builders actually construct, because **the fleet was moved off lit PBR materials so scenes render
> identically under hardware and software GL**. The table kept declaring MeshStandardMaterial and
> MeshPhysicalMaterial long after the builders changed, so it described a fleet that did not exist."

S5 requires `lit.ts` with `MeshPhysicalMaterial` + `transmission`. That reintroduces the exact material
class the fleet was moved off, and the comment shows this was a *deliberate* move, not an accident.

Two consequences, and the second is the serious one:

1. **It reverses a documented decision.** Whether to accept lit PBR materials is Sean's call.
2. **It makes S4.2's baselines environment-dependent.** A lit PBR family renders differently under
   hardware GL and SwiftShader. Any `LOOKS` row pointing at a lit family means a baseline recorded on a
   GPU runner fails on a software runner and vice versa — so `shot-diff` becomes a gate that fails for a
   reason unrelated to the change under test. That is worse than no gate, because it trains people to
   ignore it.

**S5 is held, not skipped.** The gap it addresses — 8 families behind 20 compositions — is real, and
D19's file-table ruling is correct as far as it goes. What D19 did not weigh is the material decision it
reverses.

**If S5 proceeds, it needs one of:**
- lit families kept out of `LOOKS` (so no variant resolves to them and no baseline depends on them), or
- `shot-diff` scoped to exclude lit-family variants, with the exclusion recorded, or
- an explicit decision that hardware/software divergence is acceptable, written down.

## D24 (carried, not new) — `gallery-verify.mjs` is 553 lines

Rule 4 says 300. `gallery-verify.mjs` is **553** and appears in **no** slice's file list, so no slice may
fix it. Pre-existing, flagged rather than silently changed — changing a file outside your slice is how a
review stops being able to attribute a diff.

---

## D25 — S5 (lit families) · **RULING: REJECTED AS SPECIFIED, REDIRECTED** · and **D23 is corrected**

**Status:** decided and **implemented** (the guard half). **Nothing committed.**

### ⚠ First: a correction to my own D23

D23 argued against lit PBR materials partly by quoting `familiesA.ts:110-115`, which stated that a lit
material's uniform block "is what threw" `Cannot read properties of null (reading 'trim')` inside
Three's `WebGLProgram.getUniforms` **on the software renderer used for QA**.

**That attribution was withdrawn in round 2.** The blueprint's own `06-bans.md` carries it as ban 34:

> | 34 | Cite the withdrawn SwiftShader attribution as fact | Say "cause not established; a code-side context leak is better supported" |

`diagnostics.ts:56` says the same thing in its own words — "the crash **previously attributed** to the
software renderer". So D23 rested its strongest evidence on a claim **this project had already
retracted**, and `familiesA.ts` was still asserting that retracted claim as fact.

**The evidence is DOWNGRADED, and that is stated rather than left implicit.** The crash argument is
withdrawn. D23's *conclusion* survives on the grounds below, which do not depend on it.

### The corrected grounds

1. **Determinism is still true, as a general property.** Lit PBR output depends on the lighting
   environment and, for `transmission`, on screen-space refraction — which is *not* bit-identical
   between a hardware GL backend and SwiftShader. S4.2's `shot-diff` compares against committed
   baselines, so a lit variant would make the gate fail for reasons unrelated to the change under
   test. **This argument never needed the retracted attribution.**
2. **The visual language is additive/wireframe.** Lit PBR is off-language for this fleet.
3. **Cost under a hard context budget.** The page co-mounts up to `MAX_LIVE_WORLDS` variants under an
   explicit context cap (`renderSlots.ts`). Lit shaders are materially heavier to compile and run.

None of the three is fatal alone. Together, they make **S5 as specified the wrong change for this
fleet** — and the slice's only deliverable was `lit.ts`.

### The ruling

**S5 as written is rejected.** `lit.ts` is **struck from the file table**; no lit PBR material may be
constructed by any family, and that is now enforced by a test rather than by a comment.

**What S5 was actually for survives, and is delivered.** Read plainly, S5's real subject was the
**8-families-behind-20-compositions gap** — the fleet is compositionally rich and materially
monotonous. The mechanism for closing it safely is what the slice needed, and it now exists:

| File | Status | Purpose |
|---|---|---|
| `frontend/.../three-worlds/scenes/signatureAudit.ts` | **NEW · 278 lines** | builds every family and reports the material/geometry/object classes actually allocated; compares them against `SCENE_SIGNATURES`; enforces the unlit rule |
| `frontend/.../three-worlds/__tests__/scenes.contract.test.ts` | **NEW · 283 lines** (the file `04-build-order.md:203` named, previously unwritten) | 21 tests: the real table, four corrupted-table teeth tests, the lit ban both ways, and the GPU-freedom proof |
| `frontend/.../three-worlds/scenes/paramsCore.ts` | **unchanged** | `SCENE_SIGNATURES` was **verified accurate**, so it needed no edit |
| `frontend/.../three-worlds/scenes/looks.ts` | **unchanged** | no family was added or re-pointed |
| `frontend/.../three-worlds/scenes/familiesA.ts` | **comment only** | ban-34 violation corrected; no behavioural change |

**The file table is stated because that is D14's defect**, and a ruling that does not name its own
reachable files would commit it.

### Why the guard was the missing piece, not a bonus

`SCENE_SIGNATURES` was **never verified against reality**. `assertVariantHasGeometry()` checks only
that the declared strings start with `THREE.` and that the builder is callable — a table asserted
against itself. That is exactly why the drift recorded in `paramsCore.ts:96-106` ("the table kept
declaring MeshStandardMaterial and MeshPhysicalMaterial long after the builders changed") survived
until **human review** caught it. Adding a ninth family to an unverified table would have made the
problem worse, so the guard is the precondition for any family expansion, not a nicety.

### Measured outcome

- `scenes.contract.test.ts` → **21/21 PASS**; the real table reports **zero** problems, so
  `SCENE_SIGNATURES` is now accurate *and provably so*.
- Three-worlds suite → **119/119** across 4 files (was 98/98 across 3).
- Node console suite → **166/166**.
- **RED observed, twice, and both were real:**
  1. First run: **5 failed / 15**. Cause: I compared `THREE.MeshBasicMaterial` (declared) against
     `'MeshBasicMaterial'` (`Material.type` is bare). Fixed the audit, not the test.
  2. Then: **3 failed / 16** — `declares object THREE.InstancedMesh but built [Mesh]`. This was
     **not** a defect in the table. It is a Three.js property, measured on the installed version:

     ```
     new THREE.InstancedMesh(geo, mat, 4).type === 'Mesh'    // true
     new THREE.InstancedMesh(geo, mat, 4).isInstancedMesh    // true
     ```

     Three.js sets `type` on each hierarchy's base class; a subclass that does not override it
     inherits the parent's string. So `Object3D.type` **cannot** discriminate `InstancedMesh` from
     `Mesh`, and the `instanced` row's claim was previously **unverifiable**. `canonicalObjectName()`
     now derives the class from the `isXxx` flags, most-derived first, because `isMesh` is also true
     on an `InstancedMesh`.

### What is NOT done, and is a design decision rather than an engineering one

**No family was added.** Choosing new geometries is art direction, not correctness, and inventing
shapes to raise a count is not a fix. The *mechanism* is now proven safe — any new family's
`SCENE_SIGNATURES` row is machine-verified the moment it is written — so the remaining 8-behind-20
gap is a bounded, low-risk change **for Sean to art-direct**, with the files named above.

## D26 — two live ban-34 violations found and corrected

The withdrawn-attribution search was run across the tree after D25. Four citations exist; two were
**correct** and two were **violations**:

| Location | State |
|---|---|
| `renderSlots.ts:5-16` | **compliant** — "the exact crash this workstream spent two rounds attributing to the software renderer **before a reviewer pointed out** that a page wanting 20 co-mounted variants plus a probe is simply above the cap by construction" |
| `qa-worlds.tsx:76-80` | **compliant** — "Round 2 **withdrew** the original attribution" |
| `scenes/familiesA.ts:110-115` | ⚠ **VIOLATION — FIXED.** Asserted as fact that the uniform block "is what threw" on the software renderer |
| `SWAN-BRAIN-CONSOLE-V3-READINESS-RECEIPT-2026-09-13.md:69-70` | ⚠ **VIOLATION — ANNOTATED.** "**SwiftShader returns a null `activeInfo` from `getActiveUniform`**", called a test-rig limitation |

Both are now corrected. `familiesA.ts` states the withdrawal explicitly and keeps the unlit rule on
its own merits. The receipt is a **historical record**, so it is **annotated rather than rewritten** —
the original paragraph is preserved under a withdrawal banner naming ban 34 and giving the corrected
position.

**The finding worth keeping:** the receipt **contradicted itself three lines apart.** §4 item 5
attributes the *same* `Cannot read properties of null (reading 'trim')` signature to **blank CSS
custom properties** reaching `THREE.Color` — a code-side cause, with a reproduction — while §5
attributes it to SwiftShader. Two causes cannot own one signature, and the code-side one is the one
that was demonstrated. The document contained the better-supported explanation already; nobody had
put the two lines side by side.

---

## D27 — the gate could have certified a foreign build · **FIXED**

**Class:** reachability-is-not-identity, in the *gate itself*. Found by falling into it.

While re-verifying the console after S5, the console server refused to start:

```
Error: listen EADDRINUSE: address already in use 127.0.0.1:4599
```

A server left over from an **earlier session** owned the port. It answered `200` on `/`, its title
contained `Swan Brain Console`, and it was a **pre-S3 build** — it served five routes and returned
`{"error":"not found"}` for `/registry/tabs.json`. **Every reachability probe in the project accepted
it.**

### The two defects this exposed

1. **`verify-all.mjs` bound a FIXED port** (`:4599` for the console, `:5199` for the harness) and then
   proved readiness with a **substring marker**. If a foreign server owns the port, the server spawned
   here dies with `EADDRINUSE` while `waitFor` **returns true** — because the foreign server satisfies
   the same marker. The stage then drives the wrong build and can report **green**. A marker proves
   *which application*, never *which build*.
2. **`console-verify.mjs` had no identity check at all.** The identity guard added in S4.2 went into
   `shot-diff.mjs` and the CI workflow, but **not** here — so the same class survived in the sibling
   verifier. Fixing one instance of a defect class is not fixing the class.

### The fix

| Change | Effect |
|---|---|
| `verify-all.mjs` — `freePort()` | both browser stages now bind an **ephemeral** port; the collision is removed rather than survived |
| `scripts/swan-brain-console/verifyTarget.mjs` (**NEW**, 146 lines) | fetches a small load-bearing set of paths from the target and compares them to **local disk**: `/registry/tabs.json` (parsed-JSON), `/app.js`, `/app-shell.js`, `/app-gates.mjs` (normalised text) |
| `verify-all.mjs` stage 5 | calls `assertTargetIdentity` after readiness; a mismatch **fails the stage loudly** instead of measuring the wrong app |
| `verifyTarget.test.mjs` (**NEW**, 202 lines, 10 tests) | teeth: a 404-ing registry, a short registry, a one-byte asset difference, and an unreachable target are each rejected; CRLF is *not* treated as a different build |

`/registry/tabs.json` is deliberately in the probe set: it is the **S3 deliverable**, so its presence
alone distinguishes this build from anything before it.

### Proven against the real thing, not a fixture

Run against the leftover server still holding `:4599`:

```
http://127.0.0.1:4599/ is NOT this build. Refusing to measure it.
  /registry/tabs.json — HTTP 404 — the target does not serve this path
  /app.js — served asset differs from the asset on disk
  /app-shell.js — HTTP 404 — the target does not serve this path
  /app-gates.mjs — HTTP 404 — the target does not serve this path
  A leftover server from another session or worktree is the usual cause — check what owns the port before re-running.
```

And against this build on a free port: `IDENTITY OK — checked: /registry/tabs.json, /app.js,
/app-shell.js, /app-gates.mjs`, followed by **`console-verify` 19/19** — the first time that number has
been measured against the *right* build.

### Honest limitation, recorded

The **harness** stage still proves identity with a marker only. A content comparison is not available
there because Vite **transforms** the entry HTML and the modules it serves, so bytes on disk and bytes
on wire legitimately differ. Recorded in `verify-all.mjs` at the point of the check, with the reason,
rather than left as an unstated asymmetry. Until the harness exposes a build-id route, that stage
remains weaker than the console stage.
