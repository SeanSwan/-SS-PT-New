/**
 * Circuit Breaker Utility
 * Provides error handling and fail-safe mechanisms for critical components
 */

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// Global circuit breaker registry
const circuitBreakers = new Map<string, CircuitBreakerState>();

// Configuration
const FAILURE_THRESHOLD = 5;
const TIMEOUT = 60000; // 1 minute
const RETRY_TIMEOUT = 10000; // 10 seconds

/**
 * Initialize or get circuit breaker for a given key
 */
function getCircuitBreaker(key: string): CircuitBreakerState {
  if (!circuitBreakers.has(key)) {
    circuitBreakers.set(key, {
      failures: 0,
      lastFailureTime: 0,
      state: 'CLOSED'
    });
  }
  return circuitBreakers.get(key)!;
}

/**
 * Record a failure for the circuit breaker
 */
export function recordFailure(key: string): void {
  const breaker = getCircuitBreaker(key);
  breaker.failures += 1;
  breaker.lastFailureTime = Date.now();
  
  if (breaker.failures >= FAILURE_THRESHOLD) {
    breaker.state = 'OPEN';
    console.warn(`Circuit breaker ${key} opened due to ${breaker.failures} failures`);
  }
}

/**
 * Record a success for the circuit breaker
 */
export function recordSuccess(key: string): void {
  const breaker = getCircuitBreaker(key);
  breaker.failures = 0;
  breaker.state = 'CLOSED';
}

/**
 * Check if circuit breaker allows execution
 */
export function canExecute(key: string): boolean {
  const breaker = getCircuitBreaker(key);
  const now = Date.now();
  
  switch (breaker.state) {
    case 'CLOSED':
      return true;
    case 'OPEN':
      if (now - breaker.lastFailureTime > TIMEOUT) {
        breaker.state = 'HALF_OPEN';
        return true;
      }
      return false;
    case 'HALF_OPEN':
      return true;
    default:
      return true;
  }
}

/**
 * Execute function with circuit breaker protection
 */
export async function executeWithCircuitBreaker<T>(
  key: string,
  fn: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  if (!canExecute(key)) {
    if (fallback) {
      return fallback();
    }
    throw new Error(`Circuit breaker ${key} is open`);
  }
  
  try {
    const result = await fn();
    recordSuccess(key);
    return result;
  } catch (error) {
    recordFailure(key);
    if (fallback) {
      return fallback();
    }
    throw error;
  }
}

/**
 * Get circuit breaker status
 */
export function getStatus(key: string): CircuitBreakerState {
  return { ...getCircuitBreaker(key) };
}

/**
 * Reset circuit breaker
 */
export function reset(key: string): void {
  const breaker = getCircuitBreaker(key);
  breaker.failures = 0;
  breaker.lastFailureTime = 0;
  breaker.state = 'CLOSED';
}

// Development mode safety mechanisms
if (process.env.NODE_ENV === 'development') {
  console.log('Circuit breaker initialized in development mode');
  
  // Expose circuit breaker utilities to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).circuitBreaker = {
      getStatus,
      reset,
      recordFailure,
      recordSuccess,
      canExecute,
      getAllStates: () => Object.fromEntries(circuitBreakers)
    };
  }
}

export default {
  recordFailure,
  recordSuccess,
  canExecute,
  executeWithCircuitBreaker,
  getStatus,
  reset
};
