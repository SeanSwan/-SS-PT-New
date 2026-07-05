/**
 * HOOK: useProgressPulse
 * PURPOSE: Fetches GET /api/client/analytics/progress-pulse (Slice 8 Progress
 *          Intelligence) — weekly streak, push/pull balance, variety score,
 *          volume trend, and the embedded coach next-best-action.
 * TRUTH: The backend computes everything from real workout_logs /
 *        workout_sessions rows and is null-honest; this hook never fabricates
 *        a metric. On any failure it reports 'error' so the panel self-hides
 *        instead of rendering a fake zero-progress story.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export interface PulseStreak {
  weeklyCurrent: number;
  weeklyLongest: number;
  weekTarget: number;
  daysThisWeek: number;
  currentWeekPending: boolean;
}

export interface PulsePushPull {
  pushVolume: number;
  pullVolume: number;
  ratio: number | null;
  label: 'balanced' | 'push_heavy' | 'pull_heavy' | 'insufficient_data';
}

export interface PulseVariety {
  score: number | null;
  distinctExercises: number;
  patternsCovered: number;
  patternsTotal: number;
}

export interface PulseAction {
  code: string;
  priority: number;
  title: string;
  message: string;
  cta: { label: string; href: string } | null;
}

export interface ProgressPulse {
  streak: PulseStreak;
  pushPull: PulsePushPull;
  variety: PulseVariety;
  volume: { thisWeek: number; priorWeek: number; deltaPct: number | null };
  lastWorkout: { date: string | null; daysAgo: number | null };
  nextBestAction: { primary: PulseAction; secondary: PulseAction[] };
}

export type ProgressPulseStatus = 'loading' | 'ready' | 'error';

const isPulseShape = (data: unknown): data is ProgressPulse => {
  const d = data as ProgressPulse | null;
  return Boolean(d && d.streak && d.pushPull && d.variety && d.nextBestAction?.primary);
};

export function useProgressPulse(): {
  status: ProgressPulseStatus;
  pulse: ProgressPulse | null;
  refetch: () => void;
} {
  const { authAxios, user } = useAuth();
  const [status, setStatus] = useState<ProgressPulseStatus>('loading');
  const [pulse, setPulse] = useState<ProgressPulse | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!authAxios || !user?.id) {
      setStatus('error');
      setPulse(null);
      return;
    }
    let isMounted = true;
    setStatus('loading');
    authAxios
      .get('/api/client/analytics/progress-pulse')
      .then((res: { data?: { success?: boolean; data?: unknown } }) => {
        if (!isMounted) return;
        const payload = res?.data?.data;
        if (res?.data?.success && isPulseShape(payload)) {
          setPulse(payload);
          setStatus('ready');
        } else {
          setPulse(null);
          setStatus('error');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setPulse(null);
        setStatus('error');
      });
    return () => { isMounted = false; };
  }, [authAxios, user?.id, nonce]);

  return { status, pulse, refetch };
}

export default useProgressPulse;
