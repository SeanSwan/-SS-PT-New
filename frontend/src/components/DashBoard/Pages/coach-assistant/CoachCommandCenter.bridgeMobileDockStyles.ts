/**
 * FILE: CoachCommandCenter.bridgeMobileDockStyles.ts
 * PURPOSE: Mobile-first overrides that keep the Swan Coach command dock
 * reachable, thumb-sized, and safe-area aware inside the mounted dashboard.
 */

import { css } from 'styled-components';

export const coachCommandBridgeMobileDockStyles = css`
  @media (max-width: 720px) {
    .bridge-shell {
      gap: 8px;
      height: calc(100dvh - max(12px, env(safe-area-inset-bottom)));
      min-height: 0;
    }

    .client-bar {
      border-radius: 18px;
      gap: 10px;
      padding: 12px;
    }

    .tab-bar {
      border-radius: 14px;
      display: grid;
      gap: 4px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      overflow: visible;
      padding: 4px;
    }

    .tab-button {
      font-size: 12px;
      justify-content: center;
      min-height: 48px;
      min-width: 0;
      padding: 0 8px;
      white-space: normal;
    }

    .client-action-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      overflow: visible;
    }

    .client-action-button {
      min-height: 64px;
    }

    .transcript-top {
      display: none;
    }

    .transcript-stream {
      padding: 2px 2px 12px;
    }

    .console-dock {
      background: linear-gradient(
        180deg,
        transparent 0%,
        color-mix(in srgb, var(--coach-bg) 92%, transparent) 14%,
        var(--coach-bg) 100%
      );
      bottom: 0;
      gap: 8px;
      margin: 0 -2px;
      padding: 8px 0 max(10px, env(safe-area-inset-bottom));
      position: sticky;
      z-index: 24;
    }

    .next-action-chip {
      min-height: 46px;
      padding: 0 12px;
    }

    .workout-route-actions {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: none;
    }

    .workout-route-actions::-webkit-scrollbar,
    .dock-actions-left::-webkit-scrollbar {
      display: none;
    }

    .workout-route-link {
      flex: 0 0 auto;
      min-height: 48px;
      min-width: max-content;
    }


    .dock-form {
      border-radius: 20px;
      box-shadow: 0 18px 50px color-mix(in srgb, var(--coach-bg) 78%, transparent);
      gap: 8px;
      padding: 10px;
    }

    .dock-textarea {
      font-size: 16px;
      max-height: 112px;
      min-height: 52px;
      padding: 12px;
    }

    .dock-actions {
      display: grid;
      gap: 8px;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .dock-actions-left {
      gap: 6px;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .dock-action {
      justify-content: center;
      min-width: 48px;
      padding: 0;
      width: 48px;
    }

    .dock-action .dock-action-label {
      display: none;
    }

    .dock-actions-right {
      flex: 0 0 auto;
      gap: 8px;
    }

    .dock-mic,
    .dock-send {
      height: 54px;
      min-width: 54px;
      min-height: 54px;
      width: 54px;
    }

    .dock-status {
      font-size: 12px;
      min-height: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (max-width: 380px) {
    .tab-bar,
    .client-action-strip {
      grid-template-columns: 1fr;
    }

    .dock-actions {
      grid-template-columns: minmax(0, 1fr) 112px;
    }

    .dock-mic,
    .dock-send {
      height: 52px;
      min-width: 52px;
      min-height: 52px;
      width: 52px;
    }
  }
`;
