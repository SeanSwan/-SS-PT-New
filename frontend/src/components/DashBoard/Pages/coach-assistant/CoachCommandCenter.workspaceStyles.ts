/**
 * FILE: CoachCommandCenter.workspaceStyles.ts
 * PURPOSE: Shared css fragment for the admin Swan Coach Command Center shell.
 */

import { css } from 'styled-components';

export const coachCommandWorkspaceStyles = css`
  .command-banner {
    border-radius: 22px;
    min-height: 228px;
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
    grid-template-columns: minmax(0, 1fr) minmax(260px, 36%);
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

  .banner-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 18px;
  }

  .banner-orbit {
    align-items: center;
    border: 1px solid var(--coach-line);
    border-radius: 18px;
    display: grid;
    min-height: 188px;
    overflow: hidden;
    padding: 18px;
    place-items: center;
    position: relative;
  }

  .orbit-core {
    aspect-ratio: 1;
    border: 1px solid var(--coach-line-strong);
    border-radius: 50%;
    box-shadow: 0 0 55px color-mix(in srgb, var(--coach-cyan) 24%, transparent);
    width: min(128px, 46%);
  }

  .orbit-readout {
    bottom: 18px;
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    left: 18px;
    line-height: 1.7;
    position: absolute;
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
    background: rgba(255, 255, 255, 0.08);
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

  .workflow-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .workflow-card {
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    color: var(--coach-text);
    display: grid;
    gap: 10px;
    min-height: 148px;
    min-width: 0;
    padding: 14px;
    text-align: left;
  }

  .workflow-card strong {
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px;
  }

  .workflow-card span:last-child {
    color: var(--coach-muted);
    font-size: 12px;
    line-height: 1.45;
  }

`;
