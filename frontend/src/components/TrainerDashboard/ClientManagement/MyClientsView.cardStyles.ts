/**
 * MyClientsView.cardStyles.ts
 * ---------------------------
 * Client-card styled components for the canonical trainer /clients surface.
 */

import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

const clientPulse = keyframes`
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
`;

const cardHover = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(8px); }
`;

const needsPlanPulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
`;

export const ClientCard = styled(motion.div)<{ $membershipColor: string }>`
  background: var(--surface-elevated, rgba(30, 30, 60, 0.6));
  border: 1px solid var(--border-accent-soft, rgba(139, 92, 246, 0.3));
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;

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

  &:hover {
    border-color: var(--border-accent-strong, rgba(139, 92, 246, 0.6));
    box-shadow: 0 8px 32px var(--accent-purple-soft-shadow, rgba(139, 92, 246, 0.2));
    animation: ${cardHover} 0.3s ease forwards;

    .client-actions {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

export const ClientHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
`;

export const ClientAvatar = styled.div<{ $status: string }>`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    var(--accent-purple-strong, #8B5CF6),
    var(--accent-purple, #8b5cf6)
  );
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary, #ffffff);
  font-weight: 700;
  font-size: 1.2rem;
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
    animation: ${clientPulse} 2s ease-in-out infinite;
  }
`;

export const ClientInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

export const ClientName = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin: 0 0 0.25rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

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
`;

export const ClientMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin: 1rem 0;
`;

export const MetricItem = styled.div`
  text-align: center;
  padding: 0.75rem;
  background: var(--surface-subtle, rgba(0, 0, 0, 0.2));
  border-radius: 8px;

  .metric-icon {
    color: var(--accent-purple, #8b5cf6);
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
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;

export const ActionButton = styled(motion.button)<{
  $variant: 'primary' | 'secondary' | 'success' | 'warning';
}>`
  background: ${props => {
    switch (props.$variant) {
      case 'primary':
        return 'linear-gradient(135deg, var(--accent-purple-strong, #8B5CF6), var(--accent-purple, #8b5cf6))';
      case 'success':
        return 'linear-gradient(135deg, var(--status-success, #10b981), var(--status-success-light, #34d399))';
      case 'warning':
        return 'linear-gradient(135deg, var(--status-warning, #f59e0b), var(--status-warning-light, #fbbf24))';
      default:
        return 'var(--surface-interactive, rgba(255, 255, 255, 0.1))';
    }
  }};
  border: none;
  border-radius: 8px;
  padding: 0.5rem;
  color: var(--text-primary, #ffffff);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  min-width: 44px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px var(--shadow-strong, rgba(0, 0, 0, 0.3));
  }
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
  animation: ${needsPlanPulse} 2s ease-in-out infinite;
`;
