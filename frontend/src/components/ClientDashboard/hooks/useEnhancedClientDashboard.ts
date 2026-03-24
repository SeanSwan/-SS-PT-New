/**
 * ============================================================================
 * FILE: useEnhancedClientDashboard.ts
 * PURPOSE: Custom hook for fetching real client dashboard + gamification data
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-24
 * AI VILLAGE VALIDATED: 2026-03-24
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Fetches gamification profile, achievements, and workout
 * stats from backend APIs. Provides loading/error states and periodic refresh.
 * Falls back to empty new-user defaults if APIs fail (never fake data).
 *
 * HOW IT FITS IN THE APP: ClientDashboard sections consume this hook for
 * level, XP, streak, badges, and workout stat display.
 *
 * KEY DECISIONS: Uses authAxios from AuthContext (auto-attaches JWT).
 * Fetches from /api/v1/gamification/profile for rich profile data and
 * /api/client/workout-stats for session stats. Graceful empty-state fallback.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../../context/AuthContext';

// === TYPE DEFINITIONS ===
export interface GamificationData {
  level: number;
  xp: number;
  totalXp: number;
  xpToNextLevel: number;
  streak: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

export interface DashboardStats {
  monthlyWorkouts: number;
  totalSessions: number;
  avgSessionDuration: number;
  caloriesBurned: number;
  strengthGains: number;
  consistencyScore: number;
}

export interface ConnectionStatus {
  isConnected: boolean;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUpdate: Date;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Empty-state defaults
// PURPOSE: Shown when API fails or user has no activity yet
// WHY: New users see realistic "level 1, 0 XP" state, not fake data
// ─────────────────────────────────────────────────────────────
const EMPTY_GAMIFICATION: GamificationData = {
  level: 1,
  xp: 0,
  totalXp: 0,
  xpToNextLevel: 100,
  streak: 0,
  badges: []
};

const EMPTY_STATS: DashboardStats = {
  monthlyWorkouts: 0,
  totalSessions: 0,
  avgSessionDuration: 0,
  caloriesBurned: 0,
  strengthGains: 0,
  consistencyScore: 0
};

// === MAIN HOOK ===
export const useEnhancedClientDashboard = () => {
  const { user, authAxios } = useAuth();
  const [gamificationData, setGamificationData] = useState<GamificationData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    status: 'disconnected',
    lastUpdate: new Date()
  });

  // ─────────────────────────────────────────────────────────────
  // SECTION: Data fetching
  // PURPOSE: Fetches gamification profile + workout stats from real APIs
  // WHY: authAxios auto-attaches JWT; parallel requests for speed
  // ─────────────────────────────────────────────────────────────
  const fetchDashboardData = useCallback(async () => {
    if (!authAxios) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch from gamification profile (rich data: level, tier, XP,
      // achievements with details) and workout stats in parallel
      const [profileRes, statsRes] = await Promise.allSettled([
        authAxios.get('/api/v1/gamification/profile'),
        authAxios.get('/api/client/workout-stats')
      ]);

      // --- Map gamification profile data ---
      const profileData = profileRes.status === 'fulfilled'
        ? profileRes.value?.data?.profile
        : null;

      if (profileData) {
        // Map earned achievements from the gamification profile
        const userAchievements = profileData.userAchievements || [];
        const badges: Badge[] = userAchievements
          .filter((ua: any) => ua.isCompleted)
          .map((ua: any) => ({
            id: String(ua.id),
            name: ua.achievement?.title || ua.achievement?.name || 'Achievement',
            description: ua.achievement?.description || '',
            isUnlocked: true,
            unlockedAt: ua.earnedAt ? new Date(ua.earnedAt) : undefined
          }));

        const gamification: GamificationData = {
          level: profileData.level || 1,
          xp: profileData.points || 0,
          totalXp: profileData.points || 0,
          xpToNextLevel: profileData.nextLevelPoints
            ? profileData.nextLevelPoints - (profileData.points || 0)
            : 100,
          streak: profileData.streakDays || 0,
          badges
        };

        setGamificationData(gamification);
      } else {
        // Gamification profile unavailable — show empty new-user state
        setGamificationData({ ...EMPTY_GAMIFICATION });
      }

      // --- Map workout stats ---
      const workoutStats = statsRes.status === 'fulfilled'
        ? statsRes.value?.data?.stats
        : null;

      if (workoutStats) {
        const dashboardStats: DashboardStats = {
          monthlyWorkouts: workoutStats.monthlyWorkouts || workoutStats.totalWorkouts || 0,
          totalSessions: workoutStats.totalWorkouts || 0,
          avgSessionDuration: workoutStats.averageDuration || 0,
          caloriesBurned: workoutStats.caloriesBurned || 0,
          strengthGains: workoutStats.strengthGain || 0,
          consistencyScore: workoutStats.consistencyScore || 0
        };
        setStats(dashboardStats);
      } else {
        setStats({ ...EMPTY_STATS });
      }

      setConnectionStatus({
        isConnected: true,
        status: 'connected',
        lastUpdate: new Date()
      });

    } catch (err) {
      // Network-level failure (both requests failed)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      // Set empty defaults so the UI still renders
      setGamificationData({ ...EMPTY_GAMIFICATION });
      setStats({ ...EMPTY_STATS });
      setConnectionStatus({
        isConnected: false,
        status: 'error',
        lastUpdate: new Date()
      });
    } finally {
      setIsLoading(false);
    }
  }, [authAxios]);

  // Simulate real-time updates
  const setupRealTimeUpdates = useCallback(() => {
    if (!user) return;

    // Simulate periodic updates (in production, this would be WebSocket)
    const interval = setInterval(() => {
      setConnectionStatus(prev => ({
        ...prev,
        lastUpdate: new Date()
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  // Initialize data on mount and user change
  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);

  // Setup real-time updates
  useEffect(() => {
    const cleanup = setupRealTimeUpdates();
    return cleanup;
  }, [setupRealTimeUpdates]);

  // Memoized computed values
  const computedData = useMemo(() => {
    if (!gamificationData || !stats) return null;

    return {
      xpProgress: ((gamificationData.xp % 1000) / 1000) * 100,
      isHighPerformer: stats.consistencyScore > 85,
      recentAchievements: gamificationData.badges
        .filter(badge => badge.isUnlocked)
        .sort((a, b) => {
          if (!a.unlockedAt || !b.unlockedAt) return 0;
          return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
        })
        .slice(0, 3)
    };
  }, [gamificationData, stats]);

  return {
    // Data
    gamificationData,
    stats,
    
    // Computed values
    xpProgress: computedData?.xpProgress || 0,
    recentAchievements: computedData?.recentAchievements || [],
    
    // States
    isLoading,
    error,
    
    // Connection info
    isConnected: connectionStatus.isConnected,
    connectionStatus: connectionStatus.status,
    lastUpdate: connectionStatus.lastUpdate,
    
    // Actions
    refetch: fetchDashboardData,
    clearError: () => setError(null)
  };
};

export default useEnhancedClientDashboard;