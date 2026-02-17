import { useEffect, useRef, useState } from 'react';
import { Link, matchPath, useLocation } from 'react-router-dom';
import styled, { css } from 'styled-components';

// Swan primitives
import {
  Avatar,
  ButtonBase,
  Chip,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '../../../ui/primitives';
import { useMediaQuery, alpha } from '../../../../styles/mui-replacements';

// project imports
import { useMenuState as useMenuStates } from '../../../../hooks/useMenuState';
import useConfig from '../../../../hooks/useConfig';

// Small dot icon replacement for FiberManualRecordIcon
const DotIcon = styled.span<{ $size: number }>`
  display: inline-block;
  width: ${({ $size }) => `${$size}px`};
  height: ${({ $size }) => `${$size}px`};
  border-radius: 50%;
  background: currentColor;
`;

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

interface NavItemProps {
  item: any;
  level: number;
  isParents?: boolean;
  setSelectedID?: () => void;
}

const NavItem = ({ item, level, isParents = false, setSelectedID }: NavItemProps) => {
  const downMD = useMediaQuery((t) => t.breakpoints.down('md'));
  const ref = useRef<HTMLDivElement>(null);

  const { pathname } = useLocation();
  const { borderRadius } = useConfig();

  const { isDashboardDrawerOpened: drawerOpen, setIsDashboardDrawerOpened } = useMenuStates();
  const isSelected = !!matchPath({ path: item?.link ? item.link : item.url, end: false }, pathname);

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

  const Icon = item?.icon;
  const itemIcon = item?.icon ? (
    <Icon stroke={1.5} size={drawerOpen ? '20px' : '24px'} style={{ ...(isParents && { fontSize: 20, stroke: '1.5' }) }} />
  ) : (
    <DotIcon $size={isSelected ? 8 : 6} />
  );

  let itemTarget = '_self';
  if (item.target) {
    itemTarget = '_blank';
  }

  const itemHandler = () => {
    if (downMD) setIsDashboardDrawerOpened(false);

    if (isParents && setSelectedID) {
      setSelectedID();
    }
  };

  return (
    <>
      <NavListItemButton
        as={Link}
        to={item.url}
        target={itemTarget}
        $borderRadius={borderRadius}
        $drawerOpen={drawerOpen}
        $level={level}
        $isSelected={isSelected}
        selected={isSelected}
        onClick={() => itemHandler()}
      >
        <ButtonBase aria-label="theme-icon" style={{ borderRadius: `${borderRadius}px` }}>
          <NavListItemIcon
            $level={level}
            $isSelected={isSelected}
            $drawerOpen={drawerOpen}
            $borderRadius={borderRadius}
          >
            {itemIcon}
          </NavListItemIcon>
        </ButtonBase>

        {(drawerOpen || (!drawerOpen && level !== 1)) && (
          <Tooltip title={item.title}>
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
                    width: 102,
                  }}
                >
                  {item.title}
                </Typography>
              }
              secondary={
                item.caption && (
                  <Typography
                    variant="caption"
                    gutterBottom
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      color: alpha('#FFFFFF', 0.5),
                    }}
                  >
                    {item.caption}
                  </Typography>
                )
              }
            />
          </Tooltip>
        )}

        {drawerOpen && item.chip && (
          <Chip
            color={item.chip.color}
            variant={item.chip.variant}
            size={item.chip.size}
            label={item.chip.label}
            icon={item.chip.avatar && <Avatar size={20}>{item.chip.avatar}</Avatar>}
          />
        )}
      </NavListItemButton>
    </>
  );
};

export default NavItem;
