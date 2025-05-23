// src/layouts/MainLayout/Sidebar.tsx
import React from 'react';
import { useTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';

// Import existing sidebar component - adapt this path as needed
import DashboardSidebar from '../../components/DashBoard/MainLayout/SideBar/sidebar';

interface SidebarProps {
  miniDrawer: boolean;
  drawerOpen: boolean;
  handleDrawerOpen: (isOpen: boolean) => void;
}

/**
 * Sidebar component for the main layout
 * Wraps the existing sidebar implementation with proper layout structure
 */
const Sidebar: React.FC<SidebarProps> = ({
  miniDrawer,
  drawerOpen,
  handleDrawerOpen
}) => {
  const theme = useTheme();
  
  return (
    <Box
      component="nav"
      sx={{
        flexShrink: 0,
        width: drawerOpen ? 220 : 0,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen
        })
      }}
      aria-label="main navigation"
    >
      <DashboardSidebar miniDrawer={miniDrawer} />
    </Box>
  );
};

export default Sidebar;
