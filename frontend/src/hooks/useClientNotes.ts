/**
 * useClientNotes Hook
 * ===================
 * Fetches trainer notes for a client
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api.service';

interface NoteCreator {
  id: number;
  firstName: string;
  lastName: string;
}

interface ClientNote {
  id: number;
  content: string;
  type: 'observation' | 'red_flag' | 'achievement' | 'concern' | 'general';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  createdBy: NoteCreator | null;
  isPrivate: boolean;
  tags: string[];
  isResolved: boolean;
  followUpDate?: string;
}

interface UseClientNotesResult {
  data: ClientNote[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createNote: (content: string, type?: string) => Promise<boolean>;
}

export function useClientNotes(userId?: number): UseClientNotesResult {
  const [data, setData] = useState<ClientNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    // Guard against invalid IDs like -1, 0, null, undefined
    if (!userId || userId <= 0) {
      setIsLoading(false);
      setData([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.get(`/api/notes/${userId}`);
      const result = response.data;

      if (result?.success === false) {
        setError(result?.message || 'Failed to fetch notes');
      } else {
        setData(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching notes:', err);
      setError('Network error fetching notes');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createNote = useCallback(async (content: string, type: string = 'general'): Promise<boolean> => {
    // Guard against invalid IDs
    if (!userId || userId <= 0) return false;

    try {
      const response = await apiService.post(`/api/notes/${userId}`, { content, noteType: type });
      const result = response.data;

      if (result?.success === false) {
        setError(result?.message || 'Failed to create note');
        return false;
      }

      // Refresh notes after creation
      await fetchNotes();
      return true;
    } catch (err) {
      console.error('Error creating note:', err);
      setError('Network error creating note');
      return false;
    }
  }, [userId, fetchNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchNotes,
    createNote
  };
}

export default useClientNotes;
