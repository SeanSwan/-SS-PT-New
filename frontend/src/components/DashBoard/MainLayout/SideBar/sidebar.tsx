import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled, { css } from 'styled-components';

// Swan primitives
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
  Avatar,
  Chip,
} from '../../../ui/primitives/components';
import { useMediaQuery, BREAKPOINT_VALUES } from '../../../../styles/mui-replacements';

import {
  ChevronRight,
  ChevronDown,
  LogOut,
  Settings
} from 'lucide-react';

// Import MCP Status Dot
import McpStatusDot from '../../../ui/McpStatusDot';

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

// Styled sidebar list item button
const SidebarListItemButton = styled(ListItemButton)<{
  $isSelected?: boolean;
  $borderRadius?: number;
}>`
  padding: 8px;
  margin-bottom: 4px;
  border-radius: ${({ $borderRadius }) => $borderRadius || 8}px;
  &:hover {
    background: rgba(0, 255, 255, 0.08);
  }
  ${({ $isSelected }) =>
    $isSelected &&
    css`
      background: rgba(0, 255, 255, 0.12);
      &:hover {
        background: rgba(0, 255, 255, 0.18);
      }
    `}
`;

// Styled nav container for responsive width
const NavContainer = styled.nav<{ $drawerOpen?: boolean; $miniDrawer?: boolean; $drawerWidth?: number; $miniDrawerWidth?: number }>`
  @media (min-width: ${BREAKPOINT_VALUES.md}px) {
    flex-shrink: 0;
    width: ${({ $drawerOpen, $miniDrawer, $drawerWidth, $miniDrawerWidth }) =>
      $drawerOpen ? ($miniDrawer ? `${$miniDrawerWidth}px` : `${$drawerWidth}px`) : '0px'};
  }
`;

/**
 * Sidebar Component
 *
 * Primary navigation sidebar for the dashboard with interactive menu items
 * and responsive functionality.
 */
const Sidebar: React.FC<SidebarProps> = ({ miniDrawer }) => {
  const matchDownMD = useMediaQuery(`(max-width: ${BREAKPOINT_VALUES.md - 1}px)`);
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
  const drawerWidth = 220;
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
          <SidebarListItemButton
            $isSelected={isSelected}
            $borderRadius={8}
            style={{ paddingLeft: miniDrawer ? 16 : level * 16 + 16 }}
            onClick={() => handleMenuClick(item.id)}
          >
            {Icon && (
              <ListItemIcon
                style={{
                  minWidth: miniDrawer ? 'auto' : 36,
                  color: isSelected ? '#00FFFF' : '#FFFFFF'
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
                      style={{
                        color: isSelected ? '#00FFFF' : 'inherit',
                        fontWeight: isSelected ? 500 : 400
                      }}
                    >
                      {item.title}
                    </Typography>
                  }
                />
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </>
            )}
          </SidebarListItemButton>

          {!miniDrawer && (
            <Collapse in={isExpanded} timeout={300} unmountOnExit>
              <List disablePadding>
                {item.children!.map((child) => (
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
      <SidebarListItemButton
        as={Link}
        to={item.url || '/'}
        $isSelected={isSelected}
        $borderRadius={8}
        style={{ paddingLeft: miniDrawer ? 16 : level * 16 + 16 }}
        onClick={handleDrawerClose}
      >
        {Icon && (
          <ListItemIcon
            style={{
              minWidth: miniDrawer ? 'auto' : 36,
              color: isSelected ? '#00FFFF' : '#FFFFFF'
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
                style={{
                  color: isSelected ? '#00FFFF' : 'inherit',
                  fontWeight: isSelected ? 500 : 400
                }}
              >
                {item.title}
              </Typography>
            }
          />
        )}
      </SidebarListItemButton>
    );
  };

  // Main drawer component
  const drawer = (
    <Box style={{ padding: 16, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: miniDrawer ? 'center' : 'flex-start',
        marginBottom: 24
      }}>
        {/* App Logo/Branding */}
        {miniDrawer ? (
          <Avatar style={{ background: '#00FFFF', color: '#0a0a1a', width: 40, height: 40 }}>
            SS
          </Avatar>
        ) : (
          <Typography variant="h5" style={{ color: '#00FFFF', fontWeight: 'bold' }}>
            Swan Studios
          </Typography>
        )}
      </Box>

      {/* User Profile Section */}
      {!miniDrawer && (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: 24,
            padding: '12px 16px',
            background: 'rgba(0, 255, 255, 0.08)',
            borderRadius: 8
          }}
        >
          <Avatar
            src={user?.photoURL || undefined}
            style={{ width: 40, height: 40, marginRight: 16 }}
          >
            {user?.firstName?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="subtitle1" style={{ fontWeight: 500 }}>
              {user?.firstName || user?.username}
            </Typography>
            <Chip
              label={user?.role || 'User'}
              size="small"
              style={{ height: 22, fontSize: '0.75rem' }}
            />
          </Box>
        </Box>
      )}

      {/* MCP Server Status */}
      {user?.role === 'admin' && (
        <Box style={{ marginBottom: 12, paddingLeft: miniDrawer ? 0 : 16 }}>
          <McpStatusDot miniMode={miniDrawer} />
        </Box>
      )}

      {/* Menu Items */}
      <Box style={{ flexGrow: 1, overflowY: 'auto' }}>
        {dashboard.map((group: MenuGroupType) => (
          <React.Fragment key={group.id}>
            {!miniDrawer && (
              <Typography
                variant="caption"
                style={{
                  padding: '8px 24px',
                  display: 'block',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.5)'
                }}
              >
                {group.title}
              </Typography>
            )}

            <List style={{ padding: '4px 0' }}>
              {group.children.map((item) => (
                <MenuItem key={item.id} item={item} />
              ))}
            </List>

            <Divider style={{ margin: '12px 0' }} />
          </React.Fragment>
        ))}
      </Box>

      {/* Footer Menu Items */}
      <List style={{ marginTop: 'auto' }}>
        <SidebarListItemButton
          as={Link}
          to="/settings"
          $borderRadius={8}
        >
          <ListItemIcon style={{ minWidth: miniDrawer ? 'auto' : 36 }}>
            <Settings size={22} />
          </ListItemIcon>
          {!miniDrawer && <ListItemText primary="Settings" />}
        </SidebarListItemButton>

        <SidebarListItemButton
          $borderRadius={8}
          onClick={logout}
        >
          <ListItemIcon style={{ minWidth: miniDrawer ? 'auto' : 36 }}>
            <LogOut size={22} />
          </ListItemIcon>
          {!miniDrawer && <ListItemText primary="Logout" />}
        </SidebarListItemButton>
      </List>
    </Box>
  );

  return (
    <NavContainer
      $drawerOpen={isDashboardDrawerOpened}
      $miniDrawer={miniDrawer}
      $drawerWidth={drawerWidth}
      $miniDrawerWidth={miniDrawerWidth}
      aria-label="dashboard menu"
    >
      {/* Mobile Drawer */}
      {matchDownMD && (
        <Drawer
          variant="temporary"
          open={isDashboardDrawerOpened}
          onClose={() => handleDrawerOpen(false)}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              backgroundImage: 'none',
              background: '#0a0a1a',
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
        PaperProps={{
          sx: {
            boxSizing: 'border-box',
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            transition: 'width 0.3s ease',
            overflowX: 'hidden',
            width: isDashboardDrawerOpened ? (miniDrawer ? miniDrawerWidth : drawerWidth) : 0,
            overflowY: 'auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
            padding: 0,
            boxShadow: 'none',
            background: '#0a0a1a',
            display: matchDownMD ? 'none' : 'block',
          }
        }}
      >
        {drawer}
      </Drawer>
    </NavContainer>
  );
};

export default Sidebar;
