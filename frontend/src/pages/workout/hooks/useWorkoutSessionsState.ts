/**
 * useWorkoutSessionsState Hook
 * ===========================
 * Custom hook for managing workout sessions state and actions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  fetchWorkoutSessions,
  fetchWorkoutSession,
  deleteWorkoutSession,
  setSelectedSession
} from '../../../store/slices/workoutSlice';
import { format, parseISO } from 'date-fns';

interface UseWorkoutSessionsStateReturn {
  // State
  sessions: any[];
  filteredSessions: any[];
  loading: boolean;
  error: string | null;
  timeFilter: string;
  searchTerm: string;
  selectedSession: any | null;
  showDetails: boolean;
  
  // Actions
  setTimeFilter: (filter: string) => void;
  setSearchTerm: (term: string) => void;
  setShowDetails: (show: boolean) => void;
  handleViewDetails: (session: any) => void;
  handleCloseDetails: () => void;
  handleDeleteSession: (sessionId: string) => void;
  refreshSessions: () => void;
  
  // Utility functions
  formatSessionDate: (dateString: string) => string;
  calculateSetVolume: (weight: number, reps: number) => number;
  formatDuration: (minutes: number) => string;
}

/**
 * Custom hook for managing workout sessions
 */
const useWorkoutSessionsState = (userId?: string): UseWorkoutSessionsStateReturn => {
  const dispatch = useAppDispatch();
  
  // Redux state
  const {
    sessions: { 
      data: reduxSessions,
      selectedSession: reduxSelectedSession,
      loading: reduxLoading,
      error: reduxError
    },
    selectedClientId
  } = useAppSelector(state => state.workout);
  
  // Local state
  const [filteredSessions, setFilteredSessions] = useState<any[]>([]);
  const [timeFilter, setTimeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load sessions on component mount
  useEffect(() => {
    const effectiveUserId = userId || selectedClientId;
    if (effectiveUserId) {
      const fetchParams = {
        userId: effectiveUserId
      };
      
      dispatch(fetchWorkoutSessions(fetchParams))
        .unwrap()
        .catch(err => {
          setError(err || 'Failed to load workout sessions. Please try again.');
        });
    }
  }, [dispatch, userId, selectedClientId]);
  
  // Filter sessions based on time filter and search term
  useEffect(() => {
    let filtered = [...reduxSessions];
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch (timeFilter) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= cutoffDate;
      });
    }
    
    // Apply search filter
    if (searchTerm.trim() !== '') {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(session => 
        session.title.toLowerCase().includes(search) ||
        session.notes.toLowerCase().includes(search) ||
        session.exercises.some((ex: any) => 
          ex.name.toLowerCase().includes(search) ||
          ex.muscleGroups.some((mg: string) => mg.toLowerCase().includes(search))
        )
      );
    }
    
    setFilteredSessions(filtered);
  }, [reduxSessions, timeFilter, searchTerm]);
  
  // Handle viewing session details
  const handleViewDetails = useCallback((session: any) => {
    dispatch(setSelectedSession(session));
    setShowDetails(true);
    
    // Fetch full session details if needed
    if (!session.exercises?.length) {
      dispatch(fetchWorkoutSession(session.id))
        .unwrap()
        .catch(err => {
          setError(err || 'Failed to load session details. Please try again.');
        });
    }
  }, [dispatch]);
  
  // Close session details modal
  const handleCloseDetails = useCallback(() => {
    setShowDetails(false);
  }, []);
  
  // Delete a session
  const handleDeleteSession = useCallback((sessionId: string) => {
    if (window.confirm('Are you sure you want to delete this workout session? This action cannot be undone.')) {
      dispatch(deleteWorkoutSession(sessionId))
        .unwrap()
        .then(() => {
          // Close details modal if we're viewing the deleted session
          if (showDetails && reduxSelectedSession?.id === sessionId) {
            setShowDetails(false);
          }
        })
        .catch(err => {
          setError(err || 'Failed to delete workout session. Please try again.');
        });
    }
  }, [dispatch, showDetails, reduxSelectedSession]);
  
  // Refresh sessions list
  const refreshSessions = useCallback(() => {
    const effectiveUserId = userId || selectedClientId;
    if (effectiveUserId) {
      const fetchParams = {
        userId: effectiveUserId
      };
      
      dispatch(fetchWorkoutSessions(fetchParams))
        .unwrap()
        .catch(err => {
          setError(err || 'Failed to refresh workout sessions. Please try again.');
        });
    }
  }, [dispatch, userId, selectedClientId]);
  
  // Format date for display
  const formatSessionDate = useCallback((dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (error) {
      return dateString;
    }
  }, []);
  
  // Calculate total volume for a set
  const calculateSetVolume = useCallback((weight: number, reps: number) => {
    return weight * reps;
  }, []);
  
  // Format time duration (minutes to HH:MM)
  const formatDuration = useCallback((minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    
    return `${mins}m`;
  }, []);
  
  return {
    // State
    sessions: reduxSessions,
    filteredSessions,
    loading: reduxLoading,
    error: error || reduxError || null,
    timeFilter,
    searchTerm,
    selectedSession: reduxSelectedSession,
    showDetails,
    
    // Actions
    setTimeFilter,
    setSearchTerm,
    setShowDetails,
    handleViewDetails,
    handleCloseDetails,
    handleDeleteSession,
    refreshSessions,
    
    // Utility functions
    formatSessionDate,
    calculateSetVolume,
    formatDuration
  };
};

export default useWorkoutSessionsState;
