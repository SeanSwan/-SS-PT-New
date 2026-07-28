# UX/UI Design Planning Debate (Phase 2C) — Validation Report

> **Status:** PASS | **Model:** z-ai/glm-5.2 ↔ gemini-3.1-pro-preview | **Duration:** 115.7s
> **Files:** .claude/worktrees/unified-world-gallery-2026-07-16/docs/ai-workflow/AI-HANDOFF/WORLD-SWITCHER-MARKETING-REDESIGN-PLAN-2026-07-17.md
> **Generated:** 7/17/2026, 12:24:21 PM

---

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

*Part of SwanStudios 15-Brain Recursive Consensus System*
