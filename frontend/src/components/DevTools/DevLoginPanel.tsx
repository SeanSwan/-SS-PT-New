import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSelector, useStore } from 'react-redux';
import styled from 'styled-components';
import { 
  Settings,
  Dumbbell,
  User,
  Users,
  X,
  RotateCcw
} from 'lucide-react';

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

// Styled Components
const DevPanelContainer = styled.div<{ $minimized?: boolean }>`
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 9999;
  width: ${({ $minimized }) => $minimized ? '50px' : '320px'};
  height: ${({ $minimized }) => $minimized ? '50px' : 'auto'};
  transition: all 0.3s ease;
  opacity: 0.95;
  
  &:hover {
    opacity: 1;
  }
`;

const DevPaper = styled.div<{ $minimized?: boolean }>`
  background: rgba(30, 30, 60, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${({ $minimized }) => $minimized ? '50%' : '12px'};
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  color: white;
  width: 100%;
  height: 100%;
  
  ${({ $minimized }) => $minimized && `
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  `}
`;

const DevHeader = styled.div`
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const DevTitle = styled.h3`
  font-size: 1rem;
  font-weight: bold;
  color: #00ffff;
  margin: 0;
`;

const DevHeaderActions = styled.div`
  display: flex;
  gap: 4px;
`;

const DevIconButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const DevContent = styled.div`
  padding: 16px;
`;

const CollapseContainer = styled.div<{ $open: boolean }>`
  max-height: ${({ $open }) => $open ? '100px' : '0'};
  overflow: hidden;
  transition: max-height 0.3s ease;
  margin-bottom: ${({ $open }) => $open ? '16px' : '0'};
`;

const AlertBox = styled.div<{ $severity: 'success' | 'warning' | 'error' | 'info' }>`
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  
  ${({ $severity }) => {
    switch ($severity) {
      case 'success':
        return `
          background-color: rgba(40, 167, 69, 0.1);
          border: 1px solid rgba(40, 167, 69, 0.3);
          color: #28a745;
        `;
      case 'warning':
        return `
          background-color: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          color: #ffc107;
        `;
      case 'error':
        return `
          background-color: rgba(220, 53, 69, 0.1);
          border: 1px solid rgba(220, 53, 69, 0.3);
          color: #dc3545;
        `;
      default:
        return `
          background-color: rgba(23, 162, 184, 0.1);
          border: 1px solid rgba(23, 162, 184, 0.3);
          color: #17a2b8;
        `;
    }
  }}
`;

const UserStatusBox = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
`;

const UserStatusLabel = styled.div`
  font-size: 0.875rem;
  color: #ccc;
  margin-bottom: 8px;
`;

const UserName = styled.div`
  font-size: 1rem;
  font-weight: 500;
  margin-bottom: 8px;
`;

const UserInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RoleChip = styled.div<{ $role: string }>`
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${({ $role }) => {
    switch ($role) {
      case 'admin':
        return `
          background-color: rgba(220, 53, 69, 0.2);
          color: #dc3545;
          border: 1px solid rgba(220, 53, 69, 0.3);
        `;
      case 'trainer':
        return `
          background-color: rgba(0, 123, 255, 0.2);
          color: #007bff;
          border: 1px solid rgba(0, 123, 255, 0.3);
        `;
      case 'client':
        return `
          background-color: rgba(40, 167, 69, 0.2);
          color: #28a745;
          border: 1px solid rgba(40, 167, 69, 0.3);
        `;
      case 'user':
        return `
          background-color: rgba(23, 162, 184, 0.2);
          color: #17a2b8;
          border: 1px solid rgba(23, 162, 184, 0.3);
        `;
      default:
        return `
          background-color: rgba(108, 117, 125, 0.2);
          color: #6c757d;
          border: 1px solid rgba(108, 117, 125, 0.3);
        `;
    }
  }}
`;

const Button = styled.button<{ 
  $variant?: 'contained' | 'outlined';
  $color?: 'primary' | 'error' | 'success' | 'info' | 'warning';
  $size?: 'small' | 'medium';
  $fullWidth?: boolean;
}>`
  padding: ${({ $size }) => $size === 'small' ? '6px 12px' : '8px 16px'};
  border-radius: 6px;
  border: 1px solid;
  cursor: pointer;
  font-size: ${({ $size }) => $size === 'small' ? '0.75rem' : '0.875rem'};
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: ${({ $fullWidth }) => $fullWidth ? 'flex-start' : 'center'};
  width: ${({ $fullWidth }) => $fullWidth ? '100%' : 'auto'};
  margin-bottom: ${({ $fullWidth }) => $fullWidth ? '10px' : '0'};
  text-transform: none;
  transition: all 0.3s ease;
  
  ${({ $variant, $color }) => {
    const colors = {
      primary: { main: '#007bff', hover: '#0056b3' },
      error: { main: '#dc3545', hover: '#c82333' },
      success: { main: '#28a745', hover: '#218838' },
      info: { main: '#17a2b8', hover: '#138496' },
      warning: { main: '#ffc107', hover: '#e0a800' }
    };
    
    const colorSet = colors[$color || 'primary'];
    
    if ($variant === 'outlined') {
      return `
        background-color: transparent;
        color: ${colorSet.main};
        border-color: ${colorSet.main};
        
        &:hover {
          background-color: ${colorSet.main}15;
          border-color: ${colorSet.hover};
        }
      `;
    } else {
      return `
        background-color: ${colorSet.main};
        color: white;
        border-color: ${colorSet.main};
        
        &:hover {
          background-color: ${colorSet.hover};
          border-color: ${colorSet.hover};
        }
      `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StatusChip = styled.div`
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 0.65rem;
  background-color: rgba(255, 255, 255, 0.1);
  color: #ccc;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin-left: auto;
`;

const Divider = styled.hr`
  border: none;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: 16px 0;
`;

const SectionLabel = styled.div`
  font-size: 0.875rem;
  color: #ccc;
  margin-bottom: 8px;
`;

const NoUserText = styled.div`
  font-size: 0.875rem;
  color: #ccc;
  font-style: italic;
`;

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
      <DevPanelContainer $minimized>
        <DevPaper $minimized onClick={togglePanel}>
          <Settings size={20} color="#00ffff" />
        </DevPaper>
      </DevPanelContainer>
    );
  }
  
  return (
    <DevPanelContainer>
      <DevPaper>
        {/* Panel Header */}
        <DevHeader>
          <DevTitle>SwanStudios Dev Tools</DevTitle>
          <DevHeaderActions>
            <DevIconButton 
              onClick={handleSeedAccounts}
              title="Refresh test accounts"
            >
              <RotateCcw size={16} />
            </DevIconButton>
            <DevIconButton 
              onClick={togglePanel}
              title="Minimize developer tools panel"
            >
              <X size={16} />
            </DevIconButton>
          </DevHeaderActions>
        </DevHeader>
        
        {/* Panel Content */}
        <DevContent>
          <CollapseContainer $open={showInfo}>
            <AlertBox $severity={routerAvailable ? "success" : "warning"}>
              <div>
                {routerAvailable ? "Test accounts refreshed!" : "Login successful! Please navigate manually to the appropriate dashboard."}
              </div>
              <DevIconButton
                onClick={() => setShowInfo(false)}
                title="Close alert"
              >
                <X size={14} />
              </DevIconButton>
            </AlertBox>
          </CollapseContainer>
          
          {/* Current User Status */}
          <UserStatusBox>
            <UserStatusLabel>Current User:</UserStatusLabel>
            {currentUser ? (
              <>
                <UserName>{userDisplayName}</UserName>
                <UserInfoRow>
                  <RoleChip $role={currentUser.role || 'unknown'}>
                    {currentUser.role || 'unknown'}
                  </RoleChip>
                  <Button 
                    $size="small" 
                    $variant="outlined"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </UserInfoRow>
              </>
            ) : (
              <NoUserText>Not logged in</NoUserText>
            )}
          </UserStatusBox>
          
          <Divider />
          
          {/* Quick Login Buttons */}
          <SectionLabel>Quick Login:</SectionLabel>
          
          <Button
            $variant="contained"
            $color="error"
            $fullWidth
            onClick={() => handleQuickLogin('admin')}
          >
            <Settings size={16} />
            Login as Admin
            <StatusChip>Full Access</StatusChip>
          </Button>
          
          <Button
            $variant="contained"
            $color="primary"
            $fullWidth
            onClick={() => handleQuickLogin('trainer')}
          >
            <Dumbbell size={16} />
            Login as Trainer
            <StatusChip>Sessions</StatusChip>
          </Button>
          
          <Button
            $variant="contained"
            $color="success"
            $fullWidth
            onClick={() => handleQuickLogin('client')}
          >
            <User size={16} />
            Login as Client
            <StatusChip>Premium</StatusChip>
          </Button>
          
          <Button
            $variant="contained"
            $color="info"
            $fullWidth
            onClick={() => handleQuickLogin('user')}
          >
            <Users size={16} />
            Login as User
            <StatusChip>Social</StatusChip>
          </Button>
          
          {!routerAvailable && (
            <AlertBox $severity="warning" style={{ marginTop: '16px', fontSize: '0.8rem' }}>
              <div>
                No Router context found. Navigation will not work automatically. Please navigate manually after logging in.
              </div>
            </AlertBox>
          )}
        </DevContent>
      </DevPaper>
    </DevPanelContainer>
  );
};

export default DevLoginPanel;