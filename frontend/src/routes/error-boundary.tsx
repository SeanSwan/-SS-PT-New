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

const ErrorPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  background: linear-gradient(
    135deg,
    var(--bg-primary, #002060),
    var(--bg-elevated, #1e1e3f)
  );
  color: var(--text-primary, #E0ECF4);
  padding: 2rem;
  text-align: center;
`;

const ErrorTitle = styled.h2`
  color: var(--error, #ff416c);
  margin-bottom: 1rem;
`;

const ErrorCopy = styled.p`
  margin-bottom: 2rem;
  max-width: 600px;
`;

const RefreshButton = styled.button`
  min-height: 44px;
  background: linear-gradient(
    135deg,
    var(--accent-primary, #60C0F0),
    var(--accent-cyan, #00c8ff)
  );
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  color: var(--bg-primary, #002060);
  font-weight: 500;
  cursor: pointer;
  font-size: 1rem;

  &:focus-visible {
    outline: 2px solid var(--accent-secondary, #8B5CF6);
    outline-offset: 2px;
  }
`;

const TechnicalDetails = styled.details`
  margin-top: 2rem;
  text-align: left;
  max-width: 600px;
`;

const TechnicalSummary = styled.summary`
  cursor: pointer;
  color: var(--accent-primary, #60C0F0);
`;

const TechnicalPre = styled.pre`
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 4px;
  margin-top: 0.5rem;
  font-size: 0.8rem;
  overflow: auto;
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
        return <Alert>Error 404 - This page doesn&apos;t exist!</Alert>;
      case 401:
        return <Alert>Error 401 - You aren&apos;t authorized to see this</Alert>;
      case 503:
        return <Alert>Error 503 - Looks like our API is down</Alert>;
      case 418:
        return <Alert>Error 418 - Contact administrator</Alert>;
      default:
        break;
    }
  }

  // Default error message - Enhanced for React error #306
  console.error('Application Error:', error);
  return (
    <ErrorPanel>
      <ErrorTitle>Application Error</ErrorTitle>
      <ErrorCopy>
        We&apos;re experiencing a temporary issue. The site is loading but encountered an error.
        Please refresh the page or try again in a few moments.
      </ErrorCopy>
      <RefreshButton
        onClick={() => window.location.reload()}
      >
        Refresh Page
      </RefreshButton>
      <TechnicalDetails>
        <TechnicalSummary>Technical Details</TechnicalSummary>
        <TechnicalPre>
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </TechnicalPre>
      </TechnicalDetails>
    </ErrorPanel>
  );
};

export default ErrorBoundary;
