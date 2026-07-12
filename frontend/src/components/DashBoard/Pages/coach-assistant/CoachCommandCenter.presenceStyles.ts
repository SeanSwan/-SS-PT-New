/**
 * FILE: CoachCommandCenter.presenceStyles.ts
 * PURPOSE: The Aurora Bridge presence line — the Command Center's
 * signature moment. A slim living strip under the client bar whose
 * motion COMMUNICATES the coach's state (design-system rule: no motion
 * without a job): idle breathes, listening scans cyan, thinking
 * shimmers, speaking flows purple<->cyan in rhythm with TTS.
 *
 * Lens-aware: the line's accent inherits --lens-navigation-edge, so a
 * committed Style Lens re-tunes the Bridge's presence identity.
 * Reduced-motion: animation stops; each state keeps a DISTINCT static
 * gradient so state is still color-legible (a11y: never motion-only).
 */
import { css, keyframes } from 'styled-components';

const breathe = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 0.95; }
`;

const scan = keyframes`
  from { background-position: -40% 0; }
  to { background-position: 140% 0; }
`;

const flow = keyframes`
  from { background-position: 0% 0; }
  to { background-position: 200% 0; }
`;

export const coachCommandPresenceStyles = css`
  .coach-presence-line {
    height: 3px;
    border-radius: 999px;
    margin: 2px 2px 0;
    background: linear-gradient(
      90deg,
      transparent,
      color-mix(in srgb, var(--lens-navigation-edge, var(--coach-cyan, #60c0f0)) 65%, transparent),
      transparent
    );
    background-size: 100% 100%;
    animation: ${breathe} 4.5s ease-in-out infinite;
    will-change: opacity, background-position;
  }

  [data-voice-state='listening'] .coach-presence-line {
    background: linear-gradient(
      90deg,
      transparent 20%,
      var(--coach-cyan, #60c0f0) 50%,
      transparent 80%
    );
    background-size: 45% 100%;
    background-repeat: no-repeat;
    animation: ${scan} 1.6s linear infinite;
    box-shadow: 0 0 12px color-mix(in srgb, var(--coach-cyan, #60c0f0) 55%, transparent);
  }

  [data-voice-state='thinking'] .coach-presence-line {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--coach-sapphire, #4070c0) 70%, transparent),
      color-mix(in srgb, var(--coach-cyan, #60c0f0) 80%, transparent),
      color-mix(in srgb, var(--coach-sapphire, #4070c0) 70%, transparent)
    );
    background-size: 200% 100%;
    animation: ${flow} 2.8s ease-in-out infinite;
  }

  [data-voice-state='speaking'] .coach-presence-line {
    background: linear-gradient(
      90deg,
      var(--coach-purple, #8b5cf6),
      var(--coach-cyan, #60c0f0),
      var(--coach-purple, #8b5cf6)
    );
    background-size: 200% 100%;
    animation: ${flow} 1.4s linear infinite;
    box-shadow: 0 0 16px color-mix(in srgb, var(--coach-purple, #8b5cf6) 45%, transparent);
  }

  @media (prefers-reduced-motion: reduce) {
    .coach-presence-line,
    [data-voice-state='listening'] .coach-presence-line,
    [data-voice-state='thinking'] .coach-presence-line,
    [data-voice-state='speaking'] .coach-presence-line {
      animation: none;
      background-size: 100% 100%;
      background-repeat: no-repeat;
    }
  }
`;
