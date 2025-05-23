// src/layouts/MainLayout/MainLayout.tsx
import React, { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';

// Import components
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

// Import hooks
import useConfig from '../../hooks/useConfig';
import { useMenuActions, useMenuState } from '../../hooks/useMenuState';

// Constants
const DEFAULT_BORDER_RADIUS = 8;

// Types
interface MainLayoutProps {
  children?: React.ReactNode;
  withExternalHeader?: boolean;
}

/**
 * MainLayout Component
 * 
 * Primary layout component that provides the structure for the application,
 * including header, sidebar, and content area.
 * 
 * Enhanced for personal training application with improved responsive layout
 */
const MainLayout: React.FC<MainLayoutProps> = ({ 
  children = null, 
  withExternalHeader = false 
}) => {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  
  // Safely get borderRadius from config or use default
  let borderRadius = DEFAULT_BORDER_RADIUS;
  try {
    const config = useConfig();
    if (config && typeof config.borderRadius === 'number') {
      borderRadius = config.borderRadius;
    }
  } catch (error) {
    console.error("Error accessing useConfig hook:", error);
  }
  
  // Use a fixed miniDrawer value
  const miniDrawer = false;
  
  // Get menu state with proper error handling
  let drawerOpen = true; // Default value
  try {
    const menuData = useMenuState();
    drawerOpen = menuData.isDashboardDrawerOpened;
  } catch (error) {
    console.error("Error accessing useMenuState hook:", error);
  }
  
  // Get menu actions with proper error handling
  let handleDrawerOpen = (state: boolean) => {}; // Default no-op function
  try {
    const actions = useMenuActions();
    handleDrawerOpen = actions.handleDrawerOpen;
  } catch (error) {
    console.error("Error accessing useMenuActions hook:", error);
  }
  
  // Effect to handle drawer state based on miniDrawer setting
  useEffect(() => {
    try {
      handleDrawerOpen(!miniDrawer);
    } catch (error) {
      console.error("Error in drawer open effect:", error);
    }
  }, [miniDrawer, handleDrawerOpen]);
  
  // Effect to close drawer on mobile devices
  useEffect(() => {
    try {
      if (downMD) handleDrawerOpen(false);
    } catch (error) {
      console.error("Error in responsive drawer effect:", error);
    }
  }, [downMD, handleDrawerOpen]);
  
  // Memoized content to prevent unnecessary re-renders
  const content = useMemo(() => {
    return (
      <>
        {/* Render outlet for nested routes */}
        <Outlet />
        
        {/* Render children if provided */}
        {children}
      </>
    );
  }, [children]);
  
  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh', position: 'relative' }}>
      <CssBaseline />
      
      {/* Header - only rendered if not using external header */}
      {!withExternalHeader && <Header drawerOpen={drawerOpen} />}
      
      {/* Sidebar navigation */}
      <Sidebar 
        miniDrawer={miniDrawer} 
        drawerOpen={drawerOpen} 
        handleDrawerOpen={handleDrawerOpen} 
      />
      
      {/* Main content area */}
      <MainContent 
        withExternalHeader={withExternalHeader}
        drawerOpen={drawerOpen}
        borderRadius={borderRadius}
        content={content}
      />
    </Box>
  );
};

export default MainLayout;
