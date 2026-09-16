import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import { logger } from '@/utils/logger';
import { isUnsignedJwtToken } from '@/utils/jwtTokenShape';
import {
  resolveRealtimeSocketTransportOptions,
  resolveRealtimeSocketUrl,
} from '@/utils/realtimeSocketUrl';
import { useAuth } from './AuthContext';
import { ProductionTokenManager } from '../services/productionTokenManager';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

const getSocketBaseUrl = () => resolveRealtimeSocketUrl();

const subscribeToCanonicalToken = (onStoreChange: () => void): (() => void) =>
  ProductionTokenManager.subscribe(() => onStoreChange());
const getCanonicalToken = (): string | null => ProductionTokenManager.getToken();
const getServerCanonicalToken = (): string | null => null;

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const token = useSyncExternalStore(
    subscribeToCanonicalToken,
    getCanonicalToken,
    getServerCanonicalToken,
  );
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const activeSocketRef = useRef<Socket | null>(null);
  const socketGenerationRef = useRef(0);

  useEffect(() => {
    const generation = socketGenerationRef.current + 1;
    socketGenerationRef.current = generation;

    if (!isAuthenticated || !token) {
      activeSocketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (isUnsignedJwtToken(token)) {
      activeSocketRef.current = null;
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
    activeSocketRef.current = socketInstance;

    const isCurrentSocket = () =>
      socketGenerationRef.current === generation && activeSocketRef.current === socketInstance;

    const onConnect = () => {
      if (!isCurrentSocket()) return;
      socketInstance.emit('authenticate', { token });
    };

    const onAuthenticated = () => {
      if (!isCurrentSocket()) return;
      setIsConnected(Boolean(true));
    };

    const onAuthError = (error: unknown) => {
      if (!isCurrentSocket()) return;
      logger.warn('[Socket] Authentication failed:', error);
      setIsConnected(false);
      socketInstance.disconnect();
    };

    const onDisconnect = () => {
      if (!isCurrentSocket()) return;
      setIsConnected(false);
    };

    socketInstance.on('connect', onConnect);
    socketInstance.on('authenticated', onAuthenticated);
    socketInstance.on('auth_error', onAuthError);
    socketInstance.on('disconnect', onDisconnect);

    setSocket(socketInstance);

    return () => {
      const wasCurrentSocket = activeSocketRef.current === socketInstance;
      if (wasCurrentSocket) activeSocketRef.current = null;
      socketInstance.off('connect', onConnect);
      socketInstance.off('authenticated', onAuthenticated);
      socketInstance.off('auth_error', onAuthError);
      socketInstance.off('disconnect', onDisconnect);
      socketInstance.disconnect();
      if (wasCurrentSocket) {
        setSocket((currentSocket) => currentSocket === socketInstance ? null : currentSocket);
        setIsConnected(false);
      }
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
