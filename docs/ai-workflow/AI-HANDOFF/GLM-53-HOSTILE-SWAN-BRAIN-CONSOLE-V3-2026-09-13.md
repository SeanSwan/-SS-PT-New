# HOSTILE REVIEW PACKET — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-HOSTILE-PACKET-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Tokens:** 11776 in / 14311 out (reasoning: 11461) | total 26087
**Wall:** 213.8s

---

## VERDICT: REVISE

## FINDINGS (ranked by blast radius)

### F1 — The structural-divergence "proof" is guaranteed a priori; the real number of distinct scene structures is 8, not 20 `UNSUPPORTED CLAIM` (C1)
Blast radius: the packet's central claim. If C1 falls, the fleet is 8 scene families × tuned numbers × 20 sets of enum strings.
Evidence: In `skeletons.ts`, all 20 `hero_mechanics` values are distinct, and `fingerprintOf` is `nav|hero_mechanics|grid`. Therefore the triple can never collide unless a mechanic name is literally reused — which `LOOKS: Record<HeroMechanics, VariantLook>` makes impossible by type. `findCollisions` is unfalsifiable; it proves the builder named 20 things differently, nothing more. Meanwhile `looks.ts` maps those 20 mechanics onto 8 families (`terrain` ×2, `lines` ×3, `rings` ×2, `orbit` ×3, `points` ×2, `instanced` ×3, `refract` ×3, `waveform` ×2). Distinctness at the geometry level tops out at 8. `familySignature()` returns `${family}:${SCENE_SIGNATURES[family].geometry}` — the second term is a constant per family, so this is the family name wearing a costume. The `≥3 numeric axes overridden` rule in `lookIssues()` is satisfied by any three numbers differing (e.g. `lines` at count 22/34/48 — same builder, same material, same structure). Finally, `pack.ts` shows every variant renders the *same* `SHARED` sub, CTAs, proof, sections, and trust blocks; only headline+sub vary. `layout.ts` (the only thing that could rescue C1) is not shown. The only observational divergence evidence anywhere in the packet is "20 unique digests," which establishes that 20 screenshots are not pixel-identical — the weakest possible distinctness bar, cleared by changing a dot count.

### F2 — First WebGL context loss is silently swallowed while the telemetry keeps reporting success `DEFECT`
Blast radius: C2's entire evidence channel; also every production variant.
Evidence: `runtime.ts`: `const onLost = (e) => { e.preventDefault(); losses += 1; if (losses > 1) { stop(); setLost(true); ... } };`
Why it is wrong: after the first `webglcontextlost`, `running` stays true, the RAF loop keeps running, and `renderer.render()` on a lost context does not throw — GL calls become silent no-ops — so `framesRef.current += 1` keeps climbing and `publish()` keeps writing non-zero `frames` (and JS-side draw-call counters) to `host.dataset`. The canvas is black. `lost` only trips on a *second* loss event, which cannot fire until the context is restored — and there is no `webglcontextrestored` listener and no restore call anywhere in the file. So `lost` is effectively unreachable, the loop burns CPU on a dead context forever, and the exact instrumentation `gallery-verify` reads (`dataset.frames`, `dataset.drawCalls`) is produced by the code under test and demonstrably can report health on a dead canvas. "211–271 frames, non-zero draw calls" is therefore self-reported and has a concrete, identified lie vector. As for the cap of 3 per family (§3.2): 3 is actually the pigeonhole minimum for 20 items in 8 bins, so that bound is principled — it is also the only bound in the divergence story that is.

### F3 — The packet's own signature table contradicts the mechanic names; combined with the admitted material move, the fleet looks flattened to fit the test rig `DEFECT / UNSUPPORTED CLAIM` (C2, C3)
Blast radius: what "renders live Three.js" means; whether the SwiftShader response was diagnosis or evidence removal.
Evidence: `paramsCore.ts` `SCENE_SIGNATURES`: every family declares `THREE.MeshBasicMaterial` / `PointsMaterial` / `LineBasicMaterial` — including `refract: { geometry: 'THREE.SphereGeometry', material: 'THREE.MeshBasicMaterial' }`. `looks.ts` maps `liquid-surface`, `shader-morph`, and `lens-refract` all to that family.
Why it is wrong: a `MeshBasicMaterial` sphere is unlit, flat color — it cannot refract, transmit, or morph shaders, under any name. Either `SCENE_SIGNATURES` misdescribes the implementation (in which case the test oracle in F4 is a wrong table), or the implementation genuinely is unlit spheres, in which case three variant names promise physics the scene cannot perform. This matters double because the builder *admits* "moving three.js material families" as part of the response to the SwiftShader failure. Downgrading materials is exactly how you make a rig-specific uniform-parsing crash disappear — and it changes what every user sees, not just what the rig sees. The attribution itself ("test rig failure") is unverified: no minimal repro is shown distinguishing "20 contexts on one page" from "any variant with enough shader programs," and per-variant isolation would hide the latter. Note the contradiction: `playgroundRegistry.ts` was modified to spread the 20 variants into a shared page — if the playground ever mounts many at once, the "rig-only" crash is now reachable from a production surface. `[UNSURE]` whether the playground lazy-mounts.

### F4 — `assertVariantHasGeometry` observes nothing; it is a tautology `DEFECT` (C7)
Blast radius: any confidence derived from the "13/13 fleet contract" suite.
Evidence: `looks.ts`: `assertVariantHasGeometry` checks (a) that hand-written strings in `SCENE_SIGNATURES` start with `'THREE.'`, and (b) that `typeof builderForMechanic(mechanics) === 'function'` — but `builderFor` returns a closure for any family present in the map; the builder is never invoked, no geometry is constructed, no frame is rendered.
Why it is wrong: this test cannot fail for any family that exists in the lookup tables, and can pass while the scene draws nothing (see F2 for the mechanism by which even the runtime would keep reporting success). A test named "assertVariantHasGeometry" that would pass against a family whose builder returned an empty `WorldHandle` is not a test of geometry. It is a string-format check on the author's own documentation table.

### F5 — The engine's BLOCKED status is a string literal, not a derived state `DEFECT` (C5)
Blast radius: the console's headline status, and any tooling that reads `/api/state`.
Evidence: `engineState.mjs`: `return { durableWrites: 'BLOCKED', reason: extractGateReason(readme), ... }`.
Why it is wrong: `durableWrites` can never be anything but `'BLOCKED'`, regardless of what the README, the engine source, or reality says. The derived part is only the `reason` prose — and to its credit, `extractGateReason` does notice a README that stops declaring the fail-closed gate. But the machine-readable field that anything would branch on is hardcoded, so the console is structurally incapable of noticing the engine being unblocked; it would report `BLOCKED` with a reason string saying "re-review." "Shows the learning engine honestly" is therefore half-true at best: the read-only half of C5 (GET-only, no write route) is carried by `server.mjs`; the honest-display half is not.

### F6 — The copy gate: 46 phrases shown, 78 claimed; lexical matching with trivial evasion; no consumer shown `UNSUPPORTED CLAIM + MISSING WORK` (C4)
Blast radius: C4 entirely.
Evidence: §1 states "78 banned phrases in 5 classes." Counting the file as given in §4.5: 16 + 11 + 8 + 5 + 6 = 46. Either the file shown is not the file described or the count is wrong; the packet's own numbers don't reconcile.
Why it is wrong: the discrepancy aside, the gate bans strings, not meaning. Concrete evasion from the shown patterns: "game changing" (no hyphen, no "changer") matches neither `game-changing` nor `game changer`; "dive deep into" escapes `dive into`; any hyphenation defeats every multi-word rule since `-` counts as a boundary. Passing this gate is compatible with fully generic copy. And nothing in the packet shows `findSlop`/`longHeadlines` being invoked — by a test, a build step, or a runtime check — against either the JSON blob or the copy that actually renders (§3.7). A gate with no shown consumer enforces nothing.

### F7 — Verification is one-shot scripts plus generated committed code, with no drift or CI guard shown `MISSING WORK` (C7, C6, C8)
Blast radius: every green number in §2 is a claim about one afternoon, not about the repo's future state.
Evidence: `gallery-verify.mjs`, `console-verify.mjs`, and the two vitest suites are listed under `scripts/` and as file names; no CI wiring, no pre-commit hook, no check that `generate-worlds.mjs` / `wire-playground.mjs` output matches the committed `v01..v20` files is shown. The 20 `anti_specs` per variant ("no centered hero text block", …) appear only as strings in `skeletons.ts`; nothing shown evaluates them. No router file is shown for the `/` → `HomePage.V4` claim, and no line counts are shown for the ≤300-line claim, even though `layout.ts` ("20 nav models + 20 grids as CSS") and the 40 committed variant files are the obvious candidates to breach it. A 20-entry modification to a registry another page consumes is "additive" only under a definition of canonical the packet never states.

## CLAIMS I COULD NOT SUPPORT

- **C1 — NOT supported.** Fingerprint uniqueness is guaranteed by construction; ≤8 distinct scene structures exist; copy is shared constants; the only divergence artifact (layout CSS) is unshown; digests prove non-identity only.
- **C2 — NOT supported.** All evidence is self-reported telemetry from the code under test, with an identified failure mode (F2) in which it reports success on a dead context. The all-Basic-material fleet (F3) also weakens what "genuinely render" is being sold as.
- **C3 — NOT supported.** No minimal repro shown; the material-family move is directionally consistent with rig-pleasing; the playground spread makes the "rig-only" framing questionable.
- **C4 — NOT supported.** F6.
- **C5 — SPLIT.** "Cannot write to it" is carried by `server.mjs` (GET/HEAD only, fixed allowlist, no write route). "Shows the engine honestly" is a hardcoded string (F5). Residual localhost risk is modest: no ACAO header means cross-origin reads fail even under DNS rebinding, but `/api/state` discloses repo structure to *any local process*, and the Host header is not validated.
- **C6 — NOT supported.** Route behavior asserted, not shown; registry modification admitted with unstated effects.
- **C7 — PARTIALLY UNDERMINED.** The test logic that is shown is tautological (F4) or vacuous (≥3 numeric axes); one test was admittedly rewritten rather than satisfied; no CI enforcement.
- **C8 — NOT supported.** Zero line counts appear in the packet.

## WHAT I COULD NOT ASSERT (UNSURE)

- Contents/behavior of `playgroundRegistry.ts` and how the playground mounts the fleet (lazy vs. all-at-once) — determines whether the SwiftShader crash is reachable in production.
- `layout.ts` — whether 20 nav models are materially different CSS or parametrized variants of a few layouts.
- `familiesA.ts`/`familiesB.ts` — actual materials used (contradicts or confirms `SCENE_SIGNATURES`), and whether builders read `ctx.size` at build time (it is still `{1,1}` when `build()` runs; `resize()` executes after).
- `gallery-verify.mjs` / `console-verify.mjs` sources — how digests are compared, what thresholds constitute "unique," what actually reads `host.dataset`.
- `fleet.contract.test.ts` contents — which 13 assertions exist beyond the logic shown in `looks.ts`/`skeletons.ts`.
- Whether `findSlop`/`longHeadlines` are called anywhere.
- Line counts for all new files; the three.js version (affects whether `THREE.Color` throws or warns on unknown strings — if it warns, the `catch` fallback in `tokens.ts` is dead code and non-color alphabetic token values silently become white, since `/^[a-z]+$/i` accepts any bare word).
- The router file proving `/` mounts `HomePage.V4` and that no route imports the parked registry.
