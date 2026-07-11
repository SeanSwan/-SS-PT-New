import styled from 'styled-components';

export const BarcodeShell = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

export const BarcodeHeader = styled.header`
  display: flex;
  align-items: flex-start;
  gap: 10px;
`;

export const HeaderIcon = styled.span`
  min-width: 44px;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 30%, transparent);
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
  color: var(--accent-primary, #60C0F0);
`;

export const HeaderCopy = styled.div`
  h3 {
    margin: 0;
    color: var(--text-primary, #E0ECF4);
    font: 800 1rem 'Plus Jakarta Sans', sans-serif;
  }

  p {
    margin: 4px 0 0;
    color: color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent);
    font-size: 0.84rem;
    line-height: 1.45;
  }
`;

export const ScannerStatus = styled.div<{ $error?: boolean }>`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 11px;
  border-left: 3px solid ${({ $error }) => ($error
    ? 'var(--accent-error, #ff8585)'
    : 'var(--accent-primary, #60C0F0)')};
  background: var(--bg-surface, #1A1A24);
  color: ${({ $error }) => ($error
    ? 'var(--accent-error, #ff8585)'
    : 'var(--text-primary, #E0ECF4)')};
  font-size: 0.84rem;
`;

export const RecoveryForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--accent-gold, #C6A84B) 34%, transparent);
  border-radius: 8px;
  background: var(--bg-surface, #1A1A24);
`;

export const RecoveryHint = styled.p`
  margin: 0;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 76%, transparent);
  font-size: 0.82rem;
  line-height: 1.45;
`;

export const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
  gap: 9px;
`;

export const FieldLabel = styled.label<{ $wide?: boolean }>`
  grid-column: ${({ $wide }) => ($wide ? 'span 2' : 'auto')};
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: color-mix(in srgb, var(--text-primary, #E0ECF4) 78%, transparent);
  font-size: 0.75rem;
  font-weight: 800;

  @media (max-width: 480px) {
    grid-column: auto;
  }
`;

export const FormInput = styled.input`
  width: 100%;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const FormSelect = styled.select`
  width: 100%;
  min-height: 44px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 8px;
  background: var(--bg-base, #0A0A0F);
  color: var(--text-primary, #E0ECF4);
  padding: 0 10px;

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
`;

export const ManualDraftButton = styled.button`
  min-height: 48px;
  flex: 1 1 15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--accent-secondary, #8B5CF6) 50%, transparent);
  border-radius: 8px;
  background: var(--primary, #002060);
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 26%, transparent);
`;

export const RetryButton = styled.button`
  min-height: 48px;
  flex: 0 1 13rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 32%, transparent);
  border-radius: 8px;
  background: var(--accent-secondary, #8B5CF6);
  color: var(--text-primary, #E0ECF4);
  font-weight: 800;
  cursor: pointer;

  &:disabled {
    opacity: 0.58;
    cursor: not-allowed;
  }
`;
