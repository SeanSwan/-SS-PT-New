/**
 * ============================================================================
 * FILE: useRestaurantSearch.ts
 * PURPOSE: Hook for searching restaurant & food nutrition via FatSecret API
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 */
import { useState, useCallback, useRef } from 'react';
import apiService from '../services/api.service';

export interface FoodResult {
  id: string;
  name: string;
  brand: string | null;
  type: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  source: string;
  url: string | null;
}

export interface FoodDetail {
  id: string;
  name: string;
  brand: string | null;
  type: string;
  primaryServing: {
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol: number;
    saturatedFat: number;
  };
  servings: Array<{
    id: string;
    description: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  source: string;
}

interface UseRestaurantSearchResult {
  results: FoodResult[];
  totalResults: number;
  loading: boolean;
  error: string | null;
  search: (query: string, page?: number) => Promise<void>;
  getDetails: (foodId: string) => Promise<FoodDetail | null>;
  detailLoading: boolean;
  configured: boolean | null;
  page: number;
}

export function useRestaurantSearch(): UseRestaurantSearchResult {
  const [results, setResults] = useState<FoodResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (query: string, pageNum = 0) => {
    if (!query || query.length < 2) return;

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: query,
        page: String(pageNum),
        limit: '20',
      });

      const response = await apiService.get(`/api/restaurant/search?${params}`, {
        signal: controller.signal,
      });
      const data = response.data;
      if (data.success) {
        setResults(data.foods || []);
        setTotalResults(data.totalResults || 0);
        setPage(pageNum);
        setConfigured(true);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
      if (err?.response?.data?.configured === false) {
        setConfigured(false);
      }
      setError(err?.response?.data?.error || err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const getDetails = useCallback(async (foodId: string): Promise<FoodDetail | null> => {
    setDetailLoading(true);
    try {
      const response = await apiService.get(`/api/restaurant/food/${foodId}`);
      const data = response.data;
      return data.success ? data.food : null;
    } catch {
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return { results, totalResults, loading, error, search, getDetails, detailLoading, configured, page };
}
