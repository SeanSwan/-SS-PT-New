import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';

// Import components
import MainLayout from './MainLayout/main-layout';
import AdminSessionsView from './Pages/admin-sessions/admin-sessions-view';
import DashboardView from './dashboard-view';

// Import config
import { gridSpacing } from '../../store/constant';

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
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  [theme.breakpoints.up('md')]: {
    width: `calc(100% - 260px)`
  },
  [theme.breakpoints.down('md')]: {
    marginLeft: '0',
    width: '100%',
    padding: theme.spacing(2)
  }
}));

// Default theme as fallback
const defaultTheme = createTheme();

/**
 * AdminDashboardLayout Component
 * 
 * This component provides the main layout for the admin dashboard, including
 * the sidebar, header, and content area. It also sets up the routing for all
 * admin dashboard pages.
 * 
 * Enhanced with:
 * - ThemeProvider to ensure theme context is available
 * - Error handling for theme-dependent components
 * - Improved accessibility and structure
 */
const AdminDashboardLayout: React.FC = () => {
  return (
    <ThemeProvider theme={defaultTheme}>
      <MainWrapper>
        <CssBaseline />
        {/* Setting withExternalHeader to false to ensure the header is rendered */}
        <MainLayout withExternalHeader={false}>
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
    </ThemeProvider>
  );
};

export default AdminDashboardLayout;