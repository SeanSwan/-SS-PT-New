/**
 * CustomPackageErrorBoundary.tsx - Error Boundary for Custom Package Feature
 * ===========================================================================
 * React Error Boundary with graceful fallback UI and error reporting
 *
 * Features:
 * - Catches JavaScript errors anywhere in wizard tree
 * - Displays user-friendly error UI matching Galaxy-Swan theme
 * - Logs errors to monitoring service (optional)
 * - Provides "Try Again" functionality
 * - Mobile-optimized error messages
 *
 * AI Village: Error Handling Strategy by ChatGPT-5 (QA Lead)
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';

// ===================== INTERFACES =====================

interface Props {
  children: ReactNode;
  onReset?: () => void;
  fallbackComponent?: React.ComponentType<FallbackProps>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

interface FallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

// ===================== ERROR BOUNDARY COMPONENT =====================

export class CustomPackageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('CustomPackage Error Boundary caught an error:', error, errorInfo);

    // Update state with full error details
    this.setState({
      error,
      errorInfo
    });

    // Optional: Send to error monitoring service (Sentry, LogRocket, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // TODO: Integrate with error monitoring service
    // Example: Sentry.captureException(error, { extra: errorInfo });
    console.log('Error logged to monitoring service:', error.message);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });

    // Call optional onReset callback
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return (
          <FallbackComponent
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
          />
        );
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// ===================== DEFAULT FALLBACK UI =====================

const DefaultErrorFallback: React.FC<FallbackProps> = ({ error, resetError }) => {
  return (
    <ErrorContainer
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <ErrorIconContainer>
        <ErrorIcon>⚠️</ErrorIcon>
        <ErrorGlow />
      </ErrorIconContainer>

      <ErrorTitle>Oops! Something Went Wrong</ErrorTitle>

      <ErrorMessage>
        We encountered an unexpected error while building your custom package.
        Don't worry - your selections are safe!
      </ErrorMessage>

      {error && process.env.NODE_ENV === 'development' && (
        <ErrorDetails>
          <DetailsTitle>Error Details (Development Only):</DetailsTitle>
          <ErrorCode>{error.message}</ErrorCode>
        </ErrorDetails>
      )}

      <ErrorActions>
        <RetryButton onClick={resetError}>
          <ButtonIcon>🔄</ButtonIcon>
          <ButtonText>Try Again</ButtonText>
        </RetryButton>

        <SupportText>
          If the problem persists, please contact support at{' '}
          <SupportLink href="mailto:support@swanstudios.com">
            support@swanstudios.com
          </SupportLink>
        </SupportText>
      </ErrorActions>
    </ErrorContainer>
  );
};

// ===================== SPECIFIC ERROR COMPONENTS =====================

/**
 * Network Error Component - Displayed when API requests fail
 */
export const NetworkErrorMessage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorMessageBox type="network">
      <ErrorMessageIcon>🌐</ErrorMessageIcon>
      <ErrorMessageContent>
        <ErrorMessageTitle>Connection Error</ErrorMessageTitle>
        <ErrorMessageText>
          Unable to connect to our pricing service. Please check your internet connection.
        </ErrorMessageText>
        {onRetry && (
          <ErrorMessageAction onClick={onRetry}>
            Retry Connection
          </ErrorMessageAction>
        )}
      </ErrorMessageContent>
    </ErrorMessageBox>
  );
};

/**
 * Validation Error Component - Displayed for business rule violations
 */
export const ValidationErrorMessage: React.FC<{
  message: string;
  businessRule?: string;
}> = ({ message, businessRule }) => {
  return (
    <ErrorMessageBox type="validation">
      <ErrorMessageIcon>📋</ErrorMessageIcon>
      <ErrorMessageContent>
        <ErrorMessageTitle>Invalid Selection</ErrorMessageTitle>
        <ErrorMessageText>{message}</ErrorMessageText>
        {businessRule && (
          <ErrorMessageHint>💡 {businessRule}</ErrorMessageHint>
        )}
      </ErrorMessageContent>
    </ErrorMessageBox>
  );
};

/**
 * Pricing Error Component - Displayed when pricing calculation fails
 */
export const PricingErrorMessage: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => {
  return (
    <ErrorMessageBox type="pricing">
      <ErrorMessageIcon>💰</ErrorMessageIcon>
      <ErrorMessageContent>
        <ErrorMessageTitle>Pricing Unavailable</ErrorMessageTitle>
        <ErrorMessageText>
          We're having trouble calculating pricing right now. Please try again.
        </ErrorMessageText>
        {onRetry && (
          <ErrorMessageAction onClick={onRetry}>
            Recalculate Pricing
          </ErrorMessageAction>
        )}
      </ErrorMessageContent>
    </ErrorMessageBox>
  );
};

/**
 * Session Limit Error Component - Displayed when session count is out of bounds
 */
export const SessionLimitErrorMessage: React.FC<{
  min: number;
  max: number;
  current: number;
}> = ({ min, max, current }) => {
  const isBelow = current < min;
  const isAbove = current > max;

  return (
    <ErrorMessageBox type="validation">
      <ErrorMessageIcon>{isBelow ? '⬇️' : '⬆️'}</ErrorMessageIcon>
      <ErrorMessageContent>
        <ErrorMessageTitle>
          {isBelow ? 'Below Minimum Sessions' : 'Above Maximum Sessions'}
        </ErrorMessageTitle>
        <ErrorMessageText>
          {isBelow
            ? `Custom packages require at least ${min} sessions (you selected ${current})`
            : `Custom packages are limited to ${max} sessions (you selected ${current})`}
        </ErrorMessageText>
        <ErrorMessageHint>
          💡 {isBelow
            ? `This ensures profitability and allows us to provide you with quality training`
            : `For packages over ${max} sessions, please contact us for enterprise pricing`}
        </ErrorMessageHint>
      </ErrorMessageContent>
    </ErrorMessageBox>
  );
};

// ===================== ANIMATIONS =====================

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.05);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// ===================== STYLED COMPONENTS =====================

const ErrorContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  background: linear-gradient(135deg, #1e1e3f 0%, #0a0a0f 100%);
  border: 2px solid rgba(255, 65, 108, 0.3);
  border-radius: 20px;
  max-width: 600px;
  margin: 2rem auto;
  gap: 1.5rem;

  @media (max-width: 768px) {
    padding: 2rem 1.5rem;
    margin: 1rem;
  }
`;

const ErrorIconContainer = styled.div`
  position: relative;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ErrorIcon = styled.div`
  font-size: 4rem;
  animation: ${pulse} 2s ease-in-out infinite;
  z-index: 2;
`;

const ErrorGlow = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle,
    rgba(255, 65, 108, 0.3) 0%,
    transparent 70%
  );
  border-radius: 50%;
  animation: ${rotate} 4s linear infinite;
  z-index: 1;
`;

const ErrorTitle = styled.h2`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.75rem;
  color: #ff416d;
  margin: 0;
  text-align: center;
  text-shadow: 0 0 20px rgba(255, 65, 108, 0.5);

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const ErrorMessage = styled.p`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
  line-height: 1.6;
  margin: 0;
  max-width: 500px;

  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ErrorDetails = styled.div`
  background: rgba(255, 65, 108, 0.05);
  border: 1px solid rgba(255, 65, 108, 0.2);
  border-radius: 8px;
  padding: 1rem;
  width: 100%;
  max-width: 500px;
`;

const DetailsTitle = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-size: 0.9rem;
  color: #ff416d;
  margin-bottom: 0.5rem;
`;

const ErrorCode = styled.code`
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  display: block;
  overflow-x: auto;
`;

const ErrorActions = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  margin-top: 1rem;
`;

const RetryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #ff416d 0%, #9370DB 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 56px; /* WCAG AAA touch target */

  &:hover {
    transform: scale(1.05);
    box-shadow: 0 8px 30px rgba(255, 65, 108, 0.4);
  }

  &:active {
    transform: scale(0.98);
  }
`;

const ButtonIcon = styled.span`
  font-size: 1.5rem;
`;

const ButtonText = styled.span`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  color: #ffffff;
  font-weight: bold;
`;

const SupportText = styled.p`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
  margin: 0;
`;

const SupportLink = styled.a`
  color: #00ffff;
  text-decoration: none;
  transition: color 0.3s ease;

  &:hover {
    color: #66ffff;
    text-decoration: underline;
  }
`;

// ===================== ERROR MESSAGE BOX STYLES =====================

const ErrorMessageBox = styled.div<{ type: 'network' | 'validation' | 'pricing' }>`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  background: ${props =>
    props.type === 'network'
      ? 'rgba(255, 193, 7, 0.1)'
      : props.type === 'validation'
      ? 'rgba(255, 152, 0, 0.1)'
      : 'rgba(255, 65, 108, 0.1)'};
  border: 2px solid ${props =>
    props.type === 'network'
      ? 'rgba(255, 193, 7, 0.3)'
      : props.type === 'validation'
      ? 'rgba(255, 152, 0, 0.3)'
      : 'rgba(255, 65, 108, 0.3)'};
  border-radius: 12px;
  margin: 1rem 0;
  animation: ${pulse} 2s ease-in-out;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
`;

const ErrorMessageIcon = styled.div`
  font-size: 2rem;
  flex-shrink: 0;
`;

const ErrorMessageContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
`;

const ErrorMessageTitle = styled.div`
  font-family: 'Orbitron', sans-serif;
  font-size: 1.1rem;
  font-weight: bold;
  color: #ffffff;
`;

const ErrorMessageText = styled.div`
  font-family: 'Rajdhani', sans-serif;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.5;
`;

const ErrorMessageHint = styled.div`
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  margin-top: 0.25rem;
`;

const ErrorMessageAction = styled.button`
  align-self: flex-start;
  padding: 0.5rem 1rem;
  background: rgba(0, 255, 255, 0.2);
  border: 1px solid #00ffff;
  border-radius: 8px;
  color: #00ffff;
  font-family: 'Rajdhani', sans-serif;
  font-size: 0.95rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;

  &:hover {
    background: rgba(0, 255, 255, 0.3);
    box-shadow: 0 4px 15px rgba(0, 255, 255, 0.3);
  }

  @media (max-width: 768px) {
    align-self: center;
  }
`;

export default CustomPackageErrorBoundary;
