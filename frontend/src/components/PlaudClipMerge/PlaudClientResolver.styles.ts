import styled from 'styled-components';

export const ResolverWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem;
  background: var(--surface-elevated, rgba(30, 30, 60, 0.38));
  border: 1px solid var(--border-subtle, rgba(96, 192, 240, 0.22));
  border-radius: 14px;
`;

export const ResolverHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
`;

export const ResolverTitle = styled.h4`
  margin: 0;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;
  font-weight: 700;
`;

export const ResolverSub = styled.p`
  margin: 0;
  color: var(--text-secondary, rgba(224, 236, 244, 0.72));
  font-size: 0.82rem;
  line-height: 1.45;
`;

export const SelectedClientCard = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
  padding: 0.8rem;
  background: rgba(0, 32, 96, 0.24);
  border: 1px solid rgba(96, 192, 240, 0.28);
  border-radius: 12px;

  @media (min-width: 640px) {
    grid-template-columns: 1fr auto;
    align-items: center;
  }
`;

export const SelectedLabel = styled.span`
  display: block;
  margin-bottom: 0.25rem;
  color: var(--accent-primary, #60C0F0);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

export const SelectedName = styled.strong`
  display: block;
  color: var(--text-primary, #E0ECF4);
  font-size: 1rem;
  line-height: 1.25;
`;

export const SelectedMeta = styled.span`
  display: block;
  margin-top: 0.2rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.68));
  font-family: 'Fira Code', monospace;
  font-size: 0.78rem;
`;

export const ResolverActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

export const ResolverButton = styled.button<{ $primary?: boolean }>`
  min-height: 44px;
  padding: 0 0.9rem;
  border-radius: 10px;
  border: 1px solid ${({ $primary }) => ($primary ? 'rgba(96, 192, 240, 0.45)' : 'rgba(224, 236, 244, 0.16)')};
  background: ${({ $primary }) => ($primary ? 'var(--accent-purple, #8B5CF6)' : 'rgba(20, 20, 25, 0.72)')};
  color: var(--text-primary, #E0ECF4);
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${({ $primary }) => ($primary ? '0 0 20px rgba(96, 192, 240, 0.32)' : 'none')};

  &:hover:not(:disabled) {
    border-color: rgba(96, 192, 240, 0.58);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

export const SearchStack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
`;

export const SearchInput = styled.input`
  min-height: 44px;
  width: 100%;
  padding: 0 0.875rem;
  background: var(--bg-base, #030712);
  border: 1px solid rgba(96, 192, 240, 0.25);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ResultList = styled.div`
  display: grid;
  gap: 0.4rem;
`;

export const ResultButton = styled.button`
  min-height: 44px;
  padding: 0.65rem 0.75rem;
  text-align: left;
  border: 1px solid rgba(224, 236, 244, 0.12);
  border-radius: 10px;
  background: rgba(10, 10, 15, 0.64);
  color: var(--text-primary, #E0ECF4);
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: rgba(96, 192, 240, 0.45);
    background: rgba(0, 32, 96, 0.28);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ResultName = styled.span`
  display: block;
  font-weight: 700;
`;

export const ResultMeta = styled.span`
  display: block;
  margin-top: 0.18rem;
  color: var(--text-secondary, rgba(224, 236, 244, 0.66));
  font-size: 0.78rem;
`;

export const ResolverStatus = styled.div<{ $error?: boolean }>`
  color: ${({ $error }) => ($error ? 'rgba(252, 165, 165, 1)' : 'var(--text-secondary, rgba(224, 236, 244, 0.72))')};
  font-size: 0.82rem;
`;
