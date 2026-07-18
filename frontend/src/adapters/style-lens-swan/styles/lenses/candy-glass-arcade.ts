// AUTO-EXTRACTED from the SwanStyleLensGlobalStyles monolith — VERBATIM. Do not edit selectors or values.
import { createGlobalStyle } from 'styled-components';

export const CandyGlassArcadeLensStyles = createGlobalStyle`
  [data-style-lens='candy-glass-arcade'] {
    --lens-sidebar-width: 248px;
    --lens-main-padding: clamp(20px, 2.4vw, 46px);
    --lens-panel-radius: 26px;
    --lens-navigation-edge: var(--wing-purple, #8b5cf6);
    --lens-canvas:
      radial-gradient(circle at 82% 12%,
        color-mix(in srgb, var(--wing-purple, #8b5cf6) 28%, transparent),
        transparent 32%),
      radial-gradient(circle at 18% 84%,
        color-mix(in srgb, var(--ice-wing, #60c0f0) 22%, transparent),
        transparent 30%),
      var(--bg-base, #0a0a0f);
  }

  [data-style-lens='candy-glass-arcade'] [data-dashboard-scroll-root]:where(:not([data-scoped-lens-frame]:not([data-style-lens='candy-glass-arcade']) *)) {
    box-shadow:
      inset 0 1px 0 color-mix(in srgb, var(--frost-white, #e0ecf4) 18%, transparent),
      0 0 42px color-mix(in srgb, var(--wing-purple, #8b5cf6) 14%, transparent);
  }
`;
