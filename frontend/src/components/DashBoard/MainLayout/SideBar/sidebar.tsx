/**
 * sidebar.tsx
 * Main sidebar/drawer component for the dashboard layout
 */
import React, { memo, useMemo } from 'react';

// Material UI components
import useMediaQuery from '@mui/material/useMediaQuery';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { Theme } from '@mui/material/styles';

// Third-party components
import PerfectScrollbar from 'react-perfect-scrollbar';

// Project components - adjust these imports to match your file structure
import MenuCard from './menu-card';
import MenuList from '../MenuList/menu-list';
import LogoSection from '../LogoSection/logo-section';
import MiniDrawerStyled from './mini-drawer-styled';

// Hooks and utilities - adjust these imports to match your file structure
import { useConfig } from '../../../hooks/useConfig';
import { drawerWidth } from '../../../store/constants';

// API helpers - adjust these imports to match your file structure
// You'll need to create a proper type for menuMaster
interface MenuMaster {
  isDashboardDrawerOpened: boolean;
  // Add other properties as needed
}

interface MenuApi {
  menuMaster: MenuMaster;
}

// Mock these functions/hooks if they don't exist yet in your TypeScript version
const useGetMenuMaster = (): MenuApi => {
  // This should be replaced with your actual implementation
  return {
    menuMaster: {
      isDashboardDrawerOpened: true
    }
  };
};

const handlerDrawerOpen = (isOpen: boolean): void => {
  // This should be replaced with your actual implementation
  console.log('Drawer state changed:', isOpen);
};

/**
 * Sidebar Component
 * Main navigation drawer that displays the app's menu items
 */
const Sidebar: React.FC = () => {
  const downMD = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));

  const { menuMaster } = useGetMenuMaster();
  const drawerOpen = menuMaster.isDashboardDrawerOpened;

  const { miniDrawer, mode } = useConfig();

  // Memoized logo section to prevent unnecessary re-renders
  const logo = useMemo(
    () => (
      <Box sx={{ display: 'flex', p: 2 }}>
        <LogoSection />
      </Box>
    ),
    []
  );

  // Memoized drawer content for performance
  const drawer = useMemo(() => {
    const drawerContent = (
      <>
        <MenuCard />
        <Stack direction="row" sx={{ justifyContent: 'center', mb: 2 }}>
          <Chip 
            label={import.meta.env.VITE_APP_VERSION || 'v1.0.0'} 
            size="small" 
            color="default" 
          />
        </Stack>
      </>
    );

    // Adjust styling based on drawer state
    let drawerSX: React.CSSProperties = { 
      paddingLeft: '0px', 
      paddingRight: '0px', 
      marginTop: '20px' 
    };
    
    if (drawerOpen) {
      drawerSX = { 
        paddingLeft: '16px', 
        paddingRight: '16px', 
        marginTop: '0px' 
      };
    }

    return (
      <>
        {downMD ? (
          <Box sx={drawerSX}>
            <MenuList />
            {drawerOpen && drawerContent}
          </Box>
        ) : (
          <PerfectScrollbar style={{ height: 'calc(100vh - 88px)', ...drawerSX }}>
            <MenuList />
            {drawerOpen && drawerContent}
          </PerfectScrollbar>
        )}
      </>
    );
  }, [downMD, drawerOpen, mode]);

  return (
    <Box 
      component="nav" 
      sx={{ 
        flexShrink: { md: 0 }, 
        width: { xs: 'auto', md: drawerWidth } 
      }} 
      aria-label="navigation sidebar"
    >
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handlerDrawerOpen(!drawerOpen)}
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

export default memo(Sidebar);