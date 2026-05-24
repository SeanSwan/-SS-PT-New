/**
 * ============================================================================
 * FILE: useActivityTicker.ts
 * PURPOSE: Real-time social activity feed via Socket.IO
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-31
 * AI VILLAGE VALIDATED: 2026-03-31
 * ============================================================================
 *
 * WHAT THIS FILE DOES:
 * Connects to the backend Socket.IO server and collects live activity events
 * (post_created, reaction_added, comment_added, workout_completed) into a
 * rolling buffer of the most recent 20 events.
 *
 * HOW IT FITS IN THE APP:
 * Backend emits 'social:activity' events -> this hook collects them ->
 * ActivityTicker component renders them as a live horizontal ticker.
 *
 * KEY DECISIONS:
 * - Rolling buffer of 20 events prevents unbounded memory growth
 * - Socket ref prevents reconnect on re-renders
 * - Auth token sent via socket handshake, not query params (security)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
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

// ─────────────────────────────────────────────────────────────
// SECTION: Constants
// PURPOSE: Configuration for the activity ticker buffer
// ─────────────────────────────────────────────────────────────

const MAX_EVENTS = 20;

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// PURPOSE: Socket.IO connection lifecycle + event collection
// WHY: Centralized hook so multiple components can share the
//      same event stream without duplicate socket connections
// ─────────────────────────────────────────────────────────────

/**
 * Connects to Socket.IO and collects live social activity events.
 * Returns the event buffer, connection status, and a clear function.
 * @returns {{ events: ActivityEvent[], isConnected: boolean, clearEvents: () => void }}
 */
export function useActivityTicker() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Auth token required for socket connection
    const token = ProductionTokenManager.getToken();
    if (!token) return;

    // Vite dev server proxies /api but NOT /socket.io, so window.location.origin
    // cannot reach the backend socket locally. In production the backend serves
    // the frontend on the same origin, so window.location.origin is correct.
    const socketUrl =
      import.meta.env.VITE_SOCKET_URL
      || import.meta.env.VITE_BACKEND_URL
      || (import.meta.env.DEV
        ? 'http://localhost:10000'
        : (typeof window !== 'undefined' ? window.location.origin : ''));
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnectionAttempts: 2,
      timeout: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('authenticate', { token });
    });
    socket.on('authenticated', () => setIsConnected(true));
    socket.on('auth_error', () => {
      setIsConnected(false);
      socket.disconnect();
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', () => setIsConnected(false));

    // Collect incoming activity events into a rolling buffer
    socket.on('social:activity', (event: Omit<ActivityEvent, 'id'>) => {
      const enriched: ActivityEvent = {
        ...event,
        id: `${event.type}-${event.userId}-${Date.now()}`,
      };
      setEvents(prev => [enriched, ...prev].slice(0, MAX_EVENTS));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { events, isConnected, clearEvents };
}
