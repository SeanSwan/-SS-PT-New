import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Crown, Key } from 'lucide-react';
import {
  LoadingSpinner,
  permissionTheme,
  stellarGlow,
  warningPulse
} from './TrainerPermissionsManager.styles';
import type { PermissionStatus } from './TrainerPermissionsManager.types';

export const TrainersGridWrap = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: ${permissionTheme.spacing.xl};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

export const TrainerCard = styled(motion.div)`
  background: ${permissionTheme.colors.surface};
  border-radius: ${permissionTheme.borderRadius.lg};
  border: 1px solid ${permissionTheme.colors.border};
  overflow: hidden;
  position: relative;

  &:hover {
    border-color: ${permissionTheme.colors.primary};
    animation: ${stellarGlow} 2s ease-in-out infinite;
  }
`;

export const TrainerHeader = styled.div`
  padding: ${permissionTheme.spacing.lg};
  background: ${permissionTheme.colors.background};
  border-bottom: 1px solid ${permissionTheme.colors.border};

  h3 {
    margin: 0 0 ${permissionTheme.spacing.xs} 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: ${permissionTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${permissionTheme.spacing.sm};
  }

  p {
    margin: 0;
    font-size: 0.85rem;
    color: ${permissionTheme.colors.textSecondary};
  }
`;

export const PermissionsGrid = styled.div`
  padding: ${permissionTheme.spacing.lg};
  display: grid;
  gap: ${permissionTheme.spacing.md};
`;

export const PermissionCard = styled(motion.div)<{ $critical?: boolean; $hasPermission?: boolean; $expiring?: boolean }>`
  background: ${props =>
    props.$hasPermission ?
      (props.$expiring ? permissionTheme.colors.warningWash : permissionTheme.colors.successWash) :
      permissionTheme.colors.cardBg};
  border: 1px solid ${props =>
    props.$hasPermission ?
      (props.$expiring ? permissionTheme.colors.warning : permissionTheme.colors.success) :
      permissionTheme.colors.border};
  border-radius: ${permissionTheme.borderRadius.md};
  padding: ${permissionTheme.spacing.md};
  position: relative;
  transition: transform 0.25s ease, box-shadow 0.25s ease;

  ${props => props.$critical && `
    &::before {
      content: '';
      position: absolute;
      inset: 0 0 auto;
      height: 2px;
      background: ${permissionTheme.colors.critical};
    }
  `}

  ${props => props.$expiring && `
    animation: ${warningPulse} 3s ease-in-out infinite;
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px ${permissionTheme.colors.primaryWash};
  }
`;

export const PermissionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: ${permissionTheme.spacing.sm};
`;

export const PermissionLabel = styled.div`
  flex: 1;

  h4 {
    margin: 0 0 ${permissionTheme.spacing.xs} 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: ${permissionTheme.colors.text};
    display: flex;
    align-items: center;
    gap: ${permissionTheme.spacing.xs};
  }
`;

export const CriticalBadge = styled.span`
  background: ${permissionTheme.colors.critical};
  color: var(--text-on-danger, #ffffff);
  font-size: 0.7rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

export const PermissionToggle = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: ${permissionTheme.spacing.xs};
`;

export const ToggleSwitch = styled.button<{ checked: boolean }>`
  width: 52px;
  height: 44px;
  border-radius: 22px;
  border: none;
  cursor: pointer;
  position: relative;
  transition: transform 0.25s ease;
  background: ${props => props.checked ? permissionTheme.colors.success : permissionTheme.colors.border};

  &::after {
    content: '';
    position: absolute;
    top: 10px;
    left: ${props => props.checked ? '24px' : '4px'};
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--toggle-thumb, #ffffff);
    transition: left 0.25s ease;
    box-shadow: 0 2px 4px ${permissionTheme.colors.cardShadow};
  }

  &:hover {
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid ${permissionTheme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
    transform: none;
  }
`;

export const ToggleLabel = styled.span<{ $active: boolean }>`
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.$active ? permissionTheme.colors.success : permissionTheme.colors.textSecondary};
`;

export const PermissionDescription = styled.div`
  font-size: 0.85rem;
  color: ${permissionTheme.colors.textSecondary};
  line-height: 1.4;
  margin-bottom: ${permissionTheme.spacing.sm};
`;

export const PermissionStatusText = styled.div<{ type: PermissionStatus }>`
  display: flex;
  align-items: center;
  gap: ${permissionTheme.spacing.xs};
  font-size: 0.8rem;
  font-weight: 500;
  color: ${props =>
    props.type === 'active' ? permissionTheme.colors.success :
    props.type === 'expiring' ? permissionTheme.colors.warning :
    props.type === 'expired' ? permissionTheme.colors.error :
    props.type === 'unknown' ? permissionTheme.colors.warning :
    permissionTheme.colors.textSecondary};
`;

export const PermissionsSummary = styled.div`
  padding: ${permissionTheme.spacing.md} ${permissionTheme.spacing.lg};
  background: ${permissionTheme.colors.background};
  border-top: 1px solid ${permissionTheme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const SummaryText = styled.div`
  font-size: 0.9rem;
  color: ${permissionTheme.colors.textSecondary};
  font-weight: 500;
`;

export const TrainerCheckbox = styled.input`
  position: absolute;
  top: ${permissionTheme.spacing.md};
  left: ${permissionTheme.spacing.md};
  width: 44px;
  height: 44px;
  cursor: pointer;
  z-index: 10;
`;

export const ToggleLoadingSpinner = styled(LoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
`;

export const SummaryIconRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const WarningCrown = styled(Crown)`
  color: ${permissionTheme.colors.warning};
`;

export const MutedKey = styled(Key)`
  color: ${permissionTheme.colors.textSecondary};
`;

export const EmptyState = styled.div`
  text-align: center;
  color: ${permissionTheme.colors.textSecondary};
  padding: ${permissionTheme.spacing.xxl};
  font-size: 1.1rem;
`;
