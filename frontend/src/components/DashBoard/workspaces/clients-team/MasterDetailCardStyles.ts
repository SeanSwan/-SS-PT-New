import styled, { css } from 'styled-components';
import { staggerFadeIn } from './MasterDetailShellStyles';

export const ClientList = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px 8px;

  /* Custom scrollbar for dark theme */
  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(96, 192, 240, 0.15);
    border-radius: 4px;
  }
`;

export const ClientCardButton = styled.button<{ $isSelected: boolean }>`
  width: 100%;
  min-height: 72px;
  padding: 12px 16px;
  background-color: ${({ $isSelected }) => ($isSelected ? '#1A1A24' : 'transparent')};
  border: none;
  border-left: 3px solid ${({ $isSelected }) => ($isSelected ? '#8B5CF6' : 'transparent')};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  border-radius: 0 8px 8px 0;
  margin-bottom: 2px;
  transition: all 200ms ease;
  opacity: 0;
  animation: ${staggerFadeIn} 300ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
  animation-delay: calc(var(--stagger-idx, 0) * 30ms);

  /* Dual-Glow: Wing Purple border + Ice Wing inner glow */
  ${({ $isSelected }) => $isSelected && css`
    box-shadow: inset 12px 0 24px -12px rgba(96, 192, 240, 0.15);
  `}

  &:hover {
    background-color: #1A1A24;
  }

  &:focus-visible {
    outline: 2px solid #8B5CF6;
    outline-offset: -2px;
  }
`;

export const ClientAvatar = styled.div<{ $tier?: string }>`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
  background: ${({ $tier }) => {
    switch ($tier) {
      case 'premium': return 'linear-gradient(135deg, #C6A84B, #8B5CF6)';
      case 'elite': return 'linear-gradient(135deg, #8B5CF6, #60C0F0)';
      default: return 'linear-gradient(135deg, #002060, #003080)';
    }
  }};
`;

export const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ClientName = styled.div`
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-weight: 600;
  font-size: 14px;
  color: var(--text-primary, #E0ECF4);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ClientMeta = styled.div`
  font-family: 'Fira Code', monospace;
  font-size: 11px;
  color: var(--text-secondary, #4070C0);
  margin-top: 2px;
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const StatusDot = styled.span<{ $status: 'active' | 'inactive' | 'pending' }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $status }) => {
    switch ($status) {
      case 'active': return '#60C0F0';
      case 'pending': return '#C6A84B';
      case 'inactive': return '#64748b';
      default: return '#64748b';
    }
  }};
`;


export const QuickActions = styled.div`
  display: flex;
  gap: 4px;
  flex-shrink: 0;
`;

export const QuickActionBtn = styled.button<{ $alert?: boolean }>`
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 8px;
  border: none;
  background: rgba(96, 192, 240, 0.05);
  color: var(--text-secondary, #4070C0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 200ms ease;

  &:hover {
    background: rgba(96, 192, 240, 0.15);
    color: var(--accent-primary, #60C0F0);
  }

  &:focus-visible {
    outline: 2px solid #60C0F0;
    outline-offset: 2px;
  }

  /* Alert dot for overdue weigh-in */
  ${({ $alert }) => $alert && css`
    &::after {
      content: '';
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #C6A84B;
      border: 2px solid #141419;
    }
  `}
`;


export const EngagementTrack = styled.div`
  width: 100%;
  height: 4px;
  background-color: var(--bg-base, #0A0A0F);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 6px;
`;

export const EngagementFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => Math.min(Math.max($progress, 0), 100)}%;
  background: linear-gradient(90deg, #8B5CF6 0%, #60C0F0 100%);
  border-radius: 2px;
  transition: width 500ms cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 6px rgba(96, 192, 240, 0.3);
`;
