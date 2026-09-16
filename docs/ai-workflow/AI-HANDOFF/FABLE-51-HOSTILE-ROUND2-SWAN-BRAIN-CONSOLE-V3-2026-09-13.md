# HOSTILE REVIEW PACKET — ROUND 2 — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by Fable Final-Decider

**Reviewer:** OpenRouter `anthropic/claude-fable-5.1`
**Document:** docs\ai-workflow\AI-HANDOFF\GLM-HOSTILE-PACKET-ROUND2-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Seed:** (none)
**Tokens:** 10123 in / 18279 out · **Cost:** ~$1.0152 · **Wall:** 245.4s · **finish_reason:** stop

---

# FABLE 5 — HOSTILE REVIEW + FINAL RULING
**Subject:** Round-2 packet — Swan Brain Console v3 + 20-variant Three.js fleet

## VERDICT: LOCK-WITH-CHANGES
(Mapped to the packet's own scale: **REVISE**. Architecture and direction are locked; the code goes back with the mandatory changes in §C. Nothing below re-raises a round-1 defect. Three of the seven "fixes" introduced regressions, and one load-bearing layout claim in §4 is false as written.)

---

## A. FIX VERDICTS (§1)

| Fix | Ruling | Why (one line) |
|---|---|---|
| FIX 1 context loss | **INTRODUCES A NEW DEFECT** | `restored` is set true on first restore and never reset; `contextLost: losses > 0 && !restored` is therefore permanently `no` after the first recovery — the second (permanent) loss reports a healthy context on a dead canvas. Exactly the round-1 symptom, one loss later. |
| FIX 2 durableWrites | **INCOMPLETE** | Direction is right (fail to `UNKNOWN`), but `'BLOCKED'` is derived from README *prose*. Prose cannot verify an adapter. A README that says "must no longer remain fail-closed" still matches `includes('remain fail-closed')` and reports BLOCKED. |
| FIX 3 ResizeObserver | **CORRECT** (observer) / **UNSUPPORTED** (zero-area) | The RO wiring is fine. The claim that the zero-area 1×1 buffer bug is fixed lives in `resize()`, which is not shown. |
| FIX 4 scroll progress | **INTRODUCES A NEW DEFECT** | `passed = vh*0.85 - rect.top`. For a 100vh hero mounted at page top (`rect.top = 0`, the primary use case for a *front page*), `p = 0.85` at zero scroll. All 20 scenes dolly by `scrollProgress * dolly` → every camera starts 85% dollied in, and the remaining 15% completes in 0.15vh of scroll. Binary was replaced with "already finished." |
| FIX 5 colour | **INCOMPLETE** | Correct on the measured case (`unset`). Silent on the real palette case: an aliased token (`--ice-wing: var(--primary-light)`) or a derived token (`color-mix(...)`) round-trips `probe.style.color` unresolved (specified value, probe not attached), THREE whitens it, the guard catches it, and the scene silently renders the hardcoded fallback with **zero telemetry**. A worker-bot cannot tell that the palette is not on screen. |
| FIX 6 tests | **UNSUPPORTED CLAIM** | "27/27" with zero test bodies shown. This packet already documented (FIX 7) that a builder-asserted count was wrong. Counts are not evidence; assertions are. |
| FIX 7 phrase count | **CORRECT** | 46 is now derived from the module rather than asserted. Immaterial to quality (see §3.7). |

---

## B. NEW FINDINGS (ranked by blast radius)

### F1 — WebGL context budget leak; the "SwiftShader" crash has a better explanation  [DEFECT]
**Blast radius:** all 20 variants, the gallery test rig, and production navigation between variants.
**Evidence:** `hasWebGL()` (§4 diagnostics.ts) creates a canvas, calls `getContext('webgl2') ?? getContext('webgl')`, and never releases it. `WorldPage` calls it via `useMemo(() => hasWebGL(), [])` **per mount**, not per module. The runtime cleanup (§4 runtime.ts) calls `renderer.dispose()` but never `renderer.forceContextLoss()`. `handle.dispose?.()` is optional.
**Why it is wrong:** Chrome caps active WebGL contexts (~16) and evicts the oldest by firing `webglcontextlost` on it. 20 probes + 20 real canvases in one gallery page = 40 contexts. Navigating between variants leaks a probe and a renderer context each time until GC. The eviction is *indistinguishable* from a driver fault — it fires the exact FIX 1 path, and the `losses > 1` gate means a user on healthy hardware lands on the permanent poster after browsing two variants.
Further: `gl.getActiveUniform()` returns `null` on a lost context, and three.js's `WebGLUniforms` then dereferences `info.name` inside `parseUniform`. That is *precisely* the crash signature in §3.4 (`parseUniform dereferencing a null activeInfo.name`). The SwiftShader attribution is not just uncontrolled — it is probably wrong, and the real cause is this leak. See §E.

### F2 — `--rail-left/--rail-right` are set on `Nav` and read by its sibling `Content`; the reserve never applies  [DEFECT]
**Blast radius:** 6 of 20 nav models (`vertical-index`, `gutter-index`, `stepper-left`, `side-rail`, `split-rail`, `progress-spine`) on every desktop viewport; invisible to every verifier listed.
**Evidence:** §4: `Nav` declares `--rail-left: 76px` inside its own rule; `Content` reads `var(--rail-left, 0px)`. `Nav` and `Content` are siblings under `WorldRoot`. Custom properties inherit to descendants, not laterally.
**Why it is wrong:** `Content` always resolves `0px`. Its left padding is `clamp(1.25rem, 4vw, 4rem)` = 20–64px; the rail is `width: 68px` (or 76px), `position: absolute; left: 0; z-index: 3`, with a 72% obsidian backing. At 1440px, 4vw = 57.6px < 68px → the rail sits on the headline's first characters. The comment "so a rail can never sit on the headline" is a false load-bearing claim: a worker-bot reading it will build more rails on top of it. `gallery-verify` checks frames and draw calls, not geometry overlap, so the 24/24 is silent here.

### F3 — `lost` never reaches `motion`; the "lost twice" fallback copy is unreachable and the first loss shows a black canvas  [DEFECT]
**Blast radius:** every variant on any context loss.
**Evidence:** §4 WorldPage: `motion = resolveMotion(tier, prefersReduced, webgl)` — `lost` is not an input. The `StaticNote` for `lost` is guarded by `motion === 'poster'`. FIX 1: on first loss `stop()` runs but `setLive(false)` is gated on `losses > 1`.
**Why it is wrong:** After two losses `motion` is still `'live'`, `<CanvasLayer>` stays mounted, and the branch that would display the "context was lost twice" message can never render. On the *first* loss the loop is stopped, `live` stays `yes`, `Poster $hidden={live}` stays hidden — the user looks at a frozen/black canvas with `data-live="yes"` until (and only if) `webglcontextrestored` fires. Some drivers never fire it. Combined with the FIX 1 `restored` bug, telemetry says healthy, UI says live, screen is black.

### F4 — `drawCalls` is stale after `stop()`  [DEFECT]
**Evidence:** `snapshot()` reads `renderer.info.render.calls`. three.js resets `info` at the start of `render()`; after `stop()` no render runs, so the last non-zero count persists. `isPresenting` survives only because `running` is false — but `data-drawCalls` is the attribute `gallery-verify` reads ("non-zero draw calls"). A stopped canvas still passes that assertion.

### F5 — Every interactive control is inert in *both* modes  [MISSING WORK / DEFECT]
**Evidence:** `onActivate = (label) => { if (preview) return; void label; }`. After the early return, the body is `void label`. Nothing navigates, ever.
**Why it matters:** §3.1 sells "20 distinct interaction models." The interactions do nothing. The `preview` prop implies a working non-preview path; it lies to the next builder.

### F6 — House-rule compliance is asserted nowhere  [UNSUPPORTED CLAIM]
Not shown: `NavItem` and `Action` dimensions (44px rule — `floating-pill` has `padding: 0.35rem` at `font-size: 0.78rem`, which is almost certainly < 44px); text colour and contrast over `color-mix(... 60%, transparent)` rails above an animated scene (4.5:1 cannot be guaranteed over a live canvas at 60% alpha); Dual-Button Glow on `Action $intent`; whether `SHARED.proof` uses "26+ years / NASM-protocol"; whether the 46-phrase gate contains `NASM-certified`, `yoga`, `meditation`. None of these are in any listed verifier.

---

## C. RULINGS ON EVERY OPEN DECISION

1. **Gate `lost` on `losses > 1` (FIX 1)** — **CONFIRM for permanence, OVERRIDE for visibility.** Permanent fallback after two losses stands; visible fallback (`setLive(false)`, poster shown) must happen on loss #1. Track a boolean `contextLost` set true in `onLost`, false in `onRestored`; delete `restored`.
2. **README string as `durableWrites` signal (FIX 2)** — **OVERRIDE.** Emit `DECLARED_BLOCKED` (prose) vs `VERIFIED_BLOCKED` (adapter/config check) vs `UNKNOWN`. Never emit bare `BLOCKED` from prose. Match case-insensitively and reject if a negation token precedes the phrase within the sentence.
3. **`anchor = 0.85` default (FIX 4)** — **OVERRIDE.** Piecewise: if the host's initial `rect.top <= 0` (top-mounted), `p = max(0, -rect.top) / max(rect.height, vh)`; otherwise keep the anchor formula. Add the 100vh-at-top test case: `p(rect.top=0) === 0`.
4. **Probe-and-verify colour approach (FIX 5)** — **CONFIRM the shape, OVERRIDE the probe.** Attach the probe to `document.documentElement` and read `getComputedStyle(probe).color` so `var()` chains and `color-mix()` resolve. Count fallbacks and publish `data-colorFallbacks`; `gallery-verify` asserts `=== 0`.
5. **`assertVariantHasGeometry` relabelled "registry" (§3.2)** — **CONFIRM**, on condition `gallery-verify` gains `renderer.info.render.{triangles|lines|points} > 0` per family (drawCalls alone passes an empty draw) and reads `drawCalls` only while `running === 'yes'`.
6. **All materials downgraded to `MeshBasicMaterial` for renderer independence (§3.3)** — **CONFIRM the decision, OVERRIDE the names.** Rename `liquid-surface`/`shader-morph`/`lens-refract` → `layered-shells`/`shell-morph`/`shell-lens` (or any names that do not promise transmission). A worker-bot will otherwise "fix" the mismatch by adding `MeshPhysicalMaterial.transmission` and undo the independence decision.
7. **"20 unique grids / 18 nav / 20 interaction / 8 scene" honest claim (§3.1)** — **CONFIRM the wording, OVERRIDE "20 interaction models"** until F5 is fixed (there are zero). Fingerprint must include `scene_family|look` and reject duplicate `(family, look)` pairs.
8. **SwiftShader attribution disclosed, no control (§3.4)** — **OVERRIDE.** Not accepted as a disclosure. Fix F1, then re-run the failing rig. If the crash vanishes, the attribution was wrong; record it.
9. **Host/Origin not validated, disclosed (§3.5)** — **OVERRIDE.** It is a five-line allowlist (`Host ∈ {localhost, 127.0.0.1, [::1]}` with port). Fix it. Read-only exposure of repo structure to a rebinding origin is still exposure.
10. **No CI/hook for verifiers (§3.6)** — **OVERRIDE.** Non-negotiable: one `npm run verify` chaining tsc + all four suites + rule-4 line check, wired to pre-push. Evidence about one afternoon is not evidence.
11. **Lexical copy gate (§3.7)** — **CONFIRM as a *lexical* gate; OVERRIDE its scope.** Stem-match (`empower\w*`, `world[- ]class`) and add the house-rule terms (`NASM-certified`, `yoga`, `meditation`) as hard failures with a test that feeds each one and asserts rejection. v20's headline stays; the gate is not a taste oracle and must not be described as one.
12. **`preview` prop with a non-preview branch (F5)** — **OVERRIDE.** Delete the dead branch; make `preview` implicit until the routing phase. A prop that does nothing is a trap for the next builder.
13. **`hasWebGL()` per mount via `useMemo` (§4)** — **OVERRIDE.** Module-level memo; release the probe with `WEBGL_lose_context.loseContext()`.
14. **"essential tier" in user-facing copy** — **OVERRIDE.** Internal jargon leaks to users. "Static preview — motion is reduced on this device."
15. **250ms diag interval; `labels.slice(0, 6)`; `container-type: inline-size` + `5cqi` headline; `overflow-x: clip`** — **CONFIRM**, all four.
16. **Round-1 refutations (§2.1–2.5)** — **CONFIRM** all five as refuted; 2.5's concession is absorbed into ruling 11.

---

## D. WHAT TO CHANGE BEFORE BUILD (mandatory; each with an assertion)

1. **Context budget (F1):** module-cached `hasWebGL` + `loseContext()`; `renderer.forceContextLoss()` in cleanup; `WorldBuilder.dispose` becomes required in the contract. Assert: mount all 20 in one page, `data-contextLosses === "0"` for all after 4s.
2. **Loss state (F3/FIX 1):** boolean `contextLost`; `setLive(false)` on first loss; `motion = lost ? 'poster' : resolveMotion(...)`. Assert: simulate two `webglcontextlost` events → `data-motion="poster"`, `data-contextLost="yes"`, StaticNote present.
3. **Stale drawCalls (F4):** publish `0` when `!running`. Assert in the same test.
4. **Rail reserve (F2):** hoist `--rail-left/right` to `WorldRoot` via `$model`. Assert: `getBoundingClientRect` of `Nav` ∩ `Headline` has zero area for all 20 at 1440 and 1024 widths.
5. **Scroll progress (FIX 4):** piecewise formula; test `p(top=0, height=vh) === 0` and monotonic to 1.
6. **Colour resolution (FIX 5):** attached probe + `getComputedStyle`; `data-colorFallbacks`; assert 0 in gallery.
7. **durableWrites tri-state (FIX 2)** with negation guard; engine-contract test for each state.
8. **House-rule verifier (F6):** in `gallery-verify`, assert every `button` bbox ≥ 44×44; run an axe/contrast pass on nav text against a solid-colour sample of the backing (or raise rail alpha to ≥ 85% and text-shadow); assert `SHARED.proof` contains "26+ years" and not "certified"; gate test for the three house-rule terms.
9. **Host allowlist** on the console server; one test with a spoofed `Host`.
10. **Rename refract mechanics; delete `preview` dead branch; fix tier copy.**
11. **`npm run verify` + pre-push hook.** Show the script body in the receipt, not a count.

Rule 4 note: `runtime.ts` is at 298 lines and items 1–3 add code. Split loss/restore handling into `contextLifecycle.ts` *before* editing, not after.

---

## E. FINAL LOCKED SEQUENCE

0. **Wire `npm run verify` first** (D11) — so every subsequent step is run against the same gate, not an afternoon's memory.
1. **`contextLifecycle.ts` split + F1 context budget + F3/FIX-1 loss state + F4 drawCalls** (D1–D3). One PR; these are one subsystem.
2. **Control experiment (ruling 8):** re-run the SwiftShader-crashing rig unchanged except for step 1. Record outcome in the receipt.
3. **Rail hoist + layout intersection verifier** (D4).
4. **Scroll progress piecewise** (D5).
5. **Colour resolution + fallback telemetry** (D6).
6. **House-rule verifier + copy gate stems/terms + proof strings** (D8, ruling 11).
7. **durableWrites tri-state + Host allowlist** (D7, D9) — console-side, independent of the fleet.
8. **Renames, dead-branch removal, copy wording** (D10).
9. **Receipt:** show test bodies for every new assertion above, not counts.

I would not build in the packet's order (fixes 1→7 as numbered) because FIX 1 and FIX 4 are currently regressions and everything visual sits on top of F2; the gate (step 0) must exist before the fixes so the green is reproducible.

---

## F. SINGLE HIGHEST RISK + DE-RISK

**Risk: the WebGL context budget leak (F1).** It corrupts the evidence base — `gallery-verify` 24/24 passes or fails depending on GC timing and how many variants the rig mounts; it produces the exact `parseUniform` null-`name` stack that was attributed to SwiftShader; and in production it converts healthy hardware into the "lost twice → permanent poster" path after a user browses two variants. Every other finding is visible or locally testable; this one hides inside a plausible-sounding disclosure and will be re-attributed to the GPU forever if not caught now.

**De-risk before build:**
- Module-level `hasWebGL` memo, release via `WEBGL_lose_context.loseContext()`.
- `renderer.forceContextLoss()` + required `dispose` in unmount.
- New verifier: mount all 20 variants in a single page, then navigate the gallery sequentially 30 times; assert `contextLosses === 0` on every host and no `parseUniform` in console errors.
- Run that verifier on the same rig that crashed. If it passes, §3.4 is closed as *misattributed*, not *disclosed*.

---

## G. [UNSURE] — needs repo access
- Whether `resize()` actually handles zero-area hosts (FIX 3 claim, code unshown).
- Whether three.js's colour keyword table lacks `rebeccapurple` as the packet asserts (I believe it is present; immaterial to the ruling, material to the packet's "measured" credibility).
- Whether jsdom's `cssstyle` normalises `hsl()`/space-separated `rgb()` as claimed — the colour path has no browser-run evidence.
- Whether `gallery-verify` mounts variants concurrently or serially (determines how quickly F1 bites in the rig).
- Whether SSR is in play (`hasWebGL` → `false` on server → `data-motion` hydration mismatch).
- Contents of `SHARED.proof`, `NavItem`, `Action` styles, and the 46-phrase list.

**This ruling is FINAL. The sequence in §E is LOCKED. Build against §D; report against §D's assertions.**
