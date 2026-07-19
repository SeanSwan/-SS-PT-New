// AUTO-EXTRACTED from the SwanStyleLensGlobalStyles monolith — VERBATIM. Do not edit selectors or values.
import { createGlobalStyle } from 'styled-components';

export const AnalogFlightRecorderLensStyles = createGlobalStyle`
  [data-style-lens='analog-flight-recorder'] {
    --lens-sidebar-width: 312px;
    --lens-main-padding: clamp(18px, 2vw, 36px);
    --lens-panel-radius: 3px;
    --lens-navigation-edge: var(--gilded-fern, #c6a84b);
    --lens-canvas:
      linear-gradient(180deg,
        var(--carbon, #141419) 0 36px,
        var(--obsidian-black, #0a0a0f) 36px 100%);
  }

  [data-style-lens='analog-flight-recorder'] [data-style-lens-shell]:where(:not([data-scoped-lens-frame]:not([data-style-lens='analog-flight-recorder']) *)) {
    font-family: 'Fira Code', monospace;
    box-shadow: inset 0 36px 0 color-mix(in srgb, var(--gilded-fern, #c6a84b) 12%, transparent);
  }
`;
