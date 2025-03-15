import { useEffect, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';

// material-ui
import { useTheme } from '@mui/material/styles';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import Typography from '@mui/material/Typography';

// project imports
import NavCollapse from './nav-collapse';
import NavItem from './nav-item';
import { useMenuStates } from '../../../hooks/useMenuState';

interface NavGroupProps {
  item: any;
  lastItem?: number | null;
  remItems?: any[];
  lastItemId?: string;
  setSelectedID: (id: string) => void;
}

const NavGroup = ({ item, lastItem = null, remItems = [], lastItemId, setSelectedID }: NavGroupProps) => {
  const theme = useTheme();
  const { pathname } = useLocation();

  const { isDashboardDrawerOpened: drawerOpen } = useMenuStates();

  const [currentItem, setCurrentItem] = useState(item);

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

  const checkOpenForParent = (child: any[], id: string) => {
    child.forEach((ele) => {
      if (ele.children?.length) {
        checkOpenForParent(ele.children, currentItem.id);
      }
      if (ele?.url && !!matchPath({ path: ele?.link ? ele.link : ele.url, end: true }, pathname)) {
        setSelectedID(id);
      }
    });
  };

  const checkSelectedOnload = (data: any) => {
    const childrens = data.children ? data.children : [];
    childrens.forEach((itemCheck: any) => {
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

  // keep selected-menu on page load and use for horizontal menu close on change routes
  useEffect(() => {
    checkSelectedOnload(currentItem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, currentItem]);

  // menu list collapse & items
  const items = currentItem.children?.map((menu: any) => {
    switch (menu?.type) {
      case 'collapse':
        return <NavCollapse key={menu.id} menu={menu} level={1} parentId={currentItem.id} />;
      case 'item':
        return <NavItem key={menu.id} item={menu} level={1} />;
      default:
        return (
          <Typography key={menu?.id} variant="h6" color="error" align="center">
            Menu Items Error
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
                padding: '12px 0 5px 12px'
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
                    color: 'text.secondary'
                  }}
                >
                  {currentItem.caption}
                </Typography>
              )}
            </Typography>
          )
        }
      >
        {items}
      </List>

      {/* group divider */}
      {drawerOpen && <Divider sx={{ mt: 0.25, mb: 1.25 }} />}
    </>
  );
};

export default NavGroup;