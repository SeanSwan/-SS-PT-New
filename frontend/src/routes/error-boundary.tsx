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
        return <Alert>Error 404 - This page doesn't exist!</Alert>;
      case 401:
        return <Alert>Error 401 - You aren't authorized to see this</Alert>;
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '50vh',
      background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
      color: 'white',
      padding: '2rem',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#ff416c', marginBottom: '1rem' }}>Application Error</h2>
      <p style={{ marginBottom: '2rem', maxWidth: '600px' }}>
        We're experiencing a temporary issue. The site is loading but encountered an error.
        Please refresh the page or try again in a few moments.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
          border: 'none',
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          color: '#0a0a1a',
          fontWeight: 500,
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        Refresh Page
      </button>
      <details style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '600px' }}>
        <summary style={{ cursor: 'pointer', color: '#00a0e3' }}>Technical Details</summary>
        <pre style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1rem',
          borderRadius: '4px',
          marginTop: '0.5rem',
          fontSize: '0.8rem',
          overflow: 'auto'
        }}>
          {error instanceof Error ? error.message : 'Unknown error occurred'}
        </pre>
      </details>
    </div>
  );
};

export default ErrorBoundary;