/**
 * FILE: CoachCommandCenter.bridgeMobileDockStyles.ts
 * PURPOSE: Mobile-first overrides — the chat thread owns the viewport.
 *
 * Codex-chat baseline (NEXT-CHAT W3): one compact header band, a single-line
 * status strip, and a one-row composer, so the transcript keeps the majority
 * of a phone screen. Device-matrix aware: notch-side safe areas, a
 * short-viewport tier, and a visualViewport keyboard inset
 * (--coach-kb-inset, set by useCoachKeyboardInset) so the dock is never
 * hidden behind the iOS keyboard.
 */

import { css } from 'styled-components';
import { media, PHONE_MAX_WIDTH, safeArea } from '../../../../styles/device-matrix';

export const coachCommandBridgeMobileDockStyles = css`
  @media (max-width: 720px) {
    .bridge-shell {
      gap: 8px;
      min-height: 0;
      padding-left: ${safeArea('left', '0px')};
      padding-right: ${safeArea('right', '0px')};
    }

    .bridge-shell.is-chat-tab {
      height: max(420px, calc(100dvh - 200px - env(safe-area-inset-bottom) - var(--coach-kb-inset, 0px)));
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
      border-radius: 16px;
      grid-template-columns: minmax(0, 1fr) auto;
      padding: 8px 10px;
    }

    .client-bar-tools {
      flex-wrap: nowrap;
    }

    .now-label {
      font-size: 11px;
    }

    /* Compact the main-client binder: the select keeps its aria-label, the
       visual eyebrow is redundant next to the "Now coaching" header. */
    .main-client-picker > span {
      display: none;
    }

    .main-client-picker select {
      min-height: 40px;
    }

    .client-name {
      font-size: clamp(17px, 4.6vw, 20px);
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
      grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
      overflow: visible;
      padding: 3px;
    }

    .tab-button {
      font-size: 12px;
      justify-content: center;
      min-height: 44px;
      min-width: 0;
      padding: 0 8px;
      white-space: normal;
    }

    .tab-scroll {
      padding-bottom: max(96px, calc(env(safe-area-inset-bottom) + 96px));
      scroll-padding-bottom: max(96px, var(--mobile-dock-space, 132px));
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
      gap: 6px;
      margin: 0 -2px;
      padding: 6px 0 max(8px, env(safe-area-inset-bottom));
      position: sticky;
      z-index: 24;
    }

    .next-action-chip {
      min-height: 44px;
      padding: 0 12px;
    }

    .dock-form {
      border-radius: 18px;
      box-shadow: 0 18px 50px color-mix(in srgb, var(--coach-bg) 78%, transparent);
      gap: 6px;
      padding: 8px;
    }

    .dock-textarea {
      font-size: 16px;
      max-height: 112px;
      min-height: 48px;
      padding: 12px;
    }

    .dock-composer-row {
      gap: 6px;
    }

    .dock-more,
    .dock-mic,
    .dock-send {
      height: 48px;
      min-height: 48px;
      min-width: 48px;
      width: 48px;
    }

    .dock-more-menu {
      bottom: calc(100% + 8px);
      left: 0;
      min-width: min(244px, calc(100vw - 24px));
      right: auto;
    }
  }

  @media (max-width: 380px) {
    .bridge-shell .transcript-empty {
      margin: 0 auto;
      padding: 12px 8px 16px;
      width: 100%;
    }

    .bridge-shell .transcript-empty-actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      width: 100%;
    }

    .bridge-shell .transcript-empty-actions button {
      min-width: 0;
      padding: 6px;
    }

    .dock-trust {
      display: none;
    }
  }
  /* The matrix phone tier owns usable floor-mode geometry. Measured on the
     live route: dashboard chrome above the shell is ~130px, so a 132px
     reserve fits the shell inside 100dvh (sticky cannot rescue an oversized
     shell here — overflow-x:hidden ancestors change the sticky scrollport). */
  ${media.phone} {
    .bridge-shell {
      gap: 6px;
    }

    .bridge-shell.is-chat-tab {
      height: max(420px, calc(100dvh - 132px - env(safe-area-inset-bottom) - var(--coach-kb-inset, 0px)));
    }
  }

  /* Short phones (SE class 667px tall, P10/P12 buckets, landscape): let the
     transcript own the remaining height instead of a fixed floor. */
  ${media.shortViewport(700)} and (max-width: ${PHONE_MAX_WIDTH}px) and (pointer: coarse) {
    .bridge-shell.is-chat-tab {
      height: calc(100dvh - 104px - env(safe-area-inset-bottom) - var(--coach-kb-inset, 0px));
      min-height: 300px;
    }
  }
`;
