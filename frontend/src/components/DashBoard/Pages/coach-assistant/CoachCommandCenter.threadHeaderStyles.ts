import { css } from 'styled-components';

export const coachCommandThreadHeaderStyles = css`
  .active-thread-header {
    align-items: center;
    background: color-mix(in srgb, var(--coach-surface-strong, #003080) 72%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 22%, var(--coach-line, #273449));
    border-radius: 999px;
    color: var(--coach-text, #e0ecf4);
    display: flex;
    gap: 8px;
    min-height: 44px;
    min-width: 0;
    padding: 8px 12px;
  }

  .active-thread-header strong,
  .active-thread-header span,
  .active-thread-header small {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .active-thread-header strong {
    font-size: 13px;
    font-weight: 820;
    max-width: 34ch;
  }

  .active-thread-header span,
  .active-thread-header small {
    color: var(--coach-muted, #b8c7d9);
    font-size: 12px;
    font-weight: 720;
  }

  .active-thread-header small {
    align-items: center;
    display: inline-flex;
    gap: 4px;
  }

  .active-thread-header.is-empty {
    opacity: 0.88;
  }

  @media (max-width: 700px) {
    .active-thread-header {
      border-radius: 14px;
      flex-wrap: wrap;
    }

    .active-thread-header strong {
      flex-basis: calc(100% - 28px);
      max-width: none;
    }
  }
`;
