/**
 * BUILD OPTIMIZATION: Enhanced Error Boundary with Better Logging
 * =============================================================
 * Production-ready error boundary with comprehensive error tracking
 * and automatic recovery mechanisms.
 * 
 * BUILD TIMESTAMP: August 20, 2025 - 16:50 PST
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  buildTimestamp: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      buildTimestamp: new Date().toISOString()
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    console.error('🚨 ErrorBoundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary Details:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });

    this.setState({ error, errorInfo });

    // Send error to monitoring service (if available)
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true
      });
    }
  }

  handleRetry = () => {
    console.log(`🔄 ErrorBoundary retry attempt ${this.state.retryCount + 1}`);
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    console.log('🔄 ErrorBoundary triggering page reload');
    sessionStorage.clear();
    localStorage.removeItem('ums_mount_count');
    localStorage.removeItem('ums_init_failures');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorContent>
            <ErrorIcon>⚠️</ErrorIcon>
            <ErrorTitle>Oops! Something went wrong</ErrorTitle>
            <ErrorMessage>
              The application encountered an unexpected error. 
              {this.state.retryCount > 0 && ` (Retry attempt: ${this.state.retryCount})`}
            </ErrorMessage>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <ErrorDetails>
                <summary>Error Details (Development Mode)</summary>
                <pre>{this.state.error.message}</pre>
                <pre>{this.state.error.stack}</pre>
              </ErrorDetails>
            )}
            
            <ErrorActions>
              <RetryButton onClick={this.handleRetry}>
                Try Again
              </RetryButton>
              <ReloadButton onClick={this.handleReload}>
                Reload Page
              </ReloadButton>
            </ErrorActions>
            
            <BuildInfo>
              Build: {this.state.buildTimestamp.slice(0, 19)}
            </BuildInfo>
          </ErrorContent>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

// Enhanced Styled Components
const ErrorContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1e3a8a, #0891b2);
  color: white;
  padding: 2rem;
`;

const ErrorContent = styled.div`
  text-align: center;
  max-width: 500px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 3rem 2rem;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const ErrorIcon = styled.div`
  font-size: 4rem;
  margin-bottom: 1rem;
`;

const ErrorTitle = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1rem;
  font-weight: 600;
`;

const ErrorMessage = styled.p`
  margin-bottom: 2rem;
  opacity: 0.9;
  line-height: 1.6;
`;

const ErrorDetails = styled.details`
  margin-bottom: 2rem;
  text-align: left;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  
  summary {
    cursor: pointer;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  pre {
    font-size: 0.75rem;
    overflow-x: auto;
    margin: 0.5rem 0;
    background: rgba(0, 0, 0, 0.3);
    padding: 0.5rem;
    border-radius: 4px;
  }
`;

const ErrorActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
`;

const RetryButton = styled.button`
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }
`;

const ReloadButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
`;

const BuildInfo = styled.div`
  font-size: 0.75rem;
  opacity: 0.6;
  margin-top: 1rem;
`;
