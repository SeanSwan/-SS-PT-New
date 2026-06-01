import styled from 'styled-components';
import { motion } from 'framer-motion';

export const TransactionItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: color-mix(in srgb, var(--bg-surface, #1A1A24) 66%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
  border-radius: 12px;
  transition: all 0.3s ease;

  &:hover {
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 10%, transparent);
    border-color: color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  }

  &:last-child {
    margin-bottom: 0;
  }

  @media (max-width: 520px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const LoadingTitle = styled.div`
  color: var(--accent-primary, #60C0F0);
  font-size: 1.125rem;
  font-weight: 500;
`;

export const LoadingSubtitle = styled.div`
  color: var(--text-muted, #9CA8B5);
  font-size: 0.875rem;
`;

export const ErrorTitle = styled.div`
  color: var(--danger, #ef4444);
  font-size: 1.25rem;
  font-weight: 600;
`;

export const ErrorMessage = styled.div`
  color: var(--text-secondary, #B6C2CC);
  margin-bottom: 1.5rem;
`;

export const LastUpdatedText = styled.div`
  margin-left: auto;
  font-size: 0.875rem;
  color: var(--text-muted, #9CA8B5);
  font-weight: 400;
`;

export const TransactionDetails = styled.div`
  min-width: 0;
`;

export const TransactionCustomer = styled.div`
  font-weight: 600;
  margin-bottom: 0.25rem;
  color: var(--text-primary, #E0ECF4);
`;

export const TransactionPackage = styled.div`
  font-size: 0.875rem;
  color: var(--text-muted, #9CA8B5);
  margin-bottom: 0.25rem;
`;

export const TransactionDate = styled.div`
  font-size: 0.75rem;
  color: var(--text-muted, #9CA8B5);
`;

export const TransactionAmountBlock = styled.div`
  text-align: right;

  @media (max-width: 520px) {
    text-align: left;
  }
`;

export const TransactionAmount = styled.div`
  color: var(--success, #10b981);
  font-weight: 700;
  font-size: 1.125rem;
  margin-bottom: 0.25rem;
`;

export const TransactionStatus = styled.div<{ $completed: boolean }>`
  font-size: 0.875rem;
  color: ${({ $completed }) => ($completed ? 'var(--success, #10b981)' : 'var(--warning, #f59e0b)')};
  font-weight: 500;
`;

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
`;

export const LoadingSpinner = styled(motion.div)`
  width: 60px;
  height: 60px;
  border: 4px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 20%, transparent);
  border-left: 4px solid var(--accent-primary, #60C0F0);
  border-radius: 50%;
`;

export const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  flex-direction: column;
  gap: 1rem;
  text-align: center;
`;
