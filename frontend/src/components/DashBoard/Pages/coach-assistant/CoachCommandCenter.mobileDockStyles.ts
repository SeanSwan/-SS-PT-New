/**
 * FILE: CoachCommandCenter.mobileDockStyles.ts
 * PURPOSE: Mobile command dock CSS for the admin Swan Coach Command Center.
 */

import { css } from 'styled-components';

export const coachCommandMobileDockStyles = css`
  @media (max-width: 860px) {
    .command-dock {
      background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--coach-bg-2) 94%, transparent),
        color-mix(in srgb, var(--coach-bg) 98%, transparent)
      );
      border: 1px solid var(--coach-line-strong);
      border-radius: 20px;
      box-shadow: 0 18px 54px color-mix(in srgb, var(--coach-bg) 72%, transparent);
      display: grid;
      gap: 8px;
      margin-bottom: 12px;
      padding: 10px;
      position: sticky;
      top: 0;
      z-index: 60;
    }

    .mobile-command-strip {
      display: grid;
      gap: 7px;
      grid-template-columns: 72px minmax(0, 1fr) 58px;
    }

    .mobile-command-strip button,
    .mobile-command-client {
      align-items: center;
      background: var(--coach-soft);
      border: 1px solid var(--coach-line);
      border-radius: 12px;
      color: var(--coach-text);
      display: flex;
      justify-content: center;
      min-width: 0;
      padding: 0 9px;
    }

    .mobile-command-client {
      color: var(--coach-text-soft);
      font-family: 'Fira Code', monospace;
      font-size: 10px;
      justify-content: flex-start;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .command-dock textarea {
      max-height: 72px;
      min-height: 44px;
      resize: none;
    }

    .composer-header {
      align-items: stretch;
      display: grid;
      gap: 8px;
    }

    .plaud-start-button {
      width: 100%;
    }

    .command-dock .composer-actions {
      gap: 6px;
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .command-dock .composer-actions button,
    .command-dock .file-control {
      min-width: 0;
      padding-inline: 6px;
    }

    .desktop-label {
      display: none;
    }

    .mobile-label {
      display: inline;
    }

    #composerStatus {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (max-width: 430px) {
    .command-dock {
      border-radius: 16px;
      padding-inline: 8px;
    }
  }
`;
