import styled from 'styled-components';

/** Scoped desk shell: keeps the current and review panes readable at desktop and mobile widths. */
export const DeskSection = styled.section`
  display: grid;
  gap: 1rem;
  color: ${({ theme }) => theme?.text?.primary || 'var(--text-primary, #ecf3f8)'};

  button {
    min-height: 44px;
    border: 1px solid ${({ theme }) => theme?.borders?.subtle || 'var(--border-subtle, #34516b)'};
    border-radius: 0.5rem;
    background: ${({ theme }) => theme?.colors?.surface || 'var(--bg-surface, #173248)'};
    color: inherit;
    padding: 0.625rem 0.875rem;
    font: inherit;
    cursor: pointer;
  }

  button:disabled { cursor: not-allowed; opacity: 0.6; }
  button:focus-visible {
    outline: 3px solid ${({ theme }) => theme?.colors?.primary || 'var(--accent-primary, #62b1e9)'};
    outline-offset: 2px;
  }

  [role='alert'], [data-testid$='unavailable-action-reason'] { color: ${({ theme }) => theme?.colors?.error || 'var(--color-error, #f7b4b4)'}; }

  .coach-session-desk-empty-actions,
  .coach-session-desk-review-actions,
  .coach-session-desk-draft-actions,
  .coach-session-desk-target-choice { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; }

  @media (max-width: 767px) {
    .coach-session-desk-empty-actions,
    .coach-session-desk-review-actions,
    .coach-session-desk-draft-actions,
    .coach-session-desk-target-choice { display: grid; grid-template-columns: 1fr; }
    .coach-session-desk-empty-actions button,
    .coach-session-desk-review-actions button,
    .coach-session-desk-draft-actions button,
    .coach-session-desk-target-choice button { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
  }
`;
