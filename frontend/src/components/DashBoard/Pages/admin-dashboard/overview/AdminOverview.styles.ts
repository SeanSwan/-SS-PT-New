import styled from 'styled-components';
import { motion } from 'framer-motion';
import { CommandCard } from '../AdminDashboardCards';

const PRIMARY_GRADIENT = 'var(--gradient-primary, linear-gradient(135deg, var(--accent-secondary, #8B5CF6), var(--accent-primary, #60C0F0)))';
const TEXT_SECONDARY = 'var(--text-secondary, color-mix(in srgb, var(--text-primary, #E0ECF4) 72%, transparent))';
const TEXT_MUTED = 'var(--text-muted, color-mix(in srgb, var(--text-primary, #E0ECF4) 54%, transparent))';

export const MetricCommandCard = styled(CommandCard)<{ accentColor?: string }>`
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${({ accentColor, theme }) => accentColor || theme.gradients?.primary || PRIMARY_GRADIENT};
  }
`;

export const CommandHeader = styled(motion.div)`
  background: var(--bg-card, var(--surface-elevated, #141419));
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: ${PRIMARY_GRADIENT};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    color: ${TEXT_SECONDARY};
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
    margin-bottom: 1rem;
    border-radius: 14px;

    h1 { font-size: 1.5rem; }
    p { font-size: 0.875rem; }
  }

  @media (max-width: 430px) {
    padding: 1rem;

    h1 { font-size: 1.25rem; }
  }
`;

export const CommandGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
`;

export const StatusIndicator = styled.div<{ status: 'healthy' | 'warning' | 'error' | 'offline' }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: ${({ status, theme }) => {
    switch (status) {
      case 'healthy':
        return theme.colors?.success || 'var(--success, #10b981)';
      case 'warning':
        return theme.colors?.warning || 'var(--warning, #f59e0b)';
      case 'error':
      case 'offline':
        return theme.colors?.error || 'var(--danger, #ef4444)';
      default:
        return 'var(--text-muted, #616161)';
    }
  }};
  box-shadow: 0 0 8px currentColor;
`;

export const ChartContainer = styled.div`
  width: 100%;
  height: 120px;
  margin-top: 1rem;
  background: color-mix(in srgb, var(--bg-card, #141419) 88%, transparent);
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--text-primary, #E0ECF4) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${TEXT_MUTED};
  font-size: 0.75rem;
`;

export const CommandButton = styled(motion.button)`
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  background: color-mix(in srgb, var(--button-primary-bg, var(--accent-primary, #60C0F0)) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 24%, transparent);
  border-radius: 10px;
  color: var(--text-primary, #E0ECF4);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${PRIMARY_GRADIENT};
    border-color: color-mix(in srgb, var(--button-primary-bg, var(--accent-primary, #60C0F0)) 58%, transparent);
    box-shadow: var(--shadow-primary, 0 0 30px color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent));
    transform: translateY(-2px);
  }

  &:focus {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const MetricGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
`;
