/**
 * useSMSLogs Hook
 * ===============
 * Fetches SMS delivery logs for admin monitoring.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import apiService from '../services/api.service';

export type SmsLog = {
  id: number;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  channel: 'sms' | 'email' | 'push';
  recipient?: string | null;
  message?: string | null;
  templateName?: string | null;
  scheduledFor?: string;
  sentAt?: string;
  error?: string | null;
  createdAt?: string;
  sequence?: {
    id: number;
    name: string;
    triggerEvent: string;
  } | null;
  user?: {
    id: number;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  } | null;
  payloadJson?: Record<string, unknown> | null;
};

export type SmsLogFilters = {
  status?: string;
  userId?: number | null;
  limit?: number;
};

interface UseSMSLogsResult {
  data: SmsLog[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useSMSLogs = (filters: SmsLogFilters = {}): UseSMSLogsResult => {
  const [data, setData] = useState<SmsLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.userId) params.set('userId', String(filters.userId));
    if (filters.limit) params.set('limit', String(filters.limit));
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [filters.limit, filters.status, filters.userId]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.get(`/api/sms/logs${queryString}`);
      const result = response.data;

      if (result?.success === false) {
        setError(result?.message || 'Failed to fetch SMS logs');
        return;
      }

      setData(Array.isArray(result.data) ? result.data : []);
    } catch (err: any) {
      console.error('Error fetching SMS logs:', err);
      setError(err?.response?.data?.message || 'Network error fetching SMS logs');
    } finally {
      setIsLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchLogs
  };
};

export default useSMSLogs;
