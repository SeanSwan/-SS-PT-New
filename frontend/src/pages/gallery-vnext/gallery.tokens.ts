/**
 * Gallery vNext — token chain. THE ONLY gallery-vnext file that may name `--world-*` / `--lens-*`, and the
 * ONLY hex site (one gold literal + the text scrim). Every other gallery-vnext file references bare
 * `var(--gallery-*)` only. `--gallery-*` aliases the REAL shipped lens/world slots so the Appearance Studio
 * re-worlds the gallery for free. Gold has no world slot → gallery-local literal, spent only on the ONE
 * reveal facet + focus (LAW 2 allowlist). Never the retired Galaxy trio (#0a0a1a / #00FFFF / #7851A9).
 */
import { createGlobalStyle } from 'styled-components';

export const GalleryVNextTokens = createGlobalStyle`
  .gallery-vnext-shell {
    /* surfaces ← REAL world slots */
    --gallery-bg: var(--world-bg);
    --gallery-surface-1: var(--world-panel);
    --gallery-surface-2: color-mix(in oklab, var(--world-panel) 82%, var(--world-bg) 18%);
    --gallery-card-hi: color-mix(in oklab, var(--world-panel) 88%, var(--world-accent) 12%);
    --gallery-glass: color-mix(in oklab, var(--world-panel) 70%, transparent);

    /* ink ← REAL world slots */
    --gallery-ink: var(--world-text);
    --gallery-ink-2: var(--world-muted);

    /* accents: ice = accent, wing = action, gold = local literal (LAW 2 allowlist only) */
    --gallery-ice: var(--world-accent);
    --gallery-ice-soft: color-mix(in oklab, var(--world-accent) 18%, transparent);
    --gallery-wing: var(--world-action, var(--world-accent));
    --gallery-wing-22: color-mix(in oklab, var(--world-action, var(--world-accent)) 22%, transparent);
    --gallery-gold: #C6A84B;          /* gallery-local luxury literal — the ONLY brand hex; reveal facet + focus */
    --gallery-gold-28: color-mix(in oklab, #C6A84B 28%, transparent);

    /* chrome edge (crystal card border) ← derived from accent, zero invention */
    --gallery-chrome-edge: color-mix(in oklab, var(--world-accent) 34%, transparent);
    --gallery-line: color-mix(in oklab, var(--world-accent) 14%, transparent);

    /* text-over-photo scrim + frost (Kimi (b)8 — hold AA over an arbitrary photograph; the scrim/frost are
       the only non-brand raw colors, and they live here in the sole allowed color site) */
    --gallery-scrim: linear-gradient(to top, rgba(0, 0, 0, 0.62) 0%, rgba(0, 0, 0, 0.32) 42%, rgba(0, 0, 0, 0) 100%);
    --gallery-frost: color-mix(in oklab, var(--world-bg) 72%, transparent);
    --gallery-scrim-solid: rgba(0, 0, 0, 0.55); /* no-backdrop-filter fallback */

    /* shape / elevation / z ← REAL lens slots */
    --gallery-r-panel: var(--lens-panel-radius);
    --gallery-r-card: var(--world-row-radius, var(--lens-panel-radius));
    --gallery-pad: var(--lens-main-padding);
    --gallery-canvas: var(--lens-canvas);
    --gallery-elev-1: var(--lens-elev-1);
    --gallery-elev-2: var(--lens-elev-2);
    --gallery-elev-3: var(--lens-elev-3);
    --gallery-z-sticky: var(--lens-z-sticky);
    --gallery-z-overlay: var(--lens-z-overlay);
    --gallery-z-toast: var(--lens-z-toast);

    /* easings ← REAL lens slots (no hand-timed curves) */
    --gallery-ease-standard: var(--lens-ease-standard, cubic-bezier(0.4, 0, 0.2, 1));
    --gallery-ease-crystallize: var(--lens-ease-crystallize, cubic-bezier(0.22, 1, 0.36, 1));

    /* type + targets */
    --gallery-font-display: var(--world-title-font);
    --gallery-target: max(48px, var(--world-target-size, 48px));
  }

  /* focus ring — never removed */
  .gallery-vnext-shell :where(a, button, [role='button'], input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--gallery-ice);
    outline-offset: 2px;
  }

  /* reduced motion forces opacity-only / near-instant, regardless of any local motion */
  @media (prefers-reduced-motion: reduce) {
    .gallery-vnext-shell *, .gallery-vnext-shell *::before, .gallery-vnext-shell *::after {
      transition-duration: 1ms !important;
      animation-duration: 1ms !important;
    }
  }
`;
