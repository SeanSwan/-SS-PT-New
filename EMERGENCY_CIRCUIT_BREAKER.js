/**
 * EMERGENCY NETWORK FAILURE CIRCUIT BREAKER
 * ==========================================
 * Prevents infinite retry loops when backend is unreachable
 * Deploy this immediately to stop the retry storm
 */

// Add this to useCalendarData.ts to break the infinite loop
const NETWORK_FAILURE_CIRCUIT_BREAKER = {
  maxRetries: 3,
  backoffDelay: 5000, // 5 seconds
  circuitOpenDuration: 60000, // 1 minute
  failureCount: new Map(),
  circuitState: new Map(), // 'closed' | 'open' | 'half-open'
  
  shouldAttempt(endpoint) {
    const now = Date.now();
    const state = this.circuitState.get(endpoint) || 'closed';
    const failures = this.failureCount.get(endpoint) || 0;
    
    if (state === 'open') {
      const lastFailure = this.lastFailureTime?.get(endpoint) || 0;
      if (now - lastFailure > this.circuitOpenDuration) {
        this.circuitState.set(endpoint, 'half-open');
        return true;
      }
      return false; // Circuit is still open
    }
    
    return failures < this.maxRetries;
  },
  
  recordSuccess(endpoint) {
    this.failureCount.set(endpoint, 0);
    this.circuitState.set(endpoint, 'closed');
  },
  
  recordFailure(endpoint) {
    const failures = (this.failureCount.get(endpoint) || 0) + 1;
    this.failureCount.set(endpoint, failures);
    this.lastFailureTime = this.lastFailureTime || new Map();
    this.lastFailureTime.set(endpoint, Date.now());
    
    if (failures >= this.maxRetries) {
      this.circuitState.set(endpoint, 'open');
      console.warn(`🚨 Circuit breaker OPEN for ${endpoint} - stopping retries for ${this.circuitOpenDuration/1000}s`);
    }
  }
};

// Export for immediate use
window.EMERGENCY_CIRCUIT_BREAKER = NETWORK_FAILURE_CIRCUIT_BREAKER;

console.log('🛑 EMERGENCY: Network failure circuit breaker deployed');
