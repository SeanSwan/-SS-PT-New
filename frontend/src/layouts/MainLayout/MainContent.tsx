// src/layouts/MainLayout/MainContent.tsx
import React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// Import UI components
import Breadcrumbs from '../../components/ui/Breadcrumbs';

interface MainContentProps {
  withExternalHeader: boolean;
  drawerOpen: boolean;
  borderRadius: number;
  content: React.ReactNode;
}

/**
 * MainContent component for the main layout
 * Manages the content area with responsive styling
 */
const MainContent: React.FC<MainContentProps> = ({
  withExternalHeader,
  drawerOpen,
  borderRadius,
  content
}) => {
  const theme = useTheme();
  
  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        pt: withExternalHeader ? 0 : 0,
        width: { xs: '100%', md: drawerOpen ? 'calc(100% - 220px)' : '100%' },
        ml: { xs: 0, md: drawerOpen ? '220px' : 0 },
        transition: theme => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.easeOut,
          duration: theme.transitions.duration.enteringScreen
        }),
        backgroundColor: theme.palette.background.default,
        borderRadius: `${borderRadius}px`,
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      <Box sx={{ 
        px: { xs: 1, sm: 2, md: 3 }, // Responsive padding
        minHeight: 'calc(100vh - 64px)', // Adjusted without footer
        display: 'flex', 
        flexDirection: 'column',
        // Adjust top margin based on whether using external header
        mt: withExternalHeader ? 0 : '64px'
      }}>
        {/* Breadcrumb navigation */}
        <Breadcrumbs />
        
        {/* Main content */}
        <Box sx={{ 
          flex: 1,
          py: 1, // Minimal vertical padding
          px: 0, // No horizontal padding to maximize width
          // Add a subtle background for content area in training app
          bgcolor: 'background.paper',
          borderRadius: `${borderRadius}px`,
          boxShadow: theme.palette.mode === 'dark' ? 0 : 1,
          overflow: 'hidden',
          width: '100%', // Ensure full width usage
          maxWidth: '100vw', // Use full viewport width
          boxSizing: 'border-box' // Include padding in width calculation
        }}>
          {content}
        </Box>
      </Box>
    </Box>
  );
};

export default MainContent;
