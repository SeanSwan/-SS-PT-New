import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios, { AxiosResponse } from 'axios';
import styled from 'styled-components';
import { logger } from '@/utils/logger';

// Connection states
const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
  UNAVAILABLE: 'unavailable'
};

// Get the correct API URL based on environment
const getApiUrl = () => {
  // In production, check if we're on a custom domain that needs to connect to Render backend
  if (process.env.NODE_ENV === 'production') {
    // If on custom domain (sswanstudios.com), connect to the correct Render backend
    if (window.location.hostname === 'sswanstudios.com' || window.location.hostname === 'www.sswanstudios.com') {
      return 'https://sswanstudios.com';
    }
    // If on Render domain, use same origin
    return window.location.origin;
  }
  // In development, use localhost:10000
  return 'http://localhost:10000';
};

const HEALTH_CHECK_PATH = '/api/health';
const TRANSIENT_HEALTH_FAILURE_LIMIT = 2;

// Default configuration - PRODUCTION SAFE
// maxRetries was 1: a single flaky /api/health on page load flipped the app
// into a 5-minute "Backend Unavailable" circuit-breaker lockout over a
// working backend. 3 tries with backoff still converges fast when the
// backend is genuinely down, without false alarms on mobile networks.
const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 2000, // 2 second first delay
  maxRetryDelay: 8000, // cap the backoff
  backoffMultiplier: 2,
  healthCheckInterval: 30000, // Check every 30 seconds once connected
  apiUrl: getApiUrl(), // Dynamic API URL based on environment
  forceUnavailableMode: false
};

// How long CONNECTING may run silently before the banner appears. Every
// visitor used to see a "Connecting to Server" flash on boot.
const CONNECTING_BANNER_GRACE_MS = 5000;

interface BackendConnectionConfig {
  maxRetries: number;
  retryDelay: number;
  maxRetryDelay: number;
  backoffMultiplier: number;
  healthCheckInterval: number;
  apiUrl: string;
  forceUnavailableMode: boolean;
}

interface BackendConnectionError {
  success: false;
  message: string;
  error?: string;
  timestamp?: string;
  silenced?: boolean;
  status?: number;
  data?: unknown;
  connectionRefused?: boolean;
  blockedByClient?: boolean;
  request?: boolean;
  isHealthCheck?: boolean;
  response?: AxiosResponse;
}

// Function to check if the endpoint is a health check
const isHealthEndpoint = (url) => {
  return url.endsWith('/health') || url === '/health';
};

// Enhanced error handling function that includes blocked by client detection
const handleApiError = (error: any, endpoint: string): BackendConnectionError => {
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
  const errorObj: BackendConnectionError = {
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
      errorObj.message = 'Request blocked by browser/ad blocker';
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
      errorObj.message = 'Health check blocked by browser/ad blocker';
    }
  }

  return errorObj;
};

// Create axios instance for health checks
const createApiInstance = (baseURL: string) => {
  return axios.create({
    baseURL,
    timeout: 5000,
    headers: {
      Accept: 'application/json'
    }
  });
};

/**
 * Custom hook for managing backend connection
 * @param {Object} config - Configuration options
 * @returns {Object} Connection state and utilities
 */
export const useBackendConnection = (config: Partial<BackendConnectionConfig> = {}) => {
  const {
    maxRetries = DEFAULT_CONFIG.maxRetries,
    retryDelay = DEFAULT_CONFIG.retryDelay,
    maxRetryDelay = DEFAULT_CONFIG.maxRetryDelay,
    backoffMultiplier = DEFAULT_CONFIG.backoffMultiplier,
    healthCheckInterval = DEFAULT_CONFIG.healthCheckInterval,
    apiUrl = DEFAULT_CONFIG.apiUrl,
    forceUnavailableMode = DEFAULT_CONFIG.forceUnavailableMode,
  } = config;
  const fullConfig = useMemo<BackendConnectionConfig>(() => ({
    maxRetries,
    retryDelay,
    maxRetryDelay,
    backoffMultiplier,
    healthCheckInterval,
    apiUrl,
    forceUnavailableMode,
  }), [
    apiUrl,
    backoffMultiplier,
    forceUnavailableMode,
    healthCheckInterval,
    maxRetries,
    maxRetryDelay,
    retryDelay,
  ]);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.CONNECTING);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<BackendConnectionError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Ref to track if component is mounted and timeout IDs for cleanup
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef(0);
  const consecutiveHealthFailuresRef = useRef(0);

  // Enhanced circuit breaker to prevent infinite loops
  const circuitBreakerRef = useRef({ attempts: 0, lastAttempt: 0, isBlocked: false });
  const CIRCUIT_BREAKER_LIMIT = 5; // Reduced from 10 to 5 for safety
  const CIRCUIT_BREAKER_WINDOW = 60000; // 1 minute window
  const CIRCUIT_BREAKER_COOLDOWN = 300000; // 5 minute cooldown after blocking

  const updateRetryCount = useCallback((nextRetryCount: number) => {
    retryCountRef.current = nextRetryCount;
    setRetryCount(nextRetryCount);
  }, []);

  // Create API instance
  const apiInstance = useMemo(() => createApiInstance(fullConfig.apiUrl), [fullConfig.apiUrl]);

  // Calculate retry delay with exponential backoff
  const calculateRetryDelay = useCallback((attempt: number) => {
    const delay = fullConfig.retryDelay * Math.pow(fullConfig.backoffMultiplier, attempt);
    return Math.min(delay, fullConfig.maxRetryDelay);
  }, [fullConfig.retryDelay, fullConfig.backoffMultiplier, fullConfig.maxRetryDelay]);

  // Check backend health with improved error handling
  const checkBackendHealth = useCallback(async () => {
    // Force backend unavailable if configured - skip health check and return false
    if (fullConfig.forceUnavailableMode) {
      logger.log('Backend health check skipped by configuration');
      return false;
    }

    try {
      logger.log(`Checking backend health at: ${fullConfig.apiUrl}${HEALTH_CHECK_PATH}`);
      const response = await apiInstance.get(HEALTH_CHECK_PATH);
      if (response.status === 200) {
        logger.log('✅ Backend health check SUCCESS - server is running');
        circuitBreakerRef.current.attempts = 0;
        circuitBreakerRef.current.isBlocked = false;
        circuitBreakerRef.current.lastAttempt = 0;
        setConnectionState(CONNECTION_STATES.CONNECTED);
        updateRetryCount(0);
        consecutiveHealthFailuresRef.current = 0;
        setLastError(null);
        return true;
      }
      const errorObj = {
        success: false as const,
        message: `Health check failed with status: ${response.status}`,
        response: response
      };
      setLastError(errorObj);
      return false;
    } catch (error) {
      const errorObj = handleApiError(error, HEALTH_CHECK_PATH);

      // Special handling for blocked by client - immediately give up
      if (errorObj.blockedByClient) {
        logger.warn('🚫 Health check BLOCKED by browser/ad blocker - marking backend unavailable immediately');
        if (isMountedRef.current) {
          setConnectionState(CONNECTION_STATES.UNAVAILABLE);
          updateRetryCount(fullConfig.maxRetries); // Force max retries to stop further attempts
        }
      }

      // Only log warnings if not silenced
      if (!errorObj.silenced && !errorObj.blockedByClient) {
        logger.warn('❌ Backend health check failed:', errorObj.message);
      }

      setLastError(errorObj);
      return false;
    }
  }, [apiInstance, fullConfig.forceUnavailableMode, fullConfig.maxRetries, fullConfig.apiUrl, updateRetryCount]);

  // Attempt to reconnect with enhanced safety - PRODUCTION HARDENED
  const attemptReconnection = useCallback(async () => {
    // ENHANCED CIRCUIT BREAKER - Prevent infinite loops with cooldown
    const now = Date.now();
    const circuitBreaker = circuitBreakerRef.current;

    // Check if circuit breaker is in cooldown period
    if (circuitBreaker.isBlocked && (now - circuitBreaker.lastAttempt) < CIRCUIT_BREAKER_COOLDOWN) {
      logger.log(`🛑 CIRCUIT BREAKER: In cooldown period, ${Math.ceil((CIRCUIT_BREAKER_COOLDOWN - (now - circuitBreaker.lastAttempt)) / 1000)}s remaining`);
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.UNAVAILABLE);
        setIsRetrying(false);
      }
      return;
    }

    // Reset circuit breaker if cooldown expired
    if (circuitBreaker.isBlocked && (now - circuitBreaker.lastAttempt) >= CIRCUIT_BREAKER_COOLDOWN) {
      logger.log('🔄 CIRCUIT BREAKER: Cooldown expired, resetting');
      circuitBreaker.attempts = 0;
      circuitBreaker.isBlocked = false;
    }

    // Reset counter if window expired
    if (now - circuitBreaker.lastAttempt > CIRCUIT_BREAKER_WINDOW) {
      circuitBreaker.attempts = 0;
      circuitBreaker.isBlocked = false;
    }

    // Check circuit breaker limit
    if (circuitBreaker.attempts >= CIRCUIT_BREAKER_LIMIT) {
      console.error(`🛑 CIRCUIT BREAKER: Too many connection attempts (${circuitBreaker.attempts}), entering cooldown`);
      circuitBreaker.isBlocked = true;
      circuitBreaker.lastAttempt = now;
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.UNAVAILABLE);
        setIsRetrying(false);
      }
      return;
    }

    // Increment circuit breaker counter
    circuitBreaker.attempts++;
    circuitBreaker.lastAttempt = now;

    // IMMEDIATE EXIT CONDITIONS - Check these first to prevent any work
    if (!isMountedRef.current) {
      logger.log('Component unmounted, cancelling reconnection attempt');
      return;
    }

    // FORCE MOCK MODE - Skip ALL connection attempts if enabled (LOCAL development only)
    if (fullConfig.forceUnavailableMode) {
      logger.log('Local development mode detected, marking backend unavailable immediately');
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.UNAVAILABLE);
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
    const currentRetryCount = retryCountRef.current;
    logger.log(`Attempting reconnection, current retry count: ${currentRetryCount}/${fullConfig.maxRetries}`);

    // CHECK MAX RETRIES REACHED
    if (currentRetryCount >= fullConfig.maxRetries) {
      logger.log(`Max retries (${fullConfig.maxRetries}) reached, marking backend unavailable`);
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.UNAVAILABLE);
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
        logger.log('Component unmounted during health check, cancelling');
        return;
      }

      if (isHealthy) {
        // SUCCESS - Connection established, reset circuit breaker
        logger.log('✅ Connection successful, resetting retry count');
        circuitBreaker.attempts = 0; // Reset circuit breaker on success
        if (isMountedRef.current) {
          updateRetryCount(0);
          setIsRetrying(false);
          // checkBackendHealth already sets CONNECTED state
        }
        return;
      }

      // FAILED - Increment retry count and schedule next attempt
      const newRetryCount = currentRetryCount + 1;
      logger.log(`❌ Health check failed, incrementing retry count to ${newRetryCount}/${fullConfig.maxRetries}`);

      // UPDATE RETRY COUNT IMMEDIATELY
      if (isMountedRef.current) {
        updateRetryCount(newRetryCount);
      }

      // Check if we've hit max retries after incrementing
      if (newRetryCount >= fullConfig.maxRetries) {
        logger.log('🛑 Max retries reached after increment, marking backend unavailable');
        if (isMountedRef.current) {
          setConnectionState(CONNECTION_STATES.UNAVAILABLE);
          setIsRetrying(false);
        }
        return;
      }

      // Schedule next attempt with exponential backoff
      const delay = calculateRetryDelay(newRetryCount - 1);
      logger.log(`⏰ Scheduling retry ${newRetryCount} in ${delay}ms`);

      // CRITICAL: Use a separate timeout for each retry attempt
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current && timeoutRef.current === timeoutId) {
          // Only proceed if this is still the active timeout
          attemptReconnection();
        } else {
          logger.log('Timeout cancelled or component unmounted, skipping retry');
        }
      }, delay);

      timeoutRef.current = timeoutId;

    } catch (error) {
      console.error('Unexpected error in attemptReconnection:', error);
      if (isMountedRef.current) {
        setConnectionState(CONNECTION_STATES.UNAVAILABLE);
        setIsRetrying(false);
      }
    }
  }, [fullConfig.maxRetries, fullConfig.forceUnavailableMode, checkBackendHealth, calculateRetryDelay, updateRetryCount, CIRCUIT_BREAKER_LIMIT, CIRCUIT_BREAKER_WINDOW]);

  // Manual retry function
  const manualRetry = useCallback(() => {
    // Check if component is still mounted
    if (!isMountedRef.current) {
      logger.log('Component unmounted, ignoring manual retry');
      return;
    }

    // Clear any existing timeout before retrying
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Reset circuit breaker on manual retry
    circuitBreakerRef.current.attempts = 0;
    circuitBreakerRef.current.isBlocked = false;
    circuitBreakerRef.current.lastAttempt = 0;

    updateRetryCount(0);
    consecutiveHealthFailuresRef.current = 0;
    setLastError(null);
    logger.log('🔄 Manual retry initiated, resetting all counters');
    attemptReconnection();
  }, [attemptReconnection, updateRetryCount]);

  // Initial connection attempt - with immediate backend unavailable for LOCAL development only
  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;

    // If force backend unavailable is enabled (LOCAL development only), go straight to backend unavailable immediately
    if (fullConfig.forceUnavailableMode) {
      logger.log('Local development detected, marking backend unavailable immediately');
      setConnectionState(CONNECTION_STATES.UNAVAILABLE);
      return;
    }


    // For production or when backend is expected, attempt connection
    logger.log(`Attempting initial connection to: ${fullConfig.apiUrl}`);
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
    // Restart only when the effective connection configuration changes.
  }, [attemptReconnection, fullConfig.apiUrl, fullConfig.forceUnavailableMode]);

  // Set up periodic health checks when connected
  useEffect(() => {
    // Clear any existing interval
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }

    if (!isMountedRef.current) {
      return;
    }

    // UNAVAILABLE must remain self-healing. Without this probe, exhausting the
    // initial retries permanently latched a stale "Backend Unavailable" banner
    // even after /api/health returned 200 again.
    if (connectionState === CONNECTION_STATES.UNAVAILABLE) {
      healthCheckIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          void checkBackendHealth();
        }
      }, fullConfig.healthCheckInterval);

      return () => {
        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current);
          healthCheckIntervalRef.current = null;
        }
      };
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
          const failureCount = consecutiveHealthFailuresRef.current + 1;
          consecutiveHealthFailuresRef.current = failureCount;

          if (failureCount < TRANSIENT_HEALTH_FAILURE_LIMIT) {
            logger.warn(`Transient backend health check failed (${failureCount}/${TRANSIENT_HEALTH_FAILURE_LIMIT}); keeping connection state until the next check`);
            return;
          }

          setConnectionState(CONNECTION_STATES.DISCONNECTED);
          // Only attempt reconnection if not already in backend unavailable
          if (connectionState !== CONNECTION_STATES.UNAVAILABLE) {
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
    isBackendUnavailable: connectionState === CONNECTION_STATES.UNAVAILABLE,
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
const ConnectionBannerShell = styled.div<{ $tone: string }>`
  position: fixed;
  left: max(12px, env(safe-area-inset-left));
  right: max(12px, env(safe-area-inset-right));
  top: calc(64px + env(safe-area-inset-top));
  z-index: 990;
  display: flex;
  justify-content: center;
  pointer-events: none;

  @media (max-width: 768px) {
    top: calc(60px + env(safe-area-inset-top));
  }

  @media (max-width: 480px) {
    top: calc(56px + env(safe-area-inset-top));
    left: max(8px, env(safe-area-inset-left));
    right: max(8px, env(safe-area-inset-right));
  }

  @media (min-width: 2560px) {
    top: calc(72px + env(safe-area-inset-top));
  }

  @media (min-width: 3840px) {
    top: calc(80px + env(safe-area-inset-top));
  }
`;

const getBannerBorder = (tone: string) => {
  if (tone === 'error') return 'color-mix(in srgb, var(--danger, #EF4444) 42%, transparent)';
  if (tone === 'warning') return 'color-mix(in srgb, var(--warning, #C6A84B) 42%, transparent)';
  return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 42%, transparent)';
};

const getBannerBackground = (tone: string) => {
  if (tone === 'error') {
    return 'linear-gradient(135deg, color-mix(in srgb, var(--danger, #EF4444) 18%, var(--bg-base, #030712)), color-mix(in srgb, var(--bg-base, #030712) 92%, transparent))';
  }
  if (tone === 'warning') {
    return 'linear-gradient(135deg, color-mix(in srgb, var(--warning, #C6A84B) 18%, var(--bg-base, #030712)), color-mix(in srgb, var(--bg-base, #030712) 92%, transparent))';
  }
  return 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, var(--bg-base, #030712)), color-mix(in srgb, var(--bg-base, #030712) 92%, transparent))';
};

const getBannerGlow = (tone: string) => {
  if (tone === 'error') return 'color-mix(in srgb, var(--danger, #EF4444) 18%, transparent)';
  if (tone === 'warning') return 'color-mix(in srgb, var(--warning, #C6A84B) 18%, transparent)';
  return 'color-mix(in srgb, var(--accent-primary, #60C0F0) 18%, transparent)';
};

const ConnectionBannerCard = styled.div<{ $tone: string }>`
  width: min(920px, 100%);
  min-height: 44px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid ${({ $tone }) => getBannerBorder($tone)};
  background: ${({ $tone }) => getBannerBackground($tone)};
  color: var(--text-primary, #E0ECF4);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28), 0 0 22px ${({ $tone }) => getBannerGlow($tone)};
  backdrop-filter: blur(16px) saturate(1.35);
  pointer-events: auto;

  @media (max-width: 640px) {
    padding: 10px 12px;
    border-radius: 10px;
  }
`;

const ConnectionBannerContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  text-align: center;
  font-family: 'Sora', sans-serif;
  font-size: 0.85rem;
  line-height: 1.35;
`;

const ConnectionBannerTitle = styled.span`
  font-weight: 700;
`;

const ConnectionBannerMessage = styled.span`
  color: var(--text-secondary, rgba(224, 236, 244, 0.78));
`;

const ConnectionRetryButton = styled.button`
  min-width: 64px;
  min-height: 44px;
  margin-left: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid color-mix(in srgb, var(--accent-primary, #60C0F0) 38%, transparent);
  background: color-mix(in srgb, var(--accent-primary, #60C0F0) 14%, transparent);
  color: var(--text-primary, #E0ECF4);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--accent-primary, #60C0F0);
    background: color-mix(in srgb, var(--accent-primary, #60C0F0) 22%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--accent-primary, #60C0F0);
    outline-offset: 2px;
  }
`;

export const ConnectionStatusBanner = ({ connection }: { connection: ReturnType<typeof useBackendConnection> }) => {
  const { connectionState, isRetrying, retryCount, maxRetries, lastError, manualRetry } = connection;

  // Grace period: suppress the CONNECTING banner unless the state persists.
  const isConnecting = connectionState === CONNECTION_STATES.CONNECTING;
  const [connectingLongEnough, setConnectingLongEnough] = useState(false);
  useEffect(() => {
    if (!isConnecting) {
      setConnectingLongEnough(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setConnectingLongEnough(true), CONNECTING_BANNER_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [isConnecting]);

  if (connectionState === CONNECTION_STATES.CONNECTED) {
    return null; // Don't show banner when connected
  }

  if (isConnecting && !connectingLongEnough) {
    return null; // No boot-time banner flash for a normal fast connect
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
          message: typeof lastError === 'string' ? lastError : lastError?.message || 'Unable to connect to server'
        };
      case CONNECTION_STATES.UNAVAILABLE:
        return {
          color: 'bg-purple-500',
          icon: '🔧',
          title: 'Backend Unavailable',
          message: window.location.hostname === 'localhost' ? 'Start the backend on port 10000, then retry.' : 'Backend unavailable. Retry when the API is back online.'
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

  const { color, title, message } = getBannerConfig();
  const tone = color === 'bg-red-500'
    ? 'error'
    : color === 'bg-orange-500'
      ? 'warning'
      : color === 'bg-purple-500'
        ? 'warning'
        : 'info';

  return (
    <ConnectionBannerShell $tone={tone} role="status" aria-live="polite">
      <ConnectionBannerCard $tone={tone}>
        <ConnectionBannerContent>
          <ConnectionBannerTitle>{title}</ConnectionBannerTitle>
          <span aria-hidden="true">-</span>
          <ConnectionBannerMessage>{message}</ConnectionBannerMessage>
          {(connectionState === CONNECTION_STATES.ERROR || connectionState === CONNECTION_STATES.UNAVAILABLE) && (
            <ConnectionRetryButton
              type="button"
              onClick={manualRetry}
            >
              Retry
            </ConnectionRetryButton>
          )}
        </ConnectionBannerContent>
      </ConnectionBannerCard>
    </ConnectionBannerShell>
  );
};

/**
 * Higher-order component that provides connection context
 */
