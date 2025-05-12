import React, { useState } from 'react';
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
  Tooltip
} from '@mui/material';
import { styled, ThemeProvider as MuiThemeProvider, createTheme, Theme, CSSObject } from '@mui/material/styles';
import { ThemeProvider as StyledComponentsThemeProvider } from 'styled-components';
import dashboardTheme from '../../../styles/dashboardTheme';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ChatIcon from '@mui/icons-material/Chat';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupIcon from '@mui/icons-material/Group';
import ArtTrackIcon from '@mui/icons-material/ArtTrack';
import MusicNoteIcon from '@mui/icons-material/MusicNote';

// Import context and user-related hooks properly
import { useAuth } from '../../../context/AuthContext';

// Import navigation properly  
import { useNavigate } from 'react-router-dom';

// Import sync notification for toast messages
import SyncNotification from '../../FitnessStats/SyncNotification';

// Import ClientDashboardContent component
import ClientDashboardContent from './ClientDashboardContent';

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
  section: string;
  ariaLabel: string;
}

/**
 * ClientDashboardLayout Component
 * Main layout for the client dashboard with navigation drawer 
 * that follows a similar pattern to the admin dashboard
 */
const ClientDashboardLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
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
  
  // Handle logout action
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Handle section change
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
  };
  
  // Navigation items for client
  const mainNavItems: NavItem[] = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon />,
      section: 'overview',
      ariaLabel: 'Go to overview dashboard'
    },
    {
      text: 'My Workouts',
      icon: <FitnessCenterIcon />,
      section: 'workouts',
      ariaLabel: 'View your workout plans'
    },
    {
      text: 'Progress',
      icon: <BarChartIcon />,
      section: 'progress',
      ariaLabel: 'View your progress'
    },
    {
      text: 'Achievements',
      icon: <EmojiEventsIcon />,
      section: 'gamification',
      ariaLabel: 'View your achievements and rewards'
    },
    {
      text: 'Creative Hub',
      icon: <ArtTrackIcon />,
      section: 'creative',
      ariaLabel: 'Access creative expression hub'
    },
    {
      text: 'Community',
      icon: <GroupIcon />,
      section: 'community',
      ariaLabel: 'Connect with community'
    },
    {
      text: 'Messaging',
      icon: <ChatIcon />,
      section: 'messages',
      ariaLabel: 'View and send messages'
    }
  ];

  // Additional settings and profile section
  const secondaryNavItems: NavItem[] = [
    {
      text: 'Profile',
      icon: <AccountCircleIcon />,
      section: 'profile',
      ariaLabel: 'Manage your profile'
    },
    {
      text: 'Settings',
      icon: <SettingsIcon />,
      section: 'settings',
      ariaLabel: 'Adjust your settings'
    }
  ];
  
  // Determine the current page title based on the active section
  const getCurrentPageTitle = () => {
    switch(activeSection) {
      case 'overview': return 'Dashboard';
      case 'workouts': return 'My Workouts';
      case 'progress': return 'Progress Tracking';
      case 'gamification': return 'Achievements';
      case 'creative': return 'Creative Expression Hub';
      case 'community': return 'Community';
      case 'messages': return 'Messaging';
      case 'profile': return 'My Profile';
      case 'settings': return 'Settings';
      default: return 'Client Dashboard';
    }
  };

  // Determine the current page title based on the active section
  
  return (
    <StyledComponentsThemeProvider theme={dashboardTheme}>
      <MuiThemeProvider theme={darkTheme}>
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
              <MenuItem onClick={() => { 
                handleMenuClose(); 
                handleSectionChange('profile'); 
              }}>
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
                    backgroundColor: activeSection === item.section ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  }}
                  onClick={() => handleSectionChange(item.section)}
                  aria-label={item.ariaLabel}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                      color: activeSection === item.section ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: open ? 1 : 0,
                      color: activeSection === item.section ? 'primary.main' : 'inherit',
                    }} 
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ my: 2 }} />
          
          {/* Secondary Navigation Links */}
          <List>
            {secondaryNavItems.map((item) => (
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
                    backgroundColor: activeSection === item.section ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                  }}
                  onClick={() => handleSectionChange(item.section)}
                  aria-label={item.ariaLabel}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 3 : 'auto',
                      justifyContent: 'center',
                      color: activeSection === item.section ? 'primary.main' : 'inherit',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: open ? 1 : 0,
                      color: activeSection === item.section ? 'primary.main' : 'inherit',
                    }} 
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
            <ClientDashboardContent activeSection={activeSection} />
          </Container>
        </Box>
        
        {/* Global notification system for sync status */}
        <SyncNotification />
      </Box>
      </MuiThemeProvider>
    </StyledComponentsThemeProvider>
  );
};

export default ClientDashboardLayout;