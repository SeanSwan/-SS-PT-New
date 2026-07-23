/**
 * FILE: CrystalProgressRing.styles.ts
 * PURPOSE: The single styled wrapper for the level-indexed Crystal Ring engine.
 * KIMI K3 MANDATES: one styled component; ALL dynamics arrive as CSS custom
 *   properties written by the engine (--ring-loop / --ring-glow / --ring-ampl /
 *   --ring-scrim); keyframes are STATIC, defined once here (no runtime keyframe
 *   generation → no style churn across 1000 levels). ONE master clock rotates
 *   the electricity group; escalation deepens via the vars, not new animators.
 *   Reduced-motion + Still mode collapse to the engine's t=0 frame.
 */

import styled, { css, keyframes } from 'styled-components';

/* THE master clock — the only ambient animator. Rotates the filament group so
   the electricity chases the band. Compositor-safe (transform only). */
const orbit = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

/* Counter-clock — the twin band drifts the opposite way at the same period.
   Depth (two directions of light), NOT a second independent animator: same
   --ring-loop, phase-locked. */
const counterOrbit = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
`;

/* Slow luminous breath on the fill glow — phase-locked feel via the same loop
   period. Opacity only. Sacred = slow. */
const breathe = keyframes`
  0%, 100% { opacity: calc(0.7 + var(--ring-ampl, 1) * 0.0); }
  50%      { opacity: calc(0.7 + var(--ring-ampl, 1) * 0.3); }
`;

/* Rule 43: interpolated keyframe fragments composed into the styled component
   MUST use css`` (a bare string toStrings the keyframe → mount crash #12). */
const arcMotion = css`
  animation: ${orbit} var(--ring-loop, 14000ms) linear infinite;
`;
/* Orbitals ride the master clock; the glyph ring drifts slower (2× period). */
const orbitalMotion = css`
  animation: ${orbit} var(--ring-loop, 14000ms) linear infinite;
`;
const glyphMotion = css`
  animation: ${orbit} calc(var(--ring-loop, 14000ms) * 2) linear infinite;
`;
const twinMotion = css`
  animation: ${counterOrbit} var(--ring-loop, 14000ms) linear infinite;
`;
const breatheMotion = css`
  /* period ~half the orbit so the breath reads calm against the sweep */
  animation: ${breathe} calc(var(--ring-loop, 14000ms) / 2) ease-in-out infinite;
`;

export const RingWrap = styled.div`
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  isolation: isolate; /* contain the glow blend to this component */

  svg {
    display: block;
  }

  /* Electricity — the master clock. transform-origin center; the group spins
     as a rigid body (static path geometry inside). */
  .ring-arc-group {
    transform-origin: 50% 50%;
    ${arcMotion}
    will-change: transform;
  }

  /* Depth layers — all phase-locked to the same --ring-loop (Kimi one-clock
     law): orbitals ride it, the twin band counter-rotates, the inner glyph
     drifts at half speed. Each spins as a rigid body of static geometry. */
  .ring-orbit-group {
    transform-origin: 50% 50%;
    ${orbitalMotion}
    will-change: transform;
  }
  .ring-twin-group {
    transform-origin: 50% 50%;
    ${twinMotion}
    will-change: transform;
  }
  .ring-glyph-group {
    transform-origin: 50% 50%;
    ${glyphMotion}
    will-change: transform;
  }

  /* Progress fill carries the era spectrum + a glow whose strength is the
     engine's --ring-glow; the glow gently breathes on the master clock. */
  .ring-fill {
    filter: drop-shadow(0 0 calc(6px + var(--ring-glow, 0.5) * 10px)
      color-mix(in srgb, var(--ice-wing, #60c0f0) calc(var(--ring-glow, 0.5) * 70%), transparent));
    ${breatheMotion}
  }

  /* Ultimate ring (level 1000): a second, gold-weighted glow ring. Still one
     clock — same loop period, no new animator, just a richer static filter. */
  &[data-ultimate='true'] .ring-fill {
    filter:
      drop-shadow(0 0 16px color-mix(in srgb, var(--gilded-fern, #c6a84b) 70%, transparent))
      drop-shadow(0 0 26px color-mix(in srgb, var(--ice-wing, #60c0f0) 55%, transparent));
  }

  /* §3 CSS reduced-motion gate — collapse to the t=0 frame: no orbit, no
     breath, glow held static. (No JS motion path to also gate — mandate 6.) */
  @media (prefers-reduced-motion: reduce) {
    .ring-arc-group,
    .ring-orbit-group,
    .ring-twin-group,
    .ring-glyph-group,
    .ring-fill {
      animation: none;
    }
  }
`;

/* Numeral sanctuary — an obsidian radial scrim behind the number. Its opacity
   is the engine's --ring-scrim, which grows WITH the glow so the level number
   holds ≥4.5:1 no matter how bright the era gets (Kimi mandate 3). */
export const RingScrim = styled.div`
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle,
    color-mix(in srgb, var(--obsidian-black, #0a0a0f) calc(var(--ring-scrim, 0.6) * 100%), transparent) 55%,
    transparent 78%);
  pointer-events: none;
  z-index: 1;
`;

export const RingCenter = styled.div`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 2px;
  pointer-events: none;
  z-index: 2;
`;

export const RingEraLabel = styled.span`
  font-family: 'Sora', system-ui, sans-serif;
  font-size: 0.56rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--client-teal, var(--ice-wing, #60c0f0));
`;

export const RingLevelValue = styled.span`
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
  color: var(--client-text, #e0ecf4);
  text-shadow: 0 1px 3px color-mix(in srgb, var(--obsidian-black, #0a0a0f) 70%, transparent);
`;
