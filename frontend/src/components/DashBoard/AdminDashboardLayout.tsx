import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

// Import the centralized internal routes component
import AdminDashboardRoutes from './internal-routes';

// Import contexts and state
import { useAuth } from '../../context/AuthContext';

// Import utils for accessibility
import { accessibleLabelGenerator } from '../../utils/accessibility';

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
 * Error state component for admin dashboard
 */
const AdminDashboardError: React.FC<{
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
      Admin Dashboard Access Error
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
 * AdminDashboardLayout Component
 * Main layout for the admin dashboard with navigation drawer and routes
 * This is a unified version that combines features from both implementations
 */
const AdminDashboardLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const { user } = auth;
  
  // Comprehensive admin verification using proper auth context
  useEffect(() => {
    const verifyAdminAccess = async () => {
      console.log('AdminDashboard: Verifying admin access...');
      
      // Don't verify if still loading
      if (auth.loading) {
        return;
      }
      
      // Check authentication
      if (!auth.isAuthenticated || !auth.user) {
        console.error('AdminDashboard: User not authenticated');
        setError('Authentication required. Please log in with admin credentials.');
        setIsVerifying(false);
        return;
      }
      
      // Check admin role
      if (!auth.checkPermission('admin:all')) {
        console.error(`AdminDashboard: User "${auth.user.username}" (${auth.user.role}) lacks admin permissions`);
        setError('You do not have administrative privileges. Please contact an administrator for access.');
        setIsVerifying(false);
        return;
      }
      
      // Success - user has admin access
      console.log(`AdminDashboard: Access granted for admin user "${auth.user.username}"`);
      setError(null);
      setIsVerifying(false);
    };
    
    verifyAdminAccess();
  }, [auth.isAuthenticated, auth.user, auth.loading, auth.checkPermission]);
  
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
    auth.logout();
    navigate('/login?returnUrl=/dashboard/default');
  };
  
  // Navigation items - Consistent with TrainerDashboard and ClientDashboard
  const mainNavItems: NavItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard/default',
      ariaLabel: 'Go to main dashboard'
    },
    {
      text: 'Clients',
      icon: <PeopleIcon />,
      path: '/dashboard/clients',
      ariaLabel: 'Manage clients'
    },
    {
      text: 'Client Progress',
      icon: <BarChartIcon />,
      path: '/dashboard/client-progress',
      ariaLabel: 'View client progress reports'
    },
    {
      text: 'Client Orientation',
      icon: <AccountCircleIcon />,
      path: '/dashboard/client-orientation',
      ariaLabel: 'Manage client orientations and consultations'
    },
    {
      text: 'Workouts',
      icon: <FitnessCenterIcon />,
      path: '/dashboard/workouts',
      ariaLabel: 'Manage workout programs'
    },
    {
      text: 'Sessions',
      icon: <CalendarMonthIcon />,
      path: '/dashboard/admin-sessions',
      ariaLabel: 'Manage training sessions'
    },
    {
      text: 'Packages',
      icon: <ShoppingBagIcon />,
      path: '/dashboard/admin-packages',
      ariaLabel: 'Manage training packages'
    },
    {
      text: 'Gamification',
      icon: <EmojiEventsIcon />,
      path: '/dashboard/gamification',
      ariaLabel: 'Configure gamification settings'
    },
    {
      text: 'Community',
      icon: <GroupIcon />,
      path: '/dashboard/community',
      ariaLabel: 'Manage community features'
    },
    {
      text: 'Users',
      icon: <PeopleIcon />,
      path: '/dashboard/user-management',
      ariaLabel: 'Manage users and permissions'
    }
  ];
  
  // Determine the current page title based on the location
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    if (path.includes('default')) return 'Dashboard';
    if (path.includes('clients')) return 'Client Management';
    if (path.includes('client-progress')) return 'Client Progress';
    if (path.includes('client-orientation')) return 'Client Orientation';
    if (path.includes('workouts')) return 'Workout Programs';
    if (path.includes('admin-sessions')) return 'Training Sessions';
    if (path.includes('admin-packages')) return 'Training Packages';
    if (path.includes('gamification')) return 'Gamification';
    if (path.includes('community')) return 'Community';
    if (path.includes('user-management')) return 'User Management';
    return 'Admin Dashboard';
  };
  
  // Show loading state while verifying admin access
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
          Loading admin dashboard...
        </Typography>
      </Box>
    );
  }
  
  // Show error state if verification failed
  if (error) {
    return (
      <AdminDashboardError 
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
            <AdminDashboardRoutes />
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default AdminDashboardLayout;