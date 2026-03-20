/**
 * Error Loop Prevention — In-Memory Circuit Breaker
 * ==================================================
 * Detects repeated error patterns per conversation and breaks loops
 * before they waste API credits or confuse users.
 *
 * Tracks last N actions per conversation. If the same error type
 * occurs 3+ times in a window, returns a circuit-breaker response
 * instead of retrying.
 *
 * NO Redis — uses in-memory Map with TTL cleanup.
 */
import logger from '../../utils/logger.mjs';

// ── Configuration ────────────────────────────────────────────────────────────

const MAX_HISTORY_PER_CONVERSATION = 50;
const ERROR_REPEAT_THRESHOLD = 3;       // Trip after 3 identical errors
const WINDOW_MS = 5 * 60 * 1000;        // 5-minute sliding window
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // Cleanup stale entries every 10 min
const STALE_THRESHOLD_MS = 30 * 60 * 1000;  // Drop conversations idle > 30 min

// ── In-Memory Store ──────────────────────────────────────────────────────────

// Map<conversationId, { actions: Array<{ type, error, timestamp }>, lastActivity: number }>
const conversationHistory = new Map();

// Periodic cleanup of stale conversations
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, entry] of conversationHistory.entries()) {
    if (now - entry.lastActivity > STALE_THRESHOLD_MS) {
      conversationHistory.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    logger.debug(`[ErrorLoopPrevention] Cleaned ${cleaned} stale conversations. Active: ${conversationHistory.size}`);
  }
}, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Record an action outcome for a conversation.
 *
 * @param {string} conversationId
 * @param {string} actionType - e.g., 'classify', 'resolve_client', 'debate'
 * @param {string|null} error - Error message if failed, null if success
 */
export function recordAction(conversationId, actionType, error = null) {
  if (!conversationId) return;

  let entry = conversationHistory.get(conversationId);
  if (!entry) {
    entry = { actions: [], lastActivity: Date.now() };
    conversationHistory.set(conversationId, entry);
  }

  entry.lastActivity = Date.now();
  entry.actions.push({
    type: actionType,
    error: error ? normalizeErrorKey(error) : null,
    timestamp: Date.now(),
  });

  // Cap history size
  if (entry.actions.length > MAX_HISTORY_PER_CONVERSATION) {
    entry.actions = entry.actions.slice(-MAX_HISTORY_PER_CONVERSATION);
  }
}

/**
 * Check if a conversation is in an error loop.
 * Call BEFORE executing a pipeline step.
 *
 * @param {string} conversationId
 * @param {string} actionType - The action about to be attempted
 * @returns {{ blocked: boolean, reason: string|null, suggestion: string|null }}
 */
export function checkErrorLoop(conversationId, actionType) {
  if (!conversationId) return { blocked: false, reason: null, suggestion: null };

  const entry = conversationHistory.get(conversationId);
  if (!entry) return { blocked: false, reason: null, suggestion: null };

  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Count recent errors of the same action type
  const recentErrors = entry.actions.filter(
    a => a.type === actionType && a.error && a.timestamp > windowStart
  );

  if (recentErrors.length >= ERROR_REPEAT_THRESHOLD) {
    const mostCommonError = getMostCommonError(recentErrors);
    logger.warn('[ErrorLoopPrevention] Circuit breaker tripped', {
      conversationId,
      actionType,
      errorCount: recentErrors.length,
      mostCommonError,
    });

    return {
      blocked: true,
      reason: `This action has failed ${recentErrors.length} times in the last 5 minutes.`,
      suggestion: getSuggestion(actionType, mostCommonError),
    };
  }

  return { blocked: false, reason: null, suggestion: null };
}

/**
 * Reset error history for a conversation (e.g., after user changes context).
 * @param {string} conversationId
 */
export function resetConversationErrors(conversationId) {
  conversationHistory.delete(conversationId);
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Normalize error messages to a stable key for comparison.
 * Strips IDs, timestamps, and other variable parts.
 */
function normalizeErrorKey(error) {
  return error
    .replace(/\d+/g, 'N')           // Replace numbers
    .replace(/#N/g, '#ID')           // Normalize IDs
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .slice(0, 100);                  // Cap length
}

function getMostCommonError(errors) {
  const counts = {};
  for (const e of errors) {
    counts[e.error] = (counts[e.error] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
}

function getSuggestion(actionType, errorKey) {
  if (actionType === 'classify') {
    return 'AI classification is having trouble. Try rephrasing your request or using a specific command like "log workout for Jackie".';
  }
  if (actionType === 'resolve_client') {
    return 'Client lookup keeps failing. Try using the client picker dropdown instead of typing a name.';
  }
  if (actionType === 'debate') {
    return 'The AI debate system is experiencing issues. Try again in a few minutes or use a simpler command.';
  }
  if (errorKey?.includes('timeout')) {
    return 'The AI is taking too long to respond. This usually resolves in a few minutes.';
  }
  return 'This action keeps failing. Please try a different approach or contact support.';
}
