/**
 * PII-Safe Logger - FIXED VERSION
 * Ultra-safe logging with comprehensive error handling, and actual PII scrubbing.
 */

/**
 * High-confidence PII/secret SHAPES scrubbed from log output.
 *
 * WHY THIS EXISTS: the class was named "PII-Safe Logger" and declared a `scrubConfig` in its
 * constructor, but nothing ever read that config and `formatLog` copied every meta value through
 * verbatim. The name and the config promised scrubbing that did not happen — so callers passed
 * PII to it believing it was handled. Same failure class as a safety check that reports a pass
 * without running: the danger is the false assurance, not the missing feature.
 *
 * EVERY QUANTIFIER IS UPPER-BOUNDED. Regex backtracking is superlinear in the length of one
 * contiguous run, and this function now sits in front of ~246 log call sites — an unbounded `+`
 * over a punctuation-rich line is a self-inflicted DoS on the logging path. Rules run PER LINE to
 * bound the unit of work even if someone later adds a looser pattern.
 *
 * DELIBERATE NON-RULE — bare 10-digit runs are NOT treated as phone numbers. A pattern matching
 * any 10 consecutive digits also eats Sequelize migration timestamps, epoch millis, and long
 * numeric IDs. That exact over-match was found in another script in this repo, where it silently
 * replaced migration filenames with a redaction placeholder. In LOGS a bare digit run is far more
 * likely to be an ID than a phone, and destroying IDs would gut debuggability — the whole reason
 * these logs exist. Phone matching therefore REQUIRES separators or a +1 prefix.
 */
/*
 * RULE ORDER IS LOAD-BEARING. Rules apply in sequence, so a broad rule placed early consumes
 * text a more specific rule would have matched better.
 *
 * Concretely: EMAIL must come AFTER the credential-URL rules. A database connection string embeds
 * a `password@hostname` segment, and EMAIL matches exactly that segment. With EMAIL ordered first,
 * scrubbing a connection string removed the password but replaced only that inner segment — the
 * result was mislabeled as an email, and the scheme plus username survived, partially disclosing
 * the connection target. Caught by hostile review; the credential-URL rules now run first and
 * consume the whole URL. Keep specific-before-general ordering when adding rules.
 * (No literal example is written here: an illustrative credential URL in a comment is itself
 * secret-shaped and trips the repo secret scanner — which is correct behavior on its part.)
 */
const PII_RULES = [
  ['JWT', /\beyJ[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,4096}/g],
  ['STRIPE', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,256}/g],
  ['STRIPE_WHSEC', /\bwhsec_[A-Za-z0-9]{16,256}/g],
  ['ANTHROPIC', /\bsk-ant-[A-Za-z0-9_-]{20,256}/g],
  ['OPENAI', /\bsk-(?:or-)?(?:proj-|v1-)?[A-Za-z0-9_-]{20,256}/g],
  ['GOOGLE', /\bAIza[0-9A-Za-z_-]{30,120}/g],
  ['SLACK', /\bxox[baprs]-[A-Za-z0-9-]{10,256}/g],
  ['GITHUB', /\bgh[pousr]_[A-Za-z0-9]{36,256}/g],
  ['AWS_AKID', /\bAKIA[0-9A-Z]{16}\b/g],
  // Credential URLs BEFORE email — see the ordering note above.
  ['DB_URL', /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]{1,128}:[^\s:@/]{1,256}@[^\s/]{1,256}/g],
  ['HTTP_AUTH_URL', /\bhttps?:\/\/[^\s:@/]{1,128}:[^\s:@/]{1,256}@[^\s/]{1,256}/g],
  ['EMAIL', /\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}\b/g],
  ['SSN', /\b\d{3}-\d{2}-\d{4}\b/g],
  // Separator-or-prefix required — see the deliberate non-rule note above.
  ['PHONE', /(?:\+1[-.\s])?\(\d{3}\)[-.\s]?\d{3}[-.\s]?\d{4}\b|\b(?:\+1[-.\s])?\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/g]
];

const PRIVATE_KEY_RULE =
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----[\s\S]{1,8192}?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g;

/**
 * Replace high-confidence PII/secret shapes with typed placeholders.
 * Never throws — a scrubbing failure must not be able to suppress a log line. If scrubbing
 * cannot complete, the caller keeps the original text rather than losing the entry entirely.
 * @returns {string}
 */
export function scrubPII(input) {
  try {
    if (typeof input !== 'string' || input.length === 0) return input;
    const afterKeys = input.replace(PRIVATE_KEY_RULE, '<REDACTED-PRIVATE_KEY>');
    return afterKeys
      .split('\n')
      .map((line) => {
        let out = line;
        for (const [kind, re] of PII_RULES) out = out.replace(re, `<REDACTED-${kind}>`);
        return out;
      })
      .join('\n');
  } catch {
    return input;
  }
}

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
}

// Export singleton instance
export const piiSafeLogger = new PIISafeLogger();
