import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import apiService, { ProductionTokenManager } from '../services/api.service';
import { setUser as setReduxUser, logout as logoutRedux } from '../store/slices/authSlice';
import { createClientProgressService, ClientProgressServiceInterface } from '../services/client-progress-service';
import { createExerciseService, ExerciseServiceInterface } from '../services/exercise-service';
import { createAdminClientService, AdminClientServiceInterface } from '../services/adminClientService';
import sessionService from '../services/session-service';
import '../hooks/useBackendConnection';
import { AxiosInstance } from 'axios';
import tokenCleanup from '../utils/tokenCleanup';
import { clearAdminImpersonationState, restoreAdminSessionFromImpersonation } from '../utils/adminImpersonationSession';
import { readAcquisitionParams } from '../utils/acquisitionAttribution';
import { logger } from '@/utils/logger';
import { AuthContext } from './authContextState';

// PRODUCTION-ONLY AuthContext - NO DEVELOPMENT BYPASSES
// This version is for LIVE PRODUCTION use where real authentication is required

// Enhanced User Interface aligned with backend model
interface NotificationPreferences {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  quietHours?: unknown;
  [key: string]: unknown;
}
export interface User {
  id: string;
  email: string;
  username: string;
  phone?: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'trainer' | 'client' | 'user';
  fitnessGoal?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  notificationPreferences?: NotificationPreferences | null;
  clientSource?: 'swanstudios' | 'move_fitness' | 'external';
  hasLinkedWaiver?: boolean;
  waiverStatus?: 'linked' | 'missing' | 'unverified' | 'invalid_user' | 'not_required';
  waiverRecordId?: number | null;
  waiverSignedAt?: string | null;
  profileImageUrl?: string;
  photo?: string;
  isActive: boolean;
  isOnboardingComplete?: boolean;
  createdAt: string;
  updatedAt: string;
  trainerInfo?: unknown;
  clientInfo?: unknown;
}

type AuthUserPayload = Partial<User> & Pick<User, 'id' | 'email' | 'createdAt' | 'updatedAt'> & {
  onboardingComplete?: boolean;
};

type RegistrationData = {
  username?: string;
  firstName?: string;
  lastName?: string;
  [key: string]: unknown;
};

type UserProfileUpdate = Partial<User> & {
  [key: string]: unknown;
};

type AuthActionResult = {
  success: boolean;
  user: User | null;
  error?: string;
};

type LoginResult = AuthActionResult & {
  message?: string;
  forcePasswordChange?: boolean;
  tempToken?: string;
};

type AuthLoginResponse = {
  user?: AuthUserPayload;
  token?: string;
  forcePasswordChange?: boolean;
  tempToken?: string;
};

type AuthRegistrationResponse = {
  user?: AuthUserPayload;
  token?: string;
};

type AuthUserResponse = {
  user?: AuthUserPayload;
};

type AuthUserUpdateResponse = {
  user?: Partial<User>;
};

type ForgotPasswordResponse = {
  success?: boolean;
};

// Auth Context Interface
export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  token: string | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  register: (data: RegistrationData) => Promise<AuthActionResult>;
  updateUser: (data: UserProfileUpdate) => Promise<AuthActionResult>;
  refreshUser: () => Promise<AuthActionResult>;
  refreshToken: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<{success: boolean}>;
  checkPermission: (permission: string) => boolean;
  services: {
    session: typeof sessionService;
    clientProgress: ClientProgressServiceInterface;
    exercise: ExerciseServiceInterface;
    adminClient: AdminClientServiceInterface;
  };
  authAxios: AxiosInstance;
}


// Permission mappings for roles
const ROLE_PERMISSIONS = {
  admin: ['admin:all', 'trainer:all', 'client:all', 'user:all'],
  trainer: ['trainer:all', 'client:read', 'client:update'],
  client: ['client:self'],
  user: ['user:self']
};

const clearEmergencyAdminBypass = () => {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('bypass_admin_verification');
  localStorage.removeItem('admin_emergency_mode');
  sessionStorage.removeItem('bypass_admin_verification');
  sessionStorage.removeItem('admin_emergency_mode');
};

const useOptionalReduxAuth = () => {
  const dispatch = useDispatch();
  return { dispatch };
};


const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);
const readStoredUser = (): Partial<User> | null => {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem('user');
    if (!stored) return null;
    const parsed: unknown = JSON.parse(stored);
    return isRecord(parsed) ? parsed as Partial<User> : null;
  } catch {
    return null;
  }
};

const hasOwn = (value: unknown, key: string): boolean => (
  isRecord(value) && Object.prototype.hasOwnProperty.call(value, key)
);

const resolveOnboardingComplete = (
  userData: AuthUserPayload,
  fallback?: Partial<User> | null
): boolean | undefined => {
  if (typeof userData.isOnboardingComplete === 'boolean') return userData.isOnboardingComplete;
  if (typeof userData.onboardingComplete === 'boolean') return userData.onboardingComplete;
  return fallback?.isOnboardingComplete;
};

const resolveWaiverFields = (userData: AuthUserPayload, fallback?: Partial<User> | null) => {
  const serverSentWaiverState = (
    hasOwn(userData, 'hasLinkedWaiver') ||
    hasOwn(userData, 'waiverStatus') ||
    hasOwn(userData, 'waiverRecordId') ||
    hasOwn(userData, 'waiverSignedAt')
  );

  if (serverSentWaiverState) {
    return {
      hasLinkedWaiver: userData.hasLinkedWaiver === true,
      waiverStatus: userData.waiverStatus,
      waiverRecordId: userData.waiverRecordId ?? null,
      waiverSignedAt: userData.waiverSignedAt ?? null
    };
  }

  return {
    hasLinkedWaiver: fallback?.hasLinkedWaiver,
    waiverStatus: fallback?.waiverStatus,
    waiverRecordId: fallback?.waiverRecordId ?? null,
    waiverSignedAt: fallback?.waiverSignedAt ?? null
  };
};

const getAuthErrorDetails = (
  error: unknown
): { status?: number; message?: string; isAuthSessionExpired: boolean } => {
  const response = isRecord(error) && isRecord(error.response)
    ? error.response
    : undefined;
  const responseData = response && isRecord(response.data)
    ? response.data
    : undefined;
  const responseMessage = responseData && typeof responseData.message === 'string'
    ? responseData.message
    : undefined;
  const errorMessage = error instanceof Error
    ? error.message
    : isRecord(error) && typeof error.message === 'string'
      ? error.message
      : undefined;

  return {
    status: response && typeof response.status === 'number' ? response.status : undefined,
    message: responseMessage || errorMessage,
    isAuthSessionExpired: isRecord(error) && error.isAuthSessionExpired === true
  };
};

const isCompleteAuthUserPayload = (
  userData: Partial<User> | null
): userData is AuthUserPayload => (
  typeof userData?.id === 'string'
  && typeof userData.email === 'string'
  && typeof userData.createdAt === 'string'
  && typeof userData.updatedAt === 'string'
);

const formatAuthUser = (
  userData: AuthUserPayload,
  usernameFallback?: string,
  fallback?: Partial<User> | null
): User => ({
  id: userData.id,
  email: userData.email,
  username: userData.username || usernameFallback || userData.email?.split('@')[0],
  phone: userData.phone,
  firstName: userData.firstName || '',
  lastName: userData.lastName || '',
  role: userData.role || 'user',
  clientSource: userData.clientSource,
  emailNotifications: userData.emailNotifications ?? fallback?.emailNotifications ?? true,
  smsNotifications: userData.smsNotifications ?? fallback?.smsNotifications ?? true,
  notificationPreferences: userData.notificationPreferences ?? fallback?.notificationPreferences ?? null,
  ...resolveWaiverFields(userData, fallback),
  profileImageUrl: userData.profileImageUrl || userData.photo,
  photo: userData.photo,
  isActive: userData.isActive !== false,
  isOnboardingComplete: resolveOnboardingComplete(userData, fallback),
  createdAt: userData.createdAt,
  updatedAt: userData.updatedAt,
  trainerInfo: userData.trainerInfo,
  clientInfo: userData.clientInfo
});

// Auth Provider Component - PRODUCTION VERSION
export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  // Redux integration (optional)
  const { dispatch } = useOptionalReduxAuth();
  
  // Create services with authenticated axios instance — memoized since apiService is a singleton
  const authApiClient = apiService as unknown as AxiosInstance;
  const services = useMemo(() => ({
    session: sessionService,
    clientProgress: createClientProgressService(authApiClient),
    exercise: createExerciseService(authApiClient),
    adminClient: createAdminClientService(authApiClient)
  }), [authApiClient]);
  
  // Token refresh function - Properly memoized to prevent re-creation
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const newToken = await ProductionTokenManager.refreshAccessToken();

      if (newToken) {
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
  }, []); // No dependencies - this function is stable
  
  // Request password reset email
  const forgotPassword = useCallback(async (email: string): Promise<{success: boolean}> => {
    try {
      const response = await apiService.post<ForgotPasswordResponse>('/api/auth/forgot-password', { email });
      return { success: response.data?.success ?? true };
    } catch {
      return { success: true }; // Always return success to prevent email enumeration
    }
  }, []);

  // Check if user has permission - Memoized with stable user.role dependency
  const userRole = user?.role;
  const checkPermission = useCallback((permission: string): boolean => {
    if (!userRole) return false;
    
    const userPermissions = ROLE_PERMISSIONS[userRole] || [];
    return userPermissions.some(p => 
      p === permission || 
      p.endsWith(':all') && permission.startsWith(p.split(':')[0])
    );
  }, [userRole]);

  // Logout function
  const logout = useCallback(() => {
    try {
      // Call logout API if authenticated
      const token = tokenCleanup.getValidatedToken();
      if (token) {
        apiService.post('/api/auth/logout').catch(console.error);
      }
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Clear all stored data using cleanup utility
    tokenCleanup.cleanupAllTokens();
    clearAdminImpersonationState();

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

    logger.log('Logged out successfully');
  }, [dispatch]);
  
  // Check authentication status on mount - PRODUCTION ONLY
  // CRITICAL FIX: Proper dependency management to prevent infinite loops
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
    
    const checkAuthStatus = async () => {
      // Guard: Only run if no user is currently set (prevents unnecessary re-runs)
      if (user) {
        logger.log('User already authenticated, skipping auth check');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Get validated token from cleanup utility
        let token = tokenCleanup.getValidatedToken();
        let tokenTimestamp = localStorage.getItem('tokenTimestamp');
        
        if (!token) {
          const storedToken = ProductionTokenManager.getToken();
          const hasRefreshToken = !!ProductionTokenManager.getRefreshToken();

          if (storedToken && ProductionTokenManager.isTokenExpired(storedToken) && hasRefreshToken) {
            logger.log('Stored token expired, attempting refresh...');
            const refreshed = await refreshToken();

            if (refreshed) {
              token = tokenCleanup.getValidatedToken() || ProductionTokenManager.getToken();
              tokenTimestamp = localStorage.getItem('tokenTimestamp');
            }
          }

          if (!token) {
            const restoredAdmin = restoreAdminSessionFromImpersonation();
            if (restoredAdmin) {
              window.location.assign(restoredAdmin.redirectPath || '/dashboard/admin/overview');
              return;
            }
            logger.log('No valid token found');
            if (isMounted) {
              setUser(null);
              setLoading(false);
            }
            return;
          }
        }
        
        // Check token age (24 hours)
        if (tokenTimestamp) {
          const age = Date.now() - parseInt(tokenTimestamp);
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          
          if (age > maxAge) {
            logger.log('Token expired, attempting refresh...');
            const refreshed = await refreshToken();
            
            if (!refreshed) {
              const restoredAdmin = restoreAdminSessionFromImpersonation();
              if (restoredAdmin) {
                window.location.assign(restoredAdmin.redirectPath || '/dashboard/admin/overview');
                return;
              }
              logger.log('Token refresh failed, logging out');
              if (isMounted) logout();
              return;
            }

            token = tokenCleanup.getValidatedToken() || ProductionTokenManager.getToken();
            tokenTimestamp = localStorage.getItem('tokenTimestamp');

            if (!token) {
              logger.log('Token refresh did not return a valid access token');
              if (isMounted) logout();
              return;
            }
          }
        }
        
        // Set token in API service
        apiService.setAuthToken(token);
        if (isMounted) setToken(token);
        
        // Verify token with backend - REQUIRED IN PRODUCTION
        const response = await apiService.get<AuthUserResponse>('/api/auth/me');
        
        if (response.data?.user) {
          const userData = response.data.user;
          clearEmergencyAdminBypass();
          
          const formattedUser = formatAuthUser(userData, undefined, readStoredUser());
          
          if (isMounted) {
            setUser(formattedUser);
            
            // Update Redux if available
            if (dispatch) {
              dispatch(setReduxUser(formattedUser));
            }
            
            logger.log('Authentication restored:', formattedUser.username, formattedUser.role);
          }
        } else {
          throw new Error('Invalid user data from server');
        }
      } catch (error: unknown) {
        console.error('Auth check failed:', error);
        if (isMounted) {
          // Only a real auth rejection may destroy the session. A timeout,
          // offline blip, or backend 5xx during boot must not wipe tokens.
          const { status, isAuthSessionExpired } = getAuthErrorDetails(error);
          const isAuthRejection = status === 401 || status === 403 || isAuthSessionExpired;

          if (isAuthRejection) {
            setError('Authentication failed');
            logout();
          } else {
            const storedUser = readStoredUser();
            if (isCompleteAuthUserPayload(storedUser)) {
              // Serve the complete cached session; the next successful API call
              // or the API 401 interceptor re-validates it against the server.
              const formattedUser = formatAuthUser(storedUser, undefined, storedUser);
              setUser(formattedUser);
              if (dispatch) {
                dispatch(setReduxUser(formattedUser));
              }
              logger.warn('Auth check hit a network/server error; keeping stored session until the API is reachable.');
            } else {
              setError('Authentication failed');
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    checkAuthStatus();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [dispatch, logout, refreshToken, user]);
  
  // Login function - PRODUCTION ONLY — memoized to stabilize context value
  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    clearEmergencyAdminBypass();

    try {
      // PRODUCTION: Only use real API login
      const response: AuthLoginResponse = await apiService.login({ username, password });

      // Handle force-password-change flow — clear stale auth state, no user/token yet
      if (response?.forcePasswordChange && response?.tempToken) {
        logger.log('Login requires password change');
        setUser(null);
        setToken(null);
        return { success: true, user: null, forcePasswordChange: true, tempToken: response.tempToken };
      }

      if (response?.user && response?.token) {
        const { user: userData, token } = response;

        const formattedUser = formatAuthUser(userData, username, readStoredUser());

        // Store token and user using cleanup utility
        tokenCleanup.storeToken(token, formattedUser);
        apiService.setAuthToken(token);

        setUser(formattedUser);
        setToken(token);

        // Update Redux if available
        if (dispatch) {
          dispatch(setReduxUser(formattedUser));
        }

        logger.log('Login successful:', formattedUser.username, formattedUser.role);
        return { success: true, user: formattedUser };
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error: unknown) {
      console.error('Login failed:', error);
      const { message } = getAuthErrorDetails(error);
      const errorMessage = message || 'Login failed';
      setError(errorMessage);
      return { success: false, user: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Register function - PRODUCTION ONLY — memoized to stabilize context value
  const register = useCallback(async (data: RegistrationData): Promise<AuthActionResult> => {
    setLoading(true);
    setError(null);
    
    try {
      // Attribute the acquisition channel for this signup (rule 8 non-PII utm/referrer).
      const response = await apiService.post<AuthRegistrationResponse>('/api/auth/register', { ...data, ...readAcquisitionParams() });
      
      if (response.data?.user && response.data?.token) {
        const { user: userData, token } = response.data;
        
        // Store token
        localStorage.setItem('token', token);
        localStorage.setItem('tokenTimestamp', Date.now().toString());
        apiService.setAuthToken(token);
        
        const formattedUser = {
          ...formatAuthUser(userData, data.username, readStoredUser()),
          firstName: userData.firstName || data.firstName || '',
          lastName: userData.lastName || data.lastName || ''
        };
        
        setUser(formattedUser);
        localStorage.setItem('user', JSON.stringify(formattedUser));
        
        // Update Redux if available
        if (dispatch) {
          dispatch(setReduxUser(formattedUser));
        }
        
        logger.log('Registration successful:', formattedUser.username);
        return { success: true, user: formattedUser };
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      
      // Enhanced error message handling for common registration issues
      let errorMessage = 'Registration failed. Please try again.';
      const errorDetails = getAuthErrorDetails(error);
      
      if (errorDetails.status === 409) {
        errorMessage = 'An account with this email or username already exists. Please try logging in instead or use a different email/username.';
      } else if (errorDetails.status === 400) {
        errorMessage = errorDetails.message || 'Please check your information and try again.';
      } else if (errorDetails.status === 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      } else if (errorDetails.message) {
        errorMessage = errorDetails.message;
      }
      
      setError(errorMessage);
      return { success: false, user: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  // Update user function — memoized to stabilize context value
  const updateUser = useCallback(async (data: UserProfileUpdate): Promise<AuthActionResult> => {
    if (!user) return { success: false, user: null, error: 'Not authenticated' };
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.put<AuthUserUpdateResponse>('/api/auth/profile', data);
      
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
        
        logger.log('User updated successfully');
        return { success: true, user: updatedUser };
      } else {
        throw new Error('Invalid update response');
      }
    } catch (error: unknown) {
      console.error('User update failed:', error);
      const { message } = getAuthErrorDetails(error);
      const errorMessage = message || 'Update failed';
      setError(errorMessage);
      return { success: false, user: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [user, dispatch]);

  const refreshUser = useCallback(async (): Promise<AuthActionResult> => {
    try {
      const response = await apiService.get<AuthUserResponse>('/api/auth/me');

      if (!response.data?.user) {
        throw new Error('Invalid user data from server');
      }

      const userData = response.data.user;
      clearEmergencyAdminBypass();

      const refreshedUser = formatAuthUser(userData, undefined, user || readStoredUser());

      setUser(refreshedUser);
      localStorage.setItem('user', JSON.stringify(refreshedUser));

      if (dispatch) {
        dispatch(setReduxUser(refreshedUser));
      }

      logger.log('User refreshed successfully:', refreshedUser.username, refreshedUser.role);
      return { success: true, user: refreshedUser };
    } catch (error: unknown) {
      const { message } = getAuthErrorDetails(error);
      const errorMessage = message || 'User refresh failed';
      setError(errorMessage);
      logger.warn('User refresh failed:', errorMessage);
      return { success: false, user: null, error: errorMessage };
    }
  }, [dispatch, user]);

  // Context value — memoized to prevent unnecessary re-renders of all consumers
  const contextValue: AuthContextType = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    loading,
    error,
    token,
    login,
    logout,
    register,
    updateUser,
    refreshUser,
    refreshToken,
    forgotPassword,
    checkPermission,
    services,
    authAxios: authApiClient
  }), [user, loading, error, token, login, logout, register, updateUser, refreshUser, refreshToken, forgotPassword, checkPermission, services, authApiClient]);
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
