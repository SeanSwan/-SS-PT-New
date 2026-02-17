import { useEffect, useRef, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import styled, { css } from 'styled-components';

// Swan primitives
import {
  ClickAwayListener,
  Collapse,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Popper,
  Tooltip,
  Typography,
  Box,
} from '../../../ui/primitives';
import { alpha } from '../../../../styles/mui-replacements';

// project imports
import NavItem from '../NavItem/nav-item';
import Transitions from '../../../../components/ui/Transitions';
import useConfig from '../../../../hooks/useConfig';
import { useMenuStates } from '../../../../hooks/useMenuState';

// assets
import { IconChevronDown, IconChevronRight, IconChevronUp } from '@tabler/icons-react';

// Styled nav list item button with complex hover/selected states
const NavListItemButton = styled(ListItemButton)<{
  $borderRadius: number;
  $drawerOpen: boolean;
  $level: number;
  $isSelected: boolean;
}>`
  z-index: 1201;
  border-radius: ${({ $borderRadius }) => `${$borderRadius}px`};
  margin-bottom: 4px;

  ${({ $drawerOpen, $level }) =>
    $drawerOpen && $level !== 1 &&
    css`margin-left: ${$level * 18}px;`}

  ${({ $drawerOpen }) =>
    !$drawerOpen &&
    css`padding-left: 10px;`}

  ${({ $drawerOpen, $level, $isSelected }) =>
    $drawerOpen && $level === 1 &&
    css`
      &:hover { background: ${alpha('#7851A9', 0.15)}; }
      ${$isSelected && css`
        background: ${alpha('#7851A9', 0.15)};
        color: #7851A9;
        &:hover { background: ${alpha('#7851A9', 0.15)}; color: #7851A9; }
      `}
    `}

  ${({ $drawerOpen, $level }) =>
    (!$drawerOpen || $level !== 1) &&
    css`
      padding-top: ${$level === 1 ? '0' : '8px'};
      padding-bottom: ${$level === 1 ? '0' : '8px'};
      &:hover { background: transparent; }
    `}
`;

const NavListItemIcon = styled(ListItemIcon)<{
  $level: number;
  $isSelected: boolean;
  $drawerOpen: boolean;
  $borderRadius: number;
}>`
  min-width: ${({ $level }) => ($level === 1 ? '36px' : '18px')};
  color: ${({ $isSelected }) => ($isSelected ? '#7851A9' : '#FFFFFF')};

  ${({ $drawerOpen, $level, $borderRadius, $isSelected }) =>
    !$drawerOpen && $level === 1 &&
    css`
      border-radius: ${$borderRadius}px;
      width: 46px;
      height: 46px;
      align-items: center;
      justify-content: center;
      &:hover { background: ${alpha('#7851A9', 0.15)}; }
      ${$isSelected && css`
        background: ${alpha('#7851A9', 0.15)};
        &:hover { background: ${alpha('#7851A9', 0.15)}; }
      `}
    `}
`;

// Small dot icon replacement for FiberManualRecordIcon
const DotIcon = styled.span<{ $size: number }>`
  display: inline-block;
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  background: currentColor;
`;

// Decorative vertical line for nested items
const NestedList = styled(List)`
  position: relative;
  &::after {
    content: '';
    position: absolute;
    left: 25px;
    top: 0;
    height: 100%;
    width: 1px;
    opacity: 1;
    background: ${alpha('#00FFFF', 0.3)};
  }
`;

interface NavCollapseProps {
  menu: any;
  level: number;
  parentId: string;
}

const NavCollapse = ({ menu, level, parentId }: NavCollapseProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const { borderRadius } = useConfig();
  const { isDashboardDrawerOpened: drawerOpen } = useMenuStates();

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleClickMini = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(null);
    if (drawerOpen) {
      setOpen(!open);
      setSelected(!selected ? menu.id : null);
    } else {
      setAnchorEl(event?.currentTarget);
    }
  };

  const openMini = Boolean(anchorEl);

  const handleClosePopper = () => {
    setOpen(false);
    if (!openMini) {
      if (!menu.url) {
        setSelected(null);
      }
    }
    setAnchorEl(null);
  };

  const { pathname } = useLocation();

  const checkOpenForParent = (child: any[], id: string) => {
    child.forEach((item) => {
      if (item.url === pathname) {
        setOpen(true);
        setSelected(id);
      }
    });
  };

  // menu collapse for sub-levels
  useEffect(() => {
    setOpen(false);
    openMini ? setAnchorEl(null) : setSelected(null);
    if (menu.children) {
      menu.children.forEach((item: any) => {
        if (item.children?.length) {
          checkOpenForParent(item.children, menu.id);
        }
        if (item.link && !!matchPath({ path: item?.link, end: false }, pathname)) {
          setSelected(menu.id);
          setOpen(true);
        }
        if (item.url === pathname) {
          setSelected(menu.id);
          setOpen(true);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, menu.children]);

  const [hoverStatus, setHover] = useState(false);

  const compareSize = () => {
    const compare = ref.current && ref.current.scrollWidth > ref.current.clientWidth;
    setHover(compare);
  };

  useEffect(() => {
    compareSize();
    window.addEventListener('resize', compareSize);
    return () => {
      window.removeEventListener('resize', compareSize);
    };
  }, []);

  useEffect(() => {
    if (menu.url === pathname) {
      setSelected(menu.id);
      setAnchorEl(null);
      setOpen(true);
    }
  }, [pathname, menu]);

  // menu collapse & item
  const menus = menu.children?.map((item: any) => {
    switch (item.type) {
      case 'collapse':
        return <NavCollapse key={item.id} menu={item} level={level + 1} parentId={parentId} />;
      case 'item':
        return <NavItem key={item.id} item={item} level={level + 1} />;
      default:
        return (
          <Typography key={item.id} variant="h6" color="error" align="center">
            Menu Items Error
          </Typography>
        );
    }
  });

  const isSelected = selected === menu.id;

  const Icon = menu.icon;
  const menuIcon = menu.icon ? (
    <Icon strokeWidth={1.5} size={drawerOpen ? '20px' : '24px'} />
  ) : (
    <DotIcon $size={isSelected ? 8 : 6} />
  );

  const collapseIcon = drawerOpen ? (
    <IconChevronUp stroke={1.5} size="16px" style={{ marginTop: 'auto', marginBottom: 'auto' }} />
  ) : (
    <IconChevronRight stroke={1.5} size="16px" style={{ marginTop: 'auto', marginBottom: 'auto' }} />
  );

  return (
    <>
      <NavListItemButton
        $borderRadius={borderRadius}
        $drawerOpen={drawerOpen}
        $level={level}
        $isSelected={isSelected}
        selected={isSelected}
        {...(!drawerOpen && { onMouseEnter: handleClickMini, onMouseLeave: handleClosePopper })}
        onClick={handleClickMini}
      >
        {menuIcon && (
          <NavListItemIcon
            $level={level}
            $isSelected={isSelected}
            $drawerOpen={drawerOpen}
            $borderRadius={borderRadius}
          >
            {menuIcon}
          </NavListItemIcon>
        )}
        {(drawerOpen || (!drawerOpen && level !== 1)) && (
          <Tooltip title={menu.title}>
            <ListItemText
              primary={
                <Typography
                  ref={ref}
                  noWrap
                  variant={isSelected ? 'h5' : 'body1'}
                  color="inherit"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: 120,
                  }}
                >
                  {menu.title}
                </Typography>
              }
              secondary={
                menu.caption && (
                  <Typography
                    variant="caption"
                    gutterBottom
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      color: alpha('#FFFFFF', 0.5),
                      fontWeight: 400,
                    }}
                  >
                    {menu.caption}
                  </Typography>
                )
              }
            />
          </Tooltip>
        )}

        {openMini || open ? collapseIcon : <IconChevronDown stroke={1.5} size="16px" style={{ marginTop: 'auto', marginBottom: 'auto' }} />}

        {!drawerOpen && (
          <Popper
            open={openMini}
            anchorEl={anchorEl}
            placement="right-start"
            modifiers={[
              {
                name: 'offset',
                options: {
                  offset: [-12, 0],
                },
              },
            ]}
            style={{
              overflow: 'visible',
              zIndex: 2001,
              minWidth: 180,
            }}
          >
            {({ TransitionProps }) => (
              <Transitions in={openMini} {...TransitionProps}>
                <Paper
                  style={{
                    overflow: 'hidden',
                    marginTop: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                    backgroundImage: 'none',
                  }}
                >
                  <ClickAwayListener onClickAway={handleClosePopper}>
                    <Box>{menus}</Box>
                  </ClickAwayListener>
                </Paper>
              </Transitions>
            )}
          </Popper>
        )}
      </NavListItemButton>
      {drawerOpen && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          {open && (
            <NestedList disablePadding>
              {menus}
            </NestedList>
          )}
        </Collapse>
      )}
    </>
  );
};

export default NavCollapse;
