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
  .workout-command-brief-item small {
    color: var(--coach-muted);
    font-family: 'Fira Code', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .workout-command-next strong,
  .workout-command-brief-item strong {
    color: var(--coach-text);
    display: block;
    overflow-wrap: anywhere;
  }

  .workout-command-next strong {
    font-size: 20px;
    line-height: 1.08;
  }

  .workout-command-next small,
  .workout-command-brief-item span {
    color: var(--coach-muted);
    font-size: 12px;
    line-height: 1.34;
  }

  .workout-command-brief {
    align-items: stretch;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--coach-sapphire) 22%, transparent), transparent 74%),
      color-mix(in srgb, var(--coach-soft) 78%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan) 28%, var(--coach-line));
    border-radius: 16px;
    display: grid;
    gap: 10px;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    padding: 12px;
  }

  .workout-command-brief.needs-target {
    border-color: color-mix(in srgb, var(--coach-gold) 38%, var(--coach-line));
  }

  .workout-command-brief-item {
    display: grid;
    gap: 4px;
    min-width: 0;
  }

  .workout-command-brief-item strong {
    font-size: 13px;
    line-height: 1.18;
  }

  .workout-command-brief-item.safety strong {
    color: var(--coach-cyan);
  }

  .workout-command-brief-divider {
    background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--coach-cyan) 36%, transparent), transparent);
    width: 1px;
  }

  @media (max-width: 520px) {
    .workout-command-brief {
      grid-template-columns: 1fr;
    }

    .workout-command-brief-divider {
      background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--coach-cyan) 30%, transparent), transparent);
      height: 1px;
      width: 100%;
    }
  }
`;
