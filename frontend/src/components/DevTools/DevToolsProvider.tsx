import React, { Suspense } from 'react';

const DevLoginPanel = import.meta.env.DEV
  ? React.lazy(() => import('./DevLoginPanel'))
  : null;
const DevToolsErrorBoundary = import.meta.env.DEV
  ? React.lazy(() => import('./DevToolsErrorBoundary'))
  : null;

/**
 * DevToolsProvider Component
 * 
 * A wrapper component that adds development tools to the application,
 * but only in development mode. Includes error boundary protection.
 */
const DevToolsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      {children}
      {DevLoginPanel && DevToolsErrorBoundary && (
        <Suspense fallback={null}>
          <DevToolsErrorBoundary>
            <DevLoginPanel />
          </DevToolsErrorBoundary>
        </Suspense>
      )}
    </>
  );
};

export default DevToolsProvider;
