/**
 * Extracted styles for BookingDrawer.
 * The quick-book drawer inherits Crystalline Swan theme variables instead of fixed legacy colors.
 */

import styled from 'styled-components';
import { motion } from 'framer-motion';
import { BOOKING_DRAWER_THEME as T, translucent } from './BookingDrawer.theme';

export const Backdrop = styled(motion.button)`
  position: fixed;
  inset: 0;
  z-index: 999;
  border: 0;
  padding: 0;
  background: ${translucent(T.baseSurface, 70)};
`;

export const DrawerContainer = styled(motion.div)`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 400px;
  max-width: 100vw;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${T.drawerSurface};
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-left: 1px solid ${T.borderAccent};
  box-shadow: ${T.softShadow};

  @media (max-width: 768px) {
    top: auto;
    left: 0;
    right: 0;
    width: 100%;
    max-height: 85vh;
    border-left: none;
    border-top: 1px solid ${T.borderAccent};
    border-radius: 24px 24px 0 0;
  }
`;

export const DrawerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 16px;
  border-bottom: 1px solid ${T.subtleBorder};
`;

export const DrawerTitle = styled.h2`
  margin: 0;
  color: ${T.textPrimary};
  font-size: 18px;
  font-weight: 700;
`;

export const CloseButton = styled.button`
  min-width: 44px;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: ${T.textMuted};
  cursor: pointer;

  &:hover {
    background: ${translucent(T.textPrimary, 6)};
    color: ${T.textPrimary};
  }
`;

export const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
`;

export const Step = styled.span<{ $active: boolean; $complete?: boolean }>`
  color: ${p => (p.$active ? T.accentPrimary : T.textMuted)};
  font-size: 12px;
  font-weight: 600;
  opacity: ${p => (p.$active ? 1 : 0.5)};
  transition: color 0.2s, opacity 0.2s;
`;

export const StepDivider = styled.div<{ $active: boolean }>`
  flex: 1;
  height: 1px;
  background: ${p => (p.$active ? T.accentPrimary : T.subtleBorder)};
  transition: background 0.3s;
`;

export const SlotSummary = styled.div`
  padding: 16px 24px;
  background: ${translucent(T.accentSecondary, 6)};
  border-top: 1px solid ${translucent(T.accentSecondary, 10)};
  border-bottom: 1px solid ${translucent(T.accentSecondary, 10)};
`;

export const SlotTime = styled.div`
  color: ${T.textPrimary};
  font-size: 28px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;

export const SlotDate = styled.div`
  margin-top: 2px;
  color: ${T.textMuted};
  font-size: 14px;
`;

export const SlotMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: ${T.textMuted};
  font-size: 13px;
`;

export const DurationSelect = styled.select`
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid ${translucent(T.accentPrimary, 24)};
  border-radius: 6px;
  background: ${translucent(T.panelSurface, 84)};
  color: ${T.textPrimary};
  font-size: 13px;
  cursor: pointer;
`;

export const SlotTrainer = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  color: ${T.accentPrimary};
  font-size: 13px;
`;

export const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
`;

export const SearchWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 14px;
  background: ${translucent(T.textPrimary, 5)};
  border: 1px solid ${T.subtleBorder};
  border-radius: 10px;

  &:focus-within {
    border-color: ${T.accentPrimary};
    box-shadow: 0 0 0 2px ${translucent(T.accentPrimary, 14)};
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  min-height: 24px;
  border: none;
  outline: none;
  background: transparent;
  color: ${T.textPrimary};
  font-size: 14px;

  &::placeholder {
    color: ${T.textMuted};
  }
`;

export const ClientList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;
