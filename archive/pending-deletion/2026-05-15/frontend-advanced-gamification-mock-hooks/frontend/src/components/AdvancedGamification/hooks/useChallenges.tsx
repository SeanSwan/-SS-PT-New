/**
 * 🎯 CHALLENGES HOOK - USER CHALLENGE PARTICIPATION
 * =================================================
 * Custom hook for managing user challenge participation,
 * progress tracking, and challenge interactions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Challenge,
  ChallengeListResponse,
  ChallengeDetailsResponse,
  ChallengeListFilter,
  ParticipationRecord,
  UserChallengeView
} from '../types/challenge.types';

import gamificationAPI from '../services/gamificationAPI';
import { generateChallengeRecommendations, canUserJoinChallenge } from '../utils/gamificationHelpers';
import { sampleChallenges } from '../utils/mockData';

// ================================================================
// TYPES FOR HOOK RETURN
// ================================================================

interface UseChallengesReturn {
  // Challenge data
  challenges: Challenge[];
  featuredChallenges: Challenge[];
  userChallenges: Challenge[];
  availableChallenges: Challenge[];
  recommendedChallenges: Challenge[];
  
  // Single challenge data
  selectedChallenge: Challenge | null;
  challengeDetails: ChallengeDetailsResponse | null;
  userProgress: ParticipationRecord | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingDetails: boolean;
  isJoining: boolean;
  isLeaving: boolean;
  isUpdatingProgress: boolean;
  
  // Error states
  error: string | null;
  detailsError: string | null;
  actionError: string | null;
  
  // Pagination & Filtering
  currentPage: number;
  totalPages: number;
  totalChallenges: number;
  currentFilters: ChallengeListFilter;
  
  // Actions
  loadChallenges: (filters?: Partial<ChallengeListFilter>) => Promise<void>;
  loadChallengeDetails: (challengeId: string) => Promise<void>;
  joinChallenge: (challengeId: string) => Promise<boolean>;
  leaveChallenge: (challengeId: string) => Promise<boolean>;
  updateProgress: (challengeId: string, metric: string, value: number) => Promise<boolean>;
  searchChallenges: (query: string) => void;
  setFilters: (filters: Partial<ChallengeListFilter>) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  clearSelection: () => void;
  
  // Utility functions
  getChallengeStatus: (challenge: Challenge) => 'available' | 'joined' | 'completed' | 'expired';
  canJoinChallenge: (challenge: Challenge) => { canJoin: boolean; reasons: string[] };
  getRecommendations: (limit?: number) => Challenge[];
  getProgressPercentage: (challengeId: string) => number;
  getTimeRemaining: (challenge: Challenge) => string;
  isEligibleForChallenge: (challenge: Challenge) => boolean;
}

interface UseChallengesOptions {
  autoLoad?: boolean;
  pageSize?: number;
  defaultFilters?: Partial<ChallengeListFilter>;
  useMockData?: boolean;
  enableRealTimeUpdates?: boolean;
}

// ================================================================
// MAIN HOOK IMPLEMENTATION
// ================================================================

export const useChallenges = (
  options: UseChallengesOptions = {}
): UseChallengesReturn => {
  const {
    autoLoad = true,
    pageSize = 12,
    defaultFilters = { sortBy: 'newest', sortOrder: 'desc' },
    useMockData = process.env.NODE_ENV === 'development',
    enableRealTimeUpdates = true
  } = options;
  
  // Challenge data state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [challengeDetails, setChallengeDetails] = useState<ChallengeDetailsResponse | null>(null);
  const [userProgress, setUserProgress] = useState<ParticipationRecord | null>(null);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isUpdatingProgress, setIsUpdatingProgress] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Pagination & Filtering state
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalChallenges, setTotalChallenges] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<ChallengeListFilter>({
    ...defaultFilters,
    limit: pageSize,
    offset: 0,
    sortBy: defaultFilters.sortBy || 'newest',
    sortOrder: defaultFilters.sortOrder || 'desc'
  });
  
  // ================================================================
  // COMPUTED VALUES
  // ================================================================
  
  /**
   * Featured challenges (highlighted by admin)
   */
  const featuredChallenges = useMemo(() => {
    return challenges.filter(challenge => 
      challenge.tags?.includes('featured') || 
      challenge.engagementMetrics.views > 100
    ).slice(0, 3);
  }, [challenges]);
  
  /**
   * User's active challenges
   */
  const userChallenges = useMemo(() => {
    return challenges.filter(challenge =>
      challenge.participationData.some(p => 
        p.userId === getCurrentUserId() && 
        ['joined', 'in_progress'].includes(p.status)
      )
    );
  }, [challenges]);
  
  /**
   * Available challenges (not yet joined)
   */
  const availableChallenges = useMemo(() => {
    const userId = getCurrentUserId();
    return challenges.filter(challenge =>
      challenge.status === 'active' &&
      !challenge.participationData.some(p => p.userId === userId)
    );
  }, [challenges]);
  
  /**
   * Recommended challenges based on user preferences
   */
  const recommendedChallenges = useMemo(() => {
    // This would use user profile data in real implementation
    return availableChallenges.slice(0, 6);
  }, [availableChallenges]);
  
  // ================================================================
  // DATA FETCHING FUNCTIONS
  // ================================================================
  
  /**
   * Load challenges with filters
   */
  const loadChallenges = useCallback(async (
    filters?: Partial<ChallengeListFilter>
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const searchFilters = { ...currentFilters, ...filters };
      
      if (useMockData) {
        // Use mock data for development
        setChallenges(sampleChallenges);
        setTotalChallenges(sampleChallenges.length);
        setTotalPages(Math.ceil(sampleChallenges.length / pageSize));
        return;
      }
      
      const response = await gamificationAPI.getChallenges(searchFilters);
      
      if (response.success && response.data) {
        setChallenges(response.data.challenges);
        setTotalChallenges(response.data.total);
        setTotalPages(Math.ceil(response.data.total / pageSize));
        setCurrentPage(response.data.page);
        setCurrentFilters(response.data.filters);
      } else {
        setError(response.error?.message || 'Failed to load challenges');
        setChallenges([]);
      }
      
    } catch (err) {
      console.error('Error loading challenges:', err);
      setError('Failed to load challenges');
      setChallenges([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentFilters, pageSize, useMockData]);
  
  /**
   * Load detailed information for a specific challenge
   */
  const loadChallengeDetails = useCallback(async (challengeId: string): Promise<void> => {
    try {
      setIsLoadingDetails(true);
      setDetailsError(null);
      
      if (useMockData) {
        const mockChallenge = sampleChallenges.find(c => c.id === challengeId);
        if (mockChallenge) {
          setSelectedChallenge(mockChallenge);
          setChallengeDetails({
            challenge: mockChallenge,
            leaderboard: mockChallenge.participationData,
            relatedChallenges: sampleChallenges.slice(0, 3),
            canParticipate: true
          });
          
          // Set user progress if they're participating
          const userId = getCurrentUserId();
          const progress = mockChallenge.participationData.find(p => p.userId === userId);
          setUserProgress(progress || null);
        }
        return;
      }
      
      const response = await gamificationAPI.getChallengeDetails(challengeId);
      
      if (response.success && response.data) {
        setSelectedChallenge(response.data.challenge);
        setChallengeDetails(response.data);
        setUserProgress(response.data.userParticipation || null);
      } else {
        setDetailsError(response.error?.message || 'Failed to load challenge details');
      }
      
    } catch (err) {
      console.error('Error loading challenge details:', err);
      setDetailsError('Failed to load challenge details');
    } finally {
      setIsLoadingDetails(false);
    }
  }, [useMockData]);
  
  // ================================================================
  // ACTION FUNCTIONS
  // ================================================================
  
  /**
   * Join a challenge
   */
  const joinChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    try {
      setIsJoining(true);
      setActionError(null);
      
      if (useMockData) {
        // Update mock data
        const userId = getCurrentUserId();
        setChallenges(prev => prev.map(challenge => {
          if (challenge.id === challengeId) {
            const newParticipation: ParticipationRecord = {
              userId: userId || 'mock-user',
              userName: 'Mock User',
              joinedAt: new Date().toISOString(),
              status: 'joined',
              progress: {
                currentValue: 0,
                targetValue: challenge.targets[0]?.value || 1,
                percentage: 0,
                lastUpdated: new Date().toISOString()
              }
            };
            
            return {
              ...challenge,
              participationData: [...challenge.participationData, newParticipation],
              progressData: {
                ...challenge.progressData,
                totalParticipants: challenge.progressData.totalParticipants + 1,
                activeParticipants: challenge.progressData.activeParticipants + 1
              }
            };
          }
          return challenge;
        }));
        
        return true;
      }
      
      const response = await gamificationAPI.joinChallenge(challengeId);
      
      if (response.success) {
        // Refresh challenges to get updated data
        await loadChallenges();
        
        // If we have details loaded, refresh them too
        if (selectedChallenge?.id === challengeId) {
          await loadChallengeDetails(challengeId);
        }
        
        return true;
      } else {
        setActionError(response.error?.message || 'Failed to join challenge');
        return false;
      }
      
    } catch (err) {
      console.error('Error joining challenge:', err);
      setActionError('Failed to join challenge');
      return false;
    } finally {
      setIsJoining(false);
    }
  }, [useMockData, loadChallenges, selectedChallenge, loadChallengeDetails]);
  
  /**
   * Leave a challenge
   */
  const leaveChallenge = useCallback(async (challengeId: string): Promise<boolean> => {
    try {
      setIsLeaving(true);
      setActionError(null);
      
      if (useMockData) {
        // Update mock data
        const userId = getCurrentUserId();
        setChallenges(prev => prev.map(challenge => {
          if (challenge.id === challengeId) {
            return {
              ...challenge,
              participationData: challenge.participationData.filter(p => p.userId !== userId),
              progressData: {
                ...challenge.progressData,
                totalParticipants: Math.max(0, challenge.progressData.totalParticipants - 1),
                activeParticipants: Math.max(0, challenge.progressData.activeParticipants - 1)
              }
            };
          }
          return challenge;
        }));
        
        return true;
      }
      
      const response = await gamificationAPI.leaveChallenge(challengeId);
      
      if (response.success) {
        // Refresh challenges to get updated data
        await loadChallenges();
        
        // If we have details loaded, refresh them too
        if (selectedChallenge?.id === challengeId) {
          await loadChallengeDetails(challengeId);
        }
        
        return true;
      } else {
        setActionError(response.error?.message || 'Failed to leave challenge');
        return false;
      }
      
    } catch (err) {
      console.error('Error leaving challenge:', err);
      setActionError('Failed to leave challenge');
      return false;
    } finally {
      setIsLeaving(false);
    }
  }, [useMockData, loadChallenges, selectedChallenge, loadChallengeDetails]);
  
  /**
   * Update challenge progress
   */
  const updateProgress = useCallback(async (
    challengeId: string,
    metric: string,
    value: number
  ): Promise<boolean> => {
    try {
      setIsUpdatingProgress(true);
      setActionError(null);
      
      if (useMockData) {
        // Update mock data
        const userId = getCurrentUserId();
        setChallenges(prev => prev.map(challenge => {
          if (challenge.id === challengeId) {
            return {
              ...challenge,
              participationData: challenge.participationData.map(p => {
                if (p.userId === userId) {
                  const newValue = Math.min(value, p.progress.targetValue);
                  return {
                    ...p,
                    progress: {
                      ...p.progress,
                      currentValue: newValue,
                      percentage: Math.round((newValue / p.progress.targetValue) * 100),
                      lastUpdated: new Date().toISOString()
                    },
                    status: newValue >= p.progress.targetValue ? 'completed' : 'in_progress'
                  };
                }
                return p;
              })
            };
          }
          return challenge;
        }));
        
        return true;
      }
      
      const response = await gamificationAPI.updateChallengeProgress(challengeId, {
        metric,
        value,
        source: 'manual_update'
      });
      
      if (response.success) {
        // Update local progress data
        if (response.data) {
          setUserProgress(response.data);
        }
        
        // Refresh challenges and details
        await loadChallenges();
        if (selectedChallenge?.id === challengeId) {
          await loadChallengeDetails(challengeId);
        }
        
        return true;
      } else {
        setActionError(response.error?.message || 'Failed to update progress');
        return false;
      }
      
    } catch (err) {
      console.error('Error updating progress:', err);
      setActionError('Failed to update progress');
      return false;
    } finally {
      setIsUpdatingProgress(false);
    }
  }, [useMockData, loadChallenges, selectedChallenge, loadChallengeDetails]);
  
  // ================================================================
  // FILTER & SEARCH FUNCTIONS
  // ================================================================
  
  /**
   * Search challenges by query
   */
  const searchChallenges = useCallback((query: string): void => {
    const newFilters = {
      ...currentFilters,
      searchQuery: query,
      offset: 0
    };
    setCurrentFilters(newFilters);
    loadChallenges(newFilters);
  }, [currentFilters, loadChallenges]);
  
  /**
   * Set challenge filters
   */
  const setFilters = useCallback((filters: Partial<ChallengeListFilter>): void => {
    const newFilters = {
      ...currentFilters,
      ...filters,
      offset: 0 // Reset to first page when filters change
    };
    setCurrentFilters(newFilters);
    loadChallenges(newFilters);
  }, [currentFilters, loadChallenges]);
  
  /**
   * Navigate to next page
   */
  const nextPage = useCallback((): void => {
    if (currentPage < totalPages - 1) {
      const newFilters = {
        ...currentFilters,
        offset: (currentPage + 1) * pageSize
      };
      setCurrentFilters(newFilters);
      loadChallenges(newFilters);
    }
  }, [currentPage, totalPages, currentFilters, pageSize, loadChallenges]);
  
  /**
   * Navigate to previous page
   */
  const prevPage = useCallback((): void => {
    if (currentPage > 0) {
      const newFilters = {
        ...currentFilters,
        offset: (currentPage - 1) * pageSize
      };
      setCurrentFilters(newFilters);
      loadChallenges(newFilters);
    }
  }, [currentPage, currentFilters, pageSize, loadChallenges]);
  
  /**
   * Navigate to specific page
   */
  const goToPage = useCallback((page: number): void => {
    if (page >= 0 && page < totalPages) {
      const newFilters = {
        ...currentFilters,
        offset: page * pageSize
      };
      setCurrentFilters(newFilters);
      loadChallenges(newFilters);
    }
  }, [totalPages, currentFilters, pageSize, loadChallenges]);
  
  /**
   * Clear challenge selection
   */
  const clearSelection = useCallback((): void => {
    setSelectedChallenge(null);
    setChallengeDetails(null);
    setUserProgress(null);
    setDetailsError(null);
  }, []);
  
  // ================================================================
  // UTILITY FUNCTIONS
  // ================================================================
  
  /**
   * Get challenge status for current user
   */
  const getChallengeStatus = useCallback((challenge: Challenge) => {
    const userId = getCurrentUserId();
    const participation = challenge.participationData.find(p => p.userId === userId);
    
    if (!participation) return 'available';
    if (participation.status === 'completed') return 'completed';
    if (new Date(challenge.duration.endDate) < new Date()) return 'expired';
    return 'joined';
  }, []);
  
  /**
   * Check if user can join a challenge
   */
  const canJoinChallenge = useCallback((challenge: Challenge) => {
    // This would use actual user data in real implementation
    const mockUser = { userId: getCurrentUserId() || 'mock-user', level: 10 };
    return canUserJoinChallenge(challenge, mockUser as any);
  }, []);
  
  /**
   * Get recommended challenges
   */
  const getRecommendations = useCallback((limit: number = 6) => {
    // This would use actual user data in real implementation
    const mockUser = { 
      userId: getCurrentUserId() || 'mock-user', 
      preferences: { categories: ['cardio', 'strength'] },
      level: 10
    };
    
    return generateChallengeRecommendations(availableChallenges, mockUser as any, limit);
  }, [availableChallenges]);
  
  /**
   * Get progress percentage for a challenge
   */
  const getProgressPercentage = useCallback((challengeId: string): number => {
    const userId = getCurrentUserId();
    const challenge = challenges.find(c => c.id === challengeId);
    const participation = challenge?.participationData.find(p => p.userId === userId);
    return participation?.progress.percentage || 0;
  }, [challenges]);
  
  /**
   * Get formatted time remaining for a challenge
   */
  const getTimeRemaining = useCallback((challenge: Challenge): string => {
    const now = new Date();
    const endDate = new Date(challenge.duration.endDate);
    const diffMs = endDate.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays} day${diffDays === 1 ? '' : 's'} left`;
    if (diffHours > 0) return `${diffHours} hour${diffHours === 1 ? '' : 's'} left`;
    return 'Ending soon';
  }, []);
  
  /**
   * Check if user is eligible for a challenge
   */
  const isEligibleForChallenge = useCallback((challenge: Challenge): boolean => {
    // This would check user level, subscription, etc. in real implementation
    return true;
  }, []);
  
  // ================================================================
  // EFFECTS
  // ================================================================
  
  /**
   * Auto-load challenges on mount
   */
  useEffect(() => {
    if (autoLoad) {
      loadChallenges();
    }
  }, [autoLoad, loadChallenges]);
  
  // ================================================================
  // RETURN HOOK INTERFACE
  // ================================================================
  
  return {
    // Challenge data
    challenges,
    featuredChallenges,
    userChallenges,
    availableChallenges,
    recommendedChallenges,
    
    // Single challenge data
    selectedChallenge,
    challengeDetails,
    userProgress,
    
    // Loading states
    isLoading,
    isLoadingDetails,
    isJoining,
    isLeaving,
    isUpdatingProgress,
    
    // Error states
    error,
    detailsError,
    actionError,
    
    // Pagination & Filtering
    currentPage,
    totalPages,
    totalChallenges,
    currentFilters,
    
    // Actions
    loadChallenges,
    loadChallengeDetails,
    joinChallenge,
    leaveChallenge,
    updateProgress,
    searchChallenges,
    setFilters,
    nextPage,
    prevPage,
    goToPage,
    clearSelection,
    
    // Utility functions
    getChallengeStatus,
    canJoinChallenge,
    getRecommendations,
    getProgressPercentage,
    getTimeRemaining,
    isEligibleForChallenge
  };
};

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Get current user ID from storage
 */
const getCurrentUserId = (): string | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.sub || null;
  } catch {
    return null;
  }
};

export default useChallenges;
