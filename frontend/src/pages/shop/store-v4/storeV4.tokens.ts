/**
 * Store V4 — token chain (KIMI-STORE-CORRECTED Correction 1 + F1). THE ONLY store-v4 file that may
 * name `--world-*` / `--lens-*`, and the ONLY hex site (gold literal + statuses). Every other store-v4
 * file references bare `var(--store-*)` only — CI (`check-token-discipline`) enforces this.
 *
 * The reground killed the blind-authored token chain (`--lens-ice`, `--world-bg-deep`, `--world-card-hi`,
 * `--world-font-display`, `--world-shadow-1`…): they don't resolve, so every `--store-*` would fall back
 * to its literal forever → un-skinnable. Here `--store-*` aliases the REAL shipped lens/world slots, so
 * the Appearance Studio re-worlds the store for free. Gold has no world slot → it's a store-local literal,
 * spent exactly twice (flagship pedestal light + Crystallize ring). Never the retired Galaxy trio.
 */
import { createGlobalStyle } from 'styled-components';

export const StoreV4Tokens = createGlobalStyle`
  .store-v4-shell {
    /* surfaces ← REAL world slots */
    --store-bg: var(--world-bg);
    --store-surface-1: var(--world-panel);
    --store-surface-2: color-mix(in oklab, var(--world-panel) 82%, var(--world-bg) 18%);
    --store-card-hi: color-mix(in oklab, var(--world-panel) 88%, var(--world-accent) 12%);
    --store-card-lo: color-mix(in oklab, var(--world-panel) 94%, var(--world-bg) 6%);
    --store-glass: color-mix(in oklab, var(--world-panel) 70%, transparent);

    /* ink ← REAL world slots */
    --store-ink: var(--world-text);
    --store-ink-2: var(--world-muted);

    /* accents: ice = accent, wing = action, gold = local literal (twice only) */
    --store-ice: var(--world-accent);
    --store-ice-soft: color-mix(in oklab, var(--world-accent) 18%, transparent);
    --store-wing: var(--world-action, var(--world-accent));
    --store-wing-22: color-mix(in oklab, var(--world-action, var(--world-accent)) 22%, transparent);
    /* D4 WCAG fix: wing-as-TEXT (small eyebrows) needs ≥4.5:1 on card-hi — the raw action tone was ~4.47:1.
       A brightened tint clears it; borders/graphics keep the full-saturation --store-wing. */
    --store-wing-text: color-mix(in oklab, var(--world-action, var(--world-accent)) 62%, var(--world-text) 38%);
    --store-gold: #C6A84B;          /* store-local luxury literal — the ONLY hex in v4, spent twice */
    --store-gold-28: color-mix(in oklab, #C6A84B 28%, transparent);

    /* chrome edge (crystal card border) ← derived from accent, zero invention */
    --store-chrome-edge: color-mix(in oklab, var(--world-accent) 34%, transparent);
    --store-chrome-10: color-mix(in oklab, var(--world-accent) 10%, transparent);
    --store-line: color-mix(in oklab, var(--world-accent) 14%, transparent);

    /* shape / elevation / z ← REAL lens slots */
    --store-r-panel: var(--lens-panel-radius);
    --store-r-card: var(--world-row-radius, var(--lens-panel-radius));
    --store-pad: var(--lens-main-padding);
    --store-canvas: var(--lens-canvas);
    --store-elev-1: var(--lens-elev-1);
    --store-elev-2: var(--lens-elev-2);
    --store-elev-3: var(--lens-elev-3);
    --store-z-sticky: var(--lens-z-sticky);
    --store-z-overlay: var(--lens-z-overlay);
    --store-z-toast: var(--lens-z-toast);

    /* easings ← REAL lens slots (no hand-timed curves) */
    --store-ease-standard: var(--lens-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
    --store-ease-crystallize: var(--lens-ease-crystallize, cubic-bezier(0.22, 1, 0.36, 1));

    /* type + targets */
    --store-font-display: var(--world-title-font);
    --store-target: max(48px, var(--world-target-size, 48px));
  }

  /* focus ring — never removed */
  .store-v4-shell :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--store-ice);
    outline-offset: 2px;
  }

  /* reduced motion forces opacity-only / near-instant, regardless of any local motion */
  @media (prefers-reduced-motion: reduce) {
    .store-v4-shell *, .store-v4-shell *::before, .store-v4-shell *::after {
      transition-duration: 1ms !important;
      animation-duration: 1ms !important;
    }
  }
`;
