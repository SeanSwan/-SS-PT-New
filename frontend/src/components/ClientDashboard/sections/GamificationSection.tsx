import React from 'react';
import { Box } from '@mui/material';

// Import the GamificationDashboard component
import GamificationDashboard from '../../Gamification/GamificationDashboard';

/**
 * GamificationSection Component
 * 
 * A wrapper component that integrates the GamificationDashboard
 * into the client dashboard layout.
 */
const GamificationSection: React.FC = () => {
  return (
    <Box>
      <GamificationDashboard />
    </Box>
  );
};

export default GamificationSection;