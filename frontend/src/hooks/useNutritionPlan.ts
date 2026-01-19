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

export function useNutritionPlan(userId?: number): UseNutritionPlanResult {
  const [data, setData] = useState<NutritionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNutrition = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
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
  }, [userId]);

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
