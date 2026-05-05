import styled from 'styled-components';

export const PanelWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--surface-base, rgba(20, 20, 36, 0.6));
  border: 1px solid var(--border-subtle, rgba(96,192,240,0.2));
  border-radius: 16px;
  color: var(--text-primary, #E0ECF4);

  @media (min-width: 768px) {
    padding: 1.25rem;
    gap: 1.25rem;
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

export const Title = styled.h3`
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;

  @media (min-width: 768px) {
    font-size: 1.2rem;
  }
`;

export const Sub = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(224,236,244,0.7));
`;

export const ClientPicker = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
`;

export const Label = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary, rgba(224,236,244,0.85));
  letter-spacing: 0.02em;
  text-transform: uppercase;
`;

export const ClientInput = styled.input`
  height: 44px;
  padding: 0 0.875rem;
  background: var(--surface-elevated, rgba(30,30,60,0.45));
  border: 1px solid rgba(96,192,240,0.25);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.95rem;

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }
`;

export const ActionBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-top: 0.75rem;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
`;

export const SelectedCount = styled.span`
  font-size: 0.875rem;
  color: var(--text-secondary, rgba(224,236,244,0.85));
`;

export const MergeButton = styled.button<{ $cyan?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 48px;
  padding: 0 1.25rem;
  min-width: 200px;
  background: ${({ $cyan }) => ($cyan ? 'var(--accent-purple, #8B5CF6)' : 'var(--bg-primary, #002060)')};
  color: var(--text-primary, #E0ECF4);
  border: 1px solid ${({ $cyan }) => ($cyan ? 'rgba(96,192,240,0.45)' : 'rgba(139,92,246,0.45)')};
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  box-shadow: ${({ $cyan }) =>
    $cyan ? '0 0 22px rgba(96,192,240,0.45)' : '0 0 22px rgba(139,92,246,0.45)'};
  transition: box-shadow 200ms ease, background-color 200ms ease, transform 100ms ease;

  &:hover:not(:disabled) {
    box-shadow: ${({ $cyan }) =>
      $cyan ? '0 0 32px rgba(96,192,240,0.6)' : '0 0 32px rgba(139,92,246,0.6)'};
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid var(--glow-accent, #8B5CF6);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

export const ErrorBanner = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  padding: 0.75rem 0.875rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 10px;
  color: rgba(252, 165, 165, 1);
  font-size: 0.875rem;

  & strong { font-weight: 700; }
`;

export const RejectedList = styled.ul`
  margin: 0.5rem 0 0 0;
  padding-left: 1.1rem;
  list-style: disc;
  font-size: 0.85rem;
  color: rgba(252, 165, 165, 0.95);
`;
