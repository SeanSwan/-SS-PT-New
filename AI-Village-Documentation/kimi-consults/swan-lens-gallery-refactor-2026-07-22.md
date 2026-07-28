# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** docs/ai-workflow/brainstorms/swan-lens-gallery-refactor-kimi-brief-2026-07-22.md
**Seed:** (none)
**Tokens:** 4160 in / 4099 out · **Cost:** ~$0.0740 · **Wall:** 183.5s

---

# HOSTILE DESIGN + FRONT-END REVIEW — Swan Lens + Gallery Design Brief

## (a) VERDICT: **SHIP-WITH-CHANGES**

The engineering grounding is genuinely excellent — verified file:line citations, correct root-cause analysis on all three Swan Lens bugs, and the contrast-bug section (E) is the best thing in the document. But this brief is **design-hollow**: it delegates every taste decision while claiming to "make every decision so the builder makes none," ships one actively hostile feature (auto-cycle) with a hand-wave on reduced motion, and completely ignores the 300-line rule on a 2219-line file it plans to grow.

---

## (b) DESIGN WEAKNESSES (most severe first)

**1. The brief contradicts its own contract — and taste is the casualty.**
The header says "Make every decision so the builder makes none." Then the body says: "you choose a strong count," "you pick the set," "recommend, don't ask," "your call, justify it" — at least **nine** punt-to-the-planner moments. That's fine for a plan request, but it means the *entire* premium quality of both surfaces rides on decisions this document refuses to make. A brief this rigorous on plumbing and this vague on aesthetics produces a technically perfect, visually generic result. Pick the direction now: the Swan Lens is a **jewel-box / gem-tray** (dark velvet surface, each colorway a lit specimen), the Gallery is a **contact-sheet / light-table** (photographer's tool, not a Pinterest clone). Say it or the builder will ship Bootstrap-with-glow.

**2. "A lot more colorways" is a junk-drawer strategy.**
38 registered colorways already, and Sean *still* says "fewer than he used to have" — that tells you the problem was never count, it was **discoverability and differentiation** (which your own root-cause section proves: 26 were unreachable). Adding "a lot more" on top of `tron-grid`, `circuit-lime`, `midnight-mango`, and `vapor-dream` — names that already read like a 2019 VS Code theme marketplace — without a **curation pass** is designing by accumulation. The brief should mandate: audit the existing 38 for (a) banned-palette leakage (`aqua-abyss` and `tron-grid` are suspicious on sight given the retired `#00FFFF` ban — the brief bans the *tokens* but never requires auditing the *existing 20 premium themes* for cyan-adjacent hues), (b) near-duplicate dark-blue colorways, then add maybe **6–8 identity-strong new ones**, not "a lot." Quantity is how you get a theme picker that feels like a dropdown of regret.

**3. No signature moment is specified anywhere.**
Two surfaces, zero memorable beats. The Swan Lens Color tab is the literal identity surface of the brand — the place where "Enchanted Apex / Crystalline Swan" should be most felt — and the brief specifies it as "a scrollable grid." The EventDeck strip-slice is mentioned as optional with no commitment. A competitor ships one unforgettable interaction; this brief ships correct CSS.

**4. Auto-cycle mode (D) is hostile UX dressed as a feature request.**
A timer that re-themes the *entire application* under the user is the kind of thing that demos well in a meeting and infuriates in production:
- **Full-app repaint churn.** `setInterval` swapping `paletteThemeId` re-renders every styled-component subscribed to the theme context. "GPU-safe motion (transform/opacity)" is irrelevant — this isn't an animation, it's a **cascading style recalculation across the whole tree** every N seconds. On a 2219-line Gallery page with dozens of images, that's a jank machine.
- **The reduced-motion spec is a hand-wave.** "Decide whether reduced-motion disables it or just cross-fades slowly" is the single most important accessibility decision in the feature and it's left open. Answer: **reduced-motion disables auto-cycle entirely, and the toggle must say so in helper text.** A slowly-cross-fading auto-theme-change is still non-consensual motion and a cognitive/vestibular trigger.
- **Pause-on-interaction is unspecified at the critical moment**: what happens if the user is mid-hover on a *different* swatch when the timer fires? (Answer the plan must give: any pointer/keyboard interaction with the Color tab pauses the timer for 2× the interval; manual swatch selection turns Auto **off** and tells the user it did.)
- Default: **off, 30s, cycles featured-then-all, order = registry order.** The brief should have stated this, not asked for it.

**5. The EventDeck 6-strip cover slice is unpriced motion risk.**
Slicing a cover into 6 vertical strips means either 6 `background-position` copies (paint cost ×6 per cover, multiplied across an `auto-fill` grid of events) or clip-path tricks. On a gallery grid that could render 40 event cards, that's a scroll-jank generator on integrated GPUs — and the brief spec's it with **no reduced-motion fallback, no static degradation, and no budget** ("strips animate on hover only, `transform: translateY` stagger ≤200ms, `prefers-reduced-motion` → single unsliced cover"). Right now it's "adopt if it strengthens it — your call." That's not a decision.

**6. Gallery has zero mobile/density thinking.**
View modes and size presets are specced for desktop in the brief's imagination. At 320–414px: "Masonry / List / Hero" mode switchers + size presets + badges on a 200px-min grid is an unreadable density bomb. The brief never says which modes **collapse** on mobile (List and Grid only below 768px; size presets hidden, replaced by system default), never mentions 44px targets for the *new controls specifically*, and never addresses that `minmax(200px,1fr)` already overflows a 320px viewport with padding.

**7. Masonry will break reading order and keyboard focus.**
CSS-column masonry lays out top-to-bottom-then-next-column: visual order ≠ DOM order → keyboard tab order and screen-reader order scramble. The brief lists "Masonry" as a candidate with no a11y caveat. Either mandate **DOM-order-preserving masonry** (JS-distributed columns, `role="feed"` or row-based grouping) or cut Masonry and ship Grid / List / Hero. I'd cut it — three strong modes beat four broken ones.

---

## (c) IMPLEMENTATION-FIDELITY ATTACKS

1. **The 300-line rule is violated by the brief's own plan.** `GalleryPage.tsx` is **2219 lines** — 7× the cap — and the brief asks the builder to add view-mode state, size state, persistence, three layout containers, and a cover redesign *into it* without mandating decomposition. The plan's file-by-file build order **must** include extraction: `GalleryEventCard.tsx`, `GalleryPhotoGrid.tsx`, `GalleryViewControls.tsx`, `galleryViewPrefs.ts` (localStorage hook), `GalleryPage.styles.ts`. A plan that grows a 2219-line file is a non-compliant plan, full stop.

2. **`var(--token, #fallback)` fallbacks in the contrast fix are unspecified.** Fix (E) says "replace `--frost-white` with `--text-primary`" — but never verifies that `--text-primary` **exists as a CSS custom property on every one of the 38+ themes**, or what the fallback chain is. The light theme object has `text.primary` as a JS token; that doesn't mean the styled-components theme provider emits it as a CSS var with that name. The plan must specify the exact emitted variable names and Crystalline fallbacks (`var(--text-primary, #E0ECF4)` on dark surfaces is wrong on light themes if the var is missing — fallback must match the *surface*, not the theme).

3. **Contrast-table scope is too small.** The brief demands proof for 4–6 themes and calls it done. You're shipping 38+ colorways plus N new ones, each driving adaptive tabs/cards/buttons. The fix must be **algorithmic** (derive on-surface text from surface luminance at build/test time — a Vitest contrast audit across the full registry) not a hand-built table of six rows that rots the moment colorway #39 lands. The brief even hints at this ("except in audit tables/tests") then doesn't require the test.

4. **232 hand-authored world-values will produce guard violations.** 29 lenses × 8 roles, hex6, R1–R7 + WCAG, authored by hand per the brief's ask. Without a **derivation function** (base seed + role transforms + a CI test that runs the design-value guard over all 29), at least a handful will fail contrast or drift into banned hues. The brief never requires the test that would catch it.

5. **Fixed picture-size presets without `srcset`/`sizes` is a perf attack on yourself.** XL presets on 2560/3840 viewports will pull full-res `url` images into grid cells unless the plan mandates responsive image selection between `thumbnailUrl` and `url` keyed off the size state and `window.devicePixelRatio`. The photo shape carries both fields (`:1943-1951`) and the brief never uses them.

6. **localStorage persistence has no versioning/migration.** "Give the keys" — fine — but no schema version (`swan.gallery.view.v1`), no validation of stored enum values on read (a stale `"masonry"` after you cut the mode crashes or silently no-ops), no SSR/incognito guard. Same for the auto-cycle keys.

7. **Badge overlays are nested-interactive and touch-target risks.** `SportBadge`/`PhotoCountBadge` are absolutely positioned over `EventCover`, which is presumably inside a clickable card. The brief doesn't state whether badges are interactive (filter-by-sport would be the premium move) — if yes, they're <44px nested interactive elements inside a clickable card = invalid interaction nesting; if no, they must be `pointer-events:none` and `aria-hidden` decorative. Undecided in the brief.

8. **"1 photos" plural bug** — correctly caught, but the fix must be spec'd as an ICU-style plural helper (`formatPhotoCount(n)`), not a ternary, since this string shape will recur.

---

## (d) THE ONE HIGHEST-IMPACT CHANGE

**Make every colorway swatch in the Swan Lens a live miniature, not a chip.**

Instead of a flat color dot or gradient tile, each of the 38+ swatches renders a **tiny live "wing shard"** — a ~64×44px miniature UI specimen (a sliver of sidebar, one button, one line of text) painted entirely from *that theme's actual tokens* (`bg`, `surface`, `primary`, `accent`, `text`). The user isn't picking a color; they're previewing their app wearing that skin, at thumbnail scale, for all 38 at once. That single decision:
- **Solves Sean's (B) complaint transitively** — "styles look the same" dies when the picker itself demonstrates token-level difference.
- **Is the signature moment** — nobody else has a theme picker where the catalog is 38 living mini-apps.
- **Enforces the Dual-Button Glow** organically: active swatch gets blue-bg→purple-glow ring; hover gets the cyan-glow counterpart, `transform: translateY(-2px)`, GPU-safe, suppressed under reduced-motion.
- Implementation is cheap: one `<SwatchSpecimen theme={spec} />` component reading the `PremiumThemeSpec` fields already in the registry — no new data required, pure rendering upgrade.

Do this and the Swan Lens stops being a settings panel and becomes the brand's jewelry case. Everything else in the brief is maintenance; this is the thing Sean screenshots.

---

## (e) WHAT A DESIGN-SAVVY COMPETITOR OUT-BUILDS HERE

1. **They curate; this brief accumulates.** A competitor ships 12 impeccable, named-with-taste colorways with a one-line identity story each ("Ruby Forge — heat under pressure") and deletes the redundant 20. This brief ships 46+ with no editorial voice.
2. **They make the picker the demo.** Live-specimen swatches (above), a before/after "apply" sweep animation where the theme washes across the app from the clicked swatch's position (radial `clip-path`, reduced-motion → instant), and an undo toast. This brief ships scrollable grids.
3. **They treat the Gallery as a photographer's tool** — keyboard-first (arrow-key lightbox, `G/L/H` to switch view modes, `+/-` for size), view transitions via the View Transitions API so Grid→List *morphs* instead of snaps, and a cover hero with parallax-on-scroll. This brief specs none of that.
4. **They write the contrast audit as a test, once** — and never think about WCAG per-colorway again. This brief requests a static table that will silently rot.
5. **They'd kill auto-cycle in review** — or ship it properly as a "Showroom mode" explicitly framed as a demo/screensaver feature (idle-only activation after 60s of no input, exits on any input), which is the only version of this feature that isn't hostile.

**Bottom line:** the plumbing in this brief is A-grade. The taste layer is unassigned, the auto-cycle feature is unguarded, and the 2219-line file is about to get worse. Fill the design direction, mandate the file split, gate auto-cycle behind reduced-motion-off + idle-only or cut it, and make the swatches live specimens — then ship.
