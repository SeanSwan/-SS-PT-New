/**
 * Error Boundary Component
 *
 * A React error boundary component for gracefully handling errors
 * in the MCP integration and other components.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import styled from 'styled-components';

const ErrorPaper = styled.div`
  padding: 24px;
  margin: 16px;
  border-radius: 8px;
  background-color: rgba(244, 67, 54, 0.05);
  border: 1px solid rgba(244, 67, 54, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const ErrorTitle = styled.h6`
  color: #f44336;
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
`;

const ErrorMessage = styled.p`
  font-size: 1rem;
  margin: 0 0 16px;
  color: rgba(255, 255, 255, 0.9);
`;

const DebugBox = styled.div`
  padding: 8px;
  margin-bottom: 16px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  overflow: auto;
  max-height: 200px;
`;

const DebugText = styled.pre`
  font-family: monospace;
  font-size: 0.75rem;
  margin: 0;
  white-space: pre-wrap;
  color: rgba(255, 255, 255, 0.8);
`;

const RetryButton = styled.button`
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
    transform: translateY(-1px);
  }
`;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch JavaScript errors anywhere in child component tree,
 * log those errors, and display a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('Error caught by ErrorBoundary:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });
  }

  // Reset the error boundary state
  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Check if a custom fallback was provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error fallback UI
      return (
        <ErrorPaper>
          <ErrorHeader>
            <AlertTriangle color="#f44336" size={24} style={{ marginRight: '8px' }} />
            <ErrorTitle>
              Something went wrong
            </ErrorTitle>
          </ErrorHeader>

          <ErrorMessage>
            An error occurred while loading this component. This might be due to connection issues
            with the MCP servers or temporary data errors.
          </ErrorMessage>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <DebugBox>
              <DebugText>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </DebugText>
            </DebugBox>
          )}

          <RetryButton onClick={this.handleReset}>
            Try Again
          </RetryButton>
        </ErrorPaper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
