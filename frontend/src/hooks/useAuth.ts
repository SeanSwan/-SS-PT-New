/**
 * useAuth Hook
 * ===========
 * Custom hook to access and manage authentication state from Redux
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchUserProfile, 
  fetchClients, 
  logout,
  clearError 
} from '../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';

// Define the return type for the hook
interface UseAuthReturn {
  // State
  user: any;
  token: string | null;
  clients: any[];
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  
  // Actions
  logoutUser: () => void;
  clearErrorMessage: () => void;
  loadUserProfile: () => void;
  loadClients: () => void;
}

/**
 * Custom hook for accessing and managing authentication state
 */
export const useAuth = (): UseAuthReturn => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Get data from Redux store
  const {
    user,
    token,
    clients,
    isAuthenticated,
    loading,
    error,
  } = useAppSelector(state => state.auth);
  
  // Load user profile on auth state change
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchUserProfile());
    }
  }, [token, user, dispatch]);
  
  // Event handlers
  const logoutUser = useCallback(() => {
    dispatch(logout());
    navigate('/login');
  }, [dispatch, navigate]);
  
  const clearErrorMessage = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);
  
  const loadUserProfile = useCallback(() => {
    dispatch(fetchUserProfile());
  }, [dispatch]);
  
  const loadClients = useCallback(() => {
    dispatch(fetchClients());
  }, [dispatch]);
  
  return {
    user,
    token,
    clients,
    isAuthenticated,
    loading,
    error,
    logoutUser,
    clearErrorMessage,
    loadUserProfile,
    loadClients,
  };
};

export default useAuth;
