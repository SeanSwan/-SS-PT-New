import { memo, useState } from 'react';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

// project imports
import NavItem from './nav-item';
import NavGroup from './nav-group';
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
}

interface CollapseMenuItem extends BaseMenuItem {
  type: 'collapse';
  children: Array<ItemMenuItem | CollapseMenuItem>;
}

// Combined type for all menu items
type MenuItem = GroupMenuItem | ItemMenuItem | CollapseMenuItem;

const MenuList = () => {
  const { isDashboardDrawerOpened: drawerOpen } = useMenuStates();
  const [selectedID, setSelectedID] = useState('');

  const lastItem = null;

  let lastItemIndex = menuItems.items.length - 1;
  let remItems: any[] = [];
  let lastItemId;

  if (lastItem && lastItem < menuItems.items.length) {
    lastItemId = menuItems.items[lastItem - 1].id;
    lastItemIndex = lastItem - 1;
    remItems = menuItems.items.slice(lastItem - 1, menuItems.items.length).map((item) => ({
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(('url' in item && item.url) && { url: item.url }) // Check if url exists
    }));
  }

  const navItems = menuItems.items.slice(0, lastItemIndex + 1).map((item, index) => {
    switch (item.type) {
      case 'group':
        // Check if url exists on the item before accessing it
        if ('url' in item && item.url && item.id !== lastItemId) {
          return (
            <List key={item.id}>
              <NavItem item={item} level={1} isParents setSelectedID={() => setSelectedID('')} />
              {index !== 0 && <Divider sx={{ py: 0.5 }} />}
            </List>
          );
        }

        return (
          <NavGroup
            key={item.id}
            setSelectedID={setSelectedID}
            item={item}
            lastItem={lastItem}
            remItems={remItems}
            lastItemId={lastItemId}
          />
        );
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Menu Items Error
          </Typography>
        );
    }
  });

  return <Box {...(drawerOpen && { sx: { mt: 1.5 } })}>{navItems}</Box>;
};

export default memo(MenuList);