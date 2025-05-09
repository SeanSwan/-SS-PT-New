import React from "react";
import { Box, Typography, Paper, Button } from "@mui/material";
import DummyTester from "./sections/DummyTester";

/**
 * EmergencyDashboard Component
 * 
 * A simplified dashboard to use when the main dashboard has import issues.
 */
const EmergencyDashboard = () => {
  return (
    <Box sx={{ 
      p: 4, 
      maxWidth: "1200px", 
      margin: "0 auto", 
      marginTop: "64px" 
    }}>
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Emergency Client Dashboard
        </Typography>
        
        <Typography variant="body1" paragraph>
          This is a simplified version of the dashboard that bypasses the complex component imports.
          If you can see this content, it means the basic routing and rendering is working.
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary"
          href="/client-dashboard"
          sx={{ mr: 2, mb: 2 }}
        >
          Try Standard Dashboard
        </Button>
        
        <Button 
          variant="outlined" 
          color="secondary"
          href="/"
        >
          Return Home
        </Button>
      </Paper>
      
      <DummyTester />
      
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Component Status
        </Typography>
        
        <Typography variant="body1">
          The display of this component confirms that React is working and the component system is functioning.
          The issue is likely with specific imported components or their paths.
        </Typography>
      </Paper>
    </Box>
  );
};

export default EmergencyDashboard;