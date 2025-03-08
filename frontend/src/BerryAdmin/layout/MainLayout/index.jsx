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
import Footer from './Footer';
import Header from './Header';
import Sidebar from './Sidebar';
import MainContentStyled from './MainContentStyled';
import Customization from '../Customization';
import Loader from '../../ui-component/Loader';
import Breadcrumbs from '../../ui-component/extended/Breadcrumbs';

import useConfig from '../../hooks/useConfig';
import { handlerDrawerOpen, useGetMenuMaster } from '../../api/menu';

// ==============================|| MAIN LAYOUT ||============================== //

// Define MainLayout component with default parameter instead of defaultProps
const MainLayout = ({ children = null, withExternalHeader = false }) => {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  
  // Using try/catch to handle potential errors with hooks
  let configData = { borderRadius: 8, miniDrawer: false };
  let menuData = { menuMaster: { isDashboardDrawerOpened: true }, menuMasterLoading: false };
  
  try {
    configData = useConfig() || configData;
  } catch (error) {
    console.error("Error in useConfig hook:", error);
  }
  
  try {
    menuData = useGetMenuMaster() || menuData;
  } catch (error) {
    console.error("Error in useGetMenuMaster hook:", error);
  }
  
  const { borderRadius, miniDrawer } = configData;
  const { menuMaster, menuMasterLoading } = menuData;
  const drawerOpen = menuMaster?.isDashboardDrawerOpened;
  
  useEffect(() => {
    try {
      handlerDrawerOpen(!miniDrawer);
    } catch (error) {
      console.error("Error in handlerDrawerOpen:", error);
    }
  }, [miniDrawer]);
  
  useEffect(() => {
    try {
      if (downMD) handlerDrawerOpen(false);
    } catch (error) {
      console.error("Error in downMD effect:", error);
    }
  }, [downMD]);
  
  // horizontal menu-list bar : drawer
  if (menuMasterLoading) return <Loader />;
  
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
        {...{ 
          borderRadius, 
          open: drawerOpen,
          withExternalHeader
        }}
      >
        <Box sx={{ 
          ...{ px: { xs: 0 } }, 
          minHeight: 'calc(100vh - 128px)', 
          display: 'flex', 
          flexDirection: 'column',
          // Adjust top margin based on whether using external header
          mt: withExternalHeader ? 0 : '64px'
        }}>
          {/* breadcrumb */}
          <Breadcrumbs />
          {content}
          <Footer />
        </Box>
      </MainContentStyled>
      <Customization />
    </Box>
  );
};

// Add prop types definition
MainLayout.propTypes = {
  children: PropTypes.node,
  withExternalHeader: PropTypes.bool
};

export default MainLayout;