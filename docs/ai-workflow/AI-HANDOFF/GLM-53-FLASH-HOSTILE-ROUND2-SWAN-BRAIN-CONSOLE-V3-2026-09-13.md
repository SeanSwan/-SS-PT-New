# HOSTILE REVIEW PACKET — ROUND 2 — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-HOSTILE-PACKET-ROUND2-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Tokens:** 5991 in / 15014 out (reasoning: 12711) | total 21005
**Wall:** 355.6s

---

## VERDICT: REVISE

## FIX VERDICTS

- **FIX 1 — INTRODUCES A NEW DEFECT.** `restored` is never reset on loss, so the *fatal* second loss publishes `contextLost: "no"` — the exact misreport the fix exists to prevent, occurring at the most important moment.
- **FIX 2 — INCOMPLETE.** Polarity is right (UNKNOWN is fail-safe) but `BLOCKED` is now asserted from a substring in a file the policed party controls.
- **FIX 3 — CORRECT.** ResizeObserver + cleanup + passive listeners are all correct.
- **FIX 4 — INTRODUCES A NEW DEFECT.** Continuous now (goal met), but every variant loads mid-animation; see F1.
- **FIX 5 — INCOMPLETE.** The builder's own evidence table shows the fix silently swaps every named CSS keyword to the fallback color; see F4.
- **FIX 6 — INCOMPLETE.** 27/27 green coexists with the two regressions above, so those paths are untested or pinned wrong; see F5.
- **FIX 7 — CORRECT.** 16+11+8+5+6 = 46; arithmetic verified.

## FINDINGS

### F1 — Every variant loads mid-dolly; the authored rest pose is unreachable [DEFECT]
**Blast radius:** all 20 scenes, first paint, every visitor.
**Evidence:** `travel = Math.max(rect.height, vh) || 1; passed = vh * anchor - rect.top` with `anchor = 0.85`, applied as `camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly`. At load, a front page sits at `rect.top = 0`, so `p = 0.85 * vh / travel`. For a `min-height: 100vh` `WorldRoot` (the exact case the CSS establishes), `travel = vh` and **p = 0.85 at scroll position 0**. Full dolly (`p = 1`) is reached when `rect.top = -0.15vh` — the entire scroll animation completes in the first 15% of a viewport of scrolling. For a 2vh host, the hero loads at p ≈ 0.43 and the bottom 42% of the section sits pinned at p = 1.
**Why it is wrong:** the round-1 formula evaluated to 0 at `rect.top = 0` for both tall and short hosts; the fix changed load behavior as a side effect. No visitor ever sees `cameraZ` as authored. Either the 27 tests don't cover the load pose, or they pin p(load) > 0 as correct — neither is defensible for a hero-dolly design. Fix: `passed = (vh - rect.top)` for tall hosts (progress through the viewport, 0 at load), or clamp against `vh * (1 - anchor)` as the zero point.

### F2 — Telemetry reports "not lost" on the fatal second context loss [DEFECT + UNSUPPORTED CLAIM]
**Blast radius:** every verifier, dashboard, or human reading `data-contextlost`.
**Evidence:** snapshot computes `contextLost: losses > 0 && !restored`. `onRestored` sets `restored = true` permanently; `onLost` never resets it. Sequence loss→restore→loss: `losses = 2, restored = true` → `contextLost = false`. Meanwhile `losses > 1` fires `setLost(true)`, so the React note renders *"the GPU context was lost twice"* in the same DOM where the 250 ms interval publishes `data-contextlost="no"`. The claim "telemetry now publishes the loss state so it cannot look healthy on a corpse" is contradicted by the code shown. `isPresenting` is only saved incidentally, via `d.running`.
**Why it is wrong:** `restored` conflates "has ever restored" with "restored since the most recent loss". It must be cleared in `onLost` (or track `lossesAtLastRestore` and compare).

### F3 — The write gate is verified by prose the policed party controls [UNSUPPORTED CLAIM]
**Blast radius:** any tooling that consumes `durableWrites === 'BLOCKED'`.
**Evidence:** `const gateDeclared = Boolean(readme && readme.includes('remain fail-closed')); const durableWrites = gateDeclared ? 'BLOCKED' : 'UNKNOWN'`. An engine-side agent — the exact actor this gate polices — can flip UNKNOWN→BLOCKED by inserting the literal phrase into the README. Conversely, a wording edit ("fail-closed by design") flips a live gate to UNKNOWN and demands human re-review for no reason. The reason string itself admits the console "cannot verify whether a signed authority adapter exists" — then asserts BLOCKED from one hop of indirection over a substring.
**Why it is wrong:** `BLOCKED` remains an unsupported claim, now with a plausible derivation. Since the console is GET/HEAD-only it cannot *test* the gate; the honest positive state is "README DECLARED — unverified". If BLOCKED must stay, bind it to something the prose can't casually satisfy (a pinned hash of the gate section, or the gate declaration adjacent to a version the console recognizes).

### F4 — Named CSS colors now silently render as the fallback [DEFECT]
**Blast radius:** any token using a CSS keyword; designer-authored palettes.
**Evidence:** the builder's own table: `rebeccapurple → 'rebeccapurple'` (valid; passes `normalizeCssColor`), and "valid CSS; THREE does not know it". So `c.set('rebeccapurple')` warns-and-whitens, `r=g=b=1`, the white-literal regex doesn't match the candidate, and `toColor` returns `fallbackHex`. Same for all ~148 named keywords. The round-1 crime (rendering a color the author didn't specify, silently) persists for this class — the wrong color changed from white to `fallbackHex`, and nothing is surfaced: no warning, no dataset flag on the host.
**Why it is wrong:** the fix's stated principle is "verify rather than trust", but white-equality can only detect the total-failure case. `CSS.supports('color', v)` (in addition to the REJECTED_VALUES set for CSS-wide keywords) classifies named keywords correctly and was available.

### F5 — The 27/27 claim does not support what it is cited for [UNSUPPORTED CLAIM]
**Blast radius:** confidence in FIX 1–5.
**Evidence:** absent. Two behavioral regressions (F1, F2) ship alongside 27 passing regression tests that each, per the packet, target the fixed paths. Therefore either the tests never execute `scrollProgressFor` with `rect.top = 0`, or they assert p > 0 at load; and they never assert `data-contextlost` after a second loss. A green count is not coverage evidence unless the pinned assertions are shown for these two cases.

## ATTACK ON THE DISCLOSED LIMITATIONS (§3)

- **#1 (8 families / 20 pages): acceptable as disclosure, rationalising as framing.** The honest numbers (20 grids, 18 nav models, 20 interaction models, 8 scene geometries) are real work, and nav/interaction divergence is visible. But the hero scene *is* the product of a "Three.js fleet", and 8 is the number that governs visual divergence. The fingerprint `nav_model|hero_mechanics|grid` is authored by the party claiming diversity — a self-graded exam. Acceptable **iff** every external claim is rewritten to "8 scene families across 20 compositions" and no artifact still says "20 completely different front pages".
- **#2 (registry check): acceptable** as relabelled. Condition: its passes are never cited as render evidence alongside the gallery numbers.
- **#3 (unlit "refract"): rationalising — the worst item in the packet.** "Renderer-independent materials" is a defensible engineering trade; the names `lens-refract`, `liquid-surface`, `shader-morph` over layered unlit transparent shells are not. The cheap honest fix existed: rename (`layered-glass`). The expensive honest fix existed: feature-detect `MeshPhysicalMaterial` transmission. Choosing neither, while writing a packet sophisticated enough to disclose it, is precisely the rationalisation §3 asks me to catch.
- **#4 (SwiftShader attribution): not acceptable as recorded.** The attribution is exactly the claim class §0 bans: asserted without control. The control is ~30 minutes (20 trivial scenes under SwiftShader, co-mounted). Run it or strike the attribution from the record.
- **#5 (Host/Origin validation): rationalising.** A one-line Host allowlist closes DNS rebinding on a read-only server; leaving it open to ship later is not a tradeoff, it's an omission with a trivial patch. Severity is capped by the fixed asset allowlist.
- **#6 (no CI): acceptable**, honestly framed. FIX 2's README read at least re-evaluates at runtime; the rest are point-in-time, and the packet says so.
- **#7 (lexical gate): acceptable**, and the v20 self-disclosure is genuinely good. Note the irony worth recording: FIX 7's proudest correction (46, not 78) added precision to a gate too weak to catch the builder's own stock headline.

## [UNSURE]

- Whether all 20 `WorldPage`s co-mount on one route. If yes, 20 simultaneous live WebGL contexts likely exceeds Chrome's per-page context cap (~16), forcing context losses; the new machinery would mask this by degrading variants to poster.
- Whether the three.js version in use re-uploads textures/geometry on context restore. FIX 1 rebuilds nothing on `onRestored` — on versions that don't, a restored canvas renders black while `isPresenting` returns true (frames continue from the pre-loss counter).
- Whether `frames` from `useThreeWorld` is per-frame React state (→ 60 Hz re-renders of `WorldPage`) and whether React's `data-frames` and the 250 ms `publishDiag` interval double-write the same attribute.
- `extractGateReason` implementation and the stability/placement of the `GATE_DECLARATION` string in the README.
- Whether any shipped variant token actually uses a named CSS keyword (sets F4's severity from latent to live).
- Whether any variant has ≥85 vh of content above `WorldRoot` (would soften F1's load-pose numbers, not the 0.15 vh completion band).
- Whether the scroll tests deliberately pin p(load) > 0.
