// src/components/DashBoard/MainLayout/main-layout.tsx
import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';

// project imports
import Header from '../../Header/header';
import Sidebar from './SideBar/sidebar';
import { ScrollToTop } from '../../common';

// Import custom Breadcrumbs component
import Breadcrumbs from '../../ui/Breadcrumbs';
import Loader from '../../ui/loader';

// Hooks - Fixed useConfig import and usage
import useConfig from '../../../hooks/useConfig';
import { useMenuActions, useMenuState } from '../../../hooks/useMenuState';

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
 * Primary layout component that provides the structure for the admin dashboard,
 * including header, sidebar, content area. Footer has been removed to provide
 * more space for widgets as per client request.
 * 
 * Enhanced for personal training application with:
 * - Improved responsive layout for mobile devices
 * - Optimized navigation for fitness professionals
 * - Support for training session tracking
 * - Removed footer for more content space
 */
const MainLayout = ({ children = null, withExternalHeader = false }: MainLayoutProps) => {
  const theme = useTheme();
  const downMD = useMediaQuery(theme.breakpoints.down('md'));
  const [isLoading, setIsLoading] = useState(false);
  
  // For personal training app - track if there's an active session
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  
  // Use a fixed miniDrawer value since it's not in your useConfig
  const miniDrawer = false;
  
  // Safely get borderRadius from config or use default
  let borderRadius = DEFAULT_BORDER_RADIUS;
  try {
    const config = useConfig();
    // Only access properties we know exist in the config
    if (config && typeof config.borderRadius === 'number') {
      borderRadius = config.borderRadius;
    }
  } catch (error) {
    console.error("Error accessing useConfig hook:", error);
  }
  
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
  
  // Show loader if content is loading
  if (isLoading) return <Loader />;
  
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
      {!withExternalHeader && (
        <AppBar 
          enableColorOnDark 
          position="fixed" 
          color="inherit" 
          elevation={0} 
          sx={{ 
            bgcolor: hasActiveSession ? (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(76, 175, 80, 0.15)' // Green tint in dark mode for active session
              : 'rgba(76, 175, 80, 0.07)' // Green tint in light mode for active session
            : 'background.default',
            zIndex: theme.zIndex.drawer + 1, // Ensure header is above sidebar
            width: '100%'
          }}
        >
          <Toolbar sx={{ p: 2 }}>
            <Header />
            
            {/* Optional: Display active session indicator in header */}
            {hasActiveSession && activeClientId && (
              <Box sx={{ 
                ml: 2, 
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                py: 0.5,
                px: 1.5,
                borderRadius: 1,
                bgcolor: 'success.light',
                color: 'success.contrastText'
              }}>
                <Box component="span" sx={{ fontWeight: 'medium', mr: 1 }}>
                  Active Session:
                </Box>
                Client #{activeClientId}
              </Box>
            )}
          </Toolbar>
        </AppBar>
      )}
      
      {/* Sidebar navigation - passing miniDrawer prop */}
      <Sidebar miniDrawer={miniDrawer} />
      
      {/* Main content area - using direct Box instead of styled component for better flexibility */}
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
          backgroundColor: 'transparent', // Remove background to eliminate color gap
          position: 'relative',
          boxSizing: 'border-box'
        }}
      >
        <Box sx={{ 
          px: 0, // Remove horizontal padding to eliminate gap
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
            py: 0, // Remove vertical padding to eliminate gaps
            px: 0, // No horizontal padding to maximize width
            bgcolor: 'transparent', // Remove background to eliminate color
            overflow: 'hidden',
            width: '100%', // Ensure full width usage
            maxWidth: '100vw', // Use full viewport width
            boxSizing: 'border-box' // Include padding in width calculation
          }}>
            {content}
          </Box>
          
          {/* Footer removed to provide more space for widgets */}
        </Box>
      </Box>
      
      {/* Scroll to top button */}
      <ScrollToTop 
        theme="cosmic"
        size="medium"
        scrollThreshold={500}
        onScrollToTop={() => {
          // Optional: Add analytics tracking for admin dashboard
          console.log('Admin dashboard scroll to top clicked');
        }}
      />
    </Box>
  );
};

export default MainLayout;