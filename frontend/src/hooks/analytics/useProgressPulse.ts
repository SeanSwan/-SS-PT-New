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

import { useCallback, useEffect, useRef, useState } from 'react';
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

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const isNonEmptyString = (value: unknown): value is string => (
  typeof value === 'string' && value.trim().length > 0
);

/** Server CTAs stay inside the app and cannot contain escape/control syntax. */
export const isSafeInternalRoute = (value: unknown): value is string => (
  typeof value === 'string'
  && value.length > 1
  && value.startsWith('/')
  && !value.startsWith('//')
  && Array.from(value).every((character) => {
    const code = character.charCodeAt(0);
    return character !== '\\' && code >= 0x20 && code !== 0x7f && !/\s/.test(character);
  })
);

export const isValidPulseAction = (value: unknown): value is PulseAction => {
  if (!isRecord(value) || !isNonEmptyString(value.code) || !Number.isFinite(value.priority)
    || !isNonEmptyString(value.title) || !isNonEmptyString(value.message)) {
    return false;
  }
  if (value.cta === null) return true;
  return isRecord(value.cta) && isNonEmptyString(value.cta.label) && isSafeInternalRoute(value.cta.href);
};

const isActionList = (value: unknown): value is PulseAction[] => (
  Array.isArray(value) && value.every((item) => isValidPulseAction(item))
);

const isNextBestAction = (value: unknown): value is ProgressPulse['nextBestAction'] | LiteNextBestAction => (
  isRecord(value) && isValidPulseAction(value.primary) && isActionList(value.secondary)
);

const isFiniteOrNull = (value: unknown): value is number | null => value === null || Number.isFinite(value);

const isPulseShape = (data: unknown): data is ProgressPulse => {
  if (!isRecord(data) || !isRecord(data.streak) || !isRecord(data.pushPull)
    || !isRecord(data.variety) || !isRecord(data.volume) || !isRecord(data.lastWorkout)
    || !isNextBestAction(data.nextBestAction)) return false;

  const streak = data.streak;
  const pushPull = data.pushPull;
  const variety = data.variety;
  const volume = data.volume;
  const lastWorkout = data.lastWorkout;
  const nextBestAction = data.nextBestAction as ProgressPulse['nextBestAction'];
  const constraints = nextBestAction.constraints;
  const meta = nextBestAction.meta;

  return Number.isFinite(streak.weeklyCurrent)
    && Number.isFinite(streak.weeklyLongest)
    && Number.isFinite(streak.weekTarget)
    && Number.isFinite(streak.daysThisWeek)
    && typeof streak.currentWeekPending === 'boolean'
    && Number.isFinite(pushPull.pushVolume)
    && Number.isFinite(pushPull.pullVolume)
    && isFiniteOrNull(pushPull.ratio)
    && ['balanced', 'push_heavy', 'pull_heavy', 'insufficient_data'].includes(String(pushPull.label))
    && isFiniteOrNull(variety.score)
    && Number.isFinite(variety.distinctExercises)
    && Number.isFinite(variety.patternsCovered)
    && Number.isFinite(variety.patternsTotal)
    && Number.isFinite(volume.thisWeek)
    && Number.isFinite(volume.priorWeek)
    && isFiniteOrNull(volume.deltaPct)
    && (lastWorkout.date === null || typeof lastWorkout.date === 'string')
    && isFiniteOrNull(lastWorkout.daysAgo)
    && (constraints === undefined || constraints === null
      || (isRecord(constraints) && Array.isArray(constraints.regions)
        && constraints.regions.every((region) => typeof region === 'string')
        && isNonEmptyString(constraints.note)))
    && (meta === undefined || (isRecord(meta) && isNonEmptyString(meta.engine) && Number.isFinite(meta.version)));
};

const isLiteShape = (data: unknown): data is LiteNextBestAction => isNextBestAction(data);

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
  const [publishedActor, setPublishedActor] = useState<string | null>(null);
  const requestGeneration = useRef(0);
  const actorRef = useRef<string | null>(null);
  const authAxiosRef = useRef(authAxios);
  const actorId = user?.id == null ? null : String(user.id);
  actorRef.current = actorId;
  authAxiosRef.current = authAxios;

  const refetch = useCallback(() => {
    requestGeneration.current += 1;
    setStatus('loading');
    setPulse(null);
    setLiteNba(null);
    setPublishedActor(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const generation = ++requestGeneration.current;
    let isActive = true;
    const isCurrent = () => isActive
      && requestGeneration.current === generation
      && actorRef.current === actorId
      && authAxiosRef.current === authAxios;

    setStatus('loading');
    setPulse(null);
    setLiteNba(null);
    setPublishedActor(null);

    if (!authAxios || !actorId) {
      setStatus('error');
      return () => {
        isActive = false;
      };
    }

    const publishError = () => {
      if (!isCurrent()) return;
      setPulse(null);
      setLiteNba(null);
      setPublishedActor(actorId);
      setStatus('error');
    };

    const request = (path: string) => Promise.resolve().then(() => authAxios.get(path, {
      _isBackgroundRequest: true,
    } as never));

    // Promise.resolve guards non-promise axios doubles (same defect class
    // as the addExercise ghost fetch — .then on undefined threw unhandled).
    request('/api/client/analytics/progress-pulse')
      .then((res: { data?: { success?: boolean; data?: unknown } }) => {
        if (!isCurrent()) return;
        const payload = res?.data?.data;
        if (res?.data?.success && isPulseShape(payload)) {
          setPulse(payload);
          setLiteNba(null);
          setPublishedActor(actorId);
          setStatus('ready');
        } else {
          publishError();
        }
      })
      .catch(() => {
        if (!isCurrent()) return;
        // D1 (Sean 2026-07-06): gated tiers fall back to the free rungs-1-3
        // guidance instead of a dead card. Any lite failure -> plain error.
        request('/api/client/analytics/nba-lite')
          .then((res: { data?: { success?: boolean; data?: { nextBestAction?: LiteNextBestAction } } }) => {
            if (!isCurrent()) return;
            const nba = res?.data?.data?.nextBestAction;
            if (res?.data?.success && isLiteShape(nba)) {
              setPulse(null);
              setLiteNba(nba);
              setPublishedActor(actorId);
              setStatus('lite');
            } else {
              publishError();
            }
          })
          .catch(publishError);
      });

    return () => {
      isActive = false;
    };
  }, [authAxios, actorId, nonce]);

  const hasCurrentActorResult = actorId !== null && publishedActor === actorId;
  const visibleStatus = actorId === null
    ? 'error'
    : hasCurrentActorResult
      ? status
      : 'loading';

  return {
    status: visibleStatus,
    pulse: hasCurrentActorResult ? pulse : null,
    liteNba: hasCurrentActorResult ? liteNba : null,
    refetch,
  };
}

export default useProgressPulse;
