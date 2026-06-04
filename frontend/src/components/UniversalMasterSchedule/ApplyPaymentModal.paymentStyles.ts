import styled from 'styled-components';
import { APPLY_PAYMENT_THEME, translucent } from './ApplyPaymentModal.theme';

export const ForceOverrideContainer = styled.div`
  padding: 1.25rem;
  border-radius: 12px;
  background: ${translucent(APPLY_PAYMENT_THEME.danger, 8)};
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.danger, 30)};
  margin-bottom: 1rem;
`;

export const ForceOverrideHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 1rem;
  color: ${APPLY_PAYMENT_THEME.danger};
  margin-bottom: 0.5rem;
`;

export const ForceOverrideBody = styled.div`
  font-size: 0.85rem;
  color: ${translucent(APPLY_PAYMENT_THEME.textPrimary, 70)};
  line-height: 1.5;
  margin-bottom: 0.75rem;
`;

export const StripeCardSection = styled.div`
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: 10px;
  background: ${translucent(APPLY_PAYMENT_THEME.textPrimary, 3)};
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.textPrimary, 8)};
`;

export const CardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
`;

export const CardOption = styled.button<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 150ms ease;
  font-weight: 600;
  font-size: 0.85rem;
  color: ${({ $selected }) =>
    $selected
      ? APPLY_PAYMENT_THEME.accentPrimary
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 80)};
  background: ${({ $selected }) =>
    $selected
      ? translucent(APPLY_PAYMENT_THEME.accentSecondary, 12)
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 4)};
  border: 2px solid ${({ $selected }) =>
    $selected
      ? APPLY_PAYMENT_THEME.accentPrimary
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 10)};

  &:hover {
    background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 8)};
    border-color: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 30)};
  }
`;

export const NoCardsMessage = styled.div`
  padding: 1rem;
  text-align: center;
  margin-bottom: 0.5rem;
`;

export const TestCardButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px dashed ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 50)};
  background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 8)};
  color: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 90)};
  font-weight: 600;
  font-size: 0.8rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: all 150ms ease;
  width: 100%;
  justify-content: center;

  &:hover:not(:disabled) {
    background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 15)};
    border-color: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 70)};
  }
`;

export const ConfirmationBanner = styled.div`
  margin-top: 0.75rem;
  padding: 1rem;
  border-radius: 10px;
  background: ${translucent(APPLY_PAYMENT_THEME.warning, 8)};
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.warning, 30)};
`;

export const ConfirmationHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.9rem;
  color: ${APPLY_PAYMENT_THEME.warning};
  margin-bottom: 0.5rem;
`;

export const ForceOverrideButton = styled.button<{ disabled?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.danger, 50)};
  background: ${translucent(APPLY_PAYMENT_THEME.danger, 15)};
  color: ${APPLY_PAYMENT_THEME.danger};
  font-weight: 600;
  font-size: 0.9rem;
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  opacity: ${({ disabled }) => disabled ? 0.5 : 1};
  transition: all 150ms ease;

  &:hover:not(:disabled) {
    background: ${translucent(APPLY_PAYMENT_THEME.danger, 25)};
    border-color: ${translucent(APPLY_PAYMENT_THEME.danger, 70)};
  }
`;
