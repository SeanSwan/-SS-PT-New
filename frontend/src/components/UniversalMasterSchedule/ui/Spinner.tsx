/**
 * Spinner Component
 * =================
 * Loading spinner to replace MUI CircularProgress
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';

// Spin animation
const spin = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Spinner container
const SpinnerContainer = styled.div<{ size?: number }>`
  display: inline-flex;
  animation: ${spin} 1s linear infinite;
  
  svg {
    width: ${props => props.size || 24}px;
    height: ${props => props.size || 24}px;
    color: #3b82f6;
  }
`;

// Loading container (centered)
export const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  
  &.fullscreen {
    min-height: 100vh;
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  }
`;

// Loading text
const LoadingText = styled.p`
  margin: 0;
  color: #e2e8f0;
  font-size: 1rem;
  font-weight: 500;
`;

// Main Spinner component
interface SpinnerProps {
  size?: number;
  text?: string;
  fullscreen?: boolean;
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ 
  size = 48, 
  text,
  fullscreen = false,
  className 
}) => {
  if (text || fullscreen) {
    return (
      <LoadingContainer className={`${fullscreen ? 'fullscreen' : ''} ${className || ''}`}>
        <SpinnerContainer size={size}>
          <Loader2 />
        </SpinnerContainer>
        {text && <LoadingText>{text}</LoadingText>}
      </LoadingContainer>
    );
  }
  
  return (
    <SpinnerContainer size={size} className={className}>
      <Loader2 />
    </SpinnerContainer>
  );
};

// Inline spinner (for buttons, etc.)
export const InlineSpinner = styled(SpinnerContainer)`
  display: inline-flex;
  vertical-align: middle;
`;

export default Spinner;
