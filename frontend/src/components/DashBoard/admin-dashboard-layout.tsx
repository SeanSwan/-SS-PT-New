import React from 'react';
import { Outlet, Routes, Route, useLocation } from 'react-router-dom';
import { styled, useTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';

// Import components
import MainLayout from './MainLayout/main-layout';
import AdminSessionsView from './Pages/admin-sessions/admin-sessions-view';
import DashboardView from './dashboard-view';

// Import config
import { gridSpacing } from './berryAdminConfig';

// Create styled wrapper
const MainWrapper = styled('div')(({ theme }) => ({
  display: 'flex',
  minHeight: '100vh',
  overflow: 'hidden',
  width: '100%'
}));

const ContentWrapper = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(gridSpacing),
  marginTop: '64px', // Header height
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  [theme.breakpoints.up('md')]: {
    marginLeft: '260px', // Sidebar width
    width: `calc(100% - 260px)`
  },
  [theme.breakpoints.down('md')]: {
    marginLeft: '0',
    width: '100%',
    padding: theme.spacing(2)
  }
}));

/**
 * AdminDashboardLayout Component
 * 
 * This component provides the main layout for the admin dashboard, including
 * the sidebar, header, and content area. It also sets up the routing for all
 * admin dashboard pages.
 */
const AdminDashboardLayout: React.FC = () => {
  const theme = useTheme();
  const location = useLocation();

  return (
    <MainWrapper>
      <CssBaseline />
      <MainLayout>
        <ContentWrapper>
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/admin-sessions" element={<AdminSessionsView />} />
            {/* Add other admin routes here */}
            <Route path="*" element={<DashboardView />} />
          </Routes>
        </ContentWrapper>
      </MainLayout>
    </MainWrapper>
  );
};

export default AdminDashboardLayout;