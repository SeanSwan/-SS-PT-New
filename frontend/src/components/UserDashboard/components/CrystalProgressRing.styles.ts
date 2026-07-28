/**
 * FILE: CrystalProgressRing.styles.ts
 * PURPOSE: The single styled wrapper for the level-indexed Crystal Ring engine.
 * KIMI K3 MANDATES: one styled component; ALL dynamics arrive as CSS custom
 *   properties written by the engine (--ring-loop / --ring-glow / --ring-ampl /
 *   --ring-scrim); keyframes are STATIC, defined once here (no runtime keyframe
 *   generation → no style churn across 1000 levels). ONE master clock rotates
 *   the electricity group; escalation deepens via the vars, not new animators.
 *   Reduced-motion + Still mode collapse to the engine's t=0 frame.
 *
 * POLISH PASS (2026-07-27, Claude Opus 4.8): the motion read "cheap" — every
 *   layer span the SAME period + direction (rigid lock), the spin was pure
 *   constant-velocity linear (loading-spinner tell), the glow throbbed (0.3
 *   opacity swing), and there was no entrance. Fixes, all still transform/opacity
 *   and still phase-locked to the ONE base --ring-loop (Kimi's one-clock law —
 *   the multipliers are harmonic DERIVATIONS of the single clock, not new
 *   animators): (1) DETUNE the layer periods so they parallax instead of locking;
 *   (2) a one-shot ENTRANCE bloom (scale+opacity) so the ring materializes;
 *   (3) a gentler, slower BREATHE; (4) orbital TWINKLE (opacity+scale, staggered)
 *   so the motes live; (5) a real AURA breath (it was static despite the comment).
 */

import styled, { css, keyframes } from 'styled-components';

/* THE master clock — the only ambient rotator. Rotates the filament group so
   the electricity chases the band. Compositor-safe (transform only). */
const orbit = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`;

/* Counter-clock — the twin band drifts the opposite way. Depth (two directions
   of light), NOT a second independent animator: a DERIVATION of --ring-loop. */
const counterOrbit = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(-360deg); }
`;

/* Slow luminous breath on the fill glow — opacity only, gentle (was a 0.3 throb;
   now a 0.16 swing that reads as light, not a pulse). Sacred = slow. */
const breathe = keyframes`
  0%, 100% { opacity: calc(0.74 + var(--ring-ampl, 1) * 0.0); }
  50%      { opacity: calc(0.74 + var(--ring-ampl, 1) * 0.16); }
`;

/* One-shot ENTRANCE — the ring materializes (scale + fade) instead of snapping
   in fully-formed and spinning. transform/opacity only; runs once on mount. */
const bloomIn = keyframes`
  from { opacity: 0; transform: scale(0.94); }
  to   { opacity: 1; transform: scale(1); }
`;

/* Orbital twinkle — each mote breathes its own light+size so the dots read as
   living particles, not flat pinpoints. Staggered per-dot below. */
const twinkle = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(0.82); }
  50%      { opacity: 1;    transform: scale(1.12); }
`;

/* Aura radiates (was declared "breathing" but had no animator). Slow scale+opacity. */
const auraBreath = keyframes`
  0%, 100% { opacity: 0.46; transform: scale(1); }
  50%      { opacity: 0.7;  transform: scale(1.045); }
`;

/* Rule 43: interpolated keyframe fragments composed into the styled component
   MUST use css`` (a bare string toStrings the keyframe → mount crash #12). */
const arcMotion = css`
  animation: ${orbit} var(--ring-loop, 14000ms) linear infinite;
`;
/* DETUNED periods → parallax. Orbitals ride slower, the glyph slower still, the
   twin counter-rotates at yet another period. All derived from --ring-loop so
   there is still exactly one clock — they just no longer lock into one rhythm. */
const orbitalMotion = css`
  animation: ${orbit} calc(var(--ring-loop, 14000ms) * 1.4) linear infinite;
`;
const glyphMotion = css`
  animation: ${orbit} calc(var(--ring-loop, 14000ms) * 2.3) linear infinite;
`;
const twinMotion = css`
  animation: ${counterOrbit} calc(var(--ring-loop, 14000ms) * 0.82) linear infinite;
`;
const breatheMotion = css`
  /* period ~half the orbit so the breath reads calm against the sweep */
  animation: ${breathe} calc(var(--ring-loop, 14000ms) / 2) ease-in-out infinite;
`;
const auraMotion = css`
  animation: ${auraBreath} calc(var(--ring-loop, 14000ms) / 2.3) ease-in-out infinite;
`;

export const RingWrap = styled.div`
  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  isolation: isolate; /* contain the glow blend to this component */

  svg {
    display: block;
    transform-origin: 50% 50%;
    /* one-shot entrance — materialize once on mount, then hand off to the
       ambient loop. fill-mode both holds the from-frame pre-start, to-frame after. */
    animation: ${bloomIn} 760ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
  }

  /* Electricity — the master clock. transform-origin center; the group spins
     as a rigid body (static path geometry inside). */
  .ring-arc-group {
    transform-box: fill-box; /* pivot on the element's own box (Safari<=15 fix) */
    transform-origin: 50% 50%;
    ${arcMotion}
    will-change: transform;
  }

  /* Depth layers — all DERIVED from the same --ring-loop (Kimi one-clock law),
     now DETUNED so they parallax: orbitals slower, twin counter-rotates, the
     inner glyph drifts slower still. Each spins as a rigid body of static
     geometry. */
  .ring-orbit-group {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    ${orbitalMotion}
    will-change: transform;
  }
  .ring-twin-group {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    ${twinMotion}
    will-change: transform;
  }
  .ring-glyph-group {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    ${glyphMotion}
    will-change: transform;
  }

  /* Orbital motes twinkle (opacity + self-scale), staggered so they don't pulse
     in unison. transform/opacity only; no filter (perf on a rotating layer). */
  .ring-orbital {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    animation: ${twinkle} calc(var(--ring-loop, 14000ms) / 3) ease-in-out infinite;
  }
  .ring-orbital:nth-child(3n) { animation-delay: -0.9s; }
  .ring-orbital:nth-child(3n + 1) { animation-delay: -1.9s; }
  .ring-orbital:nth-child(4n) { animation-delay: -2.7s; }

  /* Aura halo — a soft breathing ring behind everything (now actually breathes). */
  .ring-aura {
    transform-box: fill-box;
    transform-origin: 50% 50%;
    ${auraMotion}
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
     breath, no twinkle, no entrance, glow held static. */
  @media (prefers-reduced-motion: reduce) {
    svg,
    .ring-arc-group,
    .ring-orbit-group,
    .ring-orbital,
    .ring-twin-group,
    .ring-glyph-group,
    .ring-aura,
    .ring-fill {
      animation: none;
      /* release the compositor layers too — no point promoting idle layers
         per ring when nothing animates (hostile-review P5). */
      will-change: auto;
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
  /* PLAIN-color fallback FIRST (no color-mix) so the numeral keeps its contrast
     backing on browsers without color-mix (Safari<16.2); the color-mix upgrade
     overrides where supported. The scrim carries a WCAG guarantee — never let
     it degrade to fully transparent. */
  background: radial-gradient(circle,
    rgba(10, 10, 15, 0.72) 55%,
    transparent 78%);
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