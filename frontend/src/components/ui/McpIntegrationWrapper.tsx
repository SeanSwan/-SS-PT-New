/**
 * MCP Integration Wrapper
 *
 * A wrapper component that provides MCP integration capabilities
 * with error handling and loading states.
 */

import React from 'react';
import styled, { keyframes } from 'styled-components';
import { AlertTriangle, Wifi, WifiOff, RefreshCw as RefreshIcon } from 'lucide-react';
import ErrorBoundary from '../../utils/error-boundary';
import { McpServerStatus, getMcpStatusMessage, hasMcpFunctionality } from '../../utils/mcp-utils';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00ffff;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
  margin-top: 16px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
`;

const StatusPaper = styled.div<{ $variant: 'error' | 'warning' }>`
  padding: 24px;
  margin: 16px;
  border-radius: 8px;
  background-color: ${props => props.$variant === 'error'
    ? 'rgba(244, 67, 54, 0.05)'
    : 'rgba(255, 152, 0, 0.05)'};
  border: 1px solid ${props => props.$variant === 'error'
    ? 'rgba(244, 67, 54, 0.2)'
    : 'rgba(255, 152, 0, 0.2)'};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const StatusTitle = styled.h6<{ $color: string }>`
  color: ${props => props.$color};
  font-size: 1.25rem;
  font-weight: 500;
  margin: 0;
`;

const StatusMessage = styled.p`
  font-size: 1rem;
  margin: 0 0 16px;
  color: rgba(255, 255, 255, 0.9);
`;

const StatusSubtext = styled.p`
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
`;

const ButtonRow = styled.div`
  margin-top: 16px;
  display: flex;
  gap: 8px;
`;

const PrimaryButton = styled.button`
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
    transform: translateY(-1px);
  }
`;

const SecondaryButton = styled.button`
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.5);
  }
`;

const AlertBanner = styled.div<{ $severity: 'warning' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  background-color: ${props => props.$severity === 'warning'
    ? 'rgba(255, 152, 0, 0.1)'
    : 'rgba(41, 182, 246, 0.1)'};
  border: 1px solid ${props => props.$severity === 'warning'
    ? 'rgba(255, 152, 0, 0.3)'
    : 'rgba(41, 182, 246, 0.3)'};
  color: ${props => props.$severity === 'warning'
    ? '#ff9800'
    : '#29b6f6'};
`;

interface McpIntegrationWrapperProps {
  children: React.ReactNode;
  loading: boolean;
  mcpStatus: McpServerStatus;
  error?: string | null;
  requireFullFunctionality?: boolean;
  loadingMessage?: string;
  fallbackUI?: React.ReactNode;
  onRetry?: () => void;
}

const McpIntegrationWrapper: React.FC<McpIntegrationWrapperProps> = ({
  children,
  loading,
  mcpStatus,
  error = null,
  requireFullFunctionality = false,
  loadingMessage = 'Loading data from MCP servers...',
  fallbackUI,
  onRetry
}) => {
  const hasFunctionality = requireFullFunctionality
    ? mcpStatus.workout && mcpStatus.gamification
    : hasMcpFunctionality(mcpStatus);

  // Render loading state
  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <LoadingText>{loadingMessage}</LoadingText>
      </LoadingContainer>
    );
  }

  // Render error state
  if (error) {
    return (
      <StatusPaper $variant="error">
        <StatusHeader>
          <AlertTriangle color="#f44336" size={24} style={{ marginRight: '8px' }} />
          <StatusTitle $color="#f44336">Error</StatusTitle>
        </StatusHeader>

        <StatusMessage>{error}</StatusMessage>

        {onRetry && (
          <ButtonRow>
            <PrimaryButton onClick={onRetry}>
              <RefreshIcon size={16} />
              Retry
            </PrimaryButton>
          </ButtonRow>
        )}
      </StatusPaper>
    );
  }

  // Render MCP offline state if required functionality is missing
  if (!hasFunctionality) {
    if (fallbackUI) {
      return (
        <>
          <AlertBanner $severity="warning">
            <WifiOff size={18} />
            {getMcpStatusMessage(mcpStatus)}
          </AlertBanner>
          {fallbackUI}
        </>
      );
    }

    return (
      <StatusPaper $variant="warning">
        <StatusHeader>
          <WifiOff color="#ff9800" size={24} style={{ marginRight: '8px' }} />
          <StatusTitle $color="#ff9800">MCP Servers Offline</StatusTitle>
        </StatusHeader>

        <StatusMessage>{getMcpStatusMessage(mcpStatus)}</StatusMessage>

        <StatusSubtext>
          The application is currently operating in offline mode with limited functionality.
          Please check your connection or try again later.
        </StatusSubtext>

        {onRetry && (
          <ButtonRow>
            <PrimaryButton onClick={onRetry}>
              <RefreshIcon size={16} />
              Retry Connection
            </PrimaryButton>
            <SecondaryButton onClick={() => window.location.reload()}>
              Refresh Page
            </SecondaryButton>
          </ButtonRow>
        )}
      </StatusPaper>
    );
  }

  // Render partial functionality notification
  if (mcpStatus.workout && !mcpStatus.gamification && !requireFullFunctionality) {
    return (
      <>
        <AlertBanner $severity="info">
          <Wifi size={18} />
          Basic MCP functionality is available, but gamification features are limited.
        </AlertBanner>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </>
    );
  }

  // Render normal state with error boundary
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
};

export default McpIntegrationWrapper;
