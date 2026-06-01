/**
 * FILE: CoachCommandCenter.foundationStyles.ts
 * PURPOSE: Shared css fragment for the admin Swan Coach Command Center shell.
 */

import { css } from 'styled-components';

export const coachCommandFoundationStyles = css`
  .brand-block,
  .rail-section,
  .panel,
  .log-card,
  .client-card,
  .metric-card,
  .dossier-card {
    border: 1px solid var(--coach-line);
    border-radius: 18px;
    background: color-mix(in srgb, var(--coach-surface) 92%, transparent);
  }

  .brand-block,
  .rail-section,
  .client-card,
  .panel,
  .log-card {
    display: grid;
    gap: 14px;
    padding: 14px;
  }

  h1,
  h2,
  h3,
  p {
    margin: 0;
  }

  h1,
  h2,
  h3,
  .panel-title,
  .brand-title {
    font-family: 'Plus Jakarta Sans', 'Sora', system-ui, sans-serif;
    letter-spacing: 0;
  }

  .brand-title {
    font-size: 26px;
    font-weight: 800;
    line-height: 1.06;
  }

  .brand-subtitle,
  .panel-subtitle,
  .item-copy,
  .metric-note,
  .thread-meta,
  .small-copy {
    color: var(--coach-muted);
    font-size: 13px;
    line-height: 1.45;
  }

  .new-thread,
  .search-wrap input,
  .client-picker select,
  .quick-client-submit {
    width: 100%;
  }

  .search-wrap {
    align-items: center;
    display: flex;
    gap: 8px;
    min-width: 0;
  }

  input,
  select,
  textarea {
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid var(--coach-line);
    border-radius: 12px;
    color: var(--coach-text);
    padding: 0 12px;
    width: 100%;
  }

  textarea {
    line-height: 1.4;
    min-height: 92px;
    padding: 12px;
    resize: vertical;
  }

  .thread-list,
  .mode-list,
  .state-list,
  .health-list,
  .draft-list,
  .source-list {
    display: grid;
    gap: 8px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .thread-item,
  .mode-item,
  .source-item,
  .state-item,
  .health-item,
  .draft-item,
  .dossier-tile {
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    color: var(--coach-text);
    min-width: 0;
    padding: 11px;
    text-align: left;
  }

  .thread-item {
    display: block;
    width: 100%;
  }

  .thread-item.is-active {
    background: color-mix(in srgb, var(--coach-cyan) 12%, transparent);
    border-color: var(--coach-line-strong);
  }

  .thread-title,
  .mode-title,
  .item-title,
  .source-title {
    color: var(--coach-text);
    font-weight: 760;
  }

  .client-name-row,
  .section-title-row,
  .log-top,
  .card-top,
  .banner-top,
  .item-row,
  .composer-actions,
  .composer-left,
  .status-row,
  .attachment-row {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: space-between;
    min-width: 0;
  }

  .client-name-row,
  .item-row {
    flex-wrap: nowrap;
  }

  .context-grid,
  .queue-summary,
  .dossier-main,
  .workflow-grid {
    display: grid;
    gap: 12px;
  }

  .context-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .context-item {
    border: 1px solid var(--coach-line);
    border-radius: 12px;
    display: grid;
    gap: 4px;
    padding: 10px;
  }

  .context-value,
  .metric-value,
  .tile-value {
    color: var(--coach-text);
    font-weight: 800;
  }

`;
