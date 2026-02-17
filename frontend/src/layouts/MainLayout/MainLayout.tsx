// src/layouts/MainLayout/MainLayout.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import styled from 'styled-components';

// Import components
import Header from './Header';
import Sidebar from './Sidebar';
import MainContent from './MainContent';

// Import hooks
import useConfig from '../../hooks/useConfig';
import { useMenuActions, useMenuState } from '../../hooks/useMenuState';

// Constants
const DEFAULT_BORDER_RADIUS = 8;
const MD_BREAKPOINT = 960;

// Types
interface MainLayoutProps {
  children?: React.ReactNode;
  withExternalHeader?: boolean;
}

const LayoutContainer = styled.div`
  display: flex;
  width: 100%;
  height: 100vh;
  position: relative;
`;

/**
 * MainLayout Component
 *
 * Primary layout component that provides the structure for the application,
 * including header, sidebar, and content area.
 */
const MainLayout: React.FC<MainLayoutProps> = ({
  children = null,
  withExternalHeader = false
}) => {
  const [downMD, setDownMD] = useState(window.innerWidth < MD_BREAKPOINT);

  // Responsive breakpoint listener
  useEffect(() => {
    const handleResize = () => setDownMD(window.innerWidth < MD_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <LayoutContainer>
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
    </LayoutContainer>
  );
};

export default MainLayout;
