/**
 * ErrorBoundary Component
 * =====================
 * A React error boundary component that catches JavaScript errors
 * anywhere in the child component tree and displays a fallback UI.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Card, CardContent, Alert, AlertTitle } from '@mui/material';
import styled from 'styled-components';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Styled components
const ErrorContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: linear-gradient(135deg, 
    rgba(239, 68, 68, 0.1) 0%, 
    rgba(220, 38, 38, 0.05) 100%
  );
  border-radius: 12px;
  border: 1px solid rgba(239, 68, 68, 0.2);
`;

const ErrorCard = styled(Card)`
  max-width: 600px;
  width: 100%;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
`;

const ErrorIcon = styled(AlertTriangle)`
  color: #ef4444;
  margin-bottom: 1rem;
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  color: #3b82f6;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 1rem;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
    border-color: rgba(59, 130, 246, 0.5);
  }

  &:active {
    transform: translateY(1px);
  }
`;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  customTitle?: string;
  customMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Component
 * 
 * Catches errors in the component tree and displays a user-friendly error UI.
 * Includes retry functionality and customizable error messages.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state to display fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Force re-render of children
    this.forceUpdate();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorContainer>
          <ErrorCard>
            <CardContent sx={{ textAlign: 'center', p: 3 }}>
              <ErrorIcon size={48} />
              
              <Typography variant="h5" gutterBottom sx={{ color: 'white', fontWeight: 600 }}>
                {this.props.customTitle || 'Something went wrong'}
              </Typography>
              
              <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
                {this.props.customMessage || 
                  'We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.'}
              </Typography>

              {/* Development error details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Alert severity="error" sx={{ textAlign: 'left', mb: 2 }}>
                  <AlertTitle>Error Details (Development)</AlertTitle>
                  <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto' }}>
                    {this.state.error.message}
                  </Typography>
                  {this.state.errorInfo && (
                    <Typography variant="body2" component="pre" sx={{ fontSize: '0.75rem', overflow: 'auto', mt: 1 }}>
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Alert>
              )}

              {/* Retry button */}
              {this.props.showRetry !== false && (
                <RetryButton onClick={this.handleRetry}>
                  <RefreshCw size={16} />
                  Try Again
                </RetryButton>
              )}
            </CardContent>
          </ErrorCard>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
