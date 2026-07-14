import styled from 'styled-components';

export const LinkShell = styled.section`
  display: grid;
  gap: 0.65rem;
  min-width: 0;
  overflow: hidden;
  padding: 0.8rem;
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 8px;
  background: rgba(10, 10, 15, 0.42);
`;

export const LinkHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
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

export const LinkActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  min-width: 0;
`;

export const LinkActionButton = styled.button`
  min-height: 44px;
  min-width: 0;
  border: 1px solid var(--border-accent, rgba(96, 192, 240, 0.32));
  border-radius: 8px;
  background: rgba(0, 32, 96, 0.56);
  color: var(--text-primary, #e0ecf4);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.85rem;
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

export const LinkOutputRow = styled.div`
  display: flex;
  gap: 0.55rem;
  align-items: stretch;
  min-width: 0;

  input {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
    border-radius: 8px;
    background: var(--surface-elevated, rgba(10, 10, 15, 0.82));
    color: var(--text-primary, #e0ecf4);
    padding: 0 0.75rem;
    font-family: var(--font-mono, 'Fira Code', monospace);
    font-size: 0.74rem;
  }

  @media (max-width: 620px) {
    flex-direction: column;
  }
`;

export const LinkStatus = styled.p<{ $error?: boolean }>`
  min-height: 20px;
  margin: 0;
  color: ${({ $error }) => ($error ? 'var(--status-error, #fca5a5)' : 'var(--text-secondary, rgba(224, 236, 244, 0.72))')};
  font-size: 0.78rem;
  line-height: 1.35;
`;
