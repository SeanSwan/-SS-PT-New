// AUTO-EXTRACTED from the SwanStyleLensGlobalStyles monolith — VERBATIM. Do not edit selectors or values.
import { createGlobalStyle } from 'styled-components';

export const KintsugiCircuitLensStyles = createGlobalStyle`
  [data-style-lens='kintsugi-circuit'] {
    --lens-sidebar-width: 266px;
    --lens-main-padding: clamp(24px, 2.6vw, 48px);
    --lens-panel-radius: 6px 22px 8px 28px;
    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
    --lens-canvas:
      linear-gradient(118deg,
        transparent 0 46%,
        color-mix(in srgb, var(--gilded-fern, #c6a84b) 32%, transparent) 46.2% 46.6%,
        transparent 46.8%),
      linear-gradient(155deg, var(--bg-base, #0a0a0f), var(--royal-depth, #003080));
  }
`;
