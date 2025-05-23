// src/components/DashBoard/MainLayout/Sidebar/mini-drawer-styled.tsx
import { styled, Theme } from '@mui/material/styles';
import Drawer from '@mui/material/Drawer';
import { DrawerProps } from '@mui/material/Drawer';

// You'll need to define the drawerWidth in your constants
const drawerWidth = 260; // Adjust this value as needed or import from your constants

// Define the mixins as record objects rather than functions for better type compatibility
const openedMixin = (theme: Theme) => ({
  width: drawerWidth,
  borderRight: 'none',
  zIndex: 1099,
  background: theme.palette.background.default,
  overflowX: 'hidden' as const,
  boxShadow: 'none',
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen + 200
  })
});

const closedMixin = (theme: Theme) => ({
  borderRight: 'none',
  zIndex: 1099,
  background: theme.palette.background.default,
  overflowX: 'hidden' as const,
  width: 72,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen + 200
  })
});

// ==============================|| DRAWER - MINI STYLED ||============================== //

interface MiniDrawerProps extends DrawerProps {
  open?: boolean;
}

const MiniDrawerStyled = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open'
})<MiniDrawerProps>(({ theme, open }) => ({
  width: drawerWidth,
  borderRight: '0px',
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme)
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme)
  })
}));

export default MiniDrawerStyled;