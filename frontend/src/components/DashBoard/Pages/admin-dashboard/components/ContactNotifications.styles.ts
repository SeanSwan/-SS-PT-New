import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import {
  ACCENT_PRIMARY,
  ACCENT_SECONDARY,
  ACCENT_TERTIARY,
  PRIORITY_CRITICAL,
  PRIORITY_HIGH,
  PRIORITY_MEDIUM,
  TEXT_MUTED,
  TEXT_PRIMARY,
  TEXT_SECONDARY,
} from './ContactNotifications.helpers';

const notificationPulse = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, ${ACCENT_PRIMARY} 70%, transparent); }
  70% { box-shadow: 0 0 0 10px color-mix(in srgb, ${ACCENT_PRIMARY} 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, ${ACCENT_PRIMARY} 0%, transparent); }
`;

const urgentBlink = keyframes`
  0%, 50% { opacity: 1; }
  25%, 75% { opacity: 0.3; }
`;

export const NotificationsContainer = styled(motion.div)`
  background: linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 82%, ${ACCENT_PRIMARY} 18%) 0%, color-mix(in srgb, var(--bg-surface, #1A1A24) 88%, ${ACCENT_SECONDARY} 12%) 100%);
  border: 1px solid color-mix(in srgb, ${ACCENT_PRIMARY} 30%, transparent);
  border-radius: 16px;
  margin-bottom: 2rem;
  overflow: hidden;
  padding: 1.5rem;
  position: relative;
  backdrop-filter: blur(20px);
  &::before {
    background: linear-gradient(90deg, ${ACCENT_PRIMARY}, ${ACCENT_TERTIARY}, ${ACCENT_PRIMARY});
    background-size: 200% 100%;
    content: '';
    height: 3px;
    inset: 0 0 auto 0;
    position: absolute;
    animation: shimmer 3s ease-in-out infinite;
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`;

export const NotificationHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`;

export const HeaderTitle = styled.h3`
  align-items: center;
  color: ${ACCENT_PRIMARY};
  display: flex;
  font-size: 1.25rem;
  font-weight: 600;
  gap: 0.5rem;
  margin: 0;
  min-width: 0;
`;

export const HeaderControls = styled.div`
  align-items: center;
  display: flex;
  gap: 0.5rem;
`;


export const NotificationBadge = styled.div`
  align-items: center;
  animation: ${notificationPulse} 2s infinite;
  background: ${PRIORITY_CRITICAL};
  border-radius: 50%;
  color: ${TEXT_PRIMARY};
  display: flex;
  font-size: 0.75rem;
  font-weight: 600;
  height: 20px;
  justify-content: center;
  margin-left: 0.5rem;
  width: 20px;
`;

export const NotificationsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow: visible;
`;

export const NotificationItemShell = styled(motion.div)<{ $priorityColor?: string }>`
  background: color-mix(in srgb, ${TEXT_PRIMARY} 5%, transparent);
  border: 1px solid color-mix(in srgb, ${TEXT_PRIMARY} 10%, transparent);
  border-left: 4px solid ${props => props.$priorityColor || PRIORITY_MEDIUM};
  border-radius: 8px;
  cursor: pointer;
  min-width: 0;
  padding: 1rem;
  position: relative;
  transition: background-color 0.3s ease, border-color 0.3s ease, border-left-width 0.3s ease;
  &:hover {
    background: color-mix(in srgb, ${TEXT_PRIMARY} 8%, transparent);
    border-color: ${props => props.$priorityColor || PRIORITY_MEDIUM};
  }
  &:focus-visible { outline: 2px solid ${ACCENT_PRIMARY}; outline-offset: 2px; }
  &.unread {
    background: color-mix(in srgb, ${ACCENT_TERTIARY} 10%, transparent);
    border-left-width: 6px;
  }
  &.urgent {
    animation: ${urgentBlink} 3s infinite;
    border-left-color: ${PRIORITY_CRITICAL};
  }
`;

export const NotificationContent = styled.div`
  align-items: flex-start;
  display: grid;
  gap: 0.85rem;
  grid-template-columns: auto minmax(0, 1fr) auto;
  min-width: 0;
  @media (max-width: 700px) {
    gap: 0.7rem;
    grid-template-columns: auto minmax(0, 1fr);
  }
`;

export const NotificationIcon = styled.div<{ $color?: string }>`
  background: color-mix(in srgb, ${({ $color }) => $color || PRIORITY_MEDIUM} 18%, transparent);
  border-radius: 8px;
  color: ${({ $color }) => $color || PRIORITY_MEDIUM};
  display: flex; flex-shrink: 0;
  justify-content: center;
  padding: 0.5rem;
`;

export const NotificationDetails = styled.div`
  flex: 1;
  min-width: 0;
`;

export const NotificationTitle = styled.div`
  color: ${TEXT_PRIMARY};
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.25;
  margin-bottom: 0.25rem;
  overflow-wrap: anywhere;
`;

export const NotificationMessage = styled.div`
  color: ${TEXT_SECONDARY};
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
  overflow-wrap: anywhere;
`;

export const NotificationMeta = styled.div`
  align-items: center;
  color: ${TEXT_MUTED};
  display: flex;
  font-size: 0.75rem;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
`;

export const NotificationTime = styled.span`
  align-items: center;
  color: ${TEXT_MUTED};
  display: flex;
  font-size: 0.75rem;
  gap: 0.25rem;
`;

export const NotificationAmount = styled.span`
  color: var(--success, #10B981);
  font-weight: 600;
`;

export const EmptyState = styled.div`
  color: ${TEXT_MUTED};
  padding: 2rem;
  text-align: center;
`;

export const LoadingSpinner = styled.div`
  animation: spin 1s linear infinite;
  border: 2px solid color-mix(in srgb, ${ACCENT_TERTIARY} 30%, transparent);
  border-radius: 50%;
  border-top: 2px solid ${ACCENT_TERTIARY};
  height: 24px;
  margin: 2rem auto;
  width: 24px;
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

export const ErrorBanner = styled.div`
  background: color-mix(in srgb, ${PRIORITY_CRITICAL} 10%, transparent);
  border: 1px solid color-mix(in srgb, ${PRIORITY_CRITICAL} 30%, transparent);
  border-radius: 8px;
  color: ${PRIORITY_CRITICAL};
  font-size: 0.875rem;
  margin-bottom: 1rem;
  padding: 1rem;
`;

export const MessageToggle = styled.button`
  align-items: center;
  background: transparent;
  border: 0;
  color: ${ACCENT_PRIMARY};
  cursor: pointer;
  display: inline-flex;
  margin-left: 4px;
  min-height: 44px;
  padding: 0 0.25rem;
`;

export const ActionRequiredBadge = styled.div`
  align-items: center;
  background: color-mix(in srgb, ${PRIORITY_HIGH} 20%, transparent);
  border: 1px solid color-mix(in srgb, ${PRIORITY_HIGH} 30%, transparent);
  border-radius: 6px;
  color: ${PRIORITY_HIGH};
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.75rem;
  font-weight: 500;
  justify-self: end;
  min-height: 34px;
  padding: 0.25rem 0.5rem;
  @media (max-width: 700px) {
    grid-column: 2 / -1;
    justify-self: start;
    min-height: 32px;
  }
`;

export const EmptyCheckIcon = styled(CheckCircle)`
  margin-bottom: 1rem;
  opacity: 0.5;
`;




