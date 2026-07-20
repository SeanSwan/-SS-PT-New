/**
 * Gallery vNext — token chain. THE ONLY gallery-vnext file that may name `--world-*` / `--lens-*`, and the
 * ONLY hex site (one gold literal + the text scrim). Every other gallery-vnext file references bare
 * `var(--gallery-*)` only. `--gallery-*` aliases the REAL shipped lens/world slots so the Appearance Studio
 * re-worlds the gallery for free. Gold has no world slot → gallery-local literal, spent only on the ONE
 * reveal facet + focus (LAW 2 allowlist). The RETIRED Galaxy palette is banned on this surface — including
 * inside var() fallbacks and disguised rgba()/hsl() channel forms. (Literals intentionally not written here:
 * the de-Galaxy CI scan matches them even inside comments.)
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

    /* accents: ice = accent, wing = action, gold = local literal (LAW 2 allowlist only).
       SANCTIONED THIRD BUTTON VARIANT (Kimi c1 ruling 2026-07-20): the hero primary is a "surface" variant —
       panel-surface background + wing-purple glow (resting 14px, hover 28px). Documented here so it is a
       deliberate variant, not silent glow-law drift. */
    --gallery-ice: var(--world-accent);
    --gallery-ice-soft: color-mix(in oklab, var(--world-accent) 18%, transparent);
    --gallery-wing: var(--world-action, var(--world-accent));
    --gallery-wing-22: color-mix(in oklab, var(--world-action, var(--world-accent)) 22%, transparent);
    /* Kimi ruling 2026-07-20: gold is RESERVED for Phase-2 PR/reveal moments only — do NOT consume elsewhere
       (not the focus ring: ice stays the focus color; gold focus would read as a warning state). */
    --gallery-gold: #C6A84B;
    --gallery-gold-28: color-mix(in oklab, #C6A84B 28%, transparent);

    /* chrome edge (crystal card border) ← derived from accent, zero invention */
    --gallery-chrome-edge: color-mix(in oklab, var(--world-accent) 34%, transparent);
    --gallery-line: color-mix(in oklab, var(--world-accent) 14%, transparent);

    /* text-over-photo scrim + frost (Kimi (b)8 — hold AA over an arbitrary photograph; the scrim/frost are
       the only non-brand raw colors, and they live here in the sole allowed color site) */
    /* Deepened per Kimi b5 after the P2 probe MEASURED 3.96:1 on a pure-white cover (veto class) —
       these are Kimi's binding replacement numbers; frost-white text now clears 4.5:1 on any photograph. */
    --gallery-scrim: linear-gradient(to top, rgba(0, 0, 0, 0.72) 0%, rgba(0, 0, 0, 0.45) 55%, rgba(0, 0, 0, 0) 85%);
    --gallery-frost: color-mix(in oklab, var(--world-bg) 72%, transparent);
    --gallery-scrim-solid: rgba(0, 0, 0, 0.72); /* no-backdrop-filter fallback — matches the deepened base */

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

  /* focus ring — never removed. Full-specificity selectors on purpose: the app carries global
     outline-none resets (CosmicEleganceGlobalStyle.ts:461, mobile CSS) that beat a zero-specificity
     :where() ring — probe P6 measured 0px on a keyboard-focused tile before this. NOTE: no backtick
     characters in this comment — stylis silently swallows the rule that follows them. */
  .gallery-vnext-shell a:focus-visible,
  .gallery-vnext-shell button:focus-visible,
  .gallery-vnext-shell [role='button']:focus-visible,
  .gallery-vnext-shell input:focus-visible,
  .gallery-vnext-shell select:focus-visible,
  .gallery-vnext-shell textarea:focus-visible,
  .gallery-vnext-shell [tabindex]:focus-visible {
    /* LONGHANDS on purpose: an important SHORTHAND carrying var() computed to 0px/black in Chromium
       (invalid-at-computed-value) — probe P6 measured it. Longhands + fallback are immune. */
    outline-width: 2px !important;
    outline-style: solid !important;
    outline-color: var(--gallery-ice, #60C0F0) !important;
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
