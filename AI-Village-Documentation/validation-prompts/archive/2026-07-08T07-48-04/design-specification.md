# Design Specification Consensus

> Phase 2C: GLM 5.2 (Lead Designer) ↔ Gemini 3.1 Pro (Reviewer)
> Consensus: YES

---

# Round 3 — Creative Director (GLM 5.2)

## CONSENSUS REACHED

Gemini's three technical corrections are all valid. I'm accepting them and merging the foundation specification.

---

## Merged Foundation Findings

### 1. Inception Canvas Shell
- **Grid:** 4/8/12-column responsive grid via styled-components, `max-width: 1920px` centered container.
- **Background:** Decoupled from grid container — applied globally to `body` to prevent 4K bleed. `overflow-x: hidden` on body.
- **9-Token System:** Mapped to `--ss-*` CSS custom properties (Obsidian Black base through Frost White text, with Arctic Cyan / Wing Purple / Gilded Fern accents).
- **States:** Skeleton shimmer (1.5s linear gradient on `--surface-1`); empty state with 32px Gilded Fern crystalline icon + `--text-secondary` label.
- **Accessibility:** Semantic HTML5 wrappers, logical tab flow, 19.4:1 contrast ratio.

### 2. The Totem (Persistent Anchor / Command Orb)
- **Dimensions:** 56×56px circle, fixed position bottom-right.
- **Placement:** Mobile `bottom: 24px, right: 24px`; Desktop `bottom: 32px, right: 32px`. Dynamic `bottom` adjustment via `VisualViewport` API when virtual keyboard opens.
- **Z-Index:** `9998` (demoted — yields to Trust Layer).
- **Disabled State:** When Trust Layer is open, Totem receives `disabled` + `aria-hidden="true"`.
- **Drag Initiation:** 150ms activation window via `useDragControls` + `dragListener={false}` + manual `setTimeout`. `touch-action: none` to prevent scroll chaining. Haptic feedback on drag start.
- **Visual States:** Default (Cyan bg / Purple glow), Hover (scale 1.05, glow 30px), Active/Listening (Purple bg / Cyan glow + waveform), Focus-visible (2px Gilded Fern outline, 4px offset), Disabled (50% opacity, no glow).
- **Motion:** Framer Motion spring physics (`stiffness: 300, damping: 20`). Reduced-motion: instant snap, no spring.

### 3. Trust Layer Approval Control (T3/T4 Actions)
- **Z-Index:** `9999` — supreme surface during compliance approval.
- **Container:** 90% width mobile (max 420px) / 480px desktop. 24px padding. `--surface-2` background. 1px Gilded Fern border. 12px radius.
- **Backdrop:** `rgba(10,10,15,0.8)` + `backdrop-filter: blur(12px)`. `aria-modal="true"`, `role="dialog"`, focus trap active.
- **Approve Button:** Purple bg / Cyan glow, 48px height, full-width. Hover: glow 25px. Loading: spinner, non-interactive.
- **Cancel Button:** Transparent bg, 1px Ice Wing border, Ice Wing text. Hover: `rgba(96,192,240,0.1)` bg.
- **Audit Receipt:** 14px monospace, `--text-secondary`.

### 4. Morph Grammar Motion System
- **Technique:** FLIP animations via Framer Motion `layoutId` prop. Only `transform` and `opacity` animated — never `width`/`height`/`top`/`left`.
- **Transition:** Spring (`stiffness: 250, damping: 25, mass: 0.5`).
- **Reduced-Motion:** Via `useReducedMotion()` hook (SSR-safe, reactive). Falls back to 150ms linear opacity crossfade, instant structural swap.
- **Anchor Registry:** `layoutId` derived from `semanticRole + entityKey` (stable data payload key). **Never** positional index. Registry tracks `semanticRole`, `entityKey`, `timestamp` via `Map`.
- **Wrapper:** Every generative UI component wrapped in `<motion.div layout layoutId={resolveLayoutId(role, key)} transition={transition}>`.

---

Foundation locked. Ready to proceed to **Generative Content Injection Layer** — specifying how the AI engine writes semantic components into the canvas, validation gates for injected markup, and the audit trail rendering pipeline. Awaiting Gemini's opening position.
