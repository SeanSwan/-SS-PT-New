// src/layouts/MainLayout/Sidebar.tsx
import React from 'react';
import styled from 'styled-components';

// Import existing sidebar component
import DashboardSidebar from '../../components/DashBoard/MainLayout/SideBar/sidebar';

interface SidebarProps {
  miniDrawer: boolean;
  drawerOpen: boolean;
  handleDrawerOpen: (isOpen: boolean) => void;
}

const NavWrapper = styled.nav<{ $drawerOpen: boolean }>`
  flex-shrink: 0;
  width: ${props => props.$drawerOpen ? '220px' : '0'};
  transition: width 0.3s cubic-bezier(0.4, 0, 0.6, 1);
`;

/**
 * Sidebar component for the main layout
 * Wraps the existing sidebar implementation with proper layout structure
 */
const Sidebar: React.FC<SidebarProps> = ({
  miniDrawer,
  drawerOpen,
  handleDrawerOpen
}) => {
  return (
    <NavWrapper $drawerOpen={drawerOpen} aria-label="main navigation">
      <DashboardSidebar miniDrawer={miniDrawer} />
    </NavWrapper>
  );
};

export default Sidebar;
