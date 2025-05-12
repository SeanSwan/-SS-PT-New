import React, { createContext, useContext, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import apiService from '../services/api.service';
import { mockUser, mockAdminUser, mockTrainerUser, mockRegularUser } from './mockUser';
import { setUser as setReduxUser, logout as logoutRedux } from '../store/slices/authSlice';
import { getUserFromMemory, setUserInMemory, setTokenInMemory, clearMemoryStore } from '../utils/dev-memory-store';
import { createClientProgressService, ClientProgressServiceInterface } from '../services/client-progress-service';
import { createExerciseService, ExerciseServiceInterface } from '../services/exercise-service';
import { createAdminClientService, AdminClientServiceInterface } from '../services/adminClientService';
import { AxiosInstance } from 'axios';

// Auth Context Interface
interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<{success: boolean, user: any | null}>;
  logout: () => void;
  register: (data: any) => Promise<boolean>;
  updateUser: (data: any) => Promise<boolean>;
  // Add services and authAxios
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
  login: async () => ({ success: false, user: null }),
  logout: () => {},
  register: async () => false,
  updateUser: async () => false,
  services: {
    clientProgress: null as any,
    exercise: null as any,
    adminClient: null as any
  },
  authAxios: null as any
});

// Auth Provider Component
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Create services using apiService
  const services = {
    clientProgress: createClientProgressService(apiService),
    exercise: createExerciseService(apiService),
    adminClient: createAdminClientService(apiService)
  };
  
  // Try to use Redux if available
  let dispatch: any = null;
  let reduxUser: any = null;
  
  try {
    dispatch = useDispatch();
    reduxUser = useSelector((state: any) => state.auth?.user);
  } catch (error) {
    console.log('Redux not available in this context, using fallback auth methods');
  }
  
  // Check for existing user session on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // First try to get user from Redux if available
        if (reduxUser) {
          setUser(reduxUser);
          setLoading(false);
          return;
        }
        
        // Get token and user from local storage
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const timestamp = localStorage.getItem('login_timestamp');
        
        // Set the token in the API service if it exists
        if (token) {
          apiService.setAuthToken(token);
        }
        
        // Check for token and login timestamp
        if (token && storedUser) {
          // Check if token is expired (24 hours)
          if (timestamp) {
            const loginTime = parseInt(timestamp, 10);
            const currentTime = Date.now();
            const tokenAge = currentTime - loginTime;
            const tokenExpired = tokenAge > 24 * 60 * 60 * 1000; // 24 hours
            
            if (tokenExpired) {
              console.log('Token expired, logging out');
              logout();
              return;
            }
          }
          
          // Valid session, set the user
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            
            // If Redux dispatch is available, update Redux too
            if (dispatch) {
              dispatch(setReduxUser(userData));
            }
            
            // Update memory store as well for the dev panel
            setUserInMemory(userData);
            
            console.log('Restored user session:', userData);
          } catch (parseErr) {
            console.error('Error parsing stored user:', parseErr);
            logout();
          }
        } else {
          // Try memory store as last resort (for dev panel)
          const memoryUser = getUserFromMemory();
          if (memoryUser) {
            setUser(memoryUser);
            
            // If Redux dispatch is available, update Redux too
            if (dispatch) {
              dispatch(setReduxUser(memoryUser));
            }
          } else {
            // No valid session
            console.log('No valid session found');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuthStatus();
  }, [dispatch, reduxUser]);
  
  // Login function that works with both regular auth and dev login panel
  const login = async (username: string, password: string): Promise<{success: boolean, user: any | null}> => {
    try {
      setLoading(true);
      
      // Attempt to login with the API service first
      try {
        const response = await apiService.post('/api/auth/login', { username, password });
        const userData = response.data.user;
        const token = response.data.token;
        
        // Store the token and user data
        if (token) {
          localStorage.setItem('token', token);
          localStorage.setItem('login_timestamp', Date.now().toString());
          apiService.setAuthToken(token);
          
          // Update memory store for dev panel
          setTokenInMemory(token);
        }
        
        if (userData) {
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Update Redux if available
          if (dispatch) {
            dispatch(setReduxUser(userData));
          }
          
          // Update memory store for dev panel
          setUserInMemory(userData);
          
          return { success: true, user: userData };
        }
      } catch (apiError) {
        console.warn('API login failed, using fallback:', apiError);
        // Fall back to mock login for development
      }
      
      // For development/testing purposes, use pre-defined mock users
      let userToUse;
      
      // Determine which mock user to use based on username
      if (username.toLowerCase().includes('admin')) {
        userToUse = mockAdminUser;
      } else if (username.toLowerCase().includes('trainer')) {
        userToUse = mockTrainerUser;
      } else if (username.toLowerCase().includes('user')) {
        userToUse = mockRegularUser;
      } else {
        userToUse = mockUser; // Default to client
      }
      
      // Set a custom email if provided
      if (username.includes('@')) {
        userToUse = { ...userToUse, email: username };
      }
      
      // Use mock users for development
      setUser(userToUse);
      localStorage.setItem('user', JSON.stringify(userToUse));
      
      // Create a mock token
      const mockToken = `mock-jwt-token-${Date.now()}`;
      localStorage.setItem('token', mockToken);
      localStorage.setItem('login_timestamp', Date.now().toString());
      apiService.setAuthToken(mockToken);
      
      // Update Redux if available
      if (dispatch) {
        dispatch(setReduxUser(userToUse));
      }
      
      // Update memory store for dev panel
      setUserInMemory(userToUse);
      setTokenInMemory(mockToken);
      
      console.log('Mock login successful with user:', userToUse);
      return { success: true, user: userToUse };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, user: null };
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    try {
      // Remove from local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('login_timestamp');
      
      // Try session storage too
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      
      // Clear API auth token
      apiService.setAuthToken(null);
      
      // Update local state
      setUser(null);
      
      // Update Redux if available
      if (dispatch) {
        dispatch(logoutRedux());
      }
      
      // Clear memory store
      clearMemoryStore();
      
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear everything we can
      try {
        localStorage.clear();
        sessionStorage.clear();
        setUser(null);
        clearMemoryStore();
      } catch (e) {
        console.error('Critical error during logout cleanup');
      }
    }
  };
  
  // Register function
  const register = async (data: any): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Try API registration first
      try {
        const response = await apiService.post('/api/auth/register', data);
        const userData = response.data.user;
        const token = response.data.token;
        
        if (token && userData) {
          // Store in localStorage
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          localStorage.setItem('login_timestamp', Date.now().toString());
          
          // Set in API service
          apiService.setAuthToken(token);
          
          // Update state
          setUser(userData);
          
          // Update Redux if available
          if (dispatch) {
            dispatch(setReduxUser(userData));
          }
          
          return true;
        }
      } catch (apiError) {
        console.warn('API registration failed, using fallback:', apiError);
      }
      
      // For development purposes
      const newUser = {
        id: Date.now().toString(),
        ...data,
        role: 'client'
      };
      
      // Store in localStorage
      localStorage.setItem('user', JSON.stringify(newUser));
      
      // Create a mock token
      const mockToken = `mock-jwt-token-${Date.now()}`;
      localStorage.setItem('token', mockToken);
      localStorage.setItem('login_timestamp', Date.now().toString());
      
      // Set in API service
      apiService.setAuthToken(mockToken);
      
      // Update state
      setUser(newUser);
      
      // Update Redux if available
      if (dispatch) {
        dispatch(setReduxUser(newUser));
      }
      
      // Update memory store for dev panel
      setUserInMemory(newUser);
      setTokenInMemory(mockToken);
      
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Update user function
  const updateUser = async (data: any): Promise<boolean> => {
    try {
      if (!user) return false;
      
      // Try API update first
      try {
        const response = await apiService.put('/api/users/profile', data);
        const updatedUserData = response.data.user;
        
        if (updatedUserData) {
          const updatedUser = {
            ...user,
            ...updatedUserData
          };
          
          // Update localStorage
          localStorage.setItem('user', JSON.stringify(updatedUser));
          
          // Update state
          setUser(updatedUser);
          
          // Update Redux if available
          if (dispatch) {
            dispatch(setReduxUser(updatedUser));
          }
          
          // Update memory store for dev panel
          setUserInMemory(updatedUser);
          
          return true;
        }
      } catch (apiError) {
        console.warn('API user update failed, using fallback:', apiError);
      }
      
      // For development purposes
      const updatedUser = {
        ...user,
        ...data
      };
      
      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Update state
      setUser(updatedUser);
      
      // Update Redux if available
      if (dispatch) {
        dispatch(setReduxUser(updatedUser));
      }
      
      // Update memory store for dev panel
      setUserInMemory(updatedUser);
      
      return true;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        register,
        updateUser,
        services,
        authAxios: apiService
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the Auth Context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;
