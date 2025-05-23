import { memo, useState, useCallback } from 'react';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports - corrected paths to match directory structure
import NavItem from './NavItem/nav-item';
import NavGroup from './NavGroup/nav-group';
import { useMenuStates } from '../../../hooks/useMenuState';

// Import menu items from your menu structure file
import menuItems from '../../../store/menu-items';

// Define interfaces for your menu item types
interface BaseMenuItem {
  id: string;
  title: string;
  type: string;
  icon: any;
}

interface GroupMenuItem extends BaseMenuItem {
  type: 'group';
  children: Array<ItemMenuItem | CollapseMenuItem>;
  caption?: string;
  url?: string; // Optional URL for group items
}

interface ItemMenuItem extends BaseMenuItem {
  type: 'item';
  url: string;
  breadcrumbs?: boolean;
  target?: boolean;
  disabled?: boolean; // Added for disabled menu items
}

interface CollapseMenuItem extends BaseMenuItem {
  type: 'collapse';
  children: Array<ItemMenuItem | CollapseMenuItem>;
  disabled?: boolean; // Added for disabled sections
}

// Combined type for all menu items
type MenuItem = GroupMenuItem | ItemMenuItem | CollapseMenuItem;

/**
 * MenuList Component
 * 
 * Renders the navigation menu structure for the dashboard.
 * Enhanced with:
 * - Performance optimizations using memo and useCallback
 * - Proper TypeScript typing
 * - Improved error handling and fallbacks
 * - Support for disabled menu items
 */
const MenuList = () => {
  const { isDashboardDrawerOpened: drawerOpen } = useMenuStates();
  const [selectedID, setSelectedID] = useState('');

  // Memoize the setSelectedID handler to prevent unnecessary re-renders
  const handleSetSelectedID = useCallback((id: string) => {
    setSelectedID(id);
  }, []);

  // Reset selected ID
  const resetSelectedID = useCallback(() => {
    setSelectedID('');
  }, []);

  const lastItem = null;

  let lastItemIndex = menuItems.items.length - 1;
  let remItems: any[] = [];
  let lastItemId;

  // Handle partial menu rendering if lastItem is specified
  if (lastItem && lastItem < menuItems.items.length) {
    lastItemId = menuItems.items[lastItem - 1].id;
    lastItemIndex = lastItem - 1;
    remItems = menuItems.items.slice(lastItem - 1, menuItems.items.length).map((item) => ({
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(('url' in item && item.url) && { url: item.url }),
      // Add any additional properties needed
      disabled: 'disabled' in item ? item.disabled : false
    }));
  }

  // Render menu items
  const navItems = menuItems.items.slice(0, lastItemIndex + 1).map((item, index) => {
    switch (item.type) {
      case 'group':
        // Check if url exists on the item before accessing it
        if ('url' in item && item.url && item.id !== lastItemId) {
          return (
            <List key={item.id}>
              <NavItem item={item} level={1} isParents setSelectedID={resetSelectedID} />
              {index !== 0 && <Divider sx={{ py: 0.5 }} />}
            </List>
          );
        }

        return (
          <NavGroup
            key={item.id}
            setSelectedID={handleSetSelectedID}
            item={item}
            lastItem={lastItem}
            remItems={remItems}
            lastItemId={lastItemId}
          />
        );
      default:
        // Enhanced error display for debugging
        return (
          <Typography 
            key={item.id} 
            variant="h6" 
            color="error" 
            align="center"
            sx={{ p: 2, border: '1px dashed', borderColor: 'error.main', borderRadius: 1, m: 1 }}
          >
            Menu Item Error: Invalid Type "{item.type}"
          </Typography>
        );
    }
  });

  // Add a fallback for empty menu
  if (navItems.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No menu items available
        </Typography>
      </Box>
    );
  }

  return (
    <Box 
      {...(drawerOpen && { 
        sx: { 
          mt: 1.5,
          transition: 'margin-top 0.3s ease-in-out'
        } 
      })}
    >
      {navItems}
    </Box>
  );
};

export default memo(MenuList);