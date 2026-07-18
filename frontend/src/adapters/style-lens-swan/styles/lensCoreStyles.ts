/**
 * Swan Lens — always-present CORE global styles (S1-C / KIMI-SWAN-LENS-S1C §1.A).
 * Extracted VERBATIM from the SwanStyleLensGlobalStyles monolith. The ONLY transform is
 * `:root` -> `:where(:root)` on the structural defaults (zero specificity so per-lens blocks win
 * regardless of injection order). Includes the shipped aurora-console skin (verbatim, never retired),
 * density, all shell rules, the 44px button-tone glow floors, and the reduced-motion blocks.
 * Do NOT edit values/selectors — behavior-identical to the monolith (proven by AT-4i).
 */
import { createGlobalStyle } from 'styled-components';

export const LensCoreGlobalStyles = createGlobalStyle`
  :where(:root) {
    --lens-sidebar-width: 280px;
    --lens-sidebar-collapsed: 64px;
    --lens-main-padding: 24px;
    --lens-main-padding-mobile: 16px;
    --lens-panel-radius: 16px;
    --lens-shell-gap: 0px;
    --lens-navigation-edge: var(--accent-primary, #60c0f0);
    --lens-canvas:
      linear-gradient(145deg,
        var(--bg-base, #0a0a0f),
        color-mix(in srgb, var(--bg-surface, #141419) 86%, var(--midnight-sapphire, #002060)));
  }

  /* Aurora Console — the SKIN half: the --console-* family other consoles
     consume. Every value composes from THEME variables, so the theme changer
     recolors the whole console automatically. State tokens key off
     data-voice-state / data-console-state (presence as weather).

     SCOPED TO [data-console-root] ON PURPOSE. The lens is global but this skin
     is console-SPECIFIC: defining these on <html> would inherit them into every
     element, so any future non-console surface that consumed --console-* (a
     shared Card on a public page) would silently wear console chrome the moment
     an operator picked this lens — "context collapse". Scoping to declared
     console roots means a non-console consumer resolves to NOTHING and falls
     back to its previous value via the bridge's fallback chain
     (var(--console-x, var(--previous, <hex>))) — which is exactly why that chain
     is load-bearing and must not be "simplified" away.

     A console OPTS IN by putting data-console-root on its shell. That is the
     whole adoption cost — no provider surgery, no per-route lens plumbing. */
  html[data-style-lens='aurora-console'] [data-console-root] {
    --console-surface: color-mix(in srgb, var(--bg-elevated, rgba(20, 32, 56, 0.94)) 74%, transparent);
    --console-surface-strong: color-mix(in srgb, var(--bg-elevated, rgba(20, 32, 56, 0.94)) 92%, transparent);
    --console-line: color-mix(in srgb, var(--accent-primary, #60c0f0) 24%, transparent);
    --console-line-strong: color-mix(in srgb, var(--accent-primary, #60c0f0) 52%, transparent);
    --console-glow: color-mix(in srgb, var(--accent-secondary, #8b5cf6) 32%, transparent);
    --console-atmosphere-a: color-mix(in srgb, var(--accent-primary, #60c0f0) 26%, transparent);
    --console-atmosphere-b: color-mix(in srgb, var(--accent-secondary, #8b5cf6) 22%, transparent);
    --console-state-idle: var(--accent-primary, #60c0f0);
    --console-state-listening: var(--error, #ff6d85);
    --console-state-thinking: var(--accent-secondary, #8b5cf6);
    --console-state-speaking: var(--accent-gold, #c6a84b);
  }

  [data-density='compact'] {
    --lens-main-padding: 18px;
    --lens-main-padding-mobile: 10px;
  }

  [data-style-lens-shell] {
    gap: var(--lens-shell-gap, 0px);
    background: var(--lens-canvas, var(--bg-base, #0a0a0f));
  }

  /* :where() keeps these at single-selector specificity: a non-destructive
     Dual-Button-Glow floor for plain buttons and lens recipes that never
     overrides GlowButton's own richer glow/hover treatment. */
  [data-style-lens-shell] :where([data-swan-button-tone='blue']) {
    min-height: 44px;
    box-shadow: 0 0 22px color-mix(in srgb, var(--wing-purple, #8b5cf6) 48%, transparent);
  }

  [data-style-lens-shell] :where([data-swan-button-tone='purple']) {
    min-height: 44px;
    box-shadow: 0 0 22px color-mix(in srgb, var(--ice-wing, #60c0f0) 48%, transparent);
  }

  [data-style-lens-shell] [data-dashboard-scroll-root] {
    background: var(--lens-canvas, var(--bg-base, #0a0a0f));
    border-radius: var(--lens-panel-radius, 16px) 0 0 var(--lens-panel-radius, 16px);
    border-top: 1px solid color-mix(in srgb, var(--lens-navigation-edge, var(--ice-wing, #60c0f0)) 20%, transparent);
  }

  @media (min-width: 1025px) {
    [data-style-lens-shell] [role='navigation'] {
      width: var(--lens-sidebar-width, 280px);
      border-right-color: var(--lens-navigation-edge, var(--ice-wing, #60c0f0));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    [data-style-lens-shell],
    [data-style-lens-shell] * {
      scroll-behavior: auto;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }

  :root[data-motion='off'] [data-style-lens-shell],
  :root[data-motion='off'] [data-style-lens-shell] * {
    transition: none !important;
    animation: none !important;
  }
`;
