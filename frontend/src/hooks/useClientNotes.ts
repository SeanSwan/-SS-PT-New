/**
 * useClientNotes Hook
 * ===================
 * Fetches trainer notes for a client
 * Phase 2 Task 5 - Dashboard Tab Wiring
 */

import { useState, useEffect, useCallback } from 'react';

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
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notes/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
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
    if (!userId) return false;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/notes/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, noteType: type })
      });

      const result = await response.json();

      if (!response.ok || result?.success === false) {
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
