/**
 * useNutritionPlan Hook
 * =====================
 * Fetches the client's current nutrition plan
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import { useState, useEffect, useCallback } from 'react';

interface Macros {
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

interface Meal {
  name: string;
  time?: string;
  foods: Array<{
    name: string;
    portion: string;
    calories?: number;
  }>;
}

interface NutritionPlan {
  id: number;
  name: string;
  dailyCalories: number;
  macros: Macros;
  meals: Meal[];
  groceryList: string[];
  dietaryRestrictions: string[];
  allergies: string[];
  hydrationTarget: number;
  notes: string;
  startDate: string;
  endDate?: string;
  createdAt: string;
}

interface UseNutritionPlanResult {
  data: NutritionPlan | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * @param userId - The user ID to fetch nutrition plan for
 * @param isClient - Optional flag to indicate if the target user is a client.
 *                   If explicitly false, skips API call (prevents 404 for non-client users).
 */
export function useNutritionPlan(userId?: number, isClient?: boolean): UseNutritionPlanResult {
  const [data, setData] = useState<NutritionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNutrition = useCallback(async () => {
    // Skip API call if no userId or if explicitly marked as non-client
    if (!userId || isClient === false) {
      setIsLoading(false);
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/nutrition/${userId}/current`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        if (response.status === 200 && result.data === null) {
          setData(null);
        } else {
          setError(result?.message || 'Failed to fetch nutrition plan');
        }
      } else {
        setData(result.data);
      }
    } catch (err) {
      console.error('Error fetching nutrition plan:', err);
      setError('Network error fetching nutrition plan');
    } finally {
      setIsLoading(false);
    }
  }, [userId, isClient]);

  useEffect(() => {
    fetchNutrition();
  }, [fetchNutrition]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchNutrition
  };
}

export default useNutritionPlan;
