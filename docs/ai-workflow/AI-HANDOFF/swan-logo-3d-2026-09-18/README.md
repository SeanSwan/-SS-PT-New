# Swan logo → 3-D object — closeout packet

Date: 2026-09-18 · Author: Sable · Status: **complete through round 3, uncommitted, awaiting Sean's go-ahead**

Sean's brief: *"I want it to be pixel perfect with perfection… we're gonna keep going until
we get perfection, and we're gonna do hostile reviews until we run it and it's 100%."*

Read this with `HOSTILE-REVIEW.md` beside it. This file says what shipped and how much of it
is *known*; that one says what was wrong and how it was proven fixed.

---

## 0. The one thing to read if you read nothing else

**A single flat PNG cannot constrain depth.** The reference is one 1024×1024 front view. The
badge's extrusion depth, the swan's back face, and the surface relief are **not observable in
the source** — they are invented, tuned until the front view matched. That is not a defect in
this implementation; it is a property of the input. Every number on the X/Y axis below is
measured against pixels. Every number on the Z axis is a design choice.

If you rotate it past roughly 40° and something looks wrong, the fix is a decision, not a bug
fix — there is no ground truth to check it against.

**And the X/Y fidelity is not at its ceiling either.** Round 2 measured it: flat per-facet
shading costs **36.7%** of the achievable interior residual against the reference, because the
reference's facets carry gradients and mine are flat. Round 3 **realised that headroom** — each
facet now carries a fitted linear plane, evaluated per vertex — and found it was a genuine
fidelity gain, not a boundary artifact. What remains unreachable is facet-boundary
anti-aliasing, which is irreducible; see §3 and H-2.

---

## 1. What shipped

| | |
|---|---|
| **Component** | `frontend/src/components/SwanMark3D/` — `swanMarkScene.ts` (281), `SwanMark3D.tsx` (261), `sceneSupport.ts` (54), `index.ts` (4) |
| **Tests** | `SwanMark3D.contract.test.ts` — **26 tests**, in the repo suite (not just the harness) |
| **Geometry** | `frontend/src/three/swanMark/` — `swanMarkFactory.ts` (267), `swanMarkSpec.ts` (95), `badgeField.ts` (92) |
| **Payload** | `swan-mark.mesh.json` — **315,415 B** raw / 91,300 B gzip (canonical `swan-mark.mesht1.8.json` is 470,000 B) |
| **Mesh** | 8,648 welded vertices · 6,295 triangles · 126 facets · `POLY_TOL 1.8` |
| **Shading** | per-facet **linear plane** per channel — 123/126 facets carry a gradient, 3 fall back to flat on MAE |
| **Fallback** | `assets/Logo.mark128.png` — 21,372 B (the 1.2 MB `Logo.png` is NOT used here) |
| **Header** | `Logo.tsx` — `<img>` replaced by `<SwanMark3D className="logo-mark" decorative />` |

**Rule 4:** every module is under the 300-line cap (largest is 281). Both splits this slice required
were pure code motion and were proven **pixel-identical** by comparing before/after render checksums,
not merely asserted — see ME-2 in `HOSTILE-REVIEW.md`.

**Additive only.** Nothing existing was modified except `Logo.tsx`, and the size ladder there is
untouched (36 / 32@768 / 28@480 / 28@375 / 44@2560 / 52@3840, `margin-right` 12/10/8/0/16/20).
`git status` shows two new directories and one edited file.

### Using it

```tsx
// CSS-driven — the default. Size the container, the mark follows.
<div style={{ width: 36, height: 36 }}><SwanMark3D /></div>

// Or pass a size directly.
<SwanMark3D size={36} />

// Decorative inside an already-labelled control (what the header does):
<SwanMark3D size={36} decorative />

// A slow idle rotation (ignored under prefers-reduced-motion):
<SwanMark3D size={96} drift={0.15} />
```

Sizes are free. One mesh serves all of them — there is no per-size asset and no size prop to keep
in sync. The default `supersample: 2` was chosen from in-browser measurement, not guessed; the
reasoning and the losing options are documented at the top of `swanMarkScene.ts`.

`three` and the 323 KB spec are **dynamically imported**, so they never touch the header bundle.
Until they arrive — and permanently if WebGL is missing, the import fails, or motion is reduced —
the existing PNG shows in an identical layout box. No shift, no flash.

---

## 2. Confidence table

Per region, what the number rests on.

| Region | Basis | Confidence |
|---|---|---|
| Badge disc — circle, centre (0.5, 0.5), r = 0.5 | fitted to the 1024² alpha mask, degree 4, 6 radial powers | **OBSERVED** |
| Badge field — polynomial, degree 5, 21 terms | least-squares fit to badge pixels outside the swan | **OBSERVED** (fit) |
| Swan silhouette — 84-point outline | traced from the alpha mask | **OBSERVED** — IoU 0.990166 vs reference |
| Facet partition — 126 regions | k-means on colour + position | **OBSERVED** — tiles the silhouette 100.000000% |
| Facet *boundaries* between similar colours | partition is exact; *where* a boundary falls is a fit | **[LIKELY]** |
| Per-facet flat colour | median of the facet's pixels | **OBSERVED** — 19/126 have spread > 8 (see D-3) |
| 2 px dark rim | present in the reference | **OBSERVED** — reproduced deliberately (D-2) |
| Drop shadow | present in the reference | presence **OBSERVED**, parameters **[LIKELY]** |
| **Badge extrusion depth** — `badgeDepth: 0.075` | **not in the source** | **INVENTED** |
| **Swan back face** | **not in the source** | **INVENTED** (front mirrored) |
| **Surface relief** — `relief: 0.055` | **not in the source** | **INVENTED**, tuned |

Depth is 7.5% of the badge diameter; relief is 5.5%. Both are exposed as props if you want to
tune them by eye.

---

## 3. Gates — all green at this revision

| Claim | Command | Result |
|---|---|---|
| spec is a verified subset; dropped fields unread; type honest | `python evidence/verify_spec_parity.py` | **PASS** — saved 135,249 B raw / 51,246 B gzip |
| component fidelity per size | `python evidence/size_fidelity_component.py` | **PASS** — mean **3.98**, app ladder **3.90**, worst 28px **4.31** (target 5.0) |
| component live / backing / geometry / fallback | `node harness/shoot-component.mjs` | **PASS** — 10/10 live, offset (0,0) everywhere, silent |
| WebGL-absent fallback | `node harness/shoot-component.mjs --nogl` | **PASS** — 10/10 PNG fallback, correctly sized, **silent** |
| the WebGL probe is load-bearing | `python evidence/red_me1_webgl_probe.py` | **PASS** — RED→GREEN, re-runnable |
| header integration at every breakpoint | `node harness/shoot-logo.mjs` | **PASS** — 375/430/480/768/1440/2560/3840 + click/Enter/Space/a11y/reduced-motion |
| it is actually 3-D | `node harness/shoot.mjs --turntable` | **PASS** — edge-on slab at 90°/270° |
| types | `cd frontend && ./node_modules/.bin/tsc -p tsconfig.swanmark.json --noEmit` | **EXIT 0** — provably not vacuous |
| contract guards, in the real suite | `cd frontend && npx vitest run src/components/SwanMark3D` | **PASS** — 18/18 |
| those guards are not vacuous | `python evidence/red_contract_guards.py` | **PASS** — 4/4 mutations go red, tree restored byte-identical |
| the bundle split, against a real build | `cd frontend && vite build --outDir ../tmp/x` | **PASS** — dynamic imports confirmed, no `three` in `index.html` preloads |
| what the header downloads | `node harness/measure_header_weight.mjs` | **1,177.7 KB PNG** — see H-1, open |
| flat vs gradient facet shading | `python evidence/experiment_facet_shading.py` | **−36.7% interior** available — see H-2, open |
| where the fidelity error lives | `python evidence/analyze_error_map.py` | edge 17%, inner 9%, **core 62%** |

`tsconfig.swanmark.json` exists because whole-project `tsc` OOMs (fails at 4 GB *and* 8 GB heap).
It was proven non-vacuous by injecting `const __probe: number = "not a number"` → `error TS2322`,
EXIT=2, then removing it.

---

## 4. QA sheets

Four of these are working sheets from the build and are kept for provenance, not for review.
The two that matter are flagged.

| Sheet | Size | Read it for |
|---|---|---|
| **`evidence/sheet-final-header.png`** | 3288×406 | ⭐ **The review sheet.** PNG vs 3-D side by side at every ladder size, 6× nearest, mean error printed on each tile. |
| **`evidence/sheet-final-turntable.png`** | 4150×544 | ⭐ **The 3-D proof.** Eight yaw angles. At 90°/270° the coin goes edge-on to a thin slab. |
| `evidence/sheet-size-fidelity.png` | 8480×530 | per-size error curve |
| `evidence/sheet-pass1-spec.png` | 4176×1164 | pass ladder, blockout |
| `evidence/sheet-pass2-mesh.png` | 4176×1164 | pass ladder, mesh |
| `evidence/sheet-pass3.png` | 4176×1164 | pass ladder, form |
| `evidence/sheet-pass4.png` | 4176×1164 | pass ladder, material |
| `evidence/shot-comp-nogl-fullpage.png` | 1400×400 | the no-WebGL fallback, captured |

---

## 5. Rule 38 — post-task hygiene

This slice created a **large** evidence tree: ~330 PNGs and ~20 scripts under
`docs/ai-workflow/AI-HANDOFF/swan-logo-3d-2026-09-18/evidence/`. Naming it explicitly rather
than leaving it to be discovered.

| Item | Count | Disposition |
|---|---|---|
| Sizing-policy sweep shots (`shot-comp-{ss1,ss2,ss4,ss8,ss16,ss32,ss64,...}-*.png`) | ~230 | **Archive candidate.** Superseded by the chosen policy; only `ss2` is live. |
| `dbg-*.png` diagnostic renders | 11 | **Delete candidate.** Scratch from the 16px hunt. |
| `.py` gates + `harness/*.mjs` | ~20 | **Keep.** These are the re-runnable evidence for every claim in §3. |
| `swan-mark.spec.json` | 1 | ⚠️ **STALE — see below.** |
| `extract_mesh_v1.py.bak` | 1 | Archive or delete. |

**Stale artifact trap:** `evidence/swan-mark.spec.json` is a *superseded* revision —
`POLY_TOL 1.6`, 116 facets, 316,553 B. The shipped spec is `swan-mark.mesht1.8.json`
(`POLY_TOL 1.8`, 126 facets, 458,089 B, md5 `53c6365ac460`), byte-identical to
`swan-mark.mesh.json`. A reader who opens `swan-mark.spec.json` and quotes 116 facets will be
quoting a file that no longer describes the object. Recommend renaming it
`swan-mark.spec.t1.6.superseded.json`.

Nothing has been committed. `frontend/src/components/SwanMark3D/` and
`frontend/src/three/swanMark/` are both untracked; `Logo.tsx` is modified in place.

---

## 6. Open items — yours to decide, not mine to action

Ordered by measured impact, not by effort.

1. **The fallback PNG is 1.2 MB and the header fetches it on every page.** Measured, not
   guessed: `1,177.7 KB` of PNG transferred to display a 28–52px mark. A 128px fallback is
   **20.9 KB** (1.8% of it). `Logo.png` is shared by ~12 components, so this is partly an
   app-wide asset question — but the header is what puts it on every page's critical path.
   See H-1.
2. **There is ~37% of unclaimed interior fidelity**, if you want it. My own round-1 finding
   D-3 claimed flat per-facet shading was "the design"; measuring it says flat shading costs
   14.6% at facet boundaries and **36.7% deep inside** versus a per-facet gradient. Fixing it
   means per-vertex colour on a **welded** mesh, so it needs unwelding (~3× the vertices and
   payload) or a facet-index texture. Real gain, real cost, your call. See H-2.
3. **The glow is Galaxy-era cyan.** `Logo.tsx` glows with `rgba(0, 217, 255, …)`. That is not
   in the Crystalline Swan set — `ice-wing #60C0F0` is. **Pre-existing**, not introduced here,
   and changing it alters the header's look in a way you did not ask for. Left alone.
4. **`drift` defaults to 0.** The mark is static, so the header runs render-on-demand and
   costs zero GPU when idle. If you want the idle rotation, `drift={0.15}` is the natural
   rate — but the 60 fps budget (Rule 25) is then unmeasured.
5. **16px measures 5.89**, above the 5.0 target. Below your 28px ladder, so the gate excludes
   it. Reported, not hidden.
6. **Commit.** Nothing is staged. Render auto-deploys from `main`, so this waits for your word.

---

## 7. Explicitly UNVERIFIED

- **No real-GPU measurement.** Every browser figure here is SwiftShader (software). A hardware
  compositor may filter differently. **Do not quote these as hardware numbers.**
- **The LANCZOS floor of 1.47–2.44 is unreachable** through either browser path. Best measured is
  **3.98**. A lower claim is measuring something else.
- **The DPR watcher** (ME-3) is verified by construction only; the harness runs at one DPR.
- **The 60 fps drift budget** is unmeasured; the default is `drift: 0`.
