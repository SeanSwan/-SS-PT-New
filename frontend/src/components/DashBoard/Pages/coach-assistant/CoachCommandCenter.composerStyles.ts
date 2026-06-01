/**
 * FILE: CoachCommandCenter.composerStyles.ts
 * PURPOSE: Shared css fragment for the admin Swan Coach Command Center shell.
 */

import { css } from 'styled-components';

export const coachCommandComposerStyles = css`
  .log-stream {
    display: grid;
    gap: 10px;
    max-height: 506px;
    overflow: auto;
    padding-right: 4px;
  }

  .command-log-primary {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-cyan) 7%, transparent), transparent 42%),
      color-mix(in srgb, var(--coach-surface) 92%, transparent);
    border-color: var(--coach-line-strong);
  }

  .command-log-primary .log-stream {
    max-height: min(54vh, 620px);
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

  .workflow-return-link {
    justify-self: start;
    min-height: 44px;
    text-decoration: none;
  }

  .workflow-return-link:focus-visible {
    outline: 2px solid var(--coach-cyan);
    outline-offset: 3px;
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

`;
