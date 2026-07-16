/**
 * FILE: CoachCommandCenter.voiceStripStyles.ts
 * PURPOSE: Unmistakable recording state for Swan Coach dictation.
 *
 * Three simultaneous cues (color + label + motion) so recording is obvious
 * even without the live meter; reduced-motion drops the animation but keeps
 * the color + label truth (rule 25).
 */
import { css, keyframes } from 'styled-components';

const listeningPulse = keyframes`
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.14); }
`;

const barBounce = keyframes`
  0%, 100% { transform: scaleY(0.4); }
  50% { transform: scaleY(1); }
`;

export const coachCommandVoiceStripStyles = css`
  .dock-voice-strip {
    align-items: center;
    background: color-mix(in srgb, var(--coach-danger) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-danger) 34%, transparent);
    border-radius: 12px;
    display: flex;
    gap: 10px;
    min-height: 40px;
    min-width: 0;
    padding: 5px 12px;
  }

  .voice-strip-dot {
    animation: ${listeningPulse} 1.2s ease-in-out infinite;
    background: var(--coach-danger);
    border-radius: 50%;
    flex: 0 0 auto;
    height: 10px;
    width: 10px;
  }

  .voice-strip-label {
    color: var(--coach-text);
    font-size: 13px;
    font-weight: 780;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .voice-strip-meter {
    color: var(--coach-cyan);
    flex: 1 1 auto;
    height: 28px;
    margin-left: auto;
    max-width: 220px;
    min-width: 60px;
  }

  .voice-strip-pulse {
    align-items: center;
    display: inline-flex;
    gap: 3px;
    margin-left: auto;
  }

  .voice-strip-pulse i {
    animation: ${barBounce} 1s ease-in-out infinite;
    background: var(--coach-cyan);
    border-radius: 2px;
    display: inline-block;
    height: 16px;
    width: 4px;
  }

  .voice-strip-pulse i:nth-child(2) { animation-delay: 0.18s; }
  .voice-strip-pulse i:nth-child(3) { animation-delay: 0.36s; }

  .dock-form.is-listening-form {
    border-color: color-mix(in srgb, var(--coach-danger) 46%, var(--coach-line-strong));
  }

  .dock-mic.is-listening {
    animation: ${listeningPulse} 1.6s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .voice-strip-dot,
    .voice-strip-pulse i,
    .dock-mic.is-listening {
      animation: none;
    }
  }
`;
