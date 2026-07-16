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
import { useAuth } from '../../../../../context/AuthContext';
import { addAutoTable } from '../../../../../services/pdfAutoTable';

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

type RawExerciseRecord = Record<string, any>;

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const unwrapExerciseArray = (payload: any): RawExerciseRecord[] => {
  const rawExercises = payload?.exercises ?? payload?.data?.exercises ?? payload ?? [];
  return Array.isArray(rawExercises) ? rawExercises : [];
};

const getExerciseIdentifier = (exercise: RawExerciseRecord, index: number): string => (
  String(exercise.id ?? exercise.exerciseId ?? exercise.exerciseKey ?? `exercise-${index}`)
);

const getExerciseName = (exercise: RawExerciseRecord): string => (
  String(exercise.name ?? exercise.exerciseName ?? 'Unnamed Exercise')
);

const buildExerciseUsageFromRecord = (exercise: RawExerciseRecord, index = 0): ExerciseUsage => {
  const stats = exercise.stats ?? {};
  const views = toNumber(exercise.views ?? stats.views);
  const completions = toNumber(exercise.completions ?? stats.completions);
  const previousViews = toNumber(exercise.previousViews ?? stats.previousViews, views);
  const completionRate = views > 0 ? Math.round((completions / views) * 1000) / 10 : 0;
  const growthRate = calculateGrowthRate(views, previousViews);

  return {
    exerciseId: getExerciseIdentifier(exercise, index),
    exerciseName: getExerciseName(exercise),
    views,
    completions,
    avgRating: toNumber(exercise.avgRating ?? exercise.rating ?? stats.avgRating),
    lastUsed: String(exercise.lastUsed ?? exercise.updatedAt ?? exercise.createdAt ?? new Date().toISOString()),
    trend: getTrendDirection(growthRate),
    completionRate
  };
};

const buildExerciseStatsFromLibrary = (exercises: RawExerciseRecord[]) => {
  const usageRows = exercises.map(buildExerciseUsageFromRecord);
  const topExercises = usageRows
    .sort((a, b) => (
      b.views - a.views ||
      b.completions - a.completions ||
      a.exerciseName.localeCompare(b.exerciseName)
    ))
    .slice(0, 5);
  const totalViews = usageRows.reduce((total, exercise) => total + exercise.views, 0);
  const totalCompletions = usageRows.reduce((total, exercise) => total + exercise.completions, 0);
  const scoredExercises = exercises
    .map(exercise => toNumber(exercise.nasmScore ?? exercise.qualityScore ?? exercise.stats?.qualityScore))
    .filter(score => score > 0);
  const datedExercises = exercises.filter(exercise => exercise.createdAt || exercise.updatedAt);
  const averageQualityScore = scoredExercises.length > 0
    ? Math.round((scoredExercises.reduce((total, score) => total + score, 0) / scoredExercises.length) * 10) / 10
    : 0;

  return {
    stats: {
      totalExercises: exercises.length,
      totalVideos: exercises.filter(exercise => exercise.videoUrl || exercise.video_url || exercise.mediaUrl).length,
      activeUsers: exercises.reduce(
        (total, exercise) => total + toNumber(exercise.activeUsers ?? exercise.stats?.activeUsers),
        0
      ),
      avgQualityScore: averageQualityScore,
      totalViews,
      totalCompletions,
      engagementRate: totalViews > 0 ? Math.round((totalCompletions / totalViews) * 1000) / 10 : 0,
      popularityTrend: 'stable' as const
    },
    topExercises,
    recentActivity: sortByPriority(datedExercises.slice(0, 10).map((exercise, index): ActivityItem => ({
      id: `exercise-${getExerciseIdentifier(exercise, index)}-${index}`,
      type: exercise.videoUrl || exercise.video_url ? 'video_uploaded' : 'exercise_created',
      title: exercise.videoUrl || exercise.video_url ? 'Exercise Video Available' : 'Exercise Available',
      description: getExerciseName(exercise),
      timestamp: String(exercise.updatedAt ?? exercise.createdAt),
      metadata: { exerciseId: getExerciseIdentifier(exercise, index) },
      icon: exercise.videoUrl || exercise.video_url ? 'video' : 'exercise',
      priority: 'low'
    }))),
    trendingExercises: topExercises.slice(0, 3).map((exercise, index): TrendingExercise => ({
      id: exercise.exerciseId,
      name: exercise.exerciseName,
      category: String(exercises[index]?.exerciseType ?? exercises[index]?.category ?? 'General'),
      completions: exercise.completions,
      views: exercise.views,
      rating: exercise.avgRating,
      growthRate: 0,
      isNew: false
    })),
    performanceMetrics: {
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      avgSessionDuration: 0,
      bounceRate: 0,
      retentionRate: 0
    },
    lastUpdated: new Date().toISOString()
  };
};

const buildExerciseAnalyticsFromRecord = (exercise: RawExerciseRecord, exerciseId: string) => {
  const usage = buildExerciseUsageFromRecord({ ...exercise, id: exerciseId });

  return {
    exerciseId,
    views: usage.views,
    completions: usage.completions,
    avgRating: usage.avgRating,
    completionRate: usage.completionRate,
    dailyViews: [],
    userFeedback: []
  };
};

// === CUSTOM HOOK ===

export const useExerciseStats = (): UseExerciseStatsReturn => {
  const { user, authAxios } = useAuth();
  
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
      
      const response = await authAxios.get('/api/exercises/all');
      const statsData = buildExerciseStatsFromLibrary(unwrapExerciseArray(response.data));
      
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
  }, [authAxios, getCachedData, setCachedData]);
  
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
      
      const response = await authAxios.get(`/api/exercises/${exerciseId}`);
      const exercise = response.data?.exercise ?? response.data?.data ?? response.data ?? {};
      const analytics = buildExerciseAnalyticsFromRecord(exercise, exerciseId);
      
      // Cache the analytics
      setCachedData(`exercise-analytics-${exerciseId}`, analytics);
      
      return analytics;
    } catch (err) {
      console.error('Failed to fetch exercise analytics:', err);
      throw err;
    }
  }, [authAxios, getCachedData, setCachedData]);
  
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
          
        case 'pdf': {
          const { jsPDF } = await import('jspdf');
          const doc = new jsPDF({ unit: 'mm', format: 'a4' });

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.text('SwanStudios Exercise Stats', 14, 18);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(`Exported ${new Date().toLocaleString()}`, 14, 25);

          addAutoTable(doc, {
            startY: 32,
            head: [['Exercise Name', 'Views', 'Completions', 'Rating', 'Completion Rate']],
            body: topExercises.map(ex => [
              ex.exerciseName,
              ex.views.toString(),
              ex.completions.toString(),
              ex.avgRating.toString(),
              `${ex.completionRate.toFixed(1)}%`
            ]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [0, 32, 96], textColor: [255, 255, 255] }
          });
          doc.save(`exercise-stats-${new Date().toISOString().split('T')[0]}.pdf`);
          return;
        }
          
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
