/**
 * LoadingSpinner Component
 * =====================
 * A modern loading spinner component for the Universal Master Schedule
 * and other components that need loading states.
 */

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import styled, { keyframes } from 'styled-components';

// Keyframes for custom animations
const pulseAnimation = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const glowAnimation = keyframes`
  0% {
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.2);
  }
  50% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
  }
  100% {
    box-shadow: 0 0 5px rgba(59, 130, 246, 0.2);
  }
`;

// Styled components
const LoaderContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 200px;
  width: 100%;
  background: transparent;
`;

const StyledCircularProgress = styled(CircularProgress)`
  margin-bottom: 16px;
  animation: ${pulseAnimation} 2s ease-in-out infinite;
  
  & .MuiCircularProgress-circle {
    stroke: #3b82f6;
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.5));
  }
`;

const LoadingText = styled(Typography)`
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
  text-align: center;
  animation: ${glowAnimation} 2s ease-in-out infinite;
`;

interface LoadingSpinnerProps {
  message?: string;
  size?: number;
  thickness?: number;
  color?: string;
  showText?: boolean;
  fullHeight?: boolean;
}

/**
 * LoadingSpinner Component
 * 
 * Displays a loading spinner with customizable options
 * Used throughout the application for consistent loading states.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 48,
  thickness = 4,
  color = '#3b82f6',
  showText = true,
  fullHeight = false
}) => {
  return (
    <LoaderContainer sx={{ minHeight: fullHeight ? '100vh' : '200px' }}>
      <StyledCircularProgress
        size={size}
        thickness={thickness}
        sx={{
          color,
          '& .MuiCircularProgress-circle': {
            stroke: color,
          }
        }}
      />
      {showText && (
        <LoadingText variant="body1">
          {message}
        </LoadingText>
      )}
    </LoaderContainer>
  );
};

export default LoadingSpinner;
