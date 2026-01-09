/**
 * Circuit Breaker Pattern for AI Providers
 * Prevents cascading failures when AI services are down
 */

import { logger } from '../utils/logger.mjs';

class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'circuit-breaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 3;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 60 seconds
    this.halfOpenMaxRequests = options.halfOpenMaxRequests || 3;
    
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.nextAttempt = Date.now();
    this.inFlightRequests = 0;
  }

  async execute(fn) {
    const now = Date.now();

    // If circuit is OPEN, check if we can attempt recovery
    if (this.state === 'OPEN') {
      if (now < this.nextAttempt) {
        throw new Error(`Circuit breaker ${this.name} is OPEN. Try again later.`);
      }
      // Transition to HALF_OPEN
      this.state = 'HALF_OPEN';
      this.successes = 0;
      this.failures = 0;
      logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
    }

    // If HALF_OPEN, limit concurrent requests
    if (this.state === 'HALF_OPEN') {
      if (this.inFlightRequests >= this.halfOpenMaxRequests) {
        throw new Error(`Circuit breaker ${this.name} in HALF_OPEN state: max concurrent requests reached`);
      }
    }

    this.inFlightRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      this.inFlightRequests--;
      return result;
    } catch (error) {
      this.inFlightRequests--;
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      logger.debug(`Circuit breaker ${this.name} success: ${this.successes}/${this.successThreshold}`);
      
      if (this.successes >= this.successThreshold) {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        logger.info(`Circuit breaker ${this.name} recovered - CLOSED`);
      }
    } else if (this.state === 'CLOSED') {
      // Reset failures on success
      this.failures = 0;
    }
  }

  onFailure() {
    this.failures++;
    
    if (this.state === 'HALF_OPEN') {
      // Immediately open circuit on failure in half-open state
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      logger.error(`Circuit breaker ${this.name} failed in HALF_OPEN - OPENING`);
    } else if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.recoveryTimeout;
      logger.error(`Circuit breaker ${this.name} threshold reached - OPENING`);
    }
    
    logger.debug(`Circuit breaker ${this.name} failure count: ${this.failures}/${this.failureThreshold}`);
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      nextAttempt: this.nextAttempt,
      inFlightRequests: this.inFlightRequests,
      canExecute: this.state === 'CLOSED' || (this.state === 'HALF_OPEN' && this.inFlightRequests < this.halfOpenMaxRequests)
    };
  }

  // Manual controls
  forceOpen() {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.recoveryTimeout;
    logger.warn(`Circuit breaker ${this.name} forced OPEN`);
  }

  forceClose() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    logger.warn(`Circuit breaker ${this.name} forced CLOSED`);
  }
}

// Pre-configured circuit breakers for each AI service
const circuitBreakers = {
  workout: new CircuitBreaker({ name: 'workout-ai', failureThreshold: 3, recoveryTimeout: 30000 }),
  nutrition: new CircuitBreaker({ name: 'nutrition-ai', failureThreshold: 3, recoveryTimeout: 30000 }),
  form: new CircuitBreaker({ name: 'form-ai', failureThreshold: 3, recoveryTimeout: 30000 }),
  alternatives: new CircuitBreaker({ name: 'alternatives-ai', failureThreshold: 3, recoveryTimeout: 30000 }),
  chat: new CircuitBreaker({ name: 'chat-ai', failureThreshold: 5, recoveryTimeout: 60000 })
};

export { CircuitBreaker, circuitBreakers };