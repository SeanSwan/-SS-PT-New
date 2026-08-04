/**
 * PII-Safe Logger - FIXED VERSION
 * Ultra-safe logging with comprehensive error handling, and actual PII scrubbing.
 */

/**
 * PII scrubbing now lives in one place: `utils/redactionRules.mjs`.
 *
 * This module and `utils/logger.mjs` previously maintained SEPARATE redaction lists, and they
 * drifted — the main logger (12x the call sites) was passing email, SSN, phone, and database
 * credentials straight through while this one redacted them. Two hand-maintained lists will
 * drift again; one cannot. `scrubPII` is re-exported so existing importers keep working.
 */
// NOTE: a bare `export { x as y } from '...'` re-export creates NO local binding, so formatLog
// below would throw ReferenceError on `scrubPII`. Import it for local use, then re-export.
import { redactLogString } from '../redactionRules.mjs';

const scrubPII = redactLogString;
export { scrubPII };

export class PIISafeLogger {
  constructor() {
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    this.currentLevel = 2; // Info level default
    // Only `enabled` exists because only `enabled` is read. The original config also declared
    // `defaultMethod: 'mask'` and `preserveFormat: true`, which nothing ever consumed — and
    // `preserveFormat` actively misdescribes the behavior: scrubbing substitutes a typed
    // placeholder (`<REDACTED-SSN>`), it does not preserve the original shape. Config that
    // describes behavior the code does not have is the same false-assurance defect as the
    // unscrubbed logger itself, so it is removed rather than left as decoration.
    // Default ON: a logger that must be opted INTO scrubbing is one that ships unscrubbed.
    this.scrubConfig = {
      enabled: true
    };
  }
  
  /**
   * Ultra-safe format log function
   */
  formatLog(level, message, meta = {}) {
    try {
      const timestamp = new Date().toISOString();
      
      // Handle message safely
      let safeMessage = '';
      if (message === null || message === undefined) {
        safeMessage = '';
      } else if (typeof message === 'string') {
        safeMessage = message;
      } else {
        try {
          safeMessage = String(message);
        } catch (e) {
          safeMessage = '[MESSAGE_CONVERSION_ERROR]';
        }
      }
      
      // Handle meta safely
      let safeMeta = '';
      if (meta && typeof meta === 'object' && meta !== null) {
        try {
          // Create a safe copy of meta
          const safeMetaObj = {};
          for (const [key, value] of Object.entries(meta)) {
            try {
              if (value !== undefined && value !== null) {
                safeMetaObj[key] = value;
              }
            } catch (e) {
              safeMetaObj[key] = '[FIELD_ERROR]';
            }
          }
          
          if (Object.keys(safeMetaObj).length > 0) {
            safeMeta = JSON.stringify(safeMetaObj, null, 2);
          }
        } catch (e) {
          safeMeta = '[META_FORMATTING_ERROR]';
        }
      }

      // Scrub AFTER serialization: meta is already a JSON string here, so one pass covers
      // arbitrarily nested values without walking the object tree. This is the single chokepoint
      // every log method (error/warn/info/debug/trace) funnels through, so scrubbing here covers
      // all of them — there is no second path that bypasses it.
      if (this.scrubConfig?.enabled) {
        safeMessage = scrubPII(safeMessage);
        safeMeta = scrubPII(safeMeta);
      }

      return {
        timestamp,
        level: level.toUpperCase(),
        message: safeMessage,
        meta: safeMeta,
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost'
      };
    } catch (error) {
      // Absolute fallback
      return {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        message: '[FORMATTING_ERROR]',
        meta: '',
        pid: process.pid,
        hostname: 'localhost',
        formatError: error.message
      };
    }
  }
  
  /**
   * Ultra-safe error logging
   */
  async error(message, meta = {}) {
    try {
      const logEntry = this.formatLog('error', message, meta);
      console.error(JSON.stringify(logEntry));
    } catch (error) {
      // Final fallback - direct console
      console.error('LOG_ERROR:', String(message || ''));
    }
  }
  
  /**
   * Ultra-safe warn logging
   */
  async warn(message, meta = {}) {
    try {
      const logEntry = this.formatLog('warn', message, meta);
      console.warn(JSON.stringify(logEntry));
    } catch (error) {
      console.warn('LOG_ERROR:', String(message || ''));
    }
  }
  
  /**
   * Ultra-safe info logging
   */
  async info(message, meta = {}) {
    try {
      const logEntry = this.formatLog('info', message, meta);
      console.info(JSON.stringify(logEntry));
    } catch (error) {
      console.info('LOG_ERROR:', String(message || ''));
    }
  }
  
  /**
   * Ultra-safe debug logging
   */
  async debug(message, meta = {}) {
    try {
      const logEntry = this.formatLog('debug', message, meta);
      console.debug(JSON.stringify(logEntry));
    } catch (error) {
      console.debug('LOG_ERROR:', String(message || ''));
    }
  }
  
  /**
   * Ultra-safe trace logging
   */
  async trace(message, meta = {}) {
    try {
      const logEntry = this.formatLog('trace', message, meta);
      console.log(JSON.stringify(logEntry));
    } catch (error) {
      console.log('LOG_ERROR:', String(message || ''));
    }
  }
  
  /**
   * Track MCP operations (wrapper around info logging)
   */
  async trackMCPOperation(operation, meta = {}) {
    try {
      const trackingMeta = {
        operation_type: 'mcp_operation',
        operation_name: operation,
        timestamp: new Date().toISOString(),
        ...meta
      };
      
      await this.info(`MCP Operation: ${operation}`, trackingMeta);
    } catch (error) {
      // Fallback to basic logging
      console.info('MCP_OPERATION:', String(operation || ''));
    }
  }

  /**
   * Track an AI generation event (ethical review, plan generation, human-review flag).
   *
   * WHY THIS EXISTS: four call sites invoked `piiSafeLogger.trackAIGeneration(...)` while the
   * method did not exist, so every one threw `TypeError: not a function`. Because two of those
   * sites sit at the TOP of their try blocks — `EthicalAIReview.reviewWorkoutGeneration` and
   * `EthicalAIReview.flagForHumanReview` — the throw aborted the function before any real work
   * ran. Net effect on main: workout ethical review always returned `passed:false score:0`, and
   * the human-review escalation never fired for ANY plan. Adding the method restores both.
   *
   * Only the user ID is recorded, never a name or contact detail (Rule 8: IDs are the allowed
   * form). Never throws — an observability call must not be able to break the reviewed path,
   * which is the exact failure mode this method was added to end.
   *
   * @param {string} generationType - e.g. 'workout_generation' | 'nutrition_planning'
   * @param {string|number} userId - client ID only (never a name)
   * @param {Object} meta - additional non-PII context
   */
  async trackAIGeneration(generationType, userId, meta = {}) {
    try {
      const trackingMeta = {
        operation_type: 'ai_generation',
        generation_type: generationType,
        user_id: userId ?? null,
        timestamp: new Date().toISOString(),
        ...meta
      };

      await this.info(`AI Generation: ${generationType}`, trackingMeta);
    } catch (error) {
      // Fallback to basic logging — never rethrow into the caller's critical path.
      console.info('AI_GENERATION:', String(generationType || ''));
    }
  }

  /**
   * Shared emitter for the domain trackers below.
   *
   * These seven trackers were CALLED in 47 places but never defined, so every call threw a
   * TypeError. Because each call site sits inside a `try`, the throw was laundered into whatever
   * that `catch` did — most visibly a blanket HTTP 500 on all five mounted `/api/master-prompt`
   * route files, for every role including admin. `trackSecurityEvent` was among the missing, so
   * suspicious-request / auth-failure / permission-denial audit events were lost rather than logged.
   *
   * One emitter, seven wrappers: seven near-identical bodies is how the next one drifts.
   * `userId` is an ID only — never a name or email (Rule 8); `meta` is scrubbed downstream by
   * `formatLog`, the single chokepoint every level funnels through.
   *
   * @param {'info'|'warn'} level    - severity to emit at
   * @param {string} operationType   - stable machine-readable category for querying logs
   * @param {string} label           - human-readable prefix in the message
   * @param {string} eventName       - the specific event, e.g. 'permission_denied'
   * @param {string|number|null} userId - client ID only
   * @param {Object} meta            - additional non-PII context
   */
  async trackDomainEvent(level, operationType, label, eventName, userId, meta = {}) {
    try {
      await this[level](`${label}: ${eventName}`, {
        operation_type: operationType,
        event_name: eventName,
        user_id: userId ?? null,
        timestamp: new Date().toISOString(),
        ...meta
      });
    } catch (error) {
      // Never rethrow: a failed audit line must not take down the caller's request.
      console.info(`${operationType.toUpperCase()}:`, String(eventName || ''));
    }
  }

  /** Security/intrusion signals — emitted at warn so they surface above routine traffic. */
  async trackSecurityEvent(eventName, userId, meta = {}) {
    return this.trackDomainEvent('warn', 'security_event', 'Security Event', eventName, userId, meta);
  }

  async trackAccessibilityUsage(eventName, userId, meta = {}) {
    return this.trackDomainEvent('info', 'accessibility_usage', 'Accessibility', eventName, userId, meta);
  }

  async trackUserAction(actionName, userId, meta = {}) {
    return this.trackDomainEvent('info', 'user_action', 'User Action', actionName, userId, meta);
  }

  async trackPrivacyOperation(operationName, userId, meta = {}) {
    return this.trackDomainEvent('info', 'privacy_operation', 'Privacy Operation', operationName, userId, meta);
  }

  async trackPrivacyAccess(eventName, userId, meta = {}) {
    return this.trackDomainEvent('info', 'privacy_access', 'Privacy Access', eventName, userId, meta);
  }

  async trackGamificationEngagement(eventName, userId, meta = {}) {
    return this.trackDomainEvent('info', 'gamification_engagement', 'Gamification', eventName, userId, meta);
  }

  async trackGamificationEvent(eventName, userId, meta = {}) {
    return this.trackDomainEvent('info', 'gamification_event', 'Gamification', eventName, userId, meta);
  }
}

// Export singleton instance
export const piiSafeLogger = new PIISafeLogger();
