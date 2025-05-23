import React from 'react';
import DevLoginPanel from './DevLoginPanel';
import DevToolsErrorBoundary from './DevToolsErrorBoundary';

/**
 * DevToolsProvider Component
 * 
 * A wrapper component that adds development tools to the application,
 * but only in development mode. Includes error boundary protection.
 */
const DevToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Check if we're in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return (
    <>
      {children}
      {isDevelopment && (
        <DevToolsErrorBoundary>
          <DevLoginPanel />
        </DevToolsErrorBoundary>
      )}
    </>
  );
};

export default DevToolsProvider;