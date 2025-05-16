/**
 * TrainerDashboardLayout.tsx
 * Layout wrapper for trainer dashboard with internal navigation and routing
 */
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Box, 
  CssBaseline, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  IconButton, 
  Container,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { styled, ThemeProvider, createTheme, Theme, CSSObject } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import BarChartIcon from '@mui/icons-material/BarChart';

import { useAuth } from '../../../../context/AuthContext';
import DashboardSelector from '../../../DashboardSelector/DashboardSelector';

// Import trainer dashboard views
import TrainerMainDashboard from './trainer-dashboard';
import TrainerClients from './TrainerClients';
import TrainerSessions from './TrainerSessions';
import TrainerOrientation from './TrainerOrientation';

// Constants
const drawerWidth = 240;

// Custom dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ffff',
      light: '#7efbfb',
      dark: '#00b8b8',
    },
    secondary: {
      main: '#7851a9',
      light: '#a67dd4',
      dark: '#5e3d90',
    },
    background: {
      default: '#0a0a1a',
      paper: 'rgba(30, 30, 60, 0.3)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  }
});

// Styled components
const openedMixin = (theme: Theme): CSSObject => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
});

const closedMixin = (theme: Theme): CSSObject => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up('sm')]: {
    width: `calc(${theme.spacing(8)} + 1px)`,
  },
});

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const StyledDrawer = styled(Drawer, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    width: drawerWidth,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
    ...(open && {
      ...openedMixin(theme),
      '& .MuiDrawer-paper': openedMixin(theme),
    }),
    ...(!open && {
      ...closedMixin(theme),
      '& .MuiDrawer-paper': closedMixin(theme),
    }),
  }),
);

// Navigation item type
interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  ariaLabel: string;
}

/**
 * TrainerDashboardLayout Component
 * Independent layout for trainer dashboard with its own navigation
 */
const TrainerDashboardLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Verify trainer access
  useEffect(() => {
    console.log('TrainerDashboard: Checking user authorization...');
    
    setTimeout(() => {
      if (!user) {
        console.error('TrainerDashboard: No user object found');
        setError('Authentication required. Please log in.');
      } else if (user.role !== 'trainer' && user.role !== 'admin') {
        console.error(`TrainerDashboard: User role "${user.role}" is not authorized`);
        setError('You do not have permission to access this area.');
      } else {
        console.log('TrainerDashboard: Access verified for trainer user');
        setError(null);
      }
      
      setIsVerifying(false);
    }, 500);
  }, [user]);
  
  // Handle drawer open/close
  const toggleDrawer = () => {
    setOpen(!open);
  };
  
  // Handle profile menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  // Navigation items for trainer
  const trainerNavItems: NavItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/trainer-dashboard',
      ariaLabel: 'Go to trainer main dashboard'
    },
    {
      text: 'My Clients',
      icon: <PeopleIcon />,
      path: '/trainer-dashboard/clients',
      ariaLabel: 'Manage my clients'
    },
    {
      text: 'Sessions',
      icon: <CalendarMonthIcon />,
      path: '/trainer-dashboard/sessions',
      ariaLabel: 'View and manage sessions'
    },
    {
      text: 'Client Orientation',
      icon: <AccountCircleIcon />,
      path: '/trainer-dashboard/orientation',
      ariaLabel: 'Manage client orientations'
    },
    {
      text: 'Reports',
      icon: <BarChartIcon />,
      path: '/trainer-dashboard/reports',
      ariaLabel: 'View training reports'
    }
  ];
  
  // Get current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path === '/trainer-dashboard') return 'Trainer Dashboard';
    if (path.includes('clients')) return 'My Clients';
    if (path.includes('sessions')) return 'Training Sessions';
    if (path.includes('orientation')) return 'Client Orientation';
    if (path.includes('reports')) return 'Reports';
    return 'Trainer Dashboard';
  };
  
  // Show loading state
  if (isVerifying) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'rgba(9, 4, 30, 0.95)',
      }}>
        <CircularProgress 
          size={60} 
          thickness={4} 
          sx={{ 
            color: '#7851a9',
            mb: 3
          }} 
        />
        <Typography variant="h6" color="text.primary">
          Loading trainer dashboard...
        </Typography>
      </Box>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: 'rgba(9, 4, 30, 0.95)',
        padding: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h4" color="error.main" gutterBottom>
          Trainer Dashboard Access Error
        </Typography>
        <Typography variant="h6" color="text.primary" gutterBottom>
          {error}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <MenuItem onClick={() => window.location.reload()}>
            Retry
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            Logout
          </MenuItem>
        </Box>
      </Box>
    );
  }
  
  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        
        {/* Top App Bar */}
        <StyledAppBar position="fixed" open={open}>
          <Toolbar>
            <IconButton
              color="inherit"
              aria-label={open ? 'Close drawer' : 'Open drawer'}
              onClick={toggleDrawer}
              edge="start"
              sx={{ marginRight: 5 }}
            >
              {open ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
            
            <Typography 
              variant="h6" 
              noWrap 
              component="h1"
              sx={{ flexGrow: 1 }}
            >
              {getCurrentPageTitle()}
            </Typography>
            
            {/* Dashboard Selector */}
            <Box sx={{ mr: 2 }}>
              <DashboardSelector />
            </Box>
            
            {/* Profile Avatar & Menu */}
            <Tooltip title="Account settings">
              <IconButton 
                onClick={handleMenuOpen}
                size="small" 
                sx={{ ml: 2 }}
              >
                <Avatar 
                  alt={user?.name || 'Trainer'} 
                  src={user?.profileImageUrl || undefined}
                  sx={{ width: 32, height: 32 }}
                />
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                <ListItemIcon>
                  <AccountCircleIcon fontSize="small" />
                </ListItemIcon>
                My Profile
              </MenuItem>
              
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </Toolbar>
        </StyledAppBar>
        
        {/* Side Navigation Drawer */}
        <StyledDrawer variant="permanent" open={open}>
          <DrawerHeader>
            <Typography 
              variant="h6"
              component="div"
              sx={{ flexGrow: 1, textAlign: 'center', fontWeight: 'bold' }}
            >
              Trainer Portal
            </Typography>
          </DrawerHeader>
          
          <Divider />
          
          {/* Navigation Links */}
          <List>
            {trainerNavItems.map((item) => (
              <ListItem 
                key={item.text} 
                disablePadding 
                sx={{ display: 'block' }}
              >
                <ListItemButton
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    backgroundColor: location.pathname === item.path ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  }}
                  onClick={() => navigate(item.path)}
                  aria-label={item.ariaLabel}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                      color: location.pathname === item.path ? '#00ffff' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: open ? 1 : 0,
                      color: location.pathname === item.path ? '#00ffff' : 'inherit'
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </StyledDrawer>
        
        {/* Main Content Area with Routes */}
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <DrawerHeader />
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Routes>
              <Route path="/" element={<TrainerMainDashboard />} />
              <Route path="/clients" element={<TrainerClients />} />
              <Route path="/sessions" element={<TrainerSessions />} />
              <Route path="/orientation" element={<TrainerOrientation />} />
              <Route path="/reports" element={<div>Trainer Reports - Coming Soon</div>} />
              <Route path="*" element={<Navigate to="/trainer-dashboard" replace />} />
            </Routes>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default TrainerDashboardLayout;