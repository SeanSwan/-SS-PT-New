/**
 * FILE: CrystalProgressRing.styles.ts
 * PURPOSE: Styled surface for the client-home crystal level-ring signature.
 * MOTION:  §8 two-speed. The fringe facet brightens once on mount — a Response-
 *          tier SNAP opacity pulse (the "momentum beat"), NOT an ambient loop
 *          (dashboards stay calm — motion.md §4/§5). Motion is CSS-only, so the
 *          CSS @media (prefers-reduced-motion) gate is the complete reduced-
 *          motion gate (no JS motion path to also gate — §3 satisfied).
 */

import styled, { css, keyframes } from 'styled-components';

/* One-shot fringe brighten: 0.55 → 0.85 → 0.7 alpha, SNAP. Opacity only. */
const fringeBeat = keyframes`
  0%   { opacity: 0.55; }
  55%  { opacity: 0.85; }
  100% { opacity: 0.7; }
`;

/* Rule 43: interpolated keyframe fragment composed into a styled component
   MUST use the css`` helper (bare string toStrings the keyframe → mount crash). */
const fringeMotion = css`
  animation: ${fringeBeat} var(--speed-snap, 160ms) var(--ease-snap, cubic-bezier(0.16, 1, 0.3, 1)) 1 both;
`;

export const RingWrap = styled.div`
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;

  svg {
    display: block;
    transform: rotate(0deg); /* stacking-context anchor for the centered label */
  }

  .ring-fringe {
    opacity: 0.7;
    ${fringeMotion}
  }

  .ring-fill {
    filter: drop-shadow(0 0 6px color-mix(in srgb, var(--ice-wing, #60c0f0) 45%, transparent));
  }

  /* §3 CSS reduced-motion gate — the fringe holds at its static end state,
     the fill draws instantly (the component's JS gate kills the JS side). */
  @media (prefers-reduced-motion: reduce) {
    .ring-fringe {
      animation: none;
      opacity: 0.6;
    }
    .ring-fill {
      transition: none;
    }
  }
`;

export const RingCenter = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 1px;
  pointer-events: none;
`;

export const RingLevelLabel = styled.span`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--client-teal, var(--ice-wing, #60c0f0));
`;

export const RingLevelValue = styled.span`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  color: var(--client-text, #e0ecf4);
`;
