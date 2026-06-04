/**
 * Client list and confirmation styles for BookingDrawer.
 * Split from the shell styles to keep each file small and reviewable.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { BOOKING_DRAWER_THEME as T, translucent } from './BookingDrawer.theme';

export const ClientItem = styled(motion.button)<{ $selected: boolean }>`
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid ${p => (p.$selected ? translucent(T.success, 40) : 'transparent')};
  border-radius: 10px;
  background: ${p => (p.$selected ? translucent(T.success, 10) : 'transparent')};
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: ${translucent(T.textPrimary, 5)};
  }
`;

export const ClientAvatar = styled.div<{ $large?: boolean }>`
  width: ${p => (p.$large ? '48px' : '36px')};
  height: ${p => (p.$large ? '48px' : '36px')};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.accentSecondary}, ${T.accentPrimary});
  color: ${T.textInverse};
  font-size: ${p => (p.$large ? '16px' : '12px')};
  font-weight: 700;
`;

export const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ClientName = styled.div`
  color: ${T.textPrimary};
  font-size: 14px;
  font-weight: 600;
`;

export const ClientEmail = styled.div`
  overflow: hidden;
  color: ${T.textMuted};
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const EmptySearch = styled.div`
  padding: 24px;
  color: ${T.textMuted};
  font-size: 14px;
  text-align: center;
`;

export const ConfirmSection = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
`;

export const ConfirmLabel = styled.span`
  color: ${T.textMuted};
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
`;

export const ConfirmClient = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const ConfirmName = styled.div`
  color: ${T.textPrimary};
  font-size: 18px;
  font-weight: 700;
`;

export const ConfirmEmail = styled.div`
  color: ${T.textMuted};
  font-size: 13px;
`;

export const ChangeClientBtn = styled.button`
  min-height: 44px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${T.accentPrimary};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: ${translucent(T.accentPrimary, 8)};
  }
`;

export const DrawerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 24px;
  border-top: 1px solid ${T.subtleBorder};
`;

export const ConfirmButton = styled(motion.button)`
  width: 100%;
  min-height: 48px;
  padding: 14px 32px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, ${T.accentSecondary} 0%, ${T.accentPrimary} 100%);
  color: ${T.textInverse};
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.25, 1, 0.5, 1);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const HintText = styled.span`
  color: ${T.textMuted};
  font-size: 14px;
`;
