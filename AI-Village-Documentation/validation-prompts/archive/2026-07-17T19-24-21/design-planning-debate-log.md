# UX/UI Design Specification — Recursive Consensus Debate Log

> **Consensus:** YES — Models agreed
> **Rounds:** 3
> **Tokens:** 18,768 input / 6,684 output

---

## Creative Director (Lead Design Authority) — Round 1

# CREATIVE DIRECTOR'S DESIGN SPECIFICATION — World-Switcher Marketing Redesign
**Authority:** Final. Every pixel below is binding. No hex is hardcoded except as a brand fallback inside `var(--token, #fallback)`. Palette Law A is non-negotiable: Chrome is Crystalline Swan, always; Worlds are weather.

---

## 0. Global Token Contract (the spine every surface inherits)

These are the ONLY color tokens any surface may consume. Worlds populate `--world-*`; Chrome never touches them.

```
/* Chrome — Crystalline Swan, immutable */
--chrome-bg:           var(--ss-obsidian, #0A0A0F);
--chrome-surface-1:    var(--ss-carbon, #141419);
--chrome-surface-2:    var(--ss-graphite, #1A1A24);
--chrome-surface-3:    var(--ss-royal-depth, #003080);
--chrome-text-primary: var(--ss-frost-white, #E0ECF4);
--chrome-text-muted:   var(--ss-ice-wing, #60C0F0);
--chrome-accent-blue:  var(--ss-arctic-cyan, #50A0F0);
--chrome-accent-purple:var(--ss-wing-purple, #8B5CF6);
--chrome-accent-gold:  var(--ss-gilded-fern, #C6A84B);
--chrome-lavender:     var(--ss-swan-lavender, #4070C0);
--chrome-sapphire:     var(--ss-midnight-sapphire, #002060);
--chrome-border:       rgba(224,236,244,0.12);
--chrome-scrim:        rgba(10,10,15,0.72);

/* World — populated per-atmosphere, consumed ONLY by WorldLayer */
--world-base, --world-accent, --world-particle, --world-grade, --world-leak
```

**Type ramp (Chrome, fixed across all worlds):**
- Display: 56/64/−1.5% — `clamp(2.5rem, 6vw, 3.5rem)`, weight 700, letter-spacing −0.02em
- H1: 40/48 — `clamp(2rem, 4.5vw, 2.5rem)`, 700
- H2: 32/40 — `clamp(1.5rem, 3vw, 2rem)`, 600
- H3: 24/32 — 600
- Body: 16/26 — 400
- Small: 14/22 — 500
- Micro: 12/18 — 600 uppercase, letter-spacing 0.08em

**Spacing scale (8pt):** 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128
**Radii:** 4 (chips) · 8 (inputs) · 12 (cards) · 20 (hero panels) · 999 (pills)
**Breakpoints:** 360 · 480 · 768 · 1024 · 1280 · 1536 · 1920 · 2560 (4K)

---

## 1. WorldLayer (atmosphere — `aria-hidden`, never owns content)

**Role:** the weather. Renders behind `ChromeLayer`. Purely decorative.

### Layout
- `position: fixed; inset: 0; z-index: 0; pointer-events: none;`
- `ChromeLayer` sits `z-index: 1` above it.
- Three stacked sub-layers, all `position: absolute; inset: 0`:
  1. **Base gradient** — radial at 30% 20%, `var(--world-base, #0A0A0F)` → `var(--chrome-bg, #0A0A0F)`.
  2. **Grade scrim** — `linear-gradient(180deg, transparent 0%, var(--world-grade, rgba(0,32,96,0.18)) 100%)`.
  3. **Particle/light field** — SVG `<feTurbulence>`-driven or canvas, capped at 60 particles, `var(--world-particle, #60C0F0)` at 0.08–0.22 opacity.

### Per-breakpoint density
| Breakpoint | Particles | Particle size | FPS cap |
|---|---|---|---|
| 360–479 | 0 (static poster-grade) | — | 0 |
| 480–767 | 24 | 1–2px | 30 |
| 768–1023 | 40 | 1–3px | 30 |
| 1024–1535 | 60 | 1–4px | 60 |
| 1536–2559 | 60 | 2–5px | 60 |
| 2560+ | 90 | 2–6px | 60 |

### States
- **Default:** base + grade + particle at surface motion tier.
- **Reduced-motion (`prefers-reduced-motion: reduce`):** particle layer removed; base + grade only, static. No animation.
- **Low-battery / `saveData`:** particle layer removed; grade opacity halved.
- **Off-viewport (IntersectionObserver):** particle RAF paused; layer kept painted (cheap).

### Motion
- Particle drift: `transform: translate3d()` only, 18–28s loops, `cubic-bezier(0.4, 0, 0.6, 1)`, staggered.
- Grade shimmer (M3 only): opacity 0.16↔0.24, 12s, `ease-in-out`.
- World **transition** on switch: cross-fade 600ms `cubic-bezier(0.65, 0, 0.35, 1)`, base layer only; particles dissolve via opacity 300ms out / 300ms in.

### Accessibility
- `aria-hidden="true"` on root.
- `inert` not required (no interactive children — enforced by snapshot test).
- Contrast guarantee: WorldLayer never renders text. Any text must sit in ChromeLayer with `--chrome-scrim` behind it where it overlaps WorldLayer.

---

## 2. ChromeLayer (content guarantee — thin wrapper)

**Role:** the brand anchor. Every page's content mounts here. Snapshot test asserts zero raw-hex backgrounds inside it.

### Layout
- `position: relative; z-index: 1;`
- `background: transparent` (lets WorldLayer show through) EXCEPT on calm-zone surfaces (Contact form, Store checkout, Waiver) where it paints `var(--chrome-scrim, rgba(10,10,15,0.72))` + `backdrop-filter: blur(12px) saturate(1.1)`.
- Max content width: `min(1280px, 92vw)`; 4K: `min(1440px, 80vw)`; ultrawide (≥1920 aspect ≥2.1): `min(1440px, 70vw)` centered with side gutters showing WorldLayer.
- Vertical rhythm: 96px section gaps desktop, 48px mobile.

### States
- **Default:** transparent.
- **Calm zone (M0/M2 surfaces):** scrim + blur.
- **Focus-visible within:** ring `2px solid var(--chrome-accent-blue, #50A0F0)`, offset 2px, never clipped.

---

## 3. World Switcher UI (upgraded `UniversalThemeToggle` → picker)

**Role:** the delight-multiplier. Header control. NOT on dashboards (locked to default world per UX research).

### Trigger button (header)
- 44×44px touch target (mobile), 36×36px visual (desktop ≥1024).
- Icon: custom swan-mark inside a ring; ring stroke = `var(--chrome-accent-blue, #50A0F0)`, 1.5px.
- Background: `var(--chrome-surface-1, #141419)`, border `1px solid var(--chrome-border)`, radius 12.
- **Default:** as above.
- **Hover:** border → `var(--chrome-accent-purple, #8B5CF6)`, glow `0 0 0 3px rgba(139,92,246,0.18)` (Dual-Button Glow: surface-1 → purple glow).
- **Active:** scale 0.96, 100ms `ease-out`.
- **Focus-visible:** ring `2px solid var(--chrome-accent-blue, #50A0F0)`, offset 2px.
- **Disabled:** opacity 0.4, cursor not-allowed.
- **Active-world indicator:** 4px dot bottom-right, color = `var(--world-accent, #60C0F0)`.

### Picker panel
- **Mobile (≤767):** bottom sheet, slides up from viewport bottom. Width `100vw`, max-height `80vh`, radius 20 top corners, drag handle 40×4px centered, `var(--chrome-surface-2, #1A1A24)` bg, `--chrome-scrim` behind.
- **Desktop (≥768):** dropdown, 420px wide, anchored bottom-right of trigger, radius 12, 8px offset, same bg.
- Padding: 16px. Gap between groups: 24px.

### Group headers
- Micro label: "NATURAL", "COSMIC", "LUXURY", "GAMING", "EDITORIAL".
- Color: `var(--chrome-text-muted, #60C0F0)`, 12px, 600, uppercase, letter-spacing 0.12em.
- Margin-bottom: 12px.

### World option rows
- Grid: mobile 2-col, desktop 1-col list.
- Each option: 44px min height, full width, padding 8px 12px, radius 8, `display: grid; grid-template-columns: 44px 1fr 16px; gap: 12px; align-items: center`.
- **Preview swatch (44×44):** miniature live render of the world's base gradient + accent dot. Radius 8. Border `1px solid var(--chrome-border)`.
- **Label:** `var(--chrome-text-primary, #E0ECF4)`, 14px, 500. Sublabel (atmosphere name) 12px `var(--chrome-text-muted, #60C0F0)`.
- **Selected check:** 16px swan-mark glyph, `var(--chrome-accent-gold, #C6A84B)`.
- **Default:** transparent bg.
- **Hover:** bg `rgba(80,160,240,0.08)`, preview swatch border → `var(--chrome-accent-blue, #50A0F0)`.
- **Focus-visible:** ring inside row, `2px solid var(--chrome-accent-blue, #50A0F0)`, offset 1px.
- **Active/selected:** bg `rgba(139,92,246,0.12)`, swatch border → `var(--chrome-accent-purple, #8B5CF6)`, glow `0 0 12px rgba(139,92,246,0.25)`.
- **Loading (applying world):** row shows 12px spinner `var(--chrome-accent-blue, #50A0F0)`, 600ms max.

### Motion
- Panel open: mobile sheet `translateY(100%)→0` 280ms `cubic-bezier(0.16,1,0.3,1)`; desktop dropdown `opacity 0→1, translateY(-8px)→0` 180ms same curve.
- Close: reverse, 200ms `cubic-bezier(0.4,0,1,1)`.
- World apply: 600ms cross-fade on WorldLayer (see §1); picker stays open until transition completes, then auto-close 200ms after.
- Reduced-motion: all panel motion → 0ms instant; world apply → instant token swap, no cross-fade.

### Accessibility
- Trigger: `aria-haspopup="listbox"`, `aria-expanded`, `aria-label="Choose world atmosphere"`.
- Panel: `role="listbox"`, `aria-label="World atmospheres"`.
- Option: `role="option"`, `aria-selected`.
- Keyboard: `Tab` to trigger → `Enter`/`Space` opens → `ArrowUp/Down` moves focus (roving tabindex) → `Enter` selects → `Esc` closes + returns focus to trigger. `Tab` when open moves to next header control (does NOT trap).
- Group headers: `role="presentation"` with `aria-label` on the listbox section via `aria-labelledby`.
- Contrast: all labels 4.5:1 against `--chrome-surface-2` (Frost White on Graphite = 14.8:1 ✓).

---

## 4. Swan Video Hero (Home `/`)

**Role:** the wow moment. Enhanced, never replaced.

### Layout
- Full-bleed: `min-height: 100svh` mobile, `min-height: 92vh` desktop, `max-height: 1080px` at 4K.
- `<video>`: `position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center 30%`.
- Poster: `swans-poster.webp` (MUST ship — fixes blank reduced-motion hero).
- Z-stack (bottom→top): video → world-grade overlay → light-leak → particle foreground (M3) → content scrim → content.

### World-graded overlay (one asset, N moods)
- Grade scrim: `linear-gradient(135deg, var(--world-grade, rgba(0,32,96,0.35)) 0%, transparent 60%)`, `mix-blend-mode: multiply`, opacity 0.55.
- Light-leak: radial at 80% 90%, `var(--world-leak, rgba(96,192,240,0.18))`, `mix-blend-mode: screen`, opacity 0.4, blur 80px.
- These are CSS only — zero re-encoding.

### Content (over video)
- Container: `min(1280px, 92vw)`, padding 24px mobile / 48px desktop, bottom-anchored `flex-end`.
- Display headline: "Personal training, crystallized." — `var(--chrome-text-primary, #E0ECF4)`, Display ramp.
- Subhead: 18px, `var(--chrome-text-muted, #60C0F0)`, max-width 52ch.
- CTA row: primary + secondary, gap 12px, wrap on mobile.

### Primary CTA button (Dual-Button Glow)
- 44px min height, padding 16px 28px, radius 999, weight 600.
- **Default:** bg `var(--chrome-accent-blue, #50A0F0)`, text `var(--chrome-bg, #0A0A0F)`.
- **Hover:** glow `0 0 24px rgba(139,92,246,0.55), 0 0 48px rgba(139,92,246,0.25)` (blue bg → purple glow), translateY −2px.
- **Active:** translateY 0, glow compressed to 12px.
- **Focus-visible:** ring `3px solid var(--chrome-accent-purple, #8B5CF6)`, offset 2px.
- **Loading:** spinner replaces label, bg unchanged.
- **Disabled:** opacity 0.45.

### Secondary CTA (ghost)
- Same dims, transparent bg, border `1.5px solid var(--chrome-text-primary, #E0ECF4)`, text `var(--chrome-text-primary, #E0ECF4)`.
- **Hover:** border → `var(--chrome-accent-purple, #8B5CF6)`, text unchanged, glow `0 0 16px rgba(139,92,246,0.3)`.

### Signature depth beat (M3 only)
- Scroll-scrub: video `scale: 1 → 1.08` and `translateY: 0 → −24px` across first 60vh of scroll, `cubic-bezier(0.16,1,0.3,1)`.
- Single particle burst at 30vh threshold: 18 particles emanate from swan-mark, 1200ms, `ease-out`, once per session (sessionStorage flag).
- Reduced-motion: scale/parallax = 0; burst = static 3-particle fade-in.

### Performance
- `preload="none"` until IntersectionObserver fires; `poster` always set.
- Pause off-viewport; teardown on unmount.
- Battery API: if discharging < 20%, skip particle foreground, keep grade only.

### Accessibility
- `<video>`: `muted`, `playsinline`, `aria-hidden="true"` (decorative; headline conveys message).
- Content scrim: `linear-gradient(transparent, var(--chrome-scrim))` bottom 50% — guarantees headline 4.5:1.
- CTAs: real `<button>`/`<a>`, 44px, focus-visible ring.

---

## 5. Home Page — Four-Act Cinematic Rebuild (`/`)

Mobile-first single column; expands at 768/1024.

### Act 1 — Hero (above)
- As §4. 100svh.

### Act 2 — Proof bar
- Sticky strip below hero, 64px tall, bg `var(--chrome-surface-1, #141419)`, border-bottom `1px solid var(--chrome-border)`.
- 3 stats (claims-audited): "26+ years", "NASM-protocol", "Swan Coach guided". 14px, gold accent numbers `var(--chrome-accent-gold, #C6A84B

---

## Design Reviewer & Implementation Challenger — Round 2

I have reviewed the Creative Director's Design Specification (Round 1). The token contract, Palette Law A, and the structural separation of `WorldLayer` and `ChromeLayer` are exceptionally well-conceived. The visual hierarchy is strong.

However, I cannot sign off on the current spec due to critical performance bottlenecks and a severe WCAG violation regarding the mobile bottom sheet. 

Here are my specific disputes and proposed implementation changes:

### 1. DISPUTE: Hero Video LCP Bottleneck (Section 4)
**The Issue:** You specified `preload="none" until IntersectionObserver fires` for the Swan Video Hero. 
**Why it fails:** The Hero is above the fold (`min-height: 100svh`). Waiting for the DOM to parse, JS to execute, the IO to register, and *then* requesting the video will absolutely destroy our Largest Contentful Paint (LCP) metrics. 
**Proposed Alternative:** 
The Hero video must be treated as a critical asset. IO lazy-loading should only apply to off-screen media.
*   **Change:** Set `preload="auto"` on the Hero `<video>`.
*   **Code Addition:** Add a preload hint in the document `<head>` specifically for the hero video to fetch it before the DOM even finishes parsing:
    ```html
    <!-- In document <head> -->
    <link rel="preload" as="video" href="/assets/hero-swan-720p.mp4" type="video/mp4">
    ```

### 2. DISPUTE: Mobile Bottom Sheet Focus Trap (Section 3)
**The Issue:** Under Accessibility for the Picker panel, you stated: `"Tab when open moves to next header control (does NOT trap)."`
**Why it fails:** On desktop (dropdown), a non-trapping roving tabindex is correct. However, on mobile (`<=767px`), you designed an `80vh` bottom sheet with a `--chrome-scrim` behind it. Visually and functionally, this is a modal. Allowing screen readers or keyboard users to tab out of the bottom sheet into the obscured background page violates WCAG 2.4.3 (Focus Order) and creates a confusing UX.
**Proposed Alternative:** 
Fork the accessibility behavior based on the viewport/component type.
*   **Desktop (Dropdown):** `role="listbox"`, roving tabindex, no focus trap.
*   **Mobile (Bottom Sheet):** Must be wrapped in `role="dialog" aria-modal="true"`. Focus **MUST** be trapped within the bottom sheet until it is dismissed via the drag handle, a selection, or the `Esc` key.

### 3. DISPUTE: `<feTurbulence>` Performance on Mobile (Section 1)
**The Issue:** You proposed `SVG <feTurbulence>-driven or canvas` for the particle/light field in the `WorldLayer`.
**Why it fails:** Applying `<feTurbulence>` to a full-screen, fixed `100vw/100vh` layer is notoriously hostile to mobile GPUs (especially iOS Safari). It forces continuous repaints and will drain the battery rapidly, failing to hit your 30fps target for the 480–767 breakpoint.
**Proposed Alternative:** 
Ban SVG filters for full-screen real-time motion.
*   **Implementation:** Use a pre-rendered, seamless WebP/AVIF noise/particle texture. Animate it using hardware-accelerated CSS properties (`transform: translate3d` or `background-position`).
*   **Code Change:**
    ```css
    /* Replace <feTurbulence> with hardware-accelerated texture mapping */
    .world-particle-layer {
      background-image: url('/assets/noise-texture.webp');
      will-change: transform;
      animation: drift 28s linear infinite;
    }
    ```

### 4. DISPUTE: Scroll-Scrub Jank (Section 4)
**The Issue:** You specified `Scroll-scrub: video scale: 1 → 1.08 and translateY: 0 → −24px across first 60vh of scroll`.
**Why it fails:** Tying transform updates directly to main-thread scroll events will cause layout thrashing and jank, especially with a video element playing underneath a `mix-blend-mode` overlay.
**Proposed Alternative:** 
Mandate CSS Scroll-Driven Animations to offload this to the compositor thread, with a graceful fallback.
*   **Code Change:**
    ```css
    .hero-video-container {
      will-change: transform;
      /* Modern browsers: Compositor-thread scroll animation */
      animation: hero-scrub linear both;
      animation-timeline: scroll(root block);
      animation-range: 0 60vh;
    }
    
    @keyframes hero-scrub {
      to {
        transform: scale(1.08) translateY(-24px);
      }
    }
    ```
    *(For unsupported browsers, we fall back to standard `requestAnimationFrame` with a `transform` update, but CSS Scroll-Driven Animations must be the primary spec).*

**Awaiting your revisions on these four points. The rest of the spec (Sections 0, 2, and the visual design of 3 and 4) is approved.**

---

## Creative Director (Lead Design Authority) — Round 3

# CREATIVE DIRECTOR — Round 2

**CONSENSUS REACHED**

Gemini 3.1 Pro's four challenges are all technically correct and align with the spec's own stated performance and accessibility goals. I am approving all four with minor binding refinements (file/line citations and token compliance) so the merged spec is unambiguous for implementation.

---

## Merged Findings — Binding Revisions to Round 1 Spec

### Revision A — §4 Swan Video Hero: LCP-critical preload
**Replaces:** §4 "Performance" line `preload="none"` clause.
**New spec:**
- Hero `<video>` is a critical asset. `preload="auto"` is mandatory.
- Document `<head>` MUST include (before any render-blocking CSS):
  ```html
  <link rel="preload" as="video" href="/assets/hero-swan-720p.mp4" type="video/mp4" fetchpriority="high">
  ```
- IO lazy-loading (`preload="none"`) remains the rule for **off-screen** media only (e.g., Act 3/4 video, gallery, store).
- Poster `swans-poster.webp` still ships (covers reduced-motion + first paint before video decodes).
- Battery API carve-out preserved: discharging <20% → skip particle foreground, keep grade only; video itself still plays (muted, low-cost).

### Revision B — §3 Picker Panel: Forked a11y by viewport
**Replaces:** §3 "Accessibility" keyboard/role block.
**New spec (forked):**

**Desktop (≥768) — Dropdown:**
- Trigger: `aria-haspopup="listbox"`, `aria-expanded`.
- Panel: `role="listbox"`, `aria-label="World atmospheres"`.
- Roving tabindex, NO focus trap. `Tab` exits to next header control.
- `Esc` closes + returns focus to trigger.

**Mobile (≤767) — Bottom Sheet:**
- Trigger: `aria-haspopup="dialog"`, `aria-expanded`.
- Sheet root: `role="dialog" aria-modal="true" aria-label="Choose world atmosphere"`.
- Focus MUST be trapped (first-to-last roving loop) until dismissed.
- On open: focus moves to first option (or last-selected). On close: focus returns to trigger.
- Dismissal paths: `Esc`, drag-handle swipe-down ≥40px, scrim tap, option selection (auto-close 200ms after world apply completes).
- `inert` MUST be applied to all sibling ChromeLayer content while sheet is open (snapshot test enforces).
- Group headers inside sheet: `role="presentation"` + `aria-label` on the wrapping `<ul role="group">`.

### Revision C — §1 WorldLayer: No SVG filters for full-screen motion
**Replaces:** §1 "Layout" sub-layer 3 description.
**New spec:**
- **BAN:** `<feTurbulence>` / any SVG filter on full-bleed `position: fixed` layers. Snapshot test asserts no `<filter>` id is referenced by a fixed-position element.
- **Mandate:** Pre-rendered seamless texture (AVIF preferred, WebP fallback), max 256×256px, ≤18KB gzipped.
- Animation via hardware-accelerated properties only:
  ```css
  .world-particle-layer {
    background-image: url('/assets/world-noise.avif');
    background-size: 256px 256px;
    background-repeat: repeat;
    will-change: transform;
    animation: world-drift 28s linear infinite;
  }
  @keyframes world-drift {
    from { transform: translate3d(0,0,0); }
    to   { transform: translate3d(-256px,-256px,0); }
  }
  ```
- Particle count breakpoints (§1 table) now control **opacity layers stacked**, not DOM nodes. 0/1/2/3 stacked texture copies at the breakpoints' opacity ranges.
- `prefers-reduced-motion: reduce` → animation removed, texture static at 0.08 opacity.

### Revision D — §4 Signature Depth Beat: Compositor-thread scroll-scrub
**Replaces:** §4 "Signature depth beat (M3 only)" first bullet.
**New spec:**
- Primary: CSS Scroll-Driven Animations.
  ```css
  .hero-video-container {
    will-change: transform;
    animation: hero-scrub linear both;
    animation-timeline: scroll(root block);
    animation-range: 0 60vh;
  }
  @keyframes hero-scrub {
    to { transform: scale(1.08) translateY(-24px); }
  }
  ```
- Fallback (browsers without `animation-timeline` support): `@supports not (animation-timeline: scroll())` → `requestAnimationFrame`-driven `transform` update, throttled to every 2nd frame, with `passive: true` scroll listener. No layout reads inside the handler (cache `getBoundingClientRect` once on resize).
- Reduced-motion: both paths disabled; video static at `scale(1) translateY(0)`.
- Particle burst (30vh threshold, 18 particles, once per session) — unchanged, but MUST use `transform` + `opacity` only; no `box-shadow` animation.

---

## Approved-as-is (no changes)
- §0 Global Token Contract — unchanged.
- §2 ChromeLayer — unchanged.
- §3 visual design (trigger button, panel chrome, option rows, motion curves) — unchanged.
- §4 visual design (Z-stack, grade overlay, light-leak, CTA styling) — unchanged.
- §5 Act 1/2 — unchanged (Act 3/4 still pending from Round 1, to be issued next).

**Next:** I will issue §5 Acts 3–4 and §6+ (remaining pages, motion library, QA gates) in Round 3, building on this merged baseline.

---

