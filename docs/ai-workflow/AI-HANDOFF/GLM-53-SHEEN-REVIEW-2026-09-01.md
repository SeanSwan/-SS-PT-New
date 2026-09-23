# GLM Consult

**Requested:** `glm-5.3`
**Served:** `glm-5.3`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 8479 in / 25701 out (reasoning: 22602) | total 34180
**Wall:** 402.5s

---

# Hostile Review — SWA-224 Sheen tier

Verdict: the engineering discipline is real (negative controls, D1/D2 fixed by construction, correct mask compositing order), but the packet's two self-declared blind spots — "asserted by reading the stylesheet" and "perf reasoned about, never measured" — each conceal a genuine defect, and the package's central invariant ("no literal below") is **factually false in the shipped file**. Ranked:

---

## HIGH

### H1. Reduced-motion is read once and frozen for the page's lifetime — the orb animates after the user asks it to stop
`useSheenPointer.ts` — `const reduce = options.prefersReducedMotion ?? (matchMedia('(prefers-reduced-motion: reduce)').matches)` is evaluated **once**, at engine creation. The engine is a **module singleton** (`let sharedEngine`), created at the first sheen mount. Two consequences:

- The CSS side responds live (`@media (prefers-reduced-motion: reduce)` in `sheen.css`), the JS side does not. A user who enables reduce mid-session sees the clouds freeze and the **orb keep easing** — a split-brain violation of the house rule "prefers-reduced-motion respected," and a nightmare bug report ("your button still moves but only sometimes").
- The test seam (`prefersReducedMotion?: boolean`) pins a static value, so no test can catch this. This is exactly the gap flagged in "what was NOT verified."

Fix: `matchMedia(...).addEventListener('change', ...)` updating a `let reduce`, destroyed in `destroy()`. Re-read per-`tick` is also acceptable given it's one property access.

### H2. "There is no literal below" is false, and R1 can't see the literals that are there
`sheen.css` header claims: *"Every colour arrives from the pack… there is no literal below."* The body contains ~18 colour literals:

- `__band`: 5 `rgba(255,255,255,…)` / `rgba(0,0,0,…)` stops in the specular gradient
- `__shim`: 9 rgba stops in the conic
- `__rim`: 2 rgba box-shadows

The drift linter passes because **R1 = "no raw hex"** and these are `rgba()`, not hex. So the enforcement has a blind spot exactly one function-notation wide, and every future pack-taste colour can enter the structure file as `rgb()`, `hsl()`, `color-mix()`, or a named colour and pass the gate. The Forge's whole premise ("structure has no colour; packs own taste") is currently enforced only against hex.

Decide honestly: either specular ramps are structure (then say so in the tier law, extend R1 to all colour notations, and ledger these as recorded exceptions), or they're taste (then tokenize: `--sw-sheen-spec-band`, `--sw-sheen-spec-shim`, `--sw-sheen-spec-rim`). Right now the doc lies and the lint green-lights the lie. This is the finding most likely to rot the package over six months.

---

## MEDIUM

### M1. The orb is a per-frame *layout* animation with a 20px blur, and nobody measured it
`sheen.css` `.sw-sheen__orb` positions via `inset-block-start/inline-start: var(--sw-sheen-px/py)`. The engine writes those properties every frame (`useSheenPointer` `tick()`), so each frame is: custom-property invalidation → **layout** (inset change) → style/paint → **`filter: blur(20px)` re-raster**. Because the custom properties are unregistered (no `@property`), there is no compositor path even in principle. The correct shape is `inset: 0` + `translate: calc(var(--px)*1%) …` or registered properties — transform-only, raster-cached.

Compounding it: `__spin` and `__shim` are each `inline-size: 300%; padding-block-end: 300%` squares. On a `fullWidth` mobile CTA (~290px at 320vw) that's two ~870×870 filtered/blend layers *per sheened control*, plus the blur layer. Fine at N=1 (today); the stated intent is ~20 sheen-tier surfaces.

Also: `calc(6s / max(var(--sw-motion), 0.001))` at capture-mode `--sw-motion: 0` yields a **6000s running animation**, not a stopped one — the layers stay promoted and the compositor keeps ticking an imperceptible rotation. `animation-play-state` or a `--sw-motion: 0` → `animation: none` rule would actually stop it.

The bitter part: you built `lastFrameWrites` and `measureCount` as test seams and then never used them for a perf test. A 10-line "N sheened buttons, move pointer, assert writes ≤ N and measureCount stable across pointermove bursts" would have quantified D2 instead of trusting it.

### M2. `.sw-card > .sw-sheen` ships an untested path that exists to violate a house rule
The Swan Card Standard: client/data cards are LOW-MOTION, no pointer tracking. `sheen.css` ships `.sw-card > .sw-sheen { --_frame: 6px }` plus `--sw-sheen-frame-card` in the pack — i.e., the package has pre-wired the card path with **full-motion drift (26s/44s), a 4.5s shimmer, and an orb slot**, with no card-context motion guard, no consumer, no test, and no negative control. As shipped, it's a one-class-name route to violating the standard, discovered by the next developer who wants a pretty card. Delete it until a consumer exists, or ship it with a card-motion gate and a test.

### M3. `SHEEN_ORB` is an unguarded token mirror — the exact drift the parity tests exist to prevent
`ForgeButton.tsx` hardcodes three hex pairs with `swan-guard-allow-hex` suppression, commented "mirrored for the JS engine." You wrote a source-parsed parity test for `BUTTON_SIZES` (`ForgeButton.parity.test.tsx`) and **none** for the orb pair. First palette retune silently diverges JS from the pack.

Two adjacent defects in the same code:
- `SHEEN_ORB[state.variant as string] ?? SHEEN_ORB.primary` — the `as string` cast plus silent fallback means any future/unmapped variant (e.g., ghost, which has its own `--sw-btn-ghost-glow-b: #60C0F0` Ice Wing) gets the **primary purple pair**, wrong family, no error. If the variant set is closed, the fallback is dead code hiding mistakes; if it isn't, it's a mis-colouring bug.
- The engine captures `opts` at `register()` and has no `update()`. `useSheenPointer` refreshes `optsRef.current` every render but never re-applies it, so a runtime `variant` change keeps the **stale orb pair** until remount.

### M4. The drift loop has a seam — the clouds jump ~8% of width every cycle
`@keyframes sw-sheen-drift { to { background-position: -200% 0 } }` with `background-size: 52% 100%`: percentage background-position resolves as `pct × (area − image)`, so travel = `−2 × (W − 0.52W) = −0.96W`. The tile is `0.52W`; `0.96W` is not an integer multiple — the mismatch is `0.08W` (~16px on the CTA), so the near layer **teleports 8% of width every 26s**. The far layer (`size: 64%`, to `−200%` → `−0.72W`, tile `0.64W`) jumps `0.08W` the other way every 44s, reversed. Through a 4.5–6px ring it's a subtle periodic "hiccup" — the kind of bug users report as unreproducible. Animate to an exact tile multiple (px offsets, or translate a pseudo-element by one tile) instead of background-position percentages.

### M5. Nested scrollers desync the cached rects
`scroll` does not bubble; you listen on `window` only (`{ passive: true }`). Scrolling inside any inner `overflow: auto` container (modals, menus, carousels) never marks rects dirty, so with the pointer still, the orb guides to stale coordinates until the next `pointermove`/window-scroll. Fix is one word: `capture: true` on the scroll listener (window capture sees descendant scroll events). Same class of problem: surfaces moved by transform animations fire neither `scroll` nor `resize`.

---

## LOW

**L1. An unknown world half-renders.** `sw-sheen--chorme` (typo) leaves `--_stops` undefined → the ring/scene `background` is invalid and empty, but `__shim`/`__rim` (which carry literals — see H2) still render → a broken ghost-chrome frame with a rotating shimmer and no way to notice. `sw-sheen--*` classes are a published package's public API, not just a React prop. Put a default `--_stops` on `.sw-sheen` base.

**L2. Containing-block and stacking contract is undocumented.** `.sw-sheen { position: absolute; inset: 0; z-index: 3 }` silently requires a positioned parent; nothing in `sheen.css` or docs enforces or states it. Related: an *inset* focus outline (negative `outline-offset`) can be painted over by the z-index:3 frame depending on whether `.sw-btn` establishes a stacking context — keyboard-focus visuals were never screenshotted. Add a `:focus-visible` frame to the e2e.

**L3. Touch semantics undefined and untested.** During a touch drag the orb flickers along the finger; no 320/414px check exists for the 4.5px ring vs. label crowding at small sizes. Also decide and document: should the engine ignore `pointerType: "touch"` entirely?

**L4. `varPrefix: ''` default writes `--px`, `--py`, `--opac`, `--orb`** — generic global custom-property names that collide with common padding-scaling conventions. Make the prefix required; the default is a trap for non-Forge consumers.

**L5. Housekeeping.** The shared engine is never `destroy()`ed — listeners live for the page lifetime (harmless today, one surface). `blendHex` appears to run per-frame per-surface on hex *strings*; if it parses per call, cache the parsed pair at `register()`. The ring keeps spinning/shimmering under `isLoading` behind the spinner — probably fine, decide deliberately. The e2e accepted orb 194.08 vs expected 195.7 — 1.6px is plausibly mid-ease lerp lag; assert **after convergence** or the test doesn't distinguish "lerping" from "wrong rect."

---

## Missing tests (specific, ranked)
1. Playwright `emulateMedia({ reducedMotion: 'reduce' })` — exercised in a browser, **including a mid-session toggle** (catches H1; stylesheet-text assertions cannot).
2. `forced-colors: active` emulation (same gap class).
3. 320/414px viewport of the sheened CTA + touch interaction.
4. Visual regression baseline: world × surface × motion-pref (would have caught M4 and will catch silent frame changes — currently nothing would).
5. Perf smoke using the `lastFrameWrites`/`measureCount` seams (M1).
6. `SHEEN_ORB` ↔ pack parity test (M3).
7. Card path: test it or delete it (M2).
8. Engine test for `variant` change after mount (M3 staleness) and inner-container scroll (M5).

## Missing docs
- Tier integration guide **in the package**: required parent `position`, the `varPrefix: 'sw-sheen-'` contract (today that "silently never moves" trap lives in a *host* comment that package consumers will never read), the world→layer matrix (currently encoded only in `SheenFrame.tsx`, i.e., React-only, while the Forge is framework-agnostic), and the promotion path for the other 29 worlds.
- Ledger rationale for the `swan-guard-allow-hex` entries (your own governance discipline, skipped).

## Checked and genuinely fine — no findings
- **Mask ring implementation and declaration order** (`-webkit-mask`/`xor` before `mask`/`exclude`, composite set *after* both shorthands): correct in legacy WebKit, modern Safari, Chromium, and Firefox. The classic reset bug is not present.
- `aria-hidden="true"` decoration; `<i>`/`<span>` are valid non-interactive phrasing content inside `<button>`; pointer-events: none; 44px rule met (48px CTA).
- D1 (dirty-flag measuring inside rAF) and D2 (snap-and-skip at rest) are correctly implemented as described — I tried to break the early-out logic and couldn't.
- `sheen ? sheenRef : nullRef` — conditional *value*, not conditional hook; hook order stable; StrictMode-safe register/cleanup.
- `document.fonts.ready` re-measure is the right call.
- No security or privacy issues: no user input reaches style strings (typed world union; pack-constant hexes), pointer data never leaves the page.
- No WCAG 2.3.1 flash risk: sector counts put ring luminance modulation well under 3 Hz even at neon's 3.5s spin.

The pattern across H1–M5: everything verified was verified *statically*, and every finding above lives precisely where static verification can't reach. Exercise the preferences in a real browser and put a number on the frame loop; the rest is discipline cleanup.
