import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MuiBreadcrumbs from '@mui/material/Breadcrumbs';
import useMediaQuery from '@mui/material/useMediaQuery';

// Icons
import HomeIcon from '@mui/icons-material/Home';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PersonIcon from '@mui/icons-material/Person';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import SettingsIcon from '@mui/icons-material/Settings';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SportsIcon from '@mui/icons-material/Sports';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

// Hooks
import useConfig from './../../hooks/useConfig';
import { useAuth } from '../../context/AuthContext';

// Constants from your theme
import { THEME_CONFIG } from './../../store/constant';

// Styled components
const BreadcrumbsContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(2), // Reduced bottom margin
  padding: theme.spacing(1, 1.5), // Reduced padding
  borderRadius: THEME_CONFIG.borderRadius.medium,
  backgroundColor: theme.palette.mode === 'dark' 
    ? 'rgba(255, 255, 255, 0.05)' 
    : 'rgba(0, 0, 0, 0.02)',
  transition: `all ${THEME_CONFIG.transitions.medium}ms ease-in-out`,
  width: '100%' // Ensure full width usage
}));

const StyledBreadcrumbs = styled(MuiBreadcrumbs)(({ theme }) => ({
  '& .MuiBreadcrumbs-separator': {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
  }
}));

const StyledLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  textDecoration: 'none',
  color: theme.palette.primary.main,
  fontWeight: 400,
  transition: `all ${THEME_CONFIG.transitions.short}ms ease-in-out`,
  '&:hover': {
    textDecoration: 'underline',
    transform: 'translateY(-1px)'
  },
  '& .MuiSvgIcon-root': {
    marginRight: theme.spacing(0.5),
    width: 20,
    height: 20,
  }
}));

const ActiveLink = styled(Typography)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  color: theme.palette.text.primary,
  fontWeight: 500,
  '& .MuiSvgIcon-root': {
    marginRight: theme.spacing(0.5),
    width: 20,
    height: 20,
  }
}));

const StyledChip = styled(Chip)(({ theme }) => ({
  height: 24,
  fontSize: '0.75rem',
  marginLeft: theme.spacing(1),
  backgroundColor: theme.palette.success.light,
  color: theme.palette.success.contrastText,
  fontWeight: 500,
  transition: `all ${THEME_CONFIG.transitions.short}ms ease-in-out`,
  '&:hover': {
    backgroundColor: theme.palette.success.main
  }
}));

/**
 * Enhanced Breadcrumbs Component for Fitness Training App
 * 
 * Displays the current navigation path with clickable links and fitness-specific
 * categorization for the personal training application.
 * 
 * Integration with auth system for role-specific breadcrumbs
 * and active session management.
 */
const Breadcrumbs = () => {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const config = useConfig();
  const { user } = useAuth();
  
  // Get the fitness theme for category highlighting
  const fitnessTheme = config.getFitnessTheme ? config.getFitnessTheme() : 'general';
  
  // Map of path segments to readable names and icons - fitness-specific
  // Enhanced with dynamic role-specific sections
  const pathMap = useMemo(() => ({
    '': { title: 'Home', icon: <HomeIcon /> },
    'admin-dashboard': { title: 'Dashboard', icon: <AnalyticsIcon /> },
    'clients': { title: 'Clients', icon: <PersonIcon /> },
    'workouts': { title: 'Workouts', icon: <FitnessCenterIcon /> },
    'schedule': { title: 'Schedule', icon: <CalendarMonthIcon /> },
    'store': { title: 'Store', icon: <ShoppingCartIcon /> },
    'admin-sessions': { title: 'Training Sessions', icon: <CalendarMonthIcon /> },
    'settings': { title: 'Settings', icon: <SettingsIcon /> },
    'progress': { title: 'Progress Tracking', icon: <DirectionsRunIcon /> },
    'nutrition': { title: 'Nutrition Plans', icon: <RestaurantIcon /> },
    'exercises': { title: 'Exercise Library', icon: <SportsIcon /> },
    'client-dashboard': { title: user?.role === 'admin' ? 'Client Dashboard' : 'My Dashboard', icon: <AnalyticsIcon /> },
    'health': { title: 'Health Metrics', icon: <FavoriteIcon /> },
    'vitals': { title: 'Vital Signs', icon: <MonitorHeartIcon /> }
  }), [user]);
  
  // In a real app, you would get this from your session state
  // For now, we'll simulate an active session
  const hasActiveSession = false;
  const activeClientName = "John Doe";
  
  // Process the current path
  const breadcrumbItems = useMemo(() => {
    // Split and decode the pathname
    const pathSegments = location.pathname.split('/')
      .filter(segment => segment !== '');
    
    // Skip rendering if we're at the root
    if (pathSegments.length === 0) {
      return [];
    }
    
    // Check if this is a dashboard page
    const isDashboardPage = 
      pathSegments[0] === 'admin-dashboard' || 
      pathSegments[0] === 'client-dashboard';
    
    if (!isDashboardPage && pathSegments[0] !== 'schedule' && pathSegments[0] !== 'store') {
      return [];
    }
    
    // Generate breadcrumb items
    const items = [];
    
    // Always start with home
    items.push(
      <StyledLink to="/" key="home">
        <HomeIcon fontSize="small" />
        Home
      </StyledLink>
    );
    
    // Build the rest of the path
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      const isLast = index === pathSegments.length - 1;
      const pathInfo = pathMap[segment] || { 
        title: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '), 
        icon: null 
      };
      
      if (isLast) {
        items.push(
          <ActiveLink variant="body2" key={segment}>
            {pathInfo.icon}
            {pathInfo.title}
          </ActiveLink>
        );
      } else {
        items.push(
          <StyledLink to={currentPath} key={segment}>
            {pathInfo.icon}
            {pathInfo.title}
          </StyledLink>
        );
      }
      
      // If this is a client detail page, add the client name
      if (segment === 'clients' && pathSegments[index + 1] && !isNaN(Number(pathSegments[index + 1]))) {
        // This would be replaced with actual client data fetching
        const clientName = "John Doe"; // Replace with real data
        items.push(
          <ActiveLink variant="body2" key={`client-${pathSegments[index + 1]}`}>
            <PersonIcon />
            {clientName}
          </ActiveLink>
        );
        // Skip the next segment which is the client ID
        index++;
      }
    });
    
    return items;
  }, [location.pathname, pathMap]);
  
  // Don't render anything if no breadcrumbs
  if (breadcrumbItems.length === 0) {
    return null;
  }
  
  return (
    <BreadcrumbsContainer>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <StyledBreadcrumbs 
          aria-label="fitness app navigation breadcrumbs"
          maxItems={isMobile ? 2 : 4}
          itemsAfterCollapse={1}
          itemsBeforeCollapse={0}
        >
          {breadcrumbItems}
        </StyledBreadcrumbs>
        
        {/* Active session indicator - only shown when a training session is active */}
        {hasActiveSession && !isMobile && (
          <StyledChip 
            label={`Active Session: ${activeClientName}`} 
            variant="filled" 
            size="small" 
            color="success" 
            icon={<DirectionsRunIcon style={{ fontSize: 14 }} />}
          />
        )}
        
        {/* For admin users, show active client count */}
        {user?.role === 'admin' && !isMobile && !hasActiveSession && (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: '0.75rem',
            color: theme.palette.mode === 'dark' ? 'text.secondary' : 'text.primary'
          }}>
            <PersonIcon sx={{ fontSize: 16 }} />
            <span>Active Clients: 28</span>
          </Box>
        )}
      </Box>
    </BreadcrumbsContainer>
  );
};

export default Breadcrumbs;