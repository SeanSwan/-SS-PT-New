/**
 * loader.tsx
 * Linear progress loader for suspense fallbacks and loading states
 */
import React from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';

interface LoaderProps {
  /**
   * Optional color for the progress bar
   * @default "primary"
   */
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  
  /**
   * Optional custom styling
   */
  sx?: Record<string, any>;
}

/**
 * Loader component that displays a linear progress bar
 * Used for loading states and suspense fallbacks
 */
const Loader: React.FC<LoaderProps> = ({ 
  color = 'primary',
  sx
}) => {
  return (
    <Box 
      sx={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 1301, 
        width: '100%',
        ...sx
      }}
    >
      <LinearProgress color={color} />
    </Box>
  );
};

export default Loader;