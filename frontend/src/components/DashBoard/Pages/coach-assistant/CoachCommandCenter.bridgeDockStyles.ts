/**
 * FILE: CoachCommandCenter.bridgeDockStyles.ts
 * PURPOSE: Chat transcript + Floor Mode command dock + drawer styles.
 *
 * Split out of CoachCommandCenter.bridgeStyles to honor the 300-line file cap.
 */
import { css } from 'styled-components';
export const coachCommandDockStyles = css`
  .chat-transcript {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }
  .transcript-stream {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 4px 8px;
  }
  .transcript-empty {
    color: var(--coach-muted);
    display: grid;
    gap: 10px;
    justify-items: center;
    margin: auto;
    max-width: 440px;
    padding: 32px 16px;
    text-align: center;
  }
  .transcript-empty strong {
    color: var(--coach-text);
    font-size: 20px;
    font-weight: 840;
  }
  .transcript-empty p {
    color: var(--coach-text-soft);
    font-size: 15px;
    line-height: 1.5;
    margin: 0;
  }
  .transcript-empty-safe {
    background: color-mix(in srgb, var(--coach-gold) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-gold) 32%, transparent);
    border-radius: 999px;
    color: color-mix(in srgb, var(--coach-gold) 82%, var(--coach-text));
    font-size: 13px;
    font-weight: 800;
    min-height: 32px;
    padding: 7px 12px;
  }
  .transcript-empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    list-style: none;
    margin: 4px 0 0;
    padding: 0;
  }
  .transcript-empty-actions li {
    background: color-mix(in srgb, var(--coach-cyan) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 18%, var(--coach-line));
    border-radius: 999px;
    color: var(--coach-text-soft);
    font-size: 12px;
    font-weight: 760;
    min-height: 32px;
    padding: 7px 11px;
  }
  .console-dock {
    display: grid;
    flex: 0 0 auto;
    gap: 10px;
    padding-top: 2px;
  }
  .next-action-chip {
    align-items: center;
    background: color-mix(in srgb, var(--coach-gold) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-gold) 36%, transparent);
    border-radius: 999px;
    color: color-mix(in srgb, var(--coach-gold) 82%, var(--coach-text));
    display: inline-flex;
    font-size: 14px;
    font-weight: 740;
    gap: 8px;
    justify-self: start;
    max-width: 100%;
    min-height: 44px;
    padding: 0 16px;
    text-decoration: none;
  }
  .next-action-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dock-form {
    background: color-mix(in srgb, var(--coach-surface-strong) 86%, transparent);
    border: 1px solid var(--coach-line-strong);
    border-radius: 18px;
    display: grid;
    gap: 10px;
    padding: 12px;
  }
  .dock-textarea {
    border-radius: 12px;
    font-size: 17px;
    line-height: 1.4;
    max-height: 160px;
    min-height: 64px;
    resize: none;
  }
  .dock-primary-row {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr) auto;
  }
  .dock-safety-stack {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    min-width: 0;
  }
  .dock-trust-pill,
  .dock-next-pill {
    align-items: center;
    border-radius: 999px;
    display: inline-flex;
    font-size: 12px;
    font-weight: 820;
    min-height: 32px;
    padding: 0 11px;
  }
  .dock-trust-pill {
    background: color-mix(in srgb, var(--coach-gold) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-gold) 32%, transparent);
    color: color-mix(in srgb, var(--coach-gold) 84%, var(--coach-text));
  }
  .dock-next-pill {
    background: color-mix(in srgb, var(--coach-cyan) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 24%, transparent);
    color: var(--coach-text-soft);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dock-status {
    color: var(--coach-muted);
    flex-basis: 100%;
    font-size: 13px;
    min-height: 18px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .dock-main-actions {
    align-items: center;
    display: inline-flex;
    gap: 8px;
  }
  .dock-more-wrap {
    position: relative;
  }
  .dock-more,
  .dock-mic,
  .dock-send {
    align-items: center;
    border-radius: 16px;
    display: inline-flex;
    height: 56px;
    justify-content: center;
    min-height: 56px;
    min-width: 56px;
    width: 56px;
  }
  .dock-more,
  .dock-mic {
    background: var(--coach-soft);
    border: 1px solid var(--coach-line);
    color: var(--coach-text);
  }
  .dock-more-menu {
    background: color-mix(in srgb, var(--coach-surface-strong) 96%, var(--coach-bg));
    border: 1px solid var(--coach-line-strong);
    border-radius: 16px;
    bottom: calc(100% + 8px);
    box-shadow: 0 18px 50px color-mix(in srgb, var(--coach-bg) 72%, transparent);
    display: grid;
    gap: 6px;
    min-width: 216px;
    padding: 8px;
    position: absolute;
    right: 0;
    z-index: 35;
  }
  .dock-more-menu button,
  .dock-more-menu a {
    align-items: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 11px;
    color: var(--coach-text-soft);
    display: flex;
    font-size: 14px;
    font-weight: 760;
    gap: 9px;
    min-height: 44px;
    padding: 0 10px;
    text-decoration: none;
  }
  .dock-more-menu button:hover,
  .dock-more-menu a:hover {
    background: color-mix(in srgb, var(--coach-cyan) 10%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan) 20%, transparent);
    color: var(--coach-text);
  }
  .dock-mic.is-listening {
    background: color-mix(in srgb, var(--coach-danger) 18%, transparent);
    border-color: color-mix(in srgb, var(--coach-danger) 44%, transparent);
  }
  .dock-mic:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  .dock-send {
    background: linear-gradient(135deg, var(--coach-purple), color-mix(in srgb, var(--coach-purple) 64%, var(--coach-cyan)));
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 40%, transparent);
    box-shadow: 0 10px 30px color-mix(in srgb, var(--coach-cyan) 30%, transparent);
    color: #ffffff;
  }
  .drawer-scrim {
    background: color-mix(in srgb, var(--coach-bg) 70%, transparent);
    border: 0;
    display: block;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    position: fixed;
    transition: opacity 180ms ease;
    z-index: 40;
  }
  .drawer-scrim.is-open {
    opacity: 1;
    pointer-events: auto;
  }
  .right-rail {
    border-radius: 22px 0 0 22px;
    height: 100dvh;
    max-height: none;
    overflow-y: auto;
    padding: 16px;
    position: fixed;
    right: 0;
    top: 0;
    transform: translateX(100%);
    transition: transform 220ms ease;
    width: min(360px, 92vw);
    z-index: 50;
  }
  .right-rail.is-open {
    transform: translateX(0);
  }
  @media (prefers-reduced-motion: reduce) {
    .right-rail,
    .drawer-scrim,
    .new-client-button,
    .tab-button {
      transition: none;
    }
  }
`;
