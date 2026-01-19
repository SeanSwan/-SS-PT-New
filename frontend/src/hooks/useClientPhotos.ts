/**
 * useClientPhotos Hook
 * ====================
 * Fetches the client's progress photos
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import { useState, useEffect, useCallback } from 'react';

interface ClientPhoto {
  id: number;
  url: string;
  type: 'front' | 'side' | 'back' | 'other';
  takenAt: string;
  uploadedAt: string;
  tags: string[];
  visibility: string;
  notes?: string;
}

interface UseClientPhotosResult {
  data: ClientPhoto[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useClientPhotos(userId?: number, type?: string): UseClientPhotosResult {
  const [data, setData] = useState<ClientPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const queryParams = type ? `?type=${type}` : '';
      const response = await fetch(`/api/photos/${userId}${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to fetch photos');
      } else {
        setData(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching photos:', err);
      setError('Network error fetching photos');
    } finally {
      setIsLoading(false);
    }
  }, [userId, type]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchPhotos
  };
}

export default useClientPhotos;
