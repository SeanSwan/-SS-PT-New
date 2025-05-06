/**
 * useDashboardState Hook
 * =====================
 * Custom hook for managing workout dashboard state and logic
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../../../hooks/useAuth';
import { useAppDispatch, useAppSelector } from '../../../store';
import { setSelectedClient } from '../../../store/slices/workoutSlice';

interface UseDashboardStateReturn {
  // State
  activeTab: string;
  isLoading: boolean;
  isAuthorized: boolean;
  error: string | null;
  
  // Data
  user: any;
  clients: any[] | null;
  selectedClientId: string | null;
  
  // Actions
  setActiveTab: (tab: string) => void;
  handleClientChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  checkIsAuthorized: () => boolean;
  refreshDashboardData: () => void;
}

/**
 * Custom hook for managing dashboard state
 */
const useDashboardState = (): UseDashboardStateReturn => {
  // Router hooks
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  // Local state
  const [activeTab, setActiveTab] = useState<string>('progress');
  const [error, setError] = useState<string | null>(null);
  
  // Get authentication state from Redux
  const { 
    user,
    clients,
    loading: authLoading,
    error: authError,
    loadClients
  } = useAuth();
  
  // Get selected client from Redux
  const { selectedClientId } = useAppSelector(state => state.workout);
  
  // Load clients if user is admin or trainer
  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'trainer')) {
      try {
        loadClients();
      } catch (err) {
        setError('Failed to load clients. Please try again.');
      }
    }
  }, [user, loadClients]);
  
  // Set selected client when userId changes
  useEffect(() => {
    if (userId) {
      dispatch(setSelectedClient(userId));
    } else if (user?.id) {
      dispatch(setSelectedClient(user.id));
      
      // Update URL to include user ID
      navigate(`/workout/${user.id}`, { replace: true });
    }
  }, [userId, user, dispatch, navigate]);
  
  // Handle client change
  const handleClientChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const clientId = e.target.value;
    dispatch(setSelectedClient(clientId));
    
    // Update URL if client changes
    if (clientId !== userId) {
      navigate(`/workout/${clientId}`);
    }
  }, [userId, dispatch, navigate]);
  
  // Check if user is authorized to view this dashboard
  const checkIsAuthorized = useCallback(() => {
    if (!user) return false;
    
    // If no specific userId is provided, the user is viewing their own dashboard
    if (!userId) return true;
    
    // If a userId is provided, check if the current user is authorized to view it
    if (user.id === userId) return true;
    if (user.role === 'admin' || user.role === 'trainer') return true;
    
    return false;
  }, [user, userId]);
  
  // Utility function to refresh all dashboard data
  const refreshDashboardData = useCallback(() => {
    if (user && (user.role === 'admin' || user.role === 'trainer')) {
      loadClients();
    }
  }, [user, loadClients]);
  
  // Combine all loading states
  const isLoading = authLoading;
  
  // Combine errors
  const combinedError = error || authError;
  
  // Calculate authorization state
  const isAuthorized = checkIsAuthorized();
  
  return {
    activeTab,
    isLoading,
    isAuthorized,
    error: combinedError,
    user,
    clients,
    selectedClientId,
    setActiveTab,
    handleClientChange,
    checkIsAuthorized,
    refreshDashboardData
  };
};

export default useDashboardState;
