import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import apiService from '../services/api.service';
import { setUser as setReduxUser, logout as logoutRedux, setLoading as setReduxLoading } from '../store/slices/authSlice';
import { createClientProgressService, ClientProgressServiceInterface } from '../services/client-progress-service';
import { createExerciseService, ExerciseServiceInterface } from '../services/exercise-service';
import { createAdminClientService, AdminClientServiceInterface } from '../services/adminClientService';
import { useBackendConnection } from '../hooks/useBackendConnection.jsx';
import { AxiosInstance } from 'axios';
import tokenCleanup from '../utils/tokenCleanup';

// In development mode, ensure the admin dashboard can always be accessed when needed
if (process.env.NODE_ENV === 'development') {
  window.forceAdminAccess = function() {
    localStorage.setItem('bypass_admin_verification', 'true');
    console.log('[DEV MODE] Admin access bypass flag set. Reload the page to apply.');
    return 'Admin access bypass flag set. Reload the page to apply.';
  };
  
  window.resetAuth = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenTimestamp');
    localStorage.removeItem('bypass_admin_verification');
    console.log('[DEV MODE] Auth reset. Reload the page to apply.');
    return 'Auth reset. Reload the page to apply.';
  };
  
  window.debugAuth = function() {
    const tokenInfo = {
      hasToken: !!localStorage.getItem('token'),
      token: localStorage.getItem('token')?.substring(0, 20) + '...',
      user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}') : null,
      bypassFlag: !!localStorage.getItem('bypass_admin_verification')
    };
    console.log('[DEV MODE] Auth Debug Info:', tokenInfo);
    return tokenInfo;
  };
  
  console.log('[DEV MODE] Auth debug functions available. Use window.forceAdminAccess(), window.resetAuth() or window.debugAuth() in console.');
}

// TypeScript declarations
declare global {
  interface Window {
    REACT_APP_FORCE_MOCK_API?: string;
    REACT_APP_SKIP_API_RETRIES?: string;
    REACT_APP_FORCE_MOCK_WEBSOCKET?: string;
    REACT_APP_MOCK_WEBSOCKET?: string;
    forceAdminAccess?: () => string;
    resetAuth?: () => string;
    debugAuth?: () => any;
  }
}

// Enhanced User Interface aligned with backend model
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer' | 'client' | 'user';
  profileImageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  trainerInfo?: any;
  clientInfo?: any;
}

// Auth Context Interface
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  token: string | null; // Expose token to components
  login: (username: string, password: string) => Promise<{success: boolean, user: User | null, error?: string}>;
  logout: () => void;
  register: (data: any) => Promise<{success: boolean, user: User | null, error?: string}>;
  updateUser: (data: any) => Promise<{success: boolean, user: User | null, error?: string}>;
  refreshToken: () => Promise<boolean>;
  checkPermission: (permission: string) => boolean;
  services: {
    clientProgress: ClientProgressServiceInterface;
    exercise: ExerciseServiceInterface;
    adminClient: AdminClientServiceInterface;
  };
  authAxios: AxiosInstance;
}

// Create the Auth Context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  token: null,
  login: async () => ({ success: false, user: null }),
  logout: () => {},
  register: async () => ({ success: false, user: null }),
  updateUser: async () => ({ success: false, user: null }),
  refreshToken: async () => false,
  checkPermission: () => false,
  services: {
    clientProgress: null as any,
    exercise: null as any,
    adminClient: null as any
  },
  authAxios: null as any
});

// Permission mappings for roles
const ROLE_PERMISSIONS = {
  admin: ['admin:all', 'trainer:all', 'client:all', 'user:all'],
  trainer: ['trainer:all', 'client:read', 'client:update'],
  client: ['client:self'],
  user: ['user:self']
};

// Auth Provider Component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Backend connection state
  const connection = useBackendConnection();
  
  // Redux integration (optional)
  let dispatch: any = null;
  let reduxUser: any = null;
  
  try {
    dispatch = useDispatch();
    reduxUser = useSelector((state: any) => state.auth?.user);
  } catch (error) {
    console.log('Redux not available, using local state only');
  }
  
  // Create services with authenticated axios instance
  const services = {
    clientProgress: createClientProgressService(apiService),
    exercise: createExerciseService(apiService),
    adminClient: createAdminClientService(apiService)
  };
  
  // Token refresh function
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const token = tokenCleanup.getValidatedToken();
      if (!token) return false;
      
      const response = await apiService.post('/api/auth/refresh', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.token) {
        const newToken = response.data.token;
        tokenCleanup.storeToken(newToken);
        apiService.setAuthToken(newToken);
        setToken(newToken);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      tokenCleanup.handleTokenError(error);
      return false;
    }
  }, []);
  
  // Check if user has permission
  const checkPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.some(p => 
      p === permission || 
      p.endsWith(':all') && permission.startsWith(p.split(':')[0])
    );
  }, [user]);
  
  // Mock login function for development
  const performMockLogin = async (username: string, password: string): Promise<{success: boolean, user: User | null, error?: string}> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Determine role from username
    let role: User['role'] = 'user';
    if (username.toLowerCase().includes('admin')) role = 'admin';
    else if (username.toLowerCase().includes('trainer')) role = 'trainer';
    else if (username.toLowerCase().includes('client')) role = 'client';
    
    const mockUser: User = {
      id: `mock-${Date.now()}`,
      email: username.includes('@') ? username : `${username}@example.com`,
      username: username.includes('@') ? username.split('@')[0] : username,
      firstName: 'Mock',
      lastName: 'User',
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Generate a mock token that includes essential data
    const tokenPayload = {
      id: mockUser.id,
      username: mockUser.username,
      role: mockUser.role,
      exp: Math.floor(Date.now()/1000) + (24*60*60)
    };
    
    // Create a mock JWT structure with base64 encoded payload
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenPayload))}.mock-signature`;
    
    // Store the token and user
    tokenCleanup.storeToken(mockToken, mockUser);
    apiService.setAuthToken(mockToken);
    
    setUser(mockUser);
    setToken(mockToken);
    
    if (dispatch) {
      dispatch(setReduxUser(mockUser));
    }
    
    console.log('Mock login successful:', mockUser.username, mockUser.role);
    
    // Force set localStorage flag to bypass admin verification (for admin users)
    if (mockUser.role === 'admin' && process.env.NODE_ENV === 'development') {
      localStorage.setItem('bypass_admin_verification', 'true');
    }
    
    return { success: true, user: mockUser };
  };
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      setError(null);
      
      // EMERGENCY FIX: In development mode, check for bypass flag immediately and use it
      if (process.env.NODE_ENV === 'development') {
        const bypass = localStorage.getItem('bypass_admin_verification') === 'true';
        if (bypass) {
          console.log('[EMERGENCY FIX] Using admin bypass flag to skip authentication checks');
          
          // Get stored user if possible or use defaults
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const parsedUser = JSON.parse(storedUser);
              if (parsedUser) {
                // Force admin role
                parsedUser.role = 'admin';
                localStorage.setItem('user', JSON.stringify(parsedUser));
                
                console.log('[EMERGENCY FIX] Using stored user with forced admin role');
                setUser(parsedUser);
                setLoading(false);
                
                // Get the token
                const token = localStorage.getItem('token');
                if (token) {
                  setToken(token);
                  apiService.setAuthToken(token);
                }
                
                return;
              }
            }
          } catch (e) {
            console.warn('[EMERGENCY FIX] Error parsing stored user:', e);
          }
          
          // If we don't have a stored user, create a default admin
          const defaultMockAdmin = {
            id: 'mock-admin-emergency-' + Date.now(),
            email: 'admin@swanstudios.com',
            username: 'admin',
            firstName: 'Admin',
            lastName: 'Emergency',
            role: 'admin',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            permissions: ['admin:all']
          };
          
          setUser(defaultMockAdmin);
          setLoading(false);
          
          // Generate a mock token
          const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
            id: defaultMockAdmin.id,
            role: 'admin',
            exp: Math.floor(Date.now()/1000) + (24*60*60)
          }))}.emergency-mock-token`;
          
          // Store the token and user
          localStorage.setItem('token', mockToken);
          localStorage.setItem('tokenTimestamp', Date.now().toString());
          localStorage.setItem('user', JSON.stringify(defaultMockAdmin));
          
          apiService.setAuthToken(mockToken);
          setToken(mockToken);
          
          return;
        }
      }
      
      // In development mode, check for bypass flag
      if (process.env.NODE_ENV === 'development' && localStorage.getItem('bypass_admin_verification') === 'true') {
        console.log('[DEV MODE] Found admin verification bypass flag - creating default admin user');
        
        // Get stored user if possible or use defaults
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && parsedUser.role === 'admin') {
              console.log('[DEV MODE] Using stored admin user');
              setUser(parsedUser);
              setLoading(false);
              
              // Get the token
              const token = localStorage.getItem('token');
              if (token) {
                setToken(token);
                apiService.setAuthToken(token);
              }
              
              return;
            }
          }
        } catch (e) {
          console.warn('[DEV MODE] Error parsing stored user:', e);
        }
        
        // If we get here, we don't have a stored admin user
        // Create a default admin user
        const defaultMockAdmin: User = {
          id: 'mock-admin-' + Date.now(),
          email: 'admin@swanstudios.com',
          username: 'admin',
          firstName: 'Admin',
          lastName: 'Dev',
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setUser(defaultMockAdmin);
        setLoading(false);
        
        // Generate a mock token
        const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
          id: defaultMockAdmin.id,
          role: 'admin',
          exp: Math.floor(Date.now()/1000) + (24*60*60)
        }))}.mock-jwt-token`;
        
        // Store the token and user
        tokenCleanup.storeToken(mockToken, defaultMockAdmin);
        apiService.setAuthToken(mockToken);
        setToken(mockToken);
        
        // Store for future usage
        localStorage.setItem('user', JSON.stringify(defaultMockAdmin));
        
        return;
      }
      
      try {
        // Get validated token from cleanup utility
        const token = tokenCleanup.getValidatedToken();
        const tokenTimestamp = localStorage.getItem('tokenTimestamp');
        
        if (!token) {
          console.log('No valid token found');
          setUser(null);
          setLoading(false);
          return;
        }
        
        // Check token age (24 hours) - this is already done in getValidatedToken
        // but keeping this check as a backup
        if (tokenTimestamp) {
          const age = Date.now() - parseInt(tokenTimestamp);
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (age > maxAge) {
            console.log('Token expired, attempting refresh...');
            const refreshed = await refreshToken();
            
            if (!refreshed) {
              console.log('Token refresh failed, logging out');
              logout();
              return;
            }
          }
        }
        
        // Set token in API service
        apiService.setAuthToken(token);
        setToken(token);
        
        // Verify token with backend
        const response = await apiService.get('/api/auth/me');
        
        if (response.data?.user) {
          const userData = response.data.user;
          
          // Ensure proper user structure
          const formattedUser: User = {
            id: userData.id,
            email: userData.email,
            username: userData.username || userData.email?.split('@')[0],
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: userData.role || 'user',
            profileImageUrl: userData.profileImageUrl,
            isActive: userData.isActive !== false,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
            trainerInfo: userData.trainerInfo,
            clientInfo: userData.clientInfo
          };
          
          setUser(formattedUser);
          
          // Update Redux if available
          if (dispatch) {
            dispatch(setReduxUser(formattedUser));
          }
          
          console.log('Authentication restored:', formattedUser.username, formattedUser.role);
        } else if (process.env.NODE_ENV === 'development') {
          // In development, create a default admin user if the response doesn't have the expected format
          const defaultMockUser: User = {
            id: 'mock-id-' + Date.now(),
            email: 'admin@swanstudios.com',
            username: 'admin',
            firstName: 'Admin',
            lastName: 'Dev',
            role: 'admin',
            profileImageUrl: null,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          console.log('DEV MODE: Creating fallback admin user');
          setUser(defaultMockUser);
          
          if (dispatch) {
            dispatch(setReduxUser(defaultMockUser));
          }
        } else {
          throw new Error('Invalid user data from server');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        
        // Try fallback to mock user for development
        const storedUser = localStorage.getItem('user');
        if (storedUser && process.env.NODE_ENV === 'development') {
          try {
            const userData = JSON.parse(storedUser);
            console.log('Using fallback mock user:', userData);
            setUser(userData);
          } catch (parseError) {
            console.error('Failed to parse stored user data');
            logout();
          }
        } else {
          setError('Authentication failed');
          logout();
        }
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Login function
  const login = async (username: string, password: string): Promise<{success: boolean, user: User | null, error?: string}> => {
    setLoading(true);
    setError(null);
    
    // Immediate success in development mode for admin logins
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEV MODE] Development mode login flow used');
      if (username.toLowerCase() === 'admin') {
        localStorage.setItem('bypass_admin_verification', 'true');
      }
      
      try {
        // Try the API approach first in case the backend is running
        const response = await apiService.post('/api/auth/login', { 
          username, 
          password 
        });
        
        if (response.data?.user && response.data?.token) {
          const { user: userData, token } = response.data;
          
          // Format user data
          const formattedUser: User = {
            id: userData.id,
            email: userData.email,
            username: userData.username || username,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            role: userData.role || 'user',
            profileImageUrl: userData.profileImageUrl,
            isActive: userData.isActive !== false,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt,
            trainerInfo: userData.trainerInfo,
            clientInfo: userData.clientInfo
          };
          
          // Store token and user using cleanup utility
          tokenCleanup.storeToken(token, formattedUser);
          apiService.setAuthToken(token);
          
          setUser(formattedUser);
          setToken(token);
          
          // Update Redux if available
          if (dispatch) {
            dispatch(setReduxUser(formattedUser));
          }
          
          console.log('Login successful:', formattedUser.username, formattedUser.role);
          return { success: true, user: formattedUser };
        }
      } catch (error) {
        // API approach failed, fallback to mock login in development mode
        console.log('API login failed in development mode, using mock login');
      }
      
      // In development, always succeed with mock login data
      return await performMockLogin(username, password);
    }
    
    try {
      // Attempt real API login
      const response = await apiService.post('/api/auth/login', { 
        username, 
        password 
      });
      
      if (response.data?.user && response.data?.token) {
        const { user: userData, token } = response.data;
        
        // Format user data
        const formattedUser: User = {
          id: userData.id,
          email: userData.email,
          username: userData.username || username,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          role: userData.role || 'user',
          profileImageUrl: userData.profileImageUrl,
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
          trainerInfo: userData.trainerInfo,
          clientInfo: userData.clientInfo
        };
        
        // Store token and user using cleanup utility
        tokenCleanup.storeToken(token, formattedUser);
        apiService.setAuthToken(token);
        
        setUser(formattedUser);
        setToken(token);
        
        // Update Redux if available
        if (dispatch) {
          dispatch(setReduxUser(formattedUser));
        }
        
        console.log('Login successful:', formattedUser.username, formattedUser.role);
        return { success: true, user: formattedUser };
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Development fallback - use mock login
      if (process.env.NODE_ENV === 'development') {
        console.log('API login failed, using mock login');
        return await performMockLogin(username, password);
      }
      
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      return { success: false, user: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = useCallback(() => {
    try {
      // Call logout API if authenticated
      const token = tokenCleanup.getValidatedToken();
      if (token && !token.includes('mock-signature') && !token.includes('mock-jwt-token')) {
        apiService.post('/api/auth/logout').catch(console.error);
      }
    } catch (error) {
      console.error('Logout API error:', error);
    }
    
    // Clear all stored data using cleanup utility
    tokenCleanup.cleanupAllTokens();
    
    // Clear API auth
    apiService.setAuthToken(null);
    
    // Update state
    setUser(null);
    setToken(null);
    setError(null);
    
    // Update Redux if available
    if (dispatch) {
      dispatch(logoutRedux());
    }
    
    console.log('Logged out successfully');
  }, [dispatch]);
  
  // Register function
  const register = async (data: any): Promise<{success: boolean, user: User | null, error?: string}> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.post('/api/auth/register', data);
      
      if (response.data?.user && response.data?.token) {
        const { user: userData, token } = response.data;
        
        // Store token
        localStorage.setItem('token', token);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        apiService.setAuthToken(token);
        
        // Format user data
        const formattedUser: User = {
          id: userData.id,
          email: userData.email,
          username: userData.username || data.username,
          firstName: userData.firstName || data.firstName || '',
          lastName: userData.lastName || data.lastName || '',
          role: userData.role || 'user',
          profileImageUrl: userData.profileImageUrl,
          isActive: userData.isActive !== false,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt
        };
        
        setUser(formattedUser);
        localStorage.setItem('user', JSON.stringify(formattedUser));
        
        // Update Redux if available
        if (dispatch) {
          dispatch(setReduxUser(formattedUser));
        }
        
        console.log('Registration successful:', formattedUser.username);
        return { success: true, user: formattedUser };
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (error: any) {
      console.error('Registration failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      setError(errorMessage);
      return { success: false, user: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  
  // Update user function
  const updateUser = async (data: any): Promise<{success: boolean, user: User | null, error?: string}> => {
    if (!user) return { success: false, user: null, error: 'Not authenticated' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.put('/api/auth/profile', data);
      
      if (response.data?.user) {
        const userData = response.data.user;
        
        const updatedUser: User = {
          ...user,
          ...userData,
          updatedAt: new Date().toISOString()
        };
        
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        // Update Redux if available
        if (dispatch) {
          dispatch(setReduxUser(updatedUser));
        }
        
        console.log('User updated successfully');
        return { success: true, user: updatedUser };
      } else {
        throw new Error('Invalid update response');
      }
    } catch (error: any) {
      console.error('User update failed:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Update failed';
      setError(errorMessage);
      return { success: false, user: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };
  
  // Context value
  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    loading,
    error,
    token,
    login,
    logout,
    register,
    updateUser,
    refreshToken,
    checkPermission,
    services,
    authAxios: apiService
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the Auth Context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
