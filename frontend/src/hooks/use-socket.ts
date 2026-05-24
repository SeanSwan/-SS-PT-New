import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './use-toast';
import { logger } from '@/utils/logger';

// Flag to track the WebSocket server status
let webSocketServerAvailable: boolean | null = null;
// Flag to prevent multiple server checks
let webSocketServerCheckInProgress = false;

type SocketNotification = Record<string, any>;
type SocketMessage = any;
type ManagedSocket = WebSocket;

interface UseSocketOptions {
  maxReconnectAttempts?: number;
  reconnectIntervalMs?: number;
}

// Check if WebSocket server is available (do this once at module load time)
function checkWebSocketServerAvailability() {
  // Return cached result if we already checked
  if (webSocketServerAvailable !== null) {
    return Promise.resolve(webSocketServerAvailable);
  }
  
  // Prevent multiple simultaneous checks
  if (webSocketServerCheckInProgress) {
    return new Promise(resolve => {
      // Poll every 100ms for completion
      const checkInterval = setInterval(() => {
        if (webSocketServerAvailable !== null) {
          clearInterval(checkInterval);
          resolve(webSocketServerAvailable);
        }
      }, 100);
      
      // Safety timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        // If still no result, assume it's not available
        if (webSocketServerAvailable === null) {
          webSocketServerAvailable = false;
        }
        resolve(webSocketServerAvailable);
      }, 5000);
    });
  }
  
  webSocketServerCheckInProgress = true;
  
  return new Promise(resolve => {
    // Default to available in production
    if (process.env.NODE_ENV !== 'development') {
      webSocketServerAvailable = true;
      webSocketServerCheckInProgress = false;
      return resolve(true);
    }
    
    try {
      const testSocket = new WebSocket('ws://localhost:10000/ping');
      
      // Set a timeout to fail after 2 seconds
      const timeoutId = setTimeout(() => {
        webSocketServerAvailable = false;
        webSocketServerCheckInProgress = false;
        logger.log('WebSocket server check timed out - assuming not available');
        resolve(false);
      }, 2000);
      
      testSocket.onopen = () => {
        clearTimeout(timeoutId);
        webSocketServerAvailable = true;
        webSocketServerCheckInProgress = false;
        logger.log('WebSocket server is available');
        testSocket.close();
        resolve(true);
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeoutId);
        webSocketServerAvailable = false;
        webSocketServerCheckInProgress = false;
        logger.log('WebSocket server is not available');
        resolve(false);
      };
    } catch (error) {
      webSocketServerAvailable = false;
      webSocketServerCheckInProgress = false;
      logger.log('Error setting up WebSocket test connection:', error);
      resolve(false);
    }
  });
}

// Start the check immediately but only once, and skip in development mode
if (process.env.NODE_ENV !== 'development' && webSocketServerAvailable === null && !webSocketServerCheckInProgress) {
  checkWebSocketServerAvailability();
}

/**
 * Custom hook for managing WebSocket connections
 * @param {string} endpoint - WebSocket endpoint path (e.g., '/ws/admin-dashboard')
 * @param {Object} options - Configuration options
 * @returns {Object} WebSocket state and methods
 */
export function useSocket(endpoint = '', options: UseSocketOptions = {}) {
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState<ManagedSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<SocketMessage>(null);
  const [error, setError] = useState<string | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectIntervalMs = options.reconnectIntervalMs || 3000;
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [notifications, setNotifications] = useState<SocketNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [useMockSocket, setUseMockSocket] = useState(false);
  const connectionCheckCompletedRef = useRef(false);
  const isLegacyWsEndpoint = endpoint.startsWith('/ws/');

  // Custom message handler - keeps track of notifications
  const handleNotification = useCallback((notification: SocketNotification) => {
    if (notification?.type === 'notification') {
      setNotifications(prev => [notification, ...prev.slice(0, 49)]);
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // Mark notifications as read
  const markNotificationsAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Improved message handling with error boundaries
  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      // Try to parse as JSON first
      const parsedData = JSON.parse(event.data);
      setLastMessage(parsedData);
      
      // Handle notifications specifically
      if (parsedData.type === 'notification') {
        handleNotification(parsedData);
      }
    } catch (e) {
      // Handle plain text messages or parsing errors
      logger.log('Received non-JSON message:', event.data);
      setLastMessage({ type: 'text', data: event.data });
    }
  }, [handleNotification]);

  // Send message to WebSocket
  const sendMessage = useCallback((data: unknown) => {
    if (socket && isConnected) {
      if (typeof data === 'object') {
        socket.send(JSON.stringify(data));
      } else {
        socket.send(data as string | Blob | ArrayBufferLike | ArrayBufferView<ArrayBufferLike>);
      }
      return true;
    }
    return false;
  }, [socket, isConnected]);

  // Improved initialization to prevent reconnection loops
  useEffect(() => {
    if (!connectionCheckCompletedRef.current && isLegacyWsEndpoint) {
      connectionCheckCompletedRef.current = true;
      setUseMockSocket(false);
      setError('Legacy WebSocket endpoint is not implemented on the backend.');
      return;
    }
    
    // Otherwise do normal check
    if (!connectionCheckCompletedRef.current) {
      // Mark as completed immediately to prevent multiple checks
      connectionCheckCompletedRef.current = true;
      
      checkWebSocketServerAvailability().then(available => {
        setUseMockSocket(false);
        if (!available) {
          setError('WebSocket server is unavailable.');
        }
      }).catch(() => {
        setUseMockSocket(false);
        setError('WebSocket server availability check failed.');
      });
    }
  }, [isLegacyWsEndpoint]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (isLegacyWsEndpoint) {
      setSocket(null);
      setUseMockSocket(false);
      setIsConnected(false);
      setError('Legacy WebSocket endpoint is not implemented on the backend.');
      return null;
    }
    
    // For non-development environments, implement normal connection logic
    // Prevent repeated connection attempts if we already have a socket
    if (socket && isConnected) {
      return socket;
    }
    
    if (!isAuthenticated || !endpoint) return null;
    if (!token) {
      logger.log('WebSocket connection not attempted: No authentication token available');
      return null;
    }

    if (webSocketServerAvailable === false) {
      setSocket(null);
      setUseMockSocket(false);
      setIsConnected(false);
      setError('WebSocket server is unavailable.');
      return null;
    }

    // Otherwise, try real connection
    try {
      // Define socket URL based on environment - USE BACKEND URL for WebSocket
      const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL;
      const SOCKET_URL = process.env.NODE_ENV === 'development'
        ? 'ws://localhost:10000' // Local development backend port
        : backendUrl?.replace(/^http/, 'ws') || ((window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host);
      
      // Construct full WebSocket URL with authentication token
      const fullUrl = `${SOCKET_URL}${endpoint}${token ? `?token=${token}` : ''}`;
      logger.log(`Attempting WebSocket connection to ${endpoint}`);
      const newSocket = new WebSocket(fullUrl) as ManagedSocket;

      // Set up event handlers
      newSocket.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
        setIsReconnecting(false);
        logger.log(`WebSocket connected: ${endpoint}`);
      };

      newSocket.onmessage = handleWebSocketMessage;

      newSocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
      };

      newSocket.onclose = (event) => {
        setIsConnected(false);
        logger.log(`WebSocket closed: ${event.code} ${event.reason}`);

        // Attempt to reconnect if not closed cleanly and we haven't exceeded max attempts
        if (reconnectAttempts < maxReconnectAttempts && event.code !== 1000) {
          setIsReconnecting(true);
          setReconnectAttempts(prev => prev + 1);

          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          // Set reconnect timeout
          reconnectTimeoutRef.current = setTimeout(() => {
            logger.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
            connect();
          }, reconnectIntervalMs);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached');
          setIsReconnecting(false);

          toast({
            title: "Connection Error",
            description: "Real-time updates are unavailable. The page will continue using standard API refresh.",
            variant: "destructive",
          });
        }
      };

      setSocket(newSocket);
      return newSocket;
    } catch (err: any) {
      console.error('Error creating WebSocket:', err);
      setError(`Error creating WebSocket: ${err.message}`);
      setUseMockSocket(false);
      return null;
    }
  }, [isLegacyWsEndpoint, isAuthenticated, token, endpoint, reconnectAttempts, maxReconnectAttempts, reconnectIntervalMs, handleWebSocketMessage, toast, socket, isConnected]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (socket) {
      socket.close(1000, 'User initiated disconnect');
      setSocket(null);
      setIsConnected(false);
    }
    
    // Clear any reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, [socket]);

  // Connect on mount, disconnect on unmount, reconnect when auth changes
  useEffect(() => {
    // Skip connection if already connected
    if (socket && isConnected) {
      return () => {};
    }
    
    // Only try to connect if we have authentication and a token
    if (isAuthenticated && endpoint && token) {
      logger.log(`Attempting WebSocket connection to ${endpoint}`);
      const newSocket = connect();
      
      // Only set up ping if we have a valid socket
      if (newSocket) {
        // Set up ping interval for keeping connection alive
        const pingInterval = setInterval(() => {
          if (newSocket && newSocket.readyState === WebSocket.OPEN) {
            newSocket.send('ping');
          }
        }, 30000); // Send ping every 30 seconds
        
        return () => {
          clearInterval(pingInterval);
          disconnect();
        };
      }
    }
    
    // Return empty cleanup if we didn't connect
    return () => {};
  }, [isAuthenticated, endpoint, token, connect, disconnect, socket, isConnected]);

  return {
    socket,
    isConnected,
    isReconnecting,
    lastMessage,
    error,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts,
    notifications,
    unreadCount,
    markNotificationsAsRead,
    useMockSocket
  };
}
