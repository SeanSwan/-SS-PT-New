import styled from 'styled-components';
import { motion } from 'framer-motion';
import { CommandCard } from '../AdminDashboardCards';

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
    background: ${props => props.accentColor || props.theme.gradients?.primary || 'linear-gradient(135deg, #3b82f6, #00ffff)'};
  }
`;

export const CommandHeader = styled(motion.div)`
  background: ${({ theme }) => theme.background?.elevated || 'rgba(30, 58, 138, 0.4)'};
  backdrop-filter: blur(15px);
  border-radius: 20px;
  padding: 2rem;
  margin-bottom: 2rem;
  border: ${({ theme }) => theme.borders?.elegant || '1px solid rgba(59, 130, 246, 0.3)'};

  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #3b82f6, #00ffff)'};
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  p {
    color: ${({ theme }) => theme.text?.secondary || 'rgba(255, 255, 255, 0.7)'};
    font-size: 1.1rem;
  }

  @media (max-width: 768px) {
    padding: 1.25rem;
    margin-bottom: 1rem;
    border-radius: 14px;

    h1 {
      font-size: 1.5rem;
    }

    p {
      font-size: 0.875rem;
    }
  }

  @media (max-width: 430px) {
    padding: 1rem;

    h1 {
      font-size: 1.25rem;
    }
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
  background-color: ${props => {
    switch (props.status) {
      case 'healthy':
        return props.theme.colors?.success || '#10b981';
      case 'warning':
        return props.theme.colors?.warning || '#f59e0b';
      case 'error':
      case 'offline':
        return props.theme.colors?.error || '#ef4444';
      default:
        return '#616161';
    }
  }};
  box-shadow: 0 0 8px currentColor;
`;

export const ChartContainer = styled.div`
  width: 100%;
  height: 120px;
  margin-top: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 8px;
  border: ${({ theme }) => theme.borders?.subtle || '1px solid rgba(255, 255, 255, 0.05)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.text?.muted || 'rgba(255, 255, 255, 0.4)'};
  font-size: 0.75rem;
`;

export const CommandButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: ${({ theme }) => theme.interactive?.hover || 'rgba(59, 130, 246, 0.2)'};
  border: ${({ theme }) => theme.borders?.elegant || '1px solid rgba(59, 130, 246, 0.3)'};
  border-radius: 10px;
  color: ${({ theme }) => theme.text?.primary || '#ffffff'};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: ${({ theme }) => theme.gradients?.primary || 'linear-gradient(135deg, #3b82f6, #00ffff)'};
    border-color: ${({ theme }) => theme.colors?.primary || 'rgba(59, 130, 246, 0.6)'};
    box-shadow: ${({ theme }) => theme.shadows?.primary || '0 0 30px rgba(59, 130, 246, 0.6)'};
    transform: translateY(-2px);
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors?.primary || '#0ea5e9'};
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
