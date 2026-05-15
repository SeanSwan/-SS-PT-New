/**
 * FILE: CoachCommandCenter.styles.ts
 * PURPOSE: Styled-components shell for the admin Swan Coach Command Center.
 */

import styled from 'styled-components';

export const CommandCenterShell = styled.div`
  --coach-bg: var(--bg-base, #030712);
  --coach-bg-2: var(--surface-base, #07101f);
  --coach-surface: var(--surface-card, rgba(14, 24, 42, 0.84));
  --coach-surface-strong: var(--surface-elevated, rgba(20, 32, 56, 0.94));
  --coach-soft: var(--surface-soft, rgba(255, 255, 255, 0.06));
  --coach-line: var(--border-subtle, rgba(188, 220, 255, 0.18));
  --coach-line-strong: var(--border-active, rgba(96, 192, 240, 0.38));
  --coach-text: var(--text-primary, #e0ecf4);
  --coach-text-soft: var(--text-secondary, #dbe8f7);
  --coach-muted: var(--text-muted, #9eb0c7);
  --coach-cyan: var(--accent-primary, #60c0f0);
  --coach-purple: var(--accent-secondary, #8b5cf6);
  --coach-gold: var(--accent-gold, #c6a84b);
  --coach-success: var(--success, #47e89a);
  --coach-danger: var(--error, #ff6d85);
  --coach-warn: var(--warning, #ffb86b);
  --mobile-dock-space: 232px;
  color: var(--coach-text);
  font-family: 'Sora', 'Plus Jakarta Sans', system-ui, sans-serif;
  max-width: 100%;
  overflow-x: hidden;

  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
  }

  button,
  input,
  select,
  textarea,
  .file-control {
    min-height: 44px;
  }

  button {
    border: 0;
    cursor: pointer;
  }

  button:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--coach-cyan);
    outline-offset: 3px;
  }

  .app-shell {
    display: grid;
    gap: 16px;
    grid-template-columns: 292px minmax(0, 1fr) 320px;
    min-height: calc(100dvh - 48px);
    width: 100%;
  }

  .glass {
    background: linear-gradient(180deg, rgba(18, 26, 45, 0.84), rgba(10, 16, 31, 0.74));
    border: 1px solid var(--coach-line);
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.44);
    backdrop-filter: blur(22px) saturate(1.25);
  }

  .left-rail,
  .right-rail {
    border-radius: 22px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-height: calc(100dvh - 48px);
    min-width: 0;
    overflow: auto;
    padding: 16px;
    position: sticky;
    top: 0;
  }

  .main-stage {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
  }

  .mobile-topbar,
  .mobile-command-strip,
  .mobile-label,
  .drawer-scrim {
    display: none;
  }

  .route-chip,
  .mini-chip,
  .status-pill {
    align-items: center;
    border: 1px solid var(--coach-line);
    border-radius: 999px;
    display: inline-flex;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    gap: 8px;
    justify-content: center;
    line-height: 1;
    max-width: 100%;
    min-height: 28px;
    min-width: 0;
    overflow: hidden;
    padding: 7px 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .route-chip {
    background: var(--coach-soft);
    color: var(--coach-muted);
    justify-self: start;
  }

  .mini-chip.cyan,
  .status-pill.processing {
    background: color-mix(in srgb, var(--coach-cyan) 14%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan) 34%, transparent);
    color: #c9f5ff;
  }

  .mini-chip.purple,
  .status-pill.stale {
    background: color-mix(in srgb, var(--coach-purple) 16%, transparent);
    border-color: color-mix(in srgb, var(--coach-purple) 34%, transparent);
    color: #e3d8ff;
  }

  .mini-chip.gold,
  .status-pill.hold {
    background: color-mix(in srgb, var(--coach-gold) 16%, transparent);
    border-color: color-mix(in srgb, var(--coach-gold) 36%, transparent);
    color: #ffe7ad;
  }

  .mini-chip.green,
  .status-pill.ready {
    background: color-mix(in srgb, var(--coach-success) 14%, transparent);
    border-color: color-mix(in srgb, var(--coach-success) 34%, transparent);
    color: #cbffe3;
  }

  .mini-chip.red,
  .status-pill.failed {
    background: color-mix(in srgb, var(--coach-danger) 14%, transparent);
    border-color: color-mix(in srgb, var(--coach-danger) 34%, transparent);
    color: #ffd6de;
  }

  .primary-button,
  .secondary-button,
  .ghost-button,
  .rail-toggle {
    align-items: center;
    border-radius: 13px;
    color: var(--coach-text);
    display: inline-flex;
    font-weight: 760;
    gap: 8px;
    justify-content: center;
    line-height: 1;
    min-width: 0;
    padding: 0 14px;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
  }

  .primary-button {
    background: linear-gradient(135deg, var(--coach-cyan), #73f2ff 48%, var(--coach-purple));
    box-shadow: 0 16px 34px color-mix(in srgb, var(--coach-cyan) 16%, transparent);
    color: #06101d;
  }

  .secondary-button,
  .rail-toggle {
    background: var(--coach-soft);
    border: 1px solid var(--coach-line);
  }

  .ghost-button {
    background: transparent;
    border: 1px solid var(--coach-line);
    color: var(--coach-text-soft);
  }

  .is-listening {
    background: color-mix(in srgb, var(--coach-danger) 15%, transparent);
    border-color: color-mix(in srgb, var(--coach-danger) 38%, transparent);
  }

  .primary-button:hover,
  .secondary-button:hover,
  .ghost-button:hover,
  .rail-toggle:hover,
  .workflow-card:hover {
    transform: translateY(-1px);
  }

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

  .log-stream {
    display: grid;
    gap: 10px;
    max-height: 506px;
    overflow: auto;
    padding-right: 4px;
  }

  .log-entry {
    border: 1px solid var(--coach-line);
    border-radius: 15px;
    display: grid;
    gap: 9px;
    padding: 12px;
  }

  .log-entry.operator {
    background: color-mix(in srgb, var(--coach-purple) 11%, transparent);
  }

  .log-entry.coach {
    background: color-mix(in srgb, var(--coach-cyan) 9%, transparent);
  }

  .log-meta {
    color: var(--coach-muted);
    display: flex;
    flex-wrap: wrap;
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    gap: 8px;
    justify-content: space-between;
  }

  .attachment {
    border: 1px solid var(--coach-line);
    border-radius: 999px;
    color: var(--coach-text-soft);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    padding: 6px 9px;
  }

  .quick-client-form {
    display: grid;
    gap: 10px;
  }

  .quick-client-field {
    color: var(--coach-text-soft);
    display: grid;
    font-size: 12px;
    font-weight: 720;
    gap: 6px;
    min-width: 0;
  }

  .quick-client-note {
    border: 1px solid var(--coach-line);
    border-radius: 12px;
    font-size: 12px;
    line-height: 1.45;
    margin: 0;
    padding: 9px;
  }

  .quick-client-note.success {
    background: color-mix(in srgb, var(--coach-success) 10%, transparent);
    border-color: color-mix(in srgb, var(--coach-success) 30%, transparent);
    color: #d7ffe9;
  }

  .quick-client-note.error {
    background: color-mix(in srgb, var(--coach-danger) 10%, transparent);
    border-color: color-mix(in srgb, var(--coach-danger) 32%, transparent);
    color: #ffd9e0;
  }

  .composer {
    border: 1px solid var(--coach-line);
    border-radius: 18px;
    display: grid;
    gap: 10px;
    padding: 12px;
  }

  .composer-header {
    align-items: center;
    border: 1px solid var(--coach-line);
    border-radius: 15px;
    display: flex;
    gap: 12px;
    justify-content: space-between;
    min-width: 0;
    padding: 10px;
  }

  .composer-heading {
    display: grid;
    gap: 5px;
    min-width: 0;
  }

  .composer-heading strong {
    color: var(--coach-text);
    font-size: 15px;
    font-weight: 820;
    line-height: 1.25;
  }

  .composer-heading span:last-child {
    color: var(--coach-muted);
    font-size: 12px;
    line-height: 1.35;
  }

  .plaud-start-button {
    box-shadow:
      0 14px 34px color-mix(in srgb, var(--coach-purple) 20%, transparent),
      0 0 0 1px color-mix(in srgb, var(--coach-gold) 26%, transparent) inset;
    flex: 0 0 auto;
    white-space: nowrap;
  }

  .command-dock {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-cyan) 9%, transparent), transparent 34%),
      linear-gradient(180deg, rgba(10, 16, 31, 0.9), rgba(5, 9, 20, 0.84));
    border-color: var(--coach-line-strong);
    box-shadow: 0 18px 52px rgba(0, 0, 0, 0.34);
    order: -1;
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .file-control {
    position: relative;
  }

  .file-control input {
    height: 1px;
    opacity: 0;
    position: absolute;
    width: 1px;
  }

  .switch {
    background: var(--coach-soft);
    border: 1px solid var(--coach-line);
    border-radius: 999px;
    padding: 4px;
    width: 54px;
  }

  .switch span {
    background: var(--coach-muted);
    border-radius: 50%;
    display: block;
    height: 22px;
    transform: translateX(0);
    transition: transform 160ms ease, background 160ms ease;
    width: 22px;
  }

  .switch.is-on span {
    background: var(--coach-cyan);
    transform: translateX(22px);
  }

  @media (max-width: 1320px) {
    .app-shell {
      grid-template-columns: 260px minmax(0, 1fr) 286px;
    }

    .queue-summary,
    .workflow-grid,
    .dossier-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 1040px) {
    .app-shell {
      grid-template-columns: 232px minmax(0, 1fr);
    }

    .right-rail {
      display: none;
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
      background: rgba(1, 5, 12, 0.58);
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
    .workflow-grid,
    .operations-grid,
    .two-col-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .banner-content,
    .banner-copy,
    .banner-top,
    .banner-actions,
    .card-top,
    .card-top > *,
    .mini-chip,
    .workflow-card,
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

    .banner-actions,
    .composer-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .command-dock {
      background: linear-gradient(180deg, rgba(10, 16, 31, 0.94), rgba(4, 8, 18, 0.98));
      border: 1px solid var(--coach-line-strong);
      border-radius: 20px;
      box-shadow: 0 18px 54px rgba(0, 0, 0, 0.42);
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
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
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
    .command-banner,
    .panel,
    .status-card,
    .workflow-card {
      border-radius: 18px;
    }

    .brand-title,
    .banner-copy :is(h1, h2) {
      font-size: clamp(20px, 8vw, 30px);
    }

    .command-dock {
      border-radius: 16px;
      padding-inline: 8px;
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
