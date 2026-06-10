/**
 * MyClientsView.cardStyles.ts
 * ---------------------------
 * Client-card styled components for the canonical trainer /clients surface.
 */

import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  swanClientActionButton,
  swanClientAvatar,
  swanDataCardShell,
  swanMetricTile,
} from '../../DashBoard/workspaces/clients-team/clientCardSystem';

export const ClientCard = styled(motion.div)<{ $membershipColor: string }>`
  --swan-card-padding: 1.35rem;
  ${swanDataCardShell}

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    background: ${props => props.$membershipColor};
    opacity: 0.8;
  }
`;

export const ClientHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
`;

export const ClientAvatar = styled.div<{ $status: string }>`
  --swan-avatar-size: 60px;
  ${swanClientAvatar}
  background: linear-gradient(
    135deg,
    var(--primary, #002060),
    var(--accent-primary, #60C0F0)
  );
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ $status }) => {
      switch ($status) {
        case 'active': return 'var(--status-success, #10b981)';
        case 'inactive': return 'var(--status-danger, #ef4444)';
        case 'pending': return 'var(--status-warning, #f59e0b)';
        default: return 'var(--status-neutral, #6b7280)';
      }
    }};
    border: 2px solid var(--surface-elevated, rgba(30, 30, 60, 0.6));
    box-shadow: 0 0 12px color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }
`;

export const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ClientName = styled.h3`
  min-width: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;

  .membership-badge {
    padding: 0.2rem 0.6rem;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

export const ClientNameButton = styled.button`
  max-width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0 0.25rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  font: inherit;
  text-align: left;
  overflow-wrap: anywhere;

  &:hover {
    color: var(--accent-primary, #60C0F0);
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
`;

export const ClientDetails = styled.div`
  font-size: 0.85rem;
  color: var(--text-secondary, rgba(255, 255, 255, 0.7));
  line-height: 1.4;
  display: grid;
  gap: 0.3rem;

  div {
    min-width: 0;
    display: inline-flex;
    align-items: flex-start;
    gap: 0.45rem;
    overflow-wrap: anywhere;
  }

  span {
    min-width: 0;
  }

  [data-swan-trainer-email='true'] {
    flex: 1 1 auto;
    display: block;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    overflow-wrap: normal;
    word-break: normal;
    -webkit-mask-image: linear-gradient(
      90deg,
      var(--swan-mask-solid, #000) calc(100% - 1.4rem),
      transparent
    );
    mask-image: linear-gradient(
      90deg,
      var(--swan-mask-solid, #000) calc(100% - 1.4rem),
      transparent
    );
  }

  svg {
    flex: 0 0 auto;
    margin-top: 0.1rem;
    color: var(--accent-primary, #60C0F0);
  }
`;

export const ClientMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
`;

export const MetricItem = styled.div`
  ${swanMetricTile}
  text-align: center;
  padding: 0.75rem;

  .metric-icon {
    color: var(--accent-primary, #60C0F0);
    margin-bottom: 0.25rem;
  }

  .metric-value {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary, #ffffff);
    margin-bottom: 0.25rem;
  }

  .metric-label {
    font-size: 0.75rem;
    color: var(--text-tertiary, rgba(255, 255, 255, 0.6));
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

export const ClientActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  opacity: 1;
  transform: none;

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;

export const ActionButton = styled(motion.button)<{
  $variant: 'primary' | 'secondary' | 'success' | 'warning';
}>`
  ${swanClientActionButton}
  --swan-action-bg: ${props => {
    switch (props.$variant) {
      case 'primary':
        return 'linear-gradient(135deg, var(--primary, #002060), var(--accent-secondary, #8B5CF6))';
      case 'success':
        return 'linear-gradient(135deg, var(--primary, #002060), var(--accent-primary, #60C0F0))';
      case 'warning':
        return 'linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0))';
      default:
        return 'color-mix(in srgb, var(--bg-elevated, #141419) 86%, transparent)';
    }
  }};
  --swan-action-border: color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  --swan-action-shadow: ${props => (
    props.$variant === 'warning'
      ? 'color-mix(in srgb, var(--accent-secondary, #8B5CF6) 24%, transparent)'
      : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)'
  )};
  padding: 0.5rem;
`;

export const NeedsPlanWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

export const NeedsPlanDot = styled.span`
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--status-danger-soft, #ff6b6b);
  border: 2px solid var(--surface-deep, #1a1a2e);
  box-shadow: 0 0 12px color-mix(in srgb, var(--status-danger-soft, #ff6b6b) 42%, transparent);
`;
