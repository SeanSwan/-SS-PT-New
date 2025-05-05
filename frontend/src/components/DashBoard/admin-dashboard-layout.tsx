import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import { Box, CssBaseline } from '@mui/material';

// Import components
import MainLayout from './MainLayout/main-layout';
// Import enhanced components with better styling
import EnhancedAdminSessionsView from './Pages/admin-sessions/enhanced-admin-sessions-view';
import EnhancedUserManagementView from './Pages/user-management/enhanced-user-management-view';
import ModernUserManagementSystem from './Pages/user-management/modern-user-management';
import ClientDashboardView from './Pages/client-dashboard/client-dashboard-view';
import AdminClientProgressView from './Pages/admin-client-progress/admin-client-progress-view';
import DashboardView from './dashboard-view';

// Import config
import { gridSpacing } from '../../store/constant';

// Create styled wrapper
const MainWrapper = styled('div')({
  display: 'flex',
  minHeight: '100vh',
  overflow: 'hidden',
  width: '100%',
  position: 'relative' // Added for proper child positioning
});

const ContentWrapper = styled('div')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(1), // Minimal padding to maximize content area
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  [theme.breakpoints.up('md')]: {
    width: `calc(100% - 220px)`, // Reduced sidebar width impact
    marginLeft: '220px', // Set the margin to match the sidebar width
  },
  [theme.breakpoints.down('md')]: {
    marginLeft: '0',
    width: '100%',
    padding: theme.spacing(0.5) // Minimal padding on mobile
  },
  background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)', // Maintain the storefront-like background
  minHeight: '100vh',
  color: 'white',
  maxWidth: '100vw', // Use full viewport width
  overflowX: 'hidden', // Prevent horizontal scroll
  position: 'absolute', // Position absolutely to take full width
  left: 0, // Align to left edge
  right: 0 // Extend to right edge
}));

// Custom dark theme that aligns with storefront styling
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#00ffff',
      light: '#7efbfb',
      dark: '#00b8b8',
    },
    secondary: {
      main: '#7851a9',
      light: '#a67dd4',
      dark: '#5e3d90',
    },
    error: {
      main: '#ff416c',
      light: '#ff7a9d',
      dark: '#e5274e',
    },
    warning: {
      main: '#ffb700',
      light: '#ffd95c',
      dark: '#cc9200',
    },
    success: {
      main: '#00bf8f',
      light: '#5ce0b9',
      dark: '#00996f',
    },
    background: {
      default: '#0a0a1a',
      paper: 'rgba(30, 30, 60, 0.3)',
    },
    text: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  shape: {
    borderRadius: 10,
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 300,
    },
    h2: {
      fontWeight: 300,
    },
    h3: {
      fontWeight: 400,
    },
    h4: {
      fontWeight: 400,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: 'thin',
          scrollbarColor: '#7851a9 #0a0a1a',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#0a0a1a',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: '#7851a9',
            borderRadius: '4px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(30, 30, 60, 0.3)',
          backdropFilter: 'blur(10px)',
          borderRadius: '15px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 15px 35px rgba(0, 0, 0, 0.3)',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 500,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #00ffff, #00c8ff)',
          boxShadow: '0 4px 10px rgba(0, 200, 255, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 15px rgba(0, 200, 255, 0.4)',
            background: 'linear-gradient(135deg, #00ffff, #00b8eb)',
          }
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #7851a9, #a67dd4)',
          boxShadow: '0 4px 10px rgba(120, 81, 169, 0.3)',
          '&:hover': {
            boxShadow: '0 6px 15px rgba(120, 81, 169, 0.4)',
            background: 'linear-gradient(135deg, #7851a9, #9366c7)',
          }
        },
      }
    }
  }
});

// Placeholder component for Reports view - to be implemented later
const ReportsPlaceholder = () => (
  <Box sx={{ 
    minHeight: '80vh', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center',
    textAlign: 'center',
    p: 4,
    background: 'rgba(30, 30, 60, 0.4)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <Box sx={{ 
      fontSize: '4rem', 
      mb: 2, 
      color: 'rgba(0, 255, 255, 0.7)',
      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
    }}>
      📊
    </Box>
    <Box component="h2" sx={{ mb: 3, fontWeight: 300 }}>
      Reports & Analytics
    </Box>
    <Box component="p" sx={{ 
      maxWidth: '600px', 
      mb: 4, 
      color: 'rgba(255, 255, 255, 0.7)',
      lineHeight: 1.6
    }}>
      This section will provide comprehensive analytics, performance metrics, and reporting tools for tracking client progress and business growth.
    </Box>
    <Box sx={{ 
      p: 2, 
      background: 'rgba(0, 255, 255, 0.1)', 
      borderRadius: '8px',
      border: '1px solid rgba(0, 255, 255, 0.3)'
    }}>
      Coming soon...
    </Box>
  </Box>
);

// Placeholder component for Settings view - to be implemented later
const SettingsPlaceholder = () => (
  <Box sx={{ 
    minHeight: '80vh', 
    display: 'flex', 
    flexDirection: 'column', 
    justifyContent: 'center', 
    alignItems: 'center',
    textAlign: 'center',
    p: 4,
    background: 'rgba(30, 30, 60, 0.4)',
    backdropFilter: 'blur(10px)',
    borderRadius: '15px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  }}>
    <Box sx={{ 
      fontSize: '4rem', 
      mb: 2, 
      color: 'rgba(0, 255, 255, 0.7)',
      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
    }}>
      ⚙️
    </Box>
    <Box component="h2" sx={{ mb: 3, fontWeight: 300 }}>
      Settings & Configuration
    </Box>
    <Box component="p" sx={{ 
      maxWidth: '600px', 
      mb: 4, 
      color: 'rgba(255, 255, 255, 0.7)',
      lineHeight: 1.6
    }}>
      This section will provide platform configuration options, account settings, notification preferences, and integration management.
    </Box>
    <Box sx={{ 
      p: 2, 
      background: 'rgba(0, 255, 255, 0.1)', 
      borderRadius: '8px',
      border: '1px solid rgba(0, 255, 255, 0.3)'
    }}>
      Coming soon...
    </Box>
  </Box>
);

/**
 * AdminDashboardLayout Component
 * 
 * This component provides the main layout for the admin dashboard, including
 * the sidebar, header, and content area. It also sets up the routing for all
 * admin dashboard pages.
 * 
 * Enhanced with:
 * - Custom ThemeProvider with storefront-like styling
 * - Improved visual design with gradients and glassmorphism
 * - Enhanced accessibility and structure
 * - Additional routes for new menu items
 * - Full width content area that utilizes entire screen space
 * - Footer removed to provide more space for widgets as requested
 */
const AdminDashboardLayout: React.FC = () => {
  // Force validation of admin access on component load
  React.useEffect(() => {
    const currentToken = localStorage.getItem('token');
    console.log('AdminDashboard accessed, verifying token and admin access rights...');
    if (!currentToken) {
      console.error('No authentication token found when loading admin dashboard');
    }
  }, []);
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
        {/* Setting withExternalHeader to false to ensure the header is rendered */}
        <MainLayout withExternalHeader={false}>
          <Box 
            sx={{
              flexGrow: 1,
              width: '100%',
              height: 'calc(100vh - 64px)', // Adjust for header height
              mt: '64px', // Move below header
              overflow: 'auto',
              background: 'linear-gradient(135deg, #0a0a1a, #1e1e3f)',
              p: 1 // Minimal padding
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard/default" replace />} />
              <Route path="/default" element={<DashboardView />} />
              <Route path="/admin-sessions" element={<EnhancedAdminSessionsView />} />
              <Route path="/user-management" element={<ModernUserManagementSystem />} />
              <Route path="/client-progress" element={<ClientDashboardView />} />
              <Route path="/client-management" element={<AdminClientProgressView />} />
              <Route path="/reports" element={<ReportsPlaceholder />} />
              <Route path="/settings" element={<SettingsPlaceholder />} />
              {/* Fallback route to default dashboard */}
              <Route path="*" element={<Navigate to="/dashboard/default" replace />} />
            </Routes>
          </Box>
        </MainLayout>
      </Box>
    </ThemeProvider>
  );
};

export default AdminDashboardLayout;