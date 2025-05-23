import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

/**
 * DummyTester Component
 * 
 * This is a basic component to verify if our imports are working correctly.
 */
const DummyTester: React.FC = () => {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h4" gutterBottom>
        THIS IS A TEST COMPONENT - If you can see this, component loading works!
      </Typography>
      <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 2 }}>
        <Typography variant="body1">
          The component system is working, but there might be issues with the specific components.
        </Typography>
      </Box>
    </Paper>
  );
};

export default DummyTester;