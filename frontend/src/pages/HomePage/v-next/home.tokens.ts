/**
 * Home V-next — token chain. THE ONLY v-next file that may name `--world-*` / `--lens-*`. Every other
 * file uses bare `var(--home-*)`. Kimi direction: shadows/glow come from `--lens-elev-*` +
 * `--lens-fx-glow-primary` ONLY (no ad-hoc box-shadow); the facet palette derives from the accent/action
 * slots so the hero is the ORIGIN of the site-wide crystallize material, not a borrowed effect. ZERO hex
 * literals here — Home skins entirely off the lens, so the Appearance Studio re-worlds it for free.
 * Retired Galaxy trio impossible by construction (no hex at all).
 */
import { createGlobalStyle } from 'styled-components';

export const HomeVNextTokens = createGlobalStyle`
  .home-vnext-shell {
    /* surfaces ← REAL world slots */
    --home-bg: var(--world-bg);
    --home-surface: var(--world-panel);
    --home-glass: color-mix(in oklab, var(--world-panel) 70%, transparent);
    --home-ink: var(--world-text);
    --home-ink-2: var(--world-muted);

    /* crystalline accents: ice = accent, wing = action (the Dual-Button-Glow purple) */
    --home-ice: var(--world-accent);
    --home-ice-soft: color-mix(in oklab, var(--world-accent) 20%, transparent);
    --home-ice-14: color-mix(in oklab, var(--world-accent) 14%, transparent);
    --home-wing: var(--world-action, var(--world-accent));
    --home-wing-24: color-mix(in oklab, var(--world-action, var(--world-accent)) 24%, transparent);
    --home-facet-hi: color-mix(in oklab, var(--world-accent) 40%, var(--world-panel) 60%);
    --home-facet-lo: color-mix(in oklab, var(--world-panel) 88%, var(--world-bg) 12%);

    /* worst-frame contrast scrim behind hero text (Kimi (b)7) — a real color, ~65% of the dark bg */
    --home-scrim: color-mix(in oklab, var(--world-bg) 66%, transparent);

    /* shape / elevation / glow / z ← REAL lens slots (Kimi (b)8: no ad-hoc shadows) */
    --home-r-panel: var(--lens-panel-radius);
    --home-pad: var(--lens-main-padding);
    --home-canvas: var(--lens-canvas);
    --home-elev-1: var(--lens-elev-1);
    --home-elev-2: var(--lens-elev-2);
    --home-elev-3: var(--lens-elev-3);
    --home-glow: var(--lens-fx-glow-primary);
    --home-z-raised: var(--lens-z-raised);
    --home-z-sticky: var(--lens-z-sticky);

    /* motion ← REAL lens slots (Kimi: timings bound to the lens easings + crystallize charge/settle) */
    --home-ease-standard: var(--lens-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
    --home-ease-crystallize: var(--lens-ease-crystallize, cubic-bezier(0.16, 1, 0.3, 1));
    --home-charge-ms: var(--lens-crystallize-charge-ms, 900ms);
    --home-settle-ms: var(--lens-crystallize-settle-ms, 620ms);

    /* type + targets */
    --home-font-display: var(--world-title-font);
    --home-target: max(44px, var(--world-target-size, 44px));
  }

  /* focus ring — brand glow, never a naked outline:none (Kimi (c)) */
  .home-vnext-shell :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--home-ice);
    outline-offset: 2px;
  }

  /* reduced motion → the designed static frame; force opacity-only / near-instant */
  @media (prefers-reduced-motion: reduce) {
    .home-vnext-shell *, .home-vnext-shell *::before, .home-vnext-shell *::after {
      transition-duration: 1ms !important;
      animation-duration: 1ms !important;
    }
  }
`;
