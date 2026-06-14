/**
 * FILE: CoachCommandCenter.opsStyles.ts
 * PURPOSE: Drawer-specific command styling for the admin Swan Coach operations rail.
 *
 * Keeps the slide-in Ops drawer useful on phone and desktop without expanding the
 * main bridge/dock style fragments past the 300-line cap. Actions are route-safe:
 * navigation cards require an active client route; prompt and PLAUD actions do not
 * perform workout writes.
 */

import { css } from 'styled-components';

export const coachCommandOpsStyles = css`
  .workout-command-panel {
    background:
      linear-gradient(145deg, color-mix(in srgb, var(--coach-sapphire) 28%, transparent), transparent 60%),
      var(--coach-card);
    border-color: color-mix(in srgb, var(--coach-cyan) 34%, var(--coach-line));
  }

  .workout-command-scope {
    background: color-mix(in srgb, var(--coach-surface) 82%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    display: grid;
    gap: 3px;
    min-height: 56px;
    padding: 10px 12px;
  }

  .workout-command-scope.is-ready {
    border-color: color-mix(in srgb, var(--coach-cyan) 38%, var(--coach-line));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--coach-cyan) 12%, transparent);
  }

  .workout-command-scope-kicker {
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .workout-command-scope strong {
    color: var(--coach-text);
    font-size: 14px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }

  .workout-command-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .workout-command-card {
    align-items: center;
    background: color-mix(in srgb, var(--coach-soft) 86%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    color: var(--coach-text);
    display: flex;
    gap: 10px;
    min-height: 66px;
    padding: 10px;
    text-align: left;
    text-decoration: none;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .workout-command-card:hover,
  .workout-command-card:focus-visible {
    border-color: var(--coach-line-strong);
    box-shadow: 0 12px 30px color-mix(in srgb, var(--coach-cyan) 16%, transparent);
    outline: none;
    transform: translateY(-1px);
  }

  .workout-command-card.full {
    grid-column: 1 / -1;
  }

  .workout-command-card.is-disabled {
    color: var(--coach-muted);
    cursor: not-allowed;
    opacity: 0.68;
  }

  .workout-command-card.is-disabled:hover,
  .workout-command-card.is-disabled:focus-visible {
    border-color: var(--coach-line);
    box-shadow: none;
    transform: none;
  }

  .workout-command-icon {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 22%, transparent);
    border-radius: 12px;
    color: var(--coach-cyan);
    display: inline-flex;
    flex: 0 0 auto;
    height: 38px;
    justify-content: center;
    width: 38px;
  }

  .workout-command-card strong,
  .workout-command-card small {
    display: block;
    line-height: 1.18;
  }

  .workout-command-card strong {
    font-size: 14px;
    font-weight: 820;
  }

  .workout-command-card small {
    color: var(--coach-muted);
    font-size: 11px;
    margin-top: 3px;
  }

  @media (max-width: 420px) {
    .workout-command-grid {
      grid-template-columns: 1fr;
    }

    .workout-command-card.full {
      grid-column: auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .workout-command-card {
      transition: none;
    }

    .workout-command-card:hover,
    .workout-command-card:focus-visible {
      transform: none;
    }
  }
`;
