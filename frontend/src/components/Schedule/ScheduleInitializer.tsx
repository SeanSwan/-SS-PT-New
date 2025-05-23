/**
 * ScheduleInitializer.tsx
 * 
 * A wrapper component that ensures the Redux store is properly initialized
 * before rendering the Schedule component. This prevents "undefined" errors
 * when accessing the schedule state.
 */

import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface ScheduleInitializerProps {
  children: React.ReactNode;
}

const ScheduleInitializer: React.FC<ScheduleInitializerProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Simply check if the global initialization flag is set
    if (window.__REDUX_ALREADY_INITIALIZED__) {
      // If already initialized by oneTimeInitializer.js, we're good to go
      setIsReady(true);
    } else {
      // Short timeout to give the one-time initializer a chance to run
      const timer = setTimeout(() => {
        console.log('ScheduleInitializer: Waited for store initialization');
        setIsReady(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // If not ready yet, show loading indicator
  if (!isReady) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '300px',
          p: 3,
        }}
      >
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1">
          Initializing schedule...
        </Typography>
      </Box>
    );
  }
  
  // If initialization complete, render children
  return <>{children}</>;
};

export default ScheduleInitializer;