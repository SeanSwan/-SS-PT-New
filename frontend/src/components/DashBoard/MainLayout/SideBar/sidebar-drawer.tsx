// src/components/DashBoard/MainLayout/Sidebar/sidebar-drawer.tsx
import { memo, useMemo } from 'react';

// Material-UI imports
import useMediaQuery from '@mui/material/useMediaQuery';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';

// Third party imports
import PerfectScrollbar from 'react-perfect-scrollbar';

// Project imports
import MenuCard from './MenuCard/menu-card';
import MenuList from '../../MenuList/menu-list';
import LogoSection from '../LogoSection/logo-section';
import MiniDrawerStyled from './mini-drawer-styled';

// Fixed import for useConfig - using default import
import useConfig from '../../../../hooks/useConfig';
import { useMenuActions, useMenuStates } from '../../../../hooks/useMenuState';

// Define constant for drawer width
const drawerWidth = 260;

/**
 * SidebarDrawer Component
 * 
 * Renders the sidebar navigation with drawer functionality.
 * Responsive design adjusts based on screen size and configuration.
 */
const SidebarDrawer = () => {
  const downMD = useMediaQuery((theme: any) => theme.breakpoints.down('md'));
  
  const { isDashboardDrawerOpened: drawerOpen } = useMenuStates();
  const { handleDrawerOpen } = useMenuActions();
  
  // Get configuration from context
  const config = useConfig();
  const { navType, borderRadius } = config;
  
  // Determine if mini drawer should be shown based on container setting
  // Using container as a proxy for miniDrawer since your config doesn't have miniDrawer
  const miniDrawer = config.container;
  
  // Logo section memoized to prevent unnecessary re-renders
  const logo = useMemo(
    () => (
      <Box sx={{ display: 'flex', p: 2 }}>
        <LogoSection />
      </Box>
    ),
    []
  );
  
  // Drawer content memoized to prevent unnecessary re-renders
  const drawer = useMemo(() => {
    const drawerContent = (
      <>
        <MenuCard />
        <Stack direction="row" sx={{ justifyContent: 'center', mb: 2 }}>
          <Chip label={import.meta.env.VITE_APP_VERSION || 'v1.0'} size="small" color="default" />
        </Stack>
      </>
    );
    
    // Styling based on drawer state
    let drawerSX = { paddingLeft: '0px', paddingRight: '0px', marginTop: '20px' };
    if (drawerOpen) drawerSX = { paddingLeft: '16px', paddingRight: '16px', marginTop: '0px' };
    
    return (
      <>
        {downMD ? (
          <Box sx={drawerSX}>
            <MenuList />
            {drawerOpen && drawerContent}
          </Box>
        ) : (
          <PerfectScrollbar style={{ height: 'calc(100vh - 88px)', ...(drawerSX as any) }}>
            <MenuList />
            {drawerOpen && drawerContent}
          </PerfectScrollbar>
        )}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downMD, drawerOpen, navType]);
  
  return (
    <Box 
      component="nav" 
      sx={{ 
        flexShrink: { md: 0 }, 
        width: { xs: 'auto', md: drawerWidth } 
      }} 
      aria-label="sidebar navigation"
    >
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handleDrawerOpen(!drawerOpen)}
          sx={{
            '& .MuiDrawer-paper': {
              mt: downMD ? 0 : 11,
              zIndex: 1099,
              width: drawerWidth,
              bgcolor: 'background.default',
              color: 'text.primary',
              borderRight: 'none'
            }
          }}
          ModalProps={{ keepMounted: true }}
          color="inherit"
        >
          {downMD && logo}
          {drawer}
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen}>
          {logo}
          {drawer}
        </MiniDrawerStyled>
      )}
    </Box>
  );
};

export default memo(SidebarDrawer);