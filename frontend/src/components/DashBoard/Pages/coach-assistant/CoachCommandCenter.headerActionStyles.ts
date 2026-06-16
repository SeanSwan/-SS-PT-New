/**
 * FILE: CoachCommandCenter.headerActionStyles.ts
 * PURPOSE: Header quick-action strip styling for the Coach Command Center.
 */
import { css } from 'styled-components';

export const coachCommandHeaderActionStyles = css`
  .client-action-strip {
    background: color-mix(in srgb, var(--coach-bg) 34%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 22%, var(--coach-line));
    border-radius: 16px;
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
    padding: 8px;
  }

  .client-action-scope {
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    grid-column: 1 / -1;
    letter-spacing: 0.08em;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .client-action-button {
    align-items: center;
    background: color-mix(in srgb, var(--coach-soft) 84%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 13px;
    color: var(--coach-text);
    display: inline-flex;
    gap: 8px;
    min-height: 52px;
    min-width: 0;
    padding: 8px 10px;
    text-align: left;
    text-decoration: none;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .client-action-button.is-primary {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-sapphire) 86%, transparent), color-mix(in srgb, var(--coach-purple) 38%, transparent)),
      var(--coach-sapphire);
    border-color: color-mix(in srgb, var(--coach-purple) 42%, transparent);
    box-shadow: 0 12px 28px color-mix(in srgb, var(--coach-purple) 18%, transparent);
  }

  .client-action-button:hover,
  .client-action-button:focus-visible {
    border-color: var(--coach-line-strong);
    box-shadow: 0 10px 26px color-mix(in srgb, var(--coach-cyan) 15%, transparent);
    outline: none;
    transform: translateY(-1px);
  }

  .client-action-button > span {
    display: grid;
    gap: 2px;
    min-width: 0;
  }

  .client-action-button strong,
  .client-action-button small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .client-action-button strong {
    color: var(--coach-text);
    font-size: 13px;
    font-weight: 820;
    line-height: 1.1;
  }

  .client-action-button small {
    color: var(--coach-muted);
    font-size: 11px;
    line-height: 1.15;
  }

  @media (max-width: 430px) {
    .client-action-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .client-action-button {
      padding-inline: 8px;
    }
  }
`;
