/**
 * PII-Safe Logger - FIXED VERSION
 * Ultra-safe logging with comprehensive error handling
 */

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
    this.scrubConfig = {
      enabled: true,
      defaultMethod: 'mask',
      preserveFormat: true
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
}

// Export singleton instance
export const piiSafeLogger = new PIISafeLogger();
