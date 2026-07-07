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
  nextBestAction: {
    primary: PulseAction;
    secondary: PulseAction[];
    /** Phase 1.5a additive keys — comfort-modification framing only. */
    constraints?: { regions: string[]; note: string } | null;
    meta?: { engine: string; version: number };
  };
}

export type ProgressPulseStatus = 'loading' | 'ready' | 'lite' | 'error';

/** D1 free-tier payload: rungs 1-3 guidance without the paid pulse. */
export interface LiteNextBestAction {
  primary: PulseAction;
  secondary: PulseAction[];
}

const isPulseShape = (data: unknown): data is ProgressPulse => {
  const d = data as ProgressPulse | null;
  return Boolean(d && d.streak && d.pushPull && d.variety && d.nextBestAction?.primary);
};

export function useProgressPulse(): {
  status: ProgressPulseStatus;
  pulse: ProgressPulse | null;
  liteNba: LiteNextBestAction | null;
  refetch: () => void;
} {
  const { authAxios, user } = useAuth();
  const [status, setStatus] = useState<ProgressPulseStatus>('loading');
  const [pulse, setPulse] = useState<ProgressPulse | null>(null);
  const [liteNba, setLiteNba] = useState<LiteNextBestAction | null>(null);
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
    // Promise.resolve guards non-promise axios doubles (same defect class
    // as the addExercise ghost fetch — .then on undefined threw unhandled).
    Promise.resolve(authAxios
      // _isBackgroundRequest: gated tiers must NOT pop the global 402
      // FrostedPaywall from a passive home-card probe (D2 hostile finding).
      .get('/api/client/analytics/progress-pulse', { _isBackgroundRequest: true } as never))
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
        // D1 (Sean 2026-07-06): gated tiers fall back to the free rungs-1-3
        // guidance instead of a dead card. Any lite failure -> plain error.
        Promise.resolve(authAxios
          .get('/api/client/analytics/nba-lite', { _isBackgroundRequest: true } as never))
          .then((res: { data?: { success?: boolean; data?: { nextBestAction?: LiteNextBestAction } } }) => {
            if (!isMounted) return;
            const nba = res?.data?.data?.nextBestAction;
            if (res?.data?.success && nba?.primary?.title) {
              setLiteNba(nba);
              setStatus('lite');
            } else {
              setLiteNba(null);
              setStatus('error');
            }
          })
          .catch(() => {
            if (!isMounted) return;
            setLiteNba(null);
            setStatus('error');
          });
      });
    return () => { isMounted = false; };
  }, [authAxios, user?.id, nonce]);

  return { status, pulse, liteNba, refetch };
}

export default useProgressPulse;
