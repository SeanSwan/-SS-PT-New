/**
 * useTrainerTodaySessions
 * =======================
 * Fetches today's trainer sessions from GET /api/sessions?date=today
 * and derives KPI stats. Extracted to keep TrainerHomeTab under 300 lines.
 *
 * Returns: { sessions, loading, error, stats, getClientName }
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export interface TrainerSession {
  id: number;
  clientName?: string;
  client?: { firstName?: string; lastName?: string };
  startTime?: string;
  endTime?: string;
  status?: string;
}

export interface TrainerTodayStats {
  clientsToday: number;
  sessionsToday: number;
  hoursLogged: number;
  completionRate: number;
}

export function getClientName(s: TrainerSession): string {
  if (s.client?.firstName) {
    return `${s.client.firstName}${s.client.lastName ? ' ' + s.client.lastName : ''}`;
  }
  return s.clientName ?? 'Unassigned';
}

export function useTrainerTodaySessions() {
  const { authAxios } = useAuth();
  const [sessions, setSessions] = useState<TrainerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const today = new Date().toISOString().split('T')[0];
        const res = await authAxios.get(`/api/sessions?date=${today}`);
        if (mounted) setSessions(Array.isArray(res.data) ? res.data : res.data?.sessions ?? []);
      } catch {
        if (mounted) {
          setError("Could not load today's schedule.");
          setSessions([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [authAxios]);

  const stats = useMemo<TrainerTodayStats>(() => {
    if (sessions.length === 0) return { clientsToday: 0, sessionsToday: 0, hoursLogged: 0, completionRate: 0 };
    return {
      clientsToday: new Set(sessions.map(getClientName)).size,
      sessionsToday: sessions.length,
      hoursLogged: sessions.reduce((sum, s) => {
        if (!s.startTime || !s.endTime) return sum;
        return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000;
      }, 0),
      completionRate: Math.round(
        (sessions.filter(s => s.status === 'completed').length / sessions.length) * 100
      ),
    };
  }, [sessions]);

  return { sessions, loading, error, stats };
}
