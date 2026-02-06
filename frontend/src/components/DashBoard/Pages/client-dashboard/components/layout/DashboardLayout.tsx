import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../../../../context/AuthContext';
import {
  Box,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Avatar,
  Container
} from '@mui/material';

import {
  BarChart2,
  Dumbbell,
  Trophy,
  Gift,
  Calendar,
  MessageCircle,
  Settings,
  HelpCircle,
  LogOut,
  User,
  Home,
  ShoppingCart,
  Utensils,
  Phone
} from 'lucide-react';

import {
  PageContainer,
  ContentContainer,
  DashboardGrid,
  containerVariants,
  itemVariants
} from '../styled-components';

import EnhancedDashboardHeader from './EnhancedDashboardHeader';

interface DashboardLayoutProps {
  children: React.ReactNode;
  points: number;
  streak: number;
  onViewChallenges?: () => void;
  onViewRewards?: () => void;
}

/**
 * Enhanced Dashboard Layout Component
 * Pixel-perfect implementation matching SwanStudios branding
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  points, 
  streak,
  onViewChallenges,
  onViewRewards
}) => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Menu items for the drawer - matching your existing navigation system
  const menuItems = [
    { text: 'Home', icon: <Home size={20} />, path: '/' },
    { text: 'Dashboard', icon: <BarChart2 size={20} />, path: '/client-dashboard' },
    { text: 'My Workouts', icon: <Dumbbell size={20} />, path: '/workout-tracker' },
    { text: 'Challenges', icon: <Trophy size={20} />, path: '/challenges', onClick: onViewChallenges },
    { text: 'Rewards', icon: <Gift size={20} />, path: '/rewards', onClick: onViewRewards },
    { text: 'Schedule', icon: <Calendar size={20} />, path: '/schedule' },
    { text: 'Store', icon: <ShoppingCart size={20} />, path: '/store' },
    { text: 'Food Scanner', icon: <Utensils size={20} />, path: '/food-scanner' },
    { text: 'Messages', icon: <MessageCircle size={20} />, path: '/messages' },
    { text: 'Contact', icon: <Phone size={20} />, path: '/contact' },
  ];

  const accountItems = [
    { text: 'My Profile', icon: <User size={20} />, path: '/profile' },
    { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
    { text: 'Help Center', icon: <HelpCircle size={20} />, path: '/help' },
    { text: 'Sign Out', icon: <LogOut size={20} />, path: '/logout', color: '#f87171' }
  ];

  return (
    <PageContainer sx={{
      bgcolor: '#0a0a1a',
      /* Background image handled via pseudo-element for better mobile scroll performance */
      position: 'relative',
      minHeight: '100vh',
      '&::before': {
        content: '""',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'url("/swan-bg.jpg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        zIndex: -1,
        /* GPU acceleration for the background layer */
        transform: 'translateZ(0)',
        willChange: 'transform'
      }
    }}>
      {/* Enhanced SwanStudios Header */}
      <EnhancedDashboardHeader 
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
      />
      
      <ContentContainer sx={{ 
        mt: '56px', // Exactly match header height
        pt: { xs: 3, md: 5 },
        px: { xs: 2, md: 4 }
      }}>
        {/* Main content container */}
        <Container 
          maxWidth="xl"
          disableGutters
          sx={{ px: { xs: 0, sm: 2, md: 0 } }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Welcome Header section for desktop */}
            {!isMobile && (
              <Box sx={{ 
                mb: 5,
                pb: 2
              }}>
                <Box>
                  <Typography 
                    variant="h3" 
                    fontWeight="500" 
                    mb={1.5} 
                    component={motion.h3} 
                    variants={itemVariants}
                    sx={{ 
                      color: 'white',
                      fontSize: { xs: '2rem', md: '2.5rem' },
                      letterSpacing: '0.5px'
                    }}
                  >
                    Hi, {user?.firstName || 'Athlete'}!
                  </Typography>
                  <Typography 
                    variant="h6" 
                    color="rgba(255, 255, 255, 0.7)" 
                    component={motion.p} 
                    variants={itemVariants}
                    fontWeight="400"
                    sx={{ maxWidth: '800px' }}
                  >
                    Track your fitness progress and unlock achievements on your wellness journey
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* Main Dashboard Layout */}
            <DashboardGrid>
              {children}
            </DashboardGrid>
          </motion.div>
        </Container>
      </ContentContainer>
      
      {/* Mobile Navigation Drawer - styled to match your existing system */}
      <SwipeableDrawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        onOpen={() => setMobileDrawerOpen(true)}
        PaperProps={{
          sx: {
            width: '80%',
            maxWidth: '320px',
            background: '#0a0a1a',
            color: 'white',
            borderRight: '1px solid rgba(255,255,255,0.05)'
          }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* User info area */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            p: 2.5, 
            mb: 1, 
            bgcolor: '#111133',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Avatar sx={{ 
              width: 46, 
              height: 46, 
              bgcolor: '#00a0e3',
              border: '2px solid rgba(255,255,255,0.1)'
            }}>
              {user?.firstName?.[0] || 'U'}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ 
                fontWeight: 500,
                fontSize: '1.1rem',
                letterSpacing: '0.3px'
              }}>
                {user?.firstName || 'User'} {user?.lastName || ''}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1.5,
                mt: 0.5
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5 
                }}>
                  <Trophy size={14} color="#00a0e3" />
                  <Typography variant="body2" color="rgba(255, 255, 255, 0.8)" sx={{ fontSize: '0.8rem' }}>
                    {points} Pts
                  </Typography>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5 
                }}>
                  <Gift size={14} color={streak > 0 ? "#ffb700" : "rgba(255, 255, 255, 0.5)"} />
                  <Typography 
                    variant="body2" 
                    color={streak > 0 ? "#ffb700" : "rgba(255, 255, 255, 0.5)"}
                    sx={{ fontSize: '0.8rem' }}
                  >
                    {streak} Day Streak
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* Menu items */}
          <List sx={{ 
            flex: 1, 
            px: 1.5,
            overflow: 'auto'
          }}>
            {menuItems.map((item, index) => (
              <ListItem 
                key={index}
                button
                onClick={() => {
                  if (item.onClick) {
                    item.onClick();
                  } else {
                    navigate(item.path);
                  }
                  setMobileDrawerOpen(false);
                }}
                sx={{ 
                  borderRadius: '4px', 
                  mb: 0.5,
                  py: 1.2,
                  '&:hover': {
                    bgcolor: 'rgba(0, 160, 227, 0.1)'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: 'white', 
                  minWidth: '36px',
                  '& svg': {
                    strokeWidth: 2
                  }
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: 500
                  }}
                />
              </ListItem>
            ))}
          </List>
          
          <Divider sx={{ 
            borderColor: 'rgba(255, 255, 255, 0.1)', 
            mx: 2 
          }} />
          
          {/* Account items */}
          <List sx={{ p: 1.5 }}>
            {accountItems.map((item, index) => (
              <ListItem 
                key={index}
                button
                sx={{ 
                  borderRadius: '4px', 
                  mb: 0.5, 
                  py: 1.2,
                  color: item.color || 'white',
                  '&:hover': {
                    bgcolor: item.color ? 'rgba(248, 113, 113, 0.1)' : 'rgba(0, 160, 227, 0.1)'
                  }
                }}
              >
                <ListItemIcon sx={{ 
                  color: item.color || 'white', 
                  minWidth: '36px',
                  '& svg': {
                    strokeWidth: 2
                  }
                }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.95rem',
                    fontWeight: 500
                  }}
                />
              </ListItem>
            ))}
          </List>
          
          {/* Footer */}
          <Box sx={{ 
            p: 2, 
            textAlign: 'center',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            bgcolor: 'rgba(0, 0, 0, 0.2)'
          }}>
            <Typography variant="caption" color="rgba(255, 255, 255, 0.5)">
              SwanStudios © {new Date().getFullYear()}
            </Typography>
          </Box>
        </Box>
      </SwipeableDrawer>
    </PageContainer>
  );
};

// Navigation hook for drawer
const navigate = (path: string) => {
  window.location.href = path;
};

export default DashboardLayout;
