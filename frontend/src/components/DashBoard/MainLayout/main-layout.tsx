// src/components/DashBoard/MainLayout/main-layout.tsx
import { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

// Swan primitives
import { Box, Toolbar } from '../../ui/primitives/components';
import { useMediaQuery, BREAKPOINT_VALUES } from '../../../styles/mui-replacements';

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

// Styled AppBar replacement
const StyledAppBar = styled.header<{ $hasActiveSession?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1201;
  width: 100%;
  background: ${({ $hasActiveSession }) =>
    $hasActiveSession ? 'rgba(76, 175, 80, 0.15)' : '#0a0a1a'};
  box-shadow: none;
`;

// Styled main content area with responsive width
const MainContent = styled.main<{ $drawerOpen?: boolean }>`
  flex-grow: 1;
  background: transparent;
  position: relative;
  box-sizing: border-box;
  width: 100%;
  transition: width 0.3s ease, margin-left 0.3s ease;

  @media (min-width: ${BREAKPOINT_VALUES.md}px) {
    width: ${({ $drawerOpen }) => $drawerOpen ? 'calc(100% - 220px)' : '100%'};
    margin-left: ${({ $drawerOpen }) => $drawerOpen ? '220px' : '0'};
  }
`;

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
 */
const MainLayout = ({ children = null, withExternalHeader = false }: MainLayoutProps) => {
  const downMD = useMediaQuery(`(max-width: ${BREAKPOINT_VALUES.md - 1}px)`);
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
    if (config && typeof config.borderRadius === 'number') {
      borderRadius = config.borderRadius;
    }
  } catch (error) {
    console.error("Error accessing useConfig hook:", error);
  }

  // Get menu state with proper error handling
  let drawerOpen = true;
  try {
    const menuData = useMenuState();
    drawerOpen = menuData.isDashboardDrawerOpened;
  } catch (error) {
    console.error("Error accessing useMenuState hook:", error);
  }

  // Get menu actions with proper error handling
  let handleDrawerOpen = (state: boolean) => {};
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
        <Outlet />
        {children}
      </>
    );
  }, [children]);

  return (
    <Box style={{ display: 'flex', width: '100%', height: '100vh', position: 'relative' }}>
      {/* Header - only rendered if not using external header */}
      {!withExternalHeader && (
        <StyledAppBar $hasActiveSession={hasActiveSession}>
          <Toolbar style={{ padding: 16 }}>
            <Header />

            {/* Optional: Display active session indicator in header */}
            {hasActiveSession && activeClientId && (
              <Box
                style={{
                  marginLeft: 16,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 12px',
                  borderRadius: 4,
                  background: 'rgba(76, 175, 80, 0.3)',
                  color: '#fff'
                }}
              >
                <span style={{ fontWeight: 500, marginRight: 8 }}>
                  Active Session:
                </span>
                Client #{activeClientId}
              </Box>
            )}
          </Toolbar>
        </StyledAppBar>
      )}

      {/* Sidebar navigation - passing miniDrawer prop */}
      <Sidebar miniDrawer={miniDrawer} />

      {/* Main content area */}
      <MainContent $drawerOpen={drawerOpen}>
        <Box style={{
          minHeight: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          marginTop: withExternalHeader ? 0 : 64
        }}>
          {/* Breadcrumb navigation */}
          <Breadcrumbs />

          {/* Main content */}
          <Box style={{
            flex: 1,
            overflow: 'hidden',
            width: '100%',
            maxWidth: '100vw',
            boxSizing: 'border-box'
          }}>
            {content}
          </Box>
        </Box>
      </MainContent>

      {/* Scroll to top button */}
      <ScrollToTop
        theme="cosmic"
        size="medium"
        scrollThreshold={500}
        onScrollToTop={() => {
          console.log('Admin dashboard scroll to top clicked');
        }}
      />
    </Box>
  );
};

export default MainLayout;
