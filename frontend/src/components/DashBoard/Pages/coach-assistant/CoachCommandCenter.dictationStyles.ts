/**
 * FILE: CoachCommandCenter.dictationStyles.ts
 * PURPOSE: The inline dictation strip that sits inside the command dock.
 *
 * Split into its own module rather than appended to bridgeDockStyles, which was
 * already at 299 of the project's 300-line cap.
 *
 * THE BARS ARE HONEST OR THEY ARE ABSENT
 * --------------------------------------
 * `.dock-listening-bar` without `is-ambient` is driven by a transform written
 * from the real microphone waveform, so a flat strip means flat audio.
 * `.is-ambient` is the fallback used when no analyser could attach (no
 * AudioContext, or no stream yet) and it animates on a timer — it is a
 * "something is happening" pulse, not a level reading, and it must never be
 * presented as one.
 */
import { css } from 'styled-components';

export const coachCommandDictationStyles = css`
  .dock-listening {
    align-items: center;
    background: color-mix(in srgb, var(--coach-danger) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-danger) 30%, transparent);
    border-radius: 12px;
    display: flex;
    gap: 10px;
    min-height: 44px;
    padding: 0 12px;
  }
  .dock-listening.is-transcribing {
    background: color-mix(in srgb, var(--coach-cyan) 10%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan) 30%, transparent);
  }
  .dock-listening-bars {
    align-items: center;
    display: inline-flex;
    flex: 0 0 auto;
    gap: 3px;
    height: 24px;
  }
  .dock-listening-bar {
    background: var(--coach-danger);
    border-radius: 999px;
    display: block;
    height: 24px;
    transform-origin: center;
    transition: transform 90ms linear;
    width: 3px;
  }
  .dock-listening.is-transcribing .dock-listening-bar {
    background: var(--coach-cyan);
  }
  .dock-listening-bar.is-ambient,
  .dock-listening.is-transcribing .dock-listening-bar.is-ambient {
    animation: dock-listening-pulse 900ms ease-in-out infinite alternate;
    transition: none;
  }
  @keyframes dock-listening-pulse {
    from {
      transform: scaleY(0.2);
    }
    to {
      transform: scaleY(1);
    }
  }
  .dock-listening-text {
    color: var(--coach-text-soft);
    font-size: 13px;
    font-weight: 760;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dock-listening-clock {
    color: var(--coach-muted);
    flex: 0 0 auto;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    margin-left: auto;
  }
  @media (prefers-reduced-motion: reduce) {
    .dock-listening-bar {
      transition: none;
    }
    .dock-listening-bar.is-ambient {
      animation: none;
      transform: scaleY(0.5);
    }
  }
`;
