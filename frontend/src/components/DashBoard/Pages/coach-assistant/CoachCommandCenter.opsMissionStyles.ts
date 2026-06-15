/**
 * FILE: CoachCommandCenter.opsMissionStyles.ts
 * PURPOSE: Mission-checklist styling for the Coach Ops drawer launchpad.
 */

import { css } from 'styled-components';

export const coachCommandOpsMissionStyles = css`
  .workout-command-next {
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-cyan) 16%, transparent), transparent 70%),
      color-mix(in srgb, var(--coach-bg) 72%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 32%, var(--coach-line));
    border-radius: 16px;
    display: grid;
    gap: 4px;
    min-height: 82px;
    padding: 13px 14px;
  }

  .workout-command-next.needs-target {
    border-color: color-mix(in srgb, var(--coach-gold) 42%, var(--coach-line));
  }

  .workout-command-next-kicker,
  .workout-command-step-state {
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .workout-command-next strong {
    color: var(--coach-text);
    font-size: 20px;
    line-height: 1.08;
  }

  .workout-command-next small,
  .workout-command-step small {
    color: var(--coach-muted);
    font-size: 12px;
    line-height: 1.34;
  }

  .workout-command-steps {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .workout-command-step {
    background: color-mix(in srgb, var(--coach-soft) 78%, transparent);
    border: 1px solid var(--coach-line);
    border-radius: 14px;
    display: flex;
    gap: 9px;
    min-width: 0;
    padding: 10px;
  }

  .workout-command-step.is-ready {
    border-color: color-mix(in srgb, var(--coach-cyan) 24%, var(--coach-line));
  }

  .workout-command-step.needs-action {
    border-color: color-mix(in srgb, var(--coach-gold) 38%, var(--coach-line));
  }

  .workout-command-step-index {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 24%, transparent);
    border-radius: 999px;
    color: var(--coach-cyan);
    display: inline-flex;
    flex: 0 0 auto;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    height: 28px;
    justify-content: center;
    width: 28px;
  }

  .workout-command-step strong {
    color: var(--coach-text);
    display: block;
    font-size: 13px;
    line-height: 1.18;
    overflow-wrap: anywhere;
  }

  @media (max-width: 520px) {
    .workout-command-steps {
      grid-template-columns: 1fr;
    }
  }
`;
