/**
 * 🎮 GAMIFICATION DATA HOOK - CORE DATA MANAGEMENT
 * =================================================
 * Custom hook for managing gamification dashboard data,
 * user profile, statistics, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type {
  GamificationDashboardResponse,
  GamificationUser,
  UserStatistics,
  GamificationResponse,
  GamificationNotification
} from '../types/gamification.types';

import gamificationAPI from '../services/gamificationAPI';
import { sampleUsers, sampleUserStatistics } from '../utils/mockData';

// ================================================================
// TYPES FOR HOOK RETURN
// ================================================================

interface UseGamificationDataReturn {
  // Data
  dashboardData: GamificationDashboardResponse | null;
  userProfile: GamificationUser | null;
  statistics: UserStatistics | null;
  notifications: GamificationNotification[];
  
  // Loading states
  isLoading: boolean;
  isLoadingProfile: boolean;
  isLoadingStats: boolean;
  
  // Error states
  error: string | null;
  profileError: string | null;
  statsError: string | null;
  
  // Actions
  refreshDashboard: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshStatistics: (period?: 'daily' | 'weekly' | 'monthly' | 'yearly') => Promise<void>;
  updatePreferences: (preferences: Partial<GamificationUser['preferences']>) => Promise<boolean>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  
  // Real-time updates
  subscribeToUpdates: () => void;
  unsubscribeFromUpdates: () => void;
  
  // Utility functions
  getCurrentLevel: () => number;
  getXpToNextLevel: () => number;
  getLevelProgress: () => number;
}

interface UseGamificationDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  useMockData?: boolean;
  enableRealTime?: boolean;
}

// ================================================================
// MAIN HOOK IMPLEMENTATION
// ================================================================

export const useGamificationData = (
  options: UseGamificationDataOptions = {}
): UseGamificationDataReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    useMockData = process.env.NODE_ENV === 'development',
    enableRealTime = true
  } = options;
  
  // State management
  const [dashboardData, setDashboardData] = useState<GamificationDashboardResponse | null>(null);
  const [userProfile, setUserProfile] = useState<GamificationUser | null>(null);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [notifications, setNotifications] = useState<GamificationNotification[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  
  // Redux integration (if needed)
  const dispatch = useDispatch();
  const authUser = useSelector((state: any) => state.auth?.user);
  
  // ================================================================
  // DATA FETCHING FUNCTIONS
  // ================================================================
  
  /**
   * Fetch dashboard data
   */
  const fetchDashboardData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      if (useMockData) {
        // Use mock data for development
        const mockDashboard: GamificationDashboardResponse = {
          user: sampleUsers[0],
          activeChallenges: [],
          recentAchievements: [],
          leaderboardPosition: [],
          statistics: sampleUserStatistics,
          notifications: [],
          recommendations: {
            challenges: [],
            achievements: [],
            friends: []
          }
        };
        
        setDashboardData(mockDashboard);
        setUserProfile(mockDashboard.user);
        setStatistics(mockDashboard.statistics);
        return;
      }
      
      const response = await gamificationAPI.getDashboardData();
      
      if (response.success && response.data) {
        setDashboardData(response.data);
        setUserProfile(response.data.user);
        setStatistics(response.data.statistics);
        setNotifications(response.data.notifications || []);
      } else {
        setError(response.error?.message || 'Failed to load dashboard data');
      }
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    }
  }, [useMockData]);
  
  /**
   * Fetch user profile data
   */
  const fetchUserProfile = useCallback(async (): Promise<void> => {
    try {
      setIsLoadingProfile(true);
      setProfileError(null);
      
      if (useMockData) {
        setUserProfile(sampleUsers[0]);
        return;
      }
      
      const response = await gamificationAPI.getUserProfile();
      
      if (response.success && response.data) {
        setUserProfile(response.data);
      } else {
        setProfileError(response.error?.message || 'Failed to load user profile');
      }
      
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setProfileError('Failed to load user profile');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [useMockData]);
  
  /**
   * Fetch user statistics
   */
  const fetchStatistics = useCallback(async (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly'
  ): Promise<void> => {
    try {
      setIsLoadingStats(true);
      setStatsError(null);
      
      if (useMockData) {
        setStatistics(sampleUserStatistics);
        return;
      }
      
      const response = await gamificationAPI.getUserStatistics(period);
      
      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        setStatsError(response.error?.message || 'Failed to load statistics');
      }
      
    } catch (err) {
      console.error('Error fetching statistics:', err);
      setStatsError('Failed to load statistics');
    } finally {
      setIsLoadingStats(false);
    }
  }, [useMockData]);
  
  // ================================================================
  // ACTION FUNCTIONS
  // ================================================================
  
  /**
   * Refresh dashboard data
   */
  const refreshDashboard = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    await fetchDashboardData();
    setIsLoading(false);
  }, [fetchDashboardData]);
  
  /**
   * Refresh profile data
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    await fetchUserProfile();
  }, [fetchUserProfile]);
  
  /**
   * Refresh statistics data
   */
  const refreshStatistics = useCallback(async (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'weekly'
  ): Promise<void> => {
    await fetchStatistics(period);
  }, [fetchStatistics]);
  
  /**
   * Update user preferences
   */
  const updatePreferences = useCallback(async (
    preferences: Partial<GamificationUser['preferences']>
  ): Promise<boolean> => {
    try {
      if (useMockData) {
        // Update local state for mock data
        if (userProfile) {
          setUserProfile({
            ...userProfile,
            preferences: { ...userProfile.preferences, ...preferences }
          });
        }
        return true;
      }
      
      const response = await gamificationAPI.updateUserPreferences(preferences);
      
      if (response.success && response.data) {
        setUserProfile(response.data);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error updating preferences:', err);
      return false;
    }
  }, [useMockData, userProfile]);
  
  /**
   * Mark notification as read
   */
  const markNotificationRead = useCallback(async (notificationId: string): Promise<void> => {
    try {
      if (useMockData) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        return;
      }
      
      await gamificationAPI.markNotificationRead(notificationId);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, [useMockData]);
  
  /**
   * Mark all notifications as read
   */
  const markAllNotificationsRead = useCallback(async (): Promise<void> => {
    try {
      if (useMockData) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        return;
      }
      
      await gamificationAPI.markAllNotificationsRead();
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [useMockData]);
  
  // ================================================================
  // REAL-TIME UPDATES
  // ================================================================
  
  /**
   * Subscribe to real-time updates via WebSocket
   */
  const subscribeToUpdates = useCallback((): void => {
    if (!enableRealTime || useMockData) return;
    
    try {
      const wsUrl = `${process.env.REACT_APP_WS_URL || 'ws://localhost:3001'}/gamification`;
      const token = localStorage.getItem('token');
      
      if (!token) return;
      
      webSocketRef.current = new WebSocket(`${wsUrl}?token=${token}`);
      
      webSocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'ACHIEVEMENT_UNLOCKED':
              // Refresh achievements and possibly show celebration
              refreshDashboard();
              break;
              
            case 'CHALLENGE_UPDATE':
              // Refresh dashboard to get updated challenge progress
              refreshDashboard();
              break;
              
            case 'LEADERBOARD_UPDATE':
              // Update leaderboard position
              if (dashboardData) {
                setDashboardData({
                  ...dashboardData,
                  leaderboardPosition: data.leaderboard || dashboardData.leaderboardPosition
                });
              }
              break;
              
            case 'NOTIFICATION':
              // Add new notification
              setNotifications(prev => [data.notification, ...prev]);
              break;
              
            case 'XP_GAINED':
              // Update user XP in real-time
              if (userProfile) {
                setUserProfile({
                  ...userProfile,
                  xpPoints: data.newXpTotal,
                  level: data.newLevel || userProfile.level
                });
              }
              break;
          }
        } catch (err) {
          console.error('Error processing WebSocket message:', err);
        }
      };
      
      webSocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      webSocketRef.current.onclose = () => {
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (enableRealTime) {
            subscribeToUpdates();
          }
        }, 5000);
      };
      
    } catch (err) {
      console.error('Error setting up WebSocket:', err);
    }
  }, [enableRealTime, useMockData, refreshDashboard, dashboardData, userProfile]);
  
  /**
   * Unsubscribe from real-time updates
   */
  const unsubscribeFromUpdates = useCallback((): void => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
      webSocketRef.current = null;
    }
  }, []);
  
  // ================================================================
  // UTILITY FUNCTIONS
  // ================================================================
  
  /**
   * Get current user level
   */
  const getCurrentLevel = useCallback((): number => {
    return userProfile?.level || 1;
  }, [userProfile]);
  
  /**
   * Get XP needed for next level
   */
  const getXpToNextLevel = useCallback((): number => {
    return userProfile?.xpToNextLevel || 0;
  }, [userProfile]);
  
  /**
   * Get level progress percentage
   */
  const getLevelProgress = useCallback((): number => {
    if (!userProfile) return 0;
    
    const currentLevelXp = userProfile.xpPoints - userProfile.xpToNextLevel;
    const nextLevelXp = userProfile.xpPoints;
    
    if (nextLevelXp === currentLevelXp) return 100;
    
    return Math.min(100, Math.max(0, (currentLevelXp / nextLevelXp) * 100));
  }, [userProfile]);
  
  // ================================================================
  // EFFECTS
  // ================================================================
  
  /**
   * Initial data fetch
   */
  useEffect(() => {
    if (authUser || useMockData) {
      refreshDashboard();
    }
  }, [authUser, useMockData, refreshDashboard]);
  
  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      refreshIntervalRef.current = setInterval(() => {
        if (!isLoading) {
          refreshDashboard();
        }
      }, refreshInterval);
      
      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, isLoading, refreshDashboard]);
  
  /**
   * Real-time updates setup
   */
  useEffect(() => {
    if (enableRealTime && userProfile) {
      subscribeToUpdates();
    }
    
    return () => {
      unsubscribeFromUpdates();
    };
  }, [enableRealTime, userProfile, subscribeToUpdates, unsubscribeFromUpdates]);
  
  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      unsubscribeFromUpdates();
    };
  }, [unsubscribeFromUpdates]);
  
  // ================================================================
  // RETURN HOOK INTERFACE
  // ================================================================
  
  return {
    // Data
    dashboardData,
    userProfile,
    statistics,
    notifications,
    
    // Loading states
    isLoading,
    isLoadingProfile,
    isLoadingStats,
    
    // Error states
    error,
    profileError,
    statsError,
    
    // Actions
    refreshDashboard,
    refreshProfile,
    refreshStatistics,
    updatePreferences,
    markNotificationRead,
    markAllNotificationsRead,
    
    // Real-time updates
    subscribeToUpdates,
    unsubscribeFromUpdates,
    
    // Utility functions
    getCurrentLevel,
    getXpToNextLevel,
    getLevelProgress
  };
};

export default useGamificationData;
