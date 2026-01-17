/**
 * useClientOnboardingData Hook
 * =============================
 *
 * React hook for fetching Phase 1.1 client onboarding data from real API endpoints.
 * Provides questionnaire status, NASM movement screen data, and baseline measurements.
 *
 * Features:
 * - Real API integration with /api/client-data/overview/:userId
 * - Loading states and error handling
 * - Auto-refresh capability
 * - TypeScript fully typed
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';

// === TYPES ===
export interface ClientOnboardingData {
  userId: number;
  onboardingStatus: {
    completed: boolean;
    completionPercentage: number;
    primaryGoal?: string;
    trainingTier?: string;
    healthRisk?: string;
  };
  movementScreen: {
    completed: boolean;
    nasmAssessmentScore?: number;
    medicalClearanceRequired?: boolean;
    compensationsIdentified?: string[];
    date?: string;
  };
  baselineMeasurements?: {
    restingHeartRate?: number;
    bloodPressure?: string;
    bodyWeight?: number;
    benchPress?: string;
    squat?: string;
    lastUpdated?: string;
  };
  nutritionPlan?: {
    active: boolean;
    dailyCalories?: number;
    macros?: {
      protein: number;
      carbs: number;
      fat: number;
    };
  };
  progressPhotos?: {
    count: number;
    latestDate?: string;
  };
  trainerNotes?: {
    count: number;
    latestDate?: string;
  };
}

interface UseClientOnboardingDataReturn {
  data: ClientOnboardingData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// === HOOK ===
export const useClientOnboardingData = (userId?: number): UseClientOnboardingDataReturn => {
  const { user } = useAuth();
  const [data, setData] = useState<ClientOnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  const fetchOnboardingData = useCallback(async () => {
    if (!targetUserId) {
      setError('No user ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiService.get(`/api/client-data/overview/${targetUserId}`);

      if (response.data.success) {
        setData(response.data.overview);
      } else {
        throw new Error(response.data.message || 'Failed to fetch onboarding data');
      }
    } catch (err: any) {
      console.error('Error fetching client onboarding data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load onboarding data');
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    fetchOnboardingData();
  }, [fetchOnboardingData]);

  return {
    data,
    loading,
    error,
    refetch: fetchOnboardingData,
  };
};

// === ADDITIONAL HOOKS FOR SPECIFIC DATA ===

/**
 * Hook to fetch only questionnaire data
 */
export const useClientQuestionnaire = (userId?: number) => {
  const { user } = useAuth();
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    const fetchQuestionnaire = async () => {
      if (!targetUserId) return;

      try {
        setLoading(true);
        const response = await apiService.get(`/api/onboarding/${targetUserId}/questionnaire`);

        if (response.data.success) {
          setQuestionnaire(response.data.questionnaire);
        }
      } catch (err: any) {
        console.error('Error fetching questionnaire:', err);
        setError(err.response?.data?.message || 'Failed to load questionnaire');
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionnaire();
  }, [targetUserId]);

  return { questionnaire, loading, error };
};

/**
 * Hook to fetch movement screen history
 */
export const useMovementScreenHistory = (userId?: number) => {
  const { user } = useAuth();
  const [movementScreens, setMovementScreens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const targetUserId = userId || user?.id;

  useEffect(() => {
    const fetchMovementScreens = async () => {
      if (!targetUserId) return;

      try {
        setLoading(true);
        const response = await apiService.get(`/api/admin/movement-screens/${targetUserId}`);

        if (response.data.success) {
          setMovementScreens(response.data.movementScreens || []);
        }
      } catch (err: any) {
        console.error('Error fetching movement screens:', err);
        setError(err.response?.data?.message || 'Failed to load movement screens');
      } finally {
        setLoading(false);
      }
    };

    fetchMovementScreens();
  }, [targetUserId]);

  return { movementScreens, loading, error };
};

export default useClientOnboardingData;
