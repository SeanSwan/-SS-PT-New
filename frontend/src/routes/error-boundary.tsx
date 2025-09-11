/**
 * error-boundary.tsx
 * Error boundary component for route errors
 */
import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';

// Styled Alert Component
const AlertContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  margin: 20px;
  background-color: rgba(220, 53, 69, 0.1);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 8px;
  color: #dc3545;
  font-size: 16px;
  max-width: 600px;
  margin: 20px auto;
`;

const AlertIcon = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const AlertMessage = styled.div`
  flex: 1;
  line-height: 1.4;
`;

// Custom Alert Component
const Alert: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AlertContainer>
    <AlertIcon>
      <AlertTriangle size={20} />
    </AlertIcon>
    <AlertMessage>{children}</AlertMessage>
  </AlertContainer>
);

// Error boundary component for handling routing errors
const ErrorBoundary: React.FC = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    // Handle specific HTTP error codes
    switch (error.status) {
      case 404:
        return <Alert severity="error">Error 404 - This page doesn't exist!</Alert>;
      case 401:
        return <Alert severity="error">Error 401 - You aren't authorized to see this</Alert>;
      case 503:
        return <Alert severity="error">Error 503 - Looks like our API is down</Alert>;
      case 418:
        return <Alert severity="error">Error 418 - Contact administrator</Alert>;
      default:
        break;
    }
  }

  // Default error message
  return <Alert severity="error">Under Maintenance</Alert>;
};

export default ErrorBoundary;