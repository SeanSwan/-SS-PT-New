import { useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

// Swan primitives
import { Divider, List, Typography } from '../../../ui/primitives/components';

// project imports - corrected paths to match directory structure
import NavCollapse from '../NavCollapse/nav-collapse';
import NavItem from '../NavItem/nav-item';
import { useMenuState as useMenuStates } from '../../../../hooks/useMenuState';

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
          />
        );
      case 'item':
        return (
          <NavItem
            key={menu.id}
            item={menu}
            level={1}
          />
        );
      default:
        return (
          <Typography
            key={menu?.id}
            variant="h6"
            style={{
              padding: 8,
              borderRadius: 4,
              background: 'rgba(244, 67, 54, 0.2)',
              color: '#f44336',
              opacity: 0.8,
              margin: '4px 0',
              textAlign: 'center'
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
        style={{ position: 'relative' }}
      >
        {currentItem.title && drawerOpen && (
          <Typography
            variant="caption"
            style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: '#FFFFFF',
              padding: '12px 0 5px 12px',
              letterSpacing: '0.3px',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {currentItem.title}
            {currentItem.caption && (
              <Typography
                variant="caption"
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginTop: 4
                }}
              >
                {currentItem.caption}
              </Typography>
            )}
          </Typography>
        )}
        {items}
      </List>

      {/* group divider - only show when drawer is open */}
      {drawerOpen && <Divider style={{ marginTop: 2, marginBottom: 10 }} />}
    </>
  );
};

export default NavGroup;
