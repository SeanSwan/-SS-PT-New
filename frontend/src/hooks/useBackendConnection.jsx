import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Connection states
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  MOCK_MODE: 'mock_mode'
};

// Default configuration
const DEFAULT_CONFIG = {
  maxRetries: 5,
  retryDelay: 2000, // Start with 2 seconds
  maxRetryDelay: 10000, // Max 10 seconds
  backoffMultiplier: 1.5,
  healthCheckInterval: 30000, // Check every 30 seconds once connected
  apiUrl: process.env.VITE_API_URL || 'http://localhost:10000'
};

// Create axios instance for health checks
const createApiInstance = (baseURL) => {
  return axios.create({
    baseURL,
    timeout: 5000,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

/**
 * Custom hook for managing backend connection
 * @param {Object} config - Configuration options
 * @returns {Object} Connection state and utilities
 */
export const useBackendConnection = (config = {}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.CONNECTING);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  // Create API instance
  const apiInstance = createApiInstance(fullConfig.apiUrl);
  
  // Calculate retry delay with exponential backoff
  const calculateRetryDelay = useCallback((attempt) => {
    const delay = fullConfig.retryDelay * Math.pow(fullConfig.backoffMultiplier, attempt);
    return Math.min(delay, fullConfig.maxRetryDelay);
  }, [fullConfig.retryDelay, fullConfig.backoffMultiplier, fullConfig.maxRetryDelay]);
  
  // Check backend health
  const checkBackendHealth = useCallback(async () => {
    try {
      const response = await apiInstance.get('/health');
      if (response.status === 200) {
        setConnectionState(CONNECTION_STATES.CONNECTED);
        setRetryCount(0);
        setLastError(null);
        return true;
      }
      throw new Error(`Health check failed with status: ${response.status}`);
    } catch (error) {
      console.warn('Backend health check failed:', error.message);
      setLastError(error.message);
      return false;
    }
  }, [apiInstance]);
  
  // Attempt to reconnect with retry logic
  const attemptReconnection = useCallback(async () => {
    if (retryCount >= fullConfig.maxRetries) {
      console.log('Max retries reached, switching to mock mode');
      setConnectionState(CONNECTION_STATES.MOCK_MODE);
      setIsRetrying(false);
      return;
    }
    
    setIsRetrying(true);
    setConnectionState(CONNECTION_STATES.CONNECTING);
    
    const isHealthy = await checkBackendHealth();
    
    if (!isHealthy) {
      setRetryCount(prev => prev + 1);
      const delay = calculateRetryDelay(retryCount);
      
      console.log(`Retrying connection in ${delay}ms (attempt ${retryCount + 1}/${fullConfig.maxRetries})`);
      
      setTimeout(() => {
        attemptReconnection();
      }, delay);
    } else {
      setIsRetrying(false);
    }
  }, [retryCount, fullConfig.maxRetries, checkBackendHealth, calculateRetryDelay]);
  
  // Manual retry function
  const manualRetry = useCallback(() => {
    setRetryCount(0);
    setLastError(null);
    attemptReconnection();
  }, [attemptReconnection]);
  
  // Initial connection attempt
  useEffect(() => {
    attemptReconnection();
  }, []);
  
  // Set up periodic health checks when connected
  useEffect(() => {
    if (connectionState === CONNECTION_STATES.CONNECTED) {
      const interval = setInterval(async () => {
        const isHealthy = await checkBackendHealth();
        if (!isHealthy) {
          setConnectionState(CONNECTION_STATES.DISCONNECTED);
          attemptReconnection();
        }
      }, fullConfig.healthCheckInterval);
      
      return () => clearInterval(interval);
    }
  }, [connectionState, checkBackendHealth, attemptReconnection, fullConfig.healthCheckInterval]);
  
  return {
    connectionState,
    isConnected: connectionState === CONNECTION_STATES.CONNECTED,
    isConnecting: connectionState === CONNECTION_STATES.CONNECTING,
    isDisconnected: connectionState === CONNECTION_STATES.DISCONNECTED,
    isMockMode: connectionState === CONNECTION_STATES.MOCK_MODE,
    isRetrying,
    retryCount,
    maxRetries: fullConfig.maxRetries,
    lastError,
    manualRetry,
    apiUrl: fullConfig.apiUrl
  };
};

/**
 * Connection Status Banner Component
 */
export const ConnectionStatusBanner = ({ connection }) => {
  const { connectionState, isRetrying, retryCount, maxRetries, lastError, manualRetry } = connection;
  
  if (connectionState === CONNECTION_STATES.CONNECTED) {
    return null; // Don't show banner when connected
  }
  
  const getBannerConfig = () => {
    switch (connectionState) {
      case CONNECTION_STATES.CONNECTING:
        return {
          color: 'bg-blue-500',
          icon: '🔄',
          title: 'Connecting to Server',
          message: isRetrying ? `Retrying... (${retryCount}/${maxRetries})` : 'Attempting to connect...'
        };
      case CONNECTION_STATES.DISCONNECTED:
        return {
          color: 'bg-orange-500',
          icon: '⚠️',
          title: 'Connection Lost',
          message: 'Attempting to reconnect...'
        };
      case CONNECTION_STATES.ERROR:
        return {
          color: 'bg-red-500',
          icon: '❌',
          title: 'Connection Error',
          message: lastError || 'Unable to connect to server'
        };
      case CONNECTION_STATES.MOCK_MODE:
        return {
          color: 'bg-purple-500',
          icon: '🔧',
          title: 'Development Mode',
          message: 'Using mock data - backend unavailable'
        };
      default:
        return {
          color: 'bg-gray-500',
          icon: '❓',
          title: 'Unknown State',
          message: 'Connection status unknown'
        };
    }
  };
  
  const { color, icon, title, message } = getBannerConfig();
  
  return (
    <div className={`${color} text-white px-4 py-2 text-center relative`}>
      <div className="flex items-center justify-center space-x-2">
        <span>{icon}</span>
        <span className="font-medium">{title}</span>
        <span>-</span>
        <span>{message}</span>
        {(connectionState === CONNECTION_STATES.ERROR || connectionState === CONNECTION_STATES.MOCK_MODE) && (
          <button
            onClick={manualRetry}
            className="ml-4 px-3 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Higher-order component that provides connection context
 */
export const withBackendConnection = (WrappedComponent) => {
  return function WithBackendConnectionComponent(props) {
    const connection = useBackendConnection();
    
    return (
      <div>
        <ConnectionStatusBanner connection={connection} />
        <WrappedComponent {...props} connection={connection} />
      </div>
    );
  };
};

export default useBackendConnection;
