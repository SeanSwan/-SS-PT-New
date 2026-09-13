/**
 * Singleton Socket.IO connection manager for realtime messaging.
 *
 * The socket follows the canonical ProductionTokenManager lifecycle. A hook
 * may unmount while dynamic socket creation is pending, so every async result
 * is generation-checked before it becomes shared state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from '@/utils/realtimeSocketUrl';
import { ProductionTokenManager } from '@/services/productionTokenManager';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

let globalSocket: Socket | null = null;
let currentToken: string | null = null;
let ownerCount = 0;
let socketGeneration = 0;
let globalCreateToken: string | null = null;
let globalCreatePromise: Promise<Socket | null> | null = null;

function getSocketUrl(): string {
  return resolveRealtimeSocketUrl();
}

function disposeGlobalSocket(): void {
  socketGeneration += 1;
  globalCreatePromise = null;
  globalCreateToken = null;
  if (globalSocket) {
    globalSocket.removeAllListeners();
    globalSocket.disconnect();
  }
  globalSocket = null;
  currentToken = null;
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

async function ensureSocket(token: string): Promise<Socket | null> {
  // Socket.IO reports disconnected while connecting or waiting to reconnect.
  // Those states still belong to the same shared socket and its existing owners.
  if (globalSocket && currentToken === token) return globalSocket;
  if (globalSocket || (globalCreatePromise && globalCreateToken !== token)) disposeGlobalSocket();
  if (globalCreatePromise && globalCreateToken === token) return globalCreatePromise;

  const generation = ++socketGeneration;
  globalCreateToken = token;
  const promise = createSocket(token)
    .then((socket) => {
      if (generation !== socketGeneration || ProductionTokenManager.getToken() !== token) {
        socket.disconnect();
        return null;
      }
      globalSocket = socket;
      currentToken = token;
      return socket;
    })
    .catch((error: unknown) => {
      console.warn('[Socket] Could not create messaging connection:', error instanceof Error ? error.message : 'unknown error');
      return null;
    })
    .finally(() => {
      if (globalCreatePromise === promise) {
        globalCreatePromise = null;
        globalCreateToken = null;
      }
    });
  globalCreatePromise = promise;
  return promise;
}

export function useSocket() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const mountedRef = useRef(true);
  const socketRef = useRef<Socket | null>(null);
  const ownerSocketRef = useRef<Socket | null>(null);
  const ownerCleanupRef = useRef<(() => void) | null>(null);
  const cancelledRef = useRef(false);

  const detachOwner = useCallback(() => {
    const socket = ownerSocketRef.current;
    if (!socket) return;
    ownerSocketRef.current = null;
    socketRef.current = null;
    ownerCount = Math.max(0, ownerCount - 1);
    if (ownerCount === 0 && socket === globalSocket) disposeGlobalSocket();
  }, []);

  const detachOwnerWithListeners = useCallback(() => {
    ownerCleanupRef.current?.();
    ownerCleanupRef.current = null;
    detachOwner();
  }, [detachOwner]);

  const attachForToken = useCallback(async (token: string) => {
    if (cancelledRef.current || !mountedRef.current) return;
    setConnectionState('connecting');
    const socket = await ensureSocket(token);
    if (!socket || cancelledRef.current || !mountedRef.current || ProductionTokenManager.getToken() !== token) {
      if (socket && ownerCount === 0 && socket === globalSocket) disposeGlobalSocket();
      if (!cancelledRef.current && mountedRef.current) setConnectionState('disconnected');
      return;
    }

    if (ownerSocketRef.current === socket) return;
    detachOwnerWithListeners();
    if (cancelledRef.current || !mountedRef.current) {
      if (ownerCount === 0 && socket === globalSocket) disposeGlobalSocket();
      return;
    }

    ownerSocketRef.current = socket;
    socketRef.current = socket;
    ownerCount += 1;

    const onConnect = () => {
      if (mountedRef.current && !cancelledRef.current) setConnectionState('connected');
    };
    const onDisconnect = () => {
      if (mountedRef.current && !cancelledRef.current) setConnectionState('disconnected');
    };
    const onReconnecting = () => {
      if (mountedRef.current && !cancelledRef.current) setConnectionState('reconnecting');
    };
    const onError = (error: Error) => {
      console.warn('[Socket] Connection error:', error.message);
      if (mountedRef.current && !cancelledRef.current) setConnectionState('disconnected');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.io.on('reconnect_attempt', onReconnecting);
    socket.on('connect_error', onError);
    if (socket.connected && !cancelledRef.current) setConnectionState('connected');

    ownerCleanupRef.current = () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.io.off('reconnect_attempt', onReconnecting);
      socket.off('connect_error', onError);
    };
  }, [detachOwnerWithListeners]);

  useEffect(() => {
    mountedRef.current = true;
    cancelledRef.current = false;

    const unsubscribe = ProductionTokenManager.subscribe((token) => {
      if (cancelledRef.current) return;
      if (!token) {
        detachOwnerWithListeners();
        setConnectionState('disconnected');
        return;
      }
      if (token !== currentToken) {
        detachOwnerWithListeners();
        void attachForToken(token);
      }
    });

    const token = ProductionTokenManager.getToken();
    if (token) void attachForToken(token);
    else setConnectionState('disconnected');

    return () => {
      cancelledRef.current = true;
      mountedRef.current = false;
      unsubscribe();
      detachOwnerWithListeners();
    };
  }, [attachForToken, detachOwnerWithListeners]);

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) socketRef.current.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const socket = socketRef.current;
    socket?.on(event, handler);
    return () => socket?.off(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    connected: connectionState === 'connected',
    connectionState,
    emit,
    on,
    off,
  };
}
