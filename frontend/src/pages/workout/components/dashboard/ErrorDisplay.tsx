/**
 * ErrorDisplay Component
 * ====================
 * Component to display error messages in the dashboard
 */

import React, { memo } from 'react';
import styled from 'styled-components';

// Styled Components
const ErrorContainer = styled.div<{ visible: boolean }>`
  background-color: #fff1f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
  border-radius: 4px;
  padding: 16px;
  margin-bottom: 20px;
  font-size: 0.95rem;
  display: ${props => props.visible ? 'flex' : 'none'};
  align-items: center;
  gap: 12px;
  
  &:before {
    content: "⚠️";
    font-size: 1.2rem;
  }
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  font-size: 1.1rem;
  color: #cf1322;
  cursor: pointer;
  margin-left: auto;
  padding: 0;
  line-height: 1;
  
  &:hover {
    color: #a8071a;
  }
`;

// Props interface
interface ErrorDisplayProps {
  message: string;
  onDismiss?: () => void;
}

/**
 * ErrorDisplay Component
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onDismiss }) => {
  // Only render if there's an error message
  const hasError = message && message.trim() !== '';
  
  if (!hasError) {
    return null;
  }
  
  return (
    <ErrorContainer visible={hasError}>
      <span>{message}</span>
      {onDismiss && (
        <DismissButton onClick={onDismiss} aria-label="Dismiss error">
          ×
        </DismissButton>
      )}
    </ErrorContainer>
  );
};

// Export memoized component for better performance
export default memo(ErrorDisplay);
