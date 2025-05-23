/**
 * error-boundary.tsx
 * Error boundary component for route errors
 */
import React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

// material-ui
import Alert from '@mui/material/Alert';

// Error boundary component for handling routing errors
const ErrorBoundary: React.FC = () => {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    // Handle specific HTTP error codes
    switch (error.status) {
      case 404:
        return <Alert severity="error">Error 404 - This page doesn't exist!</Alert>;
      case 401:
        return <Alert severity="error">Error 401 - You aren't authorized to see this</Alert>;
      case 503:
        return <Alert severity="error">Error 503 - Looks like our API is down</Alert>;
      case 418:
        return <Alert severity="error">Error 418 - Contact administrator</Alert>;
      default:
        break;
    }
  }

  // Default error message
  return <Alert severity="error">Under Maintenance</Alert>;
};

export default ErrorBoundary;