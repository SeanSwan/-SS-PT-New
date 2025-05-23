/**
 * Error Boundary Component
 * 
 * A React error boundary component for gracefully handling errors
 * in the MCP integration and other components.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { AlertTriangle } from 'lucide-react';

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
        <Paper
          elevation={3}
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
              Something went wrong
            </Typography>
          </Box>

          <Typography variant="body1" paragraph>
            An error occurred while loading this component. This might be due to connection issues
            with the MCP servers or temporary data errors.
          </Typography>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box
              sx={{
                p: 1,
                mb: 2,
                bgcolor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: 1,
                overflow: 'auto',
                maxHeight: '200px'
              }}
            >
              <Typography variant="caption" component="pre" sx={{ fontFamily: 'monospace' }}>
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </Typography>
            </Box>
          )}

          <Button variant="contained" color="primary" onClick={this.handleReset}>
            Try Again
          </Button>
        </Paper>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;