import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import styled from 'styled-components';

// Styled components
const LoaderContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
  width: 100%;
`;

const StyledCircularProgress = styled(CircularProgress)`
  margin-bottom: 16px;
`;

interface LoaderProps {
  message?: string;
}

/**
 * Loader Component
 * 
 * Displays a loading indicator with an optional customizable message.
 * Used throughout the application for consistent loading states.
 */
const Loader: React.FC<LoaderProps> = ({ message = 'Loading...' }) => {
  return (
    <LoaderContainer>
      <StyledCircularProgress size={48} thickness={4} />
      <Typography variant="body1" color="text.secondary" fontWeight="medium">
        {message}
      </Typography>
    </LoaderContainer>
  );
};

export default Loader;