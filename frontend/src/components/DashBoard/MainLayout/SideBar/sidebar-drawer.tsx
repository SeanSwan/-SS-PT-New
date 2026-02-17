// src/components/DashBoard/MainLayout/Sidebar/sidebar-drawer.tsx
import { memo, useMemo } from 'react';
import styled from 'styled-components';

// Swan primitives
import { Chip, Drawer, Stack, Box } from '../../../ui/primitives';
import { useMediaQuery, BREAKPOINT_VALUES } from '../../../../styles/mui-replacements';

// Third party imports
import PerfectScrollbar from 'react-perfect-scrollbar';

// Project imports
import MenuCard from './MenuCard/menu-card';
import MenuList from '../../MenuList/menu-list';
import LogoSection from '../LogoSection/logo-section';
import MiniDrawerStyled from './mini-drawer-styled';

// Fixed import for useConfig - using default import
import useConfig from '../../../../hooks/useConfig';
import { useMenuActions, useMenuState as useMenuStates } from '../../../../hooks/useMenuState';

// Define constant for drawer width
const drawerWidth = 260;

// Responsive nav container
const NavContainer = styled.nav`
  width: auto;
  @media (min-width: ${BREAKPOINT_VALUES.md}px) {
    flex-shrink: 0;
    width: ${drawerWidth}px;
  }
`;

/**
 * SidebarDrawer Component
 *
 * Renders the sidebar navigation with drawer functionality.
 * Responsive design adjusts based on screen size and configuration.
 */
const SidebarDrawer = () => {
  const downMD = useMediaQuery((t) => t.breakpoints.down('md'));

  const { isDashboardDrawerOpened: drawerOpen } = useMenuStates();
  const { handleDrawerOpen } = useMenuActions();

  // Get configuration from context
  const config = useConfig();
  const { navType, borderRadius } = config;

  // Determine if mini drawer should be shown based on container setting
  // Using container as a proxy for miniDrawer since your config doesn't have miniDrawer
  const miniDrawer = config.container;

  // Logo section memoized to prevent unnecessary re-renders
  const logo = useMemo(
    () => (
      <Box style={{ display: 'flex', padding: 16 }}>
        <LogoSection />
      </Box>
    ),
    []
  );

  // Drawer content memoized to prevent unnecessary re-renders
  const drawer = useMemo(() => {
    const drawerContent = (
      <>
        <MenuCard />
        <Stack direction="row" style={{ justifyContent: 'center', marginBottom: 16 }}>
          <Chip label={import.meta.env.VITE_APP_VERSION || 'v1.0'} size="small" />
        </Stack>
      </>
    );

    // Styling based on drawer state
    let drawerSX: React.CSSProperties = { paddingLeft: '0px', paddingRight: '0px', marginTop: '20px' };
    if (drawerOpen) drawerSX = { paddingLeft: '16px', paddingRight: '16px', marginTop: '0px' };

    return (
      <>
        {downMD ? (
          <Box style={drawerSX}>
            <MenuList />
            {drawerOpen && drawerContent}
          </Box>
        ) : (
          <PerfectScrollbar style={{ height: 'calc(100vh - 88px)', ...drawerSX }}>
            <MenuList />
            {drawerOpen && drawerContent}
          </PerfectScrollbar>
        )}
      </>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downMD, drawerOpen, navType]);

  return (
    <NavContainer aria-label="sidebar navigation">
      {downMD || (miniDrawer && drawerOpen) ? (
        <Drawer
          variant={downMD ? 'temporary' : 'persistent'}
          anchor="left"
          open={drawerOpen}
          onClose={() => handleDrawerOpen(!drawerOpen)}
          PaperProps={{
            sx: {
              marginTop: downMD ? 0 : '88px',
              zIndex: 1099,
              width: drawerWidth,
              background: '#0a0a1a',
              color: '#FFFFFF',
              borderRight: 'none',
            },
          }}
          ModalProps={{ keepMounted: true }}
        >
          {downMD && logo}
          {drawer}
        </Drawer>
      ) : (
        <MiniDrawerStyled variant="permanent" open={drawerOpen}>
          {logo}
          {drawer}
        </MiniDrawerStyled>
      )}
    </NavContainer>
  );
};

export default memo(SidebarDrawer);
