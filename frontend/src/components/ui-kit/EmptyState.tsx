/**
 * EmptyState Component
 * ====================
 * Displays helpful empty state messages with icons
 * 
 * Usage:
 * <EmptyState 
 *   icon={<Search size={48} />}
 *   title="No results found"
 *   message="Try adjusting your search filters"
 *   action={<Button onClick={handleReset}>Reset Filters</Button>}
 * />
 */

import React from 'react';
import styled from 'styled-components';

// ==========================================
// STYLED COMPONENTS
// ==========================================

const EmptyStateContainer = styled.div<{ $variant?: 'default' | 'minimal' }>`
  text-align: center;
  padding: ${props => props.$variant === 'minimal' ? '2rem 1rem' : '3rem 1rem'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: ${props => props.$variant === 'minimal' ? '200px' : '300px'};
`;

const EmptyStateIcon = styled.div<{ $size?: 'sm' | 'md' | 'lg' }>`
  margin-bottom: 1.5rem;
  color: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  
  svg {
    width: ${props => {
      switch(props.$size) {
        case 'sm': return '32px';
        case 'lg': return '64px';
        default: return '48px';
      }
    }};
    height: ${props => {
      switch(props.$size) {
        case 'sm': return '32px';
        case 'lg': return '64px';
        default: return '48px';
      }
    }};
  }
`;

const EmptyStateTitle = styled.h3`
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
`;

const EmptyStateMessage = styled.p`
  color: rgba(255, 255, 255, 0.5);
  font-size: 1rem;
  margin: 0 0 1.5rem 0;
  max-width: 400px;
  line-height: 1.5;
`;

const EmptyStateAction = styled.div`
  margin-top: 1rem;
`;

// ==========================================
// EMPTY STATE COMPONENT
// ==========================================

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'minimal';
  iconSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No data available',
  message,
  action,
  variant = 'default',
  iconSize = 'md',
  className
}) => {
  return (
    <EmptyStateContainer $variant={variant} className={className}>
      {icon && (
        <EmptyStateIcon $size={iconSize}>
          {icon}
        </EmptyStateIcon>
      )}
      
      <EmptyStateTitle>{title}</EmptyStateTitle>
      
      {message && (
        <EmptyStateMessage>{message}</EmptyStateMessage>
      )}
      
      {action && (
        <EmptyStateAction>{action}</EmptyStateAction>
      )}
    </EmptyStateContainer>
  );
};

// ==========================================
// LOADING STATE (BONUS)
// ==========================================

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
  flex-direction: column;
  gap: 1rem;
`;

const LoadingSpinner = styled.div`
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  border-top: 4px solid #00ffff;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.p`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.95rem;
  margin: 0;
`;

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  className
}) => {
  return (
    <LoadingContainer className={className}>
      <LoadingSpinner />
      <LoadingText>{message}</LoadingText>
    </LoadingContainer>
  );
};

export default EmptyState;
