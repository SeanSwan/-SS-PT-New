/**
 * sheenFrame — shared style fragments for the Forge Sheen tier (SWA-224)
 * =======================================================================
 * BLUEPRINT
 * ---------
 * Purpose : The "border is a window onto a world" treatment, as composable
 *           styled-components fragments shared by SheenButton and SheenCard.
 * Inputs  : a `SheenWorldId` and a `SheenSurface` (which picks the frame width).
 * Outputs : `css` fragments only — this module renders nothing on its own.
 *
 * RULE 43 — every fragment here is a `css` tagged template, never a plain
 * string. These fragments interpolate `keyframes`, and a plain template literal
 * calls toString() on a keyframes object, baking the generated class name into
 * the CSS output and crashing styled-components at mount with error #12. The
 * build passes, types pass, nothing warns in dev — it only dies in the browser.
 * If you add a fragment here, it is `css``, not a string.
 *
 * Colour discipline: no literal hex is used AS A COLOUR here. Gradient stops come
 * from `SHEEN_WORLDS[...].edge`, defined and justified once in the token file.
 * The two opaque sentinels in the mask declarations below are not colours — a
 * mask reads only alpha, so any fully-opaque value behaves identically. Each
 * carries its own per-line Rule 6 tag; the literal is deliberately not repeated
 * here, because a hex written to explain a hex is still a hex to the guard.
 *
 * @see docs SWA-224 · tokens `styles/sheenPackTokens.ts`
 */

import { css, keyframes } from 'styled-components';
import {
  SHEEN,
  SHEEN_WORLDS,
  sheenFrameWidth,
  sheenShimmerFor,
  type SheenSurface,
  type SheenWorldId,
} from '../../../styles/sheenPackTokens';

/** One rotation of whatever sits inside the frame. */
export const sheenSpin = keyframes`
  to { transform: translate(-50%, -50%) rotate(360deg); }
`;

/** Horizontal drift for parallax bands (clouds, swells). */
export const sheenDrift = keyframes`
  to { background-position: -200% 0; }
`;

/**
 * The masked frame itself. Everything painted by the world layers is visible
 * ONLY through this ring, which is what makes it read as a window rather than
 * a background. `padding` is the frame weight; the xor mask punches the middle out.
 */
export const sheenWindow = (surface: SheenSurface) => css`
  position: absolute;
  inset: 0;
  z-index: 3;
  border-radius: inherit;
  pointer-events: none;
  overflow: hidden;
  padding: ${sheenFrameWidth(surface)};
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); /* swan-guard-allow-hex mask sentinel, not a colour: any opaque value works */
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); /* swan-guard-allow-hex mask sentinel, not a colour: any opaque value works */
  mask-composite: exclude;

  > i {
    position: absolute;
    display: block;
    border-radius: inherit;
  }
`;

/** A rotating conic ring built from a world's stop list. Used by the metal worlds. */
const rotatingRing = (world: SheenWorldId) => {
  const { edge, spinSeconds } = SHEEN_WORLDS[world];
  return css`
    > i.spin {
      top: 50%;
      left: 50%;
      width: 300%;
      padding-bottom: 300%;
      transform: translate(-50%, -50%) rotate(0deg);
      background: conic-gradient(from 0deg, ${edge.join(', ')});
      animation: ${sheenSpin} ${spinSeconds}s linear infinite;
      filter: saturate(1.25) brightness(1.08);
    }
  `;
};

/** Horizontal specular banding — what actually reads as metal rather than hue. */
const metalBanding = css`
  > i.hz {
    inset: 0;
    mix-blend-mode: overlay;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.5) 0%,
      rgba(255, 255, 255, 0) 26%,
      rgba(0, 0, 0, 0.45) 48%,
      rgba(255, 255, 255, 0.28) 62%,
      rgba(0, 0, 0, 0.3) 100%
    );
  }
`;

/** Blue Sky: two cloud bands at different rates — the parallax law, two layers minimum. */
const skyWorld = css`
  > i.sky {
    inset: 0;
    background: linear-gradient(180deg, ${SHEEN_WORLDS.sky.edge.join(', ')});
  }
  > i.cl {
    inset: -40% -10%;
    opacity: 0.95;
    background:
      radial-gradient(38px 20px at 12% 40%, rgba(255, 255, 255, 1) 60%, transparent 72%),
      radial-gradient(52px 26px at 30% 46%, rgba(255, 255, 255, 1) 62%, transparent 74%),
      radial-gradient(60px 28px at 58% 52%, rgba(255, 255, 255, 1) 60%, transparent 73%),
      radial-gradient(44px 24px at 84% 44%, rgba(255, 255, 255, 1) 60%, transparent 73%);
    background-repeat: repeat-x;
    background-size: 52% 100%;
    animation: ${sheenDrift} 26s linear infinite;
  }
  > i.cl2 {
    inset: -55% -10%;
    opacity: 0.5;
    filter: blur(1.5px);
    background:
      radial-gradient(70px 30px at 8% 55%, rgba(255, 255, 255, 1) 60%, transparent 74%),
      radial-gradient(90px 36px at 44% 48%, rgba(255, 255, 255, 1) 60%, transparent 74%);
    background-repeat: repeat-x;
    background-size: 64% 100%;
    animation: ${sheenDrift} 44s linear infinite reverse;
  }
`;

/**
 * The travelling polish that rides over every world.
 * Two narrow highlights and one shadow, mostly transparent: at higher coverage
 * this erased the scenery outright (decision 3), so strength is token-driven.
 */
const shimmer = (world: SheenWorldId) => css`
  > i.shim {
    top: 50%;
    left: 50%;
    width: 300%;
    padding-bottom: 300%;
    transform: translate(-50%, -50%) rotate(0deg);
    mix-blend-mode: overlay;
    opacity: ${sheenShimmerFor(world)};
    background: conic-gradient(
      from 0deg,
      rgba(255, 255, 255, 0) 0deg,
      rgba(255, 255, 255, 0.95) 9deg,
      rgba(255, 255, 255, 0) 20deg,
      rgba(255, 255, 255, 0) 120deg,
      rgba(0, 0, 0, 0.34) 138deg,
      rgba(255, 255, 255, 0) 156deg,
      rgba(255, 255, 255, 0) 208deg,
      rgba(255, 255, 255, 0.78) 220deg,
      rgba(255, 255, 255, 0) 234deg,
      rgba(255, 255, 255, 0) 360deg
    );
    animation: ${sheenSpin} ${SHEEN.spin.shimmer}s linear infinite;
  }

  /* machined inner rim — one bright hairline, one dark */
  > i.rim {
    inset: 0;
    border-radius: inherit;
    box-shadow:
      inset 0 0 0 0.75px rgba(255, 255, 255, 0.42),
      inset 0 0 0 1.6px rgba(0, 0, 0, 0.5);
  }
`;

/** Everything painted inside the frame for a given world. */
export const sheenWorld = (world: SheenWorldId) => css`
  ${world === 'sky' ? skyWorld : rotatingRing(world)}
  ${world === 'sky' ? '' : metalBanding}
  ${shimmer(world)}
`;

/**
 * Motion safety. Under reduce, every animated layer stops but stays visible —
 * the frame keeps its look and simply holds still, rather than disappearing.
 */
export const sheenReducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    > i.spin,
    > i.shim,
    > i.cl,
    > i.cl2 {
      animation: none;
    }
  }
`;

/**
 * Windows High Contrast / forced-colors: decorative layers are dropped entirely
 * and a system border is restored, so the control stays legible when the user's
 * palette replaces ours.
 */
export const sheenForcedColors = css`
  @media (forced-colors: active) {
    > i {
      display: none;
    }
    border: 1px solid CanvasText;
  }
`;
