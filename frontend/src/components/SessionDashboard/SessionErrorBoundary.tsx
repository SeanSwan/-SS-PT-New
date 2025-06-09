/**
 * SessionErrorBoundary.tsx
 * Production-grade error boundary for session management components
 * Provides graceful fallbacks while maintaining platform cohesion
 */

import React, { Component, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

// Animations
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

// Styled Components - Cohesive with existing platform design
const ErrorContainer = styled(motion.div)<{ $variant: 'compact' | 'full' }>`
  background: rgba(30, 30, 60, 0.95);
  border: 1px solid rgba(255, 107, 157, 0.3);
  border-radius: ${props => props.$variant === 'compact' ? '12px' : '20px'};
  padding: ${props => props.$variant === 'compact' ? '1rem' : '2rem'};
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.6s ease-out;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #ff6b9d, #ff4d6d, #ff6b9d);
    background-size: 200% 100%;
    animation: ${shimmer} 2s ease-in-out infinite;
  }
`;

const ErrorHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  
  .icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 8px rgba(255, 107, 157, 0.6));
  }
  
  .title {
    font-size: 1.25rem;
    font-weight: 600;
    background: linear-gradient(135deg, #ff6b9d, #ff4d6d);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    margin: 0;
  }
`;

const ErrorMessage = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
`;

const ErrorDetails = styled.details`
  margin-bottom: 1.5rem;
  
  summary {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.8rem;
    cursor: pointer;
    user-select: none;
    
    &:hover {
      color: rgba(255, 255, 255, 0.8);
    }
  }
  
  .details-content {
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
    white-space: pre-wrap;
    word-break: break-word;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
`;

const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' }>`
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.875rem;
  
  background: ${props => props.$variant === 'primary' 
    ? 'linear-gradient(135deg, #00ffff, #0080ff)'
    : 'rgba(255, 255, 255, 0.1)'
  };
  
  color: ${props => props.$variant === 'primary' ? '#000' : '#fff'};
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const FallbackContainer = styled.div`
  text-align: center;
  padding: 1rem 0;
  
  .fallback-message {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    font-style: italic;
    margin-bottom: 1rem;
  }
`;

// Error Types
interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

interface SessionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

interface SessionErrorBoundaryProps {
  children: ReactNode;
  /** Compact mode for smaller components like FloatingSessionWidget */
  variant?: 'compact' | 'full';
  /** Custom fallback component to render instead of default error UI */
  fallback?: ReactNode;
  /** Custom error handler for logging/reporting */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to show retry functionality */
  enableRetry?: boolean;
  /** Maximum number of retries before showing permanent error */
  maxRetries?: number;
  /** Custom context for better error reporting */
  context?: string;
}

/**
 * SessionErrorBoundary - Production-grade error boundary for session components
 * 
 * Integrates seamlessly with existing platform design and provides:
 * - Graceful error handling without crashing the entire dashboard
 * - User-friendly error messages with actionable feedback
 * - Retry functionality for transient errors
 * - Detailed error reporting for debugging
 * - Cohesive styling that matches platform theme
 */
class SessionErrorBoundary extends Component<SessionErrorBoundaryProps, SessionErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: SessionErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<SessionErrorBoundaryState> {
    // Generate unique error ID for tracking
    const errorId = `session_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    console.error('[SessionErrorBoundary] Error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      errorId: this.state.errorId
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo
    });

    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('[SessionErrorBoundary] Max retries reached, showing permanent error');
      return;
    }

    console.log(`[SessionErrorBoundary] Retrying... (${this.state.retryCount + 1}/${maxRetries})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, variant = 'full', fallback, enableRetry = true, maxRetries = 3 } = this.props;

    if (!hasError) {
      return children;
    }

    // Show custom fallback if provided
    if (fallback) {
      return fallback;
    }

    const canRetry = enableRetry && retryCount < maxRetries;
    const isTransientError = error?.message?.includes('Network') || 
                            error?.message?.includes('fetch') ||
                            error?.message?.includes('timeout');

    return (
      <ErrorContainer
        $variant={variant}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <ErrorHeader>
          <span className="icon">⚠️</span>
          <h3 className="title">
            {variant === 'compact' ? 'Session Error' : 'Session Management Error'}
          </h3>
        </ErrorHeader>

        <ErrorMessage>
          {variant === 'compact' ? (
            'Something went wrong with your session. You can try refreshing or continue using other features.'
          ) : (
            <>
              We encountered an issue with the session management system. 
              {isTransientError && ' This appears to be a temporary connectivity issue.'}
              {canRetry && ' You can try again, or refresh the page if the problem persists.'}
            </>
          )}
        </ErrorMessage>

        {variant === 'full' && (
          <ErrorDetails>
            <summary>Technical Details (for support)</summary>
            <div className="details-content">
              Error ID: {this.state.errorId}
              {'\n'}Error: {error?.message || 'Unknown error'}
              {'\n'}Context: {this.props.context || 'Session Management'}
              {'\n'}Retry Count: {retryCount}/{maxRetries}
              {process.env.NODE_ENV === 'development' && errorInfo && (
                '\n\nComponent Stack:' + errorInfo.componentStack
              )}
            </div>
          </ErrorDetails>
        )}

        <ActionButtons>
          {canRetry && (
            <ActionButton
              $variant="primary"
              onClick={this.handleRetry}
              whileTap={{ scale: 0.95 }}
            >
              🔄 Try Again
            </ActionButton>
          )}
          
          <ActionButton
            $variant="secondary"
            onClick={this.handleReload}
            whileTap={{ scale: 0.95 }}
          >
            🔃 Refresh Page
          </ActionButton>

          {variant === 'full' && (
            <ActionButton
              $variant="secondary"
              onClick={this.handleGoHome}
              whileTap={{ scale: 0.95 }}
            >
              🏠 Go Home
            </ActionButton>
          )}
        </ActionButtons>

        {!canRetry && retryCount >= maxRetries && (
          <FallbackContainer>
            <div className="fallback-message">
              If this issue persists, please contact support with Error ID: {this.state.errorId}
            </div>
          </FallbackContainer>
        )}
      </ErrorContainer>
    );
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }
}

export default SessionErrorBoundary;

// Convenience wrapper for common use cases
export const SessionErrorFallback: React.FC<{ error?: Error; context?: string }> = ({ error, context }) => (
  <ErrorContainer $variant="compact">
    <ErrorHeader>
      <span className="icon">😅</span>
      <h4 className="title">Oops!</h4>
    </ErrorHeader>
    <ErrorMessage>
      Session feature temporarily unavailable. Your data is safe!
    </ErrorMessage>
    <ActionButtons>
      <ActionButton
        $variant="primary"
        onClick={() => window.location.reload()}
        as={motion.button}
        whileTap={{ scale: 0.95 }}
      >
        🔄 Refresh
      </ActionButton>
    </ActionButtons>
  </ErrorContainer>
);
