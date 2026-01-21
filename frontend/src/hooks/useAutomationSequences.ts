/**
 * useAutomationSequences Hook
 * ===========================
 * Fetches automation sequences for admin management.
 */

import { useCallback, useEffect, useState } from 'react';

export type AutomationStep = {
  dayOffset: number;
  templateName: string | null;
  channel: 'sms' | 'email' | 'push';
};

export type AutomationSequence = {
  id: number;
  name: string;
  triggerEvent: string;
  isActive: boolean;
  steps: AutomationStep[];
  createdAt?: string;
  updatedAt?: string;
};

interface UseAutomationSequencesResult {
  data: AutomationSequence[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useAutomationSequences = (): UseAutomationSequencesResult => {
  const [data, setData] = useState<AutomationSequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSequences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/automation/sequences', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        setError(result?.message || 'Failed to fetch automation sequences');
        return;
      }

      setData(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      console.error('Error fetching automation sequences:', err);
      setError('Network error fetching automation sequences');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchSequences
  };
};

export default useAutomationSequences;
