import React from 'react';
import { Box, Typography, Breadcrumbs, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import BugReportIcon from '@mui/icons-material/BugReport';
import HomeIcon from '@mui/icons-material/Home';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

// Import our CrossDashboardDebugger
import CrossDashboardDebugger from '../../../DevTools/CrossDashboardDebugger';

/**
 * AdminDebugPage
 * 
 * A dedicated page for the admin dashboard that provides access to the
 * cross-dashboard debugging tools.
 */
const AdminDebugPage: React.FC = () => {
  return (
    <Box sx={{ p: 3 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs 
        separator={<NavigateNextIcon fontSize="small" />} 
        aria-label="breadcrumb"
        sx={{ mb: 3 }}
      >
        <Link 
          component={RouterLink} 
          to="/dashboard"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          Dashboard
        </Link>
        <Link 
          component={RouterLink} 
          to="/dashboard/admin"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          Admin
        </Link>
        <Typography 
          sx={{ display: 'flex', alignItems: 'center' }}
          color="text.primary"
        >
          <BugReportIcon sx={{ mr: 0.5 }} fontSize="inherit" />
          System Diagnostics
        </Typography>
      </Breadcrumbs>
      
      {/* Page Title */}
      <Typography variant="h4" gutterBottom>
        System Diagnostics Dashboard
      </Typography>
      
      <Typography variant="body1" paragraph>
        This tool helps diagnose and fix issues with data sharing between client, admin, and trainer dashboards.
        Use it to ensure sessions, notifications, and gamification data are properly synchronized.
      </Typography>
      
      {/* Cross-Dashboard Debugger Component */}
      <CrossDashboardDebugger />
    </Box>
  );
};

export default AdminDebugPage;
