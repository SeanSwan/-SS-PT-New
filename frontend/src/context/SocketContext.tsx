import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/utils/logger';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

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

    const socketInstance = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:10000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      upgrade: true,
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
