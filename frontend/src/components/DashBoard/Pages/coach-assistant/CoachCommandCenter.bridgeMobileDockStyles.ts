/**
 * FILE: CoachCommandCenter.bridgeMobileDockStyles.ts
 * PURPOSE: Mobile-first overrides that keep Floor Mode reachable and thumb-sized.
 */

import { css } from 'styled-components';

export const coachCommandBridgeMobileDockStyles = css`
  @media (max-width: 720px) {
    .bridge-shell {
      gap: 8px;
      min-height: 0;
    }

    .bridge-shell.is-chat-tab {
      height: calc(100dvh - max(12px, env(safe-area-inset-bottom)));
    }

    .bridge-shell.is-workspace-tab {
      height: auto;
      overflow: visible;
    }

    .bridge-shell.is-workspace-tab .tab-content,
    .bridge-shell.is-workspace-tab .tab-scroll {
      flex: 0 0 auto;
      min-height: auto;
      overflow: visible;
    }

    .client-bar {
      border-radius: 18px;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 12px;
    }

    .client-bar-tools {
      flex-wrap: nowrap;
    }

    .new-client-button span,
    .ops-button span {
      display: none;
    }

    .new-client-button,
    .ops-button {
      min-width: 44px;
      padding: 0;
    }

    .tab-bar {
      border-radius: 14px;
      display: grid;
      gap: 4px;
      grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
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

    .tab-scroll {
      padding-bottom: max(96px, calc(env(safe-area-inset-bottom) + 96px));
      scroll-padding-bottom: max(120px, var(--mobile-dock-space, 160px));
      scroll-padding-top: 96px;
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

    .dock-primary-row {
      gap: 8px;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .dock-safety-stack {
      align-items: flex-start;
      flex-direction: column;
      gap: 5px;
    }

    .dock-trust-pill,
    .dock-next-pill {
      max-width: 100%;
      min-height: 30px;
    }

    .dock-status {
      flex-basis: auto;
      font-size: 12px;
      min-height: 16px;
      max-width: 100%;
    }

    .dock-main-actions {
      gap: 7px;
    }

    .dock-more,
    .dock-mic,
    .dock-send {
      height: 54px;
      min-height: 54px;
      min-width: 54px;
      width: 54px;
    }

    .dock-more-menu {
      bottom: calc(100% + 8px);
      min-width: min(244px, calc(100vw - 24px));
      right: 0;
    }
  }

  @media (max-width: 380px) {
    .dock-primary-row {
      grid-template-columns: 1fr;
    }

    .dock-main-actions {
      justify-content: flex-end;
    }

    .dock-more,
    .dock-mic,
    .dock-send {
      height: 52px;
      min-height: 52px;
      min-width: 52px;
      width: 52px;
    }
  }
`;
