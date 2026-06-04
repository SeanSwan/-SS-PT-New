import styled from 'styled-components';
import { APPLY_PAYMENT_THEME, translucent } from './ApplyPaymentModal.theme';
import { BodyText, Caption, FormField } from './ui';

export const LastPackageBanner = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 12)};
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 30)};
  margin-bottom: 0.75rem;
`;

export const PackageGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
`;

export const PackageCard = styled.button<{ $selected: boolean; $isLast?: boolean }>`
  position: relative;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  color: inherit;
  transition: all 150ms ease;
  text-align: center;
  min-height: 44px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  background: ${({ $selected }) =>
    $selected
      ? translucent(APPLY_PAYMENT_THEME.accentSecondary, 15)
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 4)};
  border: 2px solid ${({ $selected, $isLast }) =>
    $selected ? APPLY_PAYMENT_THEME.accentPrimary
    : $isLast ? translucent(APPLY_PAYMENT_THEME.accentSecondary, 50)
    : translucent(APPLY_PAYMENT_THEME.textPrimary, 8)};

  &:hover {
    background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 10)};
    border-color: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 40)};
  }
`;

export const SpacedFormField = styled(FormField)`
  margin-top: 1rem;
`;

export const ValidationCaption = styled(Caption)`
  color: ${APPLY_PAYMENT_THEME.danger};
  margin-top: 0.25rem;
`;

export const InstructionCaption = styled(Caption)`
  margin-top: 0.25rem;
`;

export const LastBadge = styled.span`
  position: absolute;
  top: -8px;
  right: 8px;
  padding: 0.1rem 0.5rem;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 80)};
  color: ${APPLY_PAYMENT_THEME.textPrimary};
`;

export const PackageName = styled.div`
  font-weight: 600;
  font-size: 0.85rem;
  color: ${APPLY_PAYMENT_THEME.textPrimary};
`;

export const PackageSessions = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${APPLY_PAYMENT_THEME.accentPrimary};
`;

export const PackagePrice = styled.div`
  font-size: 0.9rem;
  font-weight: 600;
  color: ${APPLY_PAYMENT_THEME.success};
`;

export const PaymentMethodGrid = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

export const PaymentMethodButton = styled.button<{ $selected: boolean }>`
  padding: 0.5rem 1rem;
  min-height: 44px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  white-space: nowrap;
  transition: all 150ms ease;
  border: 2px solid ${({ $selected }) =>
    $selected
      ? APPLY_PAYMENT_THEME.accentPrimary
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 15)};
  background: ${({ $selected }) =>
    $selected
      ? translucent(APPLY_PAYMENT_THEME.accentSecondary, 15)
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 4)};
  color: ${({ $selected }) =>
    $selected
      ? APPLY_PAYMENT_THEME.accentPrimary
      : translucent(APPLY_PAYMENT_THEME.textPrimary, 70)};

  &:hover {
    border-color: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 40)};
    background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 8)};
  }

  @media (max-width: 375px) {
    padding: 0.4rem 0.65rem;
    font-size: 0.8rem;
  }
`;

export const SummaryCard = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 10px;
  background: ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 6)};
  border: 1px solid ${translucent(APPLY_PAYMENT_THEME.accentSecondary, 20)};
`;

export const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;

  & + & {
    border-top: 1px solid ${translucent(APPLY_PAYMENT_THEME.textPrimary, 6)};
  }
`;

export const CapitalizedBodyText = styled(BodyText)`
  text-transform: capitalize;
`;

export const PositiveBodyText = styled(BodyText)`
  color: ${APPLY_PAYMENT_THEME.success};
  font-weight: 700;
`;
