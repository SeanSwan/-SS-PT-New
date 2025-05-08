/**
 * AuthContext.tsx
 * 
 * Provides authentication state and methods throughout the application.
 * Handles user login, logout, session persistence, and role-based authorization.
 */

import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { createServices, Services } from '../services';

// API base URL from environment variables
// In development mode, we use relative URLs to leverage Vite's proxy
const isDevelopment = import.meta.env.MODE === 'development';
const API_BASE_URL = '';  // Use empty string to rely on relative URLs

// Token validation interval in milliseconds (5 minutes)
const TOKEN_VALIDATION_INTERVAL = 5 * 60 * 1000;

// Token expiry threshold in milliseconds (2 minutes before expiry)
const TOKEN_EXPIRY_THRESHOLD = 2 * 60 * 1000;  

// Development mode flag
const isDevMode = import.meta.env.VITE_DEV_MODE === 'true' || isDevelopment;

// User interface
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer' | 'client' | 'user';
  profileImage?: string;
  specialties?: string[];
  createdAt: string;
  updatedAt: string;
  username?: string; // Added to support username display in admin-route.tsx
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  signup: (userData: any) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  clearError: () => void;
  hasRole: (roles: string | string[]) => boolean;
  authAxios: typeof api; // Export the axios instance
  validateToken: () => Promise<boolean>; // Added for explicit token validation
  loginTimestamp: number | null; // Added to track login time
  services: Services; // Add services to the context
}

// Create axios instance with auth header
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // Add 10s timeout for better error handling
});

// Initialize services with Axios instance
const services = createServices(api);

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  login: async () => ({}),
  logout: () => {},
  signup: async () => {},
  updateUser: async () => {},
  clearError: () => {},
  hasRole: () => false,
  authAxios: api,
  validateToken: async () => false,
  loginTimestamp: null,
  services: services, // Add services to the default context value
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [loginTimestamp, setLoginTimestamp] = useState<number | null>(() => {
    const stored = localStorage.getItem('login_timestamp');
    return stored ? parseInt(stored, 10) : null;
  });
  
  // Create services instance that updates when token changes
  const [services, setServices] = useState(() => createServices(api));
  
  // Create ref for the validation interval to easily clear it
  const validationIntervalRef = useRef<number | null>(null);

  /**
   * Load user data from localStorage or create mock user if in development mode
   */
  const loadUserFromStorage = useCallback((): User | null => {
    try {
      const cachedUserData = localStorage.getItem('user_data');
      
      if (cachedUserData) {
        const userData = JSON.parse(cachedUserData);
        if (userData && userData.id && userData.role) {
          console.log(`✅ Using cached user data: ${userData.firstName} (${userData.role})`);
          return userData;
        }
      }
    } catch (cacheError) {
      console.warn('Error reading cached user data:', cacheError);
    }
    
    // Create mock user in development mode
    if (isDevMode) {
      const mockUser: User = {
        id: 'dev-user-id',
        email: 'ogpswan@example.com',
        firstName: 'Dev',
        lastName: 'User',
        username: 'ogpswan',
        role: 'client',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save to localStorage for consistent experience
      localStorage.setItem('user_data', JSON.stringify(mockUser));
      
      console.log('🧪 Created mock development user');
      return mockUser;
    }
    
    return null;
  }, []);

  // Define validateToken as a method that can be called explicitly
  const validateToken = useCallback(async (): Promise<boolean> => {
    const storedToken = localStorage.getItem('token');
    
    if (!storedToken) {
      console.log('Token validation failed: No token found in localStorage');
      return false;
    }
    
    try {
      // Add token to axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      
      // For development - skip validation and assume token is valid
      if (isDevMode) {
        console.log('🧪 Development mode: Skipping token validation and assuming token is valid');
        
        // Load user from storage or create mock user
        const userData = loadUserFromStorage();
        
        if (userData) {
          setUser(userData);
          setToken(storedToken);
          return true;
        }
        
        // If we couldn't load or create a user, check if we have a token that looks like a dev token
        if (storedToken.startsWith('dev-') || storedToken === 'mock-token-for-development-mode') {
          // Create a default mock user
          const defaultUser: User = {
            id: 'mock-user-id',
            username: 'ogpswan',
            email: 'ogpswan@example.com',
            firstName: 'Mock',
            lastName: 'User',
            role: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Save to localStorage for future use
          localStorage.setItem('user_data', JSON.stringify(defaultUser));
          
          setUser(defaultUser);
          setToken(storedToken);
          console.log('🧪 Created default mock user for development');
          return true;
        }
      }
      
      // Try to validate with the server (only in production)
      if (!isDevMode) {
        // Fetch user profile
        console.log('Validating token by fetching user profile...');
        
        // Use a timeout to prevent hanging
        const timeoutPromise = new Promise<any>((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000);
        });
        
        const response = await Promise.race([
          api.get('/api/auth/me'),
          timeoutPromise
        ]);
        
        // Ensure we have a valid user object with role
        if (response && response.data && response.data.id && response.data.role) {
          setUser(response.data);
          setToken(storedToken);
          // Save user data to localStorage for faster loading next time
          localStorage.setItem('user_data', JSON.stringify(response.data));
          console.log(`✅ Token valid: User ${response.data.firstName} (${response.data.role}) authenticated.`);
          return true;
        } else {
          console.error('❌ Token validation failed: Invalid user data received');
          throw new Error('Invalid user data received');
        }
      }
      
      // Default return for development mode with no token or user data
      return true;
    } catch (err: any) {
      console.error('❌ Token validation failed:', err?.response?.status || err.message);
      
      // Enhanced error logging for better debugging
      if (err.response) {
        console.error(`Server responded with status ${err.response.status}: ${err.response.data?.message || 'Unknown error'}`);
      } else if (err.request) {
        console.error('No response received from server during token validation');
      }
      
      // For development - assume token is valid despite errors
      if (isDevMode) {
        console.log('🧪 Development mode: Ignoring validation error and proceeding anyway');
        
        // Try to load user from storage
        const userData = loadUserFromStorage();
        
        if (userData) {
          setUser(userData);
          setToken(storedToken);
          return true;
        }
      }
      
      return false;
    }
  }, [loadUserFromStorage]);

  // Comprehensive function to check authentication state
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    const timestamp = localStorage.getItem('login_timestamp');

    if (!storedToken) {
      console.log('Authentication check: No token found');
      setIsLoading(false);
      return false;
    }

    // Check if token is too old based on timestamp (if available)
    if (timestamp) {
      const loginTime = parseInt(timestamp, 10);
      const currentTime = Date.now();
      const tokenAge = currentTime - loginTime;
      
      // Log token age information for debugging
      console.log(`Token age: ${Math.round(tokenAge / 1000 / 60)} minutes`);
      
      // If token is approaching expiry, we should perform a revalidation
      if (tokenAge > (24 * 60 * 60 * 1000 - TOKEN_EXPIRY_THRESHOLD)) {
        console.log('⚠️ Token approaching expiration threshold, validating...');
      }
    }

    // Validate token with server
    try {
      const isValid = await validateToken();
      
      if (!isValid) {
        // Clean up invalid authentication state
        console.error('🔒 Authentication failed during check: Invalid token');
        localStorage.removeItem('token');
        localStorage.removeItem('login_timestamp');
        setToken(null);
        setUser(null);
        setLoginTimestamp(null);
        setError('Session expired. Please log in again.');
      } else {
        // Update login timestamp if it wasn't set (for backward compatibility)
        if (!timestamp) {
          const newTimestamp = Date.now();
          localStorage.setItem('login_timestamp', newTimestamp.toString());
          setLoginTimestamp(newTimestamp);
          console.log('Updated missing login timestamp');
        }
      }
      
      return isValid;
    } catch (err) {
      console.error('Error during authentication check:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [validateToken]);

  // Check if user is authenticated on mount and set up periodic validation
  useEffect(() => {
    console.log('🔍 Initializing authentication...');
    
    // Configure maximum validation attempts to prevent infinite loops
    let validationAttempts = 0;
    const MAX_VALIDATION_ATTEMPTS = 2;
    
    // Initial auth check
    const initialCheck = async () => {
      validationAttempts++;
      await checkAuth();
    };
    
    initialCheck();
    
    // Set up a periodic check to validate the token is still valid
    // This helps prevent situations where the token expires during an active session
    validationIntervalRef.current = window.setInterval(() => {
      const tokenExists = localStorage.getItem('token');
      if (tokenExists && validationAttempts < MAX_VALIDATION_ATTEMPTS) {
        console.log('⏱️ Performing scheduled token validation check');
        validationAttempts++;
        checkAuth();
      } else if (validationAttempts >= MAX_VALIDATION_ATTEMPTS) {
        console.log('Maximum validation attempts reached, suspending further validation');
        // Reset counter periodically to allow future validations
        setTimeout(() => {
          validationAttempts = 0;
        }, 60000); // Reset after 1 minute
      }
    }, TOKEN_VALIDATION_INTERVAL);
    
    // Clear interval on unmount
    return () => {
      if (validationIntervalRef.current !== null) {
        clearInterval(validationIntervalRef.current);
        validationIntervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty dependency array

  // Add request interceptor to include auth token
  useEffect(() => {
    const interceptor = api.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // When token changes, update services with the new api instance
    if (token) {
      // Ensure token is set in axios headers
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Recreate services with updated api
      setServices(createServices(api));
    }

    // Clean up interceptor on unmount
    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [token]);

  // Login function with improved error handling and development mode support
  const login = async (usernameOrEmail: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`🔑 Attempting login to /api/auth/login`);
      console.log(`Login attempt with username/email: ${usernameOrEmail}`);
      
      // In development mode, use mock login if configured
      if (isDevMode) {
        console.log('Development mode: Using mock login');
        
        // Create a mock user based on the username
        const mockUser = {
          id: 'mock-user-id',
          username: usernameOrEmail,
          email: `${usernameOrEmail}@example.com`,
          firstName: usernameOrEmail === 'admin' ? 'Admin' : 'Mock',
          lastName: 'User',
          // If username contains "admin", make them an admin
          role: usernameOrEmail.toLowerCase().includes('admin') ? 'admin' : 'client',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Set mock token in localStorage
        const mockToken = 'mock-token-for-development-mode';
        localStorage.setItem('token', mockToken);
        localStorage.setItem('login_timestamp', Date.now().toString());
        localStorage.setItem('user_data', JSON.stringify(mockUser));
        
        // Update state
        setToken(mockToken);
        setUser(mockUser);
        setLoginTimestamp(Date.now());
        
        // Small delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Return mock response
        return {
          token: mockToken,
          user: mockUser
        };
      }
      
      // Real API call for production
      const response = await api.post('/api/auth/login', { 
        username: usernameOrEmail, 
        password 
      });
      
      // Validate response data
      if (!response.data || !response.data.token) {
        throw new Error('Invalid server response - missing token');
      }
      
      const { token, user } = response.data;

      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Save user data to localStorage for faster loading next time
      localStorage.setItem('user_data', JSON.stringify(user));
      
      // Set login timestamp for token expiration tracking
      const timestamp = Date.now();
      localStorage.setItem('login_timestamp', timestamp.toString());
      setLoginTimestamp(timestamp);
      
      // Update state and log success
      setToken(token);
      setUser(user);
      console.log(`✅ Login successful: ${user.firstName} (${user.role})`);
      
      // Return the response data so the component can access it
      return response.data;
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      // Enhanced error handling with more specific error messages
      let errorMessage = '';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (err.response) {
        // Server responded with an error
        if (err.response.status === 404) {
          errorMessage = 'Authentication service not found. Please contact support.';
        } else if (err.response.status === 401) {
          errorMessage = 'Invalid credentials. Please check your username and password.';
        } else {
          errorMessage = err.response.data?.message || 'Authentication failed. Please try again.';
        }
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
        
        // In development mode, use mock login as fallback
        if (isDevMode) {
          console.log('Server connection issue detected. Using mock login for development.');
          
          // Create a mock user based on the username
          const mockUser = {
            id: 'dev-user-id',
            username: usernameOrEmail,
            email: `${usernameOrEmail}@example.com`,
            firstName: 'Dev',
            lastName: 'User',
            role: usernameOrEmail.toLowerCase().includes('admin') ? 'admin' : 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          // Set mock token in localStorage
          const mockToken = 'dev-mock-token';
          localStorage.setItem('token', mockToken);
          localStorage.setItem('login_timestamp', Date.now().toString());
          localStorage.setItem('user_data', JSON.stringify(mockUser));
          
          // Update state
          setToken(mockToken);
          setUser(mockUser);
          setLoginTimestamp(Date.now());
          
          // Return mock response
          return {
            token: mockToken,
            user: mockUser
          };
        }
      } else {
        // Something else caused the error
        errorMessage = err.message || 'Failed to log in. Please try again.';
      }
      
      setError(errorMessage);
      
      // Return error info in a structured way for components to use
      throw {
        message: errorMessage,
        status: err.response?.status,
        data: err.response?.data
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced logout function with complete cleanup
  const logout = () => {
    try {
      if (user) {
        console.log(`👋 Logging out user: ${user.firstName} (${user.role})`);
      }
      
      // Clear all auth-related items from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('login_timestamp');
      localStorage.removeItem('user_data');
      
      // Clear any cached user preferences or session data
      // This prevents stale data from affecting a new login session
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('user_') || 
          key.startsWith('session_') || 
          key.startsWith('pref_')
        )) {
          keysToRemove.push(key);
        }
      }
      
      // Remove collected keys (doing this separately to avoid issues with changing localStorage during iteration)
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Update state
      setToken(null);
      setUser(null);
      setLoginTimestamp(null);
      
      // Clear any error messages
      setError(null);
      
      console.log('🔒 Logout complete. All session data cleared.');
    } catch (err) {
      console.error('Error during logout:', err);
      // Force state reset even if there was an error
      setToken(null);
      setUser(null);
      setLoginTimestamp(null);
    }
  };

  // Signup function with development mode support
  const signup = async (userData: any) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('📝 Attempting user registration...');
      
      // In development mode, use mock signup if configured
      if (isDevMode) {
        console.log('Development mode: Using mock signup');
        
        // Create a mock user based on the provided data
        const mockUser = {
          id: 'mock-user-id',
          username: userData.username,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role || 'client',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        // Set mock token in localStorage
        const mockToken = 'mock-token-for-development-mode';
        localStorage.setItem('token', mockToken);
        localStorage.setItem('login_timestamp', Date.now().toString());
        localStorage.setItem('user_data', JSON.stringify(mockUser));
        
        // Update state
        setToken(mockToken);
        setUser(mockUser);
        setLoginTimestamp(Date.now());
        
        // Small delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Return mock response
        return;
      }
      
      // Real API call for production
      const response = await api.post('/api/auth/register', userData);
      const { token, user } = response.data;

      // Save token to localStorage
      localStorage.setItem('token', token);
      
      // Save user data to localStorage for faster loading next time
      localStorage.setItem('user_data', JSON.stringify(user));
      
      // Set login timestamp
      const timestamp = Date.now();
      localStorage.setItem('login_timestamp', timestamp.toString());
      setLoginTimestamp(timestamp);
      
      // Update state
      setToken(token);
      setUser(user);
      
      console.log(`✅ Registration successful: ${user.firstName} (${user.role})`);
    } catch (err: any) {
      console.error('❌ Signup error:', err);
      
      let errorMessage = 'Failed to sign up';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 409) {
        errorMessage = 'A user with this email or username already exists';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid registration data. Please check all fields.';
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Update user profile
  const updateUser = async (userData: Partial<User>) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔄 Updating user profile...');
      
      // In development mode, use mock profile update if configured
      if (isDevMode) {
        console.log('Development mode: Using mock profile update');
        
        // Get current user data
        const currentUser = user || loadUserFromStorage();
        
        if (!currentUser) {
          throw new Error('No user found to update');
        }
        
        // Create updated user
        const updatedUser = {
          ...currentUser,
          ...userData,
          updatedAt: new Date().toISOString()
        };
        
        // Save to localStorage
        localStorage.setItem('user_data', JSON.stringify(updatedUser));
        
        // Update state
        setUser(updatedUser);
        
        // Small delay to simulate API call
        await new Promise(resolve => setTimeout(resolve, 300));
        
        console.log('✅ Profile updated successfully (mock)');
        return;
      }
      
      // Real API call for production
      const response = await api.patch('/api/auth/profile', userData);
      
      // Update state
      setUser(response.data);
      
      // Save updated user data to localStorage
      localStorage.setItem('user_data', JSON.stringify(response.data));
      
      console.log('✅ Profile updated successfully');
    } catch (err: any) {
      console.error('❌ Update user error:', err);
      
      let errorMessage = 'Failed to update profile';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission denied: Cannot update this profile';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid profile data. Please check all fields.';
      }
      
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };
  
  // Check if user has a specific role
  const hasRole = (roles: string | string[]) => {
    if (!user) return false;
    
    // Convert single role to array
    const roleArray = Array.isArray(roles) ? roles : [roles];
    
    // Admin has access to everything
    if (user.role === 'admin') return true;
    
    return roleArray.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        error,
        login,
        logout,
        signup,
        updateUser,
        clearError,
        hasRole,
        authAxios: api,
        validateToken,
        loginTimestamp,
        services, // Include services in the provider value
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export default AuthContext;