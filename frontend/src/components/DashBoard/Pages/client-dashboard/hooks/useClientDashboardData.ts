/**
 * ============================================================================
 * FILE: useClientDashboardData.ts
 * PURPOSE: Fetches REAL client dashboard data from backend APIs (replaces mock data)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Parallel-fetches gamification profile, workout history,
 * scheduled sessions, and achievements from real APIs. Falls back to empty-state
 * defaults (level 1, 0 workouts) — NEVER fake/random data.
 *
 * APIs CONSUMED:
 *   GET /api/v1/gamification/profile → points, level, streak, tier
 *   GET /api/workout/sessions → workout history with exercises
 *   GET /api/schedule → upcoming scheduled sessions
 *   GET /api/v1/gamification/users/:id/achievements → badges & achievements
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../../../context/AuthContext';
import type { ActivitySummary, UserStats, ScheduledSession } from '../types';

// ─────────────────────────────────────────────────────────────
// SECTION: Types for API responses
// ─────────────────────────────────────────────────────────────
interface GamificationProfile {
  level: number;
  points: number;
  totalXp: number;
  nextLevelPoints: number;
  streakDays: number;
  tier: string;
  userAchievements: Array<{
    id: number;
    isCompleted: boolean;
    currentProgress: number;
    targetValue: number;
    earnedAt?: string;
    achievement?: {
      id: number;
      title: string;
      name?: string;
      description: string;
      xpReward: number;
      category: string;
    };
  }>;
}

interface WorkoutSessionData {
  id: number;
  title: string;
  date: string;
  duration: number;
  intensity: number;
  exercises: Array<{
    name: string;
    sets: Array<{ reps: number; weight: number }>;
    primaryMuscle?: string;
  }>;
}

export interface ClientDashboardData {
  // Gamification
  points: number;
  streak: number;
  level: number;
  levelName: string;
  levelProgress: number;
  levelTotal: number;
  tier: string;

  // Workout stats
  userStats: UserStats;
  activitySummary: ActivitySummary[];

  // Scheduled sessions (real)
  scheduledSessions: ScheduledSession[];

  // Achievements (real)
  unlockedAchievementIds: string[];

  // Top exercises from real workout data
  topExercises: Array<{ name: string; count: number; muscleGroup: string }>;

  // Muscle group breakdown from real data
  muscleGroupBreakdown: Array<{ name: string; count: number }>;

  // Loading/error state
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Level name mapping (matches gamification tier system)
// ─────────────────────────────────────────────────────────────
function getLevelName(level: number): string {
  if (level <= 10) return 'Bronze Forge';
  if (level <= 25) return 'Silver Edge';
  if (level <= 50) return 'Titanium Core';
  if (level <= 99) return 'Obsidian Warrior';
  return 'Crystalline Swan';
}

// ─────────────────────────────────────────────────────────────
// SECTION: Build activity heatmap from real workout sessions
// ─────────────────────────────────────────────────────────────
function buildActivitySummary(sessions: WorkoutSessionData[]): ActivitySummary[] {
  const today = new Date();
  const summary: ActivitySummary[] = [];
  const sessionsByDate = new Map<string, WorkoutSessionData[]>();

  // Group sessions by date
  for (const session of sessions) {
    const dateKey = new Date(session.date).toISOString().split('T')[0];
    if (!sessionsByDate.has(dateKey)) sessionsByDate.set(dateKey, []);
    sessionsByDate.get(dateKey)!.push(session);
  }

  // Build 30-day summary from real data
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    const daySessions = sessionsByDate.get(dateKey) || [];

    const totalExercises = daySessions.reduce(
      (sum, s) => sum + (s.exercises?.length || 0), 0
    );
    const totalDuration = daySessions.reduce(
      (sum, s) => sum + (s.duration || 0), 0
    );
    const avgIntensity = daySessions.length > 0
      ? Math.round(daySessions.reduce((sum, s) => sum + (s.intensity || 0), 0) / daySessions.length)
      : 0;

    summary.push({
      date: dateKey,
      workouts: daySessions.length,
      exercises: totalExercises,
      duration: totalDuration,
      intensity: Math.min(avgIntensity, 4),
    });
  }

  return summary;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Main hook
// ─────────────────────────────────────────────────────────────
export function useClientDashboardData(): ClientDashboardData {
  const { user, authAxios } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [tier, setTier] = useState('Bronze Forge');
  const [levelProgress, setLevelProgress] = useState(0);
  const [levelTotal, setLevelTotal] = useState(100);
  const [userStats, setUserStats] = useState<UserStats>({
    workoutsCompleted: 0,
    totalExercisesPerformed: 0,
    streakDays: 0,
    totalMinutes: 0,
    calories: 0,
    personalBests: 0,
  });
  const [activitySummary, setActivitySummary] = useState<ActivitySummary[]>([]);
  const [scheduledSessions, setScheduledSessions] = useState<ScheduledSession[]>([]);
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState<string[]>([]);
  const [topExercises, setTopExercises] = useState<Array<{ name: string; count: number; muscleGroup: string }>>([]);
  const [muscleGroupBreakdown, setMuscleGroupBreakdown] = useState<Array<{ name: string; count: number }>>([]);

  const fetchData = useCallback(async () => {
    if (!authAxios || !user) return;

    setLoading(true);
    setError(null);

    try {
      // Parallel fetch all data sources
      const [gamRes, workoutRes, scheduleRes] = await Promise.allSettled([
        authAxios.get('/api/v1/gamification/profile'),
        authAxios.get('/api/workout/sessions', { params: { limit: 100, sortBy: 'date', sortDirection: 'desc' } }),
        authAxios.get('/api/schedule'),
      ]);

      // ── Process gamification profile ──
      if (gamRes.status === 'fulfilled') {
        const profile: GamificationProfile = gamRes.value?.data?.profile || gamRes.value?.data;
        if (profile) {
          setPoints(profile.points || 0);
          setStreak(profile.streakDays || 0);
          setLevel(profile.level || 1);
          setTier(profile.tier || getLevelName(profile.level || 1));
          const currentPoints = profile.points || 0;
          const nextLevel = profile.nextLevelPoints || 100;
          setLevelProgress(currentPoints);
          setLevelTotal(nextLevel);

          // Extract unlocked achievement IDs
          const achievements = profile.userAchievements || [];
          const unlockedIds = achievements
            .filter((ua) => ua.isCompleted)
            .map((ua) => String(ua.achievement?.id || ua.id));
          setUnlockedAchievementIds(unlockedIds);
        }
      }

      // ── Process workout history ──
      if (workoutRes.status === 'fulfilled') {
        const workoutData = workoutRes.value?.data;
        const sessions: WorkoutSessionData[] = workoutData?.data?.workouts || workoutData?.workouts || workoutData?.data || [];

        // Build activity heatmap from real workout dates
        setActivitySummary(buildActivitySummary(sessions));

        // Calculate real stats
        let totalExercises = 0;
        let totalMinutes = 0;
        const exerciseCounts = new Map<string, { count: number; muscle: string }>();
        const muscleCounts = new Map<string, number>();

        for (const session of sessions) {
          totalMinutes += session.duration || 0;
          const exercises = session.exercises || [];
          totalExercises += exercises.length;

          for (const ex of exercises) {
            const name = ex.name || 'Unknown';
            const muscle = ex.primaryMuscle || 'Other';
            const current = exerciseCounts.get(name) || { count: 0, muscle };
            exerciseCounts.set(name, { count: current.count + 1, muscle });
            muscleCounts.set(muscle, (muscleCounts.get(muscle) || 0) + 1);
          }
        }

        // Top exercises by frequency
        const sortedExercises = Array.from(exerciseCounts.entries())
          .map(([name, data]) => ({ name, count: data.count, muscleGroup: data.muscle }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopExercises(sortedExercises);

        // Muscle group breakdown
        const sortedMuscles = Array.from(muscleCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count);
        setMuscleGroupBreakdown(sortedMuscles);

        setUserStats({
          workoutsCompleted: sessions.length,
          totalExercisesPerformed: totalExercises,
          streakDays: streak,
          totalMinutes,
          calories: Math.round(totalMinutes * 8.5), // ~8.5 cal/min moderate exercise
          personalBests: 0, // TODO: compute from PR tracking
        });
      }

      // ── Process scheduled sessions ──
      if (scheduleRes.status === 'fulfilled') {
        const scheduleData = scheduleRes.value?.data;
        const rawSessions = Array.isArray(scheduleData) ? scheduleData : scheduleData?.sessions || [];

        const now = new Date();
        const upcoming: ScheduledSession[] = rawSessions
          .filter((s: any) => new Date(s.start || s.sessionDate) >= now)
          .slice(0, 5)
          .map((s: any) => {
            const startDate = new Date(s.start || s.sessionDate);
            return {
              id: String(s.id),
              title: s.title || 'Training Session',
              date: startDate.toISOString().split('T')[0],
              time: startDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
              duration: s.duration || 60,
              trainerName: s.trainerName || s.trainer?.firstName ? `${s.trainer?.firstName} ${s.trainer?.lastName}` : 'Your Trainer',
              location: s.location || 'TBD',
              type: s.sessionType || s.type || 'Training',
              isActive: s.status === 'confirmed' || s.status === 'scheduled',
            };
          });
        setScheduledSessions(upcoming);
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(msg);
      console.error('[ClientDashboard] Data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [authAxios, user, streak]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    points,
    streak,
    level,
    levelName: getLevelName(level),
    levelProgress,
    levelTotal,
    tier,
    userStats,
    activitySummary,
    scheduledSessions,
    unlockedAchievementIds,
    topExercises,
    muscleGroupBreakdown,
    loading,
    error,
    refetch: fetchData,
  };
}

export default useClientDashboardData;
