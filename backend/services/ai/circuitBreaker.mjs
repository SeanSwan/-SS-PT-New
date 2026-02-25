/**
 * Per-Provider Circuit Breaker
 * ============================
 * Three-state circuit breaker: closed → open → half-open.
 * Prevents cascading failures by skipping providers that are consistently failing.
 *
 * Phase 3A — Provider Router (Smart Workout Logger)
 */

const FAILURE_THRESHOLD = 3;       // Consecutive failures to open circuit
const ROLLING_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const OPEN_DURATION_MS = 60 * 1000;      // 60 seconds before half-open

/**
 * @typedef {'closed' | 'open' | 'half_open'} CircuitState
 */

/**
 * @typedef {Object} CircuitRecord
 * @property {CircuitState} state
 * @property {number[]} failureTimestamps - Timestamps of recent failures
 * @property {number|null} openedAt       - When the circuit was opened
 */

/** @type {Map<string, CircuitRecord>} */
const circuits = new Map();

/**
 * Get or create a circuit record for a provider.
 * @param {string} provider
 * @returns {CircuitRecord}
 */
function getCircuit(provider) {
  if (!circuits.has(provider)) {
    circuits.set(provider, {
      state: 'closed',
      failureTimestamps: [],
      openedAt: null,
    });
  }
  return circuits.get(provider);
}

/**
 * Prune failure timestamps outside the rolling window.
 * @param {CircuitRecord} circuit
 */
function pruneOldFailures(circuit) {
  const cutoff = Date.now() - ROLLING_WINDOW_MS;
  circuit.failureTimestamps = circuit.failureTimestamps.filter(ts => ts > cutoff);
}

/**
 * Check if a provider's circuit allows requests.
 *
 * @param {string} provider - Provider name
 * @returns {{ allowed: boolean, state: CircuitState }}
 */
export function canRequest(provider) {
  const circuit = getCircuit(provider);

  if (circuit.state === 'closed') {
    return { allowed: true, state: 'closed' };
  }

  if (circuit.state === 'open') {
    const elapsed = Date.now() - (circuit.openedAt || 0);
    if (elapsed >= OPEN_DURATION_MS) {
      // Transition to half-open: allow one probe
      circuit.state = 'half_open';
      return { allowed: true, state: 'half_open' };
    }
    return { allowed: false, state: 'open' };
  }

  // half_open — allow the probe request
  return { allowed: true, state: 'half_open' };
}

/**
 * Record a successful request. Resets the circuit to closed.
 * @param {string} provider
 */
export function recordSuccess(provider) {
  const circuit = getCircuit(provider);
  circuit.state = 'closed';
  circuit.failureTimestamps = [];
  circuit.openedAt = null;
}

/**
 * Record a failed request. May open the circuit.
 * @param {string} provider
 */
export function recordFailure(provider) {
  const circuit = getCircuit(provider);

  if (circuit.state === 'half_open') {
    // Half-open probe failed — re-open
    circuit.state = 'open';
    circuit.openedAt = Date.now();
    return;
  }

  // Closed state: track failure
  circuit.failureTimestamps.push(Date.now());
  pruneOldFailures(circuit);

  if (circuit.failureTimestamps.length >= FAILURE_THRESHOLD) {
    circuit.state = 'open';
    circuit.openedAt = Date.now();
  }
}

/**
 * Reset all circuit breakers. Used in tests.
 */
export function resetAll() {
  circuits.clear();
}

/**
 * Get the current state of a provider's circuit. Used in monitoring/tests.
 * @param {string} provider
 * @returns {CircuitState}
 */
export function getState(provider) {
  return getCircuit(provider).state;
}
