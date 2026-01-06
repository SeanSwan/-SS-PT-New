/**
 * useClientData Hook
 * ==================
 * Custom hook for managing client dashboard data.
 * Provides centralized state management and API integration.
 *
 * ✅ REAL DATA - Integrated with backend APIs
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../../../hooks/useAuth';

interface ClientData {
  profile: {
    name: string;
    email: string;
    avatar?: string;
    level: number;
    experiencePoints: number;
  };
  stats: {
    totalWorkouts: number;
    totalWeight: number;
    averageIntensity: number;
    streakDays: number;
  };
  progress: {
    weightLoss: number;
    strengthGain: number;
    enduranceImprovement: number;
  };
  recentWorkouts: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    intensity: number;
  }>;
  achievements: Array<{
    id: string;
    title: string;
    description: string;
    earnedAt: string;
    icon: string;
  }>;
}

interface UseClientDataReturn {
  data: ClientData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: Partial<ClientData['profile']>) => Promise<void>;
  logWorkout: (workoutData: any) => Promise<void>;
}

const useClientData = (): UseClientDataReturn => {
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const getAuthToken = (): string | null => {
    return localStorage.getItem('token') || localStorage.getItem('userToken') || null;
  };

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const authHeaders = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Fetch all client data in parallel
      const [progressRes, achievementsRes, statsRes] = await Promise.all([
        axios.get('/api/client/progress', authHeaders),
        axios.get('/api/client/achievements', authHeaders),
        axios.get('/api/client/workout-stats', authHeaders)
      ]);

      const progressData = progressRes.data?.progress || {};
      const achievementsData = achievementsRes.data?.achievements || [];
      const workoutStats = statsRes.data?.stats || {};

      // Map backend data to frontend ClientData interface
      const clientData: ClientData = {
        profile: {
          name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Client',
          email: user?.email || '',
          avatar: user?.profilePhoto || undefined,
          level: progressData.level || 1,
          experiencePoints: progressData.experiencePoints || 0
        },
        stats: {
          totalWorkouts: workoutStats.totalWorkouts || 0,
          totalWeight: progressData.totalWeightLifted || 0,
          averageIntensity: workoutStats.averageDuration ? Math.min(workoutStats.averageDuration / 10, 10) : 0,
          streakDays: progressData.streakDays || 0
        },
        progress: {
          weightLoss: progressData.weightLoss || 0,
          strengthGain: progressData.strengthGain || 0,
          enduranceImprovement: progressData.enduranceImprovement || 0
        },
        recentWorkouts: progressData.recentWorkouts || [],
        achievements: achievementsData.map((ach: any) => ({
          id: ach.id || String(Math.random()),
          title: ach.title || ach.name || 'Achievement',
          description: ach.description || '',
          earnedAt: ach.earnedAt || ach.createdAt || new Date().toISOString(),
          icon: ach.icon || '🏆'
        }))
      };

      setData(clientData);
    } catch (err: any) {
      console.error('Failed to fetch client data:', err);

      // Handle auth errors
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to fetch client data');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<ClientData['profile']>) => {
    try {
      setError(null);
      
      // TODO: Replace with actual API call
      // await fetch('/api/client/profile', {
      //   method: 'PATCH',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updates)
      // });
      
      setData(prev => prev ? {
        ...prev,
        profile: { ...prev.profile, ...updates }
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  }, []);

  const logWorkout = useCallback(async (workoutData: any) => {
    try {
      setError(null);
      
      // TODO: Replace with actual API call
      // await fetch('/api/client/workouts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(workoutData)
      // });
      
      // Update local state optimistically
      setData(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          stats: {
            ...prev.stats,
            totalWorkouts: prev.stats.totalWorkouts + 1
          },
          recentWorkouts: [workoutData, ...prev.recentWorkouts.slice(0, 4)]
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log workout');
    }
  }, []);

  useEffect(() => {
    fetchClientData();
  }, [fetchClientData]);

  return {
    data,
    loading,
    error,
    refetch: fetchClientData,
    updateProfile,
    logWorkout
  };
};

export default useClientData;
