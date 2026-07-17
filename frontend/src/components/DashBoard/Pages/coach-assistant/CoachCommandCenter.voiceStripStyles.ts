/**
 * FILE: CoachCommandCenter.voiceStripStyles.ts
 * PURPOSE: Live-conversation affordances — recording strip + jump-to-newest.
 *
 * Recording gets three simultaneous cues (color + label + motion) so it is
 * obvious even without the live meter; reduced-motion drops the animation but
 * keeps the color + label truth (rule 25). The jump pill appears when new
 * replies land while the reader is scrolled up in history.
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

  .chat-transcript {
    position: relative;
  }

  .transcript-day-divider {
    align-items: center;
    color: var(--coach-muted);
    display: flex;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    gap: 10px;
    letter-spacing: 0.08em;
    margin: 4px 0;
    text-transform: uppercase;
  }

  .transcript-day-divider::before,
  .transcript-day-divider::after {
    background: var(--coach-line);
    content: '';
    flex: 1 1 auto;
    height: 1px;
  }

  .transcript-pending {
    align-items: center;
    align-self: flex-start;
    background: color-mix(in srgb, var(--coach-cyan) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 20%, var(--coach-line));
    border-radius: 14px;
    color: var(--coach-text-soft);
    display: inline-flex;
    font-size: 14px;
    font-weight: 740;
    gap: 10px;
    min-height: 40px;
    padding: 8px 14px;
  }

  .transcript-pending .voice-strip-pulse {
    margin-left: 0;
  }

  .transcript-pending .voice-strip-pulse i {
    background: var(--coach-cyan);
  }

  .transcript-jump-newest {
    align-items: center;
    background: color-mix(in srgb, var(--coach-surface-strong) 94%, var(--coach-bg));
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 38%, var(--coach-line));
    border-radius: 999px;
    bottom: 10px;
    box-shadow: 0 10px 26px color-mix(in srgb, var(--coach-bg) 70%, transparent);
    color: var(--coach-text);
    display: inline-flex;
    font-size: 13px;
    font-weight: 780;
    gap: 6px;
    left: 50%;
    min-height: 44px;
    padding: 0 16px;
    position: absolute;
    transform: translateX(-50%);
    z-index: 8;
  }

  .transcript-jump-newest:hover,
  .transcript-jump-newest:focus-visible {
    border-color: color-mix(in srgb, var(--coach-cyan) 58%, var(--coach-line));
  }

  @media (prefers-reduced-motion: reduce) {
    .voice-strip-dot,
    .voice-strip-pulse i,
    .dock-mic.is-listening {
      animation: none;
    }
  }
`;
