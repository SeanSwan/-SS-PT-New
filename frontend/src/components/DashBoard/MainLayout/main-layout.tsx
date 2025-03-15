// src/components/DashBoard/MainLayout/main-layout.tsx
import { useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';

// project imports
import Footer from '../../Footer/Footer'; // Import your new footer component
import Header from '../../Header/header';
import Sidebar from '../SideBar/sidebar';
import MainContentStyled from './main-content-styled';
import Customization from '../Customization/customization';
import Loader from '../../../ui/Loader';
import Breadcrumbs from '../../../ui-component/extended/Breadcrumbs';

import { useConfig } from '../../../hooks/useConfig';
import { useMenuActions, useMenuState } from '../../../hooks/useMenuState';

// ==============================|| MAIN LAYOUT ||============================== //

interface MainLayoutProps {
  children?: React.ReactNode;
  withExternalHeader?: boolean;
}

const MainLayout = ({ children = null, withExternalHeader = false }: MainLayoutProps) => {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  
  // Using try/catch to handle potential errors with hooks
  let configData = { borderRadius: 8, miniDrawer: false };
  let menuData = { isDashboardDrawerOpened: true };
  let isLoading = false;
  
  try {
    configData = useConfig() || configData;
  } catch (error) {
    console.error("Error in useConfig hook:", error);
  }
  
  try {
    menuData = useMenuState() || menuData;
    isLoading = false; // Set loading state as needed
  } catch (error) {
    console.error("Error in useMenuState hook:", error);
  }
  
  const { handleDrawerOpen } = useMenuActions();
  const { borderRadius, miniDrawer } = configData;
  const drawerOpen = menuData?.isDashboardDrawerOpened;
  
  useEffect(() => {
    try {
      handleDrawerOpen(!miniDrawer);
    } catch (error) {
      console.error("Error in handlerDrawerOpen:", error);
    }
  }, [miniDrawer, handleDrawerOpen]);
  
  useEffect(() => {
    try {
      if (downMD) handleDrawerOpen(false);
    } catch (error) {
      console.error("Error in downMD effect:", error);
    }
  }, [downMD, handleDrawerOpen]);
  
  // horizontal menu-list bar : drawer
  if (isLoading) return <Loader />;
  
  // Content to render - either children or Outlet
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
    <Box sx={{ display: 'flex' }}>
      {/* header - only render if not using external header */}
      {!withExternalHeader && (
        <AppBar 
          enableColorOnDark 
          position="fixed" 
          color="inherit" 
          elevation={0} 
          sx={{ bgcolor: 'background.default' }}
        >
          <Toolbar sx={{ p: 2 }}>
            <Header />
          </Toolbar>
        </AppBar>
      )}
      
      {/* menu / drawer */}
      <Sidebar />
      
      {/* main content */}
      <MainContentStyled 
        borderRadius={borderRadius}
        open={drawerOpen}
        withExternalHeader={withExternalHeader}
      >
        <Box sx={{ 
          px: { xs: 0 },
          minHeight: 'calc(100vh - 128px)', 
          display: 'flex', 
          flexDirection: 'column',
          // Adjust top margin based on whether using external header
          mt: withExternalHeader ? 0 : '64px'
        }}>
          {/* breadcrumb */}
          <Breadcrumbs />
          <Box sx={{ flex: 1 }}>
            {content}
          </Box>
          <Footer />
        </Box>
      </MainContentStyled>
      <Customization />
    </Box>
  );
};

export default MainLayout;