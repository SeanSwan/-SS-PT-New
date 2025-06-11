/**
 * useClientData Hook
 * ==================
 * Custom hook for managing client dashboard data.
 * Provides centralized state management and API integration.
 */

import { useState, useEffect, useCallback } from 'react';

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

  // Mock data for development - replace with actual API calls
  const mockClientData: ClientData = {
    profile: {
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      level: 12,
      experiencePoints: 2450
    },
    stats: {
      totalWorkouts: 85,
      totalWeight: 12500,
      averageIntensity: 7.2,
      streakDays: 14
    },
    progress: {
      weightLoss: 8.5,
      strengthGain: 22,
      enduranceImprovement: 18
    },
    recentWorkouts: [
      {
        id: '1',
        title: 'Upper Body Strength',
        date: '2025-06-10',
        duration: 45,
        intensity: 8
      },
      {
        id: '2',
        title: 'Cardio Blast',
        date: '2025-06-08',
        duration: 30,
        intensity: 7
      }
    ],
    achievements: [
      {
        id: '1',
        title: 'Week Warrior',
        description: '7 consecutive days of workouts',
        earnedAt: '2025-06-10',
        icon: '🏆'
      },
      {
        id: '2',
        title: 'Strength Builder',
        description: 'Increased bench press by 20%',
        earnedAt: '2025-06-08',
        icon: '💪'
      }
    ]
  };

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Replace with actual API call
      // const response = await fetch('/api/client/dashboard');
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setData(mockClientData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch client data');
    } finally {
      setLoading(false);
    }
  }, []);

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
