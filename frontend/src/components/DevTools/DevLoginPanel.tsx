import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useStore } from 'react-redux'; 
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

// Add global router context flag
declare global {
  interface Window {
    __ROUTER_CONTEXT_AVAILABLE__?: boolean;
    __WARNED_ABOUT_ROUTER__?: boolean;
    REACT_APP_MOCK_WEBSOCKET?: string;
    REACT_APP_FORCE_MOCK_WEBSOCKET?: string;
  }
}

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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [reduxAvailable, setReduxAvailable] = useState(true);
  const [routerAvailable, setRouterAvailable] = useState(false);
  
  // Safely get Redux store - always call hooks at top level
  const store = useStore();
  const authState = useSelector((state: SafeRootState) => state.auth);
  
  // Create a dummy reference for data storage
  const navigationRef = useRef<{
    navigate: ((to: string) => void) | null,
    storeState: {store: any, authState: any}
  }>({
    navigate: null,
    storeState: {store, authState}
  });
  
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
  
  // Safely handle navigation without useNavigate hook
  const safeNavigate = useCallback((path: string) => {
    try {
      if (navigationRef.current.navigate) {
        navigationRef.current.navigate(path);
      } else {
        // Absolute fallback
        console.log(`[DEV MODE] Direct navigation to: ${path}`);
        setTimeout(() => { window.location.href = path; }, 50);
      }
    } catch (error) {
      console.warn('[DEV MODE] Navigation error:', error);
      // Last resort: direct location change
      window.location.href = path;
    }
  }, []);
  
  // Update navigation reference when store changes
  useEffect(() => {
    navigationRef.current.storeState = {store, authState};
    
    // Attempt to check if router available but don't try to use it directly
    try {
      const hasRouter = !!(window && window.history && typeof window.history.pushState === 'function');
      setRouterAvailable(hasRouter);
      
      // Create a safe navigation function that falls back to window.location
      navigationRef.current.navigate = (to: string) => {
        try {
          console.log(`[DEV MODE] Navigating to: ${to}`);
          window.location.href = to;
        } catch (error) {
          console.warn('[DEV MODE] Navigation failed:', error);
        }
      };
    } catch (error) {
      console.warn('[DEV MODE] Router check failed:', error);
      setRouterAvailable(false);
    }
  }, [store, authState]);
  
  // Initialize memory store on component mount
  useEffect(() => {
    try {
      initializeMemoryStore();
    } catch (error) {
      console.warn('[DEV MODE] Error initializing memory store:', error);
    }
  }, []);
  
  // Initialize with safer approaches
  useEffect(() => {
    try {
      // Multi-layered approach to get the current user
      let foundUser = false;
      
      // 1. Try Redux store from hook
      if (navigationRef.current.storeState.store && navigationRef.current.storeState.authState?.user) {
        setCurrentUser(navigationRef.current.storeState.authState.user);
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
  }, []);
  
  // Subscribe to redux store changes if available
  useEffect(() => {
    if (navigationRef.current.storeState.store && reduxAvailable) {
      try {
        const unsubscribe = navigationRef.current.storeState.store.subscribe(() => {
          try {
            const state = navigationRef.current.storeState.store.getState();
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
  }, [reduxAvailable]);
  
  // Toggle panel visibility with error handling
  const togglePanel = useCallback(() => {
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
  }, [isOpen]);
  
  // Enhanced handleLogout with more robust cleanup and guaranteed page refresh
  const handleLogout = useCallback(() => {
    try {
      // First update UI state to show logged out immediately
      setCurrentUser(null);
      
      // Then clear all authentication data
      devLogout();
      
      console.log('[DEV MODE] Successfully logged out, resetting application state');
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        console.log('[DEV MODE] Forcing page reload to ensure clean state');
        window.location.href = '/';
        
        // Double-check reload happened after a delay
        setTimeout(() => {
          console.log('[DEV MODE] Backup reload triggered');
          window.location.reload();
        }, 300);
      }, 100);
      
    } catch (error) {
      console.error('[DEV MODE] Error during logout:', error);
      
      // Emergency fallbacks if the normal logout process fails
      try {
        // Clear all application storage forcefully
        localStorage.clear();
        sessionStorage.clear();
        
        // Last resort: hard reload
        window.location.href = '/';
      } catch (criticalError) {
        // If even that fails, log and try once more with reload()
        console.error('[DEV MODE] Critical failure during logout:', criticalError);
        window.location.reload();
      }
    }
  }, []);
  
  // Handle quick login for a specific role
  const handleQuickLogin = useCallback((role: 'admin' | 'trainer' | 'client' | 'user') => {
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
      
      // Show info about successful login
      setShowInfo(true);
      setTimeout(() => setShowInfo(false), 5000);
      
    } catch (error) {
      console.error('[DEV MODE] Error in quick login:', error);
      // Show error message to user
      setShowInfo(true);
      setTimeout(() => setShowInfo(false), 5000);
    }
  }, [safeNavigate]);
  
  // Handle seeding test accounts
  const handleSeedAccounts = useCallback(async () => {
    try {
      await seedTestAccountsApi();
      // Show a temporary success message
      setShowInfo(true);
      setTimeout(() => setShowInfo(false), 3000);
    } catch (error) {
      console.error('[DEV MODE] Error seeding test accounts:', error);
      setShowInfo(true);
      setTimeout(() => setShowInfo(false), 3000);
    }
  }, []);
  
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