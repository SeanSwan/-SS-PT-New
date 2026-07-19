/**
 * Contact V-next — token chain. THE ONLY vnext file that may name `--world-*` / `--lens-*`, and the ONLY
 * hex site (the single gold seam of the Crystallize Submit — the page's one gold appearance, Kimi (d)).
 * Every other file uses bare `var(--contact-*)`. Mirrors the shipped Home/About/Video tokens.
 */
import { createGlobalStyle } from 'styled-components';

export const ContactVNextTokens = createGlobalStyle`
  .contact-vnext-shell {
    --contact-bg: var(--world-bg);
    --contact-surface: var(--world-panel);
    --contact-glass: color-mix(in oklab, var(--world-panel) 68%, transparent);
    --contact-ink: var(--world-text);
    --contact-ink-2: var(--world-muted);

    --contact-ice: var(--world-accent);
    --contact-ice-soft: color-mix(in oklab, var(--world-accent) 20%, transparent);
    --contact-ice-14: color-mix(in oklab, var(--world-accent) 14%, transparent);
    --contact-wing: var(--world-action, var(--world-accent));
    --contact-chrome: color-mix(in oklab, var(--world-accent) 34%, transparent);
    --contact-gold: #C6A84B;          /* the ONLY hex — the single gold seam of the Crystallize Submit */
    --contact-scrim: color-mix(in oklab, var(--world-bg) 66%, transparent);

    --contact-r-panel: var(--lens-panel-radius);
    --contact-pad: var(--lens-main-padding);
    --contact-elev-1: var(--lens-elev-1);
    --contact-elev-2: var(--lens-elev-2);
    --contact-glow: var(--lens-fx-glow-primary);

    --contact-ease-standard: var(--lens-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
    --contact-ease-crystallize: var(--lens-ease-crystallize, cubic-bezier(0.22, 1, 0.36, 1));

    --contact-font-display: var(--world-title-font);
    --contact-target: max(44px, var(--world-target-size, 44px));
  }

  .contact-vnext-shell :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--contact-ice);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .contact-vnext-shell *, .contact-vnext-shell *::before, .contact-vnext-shell *::after {
      transition-duration: 1ms !important;
      animation-duration: 1ms !important;
    }
  }
`;
