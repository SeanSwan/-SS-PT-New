/**
 * FILE: CoachCommandCenter.shellStyles.ts
 * PURPOSE: Shared css fragment for the admin Swan Coach Command Center shell.
 */

import { css } from 'styled-components';

export const coachCommandShellStyles = css`
  --coach-bg: var(--bg-base, #030712);
  --coach-bg-2: var(--bg-secondary, #07101f);
  --coach-surface: var(--bg-surface, rgba(14, 24, 42, 0.84));
  --coach-surface-strong: var(--bg-elevated, rgba(20, 32, 56, 0.94));
  --coach-soft: var(--surface-soft, rgba(255, 255, 255, 0.06));
  --coach-line: var(--border-subtle, rgba(188, 220, 255, 0.18));
  --coach-line-strong: var(--border-strong, rgba(96, 192, 240, 0.38));
  --coach-text: var(--text-primary, #e0ecf4);
  --coach-text-soft: var(--text-secondary, #dbe8f7);
  --coach-muted: color-mix(
    in srgb,
    var(--text-muted, #9eb0c7) 42%,
    var(--text-secondary, #dbe8f7) 58%
  );
  --coach-sapphire: var(--brand-primary, var(--accent-secondary, #4070c0));
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
  textarea:focus-visible,
  .tab-scroll:focus-visible {
    outline: 2px solid var(--coach-cyan);
    outline-offset: 3px;
  }

  .glass {
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--coach-surface-strong) 84%, transparent),
      color-mix(in srgb, var(--coach-bg-2) 74%, transparent)
    );
    border: 1px solid var(--coach-line);
    box-shadow: 0 24px 70px color-mix(in srgb, var(--coach-bg) 76%, transparent);
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
    font-size: 13px;
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
    background: var(--surface-soft, rgba(255, 255, 255, 0.12));
    border-color: var(--border-strong, rgba(96, 192, 240, 0.38));
    color: var(--coach-text-soft);
    justify-self: start;
  }

  .mini-chip.cyan,
  .status-pill.processing {
    background: color-mix(in srgb, var(--coach-cyan) 14%, transparent);
    border-color: color-mix(in srgb, var(--coach-cyan) 34%, transparent);
    color: color-mix(in srgb, var(--coach-cyan) 78%, var(--coach-text));
  }

  .mini-chip.purple,
  .status-pill.stale {
    background: color-mix(in srgb, var(--coach-purple) 16%, transparent);
    border-color: color-mix(in srgb, var(--coach-purple) 34%, transparent);
    color: color-mix(in srgb, var(--coach-purple) 34%, var(--coach-text));
  }

  .mini-chip.gold,
  .status-pill.hold {
    background: color-mix(in srgb, var(--coach-gold) 16%, transparent);
    border-color: color-mix(in srgb, var(--coach-gold) 36%, transparent);
    color: color-mix(in srgb, var(--coach-gold) 68%, var(--coach-text));
  }

  .mini-chip.green,
  .status-pill.ready {
    background: color-mix(in srgb, var(--coach-success) 14%, transparent);
    border-color: color-mix(in srgb, var(--coach-success) 34%, transparent);
    color: color-mix(in srgb, var(--coach-success) 68%, var(--coach-text));
  }

  .mini-chip.red,
  .status-pill.failed {
    background: color-mix(in srgb, var(--coach-danger) 14%, transparent);
    border-color: color-mix(in srgb, var(--coach-danger) 34%, transparent);
    color: color-mix(in srgb, var(--coach-danger) 64%, var(--coach-text));
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
    background: linear-gradient(
      135deg,
      var(--coach-cyan),
      color-mix(in srgb, var(--coach-cyan) 76%, var(--coach-text)) 48%,
      var(--coach-purple)
    );
    box-shadow: 0 16px 34px color-mix(in srgb, var(--coach-cyan) 16%, transparent);
    color: var(--coach-bg);
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
  .rail-toggle:hover {
    transform: translateY(-1px);
  }

`;
