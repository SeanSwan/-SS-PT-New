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
    
    const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({sub: mockUser.id, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000) + (24*60*60)}))}.mock-signature`;
    tokenCleanup.storeToken(mockToken, mockUser);
    apiService.setAuthToken(mockToken);
    
    setUser(mockUser);
    
    if (dispatch) {
      dispatch(setReduxUser(mockUser));
    }
    
    console.log('Mock login successful:', mockUser.username, mockUser.role);
    return { success: true, user: mockUser };
  };
  
  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      setLoading(true);
      setError(null);
      
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
    
    // If backend is not connected, use mock data only in development
    if (!connection.isConnected && connection.isMockMode && process.env.NODE_ENV === 'development') {
      console.log('Backend not available, using mock login');
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
      if (token && !token.includes('mock-signature')) {
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
