# Spec receipts — Card, Input, Modal

## Card (`.sw-card`) — net-new from the Swan Card Standard (no code ancestor; Phase 0 finding)

- Variants: `--showcase` (chrome edge, gradient depth, hover glow — store/feature surfaces) · `--data` (identical geometry, LOW-MOTION: no pointer tracking, no hover-only actions, no hidden controls)
- Anatomy: `__title`, `__body`, `__meta`, `__pill`, `__metric`, `__actions` (44px buttons)
- Acceptance: [x] both variants render in both packs · [x] data variant has no transform on hover under reduced motion · [ ] Phase 1.5: side-by-side vs the Store Card handoff HTML for chrome fidelity
- Theme surface: `--sw-card-radius` + all semantic tokens. NOT themeable: geometry, action-row wrap behavior, motion discipline of `--data`.

## Input (`.sw-input`, `.sw-field`) — harvest anchor: GlacialInput (crystalline-primitives)

- Anatomy: `sw-field` (label/hint/error) wrapping `sw-input`; error via `aria-invalid="true"` + `sw-field__error`
- Acceptance: [x] 44px floor · [x] focus bloom visible both packs · [x] placeholder ≥ muted contrast (audited) · [x] invalid state uses `--sw-color-danger`
- Theme surface: `--sw-input-radius` + semantics. NOT themeable: target floor, focus visibility, error semantics.

## Modal (`core/modal.mjs` + `.sw-modal`) — variants: dialog (centered) · drawer (VaultDrawer lineage)

- Core-invariant (§11.A1): focus trap (`nextTrapIndex` — wraps both ends, tested), Escape-to-close, `role="dialog"` + `aria-modal` + labelledby — IDENTICAL across variants; variants change geometry classes only
- Acceptance: [x] trap math unit-tested incl. empty list · [x] scrim aria-hidden · [x] reduced-motion: fade-only, no slide/scale · [ ] Phase 1.5: real-DOM trap walk in the consumer (jsdom/Playwright)
- Theme surface: colors/depth/radius via semantics. NOT themeable: trap order, keyboard behavior, aria contract, scrim dismissal.
