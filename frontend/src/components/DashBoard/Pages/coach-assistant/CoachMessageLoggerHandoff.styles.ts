import styled from 'styled-components';

export const CoachLoggerHandoffCard = styled.div`
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--coach-cyan, #60c0f0) 12%, transparent),
      color-mix(in srgb, var(--coach-surface-strong, #102044) 78%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 28%, transparent);
  border-radius: 14px;
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 12px;

  .handoff-head {
    align-items: center;
    display: grid;
    gap: 10px;
    grid-template-columns: 34px minmax(0, 1fr);
    min-width: 0;
  }

  .handoff-icon {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 18%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 34%, transparent);
    border-radius: 10px;
    color: var(--coach-text, #e0ecf4);
    display: inline-flex;
    height: 34px;
    justify-content: center;
    width: 34px;
  }

  strong {
    color: var(--coach-text, #e0ecf4);
    display: block;
    font-size: 0.9rem;
    line-height: 1.25;
  }

  span {
    color: var(--coach-muted, #91a3bd);
    font-size: 12px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .handoff-preview {
    display: grid;
    gap: 7px;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .handoff-preview li {
    align-items: center;
    background: color-mix(in srgb, var(--coach-bg, #030712) 44%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-line, #60c0f0) 18%, transparent);
    border-radius: 10px;
    display: grid;
    gap: 6px;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
    padding: 8px 10px;
  }

  .exercise-name {
    color: var(--coach-text-soft, #dbeafe);
    font-weight: 780;
  }

  .exercise-dose {
    color: var(--coach-text, #e0ecf4);
    font-family: 'Fira Code', monospace;
    justify-self: end;
    white-space: nowrap;
  }

  .handoff-actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    justify-content: flex-start;
    min-width: 0;
  }

  a {
    align-items: center;
    background: color-mix(in srgb, var(--coach-cyan, #60c0f0) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--coach-cyan, #60c0f0) 34%, transparent);
    border-radius: 12px;
    color: var(--coach-text, #e0ecf4);
    display: inline-flex;
    font-size: 13px;
    font-weight: 820;
    gap: 8px;
    min-height: 44px;
    padding: 0 14px;
    text-decoration: none;
  }

  .handoff-more,
  .handoff-error {
    font-family: 'Fira Code', monospace;
    font-size: 11px;
  }

  .handoff-error {
    color: var(--coach-warning, #f59e0b);
  }

  @media (max-width: 520px) {
    .handoff-preview li {
      align-items: start;
      grid-template-columns: minmax(0, 1fr);
    }

    .exercise-dose {
      justify-self: start;
      white-space: normal;
    }

    .handoff-actions,
    a {
      width: 100%;
    }

    a {
      justify-content: center;
    }
  }
`;
