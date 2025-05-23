import { useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';

// project imports - corrected paths to match directory structure
import NavCollapse from '../NavCollapse/nav-collapse';
import NavItem from '../NavItem/nav-item';
import { useMenuStates } from '../../../../hooks/useMenuState';

/**
 * Types for NavGroup component props and menu items
 */
interface MenuItem {
  id: string;
  title: string;
  type: string;
  url?: string;
  link?: string;
  icon?: React.ReactNode;
  caption?: string;
  children?: MenuItem[];
}

interface NavGroupProps {
  item: MenuItem;
  lastItem?: number | null;
  remItems?: any[];
  lastItemId?: string;
  setSelectedID: (id: string) => void;
}

/**
 * NavGroup Component
 * 
 * Renders a group of navigation items, which can include regular items and collapsible sections.
 * Handles active item detection and menu expansion.
 */
const NavGroup = ({ item, lastItem = null, remItems = [], lastItemId, setSelectedID }: NavGroupProps) => {
  const theme = useTheme();
  const { pathname } = useLocation();
  const { isDashboardDrawerOpened: drawerOpen } = useMenuStates();
  const [currentItem, setCurrentItem] = useState<MenuItem>(item);

  // Handle special case for last item in the menu
  useEffect(() => {
    if (lastItem) {
      if (item.id === lastItemId) {
        const localItem = { ...item };
        const elements = remItems.map((ele) => ele.elements);
        localItem.children = elements.flat(1);
        setCurrentItem(localItem);
      } else {
        setCurrentItem(item);
      }
    }
  }, [item, lastItem, remItems, lastItemId]);

  /**
   * Check if any child item matches current path and set parent as selected
   */
  const checkOpenForParent = (child: MenuItem[], id: string) => {
    child.forEach((ele) => {
      if (ele.children?.length) {
        checkOpenForParent(ele.children, currentItem.id);
      }
      if (ele?.url && !!matchPath({ path: ele?.link ? ele.link : ele.url, end: true }, pathname)) {
        setSelectedID(id);
      }
    });
  };

  /**
   * Check if current item or any of its children should be selected on page load
   */
  const checkSelectedOnload = (data: MenuItem) => {
    const childrens = data.children ? data.children : [];
    childrens.forEach((itemCheck: MenuItem) => {
      if (itemCheck?.children?.length) {
        checkOpenForParent(itemCheck.children, currentItem.id);
      }
      if (itemCheck?.url && !!matchPath({ path: itemCheck?.link ? itemCheck.link : itemCheck.url, end: true }, pathname)) {
        setSelectedID(currentItem.id);
      }
    });

    if (data?.url && !!matchPath({ path: data?.link ? data.link : data.url, end: true }, pathname)) {
      setSelectedID(currentItem.id);
    }
  };

  // Keep selected-menu on page load and use for horizontal menu close on change routes
  useEffect(() => {
    checkSelectedOnload(currentItem);
  }, [pathname, currentItem]);

  // Menu list collapse & items with improved type safety
  const items = currentItem.children?.map((menu: MenuItem) => {
    switch (menu?.type) {
      case 'collapse':
        return (
          <NavCollapse 
            key={menu.id} 
            menu={menu} 
            level={1} 
            parentId={currentItem.id}
            // Removed setSelectedID prop as it's not part of NavCollapseProps
          />
        );
      case 'item':
        return (
          <NavItem 
            key={menu.id} 
            item={menu} 
            level={1}
            // Only pass setSelectedID if NavItem expects it
          />
        );
      default:
        return (
          <Typography 
            key={menu?.id} 
            variant="h6" 
            color="error" 
            align="center"
            sx={{ 
              p: 1, 
              borderRadius: 1,
              bgcolor: theme.palette.mode === 'dark' ? 'error.dark' : 'error.light',
              color: theme.palette.mode === 'dark' ? 'error.light' : 'error.dark',
              opacity: 0.8,
              my: 0.5
            }}
          >
            Menu Items Error: {menu?.title || 'Unknown Item'}
          </Typography>
        );
    }
  });

  return (
    <>
      <List
        disablePadding={!drawerOpen}
        subheader={
          currentItem.title &&
          drawerOpen && (
            <Typography 
              variant="caption" 
              gutterBottom 
              sx={{ 
                display: 'block', 
                fontSize: '0.875rem',
                fontWeight: 500,
                color: 'text.primary',
                padding: '12px 0 5px 12px',
                letterSpacing: '0.3px',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {currentItem.title}
              {currentItem.caption && (
                <Typography 
                  variant="caption" 
                  gutterBottom 
                  sx={{ 
                    display: 'block', 
                    fontSize: '0.75rem',
                    fontWeight: 400,
                    color: 'text.secondary',
                    mt: 0.5
                  }}
                >
                  {currentItem.caption}
                </Typography>
              )}
            </Typography>
          )
        }
        sx={{
          '& .MuiListItemButton-root': {
            borderRadius: 1,
            mb: 0.5,
            alignItems: 'flex-start',
            backgroundColor: theme.palette.mode === 'dark' ? 'transparent' : 'inherit',
            py: 1,
            pl: 2
          },
          '& .MuiListItemIcon-root': {
            minWidth: 28,
            color: theme.palette.mode === 'dark' ? 'primary.light' : 'inherit'
          },
          '& .MuiListItemText-primary': {
            fontSize: '0.875rem',
            color: theme.palette.mode === 'dark' ? 'text.primary' : 'inherit'
          }
        }}
      >
        {items}
      </List>

      {/* group divider - only show when drawer is open */}
      {drawerOpen && <Divider sx={{ mt: 0.25, mb: 1.25 }} />}
    </>
  );
};

export default NavGroup;