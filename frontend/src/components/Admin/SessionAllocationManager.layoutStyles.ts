import { RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import styled, { keyframes } from 'styled-components';

export const allocationSpin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Container = styled(motion.div)`
  background: var(--glass-bg, rgba(10, 14, 26, 0.7));
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 2rem;
  border: 1px solid var(--glass-border, rgba(0, 206, 209, 0.2));
  min-height: 600px;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

export const Header = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;

  h2 {
    align-items: center;
    color: var(--text-primary, #e0ecf4);
    display: flex;
    font-size: 1.5rem;
    font-weight: 600;
    gap: 0.75rem;
    margin: 0;
  }

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const ActionBar = styled.div`
  align-items: center;
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    align-items: stretch;
    flex-direction: column;
  }
`;

export const SearchInput = styled.input`
  background: var(--input-bg, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--border-muted, rgba(255, 255, 255, 0.2));
  border-radius: 8px;
  color: var(--text-primary, #e0ecf4);
  flex: 1;
  font-size: 0.9rem;
  min-height: 44px;
  padding: 0.75rem 1rem;

  &:focus {
    border-color: var(--accent-primary, #60c0f0);
    box-shadow: 0 0 0 2px var(--focus-ring, rgba(96, 192, 240, 0.2));
    outline: none;
  }

  &::placeholder {
    color: var(--text-muted, rgba(224, 236, 244, 0.55));
  }
`;

export const Button = styled.button.attrs({ type: 'button' })<{ variant?: 'primary' | 'secondary' | 'success' | 'danger' }>`
  align-items: center;
  border: none;
  border-radius: 8px;
  color: var(--text-primary, #e0ecf4);
  cursor: pointer;
  display: flex;
  font-weight: 500;
  gap: 0.5rem;
  min-height: 44px;
  padding: 0.75rem 1.5rem;
  transition: all 0.3s ease;

  background: ${({ variant }) => {
    switch (variant) {
      case 'primary': return 'var(--accent-primary, #60c0f0)';
      case 'success': return 'var(--success, #10b981)';
      case 'danger': return 'var(--danger, #ef4444)';
      default: return 'var(--button-muted-bg, rgba(255, 255, 255, 0.1))';
    }
  }};

  &:hover {
    box-shadow: 0 4px 12px var(--accent-shadow, rgba(96, 192, 240, 0.3));
    transform: translateY(-1px);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    transform: none;
  }
`;

export const StatsGrid = styled.div`
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  margin-bottom: 2rem;
`;

export const StatCard = styled.div<{ type: 'primary' | 'success' | 'warning' | 'info' }>`
  background: var(--card-bg, rgba(255, 255, 255, 0.05));
  border: 1px solid ${({ type }) => {
    switch (type) {
      case 'primary': return 'var(--accent-primary-border, rgba(96, 192, 240, 0.3))';
      case 'success': return 'var(--success-border, rgba(16, 185, 129, 0.3))';
      case 'warning': return 'var(--warning-border, rgba(245, 158, 11, 0.3))';
      default: return 'var(--info-border, rgba(6, 182, 212, 0.3))';
    }
  }};
  border-radius: 8px;
  padding: 1.5rem;

  .stat-value {
    color: var(--text-primary, #e0ecf4);
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .stat-label {
    align-items: center;
    color: var(--text-secondary, rgba(224, 236, 244, 0.72));
    display: flex;
    font-size: 0.9rem;
    gap: 0.5rem;
  }
`;

export const LoadingCenter = styled.div`
  align-items: center;
  display: flex;
  height: 400px;
  justify-content: center;
`;

export const LoadingRefresh = styled(RefreshCw)`
  animation: ${allocationSpin} 1s linear infinite;
  color: var(--accent-primary, #60c0f0);
`;
