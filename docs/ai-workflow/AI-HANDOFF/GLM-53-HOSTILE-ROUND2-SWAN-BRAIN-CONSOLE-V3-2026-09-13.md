# HOSTILE REVIEW PACKET — ROUND 2 — Swan Brain Console v3 + 20-variant Three.js fleet — reviewed by GLM (glm-5.3)

**Model:** glm-5.3
**Document:** docs/ai-workflow/AI-HANDOFF/GLM-HOSTILE-PACKET-ROUND2-SWAN-BRAIN-CONSOLE-V3-2026-09-13.md
**Tokens:** 5991 in / 21809 out (reasoning: 18286) | total 27800
**Wall:** 326.5s

---

## VERDICT: REVISE

## FIX VERDICTS

- **FIX 1 — INTRODUCES A NEW DEFECT.** The stop-first ordering and restore listener are right, but `restored` is never reset in `onLost`, so after any loss that follows a successful restore the telemetry reports `contextLost: 'no'` on a dead context (see F3). Additionally, `onRestored` unconditionally calls `setLost(false)`, which erodes the "two losses = give up" policy it just enforced.
- **FIX 2 — INCOMPLETE.** It detects a sentence in a README, not the state of a write gate. "The console can notice the engine unblocking" is unsupported: an unlocked adapter under an intact README still reports `BLOCKED` (see F6).
- **FIX 3 — CORRECT.** Feature-detected ResizeObserver with a window-resize fallback and a clean disconnect is the right shape. Minor gap: on the no-RO fallback path, `window resize` calls only `onResize`, not `readProgress`, so progress goes stale until the next scroll.
- **FIX 4 — INTRODUCES A NEW DEFECT.** The short-host snap is genuinely fixed and the curve is monotonic and clamped, but the 0.85 anchor means a hero at the top of the page loads at progress ≈ 0.85 with the range [0, 0.85) unreachable by scrolling (see F4).
- **FIX 5 — INCOMPLETE.** The measured Colors-3 scope is now handled correctly (the `rebeccapurple` and rgba rows are caught by the white-sniff exactly as designed). But valid CSS Colors 4 values (`oklch()`, `lab()`, `color()`) pass the DOM probe, fail `THREE.Color.set`, whiten, and then fall to the fallback hex silently — the same failure class as round 1 (valid CSS silently replaced), on a narrower input set.
- **FIX 6 — INCOMPLETE.** 27/27 is asserted, not shown, and F3 is a source-visible bug in exactly the sequence these tests claim to regress-cover (lost → restored → lost). Either no test covers the second loss, or it asserts the wrong thing.
- **FIX 7 — CORRECT.** The arithmetic is right (46). Note what it proves about provenance: a prior builder receipt contained a number that did not survive import. Every green number in §1 has the same provenance and no attached logs.

## FINDINGS (ranked by blast radius; NEW findings only)

### F1 — The rail reserve never applies: `--rail-left/--rail-right` are declared on the wrong element [DEFECT]
**Blast radius:** every variant assigned a rail nav model (6 of the 18 models: `vertical-index`, `gutter-index`, `stepper-left`, `side-rail`, `split-rail`, `progress-spine`) — headline, sub, CTAs and proof row can sit under a rail scrim. This is the fleet's core layout claim.

**Evidence:** In `Nav`, the custom properties are set inside Nav's *own* rule: `--rail-left: 0px; --rail-right: 0px;` then per-model `--rail-left: 76px` / `--rail-right: 84px`. In the JSX, `Nav` and `Content` are **siblings** under `WorldRoot` (`WorldRoot > Poster, CanvasLayer, Nav, Chapters, Content, ScrollHint`). `Content` reads `padding-left: calc(clamp(1.25rem, 4vw, 4rem) + var(--rail-left, 0px))`. Custom properties inherit *down* from the element they are declared on. `WorldRoot` declares neither variable, so `Content` resolves the fallback `0px` — always.

**Why it is wrong:** The reserve is dead code. The rails are `position: absolute; left/right: 0; width: 68–84px` overlays, and content padding stays at `clamp(1.25rem, 4vw, 4rem)` (as low as ~20px), directly under a 72%-opacity rail. The comment "Content honours the rail reserve so a rail can never sit on the headline" describes a mechanism that cannot execute. No test could have caught it because `assertVariantHasGeometry` renders nothing (§3.2) and nothing shown asserts geometry. Fix: declare the rail variables on `WorldRoot` (e.g. via a `data-nav-model`-driven rule) or pass them through the props on `Content`.

### F2 — Every interactive element on all 20 pages is a no-op by construction [DEFECT]
**Blast radius:** the entire product surface of the fleet — every nav button and every CTA on all 20 variants, in every mode.

**Evidence:** `const onActivate = useCallback((label: string) => { if (preview) return; void label; }, [preview]);` with the component defaulting `preview = true`. Both `NavItem` and `Action` wire `onClick={() => onActivate(...)}`. When `preview` is true it returns; when `preview` is false it executes `void label` — literal discard in *both* branches.

**Why it is wrong:** The non-preview path is explicitly authored to do nothing; `void label` exists only to silence the unused-parameter lint. There is no code shown — router call, scroll-to, state set — behind any label. Focusable buttons that do nothing are also an accessibility defect (keyboard users tab into controls with no effect). This also collapses a receipt claim: "20 distinct interaction models" (§3.1) is not supported, because the one interaction affordance all 20 share is inert, and the only per-variant inputs shown (`ctx.scrollProgress`, `ctx.pointer`) are identical plumbing. If activation lives in code not shown, the packet must show it; as shipped, the pages are posters with buttons drawn on.

### F3 — After any loss-following-restore, `data-contextLost` reports `no` on a dead context [DEFECT — introduced by FIX 1]
**Blast radius:** telemetry integrity in the exact scenario FIX 1 was written for: repeated context loss, the common real-world pattern (driver resets, tab throttling, LRU eviction — see F5).

**Evidence:** `onLost` sets `losses += 1` but never resets `restored = false`. The snapshot computes `contextLost: losses > 0 && !restored`. Sequence: loss #1 → `contextLost: 'yes'` (correct); restore #1 → `restored = true`, `'no'` (correct); loss #2 → `losses = 2`, `setLost(true)`, `setLive(false)`, but `restored` is still `true`, so `contextLost = true && !true = false` → `data-contextLost: 'no'` **while the canvas is permanently dead**. `isPresenting()` still returns false via `running`, so the composite gate survives — but the field named for this condition lies precisely during the loss that mattered. Second-order: `onRestored` runs `setLost(false)` unconditionally, so a second restore clears the two-loss verdict and re-syncs, flapping the poster/live boundary the policy was supposed to settle. Fix: `restored = false` as the first line of `onLost`, and gate `onRestored` on `losses <= 1`.

### F4 — The 0.85 anchor makes the hero load mid-dolly, with the low progress range unreachable [DEFECT — introduced by FIX 4]
**Blast radius:** first-paint framing on all 20 served front pages.

**Evidence:** `passed = vh * anchor - rect.top; p = passed / travel` with `travel = max(height, vh)`. For the served product the `WorldRoot` (`min-height: 100vh`) is the first element on the page, so at load `rect.top = 0` and `p = 0.85` (for a 100vh host) or ≈ 0.57 (150vh host). Scrolling down only increases `p` toward 1; `rect.top` cannot exceed 0 for the first element, so `p < 0.85` is unreachable on a single-variant page.

**Why it is wrong:** Every `camera.position.z = p.cameraZ - ctx.scrollProgress * p.dolly` scene starts at 57–85% of its dolly travel on first paint, and the first portion of every authored camera journey is dead parameter space the user can never see. The round-1 formula — whatever its short-host snap — at least started the hero at progress 0. The fix optimized a rare edge (host shorter than viewport) and regressed the universal case (hero at page top). Either the anchor must not apply while `rect.top >= 0`, or the scenes' `cameraZ`/`dolly` must be re-baselined — neither is shown to have happened.

### F5 — `hasWebGL()` leaks a live GL context per mounted variant [DEFECT]
**Blast radius:** any harness mounting multiple variants on one page; plausibly the real cause of the crash attributed to SwiftShader (§3.4).

**Evidence:** `const webgl = useMemo(() => hasWebGL(), []);` — one `useThreeWorld` per `WorldPage`, each `hasWebGL()` calls `probe.getContext('webgl2') ?? getContext('webgl')` and never releases it (no `WEBGL_lose_context`, no `probe.width = 0`). Browsers cap live GL contexts (~8–16 in Chrome) and LRU-evict the oldest silently. A gallery page mounting all 20 variants creates up to 40 contexts — evictions fire `webglcontextlost` on *live* canvases, churning through the FIX 1 path. In jsdom, `getContext` returns null, so the 27 runtime-contract tests cannot be exercising real GL at all.

**Why it is wrong:** Even at low counts it is pure waste; at gallery scale it manufactures the exact context-loss storms the diagnostics were built to survive, and it offers an unexamined alternative suspect for the `parseUniform` crash that was attributed to SwiftShader with no control experiment (§3.4). The fix is trivial: release the probe with `loseContext().loseContext()`, or share one module-level probe. Whether the gallery mounts variants simultaneously is [UNSURE] — but the code is wrong on its face for any multi-mount consumer.

### F6 — FIX 2 verifies documentation, not behavior, while claiming otherwise [UNSUPPORTED CLAIM]
**Blast radius:** trust in the console's `durableWrites` signal — the one field downstream tooling would gate writes on.

**Evidence:** `const gateDeclared = Boolean(readme && readme.includes('remain fail-closed')); const durableWrites = gateDeclared ? 'BLOCKED' : 'UNKNOWN';` — a substring match on prose. The FIX 2 heading claims the console can now "notice the engine unblocking."

**Why it is wrong:** The console notices the *README* changing, never the engine. An engine whose adapter ships unlocked while the README retains the sentence reports `BLOCKED` — confident, green, wrong. Any innocuous rewording ("stays fail-closed") flips 20 variants to `UNKNOWN` with a human-re-review demand, training operators to ignore the alarm. Round 1's defect was a hardcoded literal pretending to be knowledge; the fix is a hardcoded sentence pretending to be verification. Honest states are "verified by README drift detection" or a behavioral probe — not `BLOCKED`.

## ATTACK ON THE DISCLOSED LIMITATIONS (§3)

1. **8 families as 20 pages — rationalising, with one honest core.** The raw numbers are honest; the framing re-inflates them. "20 distinct interaction models" is unsupported by any code in this packet: all 20 builders receive an identical `ctx` (scrollProgress, pointer), an identical `WorldPage` template, identical `SHARED.ctas` and `SHARED.proof`, and — per F2 — the only interactive affordance is inert. "18 distinct nav models" is one `switch` of CSS blocks in one file: eighteen paddings of one mechanism. The disclosure that is defensible is "8 scene geometries"; "distinct interaction models" is marketing that survives because nothing shown can falsify it. Honest receipt: *1 composition × 3 enum axes × 8 geometries*.
2. **Registry check — acceptable *only* if relabelled everywhere.** As a tautology disclosure it is fine; what is not shown is whether the fleet suite's "13/13" counts this check as scene verification. If it does, the green number launders the tautology. [UNSURE]
3. **Unlit spheres named "refract" — not acceptable; this is the weakest of the seven.** The names do the selling; the materials cannot do the physics; the disclosure does the absolving. There were two honest moves — rename to what the geometry does ("glass shells", "layered lens stacks") or restore physical materials behind a capability check — and the packet instead kept the saleable vocabulary *and* downgraded the render *and* disclosed. Rename is a six-string change; refusing it is a choice to let the variant list misdescribe the artifact.
4. **SwiftShader attribution — not acceptable, and F5 supplies a competing suspect.** A control page of 20 trivial scenes under SwiftShader is an afternoon's work; instead an unverified attribution justified a permanent product downgrade (all materials flattened, §3.3) that conveniently also masks any context-exhaustion cause. Unverified attribution plus permanent downgrade plus no control is a rationalisation chain, not a diagnosis.
5. **DNS rebinding — severity honestly low, but the rationalisation pattern is visible.** GET/HEAD only, fixed allowlist, and the leaked data is repo metadata. A `Host` header check is one line; declining a one-line fix on a disclosed exposure is tolerable only if the server is documented as dev-only, which the packet does not say.
6. **No CI for the verifiers — not acceptable; this is the meta-limitation that devalues everything above.** FIX 7 proved a builder receipt can contain an unverifiable number. Every green figure in §1 is builder-asserted with no attached output, and nothing shown guarantees any verifier ever runs again. Wiring one CI job is the cheapest, highest-leverage fix in the entire packet; its absence means all 78→46 phrase counts and 27/27s are evidence about one afternoon, by the packet's own admission.
7. **Lexical gate — the most honest disclosure in the packet.** Flagging that its own v20 headline is an undetectable stock template is the right instinct, and the gate is defensible as a floor. The residual problem is procedural, not conceptual: the count is hand-reconciled (FIX 7) and nothing wires the recount anywhere — see #6.

## [UNSURE]

- Gallery/`gallery-verify` mounting topology (sequential vs. simultaneous) — determines whether F5's context exhaustion is theoretical or the §3.4 crash's real cause.
- Round-1 `runtime.ts` internals (`stop`, `sync`, where `setLive(true)` is called) — needed to confirm whether a second restore restarts a loop the policy meant to retire, leaving `live=false` over a running canvas.
- Contents of the 27 runtime-contract tests — specifically whether any asserts telemetry across lost → restored → lost (F3 predicts none does).
- Composition of the fleet contract's 13 checks — whether `assertVariantHasGeometry` and `findSlop` are counted as verification or as lint.
- Whether `Poster $hidden` is `display:none` or `opacity:0` — determines double-render cost in live mode.
- Whether the packet's claim "THREE cannot parse `rgba(0, 0, 0, 0.5)`" is accurate; my recollection is that `setStyle` accepts rgba and discards alpha. Either way the white-sniff catches it, but the packet asserts a library fact it has not shown measuring.
- Whether any production page mounts content above `WorldRoot`, which would make F4's unreachable range reachable and soften its blast radius (the packet's own framing — "front page variants" — says no).
