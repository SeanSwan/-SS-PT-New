/**
 * About V-next — token chain. THE ONLY v-next file that may name `--world-*` / `--lens-*`. Every other file
 * uses bare `var(--about-*)`. ZERO hex (skins entirely off the lens — the Appearance Studio re-worlds it for
 * free). Shadows/glow from `--lens-elev-*` + `--lens-fx-glow-primary` only. Mirrors the shipped Home tokens.
 */
import { createGlobalStyle } from 'styled-components';

export const AboutVNextTokens = createGlobalStyle`
  .about-vnext-shell {
    --about-bg: var(--world-bg);
    --about-surface: var(--world-panel);
    --about-glass: color-mix(in oklab, var(--world-panel) 70%, transparent);
    --about-ink: var(--world-text);
    --about-ink-2: var(--world-muted);

    --about-ice: var(--world-accent);
    --about-ice-soft: color-mix(in oklab, var(--world-accent) 20%, transparent);
    --about-ice-14: color-mix(in oklab, var(--world-accent) 14%, transparent);
    --about-wing: var(--world-action, var(--world-accent));
    --about-caustic-hi: color-mix(in oklab, var(--world-accent) 40%, var(--world-panel) 60%);
    --about-caustic-lo: color-mix(in oklab, var(--world-panel) 88%, var(--world-bg) 12%);
    --about-scrim: color-mix(in oklab, var(--world-bg) 66%, transparent);

    --about-r-panel: var(--lens-panel-radius);
    --about-pad: var(--lens-main-padding);
    --about-canvas: var(--lens-canvas);
    --about-elev-1: var(--lens-elev-1);
    --about-elev-2: var(--lens-elev-2);
    --about-elev-3: var(--lens-elev-3);
    --about-glow: var(--lens-fx-glow-primary);
    --about-z-raised: var(--lens-z-raised);

    --about-ease-standard: var(--lens-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
    --about-ease-crystallize: var(--lens-ease-crystallize, cubic-bezier(0.16, 1, 0.3, 1));
    --about-charge-ms: var(--lens-crystallize-charge-ms, 900ms);
    --about-settle-ms: var(--lens-crystallize-settle-ms, 620ms);

    --about-font-display: var(--world-title-font);
    --about-target: max(44px, var(--world-target-size, 44px));
  }

  .about-vnext-shell :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--about-ice);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .about-vnext-shell *, .about-vnext-shell *::before, .about-vnext-shell *::after {
      transition-duration: 1ms !important;
      animation-duration: 1ms !important;
    }
  }
`;
