/**
 * Spinner Component
 * =================
 * Loading spinner to replace MUI CircularProgress
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { Loader2 } from 'lucide-react';

const SCHEDULE_SPINNER_THEME = {
  accent: 'var(--accent-primary, #60C0F0)',
  text: 'var(--text-primary, #E0ECF4)',
  fullscreenBackground: 'linear-gradient(135deg, var(--bg-base, #0A0A0F) 0%, var(--bg-surface, #1A1A24) 100%)',
} as const;

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
const SpinnerContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'size'
})<{ size?: number }>`
  display: inline-flex;
  animation: ${spin} 1s linear infinite;
  
  svg {
    width: ${props => props.size || 24}px;
    height: ${props => props.size || 24}px;
    color: ${SCHEDULE_SPINNER_THEME.accent};
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
    background: ${SCHEDULE_SPINNER_THEME.fullscreenBackground};
  }
`;

// Loading text
const LoadingText = styled.p`
  margin: 0;
  color: ${SCHEDULE_SPINNER_THEME.text};
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
