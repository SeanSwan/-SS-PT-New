import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';

import { useAuth } from '../../context/AuthContext';
import { useCelebrationOptional } from '../../context/CelebrationContext';
import { ProductionTokenManager } from '../../services/api.service';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from '../../utils/realtimeSocketUrl';
import { useToast } from '../use-toast';

type GamificationRealtimeEvent =
  | 'gamification:points_awarded'
  | 'gamification:workout_completed'
  | 'gamification:achievement_unlocked'
  | 'gamification:level_up'
  | 'gamification:streak_milestone';

type GamificationRealtimePayload = {
  userId?: string | number;
  eventId?: string | number;
  transactionId?: string | number;
  sourceId?: string | number | null;
  points?: unknown;
  xpEarned?: unknown;
  newLevel?: unknown;
  previousLevel?: unknown;
  timestamp?: string;
  source?: string;
  transactionType?: unknown;
  achievementName?: unknown;
  streakDays?: unknown;
};

const subscribeToToken = (listener: () => void) => ProductionTokenManager.subscribe(listener);
const readToken = () => ProductionTokenManager.getToken();
const readServerToken = () => null;

const GAMIFICATION_EVENTS: GamificationRealtimeEvent[] = [
  'gamification:points_awarded',
  'gamification:workout_completed',
  'gamification:achievement_unlocked',
  'gamification:level_up',
  'gamification:streak_milestone',
];

const eventTitle = (event: GamificationRealtimeEvent) => {
  switch (event) {
    case 'gamification:achievement_unlocked':
      return 'Achievement unlocked';
    case 'gamification:level_up':
      return 'Level up unlocked';
    case 'gamification:streak_milestone':
      return 'Streak milestone reached';
    case 'gamification:workout_completed':
      return 'Workout XP updated';
    default:
      return 'Rewards profile updated';
  }
};

const normalizePositiveSafeInteger = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeReplayToken = (value: unknown): string | null => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const resolveRewardIdentity = (event: GamificationRealtimeEvent, data: GamificationRealtimePayload) => {
  const hasTransactionId = data.transactionId !== undefined && data.transactionId !== null;
  const transactionId = normalizePositiveSafeInteger(data.transactionId);
  if (hasTransactionId && transactionId === null) return { invalid: true, identity: null };
  if (transactionId !== null) return { invalid: false, identity: `transaction:${transactionId}` };

  const hasEventId = data.eventId !== undefined && data.eventId !== null;
  const eventId = normalizeReplayToken(data.eventId);
  if (hasEventId && eventId === null) return { invalid: true, identity: null };
  if (eventId) {
    const durableMatch = /^point-transaction:(\d+)$/.exec(eventId);
    if (durableMatch) {
      const durableId = normalizePositiveSafeInteger(durableMatch[1]);
      if (durableId === null) return { invalid: true, identity: null };
      return { invalid: false, identity: `transaction:${durableId}` };
    }
    return { invalid: false, identity: `event:${eventId}` };
  }

  const hasSourceId = data.sourceId !== undefined && data.sourceId !== null;
  const sourceId = normalizeReplayToken(data.sourceId);
  if (hasSourceId && sourceId === null) return { invalid: true, identity: null };
  if (sourceId) {
    const sourceNamespace = typeof data.source === 'string' && data.source.trim()
      ? data.source.trim()
      : event === 'gamification:points_awarded' || event === 'gamification:workout_completed'
        ? 'workout_or_points'
        : event;
    return { invalid: false, identity: `source:${sourceNamespace}:${sourceId}` };
  }

  const hasTimestamp = data.timestamp !== undefined && data.timestamp !== null;
  const timestamp = normalizeReplayToken(data.timestamp);
  if (hasTimestamp && timestamp === null) return { invalid: true, identity: null };
  return { invalid: false, identity: timestamp ? `timestamp:${timestamp}` : null };
};

type RewardReplayState = {
  xp: boolean;
  semantic: Set<string>;
};

const getReplayState = (seen: Map<string, RewardReplayState>, identity: string) => {
  const existing = seen.get(identity);
  if (existing) return existing;
  if (seen.size >= 256) seen.delete(seen.keys().next().value!);
  const created = { xp: false, semantic: new Set<string>() };
  seen.set(identity, created);
  return created;
};

export const normalizeRealtimeXp = (value: unknown): number => {
  const points = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+$/.test(value.trim())
      ? Number(value.trim())
      : 0;
  return Number.isSafeInteger(points) && points > 0 ? points : 0;
};

export const useGamificationRealtime = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const celebration = useCelebrationOptional();
  const [isConnected, setIsConnected] = useState(false);
  const managedToken = useSyncExternalStore(subscribeToToken, readToken, readServerToken);

  // Hold celebration in a ref so the sound-mute/retro toggles (which change the
  // memoized celebration API identity) don't churn the handler → socket reconnect.
  const celebrationRef = useRef(celebration);
  celebrationRef.current = celebration;

  // Dedup level-up celebrations: a socket reconnect can replay the same
  // level_up event, and we don't want two overlapping fireworks. Only fire
  // for a level strictly higher than the last one we already celebrated.
  const lastCelebratedLevelRef = useRef(0);
  const seenRewardRef = useRef(new Map<string, RewardReplayState>());
  const ownerRef = useRef<string | null>(null);
  const activeSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const nextOwner = user?.id === undefined || user?.id === null ? null : String(user.id);
    if (ownerRef.current !== nextOwner) {
      ownerRef.current = nextOwner;
      lastCelebratedLevelRef.current = 0;
      seenRewardRef.current.clear();
    }
  }, [user?.id]);

  const handleGamificationEvent = useCallback((
    event: GamificationRealtimeEvent,
    data: GamificationRealtimePayload,
  ) => {
    if (!user?.id || String(data?.userId ?? '') !== String(user.id)) return;

    if (event === 'gamification:level_up') {
      const rawLevel = data.newLevel;
      const newLevel = typeof rawLevel === 'number' || (typeof rawLevel === 'string' && /^\d+$/.test(rawLevel))
        ? Number(rawLevel) : 0;
      if (!Number.isSafeInteger(newLevel)) return;
      if (newLevel <= 0 || !celebrationRef.current) return;
      if (newLevel <= lastCelebratedLevelRef.current) return;
      lastCelebratedLevelRef.current = newLevel;
      void queryClient.invalidateQueries({ queryKey: ['gamification'] });
      celebrationRef.current.triggerLevelUp(newLevel);
      return;
    }

    const points = normalizeRealtimeXp(data.points ?? data.xpEarned);
    if (data.transactionType === 'spend' || data.transactionType === 'expire') return;
    const achievementName = typeof data.achievementName === 'string' && data.achievementName.trim()
      ? data.achievementName.trim().slice(0, 200)
      : null;
    const streakDays = normalizePositiveSafeInteger(data.streakDays);
    const hasSemanticProgress = Boolean(achievementName)
      || (event === 'gamification:streak_milestone' && streakDays !== null);
    if (points <= 0 && !hasSemanticProgress) return;

    // Committed ledger events use their durable transaction identity. Legacy
    // emitters fall back to source/timestamp, with a bounded owner-scoped replay set.
    const resolvedIdentity = resolveRewardIdentity(event, data);
    if (resolvedIdentity.invalid) return;
    const identity = resolvedIdentity.identity;
    const semanticKind = achievementName
      ? 'achievement'
      : event === 'gamification:streak_milestone' && streakDays !== null
        ? 'streak'
        : null;
    const replayState = identity ? getReplayState(seenRewardRef.current, identity) : null;
    const semanticKey = semanticKind && identity ? `${semanticKind}:${identity}` : null;
    const isNewSemantic = semanticKind !== null && (
      !replayState || !replayState.semantic.has(semanticKind)
    );
    if (replayState && semanticKind) {
      if (!isNewSemantic) return;
      replayState.semantic.add(semanticKind);
    }

    let shouldTriggerXp = points > 0;
    if (points > 0 && replayState) {
      const isNewXp = !replayState.xp;
      replayState.xp = true;
      shouldTriggerXp = isNewXp;
      if (!isNewXp && !semanticKey) return;
    }

    void queryClient.invalidateQueries({ queryKey: ['gamification'] });
    if (isNewSemantic && achievementName) {
      celebrationRef.current?.triggerAchievement(achievementName);
    }
    if (isNewSemantic && semanticKind === 'streak' && streakDays !== null) {
      celebrationRef.current?.triggerStreak(streakDays);
    }
    if (shouldTriggerXp) celebrationRef.current?.triggerXPPop(points);
    const title = achievementName
      ? 'Achievement unlocked'
      : semanticKind === 'streak'
        ? 'Streak milestone reached'
        : event === 'gamification:streak_milestone'
          ? 'Rewards profile updated'
          : event === 'gamification:achievement_unlocked'
            ? 'Rewards profile updated'
            : eventTitle(event);
    const description = achievementName
      ? `${achievementName} unlocked${points > 0 ? ` with ${points} XP.` : '.'}`
      : semanticKind === 'streak'
        ? `${streakDays}-day streak reached${points > 0 ? ` with ${points} XP.` : '.'}`
        : points > 0
          ? `Your rewards profile refreshed with ${points} XP.`
          : 'Your rewards profile has fresh progress.';
    toast({
      ownerId: String(user?.id),
      title,
      description,
      variant: 'default',
    });
  }, [queryClient, toast, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setIsConnected(false);
      return;
    }
    const token = managedToken;
    if (!token) {
      setIsConnected(false);
      return;
    }

    const socketUrl = resolveRealtimeSocketUrl();
    const socketOptions = resolveRealtimeSocketTransportOptions(socketUrl);
    const socket: Socket = io(socketUrl, {
      auth: { token },
      ...socketOptions,
      reconnectionAttempts: 2,
      timeout: 5000,
      withCredentials: true,
    });
    activeSocketRef.current = socket;

    socket.on('connect', () => {
      if (activeSocketRef.current !== socket) return;
      socket.emit('authenticate', { token });
    });
    socket.on('authenticated', () => {
      if (activeSocketRef.current === socket) setIsConnected(true);
    });
    socket.on('disconnect', () => {
      if (activeSocketRef.current === socket) setIsConnected(false);
    });
    socket.on('connect_error', () => {
      if (activeSocketRef.current === socket) setIsConnected(false);
    });
    socket.on('auth_error', () => {
      if (activeSocketRef.current !== socket) return;
      setIsConnected(false);
      socket.disconnect();
    });

    GAMIFICATION_EVENTS.forEach(event => {
      socket.on(event, data => {
        if (activeSocketRef.current !== socket) return;
        handleGamificationEvent(event, data);
      });
    });

    return () => {
      if (activeSocketRef.current === socket) activeSocketRef.current = null;
      GAMIFICATION_EVENTS.forEach(event => {
        socket.off(event);
      });
      socket.disconnect();
      setIsConnected(false);
    };
  }, [managedToken, handleGamificationEvent, user?.id]);

  return { isConnected };
};
