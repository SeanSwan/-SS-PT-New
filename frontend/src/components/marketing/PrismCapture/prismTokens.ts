/**
 * PrismCapture — token chain. THE ONLY PrismCapture file that names `--world-*` / `--lens-*`. Every other file
 * uses bare `var(--prism-*)`. Unlike a full v-next surface, PrismCapture mounts inside the LIVE marketing hero,
 * which may render OUTSIDE a world shell — so each mapping carries a Crystalline hex FALLBACK (Rule 6
 * `var(--token, #fallback)`): it renders correctly on today's palette and re-skins for free when the Appearance
 * Studio worlds land (LAW: consumer, never emitter). Scoped to `.prism-capture` so nothing leaks to the page.
 */
import { createGlobalStyle } from 'styled-components';

export const PrismCaptureTokens = createGlobalStyle`
  .prism-capture {
    /* surfaces / ink — sapphire vault + frost, with Crystalline fallbacks */
    --prism-bg: var(--world-panel, #0a0f1e);
    --prism-glass: color-mix(in oklab, var(--world-panel, #0d1730) 68%, transparent);
    --prism-ink: var(--world-text, #e0ecf4);
    --prism-ink-2: var(--world-muted, #9fb4cc);
    --prism-scrim: color-mix(in oklab, var(--world-bg, #030712) 60%, transparent);

    /* accents — Ice Wing beam + Wing Purple glow (Dual-Button Glow) + gold ray */
    --prism-ice: var(--world-accent, #60c0f0);
    --prism-ice-soft: color-mix(in oklab, var(--world-accent, #60c0f0) 22%, transparent);
    --prism-ice-14: color-mix(in oklab, var(--world-accent, #60c0f0) 14%, transparent);
    --prism-wing: var(--world-action, #8b5cf6);
    --prism-gold: var(--world-luxury, #c6a84b);
    --prism-danger: #f07575;
    /* ink that sits ON the bright Ice-Wing primary — near-black for AA contrast on the accent fill */
    --prism-on-ice: var(--world-on-accent, #041019);

    /* geometry + elevation */
    --prism-r: var(--lens-panel-radius, 18px);
    --prism-r-field: 12px;
    --prism-elev: var(--lens-elev-2, 0 18px 48px -24px rgba(2, 8, 24, 0.7));
    --prism-glow: var(--lens-fx-glow-primary, 0 0 0 1px var(--prism-ice-14), 0 12px 40px -18px var(--prism-ice-soft));
    --prism-target: max(44px, var(--world-target-size, 44px));

    /* motion — durations live here; the reduced-motion DECISION is made in JS (prismMotion.ts) */
    --prism-ease: var(--lens-ease-crystallize, cubic-bezier(0.16, 1, 0.3, 1));
    --prism-charge-ms: var(--lens-crystallize-charge-ms, 820ms);
    --prism-settle-ms: var(--lens-crystallize-settle-ms, 560ms);

    --prism-font-display: var(--world-title-font, 'Plus Jakarta Sans', system-ui, sans-serif);
  }

  .prism-capture :where(a, button, [role='button'], input):focus-visible {
    outline: 2px solid var(--prism-ice);
    outline-offset: 2px;
  }
`;
