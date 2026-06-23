/**
 * ============================================================================
 * FILE: useActivityTicker.ts
 * PURPOSE: Real-time social activity feed via Socket.IO (shared singleton)
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-06-11
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Connects to the backend Socket.IO server and collects live activity events
 * (post_created, reaction_added, comment_added, workout_completed) into a
 * rolling buffer of the most recent 20 events.
 *
 * HOW IT FITS IN THE APP:
 * Backend emits 'social:activity' events -> this hook collects them ->
 * ActivityTicker + the /social right rail render them.
 *
 * KEY DECISIONS:
 * - MODULE-LEVEL SINGLETON (2026-06-11, merge M3): one socket is shared by ALL
 *   consumers via ref-counting + a listener set. Previously each useActivityTicker()
 *   call opened its own socket — the "centralized" comment was aspirational. Now
 *   the feed view model AND the right rail share one connection; the socket opens
 *   on the first mount and closes when the last consumer unmounts.
 * - Rolling buffer of 20 events prevents unbounded memory growth.
 * - Auth token sent via socket handshake, not query params (security).
 */

import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from '@/utils/realtimeSocketUrl';
import { isUnsignedJwtToken } from '@/utils/jwtTokenShape';
import { ProductionTokenManager } from '../../services/api.service';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// PURPOSE: Activity event shape matching backend emission format
// ─────────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  type: 'post_created' | 'reaction_added' | 'comment_added' | 'workout_completed' | 'streak_milestone' | 'achievement_unlocked';
  userId: number;
  userName?: string;
  userPhoto?: string;
  postType?: string;
  postId?: number;
  reactionType?: string;
  preview?: string;
  timestamp: string;
}

const MAX_EVENTS = 20;

// ─────────────────────────────────────────────────────────────
// SECTION: Module-level singleton state (shared across consumers)
// ─────────────────────────────────────────────────────────────

let sharedSocket: Socket | null = null;
let refCount = 0;
let sharedEvents: ActivityEvent[] = [];
let sharedConnected = false;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

function startSocket(): void {
  const token = ProductionTokenManager.getToken();
  if (!token || sharedSocket || isUnsignedJwtToken(token)) return;

  const socketUrl = resolveRealtimeSocketUrl();
  const transportOptions = resolveRealtimeSocketTransportOptions(socketUrl);
  const socket = io(socketUrl, {
    auth: { token },
    ...transportOptions,
    reconnectionAttempts: 2,
    timeout: 5000,
  });
  sharedSocket = socket;

  socket.on('connect', () => socket.emit('authenticate', { token }));
  socket.on('authenticated', () => { sharedConnected = true; notify(); });
  socket.on('auth_error', () => { sharedConnected = false; notify(); socket.disconnect(); });
  socket.on('disconnect', () => { sharedConnected = false; notify(); });
  socket.on('connect_error', () => { sharedConnected = false; notify(); });

  socket.on('social:activity', (event: Omit<ActivityEvent, 'id'>) => {
    const enriched: ActivityEvent = {
      ...event,
      id: `${event.type}-${event.userId}-${Date.now()}`,
    };
    sharedEvents = [enriched, ...sharedEvents].slice(0, MAX_EVENTS);
    notify();
  });
}

function stopSocket(): void {
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }
  sharedConnected = false;
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook — subscribes to the shared stream
// ─────────────────────────────────────────────────────────────

/**
 * Connects to the shared Socket.IO activity stream and re-renders on new events.
 * Multiple components can call this; they share ONE socket connection.
 * @returns {{ events: ActivityEvent[], isConnected: boolean, clearEvents: () => void }}
 */
export function useActivityTicker() {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);
    refCount += 1;
    if (refCount === 1) startSocket();

    return () => {
      listeners.delete(listener);
      refCount -= 1;
      if (refCount === 0) stopSocket();
    };
  }, []);

  const clearEvents = useCallback(() => { sharedEvents = []; notify(); }, []);

  return { events: sharedEvents, isConnected: sharedConnected, clearEvents };
}
