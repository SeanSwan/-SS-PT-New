/**
 * Error Boundary for Schedule Components
 * This component catches errors in the Schedule components and provides a graceful fallback.
 */

import React, { Component } from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  padding: 32px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(30, 30, 60, 0.3);
  backdrop-filter: blur(10px);
  text-align: center;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const ErrorTitle = styled.h5`
  margin: 0 0 16px;
  color: #ff416c;
  font-size: 1.5rem;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  margin: 0 0 32px;
  max-width: 600px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  line-height: 1.5;
`;

const RetryButton = styled.button`
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 10px 24px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  margin-bottom: 16px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
    transform: translateY(-1px);
  }
`;

const DebugBox = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  max-width: 100%;
  overflow: auto;
  text-align: left;
`;

const DebugTitle = styled.p`
  color: #ff416c;
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 8px;
`;

const DebugText = styled.pre`
  white-space: pre-wrap;
  font-size: 0.8rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-family: monospace;
`;

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ScheduleErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Schedule component error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });

    // Try to refresh the page data
    window.location.reload();
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorTitle>
            Schedule Error
          </ErrorTitle>

          <ErrorMessage>
            There was an error loading the schedule component. This could be due to a data loading issue or a temporary problem with the application.
          </ErrorMessage>

          <RetryButton onClick={this.handleRetry}>
            Retry Loading
          </RetryButton>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <DebugBox>
              <DebugTitle>
                Error Details (Dev Only):
              </DebugTitle>
              <DebugText>
                {this.state.error.toString()}
              </DebugText>
            </DebugBox>
          )}
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ScheduleErrorBoundary;
