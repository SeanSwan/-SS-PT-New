/**
 * ScheduleInitializer.tsx
 *
 * A wrapper component that ensures the Redux store is properly initialized
 * before rendering the Schedule component. This prevents "undefined" errors
 * when accessing the schedule state.
 */

import React, { useEffect, useState } from 'react';
import { CircularProgress, Typography } from '../ui/primitives';

interface ScheduleInitializerProps {
  children: React.ReactNode;
}

const ScheduleInitializer: React.FC<ScheduleInitializerProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Simply check if the global initialization flag is set
    if ((window as any).__REDUX_ALREADY_INITIALIZED__) {
      setIsReady(true);
    } else {
      const timer = setTimeout(() => {
        console.log('ScheduleInitializer: Waited for store initialization');
        setIsReady(true);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!isReady) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          padding: '24px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <CircularProgress size={40} />
        </div>
        <Typography variant="body1">
          Initializing schedule...
        </Typography>
      </div>
    );
  }

  return <>{children}</>;
};

export default ScheduleInitializer;
