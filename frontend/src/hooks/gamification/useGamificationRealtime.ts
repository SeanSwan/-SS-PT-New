import { useCallback, useEffect, useRef, useState } from 'react';
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
  points?: unknown;
  xpEarned?: unknown;
  newLevel?: unknown;
  previousLevel?: unknown;
};

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

export const normalizeRealtimeXp = (value: unknown): number => {
  const points = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d+(\.\d+)?$/.test(value.trim())
      ? Number(value.trim())
      : 0;
  if (!Number.isFinite(points) || points <= 0) return 0;
  const rounded = Math.round(points);
  return Number.isSafeInteger(rounded) ? rounded : 0;
};

export const useGamificationRealtime = () => {
  const { token: authToken, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const celebration = useCelebrationOptional();
  const [isConnected, setIsConnected] = useState(false);

  // Hold celebration in a ref so the sound-mute/retro toggles (which change the
  // memoized celebration API identity) don't churn the handler → socket reconnect.
  const celebrationRef = useRef(celebration);
  celebrationRef.current = celebration;

  const handleGamificationEvent = useCallback((
    event: GamificationRealtimeEvent,
    data: GamificationRealtimePayload,
  ) => {
    if (!user?.id || String(data?.userId ?? '') !== String(user.id)) return;

    void queryClient.invalidateQueries({ queryKey: ['gamification'] });

    // A level-up gets the FULL celebration (CelebrationPortal fireworks +
    // gold takeover) instead of a plain toast — the overlay owns the moment.
    // Malformed payloads (no usable newLevel) fall through to the toast.
    if (event === 'gamification:level_up' && celebrationRef.current) {
      const newLevel = normalizeRealtimeXp(data.newLevel);
      if (newLevel > 0) {
        celebrationRef.current.triggerLevelUp(newLevel);
        return;
      }
    }

    const points = normalizeRealtimeXp(data.points ?? data.xpEarned);
    toast({
      title: eventTitle(event),
      description: points > 0
        ? `Your rewards profile refreshed with ${points} XP.`
        : 'Your rewards profile has fresh progress.',
      variant: 'default',
    });
  }, [queryClient, toast, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setIsConnected(false);
      return;
    }

    const token = authToken || ProductionTokenManager.getToken();
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

    socket.on('connect', () => {
      socket.emit('authenticate', { token });
    });
    socket.on('authenticated', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));
    socket.on('auth_error', () => {
      setIsConnected(false);
      socket.disconnect();
    });

    GAMIFICATION_EVENTS.forEach(event => {
      socket.on(event, data => handleGamificationEvent(event, data));
    });

    return () => {
      GAMIFICATION_EVENTS.forEach(event => {
        socket.off(event);
      });
      socket.disconnect();
      setIsConnected(false);
    };
  }, [authToken, handleGamificationEvent, user?.id]);

  return { isConnected };
};
