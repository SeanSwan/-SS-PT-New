# Spec receipt — Button (`.sw-btn`, `core/button.mjs`)

**Taste anchor:** original `GlowButton.tsx` @ origin/main `d73468d37` (Sean-confirmed 2026-08-24).
**Compat law:** all 7 legacy variant aliases + prop aliases (`theme`, `colorScheme`, `isLoading`) resolve identically to GlowButton — 84 consumers depend on them (tested).

## Acceptance (Phase 1.5 gate)

- [ ] Pixel-parity vs original GlowButton under `crystalline-swan` (named assertions: Dual-Button Glow — primary fill → purple glow pole, accent fill → cyan pole; sheen sweep; reduced-motion renders static with spinner→dot)
- [x] 44px min target (`--sw-p-target-min` floor — not themeable)
- [x] Loading keeps focus (aria-disabled + aria-busy); disabled uses native attribute
- [x] Focus ring visible in both packs (≥3:1 audited)
- [x] Contrast: all variant labels ≥4.5:1 in both packs EXCEPT accent (4.23:1, waived — Sean design review pending)

## Theme surface statement (what packs MAY touch)

`--sw-btn-bg/-text/-radius/-glow-a/-glow-b` + per-variant `--sw-btn-<variant>-{bg,text,glow-a,glow-b}`.
**NOT themeable:** structure, focus order, keyboard semantics, 44px floor, focus visibility.

## Variants (rule-of-two ledger)

primary · accent · gilded · success · danger · ghost — all inherited from the original (consumers: 84 files). No new variant without a second demonstrated consumer (§11.A3).
