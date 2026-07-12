/**
 * FILE: CoachCommandCenter.ownerControlsStyles.ts
 * PURPOSE: Owner account controls toggle and in-rail module framing.
 *
 * Keeps audited account controls out of the global admin dashboard shell and
 * behind an explicit admin-only toggle inside the Coach Command Center rail.
 */
import { css } from 'styled-components';

export const coachCommandOwnerControlsStyles = css`
  .account-controls-toggle {
    align-items: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--coach-purple) 14%, transparent), transparent 62%), color-mix(in srgb, var(--coach-soft) 92%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-purple) 30%, var(--coach-line));
    border-radius: 14px;
    color: var(--coach-text);
    cursor: pointer;
    display: flex;
    gap: 10px;
    min-height: 58px;
    min-width: 0;
    padding: 9px 10px;
    text-align: left;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    width: 100%;
  }

  .account-controls-toggle.is-on {
    background: linear-gradient(135deg, color-mix(in srgb, var(--coach-purple) 26%, transparent), color-mix(in srgb, var(--coach-cyan) 12%, var(--coach-soft)));
    border-color: color-mix(in srgb, var(--coach-cyan) 42%, var(--coach-line-strong));
    box-shadow: 0 16px 34px color-mix(in srgb, var(--coach-purple) 22%, transparent);
  }

  .account-controls-toggle:hover,
  .account-controls-toggle:focus-visible {
    border-color: var(--coach-line-strong);
    box-shadow: 0 12px 30px color-mix(in srgb, var(--coach-cyan) 14%, transparent);
    outline: none;
    transform: translateY(-1px);
  }

  .account-controls-toggle strong,
  .account-controls-toggle small {
    display: block;
    line-height: 1.18;
    overflow-wrap: anywhere;
  }

  .account-controls-toggle strong {
    font-size: 13px;
    font-weight: 820;
  }

  .account-controls-toggle small {
    color: var(--coach-muted);
    font-size: 13px;
    margin-top: 3px;
  }

  .owner-account-controls-panel {
    display: grid;
    min-width: 0;
  }

  .owner-account-controls-panel:empty {
    display: none;
  }

  .owner-account-controls-panel [data-owner-account-controls="true"] {
    border-color: color-mix(in srgb, var(--coach-cyan) 34%, var(--coach-line));
    box-shadow: 0 18px 42px color-mix(in srgb, var(--coach-bg) 36%, transparent);
  }

  @container (max-width: 420px) {
    .account-controls-toggle {
      align-items: flex-start;
      min-height: 64px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .account-controls-toggle {
      transition: none;
    }

    .account-controls-toggle:hover,
    .account-controls-toggle:focus-visible {
      transform: none;
    }
  }
`;