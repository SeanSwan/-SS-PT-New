import styled from 'styled-components';

export const DateOverrideRow = styled.label`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: min(100%, 15rem);
  color: var(--text-secondary, rgba(224,236,244,0.78));
  font-size: 0.8rem;
  font-weight: 700;
`;

export const DateOverrideInput = styled.input`
  min-height: 44px;
  padding: 0 0.75rem;
  border: 1px solid rgba(96,192,240,0.32);
  border-radius: 10px;
  background: var(--surface-elevated, rgba(30,30,60,0.45));
  color: var(--text-primary, #E0ECF4);
  font: inherit;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;
