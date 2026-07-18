# Kimi K3 — Front-End / Design Review

**Reviewer:** OpenRouter `moonshotai/kimi-k3` (effort: high)
**Document:** .ai-workflow/fusion/kimi-photography.md
**Seed:** (none)
**Tokens:** 1479 in / 14973 out · **Cost:** ~$0.2290 · **Wall:** 494.3s

---

# KIMI K3 — HOSTILE DESIGN + FRONT-END REVIEW
**Target:** PHOTOGRAPHY GALLERY brief (`GalleryPage.tsx`, verified 2219 lines @ `96ac6bd3d`)

Evidence key: **[V]** verified in brief · **[P]** pattern-certain from "Gemini 3.1 Pro 'Cosmic Gate'" authorship — audit to confirm · **[GAP]** absent from the brief, will bite the builder.

---

## (a) VERDICT

**SHIP-WITH-CHANGES — the process spine is elite, but the brief polishes a *gate* when it should stage a *reveal*: as written, a builder ships a well-engineered reskin of a generic AI wall, not a premium Crystalline Swan gallery.**

---

## (b) Design weaknesses, most-severe first

**1. The concept centers the wrong protagonist. [V]** The surface is named "Cosmic **Gate**." The flow is event list → *barrier* → photos. The first thing a visitor meets is a form, not photography — and the brief preserves this IA as the thing to "enhance." A gate is the most-hated element in any gallery; making it your named hero is a category error. The brand moment must be the **reveal** (Crystallize), with the gate as its setup. Rename the surface. Codenames leak into flags, classes, analytics events — "cosmic" dies today, not at launch.

**2. De-Galaxy is a language transplant, not a palette swap — the brief underestimates this. [P]** A Gemini "cosmic" page is near-certainly running: starfield/particle canvas, radial nebula gradients, neon glow shadows, glassmorphic card. Find-replacing `#0a0a1a/#00FFFF/#7851A9` leaves a cosmic painting in new colors. Starfields = points of light = galaxy idiom, banned in spirit. Crystalline idiom is **refraction, facets, caustics, frost, sapphire depth** — optics-not-creatures. The audit regex must also catch the palette in disguise: `rgba(0,255,255,·)`, `rgba(120,81,169,·)`, `rgba(10,10,26,·)`, `hsl()` equivalents.

**3. Chrome competes with the product. [P→GAP]** This is a *photography* surface. Color-critical imagery surrounded by cyan/purple glow corrupts the viewer's white-balance adaptation (simultaneous contrast) — every working photographer will feel it as "cheap." Premium galleries are obsidian-neutral black-box museums: chrome invisible until intent. The brief's "cinematic allowed" (marketing tier) will be read as license for persistent ambient motion and glow on everything. Cap it: **one chromatic accent per viewport; all narrative motion reserved for the Crystallize.**

**4. CTA sprawl — five actions, no declared primary. [V]** Email gate, event password, download, donate, enhancement credits — the brief never assigns hierarchy per surface. With the Dual-Button Glow law, glow inflation is guaranteed: if everything glows, nothing does. Decree: Gate surface → "View the gallery" is the ONLY primary. Grid → photos are the CTA; download is icon-only secondary. Lightbox → Download primary. Donate → **timed** (post-download gratitude peak: "This download is free — tip the artist"), never persistent chrome. Credits → post-gate only (see 6).

**5. Watermark theater. [V]** "CSS-only watermark overlay, downloads stay clean" = zero deterrence, per-tile paint cost across ~200 thumbs, and a nested-interactive landmine (overlay sitting on the tile's hit target — either `pointer-events:none` and it does nothing, or it eats clicks). Decision the brief ducks: if deterrence is real, bake it into a preview rendition server-side (NEW backend flag); if it's decorative, reduce to one corner sigil on the lightbox at 40% opacity, `aria-hidden`, `pointer-events:none`. The tiled-diagonal-text pattern is banned — it reads stock-site-cheap.

**6. Credits on a public page = identity ambiguity. [GAP]** Credits imply an identity; the gate is email-only, zero-PII. The UI will either show a balance that can't exist, a dead pill, or leak state. The brief never reconciles this. Resolve before build: credits surface only after email-identified session, or move them to the client portal.

**7. Typography is absent from the brief. [GAP]** A gallery is 80% type-and-image rhythm and the brief says nothing. Expect Gemini defaults [P]: tracked-out 0.2em uppercase everywhere, no numeric treatment. Decree: display face for event titles; UI sans for chrome; microcopy 12px/0.08em uppercase; `font-variant-numeric: tabular-nums` for counts/dates/"3 / 48"; body 16px/1.45 minimum.

**8. Dark-mode contrast will fail exactly where it always fails. [P]** Purple-on-obsidian text: the retired `#7851A9` on `#0a0a1a` computes to **3.3:1 — fails 4.5:1**; any Crystalline wing-purple fallback must be ≥ ~`#8E6FE8`-lightness to pass. Audit every `rgba(255,255,255,0.x)` secondary text: below ~0.55 alpha on obsidian fails AA. Focus indicators need 3:1 against adjacent (1.4.11), not just visible.

**9. Justified-grid failure modes at the extremes. [P]** Hand-rolled justified math (inline in 2219 lines) guarantees: orphan last row stretched grotesque, 320px sliver tiles, 2560/3840 billboard rows. Rules: last row renders at target height, left-aligned, never stretched beyond 1.3× target; container capped (below).

---

## (c) Implementation-fidelity attacks

**styled-components / de-Galaxy:** A 2219-line tsx means styles, gate logic, grid math, lightbox, watermark, donations, credits all inline — ad-hoc spacing rhythm is guaranteed; there are no shared primitives to be consistent *with*. Expect [P]: raw hex in template literals, per-render dynamic interpolation class thrash, duplicated `keyframes`, emoji as icons (📷💎⬇ — ban; single stroke-1.5 icon set, 20px glyph inside 44px target), and possibly a smuggled MUI Modal for the lightbox — verify.

**THE Rule-1 breach the brief missed [GAP, most important technical catch]:** a justified grid requires intrinsic aspect ratios **before load**, and the grid needs renditions (thumb ~600w / preview ~1600w / full) with `srcset/sizes`, `loading="lazy"`, `decoding="async"`, LQIP placeholders, `fetchpriority="high"` on row one. If the photos model lacks width/height + rendition URLs, the builder must mock ratios — violating Sean's Rule 1 — or ship 8MB originals as thumbs and layout-thrash. **FLAG NEW BACKEND (additive): dimension columns + rendition pipeline, or expose existing media-pipeline metadata.** Same flag covers the baked-watermark variant and OG-image serving.

**The fixed-position trap [P]:** a cosmic parallax page *will* have transformed/filtered ancestors — `position:fixed` lightbox inside a transformed ancestor clips and mis-positions. Lightbox must portal to `document.body`. Also: `100vh` gate on iOS Safari = chrome-collapse bug; use `100dvh`/`svh`.

**Fake-form risk [P]:** Gemini submits via `div onClick`. That breaks Enter-submit, password managers, and autofill — direct conversion loss on the conversion surface. Demand: real `<form onSubmit>`, `type="email"`, `inputmode="email"`, `autocomplete="email"`, per-event `autocomplete="current-password"`, `aria-invalid` + `aria-describedby` errors at AA contrast.

**Nested interactive / invalid DOM [P]:** tile-as-`<button>` wrapping download/watermark/credit buttons = invalid. Fix with stretched-hit pattern: `<article>` + absolutely-positioned inset:0 primary hit *below* sibling action buttons in z-order. `<img alt="{eventTitle} — photo {i}">`. Lightbox: `role="dialog"`, `aria-modal="true"`, `aria-label="{event} photo {i} of {n}"`, `inert` on background, scroll-lock with scrollbar-width padding compensation (kills the classic shift-jank).

**Keyboard/focus/reduced-motion [P]:** in a 2219-line component, expect window-level Esc listeners with stale closures and no cleanup, no focus trap (or one that leaks when a donate modal nests inside the lightbox = focus war), and no focus return to the originating tile. Zero `prefers-reduced-motion` handling near-certain. Motion audit: ban animating `box-shadow`, `filter`, `background-position`, `top/left/width/height` — transform/opacity only; swipe via Pointer Events with `touch-action: pan-y` (threshold 48px or 0.25px/ms velocity), never touchstart hacks that fight native scroll.

**Responsive matrix the builder must hit (decrees, not suggestions):**

| vw | container max | grid rowH | gap | notes |
|---|---|---|---|---|
| 320 | 100%−32px | 132px | 4px | gate card 288px, pad 20px, ONE field visible (password conditional); last-row left-align |
| 375 | 100%−32px | 140px | 4px | |
| 414 | 100%−32px | 148px | 6px | |
| 768 | 720px | 180px | 8px | gate card 400px max, pad 28px |
| 1024 | 960px | 210px | 10px | |
| 1440 | 1200px | 240px | 12px | lightbox controls anchor to media box |
| 2560 | **1600px cap** | 240px | 12px | negative space IS the luxury — do not stretch |
| 3840 | **1600px cap** | 240px | 12px | media max 1680w × 90dvh |

**44px:** lightbox arrows/close/download at 48px hit, gate inputs 48px tall, password-visibility toggle 44px, donation amount chips 48px.

**Decomposition (required deliverable — my split, all <300):** `GalleryPage.tsx` shell+flag (≤120) · `gallery.api.ts` · `gallery.types.ts` · `useGalleryEvents.ts` · `useEventPhotos.ts` · `useEventAccess.ts` · `EventCard.tsx` · `AccessGate.tsx` · `CrystallizeReveal.tsx` · `JustifiedGrid.tsx` + `useJustifiedRows.ts` (pure math, unit-testable) · `GridTile.tsx` · `Lightbox.tsx` + `LightboxToolbar.tsx` + `useLightboxNav.ts` + `useFocusTrap.ts` + `useSwipe.ts` · `WatermarkSigil.tsx` · `DonatePanel.tsx`. ~19 files. Cheap-shadow decree for all surfaces: `inset 0 1px 0 var(--lens-edge-hi, rgba(255,255,255,0.06))` + `0 16px 40px var(--lens-umbra, rgba(0,0,0,0.45))`; chroma glow ONLY on primary CTA per Dual-Button Glow (blue bg→purple glow, purple bg→cyan glow).

---

## (d) THE ONE highest-impact change

**Kill the gate-as-wall. Build the Crystallize Reveal.** Photos-first: the event page opens on a live contact sheet — first 8 photos as blurred renditions under an obsidian scrim (`var(--lens-scrim, rgba(7,11,20,0.55))`), gate card floating with one CTA. On successful submit, the gate doesn't *close* — it **crystallizes**: a light band sweeps the scrim (`translateX`, 480ms, `cubic-bezier(0.22,1,0.36,1)`); the scrim shatters into 6 clip-path prism facets that scale/rotate to zero (transform/opacity only, 320ms, 40ms stagger); blur resolves by opacity-crossfading blurred→sharp renditions (300ms, NOT animating `filter`); **exactly one facet carries gold** — the only gold on the page. Reduced-motion: 150ms opacity crossfade, zero geometry.

Why this is THE change: it converts the highest-friction moment into the screenshot-able brand signature; it forces the correct photos-first hierarchy as a side effect; it's pure optics-not-creatures idiom; and it makes email capture feel like an *unlock achievement* instead of a tax. No template has it. It's the thing a competitor cannot reskin their way into.

---

## (e) What a design-savvy competitor out-builds here

1. **Deep-linkable lightbox** (`/gallery/:eventSlug/photo/:photoId`) + per-event OG unfurls. Every shared photo hits the gate = a lead funnel. The brief omits this entirely — it's the growth loop. Flag: SPA OG needs a server/prerender endpoint (new backend).
2. **Image-pipeline sophistication:** LQIP/blurhash placeholders, AVIF/WebP srcset, preconnect, row-one `fetchpriority` — perceived-instant vs our blank dark grid.
3. **View-Transitions tile→lightbox shared-element morph** (progressive enhancement over the crossfade) — the "how did they do that" moment. GPU-safe by spec.
4. **Proofing-grade lightbox:** filmstrip rail, pinch/double-tap zoom on full-res, multi-select + zip download, favorites. Pixieset/Pic-Time/ShootProof win on exactly this — that is the real competitive bar, not other AI-reskinned sites.
5. **Gratitude-timed donation ask** with one-tap amounts — out-converts persistent chrome every time.

---

## Required amendments before build (what makes the verdict SHIP)

1. Re-center IA: photos-first, gate-as-setup, Crystallize-as-payoff; rename the surface off "Cosmic Gate."
2. FLAG NEW BACKEND: photo dimensions + rendition pipeline (Rule-1 blocker), watermark-baked preview variant, OG endpoint, credits-balance binding for email-identified sessions.
3. Declare per-surface single-primary CTA law; donations move to post-download timing.
4. Resolve the credits/identity model — or credits leave the public surface.
5. Add the typography scale, the responsive matrix, and the ambient-motion cap to the brief as binding numbers, not vibes.

The spine (reversibility, additive-only, decomposition, acceptance tests) is the best brief-discipline I've seen on this codebase. Fix the protagonist and the missing backend flags, and this is ready to build verbatim.
