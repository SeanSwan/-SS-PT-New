/**
 * MCP Integration Wrapper
 * 
 * A wrapper component that provides MCP integration capabilities
 * with error handling and loading states.
 */

import React from 'react';
import { Box, CircularProgress, Typography, Paper, Alert, Button, Backdrop } from '@mui/material';
import { AlertTriangle, Wifi, WifiOff, RefreshCw as RefreshIcon } from 'lucide-react';
import ErrorBoundary from '../../utils/error-boundary';
import { McpServerStatus, getMcpStatusMessage, hasMcpFunctionality } from '../../utils/mcp-utils';

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

/**
 * Wrapper component for MCP integration
 * Handles loading states, errors, and MCP server status
 */
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
  // Check if we have the required functionality
  const hasFunctionality = requireFullFunctionality 
    ? mcpStatus.workout && mcpStatus.gamification 
    : hasMcpFunctionality(mcpStatus);
  
  // Render loading state
  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={4}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {loadingMessage}
        </Typography>
      </Box>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          m: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(244, 67, 54, 0.05)',
          border: '1px solid rgba(244, 67, 54, 0.2)'
        }}
      >
        <Box display="flex" alignItems="center" mb={2}>
          <AlertTriangle color="#f44336" size={24} style={{ marginRight: '8px' }} />
          <Typography variant="h6" color="error">
            Error
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          {error}
        </Typography>
        
        {onRetry && (
          <Box mt={2}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={onRetry}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          </Box>
        )}
      </Paper>
    );
  }
  
  // Render MCP offline state if required functionality is missing
  if (!hasFunctionality) {
    // Use fallback UI if provided
    if (fallbackUI) {
      return (
        <>
          <Alert 
            severity="warning" 
            icon={<WifiOff size={18} />} 
            sx={{ mb: 2 }}
          >
            {getMcpStatusMessage(mcpStatus)}
          </Alert>
          {fallbackUI}
        </>
      );
    }
    
    // Default offline state
    return (
      <Paper
        elevation={2}
        sx={{
          p: 3,
          m: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 152, 0, 0.05)',
          border: '1px solid rgba(255, 152, 0, 0.2)'
        }}
      >
        <Box display="flex" alignItems="center" mb={2}>
          <WifiOff color="#ff9800" size={24} style={{ marginRight: '8px' }} />
          <Typography variant="h6" color="warning.main">
            MCP Servers Offline
          </Typography>
        </Box>
        
        <Typography variant="body1" paragraph>
          {getMcpStatusMessage(mcpStatus)}
        </Typography>
        
        <Typography variant="body2" color="text.secondary">
          The application is currently operating in offline mode with limited functionality.
          Please check your connection or try again later.
        </Typography>
        
        {onRetry && (
          <Box mt={2}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={onRetry}
              startIcon={<RefreshIcon />}
              sx={{ mr: 1 }}
            >
              Retry Connection
            </Button>
            
            <Button 
              variant="outlined" 
              color="inherit" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Box>
        )}
      </Paper>
    );
  }
  
  // Render partial functionality notification
  if (mcpStatus.workout && !mcpStatus.gamification && !requireFullFunctionality) {
    return (
      <>
        <Alert 
          severity="info" 
          icon={<Wifi size={18} />} 
          sx={{ mb: 2 }}
        >
          Basic MCP functionality is available, but gamification features are limited.
        </Alert>
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