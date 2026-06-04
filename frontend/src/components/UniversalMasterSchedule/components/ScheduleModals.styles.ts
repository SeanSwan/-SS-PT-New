/**
 * Extracted premium modal styles for ScheduleModals.
 * Kept narrow to avoid broad form-flow churn while removing hardcoded legacy colors.
 */

import styled, { keyframes } from 'styled-components';
import { SCHEDULE_MODALS_THEME as T, translucent } from './ScheduleModals.theme';

const lockPulse = keyframes`
  0%, 100% { box-shadow: 0 0 12px ${translucent(T.accentSecondary, 22)}; }
  50% { box-shadow: 0 0 24px ${translucent(T.accentSecondary, 46)}; }
`;

export const PremiumLockOverlay = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 2rem 1.5rem;
  background: ${translucent(T.panelSurface, 76)};
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid ${translucent(T.accentSecondary, 18)};
  border-radius: 12px;
  text-align: center;
`;

export const LockIconWrapper = styled.div`
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${translucent(T.accentSecondary, 28)};
  border-radius: 50%;
  background: ${translucent(T.accentSecondary, 10)};
  animation: ${lockPulse} 2.5s ease-in-out infinite;
`;

export const LockTitle = styled.div`
  color: ${T.accentSecondary};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

export const LockDescription = styled.div`
  max-width: 280px;
  color: ${T.textSecondary};
  font-size: 0.875rem;
  line-height: 1.5;
`;

export const PurchaseButton = styled.button`
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 1px solid ${translucent(T.accentSecondary, 40)};
  border-radius: 10px;
  background: linear-gradient(135deg, ${translucent(T.accentSecondary, 20)}, ${translucent(T.accentPrimary, 16)});
  color: ${T.accentPrimary};
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    background: linear-gradient(135deg, ${translucent(T.accentSecondary, 30)}, ${translucent(T.accentPrimary, 24)});
    border-color: ${translucent(T.accentPrimary, 58)};
    box-shadow: 0 0 16px ${translucent(T.accentPrimary, 22)};
  }
`;

export const BookingCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
  border: 1px solid ${T.borderSubtle};
  border-radius: 10px;
  background: ${translucent(T.textPrimary, 5)};

  @media (max-width: 480px) {
    gap: 0.375rem;
    padding: 0.75rem;
    border-radius: 8px;
  }
`;

export const BookingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
`;

export const CreditCard = styled.div`
  padding: 1rem;
  border: 1px solid ${translucent(T.credit, 38)};
  border-radius: 10px;
  background: ${translucent(T.credit, 14)};
  text-align: center;

  @media (max-width: 480px) {
    padding: 0.75rem;
    border-radius: 8px;
  }
`;

export const DeleteButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  border: none;
  background: transparent;
  color: ${T.textSecondary};
  cursor: pointer;

  &:hover {
    color: ${T.danger};
  }
`;

export const InlineConfirm = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
`;

export const ConfirmText = styled.span`
  color: ${T.textSecondary};
`;

export const ConfirmButton = styled.button`
  padding: 0.1rem 0.4rem;
  border: none;
  border-radius: 6px;
  background: ${translucent(T.danger, 22)};
  color: ${T.danger};
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
`;

export const CancelButton = styled.button`
  padding: 0.1rem 0.4rem;
  border: none;
  border-radius: 6px;
  background: ${translucent(T.textMuted, 20)};
  color: ${T.textMuted};
  font-size: 0.65rem;
  font-weight: 600;
  cursor: pointer;
`;

export const ManualEntryLink = styled.button`
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0.25rem 0;
  border: none;
  background: transparent;
  color: ${translucent(T.accentPrimary, 78)};
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: ${T.accentPrimary};
    text-decoration: underline;
  }
`;
