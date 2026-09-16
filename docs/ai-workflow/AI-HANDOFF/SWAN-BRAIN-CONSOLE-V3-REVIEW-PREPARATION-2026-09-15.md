# Swan Brain Console V3 — Review-Preparation Packet (Mega-Blueprint)

- **Date:** 2026-09-15 · **Author:** ZCode (GLM) seat · **Status:** ACTIVE — prepared for the Astra mega-blueprint pass Sean sequenced after the round-4 hostile review
- **Provenance note:** a prior session reported creating `outputs/REVIEW-PREPARATION.md`; no such file exists on disk (round-4 finding F8). THIS packet is the review-preparation artifact of record. It lives in AI-HANDOFF per the documentation conventions rather than at a new repo-root `outputs/` directory.
- **Supplements:** `SWAN-BRAIN-CONSOLE-V3-BLUEPRINT-2026-09-13.md` (original build blueprint), `SWAN-BRAIN-CONSOLE-V3-READINESS-RECEIPT-2026-09-13.md` (rounds 1–3), `ZCODE-HOSTILE-ROUND4-SWAN-BRAIN-CONSOLE-V3-2026-09-15.md` (round 4).

---

## 1. What this is

A single self-contained brief so the Astra pass (and any fresh seat) can upgrade the console workstream without re-deriving four rounds of history: what was asked, what exists, what is proven, what the contracts are, where the bodies are buried, and — Sean's actual ask — **what to upgrade, enhance, and close as missing gaps**.

## 2. The ask, reconstructed

Sean asked for: (1) 20 completely different Three.js front pages based on his real homepage; (2) page language that does not read as AI-written; (3) an enterprise console where agents build variants (20–50) and he picks the best; (4) all governed by the SWAN Design Brain rather than model taste.

**Honest shape of the delivery:** 20 unique layouts / 18+ nav models / 20 interaction models over **8 scene families**; copy gated by a mechanical anti-slop filter; a read-only localhost console. "Completely different" is TRUE for structure and FALSE for scene geometry — Sean judges the fleet on layout/interaction distinctness, and the family-fidelity gap is a named upgrade (§7-G).

## 3. Architecture (as it is after round 4)

```
scripts/swan-brain-console/            — operator console (zero-dep, GET-only, Host allowlist)
  server.mjs ── static app/ + /api/state (read-only snapshot)
  engineState.mjs   — derives DECLARED_BLOCKED / UNKNOWN from the engine README (never bare BLOCKED)
  fleetData / doctrine / copyPack — read-time counts, never transcribed
  gallery-verify.mjs — 109 browser checks: render, overlap, palette mutation, context budget,
                       hand-off, house rules (contrast, 44px), reduced-motion freeze
  console-verify.mjs — 17 checks on the console UI itself
  verify-all.mjs      — npm run verify: tsc → vitest → engine → gallery → console (boots both servers)
  engine-contract.test.mjs — 12 node --test guards on honest engine reporting

frontend/src/pages/HomePage/three-worlds/   — the fleet (parked; canonical homepage untouched)
  runtime.ts (299 lines) — useThreeWorld: slot pool → bootWorld canvas/renderer → frame loop →
                           observeHost → context-loss policy → diagnostics timer → hand-off teardown
  renderSlots.ts  — MAX_LIVE_WORLDS=4 pool; document-level budget; publishSlotStats for QA
  worldBoot.ts    — canvas is created PER SETUP (a force-lost context can never be re-gotten)
  loop.ts         — RAF factory; a throwing scene stops and reports once
  observe.ts      — ResizeObserver + pointer + scrollProgressFor(anchor: 'load' | 'travel')
  contextLoss.ts  — pure state machine + listener wiring; poster on FIRST loss, fatal on second
  tokens.ts       — browser-authoritative CSS colour resolution → THREE.Color; fallback counter
  layout.ts / worldStyles.ts — 20 nav models + 20 grids as real CSS; rail reserves that work
  copy/pack.ts + copy/antiSlop.ts — house copy + the gate (phrases + stems + house vocabulary)
  v01..v20/ + registry.ts + skeletons.ts — generated variants + divergence contracts

frontend/qa-worlds.{html,tsx} — dev-only measurement harness (?only=vNN isolates one variant)
frontend/tsconfig.three-worlds.json — scoped strict type-check (CI-feasible at 4GB heap)
.github/workflows/three-worlds-fleet.yml — contracts job + headless-Chromium renders job
```

**The one invariant to never break:** contexts live only while a world holds a slot (≤4 per document), and the canvas element dies with each teardown. Reusing a canvas across a teardown resurrects a force-lost context — the exact crash class this workstream spent three rounds burying.

## 4. Verification matrix (the gates that now exist)

| Gate | Command | Count | Catches |
|---|---|---|---|
| Type (fleet scope) | `npx tsc --noEmit -p tsconfig.three-worlds.json` | — | phantom fields, bad imports (CI: 4GB) |
| Type (full tree, local) | `npm run verify` stage 1 (14GB heap) | — | whole-tree drift |
| Structure/copy | vitest `three-worlds/__tests__/` | 64 | registry divergence, copy slop (incl. stems + house vocab), rule 4, canonical isolation |
| Engine honesty | `node --test engine-contract.test.mjs` | 12 | hardcoded write verdicts, negated gates, write controls |
| Render truth | `gallery-verify.mjs` | 109 | black-canvas scenes, palette fallbacks, inert palettes (mutation probe), rail overlaps, context budget, **slot hand-off**, **contrast < 4.5:1**, **< 44px controls**, **reduced-motion leak** |
| Console UI | `console-verify.mjs` | 17 | boot, keyboard nav, overflow 320→2560 |
| Aggregate | `npm run verify` | 5 stages | everything above, one command, cross-platform |

## 5. Traceability (blueprint contracts → current proof)

| Contract | Proof today |
|---|---|
| R1 20 variants, real Three | 20 lazy components import `three`; browser frames/primitives per variant |
| R2 structural divergence | nav/grid/mechanic tuples unique (config uniqueness, honestly labelled) + 20/20 screenshot digests |
| R3 parked, canonical untouched | route-import + HomePage.V4 tests |
| R4 anti-AI-slop copy | findSlop gate incl. round-4 stem/hyphenation/house-vocab classes |
| R5 console reads real state | engineState derives from README clause + negation guard |
| R6 no invented metrics | copy resolves from marketingStats; composition test allows stat splices only |
| R7 engine fail-closed honored | `writeControls: []`, GET-only server, 3-state verdict |
| R8 line caps / house rules | rule-4 test; contrast/44px/reduced-motion now MEASURED in browser (round 4) |
| R9 context budget | cap 4 pool + hand-off + canvas==live assertions |
| R10 tradeoffs recorded | per-variant tradeoff strings, non-empty |

## 6. Known limitations (standing, disclosed)

1. **8 scene families behind 20 compositions** — the honesty gap; the fingerprint test proves config uniqueness only.
2. **`shell` families cannot refract** — unlit `MeshBasicMaterial` shells; family names were renamed honest, physics not yet built.
3. **Contrast measured against the declared surface**, not every composited canvas pixel.
4. **`VERIFIED_BLOCKED` unreachable** — no engine probe exists; console reports declarations only.
5. **Console seats/memory/ship tabs are honest placeholders** — shipping a model-seat picker before a verified identity check would repeat recorded misfires.
6. **No CI run has ever executed** (nothing is committed); the workflow's feasibility argument is scoped-tsc + measured heap numbers, not a green run badge.
7. **Hand-off rebuild cost** — a returning world re-compiles shaders (~tens of ms); by design, invisible at scroll speeds.

## 7. UPGRADE & ENHANCEMENT PROPOSALS (for the Astra pass — ranked by product value)

**A. Judge Mode (the missing product loop).** The console is read-only, but Sean's actual job is *picking winners*. Add a client-side A/B judge: two variants side-by-side, keyboard 1/2/E flags, verdicts accumulate in browser localStorage and export as a JSON/Markdown receipt via download. No server writes — the GET-only contract holds — and the export IS the promotion evidence for §7-J.
**B. Adaptive context cap.** `MAX_LIVE_WORLDS=4` is a desktop constant. Probe once (`navigator.hardwareConcurrency`, `WEBGL_debug_renderer_info` SwiftShader detection, `devicePixelRatio`, coarse pointer) and publish the cap; the console UI shows it. Mobile previewing 20 variants then actually works.
**C. Screenshot-diff regression in CI.** The 20/20 unique-digest check proves distinctness, not stability. Store per-variant Playwright snapshots and diff with a tolerance in the renders job — visual drift (the rail-reserve class) gets caught without a human with DevTools.
**D. Copy gate surfaced in the console.** `copyPack.mjs` already loads the pack; render each variant's live findSlop/stem/house-vocab results as a panel. Sean sees *why* a line reads as slop instead of trusting a count.
**E. Per-variant scroll choreography.** The anchor system (load/travel) generalizes: let each skeleton declare a progress→dolly easing curve and per-chapter camera beats, authored in the skeleton, verified by a unit test per variant. This is what makes 20 pages feel like 20 *films*, not 20 poses.
**F. Lit/refraction families (close the fidelity gap).** `shell-lens` → `MeshPhysicalMaterial` with `transmission`, `layered-shells` → additive depth-sorted shells with lighting. The families stop being honestly-named fakes and become what their labels promise. Largest visual-upgrade lever.
**G. Canvas-pixel contrast worst case.** Extend the contrast gate: sample the canvas framebuffer region under each text block (readPixels works headless with `preserveDrawingBuffer` on the QA build) and measure against the BRIGHTEST sampled backdrop. Closes limitation §6.3.
**H. Console tab for the verifiers.** The console should render the latest gallery/console-verify results (embed the JSON the scripts print) so Sean sees gate health at the same URL where he judges. Requires one file-existence read — still GET-only.
**I. Nightly CI for console-verify.** The console stays localhost-only, but a scheduled workflow can boot it headless and run console-verify nightly, so the 17 checks stop being afternoon-only evidence.
**J. Promotion receipt generator.** "Promote vNN → route" is a separately reviewed commit by doctrine. Build a console button that emits the Canonical Surface Receipt scaffold (rule 26 fields pre-filled: route mount, JSX usage, API paths n/a, evidence links) so the promotion review starts from evidence, not memory.

**Deliberately NOT proposed:** model-seat picker (blocked on verified identity check), one-click promote (bypasses review gates), engine writes (blocked on the signed authority adapter).

## 8. Sequencing

1. Kimi K3 round-4 review (commit gate) — Sean-authorized spend.
2. Astra mega-blueprint pass consumes §7, kills/re-ranks/adds.
3. Sean judges the fleet on the console (layout/interaction distinctness is the honest axis).
4. On Fable Final-Decider go: commit the round-4 state; then work §7 in the order Astra + Sean set.
