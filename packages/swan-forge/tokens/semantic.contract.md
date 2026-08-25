# @swan/forge — Semantic Token Contract (tier 2 of 3) — v1, LOCKED

**Law (plan §1 + §11.A4):** this list is the locked semantic schema. Changes are **additive-only**; renames require a deprecation window + codemod. Every theme pack MUST define every name below. The contrast audit (`scripts/audit-contrast.mjs`) runs over the (pack × component-override) cross-product on the pairs manifest.

**Resolution order:** component-override (`--sw-<cmp>-*`) → pack semantic (`--sw-*`) → primitive fallback (`--sw-p-*`).

## Colors (18)

| Token | Role |
|---|---|
| `--sw-bg-base` | Page background |
| `--sw-bg-surface` | Cards, panels |
| `--sw-bg-elevated` | Modals, drawers, popovers |
| `--sw-bg-overlay` | Scrim behind modals |
| `--sw-text-primary` | Primary text |
| `--sw-text-secondary` | Secondary text |
| `--sw-text-muted` | Hints, placeholders |
| `--sw-text-inverse` | Text on accent fills |
| `--sw-color-primary` | Primary action fill (Swan: Midnight Sapphire) |
| `--sw-color-accent` | Accent action fill (Swan: Wing Purple) |
| `--sw-color-gold` | Luxury/premium accent |
| `--sw-color-success` | Positive |
| `--sw-color-danger` | Destructive |
| `--sw-color-warning` | Caution |
| `--sw-border` | Default borders |
| `--sw-border-strong` | Emphasized borders / chrome edges |
| `--sw-glow-a` | Glow endpoint A (Swan: purple pole of Dual-Button Glow) |
| `--sw-glow-b` | Glow endpoint B (Swan: cyan pole of Dual-Button Glow) |

## Focus (2)

`--sw-focus-ring` (color) · `--sw-focus-shadow` (composed ring shadow)

## Typography (5)

`--sw-font-heading` · `--sw-font-body` · `--sw-font-data` · `--sw-font-ui` · `--sw-text-scale` (multiplier, default 1)

## Surfaces & depth (3)

`--sw-shadow-1` · `--sw-shadow-2` · `--sw-shadow-3`

## Motion (2)

`--sw-motion` (multiplier: 1 = on, 0 = off — reduced-motion and capture mode set 0) · `--sw-ease` (pack may soften/sharpen)

## Asset slots (accepted §9.5) (2)

`--sw-asset-hero-video` (url() or none) · `--sw-asset-brand-mark` (url() or none)

**Total: 32 semantic names.** Headroom to the ~40–60 ceiling is reserved for future additive needs — do not pre-fill it.

## What is NOT themeable (theme-surface statement, plan §11.A5/A1)

- DOM structure, focus order, keyboard behavior (core-invariant — §11.A1 ruling)
- `--sw-p-target-min` (44px floor), focus visibility (width/offset floors)
- Visual reordering via packs (`order`, `flex-direction: *-reverse`, `direction`, grid placement) — drift-linter enforced (§11.A2)
