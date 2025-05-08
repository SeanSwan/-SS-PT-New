import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useStore } from 'react-redux'; 
import { useNavigate, NavigateFunction } from 'react-router-dom';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Alert,
  Collapse
} from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';

import { devQuickLogin, devLogout, isDevMode } from '../../utils/dev-auth-helper';
import { seedTestAccounts as seedTestAccountsApi } from '../../services/devAuthService';
import { 
  initializeMemoryStore, 
  getUserFromMemory, 
  setUserInMemory,
  setTokenInMemory 
} from '../../utils/dev-memory-store';

// Create a safe fallback for RootState since we might not have access to the actual type
interface SafeRootState {
  auth?: {
    user?: any;
  };
}

// Styled components for the dev panel
const DevPanel = {
  container: {
    position: 'fixed' as 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 9999,
    width: '320px',
    transition: 'all 0.3s ease',
    opacity: 0.95,
    '&:hover': {
      opacity: 1,
    },
  },
  minimized: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  header: {
    padding: '10px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
  },
  content: {
    padding: '16px',
  },
  roleButton: {
    marginBottom: '10px',
    width: '100%',
    justifyContent: 'flex-start',
    textTransform: 'none' as 'none',
  },
  chip: {
    marginLeft: 'auto',
  }
};

/**
 * DevLoginPanel Component
 * 
 * A floating panel in development mode that allows quick switching between user roles
 * without going through the normal authentication flow.
 * 
 * IMPORTANT: This should only be rendered in development environments!
 */
const DevLoginPanel: React.FC = () => {
  // State management
  const [isOpen, setIsOpen] = useState(true);
  const [isPanelEnabled, setIsPanelEnabled] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [routerAvailable, setRouterAvailable] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reduxAvailable, setReduxAvailable] = useState(true);
  
  // Safe navigation function
  const [safeNavigate, setSafeNavigate] = useState<NavigateFunction | null>(null);
  
  // All hooks must be at the top level, but we'll wrap this in a try/catch
  let navigate: NavigateFunction | null = null;
  try {
    navigate = useNavigate();
    // If we got here without an error, the router is available
    if (!routerAvailable) setRouterAvailable(true);
    if (!safeNavigate) setSafeNavigate(() => navigate);
  } catch (error) {
    console.warn('[DEV MODE] Router context not available for useNavigate hook');
    if (routerAvailable) setRouterAvailable(false);
  }
  
  // Redux store hooks with safety
  let store = null;
  let authState = null;
  try {
    store = useStore();
    authState = useSelector((state: SafeRootState) => state.auth);
  } catch (error) {
    console.warn('[DEV MODE] Redux store not available:', error);
    if (reduxAvailable) setReduxAvailable(false);
  }
  
  // Get user display name with useMemo
  const userDisplayName = useMemo(() => {
    if (!currentUser) return 'Not logged in';
    
    if (currentUser.name) return currentUser.name;
    if (currentUser.firstName && currentUser.lastName) {
      return `${currentUser.firstName} ${currentUser.lastName}`;
    }
    if (currentUser.username) return currentUser.username;
    if (currentUser.email) return currentUser.email;
    
    return 'User';
  }, [currentUser]);
  
  // Initialize memory store on component mount
  useEffect(() => {
    initializeMemoryStore();
  }, []);
  
  // Initialize with safer approaches
  useEffect(() => {
    try {
      // Multi-layered approach to get the current user
      let foundUser = false;
      
      // 1. Try Redux store from hook
      if (store && authState?.user) {
        setCurrentUser(authState.user);
        foundUser = true;
      }
      
      // 2. Try localStorage if Redux approaches failed
      if (!foundUser) {
        try {
          const userString = localStorage.getItem('user');
          if (userString) {
            const user = JSON.parse(userString);
            setCurrentUser(user);
            foundUser = true;
          }
        } catch (localStorageError) {
          console.warn('[DEV MODE] Error accessing localStorage:', localStorageError);
        }
      }
      
      // 3. Last resort: Try memory store
      if (!foundUser) {
        const memoryUser = getUserFromMemory();
        if (memoryUser) {
          setCurrentUser(memoryUser);
        }
      }
      
      // Check environment
      if (!isDevMode()) {
        setIsPanelEnabled(false);
      }
      
      // Check for panel state in localStorage
      try {
        const storedState = localStorage.getItem('dev_panel_open');
        if (storedState !== null) {
          setIsOpen(storedState === 'true');
        }
      } catch (error) {
        console.warn('[DEV MODE] Error accessing localStorage for panel state:', error);
      }
    } catch (error) {
      // Global error handler as a last resort
      console.error('[DEV MODE] Critical error in DevLoginPanel initialization:', error);
    }
  }, [store, authState]);
  
  // Subscribe to redux store changes if available
  useEffect(() => {
    if (store && reduxAvailable) {
      try {
        const unsubscribe = store.subscribe(() => {
          try {
            const state = store.getState();
            if (state?.auth?.user) {
              setCurrentUser(state.auth.user);
              // Also sync to memory store
              setUserInMemory(state.auth.user);
            }
          } catch (error) {
            console.warn('[DEV MODE] Error in store subscription:', error);
          }
        });
        
        return () => {
          try {
            unsubscribe();
          } catch (error) {
            console.warn('[DEV MODE] Error unsubscribing from store:', error);
          }
        };
      } catch (error) {
        console.warn('[DEV MODE] Error setting up store subscription:', error);
        setReduxAvailable(false);
      }
    }
  }, [store, reduxAvailable]);
  
  // Toggle panel visibility with error handling
  const togglePanel = () => {
    try {
      const newState = !isOpen;
      setIsOpen(newState);
      
      try {
        localStorage.setItem('dev_panel_open', newState.toString());
      } catch (error) {
        console.warn('[DEV MODE] Failed to save panel state to localStorage:', error);
      }
    } catch (error) {
      console.error('[DEV MODE] Error toggling panel:', error);
    }
  };
  
  // Handle quick login for a specific role
  const handleQuickLogin = (role: 'admin' | 'trainer' | 'client' | 'user') => {
    try {
      // Create mockUser with consistent naming across different parts of the app
      const mockUser = {
        id: `${role}-test-id`,
        name: `Mock User (${role})`,
        firstName: 'Mock',
        lastName: 'User',
        email: role === 'admin' ? 'admin@example.com' : 
               role === 'trainer' ? 'trainer@example.com' :
               role === 'client' ? 'client@example.com' : 'user@example.com',
        role: role,
        permissions: role === 'admin' ? ['all'] : []
      };

      // Call the dev quick login function
      devQuickLogin(role);
      
      // Update current user state directly for immediate feedback
      setCurrentUser(mockUser);
      
      // Also update the memory store
      setUserInMemory(mockUser);
      setTokenInMemory(`mock-token-${role}-${Date.now()}`);
      
      // Only navigate if router is available
      if (routerAvailable && safeNavigate) {
        // Navigate to the appropriate dashboard based on role
        if (role === 'admin') {
          safeNavigate('/dashboard');
        } else if (role === 'trainer') {
          safeNavigate('/trainer-dashboard');
        } else if (role === 'client') {
          safeNavigate('/client-dashboard');
        } else if (role === 'user') {
          safeNavigate('/social');
        }
      } else {
        // Router not available, show info that user needs to manually navigate
        setShowInfo(true);
        setTimeout(() => setShowInfo(false), 5000);
        console.log(`[DEV MODE] Router not available. Please navigate manually to the appropriate dashboard for ${role} role.`);
      }
    } catch (error) {
      console.error('[DEV MODE] Error in quick login:', error);
      // Show error message to user
      setShowInfo(true);
      setTimeout(() => setShowInfo(false), 5000);
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    try {
      devLogout();
      setCurrentUser(null);
      
      if (routerAvailable && safeNavigate) {
        safeNavigate('/');
      } else {
        setShowInfo(true);
        setTimeout(() => setShowInfo(false), 5000);
        console.log('[DEV MODE] Router not available. Please navigate manually to the home page.');
      }
    } catch (error) {
      console.error('[DEV MODE] Error during logout:', error);
      // Just clear the current user as a fallback
      setCurrentUser(null);
    }
  };
  
  // Handle seeding test accounts
  const handleSeedAccounts = async () => {
    const result = await seedTestAccountsApi();
    // Show a temporary success message
    setShowInfo(true);
    setTimeout(() => setShowInfo(false), 3000);
  };
  
  // If not in development mode or panel is disabled, don't render anything
  if (!isPanelEnabled) {
    return null;
  }
  
  // If the panel is minimized, show just the toggle button
  if (!isOpen) {
    return (
      <Paper 
        elevation={4} 
        sx={DevPanel.minimized} 
        onClick={togglePanel}
        aria-label="Open developer tools panel"
      >
        <AdminPanelSettingsIcon color="primary" />
      </Paper>
    );
  }
  
  return (
    <Paper elevation={4} sx={DevPanel.container}>
      {/* Panel Header */}
      <Box sx={DevPanel.header}>
        <Typography variant="subtitle1" fontWeight="bold" color="primary">
          SwanStudios Dev Tools
        </Typography>
        <Box>
          <Tooltip title="Refresh test accounts">
            <IconButton 
              size="small" 
              onClick={handleSeedAccounts}
              aria-label="Seed test accounts"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <IconButton 
            size="small" 
            onClick={togglePanel}
            aria-label="Minimize developer tools panel"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      
      {/* Panel Content */}
      <Box sx={DevPanel.content}>
        <Collapse in={showInfo}>
          <Alert 
            severity={routerAvailable ? "success" : "warning"} 
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setShowInfo(false)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            {routerAvailable ? "Test accounts refreshed!" : "Login successful! Please navigate manually to the appropriate dashboard."}
          </Alert>
        </Collapse>
        
        {/* Current User Status */}
        <Box mb={2} p={1} bgcolor="rgba(0,0,0,0.03)" borderRadius={1}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Current User:
          </Typography>
          {currentUser ? (
            <>
              <Typography variant="body1" fontWeight="medium">
                {userDisplayName}
              </Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Chip 
                  label={currentUser.role || 'unknown'} 
                  size="small" 
                  color={
                    currentUser.role === 'admin' ? 'error' : 
                    currentUser.role === 'trainer' ? 'primary' : 
                    currentUser.role === 'user' ? 'info' :
                    'success'
                  }
                />
                <Button 
                  size="small" 
                  onClick={handleLogout} 
                  sx={{ ml: 'auto' }}
                  variant="outlined"
                >
                  Logout
                </Button>
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              Not logged in
            </Typography>
          )}
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        {/* Quick Login Buttons */}
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Quick Login:
        </Typography>
        
        <Button
          variant="contained"
          color="error"
          startIcon={<AdminPanelSettingsIcon />}
          onClick={() => handleQuickLogin('admin')}
          sx={DevPanel.roleButton}
        >
          Login as Admin
          <Chip 
            label="Full Access" 
            size="small" 
            sx={DevPanel.chip} 
            variant="outlined" 
          />
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<FitnessCenterIcon />}
          onClick={() => handleQuickLogin('trainer')}
          sx={DevPanel.roleButton}
        >
          Login as Trainer
          <Chip 
            label="Sessions" 
            size="small" 
            sx={DevPanel.chip} 
            variant="outlined" 
          />
        </Button>
        
        <Button
          variant="contained"
          color="success"
          startIcon={<PersonIcon />}
          onClick={() => handleQuickLogin('client')}
          sx={DevPanel.roleButton}
        >
          Login as Client
          <Chip 
            label="Premium" 
            size="small" 
            sx={DevPanel.chip} 
            variant="outlined" 
          />
        </Button>
        
        <Button
          variant="contained"
          color="info"
          startIcon={<GroupIcon />}
          onClick={() => handleQuickLogin('user')}
          sx={DevPanel.roleButton}
        >
          Login as User
          <Chip 
            label="Social" 
            size="small" 
            sx={DevPanel.chip} 
            variant="outlined" 
          />
        </Button>
        
        {!routerAvailable && (
          <Alert severity="warning" sx={{ mt: 2, fontSize: '0.8rem' }}>
            No Router context found. Navigation will not work automatically. Please navigate manually after logging in.
          </Alert>
        )}
      </Box>
    </Paper>
  );
};

export default DevLoginPanel;