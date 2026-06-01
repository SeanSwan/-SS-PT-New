import { motion } from 'framer-motion';
import styled from 'styled-components';
import { RefreshCw } from 'lucide-react';

export const MonitoringPanel = styled(motion.div)`
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--surface-elevated, #003080) 24%, transparent),
      color-mix(in srgb, var(--bg-base, #030712) 82%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 28%, transparent);
  border-radius: 16px;
  box-shadow: 0 18px 44px color-mix(in srgb, var(--bg-base, #030712) 68%, transparent);
  margin-bottom: 2rem;
  padding: 1.5rem;

  @media (max-width: 768px) {
    margin-bottom: 1rem;
    padding: 1rem;
  }
`;

export const HeaderSection = styled.div`
  align-items: center;
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin-bottom: 1.5rem;

  h3 {
    align-items: center;
    color: var(--accent-primary, #60c0f0);
    display: flex;
    font-size: clamp(1.05rem, 2vw, 1.45rem);
    font-weight: 700;
    gap: 0.5rem;
    letter-spacing: 0;
    margin: 0;
  }

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const HeaderActions = styled.div`
  align-items: center;
  display: flex;
  gap: 0.75rem;

  @media (max-width: 520px) {
    align-items: stretch;
    flex-direction: column;
    width: 100%;
  }
`;

export const StatusIndicator = styled.div`
  align-items: center;
  border-radius: 10px;
  display: flex;
  font-size: 0.875rem;
  font-weight: 700;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.55rem 0.85rem;

  &.healthy {
    background: color-mix(in srgb, var(--success, #10b981) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--success, #10b981) 34%, transparent);
    color: var(--success, #10b981);
  }

  &.warning {
    background: color-mix(in srgb, var(--warning, #f59e0b) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 34%, transparent);
    color: var(--warning, #f59e0b);
  }

  &.error {
    background: color-mix(in srgb, var(--error, #ef4444) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--error, #ef4444) 34%, transparent);
    color: var(--error, #ef4444);
  }
`;

export const RefreshButton = styled(motion.button)`
  align-items: center;
  background: linear-gradient(135deg, var(--accent-primary, #60c0f0), var(--accent-secondary, #8b5cf6));
  border: 0;
  border-radius: 10px;
  color: var(--button-text-dark, #002060);
  cursor: pointer;
  display: flex;
  font-size: 0.875rem;
  font-weight: 800;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.55rem 1rem;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.62;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8b5cf6);
    outline-offset: 3px;
  }
`;

export const LoadingState = styled.div`
  padding: 2rem;
  text-align: center;
`;

export const LoadingRefreshIcon = styled(RefreshCw)`
  color: var(--accent-primary, #60c0f0);
`;

export const LoadingText = styled.p`
  color: var(--text-secondary, #b8c7d8);
  margin: 1rem 0 0;
`;

export const ErrorBanner = styled.div`
  align-items: center;
  background: color-mix(in srgb, var(--error, #ef4444) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--error, #ef4444) 30%, transparent);
  border-radius: 10px;
  color: var(--error, #ef4444);
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  min-height: 44px;
  padding: 0.8rem 1rem;
`;

export const StatsGrid = styled.div`
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  margin-bottom: 1.25rem;
`;

export const StatCard = styled(motion.div)`
  background: color-mix(in srgb, var(--surface-card, #141419) 82%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 16%, transparent);
  border-radius: 12px;
  min-height: 144px;
  padding: 1rem;

  .stat-header {
    align-items: center;
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.85rem;
  }

  .stat-icon {
    background: color-mix(in srgb, var(--accent-secondary, #8b5cf6) 18%, transparent);
    border-radius: 9px;
    color: var(--accent-primary, #60c0f0);
    padding: 0.5rem;
  }

  .stat-value {
    color: var(--accent-primary, #60c0f0);
    font-size: 1.85rem;
    font-weight: 800;
    margin-bottom: 0.35rem;
  }

  .stat-label,
  .stat-change {
    color: var(--text-secondary, #b8c7d8);
    font-size: 0.8rem;
  }

  .stat-change {
    align-items: center;
    display: flex;
    gap: 0.25rem;

    &.positive {
      color: var(--success, #10b981);
    }
  }
`;

export const RecentSignupsList = styled.div`
  background: color-mix(in srgb, var(--bg-base, #030712) 54%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 16%, transparent);
  border-radius: 12px;
  max-height: 400px;
  overflow-y: auto;

  @media (max-width: 768px) {
    max-height: 270px;
  }
`;

export const SignupHeader = styled.div`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 10%, transparent);
  color: var(--accent-primary, #60c0f0);
  display: flex;
  font-weight: 700;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.8rem 1rem;
`;

export const LastUpdatedText = styled.span`
  color: var(--text-muted, #8a96a8);
  font-size: 0.75rem;
  margin-left: auto;
`;

export const SignupListError = styled.div`
  align-items: center;
  background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 25%, transparent);
  color: var(--warning, #f59e0b);
  display: flex;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.8rem 1rem;
`;

export const SignupItem = styled(motion.div)`
  align-items: center;
  border-bottom: 1px solid color-mix(in srgb, var(--text-primary, #e0ecf4) 7%, transparent);
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  padding: 0.85rem 1rem;

  &:last-child {
    border-bottom: 0;
  }

  .user-name {
    color: var(--text-primary, #e0ecf4);
    font-weight: 700;
    margin-bottom: 0.2rem;
  }

  .user-email,
  .timestamp {
    color: var(--text-muted, #8a96a8);
    font-size: 0.78rem;
  }

  .signup-time {
    text-align: right;
  }

  .time-ago {
    color: var(--accent-primary, #60c0f0);
    font-size: 0.84rem;
    font-weight: 700;
  }
`;

export const EmptySignupsState = styled.div`
  color: var(--text-muted, #8a96a8);
  padding: 1.5rem;
  text-align: center;
`;

export const LoadMoreRow = styled.div`
  padding: 0.75rem;
  text-align: center;
`;

export const LoadMoreButton = styled.button`
  background: color-mix(in srgb, var(--accent-primary, #60c0f0) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60c0f0) 32%, transparent);
  border-radius: 10px;
  color: var(--accent-primary, #60c0f0);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 800;
  min-height: 44px;
  padding: 0.55rem 1.5rem;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60c0f0);
    outline-offset: 3px;
  }
`;

export const AutoRefreshIndicator = styled.div`
  align-items: center;
  color: var(--text-muted, #8a96a8);
  display: flex;
  font-size: 0.75rem;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.85rem;
  min-height: 44px;
  text-align: center;
`;
