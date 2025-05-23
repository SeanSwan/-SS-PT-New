import React, { useState, MouseEvent, useEffect } from 'react';
import { useAuth } from '../../../../../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Badge,
  useMediaQuery,
  useTheme,
  ListItemIcon,
  ListItemText,
  Container
} from '@mui/material';

import {
  ShoppingCart,
  Menu as MenuIcon,
  ChevronDown,
  Bell,
  Dumbbell
} from 'lucide-react';

interface EnhancedDashboardHeaderProps {
  points?: number;
  streak?: number;
  onViewChallenges?: () => void;
  onViewRewards?: () => void;
  onOpenMobileDrawer?: () => void;
}

/**
 * EnhancedDashboardHeader - Pixel-perfect implementation for SwanStudios
 * 
 * This header component is designed to match exactly with the SwanStudios
 * brand design as seen in the screenshots and existing styling patterns.
 * It includes responsive behavior, dropdown menus, and proper active state
 * styling for navigation items.
 */
const EnhancedDashboardHeader: React.FC<EnhancedDashboardHeaderProps> = ({
  onOpenMobileDrawer
}) => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [storeMenuAnchor, setStoreMenuAnchor] = useState<null | HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  
  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Handle navigation to different pages
  const handleNavigation = (path: string) => {
    navigate(path);
  };
  
  // Handle store menu
  const handleStoreMenuOpen = (event: MouseEvent<HTMLElement>) => {
    setStoreMenuAnchor(event.currentTarget);
  };
  
  const handleStoreMenuClose = () => {
    setStoreMenuAnchor(null);
  };

  // Handle navigation to store submenu items
  const handleStoreNavigate = (path: string) => {
    navigate(path);
    handleStoreMenuClose();
  };
  
  // Navigation button styles matching your existing header
  const navButtonStyle = {
    color: 'white',
    textTransform: 'none' as const,
    px: 1.2,
    py: 0,
    minWidth: 'auto',
    borderRadius: 0,
    transition: 'all 0.2s ease',
    fontWeight: 500,
    fontSize: '15px',
    letterSpacing: '0.2px',
    borderBottom: '2px solid transparent',
    mx: 0.3,
    '&:hover': {
      backgroundColor: 'transparent',
      color: '#00a0e3',
      borderBottom: '2px solid #00a0e3'
    }
  };

  // Check if a path is active
  const isActive = (path: string): boolean => {
    if (path === '/home' && location.pathname === '/') {
      return true;
    }
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#0a0a1a',
        transition: 'all 0.3s ease',
        backdropFilter: scrolled ? 'blur(10px)' : 'none',
        boxShadow: scrolled ? '0 5px 20px rgba(0, 0, 0, 0.3)' : 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}
    >
      <Container 
        maxWidth={false} 
        disableGutters 
        sx={{ 
          px: { xs: 2, sm: 3, md: 4 } 
        }}
      >
        <Box
          sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '56px',
          }}
        >
          {/* Logo Area */}
          <Box 
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                '& .logo-text': {
                  color: '#10b5f0'
                }
              }
            }}
            onClick={() => handleNavigation('/')}
          >
            <Box
              component="div"
              sx={{
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isActive('/home') ? 'rgba(0, 160, 227, 0.1)' : 'transparent',
                borderRadius: '50%',
                p: 0.5
              }}
            >
              <img 
                src="/swan-icon.svg" 
                alt="Swan Studios" 
                style={{ 
                  width: '100%', 
                  height: '100%'
                }} 
              />
            </Box>
            <Typography 
              variant="h6" 
              className="logo-text"
              sx={{
                fontWeight: 500,
                fontSize: '1.15rem',
                color: '#00a0e3',
                letterSpacing: '0.5px'
              }}
            >
              SwanStudios
            </Typography>
          </Box>

          {/* Navigation Area */}
          {!isMobile && (
            <Box sx={{ 
              display: 'flex', 
              height: '100%',
              alignItems: 'center',
              "& .MuiButton-root": {
                height: '56px',
                borderRadius: 0
              }
            }}>
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/home') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/home') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                onClick={() => handleNavigation('/')}
              >
                Home
              </Button>
              
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/store') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/store') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                endIcon={<ChevronDown size={14} />}
                onClick={handleStoreMenuOpen}
              >
                Store
              </Button>
              
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/client-dashboard') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/client-dashboard') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                onClick={() => handleNavigation('/client-dashboard')}
              >
                Client Dashboard
              </Button>
              
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/workout-tracker') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/workout-tracker') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                onClick={() => handleNavigation('/workout-tracker')}
              >
                Workout Tracker
              </Button>
              
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/schedule') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/schedule') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                onClick={() => handleNavigation('/schedule')}
              >
                Schedule
              </Button>
              
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/food-scanner') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/food-scanner') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                onClick={() => handleNavigation('/food-scanner')}
              >
                Food Scanner
              </Button>
              
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/contact') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/contact') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                onClick={() => handleNavigation('/contact')}
              >
                Contact
              </Button>
              
              <Button 
                sx={{
                  ...navButtonStyle,
                  color: isActive('/about') ? '#00a0e3' : 'white',
                  borderBottom: isActive('/about') ? '2px solid #00a0e3' : '2px solid transparent'
                }}
                onClick={() => handleNavigation('/about-us')}
              >
                About Us
              </Button>
            </Box>
          )}

          {/* User Actions Area */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: { xs: 0.5, md: 1 }
          }}>
            {isMobile ? (
              <IconButton 
                onClick={onOpenMobileDrawer}
                sx={{ 
                  color: 'white',
                  width: 40,
                  height: 40,
                  '&:hover': {
                    color: '#00a0e3',
                    backgroundColor: 'rgba(0, 160, 227, 0.05)'
                  }
                }}
              >
                <MenuIcon size={22} />
              </IconButton>
            ) : (
              <>
                <IconButton
                  sx={{ 
                    color: 'white',
                    width: 40,
                    height: 40,
                    '&:hover': {
                      color: '#00a0e3',
                      backgroundColor: 'rgba(0, 160, 227, 0.05)'
                    }
                  }}
                >
                  <Badge 
                    badgeContent={1} 
                    color="error"
                    sx={{ 
                      '& .MuiBadge-badge': {
                        backgroundColor: '#ec4899',
                        fontSize: '0.65rem',
                        minWidth: '18px',
                        height: '18px'
                      }
                    }}
                  >
                    <Bell size={20} />
                  </Badge>
                </IconButton>
                
                <IconButton
                  sx={{ 
                    color: 'white',
                    width: 40,
                    height: 40,
                    '&:hover': {
                      color: '#00a0e3',
                      backgroundColor: 'rgba(0, 160, 227, 0.05)'
                    }
                  }}
                >
                  <ShoppingCart size={20} />
                </IconButton>
                
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: '#00a0e3',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    ml: 0.5,
                    border: '2px solid transparent',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 0 0 2px rgba(0, 160, 227, 0.3)'
                    }
                  }}
                >
                  {user?.firstName?.[0] || 'U'}
                </Avatar>
              </>
            )}
          </Box>
        </Box>
      </Container>
      
      {/* Store Menu Dropdown */}
      <Menu
        anchorEl={storeMenuAnchor}
        open={Boolean(storeMenuAnchor)}
        onClose={handleStoreMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            mt: 0.5,
            ml: -1,
            bgcolor: '#0a0a1a',
            color: 'white',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            width: 180,
            border: '1px solid rgba(255,255,255,0.05)',
            '& .MuiMenuItem-root': {
              px: 2,
              py: 1.5,
              '&:hover': {
                bgcolor: 'rgba(0, 160, 227, 0.05)'
              }
            }
          }
        }}
        MenuListProps={{
          sx: {
            py: 0.5
          }
        }}
      >
        <MenuItem 
          onClick={() => handleStoreNavigate('/store')}
          sx={{ 
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ListItemIcon sx={{ color: 'white', minWidth: 32 }}>
            <ShoppingCart size={16} />
          </ListItemIcon>
          <ListItemText primary="All Products" />
        </MenuItem>
        <MenuItem onClick={() => handleStoreNavigate('/training-packages')}>
          <ListItemIcon sx={{ color: 'white', minWidth: 32 }}>
            <Dumbbell size={16} />
          </ListItemIcon>
          <ListItemText primary="Training Packages" />
        </MenuItem>
        <MenuItem onClick={() => handleStoreNavigate('/apparel')}>
          <ListItemIcon sx={{ color: 'white', minWidth: 32 }}>
            <ShoppingCart size={16} />
          </ListItemIcon>
          <ListItemText primary="Apparel" />
        </MenuItem>
        <MenuItem onClick={() => handleStoreNavigate('/supplements')} sx={{
          '& .MuiListItemText-primary': {
            display: 'flex',
            alignItems: 'center'
          }
        }}>
          <ListItemIcon sx={{ color: 'white', minWidth: 32 }}>
            <ShoppingCart size={16} />
          </ListItemIcon>
          <ListItemText 
            primary={
              <>
                Supplements
                <Box 
                  component="span" 
                  sx={{ 
                    ml: 1, 
                    fontSize: '0.65rem', 
                    px: 0.6, 
                    py: 0.1, 
                    bgcolor: '#ec4899', 
                    borderRadius: '4px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  NEW
                </Box>
              </>
            } 
          />
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default EnhancedDashboardHeader;
