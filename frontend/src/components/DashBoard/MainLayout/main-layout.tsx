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

// project imports - adjusted paths based on file tree
import Footer from '../../Footer/Footer';
import Header from '../../Header/header';
import Sidebar from './SideBar/sidebar';
import MainContentStyled from './main-content-styled';

// Import custom Breadcrumbs component - adjust the path as needed
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
 * including header, sidebar, content area, and footer.
 * 
 * Enhanced for personal training application with:
 * - Improved responsive layout for mobile devices
 * - Optimized navigation for fitness professionals
 * - Support for training session tracking
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
    if (menuData && typeof menuData.isDashboardDrawerOpened === 'boolean') {
      drawerOpen = menuData.isDashboardDrawerOpened;
    }
  } catch (error) {
    console.error("Error accessing useMenuState hook:", error);
  }
  
  // Get menu actions with proper error handling
  let handleDrawerOpen = (state: boolean) => {}; // Default no-op function
  try {
    const actions = useMenuActions();
    if (actions && typeof actions.handleDrawerOpen === 'function') {
      handleDrawerOpen = actions.handleDrawerOpen;
    }
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
    <Box sx={{ display: 'flex' }}>
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
            zIndex: theme.zIndex.drawer + 1 // Ensure header is above sidebar
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
      
      {/* Main content area */}
      <MainContentStyled 
        borderRadius={borderRadius}
        open={drawerOpen}
        withExternalHeader={withExternalHeader}
      >
        <Box sx={{ 
          px: { xs: 1, sm: 2, md: 3 }, // Responsive padding
          minHeight: 'calc(100vh - 128px)', 
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
            py: 2, // Add some vertical padding for better spacing
            // Add a subtle background for content area in training app
            bgcolor: 'background.paper',
            borderRadius: `${borderRadius}px`,
            boxShadow: theme.palette.mode === 'dark' ? 0 : 1,
            overflow: 'hidden'
          }}>
            {content}
          </Box>
          
          {/* Footer with improved spacing */}
          <Box sx={{ mt: 3 }}>
            <Footer />
          </Box>
        </Box>
      </MainContentStyled>
    </Box>
  );
};

export default MainLayout;