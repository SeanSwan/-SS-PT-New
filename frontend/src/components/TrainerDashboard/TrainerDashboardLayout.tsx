import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import GroupIcon from '@mui/icons-material/Group';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';

import DashboardSelector from '../DashboardSelector/DashboardSelector';
import TrainerDashboardRoutes from './routes/TrainerDashboardRoutes';

// Import contexts
import { useAuth } from '../../context/AuthContext';

// Constants
const drawerWidth = 240;

// Custom dark theme that aligns with storefront styling
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
    error: {
      main: '#ff416c',
      light: '#ff7a9d',
      dark: '#e5274e',
    },
    warning: {
      main: '#ffb700',
      light: '#ffd95c',
      dark: '#cc9200',
    },
    success: {
      main: '#00bf8f',
      light: '#5ce0b9',
      dark: '#00996f',
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

// Styled components for the dashboard layout
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
  // necessary for content to be below app bar
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

// Type for navigation items
interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  ariaLabel: string;
}

/**
 * Error state component for trainer dashboard
 */
const TrainerDashboardError: React.FC<{
  error: string;
  onRetry: () => void;
  onLogout: () => void;
}> = ({ error, onRetry, onLogout }) => (
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
    
    <Box sx={{ 
      borderRadius: '50%',
      backgroundColor: 'rgba(255, 65, 108, 0.1)',
      p: 2,
      mb: 3
    }}>
      <Typography fontSize="3rem">⚠️</Typography>
    </Box>
    
    <Typography variant="h6" color="text.primary" gutterBottom>
      {error}
    </Typography>
    
    <Typography variant="body1" color="text.secondary" sx={{ maxWidth: '600px', mb: 4, mt: 2 }}>
      This may be due to an expired session, insufficient permissions, or network connectivity issues.
      Please try refreshing your session or contact support if the problem persists.
    </Typography>
    
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
      <MenuItem 
        onClick={onRetry}
        sx={{ minWidth: '120px' }}
      >
        Retry
      </MenuItem>
      
      <MenuItem 
        onClick={onLogout}
        sx={{ minWidth: '120px' }}
      >
        Logout
      </MenuItem>
    </Box>
  </Box>
);

/**
 * TrainerDashboardLayout Component
 * Main layout for the trainer dashboard with navigation drawer and routes
 * Uses the same structure and navigation categories as AdminDashboard for consistency
 */
const TrainerDashboardLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Simple verification - check if user exists and has trainer or admin role
  useEffect(() => {
    console.log('TrainerDashboard: Verifying access...');
    
    if (!user) {
      console.log('TrainerDashboard: No user found, access denied');
      setError('Authentication required. Please log in.');
    } else if (!['trainer', 'admin'].includes(user.role)) {
      console.log(`TrainerDashboard: User role "${user.role}" is not trainer or admin`);
      setError('You do not have permission to access this area.');
    } else {
      console.log(`TrainerDashboard: Access granted for ${user.role} user "${user.email}"`);
      setError(null);
    }
    
    setIsVerifying(false);
  }, [user]);
  
  // Handle drawer open/close
  const toggleDrawer = () => {
    setOpen(!open);
  };
  
  // Handle profile menu open/close
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle retry action
  const handleRetry = () => {
    setIsVerifying(true);
    setError(null);
    
    // Force refresh to ensure fresh authentication state
    window.location.reload();
  };
  
  // Handle logout action
  const handleLogout = () => {
    logout();
    navigate('/login?returnUrl=/trainer/dashboard');
  };
  
  // Navigation items - Trainer-specific functionality only (no admin features)
  const mainNavItems: NavItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/trainer-dashboard',
      ariaLabel: 'Go to main dashboard'
    },
    {
      text: 'My Clients',
      icon: <PeopleIcon />,
      path: '/trainer-dashboard/clients',
      ariaLabel: 'View and manage your clients'
    },
    {
      text: 'Workout Plans',
      icon: <FitnessCenterIcon />,
      path: '/trainer-dashboard/workouts',
      ariaLabel: 'Create and manage workout plans for clients'
    },
    {
      text: 'Training Sessions',
      icon: <CalendarMonthIcon />,
      path: '/trainer-dashboard/sessions',
      ariaLabel: 'Schedule and manage training sessions'
    },
    {
      text: 'Client Progress',
      icon: <BarChartIcon />,
      path: '/trainer-dashboard/client-progress',
      ariaLabel: 'Track client progress and analytics'
    },
    {
      text: 'Messages',
      icon: <GroupIcon />,
      path: '/trainer-dashboard/messages',
      ariaLabel: 'Client communications and messaging'
    }
  ];
  
  // Determine the current page title based on the location
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path.includes('/trainer-dashboard/clients')) return 'My Clients';
    if (path.includes('/trainer-dashboard/workouts')) return 'Workout Plans';
    if (path.includes('/trainer-dashboard/sessions')) return 'Training Sessions';
    if (path.includes('/trainer-dashboard/client-progress')) return 'Client Progress';
    if (path.includes('/trainer-dashboard/messages')) return 'Messages';
    return 'Trainer Dashboard';
  };
  
  // Show loading state while verifying trainer access
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
  
  // Show error state if verification failed
  if (error) {
    return (
      <TrainerDashboardError 
        error={error}
        onRetry={handleRetry}
        onLogout={handleLogout}
      />
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
                aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
              >
                <Avatar 
                  alt={user?.name || 'User'} 
                  src={user?.profileImageUrl || undefined}
                  sx={{ width: 32, height: 32 }}
                />
              </IconButton>
            </Tooltip>
            
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              PaperProps={{
                elevation: 0,
                sx: {
                  overflow: 'visible',
                  filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                  mt: 1.5,
                  '& .MuiAvatar-root': {
                    width: 32,
                    height: 32,
                    ml: -0.5,
                    mr: 1,
                  },
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
              Swan Studios
            </Typography>
          </DrawerHeader>
          
          <Divider />
          
          {/* Main Navigation Links */}
          <List>
            {mainNavItems.map((item) => (
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
                    backgroundColor: location.pathname === item.path ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                  }}
                  onClick={() => navigate(item.path)}
                  aria-label={item.ariaLabel}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ opacity: open ? 1 : 0 }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </StyledDrawer>
        
        {/* Main Content Area */}
        <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
          <DrawerHeader /> {/* Spacer to push content below app bar */}
          <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <TrainerDashboardRoutes />
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default TrainerDashboardLayout;