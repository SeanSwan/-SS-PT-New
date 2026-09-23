# S5-RESULTS — Lit families: **rejected as specified**, redirected, and D23 corrected

**Date:** 2026-09-19 · **Branch:** `swan-brain-console-v3-salvage-20260918` · **Worktree:**
`tmp/worktrees/brain-console-salvage-20260918` · **Nothing committed. `main` untouched.**

**Ruling:** D25 (this packet's `DECISIONS-D14-D21.md`). **Supersedes** D19's `lit.ts` assignment.

---

## 1. What was asked, and what happened

| S5 as written | Outcome |
|---|---|
| `lit.ts` with `MeshPhysicalMaterial` + `transmission` | ⛔ **STRUCK.** No lit PBR material may be constructed by any family — now enforced by a test |
| `paramsCore.ts` edits (union + 3 exhaustive records) | **not needed** — `SCENE_SIGNATURES` was verified accurate and required no change |
| `looks.ts` rows | **not needed** — no family was added |
| `__tests__/scenes.contract.test.ts` — "signature ↔ construction agreement" | ✅ **BUILT** (283 lines, 21 tests) — the plan named this file; it had never been written |
| — | ✅ **`scenes/signatureAudit.ts`** (278 lines) — new, added by D25 |

**No family was added.** Choosing new geometries is art direction, not correctness, and inventing
shapes to raise a count is not a fix. The *mechanism* is now proven safe, so the remaining
8-behind-20 gap is a bounded, low-risk call for Sean with the files named above.

---

## 2. The correction to D23 — stated first, because it is the most important line here

D23 argued against lit PBR materials partly by quoting `familiesA.ts:110-115`, which asserted that a
lit material's uniform block "is what threw" `Cannot read properties of null (reading 'trim')` inside
Three's `WebGLProgram.getUniforms` **on the software renderer used for QA**.

**That attribution was withdrawn in round 2.** The packet's own `06-bans.md` carries it as ban **34**:

> Cite the withdrawn SwiftShader attribution as fact → *"cause not established; a code-side context
> leak is better supported"*

So **D23 rested its strongest evidence on a claim this project had already retracted**, and
`familiesA.ts` was still asserting that retracted claim as fact.

**The evidence is downgraded, and the downgrade is stated rather than left implicit.** The crash
argument is withdrawn. D23's conclusion survives on three grounds that never needed it:

1. **Determinism.** Lit PBR depends on the lighting environment, and `transmission` on screen-space
   refraction, which is not bit-identical between hardware GL and SwiftShader. `shot-diff` compares
   against committed baselines, so a lit variant would make the gate fail for reasons unrelated to
   the change under test.
2. **Language.** The fleet's visual language is additive/wireframe; lit PBR is off-language.
3. **Cost.** The page co-mounts variants under an explicit WebGL-context cap (`renderSlots.ts`). Lit
   shaders are materially heavier to compile and run.

---

## 3. Why the guard was the precondition, not a bonus

`SCENE_SIGNATURES` was **never verified against reality**. `assertVariantHasGeometry()` checks only
that the declared strings start with `THREE.` and that the builder is callable — **a table asserted
against itself**. That is precisely why the drift recorded at `paramsCore.ts:96-106` ("the table kept
declaring MeshStandardMaterial and MeshPhysicalMaterial long after the builders changed") survived
until **human review** caught it ("Both GLM seats flagged it").

Adding a ninth family to an unverified table would have made the problem worse. The guard had to
exist first. It now does, and it is enforced by ban 36.

---

## 4. Evidence

### Suites

| Suite | Result |
|---|---|
| `scenes.contract.test.ts` | **21/21 PASS** |
| three-worlds (4 files) | **119/119** (was 98/98 across 3) |
| node console suite (11 files) | **166/166** |
| `signatureAudit.ts` | **278 lines** — under the Rule 4 cap |
| `scenes.contract.test.ts` | 283 lines (tests are outside the Rule 4 walk; under 300 regardless) |

### The real table is verified

`auditSignatures(() => makeContext())` → **`[]`**. `SCENE_SIGNATURES` is accurate **and now provably
so**, rather than accurate-by-luck.

### RED observed twice, and both REDs were real

**RED #1 — 5 failed / 15.** Cause: I compared `THREE.MeshBasicMaterial` (declared) against
`'MeshBasicMaterial'` (what `Material.type` reports — the bare class name). Fixed the **audit**, not
the test, because the table was right and the comparison was wrong.

**RED #2 — 3 failed / 16.** The audit reported:

```
declares object THREE.InstancedMesh but built [Mesh]
```

This was **not** a defect in the table. It is a Three.js property, measured on the installed version:

```
new THREE.InstancedMesh(geo, mat, 4).type === 'Mesh'    // true
new THREE.InstancedMesh(geo, mat, 4).isInstancedMesh    // true
```

Three.js sets `type` on each hierarchy's **base** class, and a subclass that does not override it
inherits the parent's string. `Object3D.type` therefore **cannot** discriminate `InstancedMesh` from
`Mesh` — which means the `instanced` row's claim was **unverifiable** before this work, not merely
unverified. `canonicalObjectName()` derives the class from the `isXxx` flags, most-derived first,
because `isMesh` is also true on an `InstancedMesh`. Enforced as ban 37.

### Guard falsification — what has actually been seen to fail

| Guard | Falsified? |
|---|---|
| `auditSignatures` — real table reports zero problems | ✅ observed RED twice (both above) |
| `auditSignatures` — catches a corrupted **geometry** row | ✅ exactly 1 problem, `points`/`mismatch` |
| `auditSignatures` — catches a corrupted **object** row | ✅ exactly 1 problem, `lines`/`mismatch` |
| `auditSignatures` — catches a corrupted **material** row | ✅ 1 problem naming both the declared and built class |
| `auditSignatures` — catches a **missing** row | ✅ `shells`/`undeclared` |
| `auditLitMaterials` — catches a **declared** lit material | ✅ `shells`/`lit` |
| `auditLitMaterials` — catches a lit material in a **built scene** | ✅ via a seeded scene; this is the test that would have caught S5 |
| `canonicalObjectName` — `InstancedMesh` despite `.type === 'Mesh'` | ✅ pinned against the live Three.js object |
| GPU-freedom: no builder reads `ctx.renderer` | ✅ `Proxy` that throws on any property read |
| "permits exactly the three unlit classes" | ⚠ written after the module; first run green — **not claimed as falsified** |

**Every teeth test is falsifiable by construction**, because each hands the audit a deliberately
corrupted input rather than relying on a mutation performed once and remembered.

---

## 5. Ban-34 sweep — two live violations found, two correct citations left alone

Four citations of the withdrawn attribution exist in the tree. Two were **compliant** and two were
**violations**.

| Location | State |
|---|---|
| `renderSlots.ts:5-16` | **compliant** — "…the exact crash this workstream spent two rounds attributing to the software renderer **before a reviewer pointed out** that a page wanting 20 co-mounted variants plus a probe is simply above the cap by construction" |
| `qa-worlds.tsx:76-80` | **compliant** — "Round 2 **withdrew** the original attribution" |
| `scenes/familiesA.ts:110-115` | ⚠ **VIOLATION — FIXED.** Asserted as fact that the uniform block "is what threw" on the software renderer |
| `SWAN-BRAIN-CONSOLE-V3-READINESS-RECEIPT-2026-09-13.md:69-70` | ⚠ **VIOLATION — ANNOTATED.** "**SwiftShader returns a null `activeInfo` from `getActiveUniform`**", described as a test-rig limitation |

`familiesA.ts` now states the withdrawal explicitly, names ban 34, and keeps the unlit rule on its own
merits. The receipt is a **historical record**, so it is **annotated rather than rewritten**: the
original paragraph is preserved beneath a withdrawal banner, with the corrected position and the
three reasons.

**The finding worth keeping:** the receipt **contradicted itself three lines apart.** §4 item 5
attributes the *same* `Cannot read properties of null (reading 'trim')` signature to **blank CSS
custom properties** reaching `THREE.Color` — a code-side cause, with a reproduction — while §5
attributes it to SwiftShader. Two causes cannot own one signature, and the code-side one is the one
that was demonstrated. **The document already contained the better-supported explanation; nobody had
put the two lines side by side.**

---

## 6. New bans added to `06-bans.md`

| # | Rule |
|---|---|
| 36 | **Never verify a declaration table against itself.** Construct the artifact and compare. |
| 37 | **Never discriminate an `Object3D` subclass by `.type`.** Use the `isXxx` flags, most-derived first. |

---

## 7. Open, and explicitly not closed here

1. **The 8-families-behind-20-compositions gap is still open** — by decision, not by omission. It is
   art direction. The mechanism is proven safe.
2. **S4.2's baseline set is still empty** (`docs/qa/baseline/three-worlds/` holds only its README), so
   the new `shot-diff` CI step will fail until baselines are committed — blocked by the local
   `node_modules/.vite/deps` safe-delete refusal. Recorded, not papered over.
3. **D22** — `applyDerivedCap()` still has no permitted caller; the adaptive cap is available, not
   active.
4. **D24** — `gallery-verify.mjs` is 553 lines, in no slice's file table.
5. **Nothing is committed.** `main` is untouched and no production system was contacted.

---

## 8. Addendum — the verification gate itself could have certified a foreign build (D27)

Found by **falling into it** while re-verifying the console after S5. The console server refused to
start: `EADDRINUSE 127.0.0.1:4599`. A leftover server from an earlier session owned the port — it
answered `200`, its title contained `Swan Brain Console`, and it was a **pre-S3 build** (five routes;
`{"error":"not found"}` for `/registry/tabs.json`).

**Every reachability probe in the project accepted it.**

| Defect | Fix |
|---|---|
| `verify-all.mjs` bound a **fixed** port and proved readiness with a **substring marker**. A foreign server on that port makes the spawned server die with `EADDRINUSE` while `waitFor` returns **true** — so the stage drives the wrong build and can report green | `freePort()` — both browser stages now bind an **ephemeral** port |
| `console-verify.mjs` had **no identity check at all** — the S4.2 guard went into `shot-diff.mjs` and the CI workflow, but not the sibling verifier | `verifyTarget.mjs` (**new**, 146 lines) + `assertTargetIdentity` called in stage 5 |

`verifyTarget.mjs` compares **served content against content on disk** for `/registry/tabs.json`
(parsed JSON), `/app.js`, `/app-shell.js` and `/app-gates.mjs` (normalised text). The registry is in
the probe set deliberately: it is the **S3 deliverable**, so its presence alone separates this build
from anything before it.

**Proven against the real leftover server, not a fixture:**

```
http://127.0.0.1:4599/ is NOT this build. Refusing to measure it.
  /registry/tabs.json — HTTP 404 — the target does not serve this path
  /app.js — served asset differs from the asset on disk
  /app-shell.js — HTTP 404 — the target does not serve this path
  /app-gates.mjs — HTTP 404 — the target does not serve this path
```

Against this build on a free port: identity OK, then **`console-verify` 19/19** — the first time that
number was measured against the *right* build. `verifyTarget.test.mjs` adds **10 tests** (176 total on
the node side, was 166), including a regression case shaped exactly like the incident.

**Recorded limitation:** the harness stage still proves identity by marker only, because Vite
transforms the HTML and modules it serves, so disk bytes and wire bytes legitimately differ. Noted at
the point of the check rather than left as an unstated asymmetry.

### Running totals after this turn

| Suite | Result |
|---|---|
| node console suite | **176/176** (12 files; was 166) |
| three-worlds (vitest) | **119/119** (4 files; was 98) |
| `console-verify` (browser, identity-gated) | **19/19** |
