import styled, { css, keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const cosmicPulse = keyframes`
  0% { box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent); }
  50% { box-shadow: 0 0 40px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 56%, transparent); }
  100% { box-shadow: 0 0 20px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 30%, transparent); }
`;

const dataFlow = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`;

export const AnalyticsContainer = styled(motion.div)`
  background:
    radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent), transparent 36%),
    linear-gradient(135deg,
      color-mix(in srgb, var(--bg-base, #0A0A0F) 94%, transparent) 0%,
      color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent) 100%
    );
  border-radius: 24px;
  padding: 2.5rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  backdrop-filter: blur(25px);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent-primary, #60C0F0), transparent);
    animation: ${dataFlow} 3s linear infinite;
  }

  @media (max-width: 720px) {
    padding: 1.25rem;
    border-radius: 16px;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  flex-wrap: wrap;
  gap: 1.5rem;
`;

export const PanelTitle = styled.h1`
  font-size: clamp(1.65rem, 3vw, 2.25rem);
  font-weight: 700;
  background: linear-gradient(135deg, var(--accent-primary, #60C0F0) 0%, var(--accent-secondary, #8B5CF6) 58%, var(--accent-gold, #C6A84B) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-shadow: 0 0 30px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 28%, transparent);
`;

export const StatusIndicator = styled(motion.div)<{ status: 'live' | 'updating' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 500;

  ${({ status }) => status === 'live' && css`
    background: color-mix(in srgb, var(--success, #10b981) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--success, #10b981) 30%, transparent);
    color: var(--success, #10b981);
  `}

  ${({ status }) => status === 'updating' && css`
    background: color-mix(in srgb, var(--warning, #f59e0b) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--warning, #f59e0b) 30%, transparent);
    color: var(--warning, #f59e0b);
  `}

  ${({ status }) => status === 'error' && css`
    background: color-mix(in srgb, var(--danger, #ef4444) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--danger, #ef4444) 30%, transparent);
    color: var(--danger, #ef4444);
  `}
`;

export const StatusDot = styled.div<{ $isLive: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  ${({ $isLive }) => $isLive && css`animation: ${cosmicPulse} 2s infinite;`}
`;

export const ControlsContainer = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

export const ActionButton = styled(motion.button)<{ $autoRefresh?: boolean }>`
  min-height: 44px;
  background: ${({ $autoRefresh }) => ($autoRefresh ? 'color-mix(in srgb, var(--success, #10b981) 12%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 12%, transparent)')};
  border: 1px solid ${({ $autoRefresh }) => ($autoRefresh ? 'color-mix(in srgb, var(--success, #10b981) 30%, transparent)' : 'color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent)')};
  border-radius: 12px;
  color: ${({ $autoRefresh }) => ($autoRefresh ? 'var(--success, #10b981)' : 'var(--accent-primary, #60C0F0)')};
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 48%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--accent-primary, #60C0F0) 26%, transparent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const TimeRangeSelector = styled.select`
  min-height: 44px;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 28%, transparent);
  border-radius: 12px;
  color: var(--text-primary, #E0ECF4);
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--accent-primary, #60C0F0);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-secondary, #8B5CF6) 22%, transparent);
  }

  option {
    background: var(--bg-base, #0A0A0F);
    color: var(--text-primary, #E0ECF4);
  }
`;

export const KPIGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2.5rem;
`;

export const KPICard = styled(motion.div)`
  background: linear-gradient(135deg, color-mix(in srgb, var(--bg-elevated, #141419) 78%, transparent) 0%, color-mix(in srgb, var(--accent-primary, #60C0F0) 8%, transparent) 100%);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 16px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    height: 2px;
    background: linear-gradient(90deg, var(--accent-primary, #60C0F0), var(--accent-secondary, #8B5CF6));
  }
`;

export const KPIHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

export const KPIIcon = styled.div<{ $tone: string }>`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${({ $tone }) => `color-mix(in srgb, ${$tone} 16%, transparent)`};
  border: 1px solid ${({ $tone }) => `color-mix(in srgb, ${$tone} 30%, transparent)`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ $tone }) => $tone};
`;

export const KPIValue = styled.div`
  font-size: clamp(2rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--text-primary, #E0ECF4);
  line-height: 1;
  margin-bottom: 0.5rem;
`;

export const KPILabel = styled.div`
  font-size: 0.875rem;
  color: var(--text-secondary, #B6C2CC);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const KPIChange = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isPositive'
})<{ isPositive: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: ${({ isPositive }) => (isPositive ? 'var(--success, #10b981)' : 'var(--danger, #ef4444)')};
`;

export const ChartsContainer = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-bottom: 2.5rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

export const ChartCard = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 16px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);
`;

export const ChartTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary, #E0ECF4);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

export const TransactionsContainer = styled(motion.div)`
  background: color-mix(in srgb, var(--bg-elevated, #141419) 76%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent);
  border-radius: 16px;
  padding: 1.5rem;
`;
