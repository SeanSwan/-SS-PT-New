/**
 * useEnhancedClientDashboard Hook
 * ===============================
 * 
 * Revolutionary React hook that provides real-time data integration
 * for the SwanStudios Client Dashboard with MCP server connectivity.
 * 
 * Features:
 * - Real-time WebSocket integration
 * - MCP server data synchronization
 * - Automatic error handling and retry logic
 * - Performance optimized with caching
 * - TypeScript fully typed
 * 
 * Master Prompt v28 Alignment:
 * - Backend architecture integration
 * - Real-time data flow
 * - Error handling and resilience
 * - Performance optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import clientDashboardService, {
  SessionEvent,
  GamificationData,
  ClientDashboardData,
  DashboardStats,
} from '../services/enhancedClientDashboardService';

// === TYPES ===
interface UseEnhancedClientDashboardReturn {
  // Data
  sessions: SessionEvent[];
  gamificationData: GamificationData | null;
  stats: DashboardStats | null;
  notifications: Notification[];
  
  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  sessionsLoading: boolean;
  gamificationLoading: boolean;
  
  // Error states
  error: string | null;
  sessionsError: string | null;
  gamificationError: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  refreshGamification: () => Promise<void>;
  bookSession: (sessionId: string) => Promise<void>;
  cancelSession: (sessionId: string) => Promise<void>;
  recordWorkout: (workoutData: WorkoutCompletionData) => Promise<void>;
  
  // Real-time connection status
  isConnected: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

interface WorkoutCompletionData {
  workoutId: string;
  duration: number;
  exercisesCompleted: number;
  caloriesBurned?: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

// === CACHE CONFIGURATION ===
const CACHE_DURATION = {
  sessions: 2 * 60 * 1000, // 2 minutes
  gamification: 5 * 60 * 1000, // 5 minutes
  stats: 10 * 60 * 1000, // 10 minutes
} as const;

// === CACHE MANAGER ===
class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, duration: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + duration,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// === MAIN HOOK ===
export const useEnhancedClientDashboard = (): UseEnhancedClientDashboardReturn => {
  // === AUTH CONTEXT ===
  const { user } = useAuth();
  
  // === STATE ===
  const [sessions, setSessions] = useState<SessionEvent[]>([]);
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [gamificationLoading, setGamificationLoading] = useState(false);
  
  // Error states
  const [error, setError] = useState<string | null>(null);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [gamificationError, setGamificationError] = useState<string | null>(null);
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // === REFS ===
  const cacheRef = useRef(new DashboardCache());
  const initializationAttempts = useRef(0);
  const maxInitializationAttempts = 3;
  
  // === CACHE HELPERS ===
  const getCacheKey = useCallback((type: string, userId?: string) => {
    return `${type}_${userId || user?.id || 'anonymous'}`;
  }, [user?.id]);

  // === DATA FETCHERS ===
  const fetchSessions = useCallback(async (useCache = true): Promise<SessionEvent[]> => {
    const cacheKey = getCacheKey('sessions');
    
    if (useCache) {
      const cached = cacheRef.current.get<SessionEvent[]>(cacheKey);
      if (cached) {
        console.log('📦 Using cached sessions data');
        return cached;
      }
    }
    
    setSessionsLoading(true);
    setSessionsError(null);
    
    try {
      const sessionsData = await clientDashboardService.getSessions({
        userId: user?.id,
        includeUpcoming: true,
      });
      
      cacheRef.current.set(cacheKey, sessionsData, CACHE_DURATION.sessions);
      setSessionsError(null);
      
      console.log('✅ Sessions fetched successfully:', sessionsData.length);
      return sessionsData;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch sessions';
      console.error('❌ Error fetching sessions:', errorMessage);
      setSessionsError(errorMessage);
      return [];
    } finally {
      setSessionsLoading(false);
    }
  }, [user?.id, getCacheKey]);

  const fetchGamificationData = useCallback(async (useCache = true): Promise<GamificationData | null> => {
    if (!user?.id) return null;
    
    const cacheKey = getCacheKey('gamification');
    
    if (useCache) {
      const cached = cacheRef.current.get<GamificationData>(cacheKey);
      if (cached) {
        console.log('📦 Using cached gamification data');
        return cached;
      }
    }
    
    setGamificationLoading(true);
    setGamificationError(null);
    
    try {
      const gamificationInfo = await clientDashboardService.getGamificationData(user.id);
      
      cacheRef.current.set(cacheKey, gamificationInfo, CACHE_DURATION.gamification);
      setGamificationError(null);
      
      console.log('✅ Gamification data fetched successfully:', gamificationInfo);
      return gamificationInfo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch gamification data';
      console.error('❌ Error fetching gamification data:', errorMessage);
      setGamificationError(errorMessage);
      return null;
    } finally {
      setGamificationLoading(false);
    }
  }, [user?.id, getCacheKey]);

  const fetchStats = useCallback(async (useCache = true): Promise<DashboardStats | null> => {
    const cacheKey = getCacheKey('stats');
    
    if (useCache) {
      const cached = cacheRef.current.get<DashboardStats>(cacheKey);
      if (cached) {
        console.log('📦 Using cached stats data');
        return cached;
      }
    }
    
    try {
      const statsData = await clientDashboardService.getDashboardStats();
      cacheRef.current.set(cacheKey, statsData, CACHE_DURATION.stats);
      
      console.log('✅ Stats fetched successfully:', statsData);
      return statsData;
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      return null;
    }
  }, [getCacheKey]);

  // === INITIALIZATION ===
  const initializeDashboard = useCallback(async () => {
    if (!user?.id) {
      console.log('⏳ Waiting for user authentication...');
      return;
    }

    if (initializationAttempts.current >= maxInitializationAttempts) {
      console.error('❌ Max initialization attempts reached');
      setError('Failed to initialize dashboard after multiple attempts');
      setIsInitializing(false);
      setIsLoading(false);
      return;
    }

    initializationAttempts.current++;
    console.log(`🚀 Initializing Enhanced Client Dashboard (attempt ${initializationAttempts.current}/${maxInitializationAttempts})...`);
    
    setIsInitializing(true);
    setIsLoading(true);
    setError(null);
    setConnectionStatus('connecting');

    try {
      // Initialize the service (WebSocket is optional)
      await clientDashboardService.initialize(user.id);
      
      // Check if WebSocket is actually connected
      const socket = clientDashboardService.wsManager?.getSocket();
      if (socket && socket.connected) {
        setIsConnected(true);
        setConnectionStatus('connected');
        console.log('✅ Service initialized with real-time features');
      } else {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        console.log('✅ Service initialized in polling mode (no real-time features)');
      }

      // Fetch initial data in parallel for better performance
      const [sessionsData, gamificationInfo, statsData, notificationsData] = await Promise.allSettled([
        fetchSessions(false), // Don't use cache on initial load
        fetchGamificationData(false),
        fetchStats(false),
        clientDashboardService.getNotifications(),
      ]);

      // Update state with fetched data
      if (sessionsData.status === 'fulfilled') {
        setSessions(sessionsData.value);
      }
      
      if (gamificationInfo.status === 'fulfilled') {
        setGamificationData(gamificationInfo.value);
      }
      
      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      }
      
      if (notificationsData.status === 'fulfilled') {
        setNotifications(notificationsData.value);
      }

      setError(null);
      console.log('🎉 Dashboard initialization completed successfully');
      
      // Set up polling for data refresh if no WebSocket
      if (!socket || !socket.connected) {
        console.log('📡 Setting up polling mode for data refresh');
        const pollingInterval = setInterval(async () => {
          console.log('🔄 Polling for data updates...');
          try {
            const [newSessions, newGamification, newStats] = await Promise.allSettled([
              fetchSessions(false),
              fetchGamificationData(false),
              fetchStats(false),
            ]);
            
            if (newSessions.status === 'fulfilled') setSessions(newSessions.value);
            if (newGamification.status === 'fulfilled') setGamificationData(newGamification.value);
            if (newStats.status === 'fulfilled') setStats(newStats.value);
          } catch (pollingError) {
            console.log('⚠️ Polling update failed:', pollingError);
          }
        }, 30000); // Poll every 30 seconds
        
        // Store interval reference for cleanup
        return () => clearInterval(pollingInterval);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize dashboard';
      console.error('❌ Dashboard initialization failed:', errorMessage);
      setError(errorMessage);
      setIsConnected(false);
      setConnectionStatus('error');
      
      // Retry initialization after a delay (but not indefinitely)
      if (initializationAttempts.current < maxInitializationAttempts) {
        setTimeout(() => {
          initializeDashboard();
        }, 3000 * initializationAttempts.current);
      }
    } finally {
      setIsInitializing(false);
      setIsLoading(false);
    }
  }, [user?.id, fetchSessions, fetchGamificationData, fetchStats]);

  // === REAL-TIME EVENT HANDLERS ===
  useEffect(() => {
    // Only set up real-time event listeners if WebSocket is connected
    if (!isConnected) {
      console.log('📡 WebSocket not connected - skipping real-time event listeners');
      return;
    }

    console.log('🔗 Setting up real-time event listeners');
    
    // Set up real-time event listeners
    const handleXpUpdate = (event: CustomEvent) => {
      console.log('🎯 Real-time XP update received:', event.detail);
      // Invalidate gamification cache and refresh
      cacheRef.current.invalidate(getCacheKey('gamification'));
      fetchGamificationData(false);
    };

    const handleBadgeEarned = (event: CustomEvent) => {
      console.log('🏆 Real-time badge earned:', event.detail);
      cacheRef.current.invalidate(getCacheKey('gamification'));
      fetchGamificationData(false);
    };

    const handleLevelUp = (event: CustomEvent) => {
      console.log('⬆️ Real-time level up:', event.detail);
      cacheRef.current.invalidate(getCacheKey('gamification'));
      fetchGamificationData(false);
    };

    const handleSessionUpdate = (event: CustomEvent) => {
      console.log('📅 Real-time session update:', event.detail);
      cacheRef.current.invalidate(getCacheKey('sessions'));
      fetchSessions(false);
    };

    const handleNewNotification = (event: CustomEvent) => {
      console.log('🔔 Real-time notification:', event.detail);
      setNotifications(prev => [event.detail, ...prev]);
    };

    // Add event listeners
    window.addEventListener('gamification:xp_updated', handleXpUpdate as EventListener);
    window.addEventListener('gamification:badge_earned', handleBadgeEarned as EventListener);
    window.addEventListener('gamification:level_up', handleLevelUp as EventListener);
    window.addEventListener('schedule:session_booked', handleSessionUpdate as EventListener);
    window.addEventListener('schedule:session_cancelled', handleSessionUpdate as EventListener);
    window.addEventListener('schedule:session_confirmed', handleSessionUpdate as EventListener);
    window.addEventListener('notifications:new', handleNewNotification as EventListener);

    return () => {
      // Cleanup event listeners
      console.log('🧹 Cleaning up real-time event listeners');
      window.removeEventListener('gamification:xp_updated', handleXpUpdate as EventListener);
      window.removeEventListener('gamification:badge_earned', handleBadgeEarned as EventListener);
      window.removeEventListener('gamification:level_up', handleLevelUp as EventListener);
      window.removeEventListener('schedule:session_booked', handleSessionUpdate as EventListener);
      window.removeEventListener('schedule:session_cancelled', handleSessionUpdate as EventListener);
      window.removeEventListener('schedule:session_confirmed', handleSessionUpdate as EventListener);
      window.removeEventListener('notifications:new', handleNewNotification as EventListener);
    };
  }, [isConnected, getCacheKey, fetchGamificationData, fetchSessions]);

  // === INITIALIZATION EFFECT ===
  useEffect(() => {
    const cleanup = initializeDashboard();
    return () => {
      // Cleanup polling if it was set up
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [initializeDashboard]);

  // === CLEANUP EFFECT ===
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up Enhanced Client Dashboard');
      clientDashboardService.cleanup();
      cacheRef.current.clear();
    };
  }, []);

  // === ACTION METHODS ===
  const refreshData = useCallback(async () => {
    console.log('🔄 Refreshing all dashboard data...');
    setIsLoading(true);
    setError(null);
    
    try {
      const [sessionsData, gamificationInfo, statsData, notificationsData] = await Promise.allSettled([
        fetchSessions(false),
        fetchGamificationData(false),
        fetchStats(false),
        clientDashboardService.getNotifications(),
      ]);

      if (sessionsData.status === 'fulfilled') setSessions(sessionsData.value);
      if (gamificationInfo.status === 'fulfilled') setGamificationData(gamificationInfo.value);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (notificationsData.status === 'fulfilled') setNotifications(notificationsData.value);
      
      console.log('✅ All data refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh data';
      console.error('❌ Error refreshing data:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchSessions, fetchGamificationData, fetchStats]);

  const refreshSessions = useCallback(async () => {
    const sessionsData = await fetchSessions(false);
    setSessions(sessionsData);
  }, [fetchSessions]);

  const refreshGamification = useCallback(async () => {
    const gamificationInfo = await fetchGamificationData(false);
    setGamificationData(gamificationInfo);
  }, [fetchGamificationData]);

  const bookSession = useCallback(async (sessionId: string) => {
    try {
      await clientDashboardService.bookSession(sessionId);
      // Refresh sessions after booking
      await refreshSessions();
      console.log('✅ Session booked successfully');
    } catch (err) {
      console.error('❌ Error booking session:', err);
      throw err;
    }
  }, [refreshSessions]);

  const cancelSession = useCallback(async (sessionId: string) => {
    try {
      await clientDashboardService.cancelSession(sessionId);
      // Refresh sessions after cancellation
      await refreshSessions();
      console.log('✅ Session cancelled successfully');
    } catch (err) {
      console.error('❌ Error cancelling session:', err);
      throw err;
    }
  }, [refreshSessions]);

  const recordWorkout = useCallback(async (workoutData: WorkoutCompletionData) => {
    try {
      const updatedGamification = await clientDashboardService.recordWorkoutCompletion(workoutData);
      setGamificationData(updatedGamification);
      
      // Invalidate and refresh stats
      cacheRef.current.invalidate(getCacheKey('stats'));
      const newStats = await fetchStats(false);
      setStats(newStats);
      
      console.log('✅ Workout recorded successfully');
    } catch (err) {
      console.error('❌ Error recording workout:', err);
      throw err;
    }
  }, [getCacheKey, fetchStats]);

  // === RETURN HOOK DATA ===
  return {
    // Data
    sessions,
    gamificationData,
    stats,
    notifications,
    
    // Loading states
    isLoading,
    isInitializing,
    sessionsLoading,
    gamificationLoading,
    
    // Error states
    error,
    sessionsError,
    gamificationError,
    
    // Actions
    refreshData,
    refreshSessions,
    refreshGamification,
    bookSession,
    cancelSession,
    recordWorkout,
    
    // Connection status
    isConnected,
    connectionStatus,
  };
};

export default useEnhancedClientDashboard;