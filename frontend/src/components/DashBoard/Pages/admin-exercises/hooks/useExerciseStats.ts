/**
 * useExerciseStats.ts
 * ===================
 * 
 * Custom hook for managing exercise statistics and analytics
 * Provides real-time data about exercise performance and user engagement
 * Designed by Seraphina, The Digital Alchemist
 * 
 * Features:
 * - Real-time exercise statistics
 * - User engagement metrics
 * - Performance analytics
 * - Trending exercise data
 * - Activity feed management
 * - Caching and optimization
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../../../../../context/AuthContext';

// === INTERFACES ===

interface ExerciseStats {
  totalExercises: number;
  totalVideos: number;
  activeUsers: number;
  avgQualityScore: number;
  totalViews: number;
  totalCompletions: number;
  engagementRate: number;
  popularityTrend: 'up' | 'down' | 'stable';
}

interface ExerciseUsage {
  exerciseId: string;
  exerciseName: string;
  views: number;
  completions: number;
  avgRating: number;
  lastUsed: string;
  trend: 'up' | 'down' | 'stable';
  completionRate: number;
}

interface ActivityItem {
  id: string;
  type: 'exercise_created' | 'video_uploaded' | 'user_completed' | 'achievement_earned' | 'milestone_reached';
  title: string;
  description: string;
  timestamp: string;
  metadata?: {
    exerciseId?: string;
    userId?: string;
    achievementId?: string;
    value?: number;
  };
  icon: string;
  priority: 'low' | 'medium' | 'high';
}

interface TrendingExercise {
  id: string;
  name: string;
  category: string;
  completions: number;
  views: number;
  rating: number;
  growthRate: number;
  isNew: boolean;
}

interface PerformanceMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  bounceRate: number;
  retentionRate: number;
}

interface UseExerciseStatsReturn {
  stats: ExerciseStats | null;
  topExercises: ExerciseUsage[];
  recentActivity: ActivityItem[];
  trendingExercises: TrendingExercise[];
  performanceMetrics: PerformanceMetrics | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
  
  // Actions
  refreshStats: () => Promise<void>;
  getExerciseAnalytics: (exerciseId: string) => Promise<any>;
  markActivityAsRead: (activityId: string) => void;
  exportStats: (format: 'csv' | 'json' | 'pdf') => Promise<void>;
}

// === MOCK DATA ===

const MOCK_EXERCISE_STATS: ExerciseStats = {
  totalExercises: 247,
  totalVideos: 189,
  activeUsers: 1247,
  avgQualityScore: 94.5,
  totalViews: 15420,
  totalCompletions: 8947,
  engagementRate: 78.5,
  popularityTrend: 'up'
};

const MOCK_TOP_EXERCISES: ExerciseUsage[] = [
  {
    exerciseId: 'ex_001',
    exerciseName: 'Push-up Progression',
    views: 1247,
    completions: 892,
    avgRating: 4.8,
    lastUsed: '2025-02-01T14:30:00Z',
    trend: 'up',
    completionRate: 71.5
  },
  {
    exerciseId: 'ex_002',
    exerciseName: 'Deadlift Form Check',
    views: 1089,
    completions: 743,
    avgRating: 4.9,
    lastUsed: '2025-02-01T13:45:00Z',
    trend: 'up',
    completionRate: 68.2
  },
  {
    exerciseId: 'ex_003',
    exerciseName: 'Core Stability Sequence',
    views: 987,
    completions: 654,
    avgRating: 4.7,
    lastUsed: '2025-02-01T12:15:00Z',
    trend: 'stable',
    completionRate: 66.3
  },
  {
    exerciseId: 'ex_004',
    exerciseName: 'Squat Technique Master',
    views: 876,
    completions: 589,
    avgRating: 4.6,
    lastUsed: '2025-02-01T11:20:00Z',
    trend: 'down',
    completionRate: 67.2
  },
  {
    exerciseId: 'ex_005',
    exerciseName: 'Shoulder Mobility Flow',
    views: 743,
    completions: 512,
    avgRating: 4.8,
    lastUsed: '2025-02-01T10:30:00Z',
    trend: 'up',
    completionRate: 68.9
  }
];

const MOCK_RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: 'act_001',
    type: 'exercise_created',
    title: 'New Exercise Created',
    description: 'Hip Flexor Stretch Sequence added to library',
    timestamp: '2025-02-01T14:30:00Z',
    metadata: { exerciseId: 'ex_106' },
    icon: '🏃‍♂️',
    priority: 'medium'
  },
  {
    id: 'act_002',
    type: 'milestone_reached',
    title: 'Milestone Achieved!',
    description: '1000+ users completed your exercises this week',
    timestamp: '2025-02-01T13:15:00Z',
    metadata: { value: 1000 },
    icon: '🎯',
    priority: 'high'
  },
  {
    id: 'act_003',
    type: 'video_uploaded',
    title: 'Video Demonstration Added',
    description: 'HD video uploaded for Plank Progression',
    timestamp: '2025-02-01T12:45:00Z',
    metadata: { exerciseId: 'ex_098' },
    icon: '🎬',
    priority: 'medium'
  },
  {
    id: 'act_004',
    type: 'achievement_earned',
    title: 'Achievement Unlocked',
    description: 'Video Master badge earned!',
    timestamp: '2025-02-01T11:30:00Z',
    metadata: { achievementId: 'video_master' },
    icon: '🏆',
    priority: 'high'
  },
  {
    id: 'act_005',
    type: 'user_completed',
    title: 'High Engagement',
    description: 'Sarah M. completed 5 exercises in a row',
    timestamp: '2025-02-01T10:15:00Z',
    metadata: { userId: 'user_456' },
    icon: '⭐',
    priority: 'low'
  }
];

const MOCK_TRENDING_EXERCISES: TrendingExercise[] = [
  {
    id: 'ex_trending_001',
    name: 'Functional Movement Screen',
    category: 'Assessment',
    completions: 342,
    views: 478,
    rating: 4.9,
    growthRate: 45.2,
    isNew: true
  },
  {
    id: 'ex_trending_002',
    name: 'Kettlebell Turkish Get-Up',
    category: 'Strength',
    completions: 289,
    views: 401,
    rating: 4.7,
    growthRate: 32.1,
    isNew: false
  },
  {
    id: 'ex_trending_003',
    name: 'Balance Challenge Series',
    category: 'Balance',
    completions: 267,
    views: 389,
    rating: 4.8,
    growthRate: 28.7,
    isNew: true
  }
];

const MOCK_PERFORMANCE_METRICS: PerformanceMetrics = {
  dailyActiveUsers: 247,
  weeklyActiveUsers: 1089,
  monthlyActiveUsers: 3421,
  avgSessionDuration: 18.5, // minutes
  bounceRate: 12.3, // percentage
  retentionRate: 87.6 // percentage
};

// === UTILITY FUNCTIONS ===

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

const getTrendDirection = (growthRate: number): 'up' | 'down' | 'stable' => {
  if (growthRate > 5) return 'up';
  if (growthRate < -5) return 'down';
  return 'stable';
};

const sortByPriority = (activities: ActivityItem[]): ActivityItem[] => {
  const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
  return activities.sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
};

// === CUSTOM HOOK ===

export const useExerciseStats = (): UseExerciseStatsReturn => {
  const { user } = useAuth();
  
  // State
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const [topExercises, setTopExercises] = useState<ExerciseUsage[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [trendingExercises, setTrendingExercises] = useState<TrendingExercise[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());
  
  // Cache management
  const getCachedData = useCallback((key: string, maxAge: number = 300000): any | null => {
    const cached = cacheRef.current.get(key);
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }
    return null;
  }, []);
  
  const setCachedData = useCallback((key: string, data: any): void => {
    cacheRef.current.set(key, { data, timestamp: Date.now() });
  }, []);
  
  // Fetch all stats
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Check cache first
      const cachedStats = getCachedData('exercise-stats', 60000); // 1 minute cache
      if (cachedStats) {
        setStats(cachedStats.stats);
        setTopExercises(cachedStats.topExercises);
        setRecentActivity(cachedStats.recentActivity);
        setTrendingExercises(cachedStats.trendingExercises);
        setPerformanceMetrics(cachedStats.performanceMetrics);
        setLastUpdated(cachedStats.lastUpdated);
        setIsLoading(false);
        return;
      }
      
      // TODO: Replace with actual API calls
      // const [statsRes, topExercisesRes, activityRes, trendingRes, metricsRes] = await Promise.all([
      //   fetch('/api/admin/exercises/stats'),
      //   fetch('/api/admin/exercises/top'),
      //   fetch('/api/admin/exercises/activity'),
      //   fetch('/api/admin/exercises/trending'),
      //   fetch('/api/admin/exercises/metrics')
      // ]);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use mock data for now
      const statsData = {
        stats: MOCK_EXERCISE_STATS,
        topExercises: MOCK_TOP_EXERCISES,
        recentActivity: sortByPriority(MOCK_RECENT_ACTIVITY),
        trendingExercises: MOCK_TRENDING_EXERCISES,
        performanceMetrics: MOCK_PERFORMANCE_METRICS,
        lastUpdated: new Date().toISOString()
      };
      
      // Update state
      setStats(statsData.stats);
      setTopExercises(statsData.topExercises);
      setRecentActivity(statsData.recentActivity);
      setTrendingExercises(statsData.trendingExercises);
      setPerformanceMetrics(statsData.performanceMetrics);
      setLastUpdated(statsData.lastUpdated);
      
      // Cache the data
      setCachedData('exercise-stats', statsData);
      
    } catch (err) {
      console.error('Failed to fetch exercise stats:', err);
      setError('Failed to load exercise statistics');
    } finally {
      setIsLoading(false);
    }
  }, [getCachedData, setCachedData]);
  
  // Refresh stats
  const refreshStats = useCallback(async () => {
    // Clear cache to force fresh data
    cacheRef.current.clear();
    await fetchStats();
  }, [fetchStats]);
  
  // Get specific exercise analytics
  const getExerciseAnalytics = useCallback(async (exerciseId: string) => {
    try {
      // Check cache first
      const cachedAnalytics = getCachedData(`exercise-analytics-${exerciseId}`, 300000); // 5 minute cache
      if (cachedAnalytics) {
        return cachedAnalytics;
      }
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/admin/exercises/${exerciseId}/analytics`);
      // const analytics = await response.json();
      
      // Mock analytics data
      const analytics = {
        exerciseId,
        views: Math.floor(Math.random() * 1000) + 100,
        completions: Math.floor(Math.random() * 500) + 50,
        avgRating: +(Math.random() * 2 + 3).toFixed(1), // 3.0 - 5.0
        completionRate: +(Math.random() * 30 + 60).toFixed(1), // 60% - 90%
        dailyViews: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          views: Math.floor(Math.random() * 50) + 10,
          completions: Math.floor(Math.random() * 25) + 5
        })),
        userFeedback: [
          { rating: 5, comment: 'Excellent form demonstration!', timestamp: '2025-02-01T10:00:00Z' },
          { rating: 4, comment: 'Very helpful, would like more variations', timestamp: '2025-01-31T15:30:00Z' },
          { rating: 5, comment: 'Perfect for beginners', timestamp: '2025-01-30T09:45:00Z' }
        ]
      };
      
      // Cache the analytics
      setCachedData(`exercise-analytics-${exerciseId}`, analytics);
      
      return analytics;
    } catch (err) {
      console.error('Failed to fetch exercise analytics:', err);
      throw err;
    }
  }, [getCachedData, setCachedData]);
  
  // Mark activity as read
  const markActivityAsRead = useCallback((activityId: string) => {
    setRecentActivity(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, priority: 'low' as const }
          : activity
      )
    );
  }, []);
  
  // Export stats
  const exportStats = useCallback(async (format: 'csv' | 'json' | 'pdf') => {
    try {
      const exportData = {
        stats,
        topExercises,
        performanceMetrics,
        exportedAt: new Date().toISOString(),
        exportedBy: user?.email || 'Unknown'
      };
      
      let content: string;
      let mimeType: string;
      let filename: string;
      
      switch (format) {
        case 'json':
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          filename = `exercise-stats-${new Date().toISOString().split('T')[0]}.json`;
          break;
          
        case 'csv':
          // Convert to CSV format
          const csvRows = [
            ['Exercise Name', 'Views', 'Completions', 'Rating', 'Completion Rate'],
            ...topExercises.map(ex => [
              ex.exerciseName,
              ex.views.toString(),
              ex.completions.toString(),
              ex.avgRating.toString(),
              ex.completionRate.toString()
            ])
          ];
          content = csvRows.map(row => row.join(',')).join('\n');
          mimeType = 'text/csv';
          filename = `exercise-stats-${new Date().toISOString().split('T')[0]}.csv`;
          break;
          
        case 'pdf':
          // For PDF, we'd need a PDF generation library
          // For now, just export as JSON
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          filename = `exercise-stats-${new Date().toISOString().split('T')[0]}.json`;
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      // Create and download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Failed to export stats:', err);
      throw err;
    }
  }, [stats, topExercises, performanceMetrics, user]);
  
  // Auto-refresh setup
  useEffect(() => {
    // Initial fetch
    fetchStats();
    
    // Set up auto-refresh every 5 minutes
    refreshIntervalRef.current = setInterval(() => {
      fetchStats();
    }, 5 * 60 * 1000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [fetchStats]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);
  
  return {
    stats,
    topExercises,
    recentActivity,
    trendingExercises,
    performanceMetrics,
    isLoading,
    error,
    lastUpdated,
    refreshStats,
    getExerciseAnalytics,
    markActivityAsRead,
    exportStats
  };
};

export default useExerciseStats;
