/**
 * COMPONENT: ConsoleAtmosphere (ConsoleOS)
 * PURPOSE: The Aurora Console skin's living backdrop — a slow aurora sheet
 * whose hue IS the console's state (presence as weather).
 *
 * REUSABLE CONTRACT: any console surface adopts the skin by (1) mounting this
 * component as the first child of a `position: relative` shell that exposes
 * `data-voice-state` (or any `data-console-state`), and (2) consuming the
 * `--console-*` tokens defined by the `aurora-console` lens.
 *
 * FAIL-CLOSED: renders nothing visible unless the `aurora-console` Style Lens
 * is committed (`html[data-style-lens='aurora-console']`) — gating is pure
 * CSS, so no component needs lens-awareness in JS, and every other lens and
 * the default render byte-identically. Theme changes recolor it automatically
 * (all hues come from theme-derived --console-* tokens).
 *
 * Motion: transform/opacity only (GPU-safe, rule 25); reduced-motion keeps a
 * static per-state tint so the state signal survives without animation.
 */
import styled, { keyframes } from 'styled-components';

const auroraDrift = keyframes`
  0% { transform: translate3d(-6%, -2%, 0) rotate(-1.2deg); }
  50% { transform: translate3d(5%, 2%, 0) rotate(1.4deg); }
  100% { transform: translate3d(-6%, -2%, 0) rotate(-1.2deg); }
`;

const auroraBreathe = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.9; }
`;

const ConsoleAtmosphere = styled.div.attrs({ 'aria-hidden': true })`
  display: none;

  html[data-style-lens='aurora-console'] & {
    display: block;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: absolute;
    z-index: 0;
  }

  html[data-style-lens='aurora-console'] &::before,
  html[data-style-lens='aurora-console'] &::after {
    animation: ${auroraDrift} 26s ease-in-out infinite;
    border-radius: 50%;
    content: '';
    filter: blur(46px);
    height: 62%;
    position: absolute;
    top: -28%;
    width: 78%;
    will-change: transform, opacity;
  }

  html[data-style-lens='aurora-console'] &::before {
    animation: ${auroraDrift} 26s ease-in-out infinite, ${auroraBreathe} 9s ease-in-out infinite;
    background: linear-gradient(100deg, var(--console-state-color, var(--console-atmosphere-a, transparent)), transparent 70%);
    left: -12%;
  }

  html[data-style-lens='aurora-console'] &::after {
    animation: ${auroraDrift} 34s ease-in-out infinite reverse, ${auroraBreathe} 13s ease-in-out infinite;
    background: linear-gradient(260deg, var(--console-atmosphere-b, transparent), transparent 72%);
    right: -16%;
    top: -22%;
  }

  /* Presence as weather: the sheet's leading hue follows the console state
     set on an ancestor (Coach shell exposes data-voice-state today). */
  [data-voice-state='idle'] &, [data-console-state='idle'] & {
    --console-state-color: color-mix(in srgb, var(--console-state-idle, #60c0f0) 30%, transparent);
  }
  [data-voice-state='listening'] &, [data-console-state='listening'] & {
    --console-state-color: color-mix(in srgb, var(--console-state-listening, #ff6d85) 36%, transparent);
  }
  [data-voice-state='thinking'] &, [data-console-state='thinking'] & {
    --console-state-color: color-mix(in srgb, var(--console-state-thinking, #8b5cf6) 34%, transparent);
  }
  [data-voice-state='speaking'] &, [data-console-state='speaking'] & {
    --console-state-color: color-mix(in srgb, var(--console-state-speaking, #c6a84b) 32%, transparent);
  }

  /* Phone tier: presence must read where the operator is LOOKING.
     On a tall, narrow viewport the top-anchored sheet sits mostly offscreen —
     measured at 414px, a state change moved only 1.6% of pixels, and 0% below
     the fold, which is exactly where the mic and composer live while
     dictating. So on phone the state layer re-anchors to the dock and widens,
     blooming up through the frost glass the operator is already looking at.
     Desktop keeps the top-anchored sheet: it reads well at 1440/2560. */
  @media (max-width: 768px) {
    html[data-style-lens='aurora-console'] &::before {
      bottom: -18%;
      height: 58%;
      left: -24%;
      top: auto;
      width: 148%;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    html[data-style-lens='aurora-console'] &::before,
    html[data-style-lens='aurora-console'] &::after {
      animation: none;
      opacity: 0.6;
    }
  }
`;

export default ConsoleAtmosphere;
