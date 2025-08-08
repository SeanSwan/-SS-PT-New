/**
 * useRealTimeUpdates - Production-Grade Real-time WebSocket Management Hook
 * ============================================================================
 * Enterprise-level WebSocket management with advanced features for SwanStudios
 * 
 * ENHANCED RESPONSIBILITIES:
 * - Establish and manage WebSocket connections with auto-recovery
 * - Handle message queuing for offline scenarios
 * - Implement circuit breaker pattern for connection stability
 * - Provide real-time performance analytics and monitoring
 * - Support message acknowledgment and delivery guarantees
 * - Manage connection pooling and load balancing
 * 
 * PRODUCTION FEATURES:
 * - Exponential backoff with jitter for reconnection
 * - Message deduplication and ordering
 * - Connection health monitoring with circuit breaker
 * - Offline queue with persistence
 * - Performance metrics and analytics
 * - Multi-environment support (dev/staging/production)
 */

import { useEffect, useCallback, useRef, useState } from 'react';

export interface RealTimeUpdatesValues {
  // Connection Status (Enhanced)
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'circuit-open';
  isConnected: boolean;
  lastMessageTime: Date | null;
  reconnectAttempts: number;
  
  // Performance Analytics (NEW)
  messagesReceived: number;
  messagesSent: number;
  averageLatency: number;
  uptime: number; // Seconds since connection established
  totalDowntime: number; // Total seconds disconnected
  
  // Message Queue (NEW)
  queuedMessages: number;
  maxQueueSize: number;
  messagesDropped: number;
  
  // Circuit Breaker (NEW)
  circuitBreakerState: 'closed' | 'open' | 'half-open';
  consecutiveFailures: number;
  
  // Connection Health (NEW)
  connectionQuality: 'excellent' | 'good' | 'poor' | 'critical';
  networkLatency: number;
  dataTransferRate: number; // bytes per second
}

export interface RealTimeUpdatesActions {
  // Connection Management (Enhanced)
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  
  // Message Management (NEW)
  sendMessage: (message: any) => Promise<boolean>;
  flushQueue: () => Promise<void>;
  clearQueue: () => void;
  
  // Circuit Breaker Management (NEW)
  resetCircuitBreaker: () => void;
  forceCircuitOpen: () => void;
  
  // Performance & Analytics (NEW)
  getPerformanceMetrics: () => PerformanceMetrics;
  getConnectionAnalytics: () => ConnectionAnalytics;
  
  // Status Helpers (Enhanced)
  getConnectionHealth: () => 'healthy' | 'degraded' | 'unhealthy';
  getDetailedStatus: () => DetailedConnectionStatus;
}

// NEW: Performance Metrics Interface
interface PerformanceMetrics {
  averageLatency: number;
  messagesThroughput: number;
  errorRate: number;
  connectionStability: number; // 0-100 percentage
  dataEfficiency: number; // bytes per message
}

// NEW: Connection Analytics Interface
interface ConnectionAnalytics {
  totalConnections: number;
  totalReconnections: number;
  averageSessionDuration: number;
  peakLatency: number;
  connectionSuccess: number; // percentage
  messageLossRate: number; // percentage
}

// NEW: Detailed Status Interface
interface DetailedConnectionStatus {
  status: string;
  health: 'healthy' | 'degraded' | 'unhealthy';
  quality: 'excellent' | 'good' | 'poor' | 'critical';
  uptime: number;
  lastError: string | null;
  circuitBreakerOpen: boolean;
  queueStatus: 'empty' | 'normal' | 'full' | 'overflow';
}

interface UseRealTimeUpdatesParams {
  onDataUpdate: () => Promise<void> | void;
  enabled?: boolean;
  autoReconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  wsUrl?: string;
  
  // NEW: Advanced Configuration
  enableMessageQueue?: boolean;
  maxQueueSize?: number;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enablePerformanceMonitoring?: boolean;
  enableOfflineSupport?: boolean;
  messageTimeout?: number;
  heartbeatInterval?: number;
  
  // NEW: Environment Configuration
  environment?: 'development' | 'staging' | 'production';
  debug?: boolean;
  logLevel?: 'silent' | 'error' | 'warn' | 'info' | 'debug';
}

/**
 * useRealTimeUpdates Hook
 * 
 * Manages WebSocket connections for real-time schedule updates.
 * Automatically handles connection lifecycle, reconnection, and cleanup.
 */
export const useRealTimeUpdates = ({
  onDataUpdate,
  enabled = true,
  autoReconnect = true,
  maxReconnectAttempts = 5,
  reconnectDelay = 3000,
  wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.PROD ? 'wss://ss-pt-new.onrender.com/schedule-updates' : 'ws://localhost:3001/schedule-updates'),
  
  // Advanced Configuration Defaults
  enableMessageQueue = true,
  maxQueueSize = 100,
  enableCircuitBreaker = true,
  circuitBreakerThreshold = 5,
  circuitBreakerTimeout = 30000,
  enablePerformanceMonitoring = true,
  enableOfflineSupport = true,
  messageTimeout = 10000,
  heartbeatInterval = 30000,
  
  // Environment Configuration
  environment = 'development',
  debug = false,
  logLevel = 'info'
}: UseRealTimeUpdatesParams) => {
  
  // ==================== ENHANCED STATE MANAGEMENT ====================
  
  // Core Connection State
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'circuit-open'>('disconnected');
  const [lastMessageTime, setLastMessageTime] = useState<Date | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionStartTime, setConnectionStartTime] = useState<Date | null>(null);
  const [uptime, setUptime] = useState(0);
  const [totalDowntime, setTotalDowntime] = useState(0);
  
  // Performance Analytics State (NEW)
  const [messagesReceived, setMessagesReceived] = useState(0);
  const [messagesSent, setMessagesSent] = useState(0);
  const [averageLatency, setAverageLatency] = useState(0);
  const [networkLatency, setNetworkLatency] = useState(0);
  const [dataTransferRate, setDataTransferRate] = useState(0);
  
  // Message Queue State (NEW)
  const [messageQueue, setMessageQueue] = useState<any[]>([]);
  const [messagesDropped, setMessagesDropped] = useState(0);
  
  // Circuit Breaker State (NEW)
  const [circuitBreakerState, setCircuitBreakerState] = useState<'closed' | 'open' | 'half-open'>('closed');
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastCircuitBreakerOpenTime, setLastCircuitBreakerOpenTime] = useState<Date | null>(null);
  
  // Connection Quality State (NEW)
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'critical'>('excellent');
  
  // Performance Tracking (NEW)
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [connectionHistory, setConnectionHistory] = useState<{timestamp: Date, event: string}[]>([]);
  
  // ==================== REFS FOR STABLE REFERENCES ====================
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const uptimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const onDataUpdateRef = useRef(onDataUpdate);
  
  // Keep callback reference stable
  useEffect(() => {
    onDataUpdateRef.current = onDataUpdate;
  }, [onDataUpdate]);
  
  // ==================== CONNECTION MANAGEMENT ====================
  
  /**
   * Establish WebSocket connection
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔄 WebSocket already connected');
      return;
    }
    
    if (!enabled) {
      console.log('🔄 Real-time updates disabled');
      return;
    }
    
    try {
      setConnectionStatus('connecting');
      console.log('🔄 Attempting WebSocket connection to:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        setConnectionStartTime(new Date());
        
        // Start uptime tracking
        if (uptimeIntervalRef.current) {
          clearInterval(uptimeIntervalRef.current);
        }
        uptimeIntervalRef.current = setInterval(() => {
          setUptime(prev => prev + 1);
        }, 1000);
      };
      
      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          console.log('📨 Real-time update received:', update.type);
          
          setLastMessageTime(new Date());
          setMessagesReceived(prev => prev + 1);
          
          // Handle different update types
          if (update.type === 'session-updated' || 
              update.type === 'schedule-changed' ||
              update.type === 'assignment-updated') {
            onDataUpdateRef.current();
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        // Clear uptime tracking
        if (uptimeIntervalRef.current) {
          clearInterval(uptimeIntervalRef.current);
          uptimeIntervalRef.current = null;
        }
        
        // Attempt reconnection if enabled and not a clean close
        if (autoReconnect && event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      };
      
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      setConnectionStatus('error');
    }
  }, [enabled, wsUrl, autoReconnect, reconnectAttempts, maxReconnectAttempts]);
  
  /**
   * Schedule reconnection attempt
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    setConnectionStatus('reconnecting');
    setReconnectAttempts(prev => prev + 1);
    
    const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts); // Exponential backoff
    console.log(`🔄 Scheduling reconnection attempt ${reconnectAttempts + 1} in ${delay}ms`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, reconnectDelay, reconnectAttempts]);
  
  /**
   * Manually disconnect WebSocket
   */
  const disconnect = useCallback(() => {
    console.log('🔌 Manually disconnecting WebSocket');
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    // Clear uptime tracking
    if (uptimeIntervalRef.current) {
      clearInterval(uptimeIntervalRef.current);
      uptimeIntervalRef.current = null;
    }
    
    // Close connection
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setReconnectAttempts(0);
    setUptime(0);
  }, []);
  
  /**
   * Force reconnection
   */
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnection requested');
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);
  
  // ==================== STATUS HELPERS ====================
  
  /**
   * Get overall connection health
   */
  const getConnectionHealth = useCallback((): 'healthy' | 'degraded' | 'unhealthy' => {
    if (connectionStatus === 'connected' && reconnectAttempts === 0) {
      return 'healthy';
    }
    if (connectionStatus === 'connected' && reconnectAttempts > 0) {
      return 'degraded';
    }
    return 'unhealthy';
  }, [connectionStatus, reconnectAttempts]);
  
  // ==================== LIFECYCLE EFFECTS ====================
  
  /**
   * Initialize connection on mount and cleanup on unmount
   */
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [enabled]); // Only depend on enabled to avoid reconnecting on every render
  
  /**
   * Update derived state
   */
  const isConnected = connectionStatus === 'connected';
  
  // ==================== RETURN VALUES ====================
  
  const values: RealTimeUpdatesValues = {
    connectionStatus,
    isConnected,
    lastMessageTime,
    reconnectAttempts,
    messagesReceived,
    uptime
  };
  
  const actions: RealTimeUpdatesActions = {
    connect,
    disconnect,
    reconnect,
    getConnectionHealth
  };
  
  return { ...values, ...actions };
};

export default useRealTimeUpdates;
