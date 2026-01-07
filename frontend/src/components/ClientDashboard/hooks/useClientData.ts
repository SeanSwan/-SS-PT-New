/**
 * useClientData Hook
 * ==================
 * Custom hook for managing client dashboard data.
 * Provides centralized state management and API integration.
 *
 * Blueprint Reference:
 * - docs/ai-workflow/PHASE-8-DASHBOARD-API-GAPS-BLUEPRINT.md
 *
 * Data Flow:
 * Client UI -> useClientData -> /api/client/* + /api/workout/sessions
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

type ClientProfilePatch = Partial<ClientData['profile']> & {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  photo?: string;
  preferences?: Record<string, unknown>;
  emergencyContact?: string;
};

interface UseClientDataReturn {
  data: ClientData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateProfile: (updates: ClientProfilePatch) => Promise<void>;
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

  const getAuthHeaders = () => {
    const token = getAuthToken();
    if (!token) {
      throw new Error('No authentication token found');
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const splitName = (fullName: string) => {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return { firstName: '', lastName: '' };
    }
    const parts = trimmed.split(' ');
    return {
      firstName: parts.shift() || '',
      lastName: parts.join(' ')
    };
  };

  const buildProfilePatchPayload = (updates: ClientProfilePatch) => {
    const payload: Record<string, unknown> = {};

    if (updates.name) {
      const { firstName, lastName } = splitName(updates.name);
      if (firstName) payload.firstName = firstName;
      if (lastName) payload.lastName = lastName;
    }

    if (updates.firstName) payload.firstName = updates.firstName;
    if (updates.lastName) payload.lastName = updates.lastName;
    if (updates.email) payload.email = updates.email;
    if (updates.phone) payload.phone = updates.phone;
    if (updates.photo) payload.photo = updates.photo;
    if (updates.avatar) payload.photo = updates.avatar;
    if (updates.preferences) payload.preferences = updates.preferences;
    if (updates.emergencyContact) payload.emergencyContact = updates.emergencyContact;

    return payload;
  };

  const resolveProfileName = (updatedUser: any, updates: ClientProfilePatch, fallback: string) => {
    if (updatedUser?.firstName || updatedUser?.lastName) {
      return `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim();
    }
    if (updates.firstName || updates.lastName) {
      return `${updates.firstName || ''} ${updates.lastName || ''}`.trim();
    }
    if (updates.name) {
      return updates.name;
    }
    return fallback;
  };

  const normalizeWorkoutPayload = (workoutData: any) => {
    const userId = workoutData?.userId || user?.id;
    if (!userId) {
      throw new Error('Missing userId for workout logging');
    }

    const title = (workoutData?.title || workoutData?.name || 'Workout Session').toString();
    const date = workoutData?.date || workoutData?.workoutDate || new Date().toISOString();
    const duration = Number(workoutData?.duration ?? workoutData?.durationMinutes ?? 1);
    const intensity = Number(workoutData?.intensity ?? workoutData?.rpe ?? 1);

    return {
      userId: String(userId),
      title: title.length >= 3 ? title : 'Workout Session',
      date,
      duration: Number.isFinite(duration) && duration >= 1 ? duration : 1,
      intensity: Number.isFinite(intensity) ? Math.min(Math.max(intensity, 1), 10) : 1,
      exercises: Array.isArray(workoutData?.exercises) ? workoutData.exercises : [],
      notes: workoutData?.notes || '',
      totalWeight: Number(workoutData?.totalWeight ?? 0),
      totalReps: Number(workoutData?.totalReps ?? 0),
      totalSets: Number(workoutData?.totalSets ?? 0)
    };
  };

  const fetchClientData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const authHeaders = getAuthHeaders();

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

  const updateProfile = useCallback(async (updates: ClientProfilePatch) => {
    try {
      setError(null);

      const authHeaders = getAuthHeaders();
      const payload = buildProfilePatchPayload(updates);

      if (Object.keys(payload).length === 0) {
        throw new Error('No valid fields to update');
      }

      const response = await axios.patch('/api/client/profile', payload, authHeaders);
      const updatedUser = response.data?.user;

      setData((prev) => {
        if (!prev) return prev;
        const nextName = resolveProfileName(updatedUser, updates, prev.profile.name);
        const nextEmail = updatedUser?.email || updates.email || prev.profile.email;
        const nextAvatar = updatedUser?.photo || updates.photo || updates.avatar || prev.profile.avatar;

        return {
          ...prev,
          profile: {
            ...prev.profile,
            name: nextName,
            email: nextEmail,
            avatar: nextAvatar
          }
        };
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to update profile');
      }
    }
  }, []);

  const logWorkout = useCallback(async (workoutData: any) => {
    try {
      setError(null);

      const authHeaders = getAuthHeaders();
      const payload = normalizeWorkoutPayload(workoutData);

      const response = await axios.post('/api/workout/sessions', payload, authHeaders);
      const session = response.data?.session;

      const recentWorkout = {
        id: session?.id || `local-${Date.now()}`,
        title: session?.title || payload.title,
        date: session?.date || payload.date,
        duration: session?.duration || payload.duration,
        intensity: session?.intensity || payload.intensity
      };

      setData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            totalWorkouts: prev.stats.totalWorkouts + 1,
            totalWeight: prev.stats.totalWeight + (Number(payload.totalWeight) || 0)
          },
          recentWorkouts: [recentWorkout, ...prev.recentWorkouts.slice(0, 4)]
        };
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to log workout');
      }
    }
  }, [user]);

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
