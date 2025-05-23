/**
 * Startup-Safe Wrapper for PII Logger
 * Prevents PII scanning during application startup
 */

let isStartupPhase = true;
let startupLogs = [];

// Disable PII scanning for the first 5 seconds of startup
setTimeout(() => {
  isStartupPhase = false;
  console.log('📋 PII scanning enabled after startup phase');
}, 5000);

export class StartupSafePIILogger {
  constructor() {
    this.realLogger = null;
    this.initLogger();
  }
  
  async initLogger() {
    try {
      // Dynamically import the real logger to avoid startup issues
      const { piiSafeLogger } = await import('./piiSafeLogging.mjs');
      this.realLogger = piiSafeLogger;
    } catch (error) {
      console.warn('Could not initialize PII logger:', error.message);
    }
  }
  
  async log(level, message, meta = {}) {
    if (isStartupPhase) {
      // During startup, just use console logging
      const logEntry = {
        level: level.toUpperCase(),
        message,
        meta,
        timestamp: new Date().toISOString(),
        startupSafe: true
      };
      console[level.toLowerCase()](JSON.stringify(logEntry));
      startupLogs.push(logEntry);
      return;
    }
    
    // After startup, use the real PII logger
    if (this.realLogger && this.realLogger[level]) {
      await this.realLogger[level](message, meta);
    } else {
      console[level.toLowerCase()](message, meta);
    }
  }
  
  async info(message, meta = {}) {
    return this.log('info', message, meta);
  }
  
  async warn(message, meta = {}) {
    return this.log('warn', message, meta);
  }
  
  async error(message, meta = {}) {
    return this.log('error', message, meta);
  }
  
  async debug(message, meta = {}) {
    return this.log('debug', message, meta);
  }
  
  async trace(message, meta = {}) {
    return this.log('trace', message, meta);
  }
}

// Export singleton instance
export const startupSafePIILogger = new StartupSafePIILogger();
