/**
 * FILE: CoachCommandCenter.notebookStyles.ts
 * PURPOSE: Main-client selector and profile-note mode styles for Floor Mode.
 */
import { css } from 'styled-components';

export const coachCommandNotebookStyles = css`
  .main-client-picker {
    align-items: center;
    display: grid;
    gap: 6px;
    margin-top: 8px;
    max-width: 320px;
  }

  .main-client-picker > span {
    color: var(--coach-muted, #9aa9ba);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    font-weight: 760;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }

  .main-client-picker select {
    appearance: none;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-cyan) 8%, transparent), transparent),
      var(--coach-soft, #141419);
    border: 1px solid var(--coach-line-strong, rgba(96, 192, 240, 0.34));
    border-radius: 12px;
    color: var(--coach-text, #e0ecf4);
    cursor: pointer;
    font-size: 14px;
    font-weight: 760;
    min-height: 44px;
    padding: 0 38px 0 12px;
    width: 100%;
  }

  .main-client-picker select:disabled,
  .dock-more-menu button:disabled {
    cursor: not-allowed;
    opacity: 0.52;
  }

  .dock-form.is-notebook {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-gold) 10%, transparent), transparent 54%),
      color-mix(in srgb, var(--coach-surface-strong) 90%, transparent);
    border-color: color-mix(in srgb, var(--coach-gold) 44%, var(--coach-line-strong));
  }

  .dock-form.is-notebook .dock-trust-pill {
    background: color-mix(in srgb, var(--coach-gold) 18%, transparent);
    border-color: color-mix(in srgb, var(--coach-gold) 44%, transparent);
  }

  @media (max-width: 720px) {
    .main-client-picker {
      max-width: min(100%, 260px);
    }

    .main-client-picker select {
      font-size: 16px;
    }
  }

  @media (max-width: 380px) {
    .main-client-picker {
      max-width: 100%;
    }
  }
`;
