/**
 * sidebar.tsx
 * Main sidebar/drawer component for the dashboard layout
 */
import React, { memo, useMemo } from 'react';

// Material UI components
import { styled, ThemeProvider, createTheme, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Third-party components
import PerfectScrollbar from 'react-perfect-scrollbar';

// Project components - corrected imports based on file tree
import MenuCard from './MenuCard/menu-card';
import MenuList from '../../MenuList/menu-list';
import LogoSection from '../LogoSection/logo-section';
import MiniDrawerStyled from './mini-drawer-styled';

// Hooks and utilities
import { useMenuState, useMenuActions } from '../../../../hooks/useMenuState';

// Define a constant for drawer width
const drawerWidth = 260;

// Default theme fallback to prevent null errors
const defaultTheme = createTheme();

// Props interface
interface SidebarProps {
  miniDrawer?: boolean;
}

/**
 * Sidebar Component
 * 
 * Main navigation drawer that displays the app's menu items
 */
const Sidebar: React.FC<SidebarProps> = ({ miniDrawer = false }) => {
  // Try to get the theme, fall back to default if not available
  let appTheme;
  try {
    appTheme = useTheme();
  } catch (error) {
    console.warn('Theme context not available, using default theme');
    appTheme = defaultTheme;
  }

  // Use the theme with fallback
  const theme = appTheme || defaultTheme;
  
  // Safe media query with theme fallback
  const downMD = useMediaQuery(theme.breakpoints.down('md'), {
    defaultMatches: false,
    noSsr: true
  });

  // Get menu state with error handling
  let drawerOpen = true; // Default value
  try {
    const menuState = useMenuState();
    drawerOpen = menuState?.isDashboardDrawerOpened !== undefined 
      ? menuState.isDashboardDrawerOpened 
      : true;
  } catch (error) {
    console.warn('Menu state unavailable, using default open state');
  }

  // Get menu actions with error handling
  let handleDrawerOpen = (state: boolean) => {}; // Default no-op function
  try {
    const actions = useMenuActions();
    if (actions && typeof actions.handleDrawerOpen === 'function') {
      handleDrawerOpen = actions.handleDrawerOpen;
    }
  } catch (error) {
    console.warn('Menu actions unavailable');
  }

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
    const drawerSX = drawerOpen
      ? { 
          paddingLeft: '16px', 
          paddingRight: '16px', 
          marginTop: '0px' 
        }
      : { 
          paddingLeft: '0px', 
          paddingRight: '0px', 
          marginTop: '20px' 
        };

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
  }, [downMD, drawerOpen]);

  // Wrap the component with ThemeProvider as a safety measure
  return (
    <ThemeProvider theme={theme}>
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
    </ThemeProvider>
  );
};

export default memo(Sidebar);