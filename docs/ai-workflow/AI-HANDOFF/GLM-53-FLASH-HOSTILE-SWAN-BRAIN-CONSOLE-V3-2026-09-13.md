# HOSTILE REVIEW PACKET — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by GLM (glm-5.3-flash)

**Model:** glm-5.3-flash
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-HOSTILE-PACKET-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Tokens:** 11776 in / 16697 out (reasoning: 13412) | total 28473
**Wall:** 367.3s

---

## VERDICT: REVISE

## FINDINGS (ranked by blast radius)

### F1 — The harness's health telemetry has silent lie-modes; "frames climbing + draw calls" can be reported for a canvas that renders nothing [DEFECT]
Blast radius: C2's entire evidence chain, plus every future verification run that trusts `data-frames`/`data-drawCalls`.
Evidence: `let losses = 0; const onLost = (e) => { e.preventDefault(); losses += 1; if (losses > 1) { stop(); ... } }` — the **first** context loss is swallowed: the rAF loop keeps running, `renderer.render` on a lost context does not throw, so `framesRef.current += 1` keeps incrementing and `data-frames` keeps climbing with `live === true`. There is no `webglcontextrestored` handler and no rebuild path. Separately: `const size = { width: 1, height: 1 }` is corrected only by `resize()`, which is bound to `window.addEventListener('resize')` only — **no ResizeObserver** — so a host that is zero-area at effect time (fonts/layout settling, common in generated card layouts) is clamped by `Math.max(1, …)` to a 1×1 drawing buffer forever, stretched by CSS, still issuing a draw call, still counting frames, still producing a "unique" digest.
Why it is wrong: the frame counter is incremented by the same `try` block that calls `render()`; it is not independent evidence of pixels. Minor corroborating detail: 211 frames in ~4s is ~53fps, not "~64fps" — the claimed figure is top-of-range rounding over a range that implies some variants paused ~1s inside the capture window.

### F2 — The structural-distinctness proof (C1) is circular, and the scene axis contradicts it [UNSUPPORTED CLAIM]
Blast radius: the headline claim of the fleet.
Evidence: `fingerprintOf` returns `${s.nav_model}|${s.hero_mechanics}|${s.grid}` — three strings typed by the same author into the same table; `findCollisions` checks that table against itself. Uniqueness of a self-authored tuple proves the author typed 20 distinct triples, not that pages differ. Worse, the packet's own `LOOKS` table shows pairs like `shader-morph` (`refract`, count 8, radius 2.2) vs `lens-refract` (`refract`, count 6, radius 3.0): same geometry, same material class, different scalars — the literal definition of "restyled copy" at the scene level. 20 variants over 8 families means the ≤3 cap is the *forced minimum* (2×8=16 < 20), and five families sit exactly at it — the honest count is **8 scene topologies, 20 parameterizations**. `lookIssues()`'s bar of "≥3 numeric overrides" measures that the author typed three numbers. Finally, the files that would actually prove structural difference — `layout.ts` (20 nav models + 20 grids) and the variant components — are not in the packet.
Why it is wrong: nothing shown observes rendered structure; everything shown observes the author's own declarations. `assertVariantHasGeometry` compounds this: it checks that hand-typed strings `startsWith('THREE.')` and that a builder returns a function — it never constructs a scene or inspects a scene graph, so it is a tautology that cannot fail on a scene that draws nothing.

### F3 — The "test rig, not our code" attribution has no supporting control, and isolation deleted exactly the evidence at risk [UNSUPPORTED CLAIM]
Blast radius: C3, and the one surface where the fleet actually co-mounts in-product.
Evidence: the crash (`parseUniform` ← null `activeInfo.name` under SwiftShader) is attributed to the rig, but no experiment is shown that would separate "rig" from "fleet": no co-mounted run under hardware GL, no control page of 20 trivial scenes under SwiftShader to prove context-count is the variable. Meanwhile the runtime creates one `WebGLRenderer` per mounted variant with `powerPreference: 'high-performance'` and no context budgeting — and `playgroundRegistry.ts` **spreads all 20 into a shared, presumably routed page**. On real hardware, browsers cap WebGL contexts (~8–16) and silently drop the oldest; per F1, the harness ignores the first loss. So the co-mounting configuration was never verified *anywhere*: it throws under the rig and fails silently (via F1) on hardware.
Why it is wrong: "legitimate response to a rig failure" requires evidence the failure is not caused by the shipped architecture; isolation in verification is consistent with, though not proof of, evidence removal — and the unverified surface is the one users get.

### F4 — Committed generated output + five hand-fixes + an active generator = undefined regeneration semantics [MISSING WORK]
Blast radius: the five self-disclosed fixes (missing panel `id`s, 320px overflow, escaped `position:fixed` rails, `vw` headlines, blank CSS vars) can be silently reverted.
Evidence: `generate-worlds.mjs` and `wire-playground.mjs` write the 20 components and the shared `playgroundRegistry.ts`; the packet shows no provenance/pinning test that committed output matches generator output, and does not say whether the five fixes were applied in the generator or hand-edited into committed files. If hand-edited, the next generator run resurrects the defects; if generator-applied, committed output may already drift. `wire-playground.mjs` additionally rewrites a file outside the fleet directory on every run.
Why it is wrong: generated-and-committed code with no drift detection is code whose correctness is only valid until the next regeneration, and the shared registry modification makes the blast radius extend beyond the parked fleet into C6 territory.

### F5 — The engine state is hardcoded, not derived; the console cannot notice the engine being unblocked [DEFECT]
Blast radius: C5's "shows the learning engine honestly."
Evidence: `return { durableWrites: 'BLOCKED', … }` — the state field is a literal constant. The only derived part is `reason`, a regex (`/fail-closed|refuse durable work|non-operational|source-classification/i`) over README **prose**. This is brittle in both directions: a README sentence like "we removed the fail-closed gate" still matches `/fail-closed/` and reads as gated; and if the engine were genuinely unblocked tomorrow, the console would still print `BLOCKED` as the state, with only the reason string subtly flipping to a warning.
Why it is wrong: a console that reports a constant labeled as state is a static sign, not a monitor. The fail-closed *direction* is right; the honesty claim is not carried by a regex over marketing-adjacent README text plus a hardcoded field.

### F6 — The localhost server does not validate `Host`/`Origin`; DNS rebinding makes `/api/state` readable by a remote page [DEFECT]
Blast radius: disclosure of repo metadata (source/test file counts, archetype count, up to 600 chars of quoted README text) to any webpage while the console runs.
Evidence: the handler parses `new URL(req.url ?? '/', http://${HOST})` for the path only; no `Host` header check exists. A page at `evil.com` that rebinds DNS to 127.0.0.1 can fetch `http://evil.com:4599/api/state` — post-rebind it is same-origin to the browser, and the server answers regardless of Host. Binding to 127.0.0.1 does not mitigate rebinding; only a Host allowlist or auth would. The read-only, GET-only design correctly rules out *writes* — that half of C5 holds — but "localhost = safe" is not established for *reads*. Minor: `json()`'s headers are not shown, so whether the JSON endpoints carry `nosniff`/correct content-type is unverifiable.

### F7 — `isColorLike` admits CSS-wide keywords and modern color syntax, silently producing wrong scene colors [DEFECT]
Blast radius: any design-system token defined as `unset`/`inherit`/`currentColor` or space-separated `rgb(0 0 0 / 50%)` yields a wrong color with no error — the fallback is skipped precisely when it is needed.
Evidence: `/^[a-z]+$/i` passes `unset`, `inherit`, `revert`; `/^rgba?\(/i` passes `rgb(0 0 0 / 50%)`. These reach `new THREE.Color(value)`, which does not throw on unparseable strings — it warns and leaves the color unset — so the `catch { out[key] = new THREE.Color(hex) }` fallback never fires. The builder fixed the *blank* variable case (self-disclosed) but the non-blank-non-color cases take the same silent path with the guard's blessing.
Why it is wrong: the guard's word-branch and prefix-match are broader than what `THREE.Color` can parse, so "looks like a color" ≠ "is a color THREE accepts."

### F8 — The copy gate is a 46-string blacklist, not the claimed 78, and it passes structural cliché; "does not read as AI" is enforced by nothing shown [UNSUPPORTED CLAIM]
Blast radius: C4.
Evidence: counting `BANNED_PHRASES` as shown: 16 + 11 + 8 + 5 + 6 = **46** entries (43 unique — the list double-counts curly/straight apostrophe variants and `'take it to the next level'` ⊃ `'next level'`), against the claimed 78. Either the packet's excerpt is silently abridged or the claim is wrong. Substantively: the boundary regex `[^a-z0-9]` is evaded by any inflection (`empowers` passes; only `empower`/`empowering` are listed); and v20's headline "Come for the training. Stay for the people." is itself a stock viral-template construction ("come for the X, stay for the Y") that no substring blacklist can see — proof the gate measures vocabulary, not voice. v18's headline ("This page is the last thing we build.") passes the gate while being meta-copy about the page, not the gym. Nothing shown binds `findSlop` to the *rendered* DOM rather than the `pack.ts` blob, and the contract test source is absent.

### F9 — The scroll-progress formula is binary for card-height hosts, degenerating every scroll-driven mechanic [DEFECT, conditional]
Blast radius: `scroll-scrub` (v01) and any `dolly`-driven motion, in exactly the card-sized frames the gallery uses.
Evidence: `const span = Math.max(1, rect.height - window.innerHeight);` — for a host shorter than the viewport, `rect.height - innerHeight` is negative, `span` is 1, and `progress` snaps 0→1 the moment the host top crosses −1px. All 20 `LOOKS` set a `dolly` value; if `dolly` is driven by `scrollProgress` (the only scroll input the harness exposes), every scene in a card toggles between two camera states instead of scrubbing. Verification cannot catch this: frames still count, draw calls still fire.
Why it is wrong: the formula assumes a viewport-tall hero; the fleet is verified in card-sized frames. I have not seen the family implementations, so the conditional (`if dolly is scroll-driven`) is flagged rather than asserted.

### F10 — Nothing shown enforces that any of this verification ever runs again; the suite's content is invisible [MISSING WORK]
Blast radius: C7's green numbers are evidence about a past run, not the future.
Evidence: all four verification commands live in `scripts/`; the packet shows no CI wiring, no `package.json` script entries, no pre-commit hook. `fleet.contract.test.ts` (13 tests) and `engine-contract.test.mjs` (6 tests) sources are absent, so their meaningfulness — including the self-disclosed "rewritten rather than satisfied" test — cannot be assessed. Combined with F2's tautological geometry assert, the one test whose source *is* visible is the one that cannot fail on a real regression.

## CLAIMS I COULD NOT SUPPORT

- **C1** — Not supported. Circular fingerprint (F2); scene axis shows scalar-only pairs; the files that would prove it (`layout.ts`, variant components) are absent.
- **C2** — Not carried by the evidence shown. The frame counter is same-code self-report with known lie-modes (F1); `gallery-verify.mjs` source is absent, so draw-call and digest methodology cannot be audited; digests-unique is satisfied by any one-pixel difference.
- **C3** — Not supported. No control experiment separates rig from fleet; isolation removes exactly the co-mount evidence while the product ships a 20-context co-mounting page (F3).
- **C4** — Half-supported. The shown copy passes the shown gate, but the gate's count is misstated (F8), it is a vocabulary blacklist, and no binding to rendered output is shown.
- **C5** — Split. "Cannot write" is supported by the server source. "Shows honestly" is not: the state is a constant (F5); and "localhost is safe" ignores rebinding (F6).
- **C6** — Unverifiable as stated. No route table is shown; and `playgroundRegistry.ts` — a shared file in a page directory — was modified with 20 entries. "Nothing canonical changed" is true only under an unstated definition of "canonical" = "the home route."
- **C7** — Not assessable. Both test sources are absent; the one visible test is a tautology; one test was rewritten to fit desired behavior.
- **C8** — Not assessable. No file in the packet carries a line count, and most files are unshown.

## WHAT I COULD NOT ASSERT (UNSURE)

- Whether `layout.ts`/`worldStyles.ts` actually implement 20 distinguishable nav/grid CSS systems.
- Whether the 20 variant components render `copyFor()` exclusively or embed literal copy that bypasses the gate.
- Whether the playground mounts all 20 worlds simultaneously or one-at-a-time (determines whether F3's context-cap scenario is live or latent).
- Whether the five self-disclosed fixes live in the generator or only in committed output (F4).
- `gallery-verify.mjs` methodology: how isolation was done, what "non-zero draw calls" thresholded at, whether digests were motion-diffed over time or single-shot.
- File line counts for C8; contents of `fleet.contract.test.ts`, `engine-contract.test.mjs`, `registry.ts`, `familiesA/B.ts`, the `json()` helper's headers, `escapeRe`, `MARKETING_STATS` values.
- Whether three.js in the pinned version throws or warns on unparseable color strings (F7 assumes the long-standing warn-don't-throw behavior).
