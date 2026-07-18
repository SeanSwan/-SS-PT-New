// AUTO-EXTRACTED from the SwanStyleLensGlobalStyles monolith — VERBATIM. Do not edit selectors or values.
import { createGlobalStyle } from 'styled-components';

export const QuietMeridianLensStyles = createGlobalStyle`
  [data-style-lens='quiet-meridian'] {
    --lens-sidebar-width: 228px;
    --lens-main-padding: clamp(28px, 3vw, 56px);
    --lens-panel-radius: 8px;
    --lens-navigation-edge: var(--ice-wing, #60c0f0);
    --lens-canvas:
      linear-gradient(90deg,
        var(--bg-base, #0a0a0f) 0%,
        color-mix(in srgb, var(--royal-depth, #003080) 38%, var(--bg-base, #0a0a0f)) 52%,
        var(--bg-base, #0a0a0f) 100%);
  }

  [data-style-lens='quiet-meridian'] [data-dashboard-scroll-root] > :where(:not([data-scoped-lens-frame]:not([data-style-lens='quiet-meridian']) *)) {
    max-width: 1680px;
    margin-inline: auto;
  }
`;
