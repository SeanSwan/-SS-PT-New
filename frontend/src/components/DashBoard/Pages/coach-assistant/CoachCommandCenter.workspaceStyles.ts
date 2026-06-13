/**
 * FILE: CoachCommandCenter.workspaceStyles.ts
 * PURPOSE: Shared css fragment for the admin Swan Coach Command Center shell.
 */

import { css } from 'styled-components';

export const coachCommandWorkspaceStyles = css`
  .command-banner {
    border-radius: 22px;
    overflow: hidden;
    padding: 22px;
    position: relative;
  }

  .command-banner::after {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-cyan) 16%, transparent), transparent 30%),
      linear-gradient(315deg, color-mix(in srgb, var(--coach-gold) 12%, transparent), transparent 36%);
    content: '';
    inset: 0;
    pointer-events: none;
    position: absolute;
  }

  .banner-content {
    display: grid;
    gap: 18px;
    grid-template-columns: minmax(0, 1fr) minmax(280px, 34%);
    position: relative;
    z-index: 1;
  }

  .banner-copy h1 {
    font-size: clamp(32px, 4vw, 50px);
    font-weight: 850;
    line-height: 1.04;
    margin: 11px 0 12px;
  }

  .banner-copy p {
    color: var(--coach-text-soft);
    font-size: 16px;
    line-height: 1.55;
    max-width: 780px;
  }

  .utility-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }

  .next-workflow-panel {
    align-self: stretch;
    background: color-mix(in srgb, var(--coach-surface-strong) 86%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 18px;
    display: grid;
    gap: 12px;
    justify-items: start;
    padding: 18px;
  }

  .next-workflow-panel strong {
    color: var(--coach-text);
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: clamp(18px, 1.9vw, 26px);
    line-height: 1.14;
  }

  .queue-summary {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .metric-card {
    border-top: 3px solid var(--accent-fill, var(--coach-cyan));
    display: grid;
    gap: 8px;
    padding: 16px;
  }

  .metric-value {
    font-size: 34px;
    line-height: 1;
  }

  .content-grid {
    display: grid;
    gap: 16px;
    grid-template-columns: minmax(0, 1.04fr) minmax(320px, 0.96fr);
  }

  .live-intake-grid {
    display: grid;
    gap: 16px;
    min-width: 0;
  }

  .live-workspace-panel,
  .plaud-review-panel,
  .plaud-merge-frame {
    min-width: 0;
    overflow: hidden;
  }

  .live-workspace-panel > *,
  .plaud-merge-frame > * {
    max-width: 100%;
  }

  .plaud-review-panel:focus-visible {
    outline: 2px solid var(--coach-cyan);
    outline-offset: 4px;
  }

  .dossier-card {
    display: grid;
    gap: 14px;
    padding: 14px;
  }

  .dossier-main {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .progress-track {
    background: color-mix(in srgb, var(--coach-text) 8%, transparent);
    border-radius: 999px;
    height: 8px;
    overflow: hidden;
  }

  .progress-fill {
    background: linear-gradient(90deg, var(--coach-cyan), var(--coach-purple));
    border-radius: inherit;
    height: 100%;
    width: var(--progress, 64%);
  }

`;
