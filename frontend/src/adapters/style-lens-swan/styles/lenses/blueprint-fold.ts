// AUTO-EXTRACTED from the SwanStyleLensGlobalStyles monolith — VERBATIM. Do not edit selectors or values.
import { createGlobalStyle } from 'styled-components';

export const BlueprintFoldLensStyles = createGlobalStyle`
  [data-style-lens='blueprint-fold'] {
    --lens-sidebar-width: 252px;
    --lens-main-padding: clamp(20px, 2.2vw, 44px);
    --lens-panel-radius: 2px;
    --lens-navigation-edge: var(--ice-wing, #60c0f0);
    --lens-canvas:
      repeating-linear-gradient(0deg,
        transparent 0 23px,
        color-mix(in srgb, var(--ice-wing, #60c0f0) 8%, transparent) 24px 25px),
      repeating-linear-gradient(90deg,
        transparent 0 23px,
        color-mix(in srgb, var(--ice-wing, #60c0f0) 8%, transparent) 24px 25px),
      var(--midnight-sapphire, #002060);
  }
`;
