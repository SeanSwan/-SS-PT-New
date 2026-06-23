import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/utils/logger';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from '@/utils/realtimeSocketUrl';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

const decodeJwtHeader = (value: string): Record<string, unknown> | null => {
  const [encodedHeader] = value.split('.');
  if (!encodedHeader) return null;

  try {
    const normalized = encodedHeader.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = JSON.parse(atob(padded));
    return decoded && typeof decoded === 'object' ? decoded : null;
  } catch {
    return null;
  }
};

const isUnsignedJwtToken = (value: string) => {
  const header = decodeJwtHeader(value);
  return String(header?.alg || '').toLowerCase() === 'none';
};

const getSocketBaseUrl = () => resolveRealtimeSocketUrl();

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (isUnsignedJwtToken(token)) {
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketUrl = getSocketBaseUrl();
    const transportOptions = resolveRealtimeSocketTransportOptions(socketUrl);
    const socketInstance = io(socketUrl, {
      auth: { token },
      ...transportOptions,
      withCredentials: true,
    });

    socketInstance.on('connect', () => {
      socketInstance.emit('authenticate', { token });
    });

    socketInstance.on('authenticated', () => {
      setIsConnected(Boolean(true));
    });

    socketInstance.on('auth_error', (error) => {
      logger.warn('[Socket] Authentication failed:', error);
      setIsConnected(false);
      socketInstance.disconnect();
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
