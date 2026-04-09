/**
 * ============================================================================
 * FILE: useRestaurantSearch.ts
 * PURPOSE: Hook for searching restaurant & food nutrition via FatSecret API
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * ============================================================================
 */
import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE
  || (import.meta.env.PROD ? '' : 'http://localhost:10000');

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

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

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

      const res = await fetch(`${API_BASE}/api/restaurant/search?${params}`, {
        headers: getHeaders(),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.configured === false) {
          setConfigured(false);
        }
        throw new Error(data.error || `Search failed (${res.status})`);
      }

      const data = await res.json();
      if (data.success) {
        setResults(data.foods || []);
        setTotalResults(data.totalResults || 0);
        setPage(pageNum);
        setConfigured(true);
      } else {
        throw new Error(data.error || 'Search failed');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  const getDetails = useCallback(async (foodId: string): Promise<FoodDetail | null> => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/restaurant/food/${foodId}`, {
        headers: getHeaders(),
      });

      if (!res.ok) return null;
      const data = await res.json();
      return data.success ? data.food : null;
    } catch {
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, [getHeaders]);

  return { results, totalResults, loading, error, search, getDetails, detailLoading, configured, page };
}
