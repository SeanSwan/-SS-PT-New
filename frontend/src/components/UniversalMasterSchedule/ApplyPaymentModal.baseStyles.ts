import styled from 'styled-components';
import { APPLY_PAYMENT_THEME, translucent } from './ApplyPaymentModal.theme';
import { ErrorText } from './ui';

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  color: ${translucent(APPLY_PAYMENT_THEME.textPrimary, 80)};
`;

export const InlineSectionHeader = styled(SectionHeader)`
  margin-bottom: 0;
`;

export const ErrorBlock = styled(ErrorText)`
  margin-bottom: 1rem;
`;

export const ForceOverrideActions = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

export const CenteredPad = styled.div<{ $pad?: string }>`
  align-items: center;
  display: flex;
  justify-content: center;
  padding: ${({ $pad }) => $pad ?? '1rem'};
`;

export const ClientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 1rem;
`;

export const ClientCard = styled.button<{ $selected?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  border-radius: 10px;
  background: ${({ $selected }) =>
    $selected
      ? translucent(APPLY_PAYMENT_THEME.accentSecondary, 15)
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 4)};
  border: 1px solid ${({ $selected }) =>
    $selected
      ? translucent(APPLY_PAYMENT_THEME.accentSecondary, 50)
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 8)};
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition: all 150ms ease-out;
  width: 100%;
  min-height: 44px;

  &:hover {
    background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 10)};
    border-color: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 30)};
  }

  @media (max-width: 430px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

export const ApplyHeaderRow = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

export const ClientAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 20)};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${APPLY_PAYMENT_THEME.accentPrimary};
`;

export const CreditBadge = styled.span<{ $negative?: boolean }>`
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${({ $negative }) =>
    translucent($negative ? APPLY_PAYMENT_THEME.danger : APPLY_PAYMENT_THEME.success, 20)};
  color: ${({ $negative }) =>
    $negative ? APPLY_PAYMENT_THEME.danger : APPLY_PAYMENT_THEME.success};
  border: 1px solid ${({ $negative }) =>
    translucent($negative ? APPLY_PAYMENT_THEME.danger : APPLY_PAYMENT_THEME.success, 30)};
`;

export const SessionBadge = styled.span`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${translucent(APPLY_PAYMENT_THEME.credit, 18)};
  color: ${APPLY_PAYMENT_THEME.credit};
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.credit, 30)};
`;

export const ApplySection = styled.div`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${translucent(APPLY_PAYMENT_THEME.textPrimary, 10)};
`;

export const EmptyState = styled.div`
  padding: 2rem;
  text-align: center;
  background: ${translucent(APPLY_PAYMENT_THEME.textPrimary, 2)};
  border-radius: 10px;
  margin-bottom: 1rem;
`;

export const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 8px;
  background: ${translucent(APPLY_PAYMENT_THEME.success, 15)};
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.success, 30)};
  color: ${APPLY_PAYMENT_THEME.success};
  font-size: 0.9rem;
`;

export const ModeToggle = styled.div`
  display: flex;
  gap: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.textPrimary, 15)};
`;

export const ModeButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.4rem 0.75rem;
  min-height: 44px;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 150ms ease;
  background: ${({ $active }) =>
    $active
      ? translucent(APPLY_PAYMENT_THEME.accentSecondary, 20)
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 4)};
  color: ${({ $active }) =>
    $active
      ? APPLY_PAYMENT_THEME.accentPrimary
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 60)};

  @media (max-width: 375px) {
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
  }
`;
