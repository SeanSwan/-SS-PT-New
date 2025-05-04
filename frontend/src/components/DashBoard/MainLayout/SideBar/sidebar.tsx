import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Drawer,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  useMediaQuery,
  Avatar,
  Chip
} from '@mui/material';
import {
  ChevronRight,
  ChevronDown,
  LogOut,
  Settings
} from 'lucide-react';

// Import menu items
import dashboard from '../../Menu-Items/dashboard';
import { useAuth } from '../../../../context/AuthContext';
import { useMenuState, useMenuActions } from '../../../../hooks/useMenuState';

// Define types
interface MenuItemType {
  id: string;
  title: string;
  type: string;
  url?: string;
  icon?: React.ElementType;
  breadcrumbs?: boolean;
  children?: MenuItemType[];
}

interface MenuGroupType {
  id: string;
  title: string;
  type: string;
  children: MenuItemType[];
}

interface SidebarProps {
  miniDrawer: boolean;
}

/**
 * Sidebar Component
 * 
 * Primary navigation sidebar for the dashboard with interactive menu items
 * and responsive functionality.
 */
const Sidebar: React.FC<SidebarProps> = ({ miniDrawer }) => {
  const theme = useTheme();
  const matchDownMD = useMediaQuery(theme.breakpoints.down('md'));
  const { user, logout } = useAuth();

  // Get menu state and actions
  const menuState = useMenuState();
  const menuActions = useMenuActions();
  const { isDashboardDrawerOpened } = menuState;
  const { handleDrawerOpen } = menuActions;

  // State for expanded menu items
  const [expanded, setExpanded] = useState<string | null>(null);
  
  // Get current path for highlighting active menu
  const location = useLocation();
  const currentPath = location.pathname;

  // Width of drawer in different states
  const drawerWidth = 220; // Reduced from 260px to 220px for more content space
  const miniDrawerWidth = 70;

  // Toggle submenu expand/collapse
  const handleMenuClick = (id: string) => {
    setExpanded(expanded === id ? null : id);
  };

  // Handle drawer close on mobile
  const handleDrawerClose = () => {
    if (matchDownMD) {
      handleDrawerOpen(false);
    }
  };

  // Menu item component
  const MenuItem = ({ item, level = 0 }: { item: MenuItemType; level?: number }) => {
    const isSelected = currentPath.includes(item.url || '');
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expanded === item.id;

    // Render menu items with children (collapsible)
    if (hasChildren) {
      return (
        <>
          <ListItemButton
            sx={{
              pl: miniDrawer ? 2 : level * 2 + 2,
              py: 1,
              mb: 0.5,
              borderRadius: `${theme.shape.borderRadius}px`,
              '&:hover': {
                bgcolor: 'primary.lighter'
              }
            }}
            selected={isSelected}
            onClick={() => handleMenuClick(item.id)}
          >
            {Icon && (
              <ListItemIcon 
                sx={{ 
                  minWidth: miniDrawer ? 'auto' : 36,
                  color: isSelected ? 'primary.main' : 'text.primary'
                }}
              >
                <Icon size={22} />
              </ListItemIcon>
            )}
            {!miniDrawer && (
              <>
                <ListItemText 
                  primary={
                    <Typography 
                      variant="body1" 
                      color={isSelected ? 'primary.main' : 'inherit'}
                      fontWeight={isSelected ? 'medium' : 'normal'}
                    >
                      {item.title}
                    </Typography>
                  } 
                />
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </>
            )}
          </ListItemButton>
          
          {!miniDrawer && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {item.children.map((child) => (
                  <MenuItem key={child.id} item={child} level={level + 1} />
                ))}
              </List>
            </Collapse>
          )}
        </>
      );
    }

    // Render menu items without children
    return (
      <ListItemButton
        component={Link}
        to={item.url || '/'}
        sx={{
          pl: miniDrawer ? 2 : level * 2 + 2,
          py: 1,
          mb: 0.5,
          borderRadius: `${theme.shape.borderRadius}px`,
          '&:hover': {
            bgcolor: 'primary.lighter'
          }
        }}
        selected={isSelected}
        onClick={handleDrawerClose}
      >
        {Icon && (
          <ListItemIcon 
            sx={{ 
              minWidth: miniDrawer ? 'auto' : 36,
              color: isSelected ? 'primary.main' : 'text.primary'
            }}
          >
            <Icon size={22} />
          </ListItemIcon>
        )}
        {!miniDrawer && (
          <ListItemText 
            primary={
              <Typography 
                variant="body1" 
                color={isSelected ? 'primary.main' : 'inherit'}
                fontWeight={isSelected ? 'medium' : 'normal'}
              >
                {item.title}
              </Typography>
            } 
          />
        )}
      </ListItemButton>
    );
  };

  // Main drawer component
  const drawer = (
    <Box sx={{ px: 2, py: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: miniDrawer ? 'center' : 'flex-start',
        mb: 3
      }}>
        {/* App Logo/Branding */}
        {miniDrawer ? (
          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
            SS
          </Avatar>
        ) : (
          <Typography variant="h5" color="primary.main" fontWeight="bold">
            Swan Studios
          </Typography>
        )}
      </Box>

      {/* User Profile Section */}
      {!miniDrawer && (
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            mb: 3, 
            py: 1.5, 
            px: 2,
            bgcolor: 'primary.lighter',
            borderRadius: 2
          }}
        >
          <Avatar 
            src={user?.photoURL || undefined} 
            sx={{ width: 40, height: 40, mr: 2 }}
          >
            {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="medium">
              {user?.firstName || user?.username}
            </Typography>
            <Chip 
              label={user?.role || 'User'} 
              size="small" 
              color="primary" 
              variant="outlined" 
              sx={{ height: 22, fontSize: '0.75rem' }} 
            />
          </Box>
        </Box>
      )}

      {/* Menu Items */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {dashboard.map((group: MenuGroupType) => (
          <React.Fragment key={group.id}>
            {!miniDrawer && (
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ 
                  px: 3, 
                  py: 1, 
                  display: 'block',
                  textTransform: 'uppercase',
                  fontWeight: 'medium'
                }}
              >
                {group.title}
              </Typography>
            )}
            
            <List component="nav" sx={{ px: 0, py: 0.5 }}>
              {group.children.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </List>
            
            <Divider sx={{ my: 1.5 }} />
          </React.Fragment>
        ))}
      </Box>

      {/* Footer Menu Items */}
      <List component="nav" sx={{ mt: 'auto' }}>
        <ListItemButton
          component={Link}
          to="/settings"
          sx={{
            borderRadius: `${theme.shape.borderRadius}px`,
            mb: 0.5,
            '&:hover': {
              bgcolor: 'primary.lighter'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: miniDrawer ? 'auto' : 36 }}>
            <Settings size={22} />
          </ListItemIcon>
          {!miniDrawer && <ListItemText primary="Settings" />}
        </ListItemButton>
        
        <ListItemButton
          onClick={logout}
          sx={{
            borderRadius: `${theme.shape.borderRadius}px`,
            '&:hover': {
              bgcolor: 'primary.lighter'
            }
          }}
        >
          <ListItemIcon sx={{ minWidth: miniDrawer ? 'auto' : 36 }}>
            <LogOut size={22} />
          </ListItemIcon>
          {!miniDrawer && <ListItemText primary="Logout" />}
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box 
      component="nav" 
      sx={{ 
        flexShrink: { md: 0 },
        width: { md: isDashboardDrawerOpened ? (miniDrawer ? miniDrawerWidth : drawerWidth) : 0 }
      }}
      aria-label="dashboard menu"
    >
      {/* Mobile Drawer */}
      {matchDownMD && (
        <Drawer
          variant="temporary"
          open={isDashboardDrawerOpened}
          onClose={() => handleDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: `1px solid ${theme.palette.divider}`,
              backgroundImage: 'none',
              boxShadow: 'inherit'
            }
          }}
        >
          {drawer}
        </Drawer>
      )}

      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            borderRight: `1px solid ${theme.palette.divider}`,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen
            }),
            overflowX: 'hidden',
            width: isDashboardDrawerOpened ? (miniDrawer ? miniDrawerWidth : drawerWidth) : 0,
            overflowY: 'auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
            padding: 0,
            boxShadow: 'none'
          }
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar;