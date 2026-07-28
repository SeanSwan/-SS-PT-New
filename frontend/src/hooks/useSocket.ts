/**
 * ============================================================================
 * FILE: useSocket.ts
 * PURPOSE: Singleton Socket.IO connection manager for real-time messaging
 * AUTHOR: Claude Opus 4.6 | LAST MODIFIED: 2026-03-29
 * AI VILLAGE VALIDATED: 2026-03-29 (11-Brain Consensus fixes applied)
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Provides a React hook that manages a single Socket.IO
 * connection per session. Auto-connects with JWT auth, handles token refresh,
 * reconnects on auth changes, and exposes the socket instance + connection state.
 *
 * AI VILLAGE FIXES APPLIED:
 * - Token refresh handling via custom event listener (Issue #5)
 * - Ref-based socket access to prevent stale closures (Issue from Architecture)
 * - Connection state enum: connecting/connected/disconnected/reconnecting
 * - Proper listener cleanup to prevent accumulation (Performance Critical)
 * - Dynamic import of socket.io-client for bundle size (Performance Medium)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Socket } from 'socket.io-client';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from '@/utils/realtimeSocketUrl';

// ─────────────────────────────────────────────────────────────
// SECTION: Types
// ─────────────────────────────────────────────────────────────
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

// ─────────────────────────────────────────────────────────────
// SECTION: Singleton socket reference (shared across all hook consumers)
// ─────────────────────────────────────────────────────────────
let globalSocket: Socket | null = null;
let refCount = 0;
let currentToken: string | null = null;

function getSocketUrl(): string {
  return resolveRealtimeSocketUrl();
}

async function createSocket(token: string): Promise<Socket> {
  const { io } = await import('socket.io-client');
  const socketUrl = getSocketUrl();
  return io(`${socketUrl}/messaging`, {
    auth: { token },
    ...resolveRealtimeSocketTransportOptions(socketUrl),
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 10000,
  });
}

// ─────────────────────────────────────────────────────────────
// SECTION: Hook
// ─────────────────────────────────────────────────────────────
export function useSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const mountedRef = useRef(true);
  const socketRef = useRef<Socket | null>(null);

  // Keep ref in sync with global
  socketRef.current = globalSocket;

  useEffect(() => {
    mountedRef.current = true;
    const token = localStorage.getItem('token');

    if (!token) {
      if (mountedRef.current) setConnectionState('disconnected');
      return;
    }

    let isCancelled = false;

    const initSocket = async () => {
      // Only create if no socket or token changed
      if (!globalSocket || globalSocket.disconnected || currentToken !== token) {
        // Clean up existing socket if token changed
        if (globalSocket && currentToken !== token) {
          globalSocket.removeAllListeners();
          globalSocket.disconnect();
          globalSocket = null;
        }

        if (!isCancelled && mountedRef.current) {
          setConnectionState('connecting');
        }

        currentToken = token;
        globalSocket = await createSocket(token);
        socketRef.current = globalSocket;
      }

      const socket = globalSocket;
      if (!socket || isCancelled) return;

      refCount++;

      const onConnect = () => {
        if (mountedRef.current && !isCancelled) setConnectionState('connected');
      };
      const onDisconnect = () => {
        if (mountedRef.current && !isCancelled) setConnectionState('disconnected');
      };
      const onReconnecting = () => {
        if (mountedRef.current && !isCancelled) setConnectionState('reconnecting');
      };
      const onError = (err: Error) => {
        console.warn('[Socket] Connection error:', err.message);
        if (mountedRef.current && !isCancelled) setConnectionState('disconnected');
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('reconnect_attempt', onReconnecting);
      socket.on('connect_error', onError);

      if (socket.connected && !isCancelled) setConnectionState('connected');

      // Token refresh handler — update socket auth when token changes
      const handleTokenRefresh = () => {
        const newToken = localStorage.getItem('token');
        if (globalSocket && newToken && newToken !== currentToken) {
          currentToken = newToken;
          globalSocket.auth = { token: newToken };
          if (globalSocket.disconnected) {
            globalSocket.connect();
          }
        }
      };

      window.addEventListener('token_refreshed', handleTokenRefresh);

      // Store cleanup for this effect
      return () => {
        isCancelled = true;
        window.removeEventListener('token_refreshed', handleTokenRefresh);
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('reconnect_attempt', onReconnecting);
        socket.off('connect_error', onError);

        refCount--;
        if (refCount <= 0 && globalSocket) {
          globalSocket.removeAllListeners();
          globalSocket.disconnect();
          globalSocket = null;
          socketRef.current = null;
          currentToken = null;
          refCount = 0;
        }
      };
    };

    let cleanupFn: (() => void) | undefined;
    initSocket().then(cleanup => { cleanupFn = cleanup; });

    return () => {
      mountedRef.current = false;
      isCancelled = true;
      cleanupFn?.();
    };
  }, []);

  const connected = connectionState === 'connected';

  // Use refs for stable socket access — prevents stale closure bugs
  const emit = useCallback((event: string, data?: unknown, ack?: (...args: unknown[]) => void) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data, ack);
    }
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const socket = socketRef.current;
    socket?.on(event, handler);
    return () => {
      socket?.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    connectionState,
    emit,
    on,
    off,
  };
}
