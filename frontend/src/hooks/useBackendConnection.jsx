import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Connection states
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  MOCK_MODE: 'mock_mode'
};

// Get the correct API URL based on environment
const getApiUrl = () => {
  // In production, check if we're on a custom domain that needs to connect to Render backend
  if (process.env.NODE_ENV === 'production') {
    // If on custom domain (sswanstudios.com), connect to the Render backend
    if (window.location.hostname === 'sswanstudios.com' || window.location.hostname === 'www.sswanstudios.com') {
      return 'https://swan-studios-api.onrender.com'; // Correct Render backend URL
    }
    // If on Render domain, use same origin
    return window.location.origin;
  }
  // In development, use localhost:10000
  return 'http://localhost:10000';
};

// Default configuration - PRODUCTION SAFE
const DEFAULT_CONFIG = {
  maxRetries: 1, // Reduced to 1 for production safety - prevents infinite loops
  retryDelay: 2000, // 2 second delay
  maxRetryDelay: 2000, // Max 2 seconds  
  backoffMultiplier: 1,
  healthCheckInterval: 30000, // Check every 30 seconds once connected
  apiUrl: getApiUrl(), // Dynamic API URL based on environment
  forceMockMode: process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost' // Only force mock in local development
};

// Function to check if the endpoint is a health check
const isHealthEndpoint = (url) => {
  return url.endsWith('/health') || url === '/health';
};

// Enhanced error handling function that includes blocked by client detection
const handleApiError = (error, endpoint) => {
  // In development mode, don't log non-critical backend connection errors
  if (process.env.NODE_ENV === 'development' && 
      (isHealthEndpoint(endpoint) || endpoint.includes('/api/auth/'))) {
    // Create the error object but don't log it
    return {
      success: false,
      message: 'API request failed in development mode',
      silenced: true,
      timestamp: new Date().toISOString()
    };
  }
  
  // Prepare basic error object
  const errorObj = {
    success: false,
    message: 'API request failed',
    error: error.message,
    timestamp: new Date().toISOString()
  };

  // Add more context based on error type
  if (error.response) {
    // Server responded with an error status
    errorObj.status = error.response.status;
    errorObj.data = error.response.data;
    errorObj.message = `Server responded with error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`;
  } else if (error.request) {
    // Request made but no response received
    if (error.code === 'ECONNREFUSED') {
      errorObj.message = `Connection refused to ${endpoint} - is the backend server running on port 10000?`;
      errorObj.connectionRefused = true;
    } else if (error.message === 'Network Error' && error.config?.url?.includes('localhost')) {
      // This is likely ERR_BLOCKED_BY_CLIENT from ad blocker
      errorObj.message = `Request blocked by browser/ad blocker - switching to mock mode`;
      errorObj.blockedByClient = true;
    } else {
      errorObj.message = `No response received from ${endpoint} - server may be down or unreachable`;
    }
    errorObj.request = true;
  }

  // Special handling for health endpoint
  if (isHealthEndpoint(endpoint)) {
    errorObj.isHealthCheck = true;
    
    // More specific message for health checks
    if (errorObj.connectionRefused) {
      errorObj.message = 'Backend health check failed: server is not running or not accessible on port 10000';
    } else if (errorObj.blockedByClient) {
      errorObj.message = 'Health check blocked by browser/ad blocker - using mock mode';
    }
  }

  return errorObj;
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
  
  // Ref to track if component is mounted and timeout IDs for cleanup
  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);
  
  // Circuit breaker to prevent infinite loops
  const circuitBreakerRef = useRef({ attempts: 0, lastAttempt: 0 });
  const CIRCUIT_BREAKER_LIMIT = 10; // Max attempts per minute
  const CIRCUIT_BREAKER_WINDOW = 60000; // 1 minute window
  
  // Create API instance
  const apiInstance = createApiInstance(fullConfig.apiUrl);
  
  // Calculate retry delay with exponential backoff
  const calculateRetryDelay = useCallback((attempt) => {
    const delay = fullConfig.retryDelay * Math.pow(fullConfig.backoffMultiplier, attempt);
    return Math.min(delay, fullConfig.maxRetryDelay);
  }, [fullConfig.retryDelay, fullConfig.backoffMultiplier, fullConfig.maxRetryDelay]);
  
  // Check backend health with improved error handling
  const checkBackendHealth = useCallback(async () => {
    // Force mock mode if configured - skip health check and return false
    if (fullConfig.forceMockMode) {
      console.log('Local development mode, skipping backend health check');
      return false;
    }
    
    try {
      console.log(`Checking backend health at: ${fullConfig.apiUrl}/health`);
      const response = await apiInstance.get('/health');
      if (response.status === 200) {
        console.log('✅ Backend health check SUCCESS - server is running');
        setConnectionState(CONNECTION_STATES.CONNECTED);
        setRetryCount(0);
        setLastError(null);
        return true;
      }
      const errorObj = {
        success: false,
        message: `Health check failed with status: ${response.status}`,
        response: response
      };
      setLastError(errorObj);
      return false;
    } catch (error) {
      const errorObj = handleApiError(error, '/health');
      
      // Special handling for blocked by client - immediately give up
      if (errorObj.blockedByClient) {
        console.warn('🚫 Health check BLOCKED by browser/ad blocker - switching to mock mode immediately');
        if (isMountedRef.current) {
          setConnectionState(CONNECTION_STATES.MOCK_MODE);
          setRetryCount(fullConfig.maxRetries); // Force max retries to stop further attempts
        }
      }
      
      // Only log warnings if not silenced
      if (!errorObj.silenced && !errorObj.blockedByClient) {
        console.warn('❌ Backend health check failed:', errorObj.message);
      }
      
      setLastError(errorObj);
      return false;
    }
  }, [apiInstance, fullConfig.forceMockMode, fullConfig.maxRetries, fullConfig.apiUrl]);
  
  // Attempt to reconnect with retry logic - FIXED to prevent infinite loops
  const attemptReconnection = useCallback(async () => {
    // CIRCUIT BREAKER - Prevent infinite loops
    const now = Date.now();
    const circuitBreaker = circuitBreakerRef.current;
    
    // Reset counter if window expired
    if (now - circuitBreaker.lastAttempt > CIRCUIT_BREAKER_WINDOW) {
      circuitBreaker.attempts = 0;
    }
    
    // Check circuit breaker limit
    if (circuitBreaker.attempts >= CIRCUIT_BREAKER_LIMIT) {
      console.error(`🛑 CIRCUIT BREAKER: Too many connection attempts (${circuitBreaker.attempts}), forcing mock mode`);
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.MOCK_MODE);
        setIsRetrying(false);
      }
      return;
    }
    
    // Increment circuit breaker counter
    circuitBreaker.attempts++;
    circuitBreaker.lastAttempt = now;
    
    // IMMEDIATE EXIT CONDITIONS - Check these first to prevent any work
    if (!isMountedRef.current) {
      console.log('Component unmounted, cancelling reconnection attempt');
      return;
    }
    
    // FORCE MOCK MODE - Skip ALL connection attempts if enabled (LOCAL development only)
    if (fullConfig.forceMockMode) {
      console.log('Local development mode detected, switching to mock mode immediately');
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.MOCK_MODE);
        setIsRetrying(false);
      }
      return;
    }
    
    // CLEAR ANY EXISTING TIMEOUT - Prevent overlapping attempts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // GET CURRENT RETRY COUNT DIRECTLY FROM STATE
    const currentRetryCount = retryCount;
    console.log(`Attempting reconnection, current retry count: ${currentRetryCount}/${fullConfig.maxRetries}`);
    
    // CHECK MAX RETRIES REACHED
    if (currentRetryCount >= fullConfig.maxRetries) {
      console.log(`Max retries (${fullConfig.maxRetries}) reached, switching to mock mode FINAL`);
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.MOCK_MODE);
        setIsRetrying(false);
      }
      return;
    }
    
    // SET CONNECTING STATE
    if (isMountedRef.current) {
      setIsRetrying(true);
      setConnectionState(CONNECTION_STATES.CONNECTING);
    }
    
    // TRY CONNECTION
    try {
      const isHealthy = await checkBackendHealth();
      
      // Check if component unmounted during async operation
      if (!isMountedRef.current) {
        console.log('Component unmounted during health check, cancelling');
        return;
      }
      
      if (isHealthy) {
        // SUCCESS - Connection established, reset circuit breaker
        console.log('✅ Connection successful, resetting retry count');
        circuitBreaker.attempts = 0; // Reset circuit breaker on success
        if (isMountedRef.current) {
          setRetryCount(0);
          setIsRetrying(false);
          // checkBackendHealth already sets CONNECTED state
        }
        return;
      }
      
      // FAILED - Increment retry count and schedule next attempt
      const newRetryCount = currentRetryCount + 1;
      console.log(`❌ Health check failed, incrementing retry count to ${newRetryCount}/${fullConfig.maxRetries}`);
      
      // UPDATE RETRY COUNT IMMEDIATELY
      if (isMountedRef.current) {
        setRetryCount(newRetryCount);
      }
      
      // Check if we've hit max retries after incrementing
      if (newRetryCount >= fullConfig.maxRetries) {
        console.log('🛑 Max retries reached after increment, switching to mock mode FINAL');
        if (isMountedRef.current) {
          setConnectionState(CONNECTION_STATES.MOCK_MODE);
          setIsRetrying(false);
        }
        return;
      }
      
      // Schedule next attempt with exponential backoff
      const delay = calculateRetryDelay(newRetryCount - 1);
      console.log(`⏰ Scheduling retry ${newRetryCount} in ${delay}ms`);
      
      // CRITICAL: Use a separate timeout for each retry attempt
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && timeoutRef.current === timeoutId) {
          // Only proceed if this is still the active timeout
          attemptReconnection();
        } else {
          console.log('Timeout cancelled or component unmounted, skipping retry');
        }
      }, delay);
      
      timeoutRef.current = timeoutId;
      
    } catch (error) {
      console.error('Unexpected error in attemptReconnection:', error);
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.MOCK_MODE);
        setIsRetrying(false);
      }
    }
  }, [retryCount, fullConfig.maxRetries, fullConfig.forceMockMode, checkBackendHealth, calculateRetryDelay, CIRCUIT_BREAKER_LIMIT, CIRCUIT_BREAKER_WINDOW]);
  
  // Manual retry function
  const manualRetry = useCallback(() => {
    // Check if component is still mounted
    if (!isMountedRef.current) {
      console.log('Component unmounted, ignoring manual retry');
      return;
    }
    
    // Clear any existing timeout before retrying
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Reset circuit breaker on manual retry
    circuitBreakerRef.current.attempts = 0;
    
    setRetryCount(0);
    setLastError(null);
    console.log('🔄 Manual retry initiated, resetting all counters');
    attemptReconnection();
  }, [attemptReconnection]);
  
  // Initial connection attempt - with immediate mock mode for LOCAL development only
  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;
    
    // If force mock mode is enabled (LOCAL development only), go straight to mock mode immediately
    if (fullConfig.forceMockMode) {
      console.log('Local development detected, switching to mock mode immediately');
      setConnectionState(CONNECTION_STATES.MOCK_MODE);
      return;
    }
    
    // Skip all connection attempts if already set to mock mode
    if (connectionState === CONNECTION_STATES.MOCK_MODE) {
      console.log('Already in mock mode, skipping connection attempts');
      return;
    }
    
    // For production or when backend is expected, attempt connection
    console.log(`Attempting initial connection to: ${fullConfig.apiUrl}`);
    attemptReconnection();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
    };
    // Only run this effect once on mount with empty dependency array
  }, []);
  
  // Set up periodic health checks when connected
  useEffect(() => {
    // Clear any existing interval
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    
    // Skip periodic health checks if in mock mode or not mounted
    if (connectionState === CONNECTION_STATES.MOCK_MODE || !isMountedRef.current) {
      return;
    }
    
    if (connectionState === CONNECTION_STATES.CONNECTED) {
      healthCheckIntervalRef.current = setInterval(async () => {
        // Check if component is still mounted before proceeding
        if (!isMountedRef.current) {
          if (healthCheckIntervalRef.current) {
            clearInterval(healthCheckIntervalRef.current);
            healthCheckIntervalRef.current = null;
          }
          return;
        }
        
        const isHealthy = await checkBackendHealth();
        if (!isHealthy && isMountedRef.current) {
          setConnectionState(CONNECTION_STATES.DISCONNECTED);
          // Only attempt reconnection if not already in mock mode
          if (connectionState !== CONNECTION_STATES.MOCK_MODE) {
            attemptReconnection();
          }
        }
      }, fullConfig.healthCheckInterval);
      
      return () => {
        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current);
          healthCheckIntervalRef.current = null;
        }
      };
    }
  }, [connectionState, checkBackendHealth, fullConfig.healthCheckInterval, attemptReconnection]);
  
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
          title: 'Mock Mode',
          message: window.location.hostname === 'localhost' ? 'Local development mode - using mock data' : 'Backend unavailable - using mock data'
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