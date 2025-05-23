/**
 * Error Boundary for Schedule Components
 * This component catches errors in the Schedule components and provides a graceful fallback.
 */

import React, { Component } from 'react';
import { Box, Typography, Button } from '@mui/material';

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
        <Box 
          sx={{
            p: 4,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2,
            background: 'rgba(30, 30, 60, 0.3)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            minHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Typography variant="h5" sx={{ mb: 2, color: '#ff416c' }}>
            Schedule Error
          </Typography>
          
          <Typography variant="body1" sx={{ mb: 4, maxWidth: '600px' }}>
            There was an error loading the schedule component. This could be due to a data loading issue or a temporary problem with the application.
          </Typography>
          
          <Button 
            variant="contained" 
            color="primary" 
            onClick={this.handleRetry}
            sx={{ mb: 2 }}
          >
            Retry Loading
          </Button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <Box sx={{ mt: 3, p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 1, maxWidth: '100%', overflow: 'auto', textAlign: 'left' }}>
              <Typography variant="subtitle2" sx={{ color: '#ff416c', mb: 1 }}>
                Error Details (Dev Only):
              </Typography>
              <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.8rem' }}>
                {this.state.error.toString()}
              </Typography>
            </Box>
          )}
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ScheduleErrorBoundary;