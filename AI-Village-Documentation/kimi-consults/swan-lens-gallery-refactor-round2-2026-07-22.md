# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/brainstorms/swan-lens-gallery-refactor-kimi-round2-2026-07-22.md
**Seed:** AI-Village-Documentation/kimi-consults/swan-lens-gallery-refactor-2026-07-22.md
**Tokens:** 5774 in / 6168 out · **Cost:** ~$0.1098 · **Wall:** 245.6s

---

# Kimi K3 — HOSTILE DESIGN + FRONT-END REVIEW (Round 2 Brief)

## (a) VERDICT: **SHIP-WITH-CHANGES**

The round-2 doc correctly converts my round-1 review into an execution order and adopts the right mandates. But it still contains one live contradiction, one unpriced render-cost bomb, one data-migration hole that will strand real users, and a derivation strategy that will *reintroduce* the exact complaint it exists to kill. Amend before the builder touches a branch.

---

## (b) DESIGN WEAKNESSES (most severe first)

**1. The registry has no ceiling — you're about to render the junk drawer in 4K.**
38 audited + 6–8 new = up to 46 live specimen swatches in one grid. Round 1 diagnosed the problem as *discoverability and differentiation*, and this doc's answer is still additive. Forty-six mini-UIs is not a jewel box; it's a warehouse with better lighting. Worse, my own signature-moment idea makes it worse — 46 specimens means 46 × (sidebar sliver + button + text) nodes painting simultaneously. The doc must impose **information architecture**: a curated default tray (~16–20) grouped into 3–4 named families (e.g., *Apex Darks / Jewel Gradients / Frost Glass / Heritage*), with retired-but-preserved colorways in a collapsed **Archive** section. That satisfies Sean's "unlock ALL 38" (nothing is deleted) while restoring the edited, premium presentation. A flat 46-grid is the VS Code theme marketplace all over again, now with more paint cost.

**2. The derivation function will algorithmically reproduce "the styles all look the same."**
Section C mandates one base seed + role transforms for all 29 lenses' world-values. Mathematically distinct ≠ perceptually distinct. A single derivation function produces values with *uniform aesthetic distance* — every lens becomes the same hue-rotation of every other lens. That's the "26 themes feel identical" complaint re-implemented at the values layer, this time with a CI test certifying the sameness. Fix: derivation must be seeded **per lens family** (5–7 hand-tuned family seeds with distinct hue/temperature/saturation posture), with role transforms applied within-family, plus a CI assertion on **minimum pairwise perceptual distance** (ΔE in OKLab) between lenses — not just R1–R7 guard compliance. Otherwise you've built a machine that manufactures monotony and tests that it succeeded.

**3. "YOU decide and commit" on EventDeck contradicts the doc's own premise.**
The header says "All decisions below are FINAL per Sean. Do not re-litigate." Then §5 hands the single most visible motion decision in the Gallery back to the producer. I'm the design authority and I'll take the call — but flag the structural rot: this doc claims decision closure it doesn't have. My committed decision, since the doc demands one: **CUT the strip-slice.** 6 sliced covers × ~40 event cards = up to 240 extra painted layers on scroll, on integrated GPUs, for a hover effect most users on touch devices will never see. Ship a clean single cover: `aspect-ratio: 16/10` via token, `object-fit: cover`, hover = `transform: scale(1.03)` on the image inside an `overflow:hidden` frame, ≤200ms, reduced-motion → no transform. The premium feel comes from aspect-ratio discipline and badge consistency, not from slice gimmicks.

**4. Showroom mode's idle semantics are still a hand-wave.**
"Idle-only, activates after 60s no input, exits on ANY input" — the doc never defines *input*. Mouse jiggle over the window? Scroll? `visibilitychange`? A user reading the Gallery for 61 seconds gets their entire app re-themed mid-scroll. Specify: listened events = `pointerdown`, `keydown`, `wheel`, `touchstart` (passive listeners, throttled); **deliberate mouse movement does not count as input exit but does reset idle** — actually no, simpler and safer: any of those four events = exit; `document.visibilityState === 'hidden'` pauses the clock; Showroom never activates while a form field or modal has focus. And the interval is still unspecified — pin it: fixed 12s per colorway, cycles the curated tray only (never Archive), order = tray order. No user-configurable interval UI — that's settings-panel clutter for a demo feature.

**5. "Light glass" colorways have no performance or fallback contract.**
Sean's verbatim ask includes glass colorways, and §A2 mandates the variety class — but nowhere is the rendering contract: `backdrop-filter: blur()` on what elements, at what blur radius, with what fallback when `backdrop-filter` is unsupported or the GPU punts? Glass over glass over glass on a 2219-line Gallery page is a scroll-jank generator. Spec it: glass applies to `elevated` surfaces only, max `blur(12px)`, `@supports not (backdrop-filter)` → fall back to `surface` at 92% opacity, and glass colorways must pass the same luminance audit measured against their *worst-case backdrop* (pure black behind the glass), since you can't predict what's beneath.

**6. The swatch specimen's a11y semantics are unspecified — and it's a nested-interactive trap.**
The spec says the specimen paints "a sliver of sidebar, one button, one line of text" *inside* a swatch that is itself a clickable 44px control. If that mini-button is a real `<button>`, you've shipped invalid nested interactive elements inside every one of 46 swatches. The doc must state: the specimen's internal mini-UI is **purely presentational** — `<div>`/`<span>` only, `aria-hidden="true"`, `pointer-events:none` on the entire specimen subtree; the swatch itself is a single `<button>` with an `aria-label` of the colorway name. Also: the "cyan-glow" hover ring needs a named token — call it **Ice Wing `#60C0F0`**, not "cyan," or your own retired-cyan audit will flag your own swatch hover state. The audit whitelist must explicitly exempt the Dual-Button Glow tokens.

**7. No editorial standards for the new colorways.**
"6–8 identity-strong NEW colorways" with a one-line identity story each — but no naming bar. The existing registry has `tron-grid`, `cyberpunk-edgerunners`, `midnight-mango` — marketplace junk names. If the new 6–8 arrive named the same way, the tray reads like a CTF scoreboard next to `crystalline-swan`. Pin the naming voice: two words, material/atmospheric, brand-adjacent (e.g., *Ember Forge*, *Velvet Hour*, *Glacier Mint* — not *neon-samurai-2077*).

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

1. **Missing retirement migration map — this strands users.** The audit may retire `tron-grid` or merge duplicates, but users have persisted colorway ids in localStorage *and likely in their profile on the backend*. The doc specifies versioned keys for *gallery prefs* but says nothing about `swan.colorway.retired-map.v1`: retired-id → replacement-id resolution on theme load, applied silently, persisted forward. Without it, retiring a colorway = a class of users booting into a broken or fallback theme. This is the single largest implementation hole in the document.

2. **The contrast audit rule is requested but not pinned to a formula or a pair matrix.** "Derive on-surface text from surface luminance" — which luminance? Pin it: WCAG 2.x relative luminance (sRGB channel → linear: `c/12.92` if `c≤0.04045` else `((c+0.055)/1.055)^2.4`; `L = 0.2126R + 0.7152G + 0.0722B`), ratio `(L1+0.05)/(L2+0.05)`. And pin the **pair matrix** over all 17 fields, not vibes: `text` vs `bg` ≥4.5, `text` vs `surface` ≥4.5, `text` vs `elevated` ≥4.5, `textSecondary` vs `surface` ≥4.5, `muted` vs `surface` ≥3.0 (large/UI-only, flagged otherwise), button-label color vs `primary` ≥4.5, focus-ring vs `surface` ≥3.0. Without the matrix, "the audit" is whatever the builder feels like testing.

3. **46 specimens must not mount 46 ThemeProviders.** The doc says the specimen paints from spec fields but not *how*. If the builder wraps each swatch in a styled-components `ThemeProvider`, that's 46 context subtrees re-rendering on every app theme change. Spec it: specimen consumes the raw `PremiumThemeSpec` object and sets CSS custom properties via a single inline `style` prop on the specimen root (`style={{ '--sw-bg': spec.bg, ... }}`); all inner elements read `var(--sw-*)`. Plus `React.memo` on `SwatchSpecimen` and `content-visibility: auto` on grid rows for the Archive section.

4. **Scroll region + focus ring clipping.** §B mandates `max-height + overflow-y:auto` but not the keyboard consequences: `scroll-padding-block: 8px` so `focus-visible` rings aren't clipped by the scrollport, `focus-visible` → `scrollIntoView({block:'nearest'})` behavior, and `overflow-y: auto` with `scrollbar-gutter: stable` so the grid doesn't reflow when the scrollbar appears. Missing all three = janky keyboard nav on the identity surface of the brand.

5. **64×44 specimen vs 44px hit area.** 44px height is exactly the floor — the *visual* is 64×44, but the doc must specify the button wraps the specimen with padding so the hit area is ≥44×44 **including** grid gap discipline (`gap` ≥8px so adjacent targets don't merge into a mis-tap zone at 375px). Also unspecified: grid columns per breakpoint. Pin: `repeat(auto-fill, minmax(72px, 1fr))` at ≥768px; exactly 3 columns fixed at ≤414px so rows stay scannable.

6. **The Gallery split will immediately re-violate the 300-line rule.** `GalleryPhotoGrid.tsx` owning three layout modes + four size presets + srcset logic is a 400-line file on arrival. The split list must go one level deeper: `GalleryGridView.tsx`, `GalleryListView.tsx`, `GalleryHeroView.tsx`, `galleryImageSrc.ts` (srcset/sizes builder). Add explicit line budgets per new file (≤300) and a CI lint that fails the build over it — otherwise the split is aspirational.

7. **`sizes` attribute must match the size-preset CSS exactly or it's a lie.** S/M/L/XL presets change the rendered cell width; if `sizes` doesn't mirror the preset's container query math per breakpoint, the browser fetches wrong-res images — the exact perf attack round-1 warned about, now self-inflicted. And `thumbnailUrl` can be null per the photo shape: mandate the fallback chain `thumbnailUrl ?? url` in `galleryImageSrc.ts` with a unit test, or S-preset cells 404 into broken-image icons.

8. **Responsive coverage is asserted, not specified.** Nothing in §F addresses 1440/2560/3840: at 3840, an `auto-fill` grid renders 12+ columns of postage stamps and Hero mode becomes a 3800px-wide mural. Pin: Gallery container `max-width: 1600px` centered; Hero mode caps cover width at `min(100%, 1200px)`; Grid caps at 6 columns ≥1440px. At <768px the doc says "which modes survive" but doesn't decide: **decide now — Grid and List only below 768px; Hero hidden; size presets collapse to S/L two-state toggle.**

9. **Badge interactivity is still listed as a decision to bake rather than a decision.** Since the doc demands commitment: **decorative.** `pointer-events:none`, `aria-hidden="true"` on all three badges. Filter-by-sport is a toolbar control with real 44px targets, not absolutely-positioned overlays nested in a clickable card. This kills the nested-interactive risk and the invalid-DOM risk in one move.

10. **`UniversalThemePremiumThemes.ts` growth.** 6–8 new colorways × ~20 lines each appended to a data file — fine — but require one colorway per exported const with a registry array at the bottom, so the Vitest audit can iterate without import gymnastics, and so the file stays a pure data module under audit control.

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Curate the tray; archive the rest — with family headers and the migration map.** Concretely: the Color tab renders a curated default tray of 16–20 specimens grouped under small-caps family headers (*Apex Darks / Jewel Gradients / Frost Glass / Heritage*), each family separated by a hairline `var(--border-subtle, #1A1A24)` rule; everything else lives in a collapsed "Archive (24)" disclosure at the bottom. Retired ids resolve through a versioned migration map at theme-load time.

Why this is the one: every other improvement — live specimens, contrast audit, new colorways — is invisible if the first thing the user sees is a 46-row wall of undifferentiated mini-UIs. Choice overload is the enemy of the jewel-box feel; a jewelry case is *edited*. This single decision converts Sean's accumulation instinct into a curation story he can demo ("we organized them into collections"), makes the specimen swatches legible as a set, gives the new 6–8 colorways a *stage* instead of a crowd, and the family headers give the Lens the editorial voice the brand has never had. It's also the only change on this list that a screenshot captures in one frame.

---

## (e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE

1. **They show the contrast grade on the swatch.** A tiny `AA`/`AAA` chip in the specimen corner, computed live from the same luminance function as the CI audit. It signals craft, costs one line per swatch, and turns your accessibility compliance into a visible feature. This doc never thinks of it.
2. **They morph, not snap.** Grid→List→Hero via the View Transitions API (`document.startViewTransition`, reduced-motion → instant swap) so the Gallery *reorganizes* instead of re-rendering. Plus `G`/`L`/`H` keyboard shortcuts and `+/−` for size, with a shortcut hint in the view control's tooltip. The doc specs three static layouts; a competitor specs one fluid surface.
3. **They make applying a theme an event.** Radial `clip-path` sweep emanating from the clicked swatch across the app shell (reduced-motion → instant) + an undo toast ("Reverted to Crystalline Dark"). The doc's apply is a silent context swap — the most important brand interaction on the site happens with zero ceremony.
4. **They prove distinctness numerically.** Their CI doesn't just check WCAG floors; it asserts minimum pairwise ΔE between colorways so duplicates *can't* regress. This doc audits duplicates once, by hand, in a table that rots the day colorway #47 lands.
5. **They'd still cut Showroom mode.** The idle-only framing makes it non-hostile, but it's a demo feature consuming toggle space, helper copy, localStorage schema, and test budget on the identity surface. A competitor ships the curated tray + live specimens + apply-sweep, and lets *that* be the showroom.

**Bottom line:** this round-2 doc is a faithful execution order of a good round-1 review, and the adopted mandates are correct. Before the builder starts: impose the curated-tray/Archive architecture with the retirement migration map, re-seed the lens derivation per family with a ΔE distinctness gate, pin the contrast audit's formula and pair matrix, commit EventDeck to the clean single cover, define Showroom's input semantics, and spec the specimen as presentational-only with per-swatch CSS-var scoping. Do those six and this produces a genuinely premium identity surface instead of a well-tested theme warehouse.
