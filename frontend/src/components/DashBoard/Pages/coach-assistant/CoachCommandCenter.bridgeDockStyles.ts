/**
 * FILE: CoachCommandCenter.bridgeDockStyles.ts
 * PURPOSE: Chat transcript + command dock + Ops drawer styles for the Command Bridge.
 *
 * Split out of CoachCommandCenter.bridgeStyles to honor the 300-line file cap (Rule 4).
 * Composed into CommandBridgeShell alongside the shell/foundation/bridge fragments.
 */

import { css } from 'styled-components';

export const coachCommandDockStyles = css`
  /* ── Chat transcript ──────────────────────────────────────────────── */
  .chat-transcript {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }
  .transcript-top {
    align-items: center;
    display: flex;
    justify-content: space-between;
  }
  .transcript-title {
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .transcript-reset {
    align-items: center;
    background: transparent;
    border: 1px solid var(--coach-line);
    border-radius: 10px;
    color: var(--coach-text-soft);
    display: inline-flex;
    font-size: 13px;
    font-weight: 700;
    gap: 6px;
    min-height: 40px;
    padding: 0 12px;
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
    font-size: 19px;
    font-weight: 800;
  }
  .transcript-empty p {
    font-size: 15px;
    line-height: 1.5;
  }

  /* ── Command dock (bottom) ────────────────────────────────────────── */
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
  .quick-intents {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .quick-intents::-webkit-scrollbar { display: none; }
  .quick-intent {
    background: var(--coach-soft);
    border: 1px solid var(--coach-line);
    border-radius: 12px;
    color: var(--coach-text);
    flex: 0 0 auto;
    font-size: 14px;
    font-weight: 720;
    min-height: 44px;
    padding: 0 14px;
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
  .dock-actions {
    align-items: center;
    display: flex;
    gap: 10px;
    justify-content: space-between;
  }
  .dock-actions-left,
  .dock-actions-right {
    align-items: center;
    display: flex;
    gap: 8px;
  }
  .dock-action {
    align-items: center;
    background: transparent;
    border: 1px solid var(--coach-line);
    border-radius: 12px;
    color: var(--coach-text-soft);
    display: inline-flex;
    font-size: 14px;
    font-weight: 700;
    gap: 6px;
    min-height: 48px;
    padding: 0 12px;
  }
  .dock-mic {
    align-items: center;
    background: var(--coach-soft);
    border: 1px solid var(--coach-line);
    border-radius: 16px;
    color: var(--coach-text);
    display: inline-flex;
    height: 56px;
    justify-content: center;
    width: 56px;
  }
  .dock-mic.is-listening {
    background: color-mix(in srgb, var(--coach-danger) 18%, transparent);
    border-color: color-mix(in srgb, var(--coach-danger) 44%, transparent);
  }
  .dock-mic:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
  /* Purple bg -> cyan glow (Dual-Button Glow) */
  .dock-send {
    align-items: center;
    background: linear-gradient(135deg, var(--coach-purple), color-mix(in srgb, var(--coach-purple) 64%, var(--coach-cyan)));
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 40%, transparent);
    border-radius: 16px;
    box-shadow: 0 10px 30px color-mix(in srgb, var(--coach-cyan) 30%, transparent);
    color: #ffffff;
    display: inline-flex;
    height: 56px;
    justify-content: center;
    width: 56px;
  }
  .dock-status {
    color: var(--coach-muted);
    font-size: 13px;
    min-height: 18px;
  }

  /* ── Ops drawer (slide-in from right; reuses .right-rail) ──────────── */
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

  @media (max-width: 360px) {
    .dock-action .dock-action-label { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .right-rail,
    .drawer-scrim,
    .new-client-button,
    .recent-chip,
    .tab-button {
      transition: none;
    }
  }
`;
