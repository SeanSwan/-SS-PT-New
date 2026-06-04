import styled from 'styled-components';
import { motion } from 'framer-motion';
import { AlertTriangle, Clock } from 'lucide-react';
import {
  permissionTheme,
  warningPulse
} from './TrainerPermissionsManager.styles';

export const RequestsBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: ${permissionTheme.colors.warning};
  color: ${permissionTheme.colors.background};
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: ${warningPulse} 2s ease-in-out infinite;
`;

export const RequestsButtonWrap = styled.div`
  position: relative;
`;

export const RequestsPanelWrap = styled(motion.div)`
  background: ${permissionTheme.colors.surface};
  border-radius: ${permissionTheme.borderRadius.lg};
  border: 1px solid ${permissionTheme.colors.border};
  margin-bottom: ${permissionTheme.spacing.xl};
  overflow: hidden;
`;

export const RequestsPanelHeader = styled.div`
  padding: ${permissionTheme.spacing.lg};
  border-bottom: 1px solid ${permissionTheme.colors.border};
  background: ${permissionTheme.colors.background};
`;

export const RequestsPanelTitle = styled.h3`
  margin: 0;
  color: ${permissionTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.sm};
`;

export const WarningTitleIcon = styled(AlertTriangle)`
  color: ${permissionTheme.colors.warning};
`;

export const RequestItem = styled(motion.div)`
  padding: ${permissionTheme.spacing.lg};
  border-bottom: 1px solid ${permissionTheme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:last-child {
    border-bottom: none;
  }

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
    gap: ${permissionTheme.spacing.md};
  }
`;

export const RequestInfo = styled.div`
  flex: 1;

  h4 {
    margin: 0 0 ${permissionTheme.spacing.xs} 0;
    color: ${permissionTheme.colors.text};
    font-size: 0.95rem;
  }

  p {
    margin: 0;
    color: ${permissionTheme.colors.textSecondary};
    font-size: 0.85rem;
  }
`;

export const RequestActions = styled.div`
  display: flex;
  gap: ${permissionTheme.spacing.sm};
`;

export const RequestDate = styled.p`
  margin-top: ${permissionTheme.spacing.xs};
  display: flex;
  align-items: center;
`;

export const RequestClock = styled(Clock)`
  margin-right: 4px;
`;
