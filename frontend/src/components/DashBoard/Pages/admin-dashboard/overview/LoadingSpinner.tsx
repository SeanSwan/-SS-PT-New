import React from 'react';
import styled, { keyframes } from 'styled-components';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading metrics...'
}) => {
  return (
    <Container>
      <SpinnerWrapper>
        <Spinner />
      </SpinnerWrapper>
      <Message>{message}</Message>
    </Container>
  );
};

export default LoadingSpinner;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  width: 100%;
`;

const SpinnerWrapper = styled.div`
  margin-bottom: 16px;
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const Message = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
`;
