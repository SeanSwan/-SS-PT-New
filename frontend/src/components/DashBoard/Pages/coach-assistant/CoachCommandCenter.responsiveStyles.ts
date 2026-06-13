/**
 * FILE: CoachCommandCenter.responsiveStyles.ts
 * PURPOSE: Shared css fragment for the admin Swan Coach Command Center shell.
 */

import { css } from 'styled-components';

export const coachCommandResponsiveStyles = css`
  @media (max-width: 1540px) {
    .app-shell {
      grid-template-columns: 232px minmax(0, 1fr);
    }

    .right-rail {
      display: none;
    }
  }

  @media (max-width: 1320px) {
    .app-shell {
      grid-template-columns: 232px minmax(0, 1fr);
    }

    .queue-summary,
    .dossier-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 861px) {
    .drawer-scrim,
    .mobile-topbar,
    .mobile-command-strip,
    .mobile-label {
      display: none;
    }
  }

  @media (max-width: 860px) {
    min-height: 100dvh;
    padding-bottom: env(safe-area-inset-bottom);

    .app-shell {
      display: block;
      min-height: auto;
    }

    .main-stage {
      min-width: 0;
      width: 100%;
    }

    .mobile-topbar {
      align-items: center;
      display: flex;
      gap: 10px;
      justify-content: space-between;
      margin-bottom: 12px;
      min-width: 0;
    }

    .mobile-topbar-title {
      min-width: 0;
    }

    .mobile-topbar-title h1 {
      font-size: clamp(21px, 7vw, 30px);
      line-height: 1.05;
      margin: 0;
      overflow-wrap: anywhere;
    }

    .mobile-topbar-title p {
      color: var(--coach-muted);
      margin: 3px 0 0;
    }

    .mobile-drawer-button {
      align-items: center;
      background: var(--coach-surface-strong);
      border: 1px solid var(--coach-line);
      border-radius: 14px;
      color: var(--coach-text);
      display: inline-flex;
      flex: 0 0 auto;
      justify-content: center;
      min-width: 44px;
      padding: 0 12px;
    }

    .drawer-scrim {
      background: color-mix(in srgb, var(--coach-bg) 58%, transparent);
      display: block;
      inset: 0;
      opacity: 0;
      pointer-events: none;
      position: fixed;
      transition: opacity 180ms ease;
      z-index: 80;
    }

    .drawer-scrim.is-open {
      opacity: 1;
      pointer-events: auto;
    }

    .left-rail,
    .right-rail {
      display: grid;
      inset: 12px auto 12px 12px;
      max-width: min(336px, calc(100vw - 24px));
      opacity: 0;
      overflow-y: auto;
      pointer-events: none;
      position: fixed;
      transform: translateX(-18px);
      transition: opacity 180ms ease, transform 180ms ease;
      width: calc(100vw - 24px);
      z-index: 90;
    }

    .right-rail {
      inset-inline: auto 12px;
      transform: translateX(18px);
    }

    .left-rail.is-open,
    .right-rail.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateX(0);
    }

    .command-banner,
    .queue-summary,
    .content-grid,
    .live-intake-grid,
    .dossier-grid,
    .operations-grid,
    .two-col-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .banner-content,
    .banner-copy,
    .banner-top,
    .utility-actions,
    .card-top,
    .card-top > *,
    .mini-chip,
    .live-workspace-panel,
    .plaud-review-panel,
    .plaud-merge-frame,
    .status-card {
      max-width: 100%;
      min-width: 0;
      width: 100%;
    }

    .banner-top,
    .card-top {
      align-items: flex-start;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      justify-items: start;
    }

    .banner-top .mini-chip,
    .card-top .mini-chip {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .utility-actions,
    .composer-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 430px) {
    .command-banner,
    .panel,
    .status-card {
      border-radius: 18px;
    }

    .brand-title,
    .banner-copy :is(h1, h2) {
      font-size: clamp(20px, 8vw, 30px);
    }

  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
