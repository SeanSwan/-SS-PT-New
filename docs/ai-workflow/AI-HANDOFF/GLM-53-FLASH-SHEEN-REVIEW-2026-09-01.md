# GLM Consult

**Requested:** `glm-5.3-flash`
**Served:** `glm-5.3-flash`
**Document:** (path redacted; packet digest is recorded by consult-panel.mjs)
**Tokens:** 8479 in / 20185 out (reasoning: 17341) | total 28664
**Wall:** 463.1s

---

# SWA-224 hostile review — findings

**Verdict up front:** the engine's D1/D2 fixes are real and well-seamed, the mask technique is correctly ordered (`-webkit-mask-composite: xor` before `mask-composite: exclude`, standard-last — fine), and the aria-hidden decoration is right. There are no security or privacy findings; nothing here takes input, leaves the page, or touches the a11y tree. That's the praise budget spent. Below is what's wrong, ranked.

---

## S1 — will produce visible breakage or violate a house rule

### 1. The sky drift layers don't loop seamlessly — the clouds jump every cycle
`sheen.css`, `sw-sheen__drift` / `__drift-far` + `@keyframes sw-sheen-drift`.

Seamlessness requires the end offset to be an integer multiple of the tile width. Percentage background-position travels `|end%| × (layerBox − tile)`. For `__drift`: layer box is 120% of frame width (`inset: -40% -10%`), tile = 52% of that box. End offset = 200% × (120% − 62.4%) = **115.2% of frame = 1.846 tiles**. Not an integer → a visible ~9.6%-of-frame teleport every 26s. `__drift-far`: 200% × (120% − 76.8%) = 86.4% = **1.125 tiles** → same jump every 44s, on a blurred layer where it reads as a "pop." Nobody would catch this in a screenshot; it needs a two-cycle observation or a loop-continuity test. (Fix shape: `background-size: 50%` of the layer box with the same −200% endpoint lands exactly on 2 tiles.)

### 2. The card path is shipped CSS that is probably broken and is definitely a standards trap
- Nothing in the packet establishes that `.sw-card` is `position: relative`. `.sw-sheen` is `position: absolute; inset: 0`; the button works (browser-verified), the card path has **zero consumers and zero tests**, so the first person to use it may get a frame positioned against the page. This is exactly the class of defect the "not verified" list exists for, and it's in the tier's own CSS (`sheen.css`, `.sw-card > .sw-sheen`).
- `SheenFrame.tsx` renders `sw-sheen__orb` **unconditionally**, including for any future card use, and the card CSS frame weight is already shipped. Swan Card Standard forbids pointer tracking on client/data cards. There is no lint rule, test, or doc note preventing a 6-months-from-now consumer from wiring `useSheenPointer` to a card and violating the standard with blessed-looking parts. Ship the card frame weight without the orb (or gate the orb behind an explicit prop) or document the prohibition somewhere people will read it.

### 3. `prefers-reduced-motion` in the JS engine is read once, at first engine creation
`useSheenPointer.ts`, `createSheenPointer`: `matchMedia('(prefers-reduced-motion: reduce)').matches` is captured when the singleton is built and never re-read. The CSS half reacts live; the JS half does not. A Windows/Android user who toggles reduce mid-session keeps getting eased, autonomous orb motion for the rest of the session. Subscribe to the media query (`addEventListener('change')`) or read `.matches` per tick. This is also a concrete example of why "asserted by reading the stylesheet text" verification is insufficient — the stylesheet is the *correct* half.

---

## S2 — real defects and gaps, lower blast radius

### 4. Stale registration options: orb colours can never change after mount
`useSheenPointer` registers `optsRef.current` once (effect deps are `[ref]` only) and `register()` spreads opts into the surface state a single time. The `optsRef` pattern implies live updates; there is no mechanism that ever re-reads it. Concretely in `ForgeButton.tsx`: a call site that passes a dynamic `variant` gets the correct *fill* change and a silently stale *orb pair*, which is precisely the Dual-Button Glow invariant you just codified. Add an effect that re-registers (or a setter) when opts change, and a test for it.

### 5. The rAF engine writes layout properties per frame
`.sw-sheen__orb` is driven by `inset-block-start/inset-inline-start` (`sheen.css`), i.e. top/left — style → layout → paint per write, on a `blur(20px)` element, per active surface, per frame. `transform: translate3d` with the same percentage math (the file already documents why percentages resolve against the parent) would make this compositor-only. Given "no performance profiling" is admitted, this is the one place where the reasoning ("rects cached, writes coalesced") and the implementation disagree. The reads are fine — say that plainly; the writes are not.

### 6. Unbounded, ungated constant animation
Every sheened instance runs a spinning 300%-size conic layer, a `blur(1.5px)` layer, a `blur(20px)` orb, and a shim — forever, regardless of viewport visibility (no IntersectionObserver / `content-visibility` gating; compositor animations don't reliably pause offscreen). Today: one consumer, fine. The moment three CTAs on a page opt in, that's three always-on GPU layer stacks on low-end mobile, and nothing in the code, docs, or tests expresses a budget or a limit ("exactly 1 sheen frame" was *observed*, not *enforced*). Profile it, and add a per-page guidance doc or a dev-mode warning.

### 7. Chromium is the only engine ever run, for a mask-composite + blend-mode feature
The entire visual mechanism (`mask-composite: xor/exclude`, `mix-blend-mode: overlay` inside a mask-created stacking context, sub-pixel `box-shadow` rim at 0.75px) is cross-engine-sensitive. The blending isolation happens to be correct *because* `mask` creates a stacking context — that's a spec-reading, not a test. Run Safari and Firefox before this pattern gets copied to 20 components.

### 8. The structure file is full of taste literals, and its own header lies about it
`sheen.css` header: "there is no literal below." The file then contains ~15 colour literals: the entire `__band` gradient, the entire `__shim` conic (white 0.95 / black 0.34 / white 0.78…), both `__rim` shadows, and a `saturate(1.25) brightness(1.08)` filter. `rgba()` isn't hex, so R1 passes — this is the letter-vs-spirit gap in the drift linter, and the header sentence is factually false *in the same file*. Worse, the shim-literal strength is already acknowledged as taste ("at higher coverage this erased the scenery") — that's proof these values are pack-owned taste living in the component tier. Dark/midnight packs cannot restyle the specular character without editing structure. Tokenise band/shim/rim (or move them to the pack) and fix the linter to catch non-hex colour literals.

### 9. Pack taste is mirrored into the host with no parity enforcement
- `ForgeButton.tsx` `SHEEN_ORB`: four hex values duplicated from pack tokens under `swan-guard-allow-hex` comments. There is a source-parsed parity test for `BUTTON_SIZES` and *none* for this. Is the TS exception even in the ledger, and does the linter scan `.ts` at all?
- `SHEEN.pointer` (falloff, catchUp, epsilons) lives in `frontend/src/styles/sheenPackTokens` — pure taste constants for the Forge pack, resident in the host app. The hook can't live in Forge (zero-runtime, correctly reasoned), but the constants can ship from the pack (CSS vars read once, or a JSON sidecar). As written, host #2 forks the pointer feel by copying a file.
- `SheenWorld` (4 members) vs the 4 stop-tokens vs the 4 CSS world rules — three parallel lists, no test that they stay in lockstep. The TS union at least fails loudly; the token↔union direction fails silently.

### 10. `--sw-motion`: the documented law and the implementation are opposite
Sheen.css header: "every duration **multiplies** by `--sw-motion`." Implementation: `calc(var(--_spin) / max(var(--sw-motion), 0.001))` — **division**. One of these is wrong, and nothing in the provided token excerpts shows `--sw-motion` being defined at all; if it's ever unset for a consumer, `max(var(--sw-motion), 0.001)` makes the calc invalid at computed-value time and the duration collapses to its initial value. Verify the definition site, pick one semantic, and write a test for `--sw-motion: 0`.

### 11. Focus and forced-colors behaviour is asserted, never seen
- `z-index: 3` ring over the border band: any *inset* focus indicator (box-shadow ring on the button) is now underneath an opaque animated ring; only outer outlines survive. No test or browser run checked focus visibility on a sheened control.
- The forced-colors block adds `border: 1px solid CanvasText` on `.sw-sheen` while the UA is already forcing a border on the button — likely a doubled border, plus the residual transparent padding ring. Emulation would show this in thirty seconds.

---

## S3 — nits and small traps

- **sheenColor.ts is not in the packet.** It's doing `blendHex` for a colour-obsessed pack; naive sRGB lerp of purple→cyan passes through a desaturated grey mid-point. Not verifiable as shipped — that's itself a finding. A test file is also absent.
- **Double alpha on the orb**: engine writes rgba alpha `o × 0.55`, CSS multiplies by `opacity: o` → effective o²·0.55. Probably empirically tuned; document it or collapse it.
- **Disabled buttons still glow** — the engine is target-agnostic window-level pointermove. Decide whether that's intended.
- **Verification tolerance is unpinned**: "34.35/194.08 against expected 34.5/195.7" — if the math is deterministic, why is it off? State a tolerance policy or these numbers mean nothing in six months.
- **Docs understatement**: "adding a world is one pack token plus one rule here" — it's token + CSS rule + `SheenWorld` union + kind classification (metal/scenic). The union at least fails the build; say all four steps.
- **`--sw-p-mask-opaque` has no fallback in the mask**; if the primitive ever goes missing, the mask declaration drops and the frame renders as a full painted wall, not a window. Same-package today, but a cheap `var(..., #000)` removes the failure mode.
- **Packet hygiene**: `CTASection.tsx` — the first production consumer — is not in the packet, so the composition can't be reviewed; and the token excerpt includes unrelated `--sw-btn-ghost-glow-b`, which makes me want to see the full commit diff for scope creep.

---

## Explicitly fine (checked, not invented)

- Engine D1/D2 fixes are genuinely structural, and `lastFrameWrites`/`measureCount` are the right test seams. Scroll-during-momentum wakes/states behave correctly; at-rest surfaces cost one write ever.
- React plumbing: hooks order safe with the null-ref trick; engine never constructed on sheen-free pages; StrictMode register/unregister is clean; `document.fonts.ready` after `destroy()` is harmless.
- `children || text` preservation, destructured non-DOM props, `pointer-events: none` on frame and orb, logical properties on the orb, aria-hidden frame — all correct.
- 48px CTA ≥ 44px target; contrast audit scope is fine because the decoration is aria-hidden and the label is untouched.

## Missing tests (beyond the admissions)

Reduced-motion and forced-colors *under emulation*; pointerType filtering / touch; card smoke test incl. positioning; drift loop continuity; SHEEN_ORB↔pack parity; `SheenWorld`↔pack world parity; orb update on variant change; `--sw-motion` unset and `0`; aria-hidden assertion + one axe run on the CTA; a visual-regression baseline (absent, admitted — this is the one that guarantees silent drift).

## Missing docs

Host wiring guide (the varPrefix silent-failure trap has already bitten once and is documented only in a code comment); surface-eligibility policy reconciling sheen with Swan Card Standard; per-page animation budget; the corrected `--sw-motion` law.
