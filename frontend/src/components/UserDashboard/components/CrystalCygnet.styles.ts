/**
 * FILE: CrystalCygnet.styles.ts
 * PURPOSE: The cygnet companion's idle. Cuteness = motion (Kimi): a slow bob,
 *          a curious head-tilt, and a periodic blink. GPU-safe (transform +
 *          opacity only), no drop shadows. Reduced-motion / Still freezes the
 *          cygnet in a charming tilted pose — NOT vanish (Kimi's dignity rule).
 */

import styled, { css, keyframes } from 'styled-components';

/* Whole-body slow bob — the companion "breathes". */
const bob = keyframes`
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-1.5px); }
`;

/* Head-tilt idle — a curious lean that returns. transform-origin at the neck. */
const tilt = keyframes`
  0%, 70%, 100% { transform: rotate(0deg); }
  82%           { transform: rotate(-9deg); }
`;

/* Blink — the eye-glint briefly closes (scaleY). Rare, so it reads as alive. */
const blink = keyframes`
  0%, 92%, 100% { transform: scaleY(1); }
  96%           { transform: scaleY(0.1); }
`;

/* Rule 43: interpolated keyframe fragments use css``. */
const bobMotion = css`animation: ${bob} 3200ms ease-in-out infinite;`;
const tiltMotion = css`animation: ${tilt} 5200ms ease-in-out infinite;`;
const blinkMotion = css`animation: ${blink} 4600ms ease-in-out infinite;`;

export const CygnetWrap = styled.div`
  position: relative;
  display: inline-block;
  line-height: 0;

  svg { display: block; overflow: visible; }

  /* transform-box: fill-box makes transform-origin resolve against each shape's
     OWN bounding box (Safari<=15 / older WebKit fix). Origins are therefore
     percentages of the shape box, not viewBox pixels — the head pivots at its
     bottom (near the neck), the eye scales from its own center. */
  .cygnet-body {
    transform-box: fill-box;
    transform-origin: 50% 90%;
    ${bobMotion}
  }

  .cygnet-head {
    transform-box: fill-box;
    transform-origin: 50% 100%;
    ${tiltMotion}
  }

  .cygnet-eye {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    ${blinkMotion}
  }

  /* Reduced-motion + Still: freeze in a charming slight head-tilt pose,
     nothing vanishes (Kimi dignity rule). */
  @media (prefers-reduced-motion: reduce) {
    .cygnet-body, .cygnet-head, .cygnet-eye { animation: none; }
    .cygnet-head { transform: rotate(-6deg); }
  }
  &[data-still='true'] {
    .cygnet-body, .cygnet-head, .cygnet-eye { animation: none; }
    .cygnet-head { transform: rotate(-6deg); }
  }
`;