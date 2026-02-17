import React from 'react';
import styled from 'styled-components';
import { CircularProgress, Typography } from './primitives';

const LoaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 400px;
  width: 100%;
`;

const SpinnerWrapper = styled.div`
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
      <SpinnerWrapper>
        <CircularProgress size={48} thickness={4} />
      </SpinnerWrapper>
      <Typography variant="body1" color="rgba(255,255,255,0.6)">
        {message}
      </Typography>
    </LoaderContainer>
  );
};

export default Loader;
