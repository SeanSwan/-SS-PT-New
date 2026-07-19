/**
 * Video V-next — token chain. THE ONLY video-vnext file that may name `--world-*` / `--lens-*`. Every
 * other file uses bare `var(--video-*)`. ZERO hex (skins off the lens). Refraction/glass language derives
 * from the accent/panel slots so the "refraction system" is the ORIGIN of the site material, not a bolt-on.
 * Mirrors the shipped Home/About tokens.
 */
import { createGlobalStyle } from 'styled-components';

export const VideoVNextTokens = createGlobalStyle`
  .video-vnext-shell {
    --video-bg: var(--world-bg);
    --video-surface: var(--world-panel);
    --video-glass: color-mix(in oklab, var(--world-panel) 68%, transparent);
    --video-card-hi: color-mix(in oklab, var(--world-panel) 88%, var(--world-accent) 12%);
    --video-card-lo: color-mix(in oklab, var(--world-panel) 94%, var(--world-bg) 6%);
    --video-ink: var(--world-text);
    --video-ink-2: var(--world-muted);

    --video-ice: var(--world-accent);
    --video-ice-soft: color-mix(in oklab, var(--world-accent) 20%, transparent);
    --video-ice-14: color-mix(in oklab, var(--world-accent) 14%, transparent);
    --video-wing: var(--world-action, var(--world-accent));
    /* spectral refraction edge (chrome) — derived from accent, no invention */
    --video-chrome: color-mix(in oklab, var(--world-accent) 34%, transparent);
    --video-scrim: color-mix(in oklab, var(--world-bg) 66%, transparent);

    --video-r-panel: var(--lens-panel-radius);
    --video-r-card: var(--world-row-radius, var(--lens-panel-radius));
    --video-pad: var(--lens-main-padding);
    --video-canvas: var(--lens-canvas);
    --video-elev-1: var(--lens-elev-1);
    --video-elev-2: var(--lens-elev-2);
    --video-elev-3: var(--lens-elev-3);
    --video-glow: var(--lens-fx-glow-primary);
    --video-z-raised: var(--lens-z-raised);
    --video-z-sticky: var(--lens-z-sticky);

    --video-ease-standard: var(--lens-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
    --video-ease-crystallize: var(--lens-ease-crystallize, cubic-bezier(0.16, 1, 0.3, 1));

    --video-font-display: var(--world-title-font);
    --video-target: max(44px, var(--world-target-size, 44px));
  }

  .video-vnext-shell :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--video-ice);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .video-vnext-shell *, .video-vnext-shell *::before, .video-vnext-shell *::after {
      transition-duration: 1ms !important;
      animation-duration: 1ms !important;
    }
  }
`;
