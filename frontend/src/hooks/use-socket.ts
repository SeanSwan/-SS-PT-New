import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './use-toast';

// Flag to track the WebSocket server status
// Always set to false in development mode to prevent connection attempts
let webSocketServerAvailable = process.env.NODE_ENV === 'development' ? false : null;
// Flag to prevent multiple server checks
let webSocketServerCheckInProgress = false;

// Helper to create a mock WebSocket instance
function createMockWebSocket(verbose = false) {
  // Create an object that mimics the WebSocket interface
  const mockSocket = {
    readyState: 1, // WebSocket.OPEN (ALWAYS OPEN)
    isClosing: false, // Custom flag to track intentional close
    send: (data) => {
      if (verbose) console.log('Mock WebSocket: Message sent:', data);
      // For ping messages, simulate a pong response
      if (data === 'ping') {
        setTimeout(() => {
          if (mockSocket.onmessage && !mockSocket.isClosing) {
            mockSocket.onmessage({ data: 'pong' });
          }
        }, 100);
      }
      return true;
    },
    close: () => {
      if (verbose) console.log('Mock WebSocket: Close requested but staying open in mock mode');
      // In mock mode, we don't actually close - we just mark as closing
      // This prevents the reconnection loops
      mockSocket.isClosing = true;
      
      // We don't trigger onclose in mock mode to prevent reconnection loops
      // if (mockSocket.onclose) {
      //   mockSocket.onclose({ code: 1000, reason: 'Normal closure' });
      // }
    },
    // These will be set by the consumer
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null
  };
  
  // Simulate connection established
  setTimeout(() => {
    if (mockSocket.onopen) {
      mockSocket.onopen({ target: mockSocket });
    }
  }, 100);
  
  return mockSocket;
}

// Check if WebSocket server is available (do this once at module load time)
function checkWebSocketServerAvailability() {
  // In development mode, always assume WebSocket server is unavailable
  if (process.env.NODE_ENV === 'development') {
    webSocketServerAvailable = false;
    console.log('Development mode: Skipping WebSocket server availability check - WebSocket server set to unavailable');
    return Promise.resolve(false);
  }
  
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
        console.log('WebSocket server check timed out - assuming not available');
        resolve(false);
      }, 2000);
      
      testSocket.onopen = () => {
        clearTimeout(timeoutId);
        webSocketServerAvailable = true;
        webSocketServerCheckInProgress = false;
        console.log('WebSocket server is available');
        testSocket.close();
        resolve(true);
      };
      
      testSocket.onerror = () => {
        clearTimeout(timeoutId);
        webSocketServerAvailable = false;
        webSocketServerCheckInProgress = false;
        console.log('WebSocket server is not available - using mock WebSocket');
        resolve(false);
      };
    } catch (error) {
      webSocketServerAvailable = false;
      webSocketServerCheckInProgress = false;
      console.log('Error setting up WebSocket test connection:', error);
      resolve(false);
    }
  });
}

// Initialize flags for WebSocket server status - immediately in development mode
// This ensures no real WebSocket connections are attempted during development
if (process.env.NODE_ENV === 'development') {
  console.log('WebSocket Module Initialization: DEVELOPMENT MODE DETECTED - ALL WEBSOCKET CONNECTIONS DISABLED');
  // These settings will prevent any actual WebSocket connection attempts
  webSocketServerAvailable = false;
  
  // Set global flags if window is available (client-side)
  if (typeof window !== 'undefined') {
    window.REACT_APP_FORCE_MOCK_WEBSOCKET = 'true';
    window.REACT_APP_MOCK_WEBSOCKET = 'true';
    console.log('WebSocket Module: Global mock WebSocket flags set');
  }
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
export function useSocket(endpoint = '', options = {}) {
  const { isAuthenticated, token } = useAuth();
  const { toast } = useToast();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectIntervalMs = options.reconnectIntervalMs || 3000;
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [useMockSocket, setUseMockSocket] = useState(false);
  const connectionCheckCompletedRef = useRef(false);

  // Custom message handler - keeps track of notifications
  const handleNotification = useCallback((notification) => {
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
  const handleWebSocketMessage = useCallback((event) => {
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
      console.log('Received non-JSON message:', event.data);
      setLastMessage({ type: 'text', data: event.data });
    }
  }, [handleNotification]);

  // Send message to WebSocket
  const sendMessage = useCallback((data) => {
    if (socket && isConnected) {
      if (typeof data === 'object') {
        socket.send(JSON.stringify(data));
      } else {
        socket.send(data);
      }
      return true;
    }
    return false;
  }, [socket, isConnected]);

  // Improved initialization to prevent reconnection loops
  useEffect(() => {
    // Initialize mock socket immediately if manually set
    if ((!connectionCheckCompletedRef.current) && 
        (typeof window !== 'undefined' && window.REACT_APP_FORCE_MOCK_WEBSOCKET === 'true')) {
      connectionCheckCompletedRef.current = true;
      setUseMockSocket(true);
      // Skip server check - we're forcing mock mode
      return;
    }
    
    // Otherwise do normal check
    if (!connectionCheckCompletedRef.current) {
      // Mark as completed immediately to prevent multiple checks
      connectionCheckCompletedRef.current = true;
      
      checkWebSocketServerAvailability().then(available => {
        setUseMockSocket(!available);
      }).catch(() => {
        // Fallback in case of error
        setUseMockSocket(true);
      });
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    // Skip connecting to real server in development mode
    // Always use mock socket instead for stability
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Using mock WebSocket exclusively');
      const mockSocket = createMockWebSocket(false);
      setSocket(mockSocket);
      setUseMockSocket(true);
      setIsConnected(true);
      setError(null); // Clear any previous errors
      return mockSocket;
    }
    
    // For non-development environments, implement normal connection logic
    // Prevent repeated connection attempts if we already have a socket
    if (socket && isConnected) {
      return socket;
    }
    
    if (!isAuthenticated || !endpoint) return null;
    if (!token) {
      console.log('WebSocket connection not attempted: No authentication token available');
      return null;
    }

    // If we already know the server is unavailable, or if it's manually set to mock mode
    if (useMockSocket || webSocketServerAvailable === false || 
        (typeof window !== 'undefined' && window.REACT_APP_FORCE_MOCK_WEBSOCKET === 'true')) {
      // Don't create a new mock socket if we already have one
      if (socket && socket.readyState === 1) { // OPEN
        // Already have an open socket (real or mock)
        return socket;
      }
      console.log('Using mock WebSocket for endpoint:', endpoint);
      // Only create verbose mock sockets in development
      const mockSocket = createMockWebSocket(process.env.NODE_ENV === 'development' && reconnectAttempts === 0);
      setSocket(mockSocket);
      setIsConnected(true); // Ensure we mark mock sockets as connected
      return mockSocket;
    }

    // Otherwise, try real connection
    try {
      // Define socket URL based on environment - USE VITE_API_BASE_URL for consistency
      const SOCKET_URL = process.env.NODE_ENV === 'development' 
        ? 'ws://localhost:10000' // Local development backend port
        : (window.location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + window.location.host; // Same host as frontend in production
      
      // Construct full WebSocket URL with authentication token
      const fullUrl = `${SOCKET_URL}${endpoint}${token ? `?token=${token}` : ''}`;
      console.log(`Attempting WebSocket connection to ${endpoint}`);
      const newSocket = new WebSocket(fullUrl);

      // Set up event handlers
      newSocket.onopen = () => {
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
        setIsReconnecting(false);
        console.log(`WebSocket connected: ${endpoint}`);
      };

      newSocket.onmessage = handleWebSocketMessage;

      newSocket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError('WebSocket connection error');
        
        // If this is our first attempt and it fails, switch to mock mode for future attempts
        if (reconnectAttempts === 0) {
          setUseMockSocket(true);
        }
      };

      newSocket.onclose = (event) => {
        // Only attempt reconnection if this is a real WebSocket, not a mock
        if (!useMockSocket) {
          setIsConnected(false);
          console.log(`WebSocket closed: ${event.code} ${event.reason}`);

          // If this is our first attempt and it fails cleanly, switch to mock mode for future attempts
          if (reconnectAttempts === 0) {
            setUseMockSocket(true);
            // Create a mock socket immediately to prevent reconnection attempts
            const mockSocket = createMockWebSocket(false); // Silent mock
            setSocket(mockSocket);
            setIsConnected(true);
            return; // Skip reconnection logic
          }

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
              console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${maxReconnectAttempts})...`);
              connect();
            }, reconnectIntervalMs);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            setError('Maximum reconnection attempts reached');
            setIsReconnecting(false);
            
            // Only show toast for real connection failures, not mock sockets
            if (!useMockSocket) {
              toast({
                title: "Connection Error",
                description: "Could not maintain connection to server. Using mock data.",
                variant: "destructive",
              });
            }
            
            // Switch to mock mode after max retries
            setUseMockSocket(true);
            // Create a mock socket immediately to prevent reconnection attempts
            const mockSocket = createMockWebSocket(false); // Silent mock
            setSocket(mockSocket);
            setIsConnected(true);
          }
        } else {
          // For mock sockets, we ignore real close events to prevent reconnection loops
          console.log('Mock socket close event ignored to prevent reconnection loops');
        }
      };

      setSocket(newSocket);
      return newSocket;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError(`Error creating WebSocket: ${err.message}`);
      setUseMockSocket(true);
      return null;
    }
  }, [isAuthenticated, token, endpoint, reconnectAttempts, maxReconnectAttempts, reconnectIntervalMs, handleWebSocketMessage, toast, useMockSocket]);

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
    // Skip connection if already connected or using mock socket
    if ((socket && isConnected) || (useMockSocket && socket)) {
      return () => {};
    }
    
    // Only try to connect if we have authentication AND a token (or we're using mock)
    if (isAuthenticated && endpoint && (token || useMockSocket)) {
      console.log(`Attempting WebSocket connection to ${endpoint}`);
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
  }, [isAuthenticated, endpoint, token, connect, disconnect, useMockSocket, socket, isConnected]);

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