import React from 'react';
import styled from 'styled-components';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <Container>
      <IconWrapper>
        <AlertCircle size={48} color="#ef4444" />
      </IconWrapper>
      <Title>Unable to Load Metrics</Title>
      <Message>{message}</Message>
      {onRetry && (
        <RetryButton onClick={onRetry}>
          Try Again
        </RetryButton>
      )}
    </Container>
  );
};

export default ErrorMessage;

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  width: 100%;
  padding: 24px;
  text-align: center;
`;

const IconWrapper = styled.div`
  margin-bottom: 16px;
`;

const Title = styled.h3`
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
`;

const Message = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  line-height: 1.5;
  max-width: 400px;
  margin: 0 0 24px 0;
`;

const RetryButton = styled.button`
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #2563eb;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }
`;
