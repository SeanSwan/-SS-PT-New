import styled from 'styled-components';

export const CommandShell = styled.section`
  display: grid;
  gap: 0.75rem;
  min-width: 0;
  overflow: hidden;
  container-type: inline-size;
  padding: 0.8rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.42);
`;

export const CommandHeader = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
  min-width: 0;

  strong {
    display: block;
    color: var(--text-primary, #e0ecf4);
    font-size: 0.92rem;
    line-height: 1.2;
  }

  span {
    display: block;
    margin-top: 0.18rem;
    color: var(--text-secondary, rgba(224, 236, 244, 0.72));
    font-size: 0.78rem;
    line-height: 1.35;
  }

  @media (max-width: 620px) {
    flex-direction: column;
  }
`;

export const StatusBadge = styled.span<{ $tone?: 'ready' | 'blocked' }>`
  min-height: 32px;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  border: 1px solid ${({ $tone }) => ($tone === 'blocked' ? 'var(--status-warning, #c6a84b)' : 'var(--accent-primary, #60c0f0)')};
  border-radius: 999px;
  padding: 0 0.65rem;
  color: ${({ $tone }) => ($tone === 'blocked' ? 'var(--status-warning, #c6a84b)' : 'var(--accent-primary, #60c0f0)')};
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.15;
  text-align: center;
  text-transform: uppercase;
`;

export const ReasonField = styled.label`
  display: grid;
  gap: 0.35rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;

  textarea {
    width: 100%;
    min-height: 72px;
    resize: vertical;
    border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
    border-radius: 8px;
    background: var(--surface-elevated, rgba(10, 10, 15, 0.82));
    color: var(--text-primary, #e0ecf4);
    padding: 0.65rem 0.75rem;
    font: inherit;
    line-height: 1.35;
  }
`;

export const CommandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(154px, 1fr));
  gap: 0.55rem;
  min-width: 0;

  @container (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`;

export const CommandButton = styled.button<{ $danger?: boolean }>`
  min-height: 44px;
  min-width: 0;
  border: 1px solid ${({ $danger }) => ($danger ? 'var(--status-error, #fca5a5)' : 'var(--border-accent, rgba(96, 192, 240, 0.32))')};
  border-radius: 8px;
  background: ${({ $danger }) => ($danger ? 'rgba(127, 29, 29, 0.28)' : 'rgba(0, 32, 96, 0.56)')};
  color: var(--text-primary, #e0ecf4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.75rem;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 900;
  cursor: pointer;
  line-height: 1.2;
  white-space: normal;

  &:disabled {
    opacity: 0.46;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 3px;
  }
`;

export const CommandStatus = styled.p<{ $error?: boolean }>`
  min-height: 20px;
  margin: 0;
  color: ${({ $error }) => ($error ? 'var(--status-error, #fca5a5)' : 'var(--text-secondary, rgba(224, 236, 244, 0.72))')};
  font-size: 0.78rem;
  line-height: 1.35;
`;