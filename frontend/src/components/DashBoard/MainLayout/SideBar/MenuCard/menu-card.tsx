/**
 * menu-card.tsx
 * 
 * Enhanced 7-star premium MenuCard component for the sidebar
 * Features glass-morphism effects, animations, and premium styling
 * Provides rich user information and navigation shortcuts for personal training app
 */

import { memo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Material UI imports
import { styled, useTheme, alpha } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';

// Icons
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

// Project imports
import { useAuth } from '../../../../../context/AuthContext';

// ====================== Styled Components ======================

// Premium card with glass morphism effect
const StyledCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.primary.dark, 0.8)}, 
    ${alpha(theme.palette.primary.main, 0.5)})`,
  backdropFilter: 'blur(10px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  borderRadius: 16,
  padding: theme.spacing(2),
  marginBottom: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden',
  boxShadow: `0 10px 30px ${alpha(theme.palette.common.black, 0.15)}`,
  transition: 'all 0.3s ease',
  
  '&:before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `linear-gradient(120deg, 
      ${alpha(theme.palette.primary.light, 0.3)}, 
      ${alpha(theme.palette.secondary.light, 0.1)})`,
    opacity: 0.5,
    zIndex: 0
  },

  '&:after': {
    content: '""',
    position: 'absolute',
    width: 200,
    height: 200,
    backgroundColor: alpha(theme.palette.primary.light, 0.2),
    borderRadius: '50%',
    top: -100,
    right: -100,
    zIndex: 0
  },
  
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: `0 15px 35px ${alpha(theme.palette.common.black, 0.2)}`
  }
}));

// Premium avatar with glow effect
const StyledAvatar = styled(Avatar)(({ theme }) => ({
  width: 60,
  height: 60,
  border: `2px solid ${alpha(theme.palette.common.white, 0.7)}`,
  backgroundColor: theme.palette.background.paper,
  boxShadow: `0 0 15px ${alpha(theme.palette.primary.main, 0.5)}`,
  
  '& .MuiSvgIcon-root': {
    fontSize: '2rem',
    color: theme.palette.primary.main
  }
}));

// Glowing progress bar
const StyledLinearProgress = styled(LinearProgress)(({ theme }) => ({
  height: 10,
  borderRadius: 5,
  backgroundColor: alpha(theme.palette.background.paper, 0.3),
  
  '& .MuiLinearProgress-bar': {
    borderRadius: 5,
    backgroundImage: `linear-gradient(to right, ${theme.palette.primary.light}, ${theme.palette.secondary.main})`,
    boxShadow: `0 0 10px ${alpha(theme.palette.primary.main, 0.7)}`
  }
}));

// Quick link buttons - fix the component property with proper typing
const StyledIconButton = styled(IconButton)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.paper, 0.15),
  backdropFilter: 'blur(5px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  borderRadius: 12,
  padding: theme.spacing(1),
  transition: 'all 0.3s ease',
  
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
    transform: 'translateY(-3px)',
    boxShadow: `0 5px 15px ${alpha(theme.palette.common.black, 0.2)}`
  },
  
  '& .MuiSvgIcon-root': {
    color: theme.palette.common.white,
    fontSize: '1.3rem'
  }
}));

const StatusChip = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  padding: `${theme.spacing(0.5)} ${theme.spacing(1.5)}`,
  backgroundColor: alpha(theme.palette.success.main, 0.2),
  backdropFilter: 'blur(5px)',
  borderRadius: 12,
  border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
  color: theme.palette.success.main,
  fontSize: '0.75rem',
  fontWeight: 600,
  zIndex: 1
}));

// Fixed ViewProfileButton with proper styles
const ViewProfileButton = styled(Button)(({ theme }) => ({
  marginTop: theme.spacing(2),
  padding: `${theme.spacing(0.75)} ${theme.spacing(2)}`,
  backgroundColor: alpha(theme.palette.background.paper, 0.15),
  color: theme.palette.common.white,
  borderRadius: 8,
  backdropFilter: 'blur(5px)',
  border: `1px solid ${alpha(theme.palette.common.white, 0.1)}`,
  transition: 'all 0.3s ease',
  textTransform: 'none',
  
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.2),
    borderColor: alpha(theme.palette.primary.main, 0.3)
  }
}));

// ====================== Component ======================

const MenuCard = () => {
  const theme = useTheme();
  const location = useLocation();
  const { user } = useAuth(); // Get user from auth context
  
  // Use state for animated values
  const [progress, setProgress] = useState(0);
  const [sessionMetrics, setSessionMetrics] = useState({
    completed: 0,
    scheduled: 0,
    achievements: 0
  });
  
  // Sample user data (in a real app, this would come from your auth context)
  const userData = {
    name: user?.name || "James Reynolds",
    avatar: user?.avatar || "/path-to-default-avatar.jpg",
    level: "Premium",
    progress: 78 // Overall fitness progress
  };
  
  // Simulate loading progress on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(userData.progress);
      setSessionMetrics({
        completed: 48,
        scheduled: 5,
        achievements: 12
      });
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [userData.progress]);
  
  // Quick link navigation items
  const quickLinks = [
    { 
      icon: <CalendarMonthIcon />, 
      path: '/dashboard/schedule', 
      tooltip: 'Schedule' 
    },
    { 
      icon: <FitnessCenterIcon />, 
      path: '/dashboard/workouts', 
      tooltip: 'Workouts' 
    },
    { 
      icon: <ShowChartIcon />, 
      path: '/dashboard/progress', 
      tooltip: 'Progress' 
    },
    { 
      icon: <RestaurantIcon />, 
      path: '/dashboard/nutrition', 
      tooltip: 'Nutrition' 
    },
    { 
      icon: <EmojiEventsIcon />, 
      path: '/dashboard/achievements', 
      tooltip: 'Achievements' 
    }
  ];

  return (
    <StyledCard elevation={0}>
      {/* Premium Status Indicator */}
      <StatusChip>{userData.level}</StatusChip>
      
      {/* User Profile Summary */}
      <List disablePadding sx={{ position: 'relative', zIndex: 1, mb: 1 }}>
        <ListItem alignItems="flex-start" disablePadding>
          <ListItemAvatar sx={{ mt: 0, mr: 2 }}>
            <StyledAvatar src={userData.avatar} alt={userData.name}>
              {!userData.avatar && <PersonIcon />}
            </StyledAvatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Typography variant="h6" sx={{ 
                color: theme.palette.common.white,
                fontWeight: 500,
                mb: 0.5
              }}>
                {userData.name}
              </Typography>
            }
            secondary={
              <Typography variant="body2" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
                Fitness Enthusiast
              </Typography>
            }
          />
        </ListItem>
      </List>
      
      {/* Progress Section */}
      <Box sx={{ position: 'relative', zIndex: 1, mt: 1, mb: 2 }}>
        <Grid container spacing={1} sx={{ mb: 1 }}>
          <Grid xs={7}>
            <Typography variant="subtitle2" sx={{ color: theme.palette.common.white }}>
              Overall Progress
            </Typography>
          </Grid>
          <Grid xs={5}>
            <Typography variant="subtitle2" sx={{ 
              color: theme.palette.common.white, 
              textAlign: 'right' 
            }}>
              {progress}%
            </Typography>
          </Grid>
        </Grid>
        <StyledLinearProgress variant="determinate" value={progress} />
      </Box>
      
      {/* Session Metrics */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 2, 
        position: 'relative', 
        zIndex: 1 
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
            {sessionMetrics.completed}
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
            Completed
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ 
          backgroundColor: alpha(theme.palette.common.white, 0.2) 
        }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
            {sessionMetrics.scheduled}
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
            Scheduled
          </Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ 
          backgroundColor: alpha(theme.palette.common.white, 0.2) 
        }} />
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: theme.palette.common.white }}>
            {sessionMetrics.achievements}
          </Typography>
          <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7) }}>
            Achievements
          </Typography>
        </Box>
      </Box>
      
      {/* Quick Links - Fixed to avoid component prop issue */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        mb: 2,
        position: 'relative', 
        zIndex: 1 
      }}>
        {quickLinks.map((link, index) => (
          <Tooltip key={index} title={link.tooltip} placement="top" arrow>
            <Box component={Link} to={link.path} sx={{ textDecoration: 'none' }}>
              <StyledIconButton
                color={location.pathname === link.path ? "primary" : "default"}
              >
                {link.icon}
              </StyledIconButton>
            </Box>
          </Tooltip>
        ))}
      </Box>
      
      {/* Profile Button - Fixed implementation to avoid component prop TypeScript error */}
      <Box component={Link} to="/dashboard/profile" sx={{ textDecoration: 'none' }}>
        <ViewProfileButton 
          fullWidth
          endIcon={<ChevronRightIcon />}
        >
          View Profile
        </ViewProfileButton>
      </Box>
    </StyledCard>
  );
};

export default memo(MenuCard);