/**
 * useTrainerTodaySessions
 * =======================
 * Fetches today's trainer sessions from GET /api/sessions?startDate=&endDate=
 * and derives KPI stats. Extracted to keep TrainerHomeTab under 300 lines.
 *
 * Returns: { sessions, loading, error, stats, getClientName }
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

export interface TrainerSession {
  id: number | string;
  userId?: number | string | null;
  clientName?: string;
  client?: {
    id?: number | string | null;
    firstName?: string;
    lastName?: string;
  };
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  duration?: number | string | null;
  creditsRequired?: number | string | null;
  sessionCredits?: number | string | null;
  sessionType?: {
    creditsRequired?: number | string | null;
  } | null;
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

const parsePositiveId = (value: number | string | null | undefined): string | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }

  const trimmedValue = value?.trim();
  if (!trimmedValue || !/^[1-9]\d*$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) ? String(parsedValue) : null;
};

const parseNonNegativeInteger = (value: number | string | null | undefined): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }

  const trimmedValue = value?.trim();
  if (!trimmedValue || !/^(0|[1-9]\d*)$/.test(trimmedValue)) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  return Number.isSafeInteger(parsedValue) ? parsedValue : null;
};

export function getSessionClientId(s: TrainerSession): string | null {
  return parsePositiveId(s.userId) ?? parsePositiveId(s.client?.id);
}

export function getSessionCreditHint(s: TrainerSession): number | null {
  return parseNonNegativeInteger(
    s.sessionType?.creditsRequired ?? s.creditsRequired ?? s.sessionCredits
  );
}

const parseSessionDate = (raw?: string | null): Date | null => {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date : null;
};

export function getSessionStartDate(s: TrainerSession): Date | null {
  return parseSessionDate(s.startTime ?? s.sessionDate);
}

export function getSessionEndDate(s: TrainerSession): Date | null {
  const explicitEnd = parseSessionDate(s.endTime);
  if (explicitEnd) return explicitEnd;

  const start = getSessionStartDate(s);
  const durationMinutes = Number(s.duration);
  if (!start || !Number.isFinite(durationMinutes) || durationMinutes <= 0) return null;

  return new Date(start.getTime() + durationMinutes * 60 * 1000);
}

export function buildTrainerSessionLogRoute(
  session: TrainerSession,
  returnTo = '/dashboard/trainer/overview',
): string | null {
  const clientId = getSessionClientId(session);
  const sessionId = parsePositiveId(session.id);
  if (!clientId || !sessionId) return null;

  const params = new URLSearchParams({
    clientId,
    source: 'master-schedule',
    returnTo,
    loadPlan: 'today',
  });
  params.set('sessionId', sessionId);

  const start = getSessionStartDate(session);
  if (start) params.set('sessionDate', start.toISOString());

  const sessionCreditHint = getSessionCreditHint(session);
  if (sessionCreditHint !== null) {
    params.set('sessionCredits', String(sessionCreditHint));
  }

  return `/dashboard/trainer/log-workout?${params.toString()}`;
}

export function buildTrainerSessionCoachRoute(
  session: TrainerSession,
  returnTo = '/dashboard/trainer/overview',
): string | null {
  const clientId = getSessionClientId(session);
  const sessionId = parsePositiveId(session.id);
  if (!clientId || !sessionId) return null;

  const params = new URLSearchParams({
    clientId,
    intent: 'log_workout',
    source: 'master-schedule',
    sourcePath: '/dashboard/trainer/schedule',
    returnTo,
  });
  params.set('sessionId', sessionId);

  const start = getSessionStartDate(session);
  if (start) params.set('sessionDate', start.toISOString());

  const sessionCreditHint = getSessionCreditHint(session);
  if (sessionCreditHint !== null) {
    params.set('sessionCredits', String(sessionCreditHint));
  }

  return `/dashboard/trainer/coach-assistant?${params.toString()}`;
}

export function buildTrainerSessionBuildPlanRoute(
  session: TrainerSession,
  returnTo = '/dashboard/trainer/overview',
): string | null {
  const clientId = getSessionClientId(session);
  if (!clientId) return null;

  const params = new URLSearchParams({
    clientId,
    source: 'trainer-overview',
    returnTo,
  });

  const sessionId = parsePositiveId(session.id);
  if (sessionId) params.set('sessionId', sessionId);

  const start = getSessionStartDate(session);
  if (start) params.set('sessionDate', start.toISOString());

  // Workout-OS C7 (2026-07-29): Build Plan is absorbed into the Workout
  // Planner. Same params kept — the planner honors clientId/returnTo and
  // ignores the session-context extras safely.
  return `/dashboard/trainer/workout-planner?${params.toString()}`;
}

const isClosedTrainerSession = (session: TrainerSession): boolean =>
  session.status === 'completed' || session.status === 'cancelled';

type TimedActionableTrainerSession = {
  session: TrainerSession;
  timestamp: number;
};

const getSessionActionTimestamp = (session: TrainerSession): number | null => {
  const start = getSessionStartDate(session);
  const timestamp = start ? start.getTime() : null;
  return Number.isFinite(timestamp) ? timestamp : null;
};

const isActionableTrainerSession = (session: TrainerSession): boolean =>
  !isClosedTrainerSession(session) &&
  Boolean(buildTrainerSessionLogRoute(session) || buildTrainerSessionCoachRoute(session));

export function getNextActionableTrainerSession(
  sessions: TrainerSession[],
  now = new Date()
): TrainerSession | null {
  const actionable = sessions
    .filter(isActionableTrainerSession)
    .map((session) => ({ session, timestamp: getSessionActionTimestamp(session) }))
    .filter((entry): entry is TimedActionableTrainerSession => entry.timestamp !== null);

  if (actionable.length === 0) return null;

  const nowTime = now.getTime();
  const upcoming = actionable
    .filter(({ timestamp }) => timestamp >= nowTime)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (upcoming[0]) return upcoming[0].session;

  return actionable
    .sort((a, b) => b.timestamp - a.timestamp)[0]
    ?.session ?? null;
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
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const params = new URLSearchParams({
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
        });
        const res = await authAxios.get(`/api/sessions?${params.toString()}`);
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
    const clientKeys = sessions.map((session) => getSessionClientId(session) ?? getClientName(session));
    return {
      clientsToday: new Set(clientKeys).size,
      sessionsToday: sessions.length,
      hoursLogged: sessions.reduce((sum, s) => {
        const start = getSessionStartDate(s);
        const end = getSessionEndDate(s);
        if (!start || !end) return sum;
        return sum + (end.getTime() - start.getTime()) / 3600000;
      }, 0),
      completionRate: Math.round(
        (sessions.filter(s => s.status === 'completed').length / sessions.length) * 100
      ),
    };
  }, [sessions]);

  return { sessions, loading, error, stats };
}
