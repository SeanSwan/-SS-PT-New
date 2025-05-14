/**
 * PII-Safe Logger
 * Logging utility that automatically scrubs PII from log messages
 */

import { piiManager } from '../../services/privacy/PIIManager.mjs';

export class PIISafeLogger {
  constructor() {
    // Log levels
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
      trace: 4
    };
    
    // Current log level (can be configured via env)
    this.currentLevel = process.env.LOG_LEVEL 
      ? this.logLevels[process.env.LOG_LEVEL.toLowerCase()] ?? 2
      : 2;
    
    // PII scrubbing configuration
    this.scrubConfig = {
      enabled: process.env.PII_SCRUBBING !== 'false',
      methods: ['mask', 'hash', 'remove'],
      defaultMethod: 'mask',
      preserveFormat: true,
      strictMode: process.env.NODE_ENV === 'production'
    };
    
    // Tracking categories for specialized logging
    this.trackingCategories = {
      user_action: 'User Action',
      privacy_operation: 'Privacy Operation',
      accessibility_usage: 'Accessibility Usage',
      ai_generation: 'AI Generation',
      mcp_operation: 'MCP Operation',
      gamification_engagement: 'Gamification Engagement',
      security_event: 'Security Event'
    };
    
    // Initialize logger
    this.initializeLogger();
  }
  
  /**
   * Initialize the logger with console fallback
   */
  initializeLogger() {
    // In a production environment, you might want to use winston, bunyan, or similar
    // For now, we'll use console with formatting
    this.logger = console;
    
    // Add timestamp formatting
    this.formatLog = (level, message, meta = {}) => {
      const timestamp = new Date().toISOString();
      const formattedMeta = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
      
      return {
        timestamp,
        level: level.toUpperCase(),
        message,
        meta: formattedMeta,
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost'
      };
    };
  }
  
  /**
   * Log error message with PII scrubbing
   */
  async error(message, meta = {}) {
    if (this.currentLevel < this.logLevels.error) return;
    
    try {
      const scrubbedData = await this.scrubPII(message, meta);
      const logEntry = this.formatLog('error', scrubbedData.message, scrubbedData.meta);
      
      this.logger.error(JSON.stringify(logEntry));
      
      // In production, you might want to send to error tracking service
      if (process.env.NODE_ENV === 'production') {
        await this.sendToErrorTracking(logEntry);
      }
    } catch (scrubError) {
      // Fallback logging if PII scrubbing fails
      this.logger.error('ERROR: Failed to scrub PII from log message', {
        originalError: message,
        scrubError: scrubError.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Log warning message with PII scrubbing
   */
  async warn(message, meta = {}) {
    if (this.currentLevel < this.logLevels.warn) return;
    
    try {
      const scrubbedData = await this.scrubPII(message, meta);
      const logEntry = this.formatLog('warn', scrubbedData.message, scrubbedData.meta);
      
      this.logger.warn(JSON.stringify(logEntry));
    } catch (scrubError) {
      this.logger.warn('WARN: Failed to scrub PII from log message', {
        originalWarning: message,
        scrubError: scrubError.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Log info message with PII scrubbing
   */
  async info(message, meta = {}) {
    if (this.currentLevel < this.logLevels.info) return;
    
    try {
      const scrubbedData = await this.scrubPII(message, meta);
      const logEntry = this.formatLog('info', scrubbedData.message, scrubbedData.meta);
      
      this.logger.info(JSON.stringify(logEntry));
    } catch (scrubError) {
      this.logger.info('INFO: Failed to scrub PII from log message', {
        originalInfo: message,
        scrubError: scrubError.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Log debug message with PII scrubbing
   */
  async debug(message, meta = {}) {
    if (this.currentLevel < this.logLevels.debug) return;
    
    try {
      const scrubbedData = await this.scrubPII(message, meta);
      const logEntry = this.formatLog('debug', scrubbedData.message, scrubbedData.meta);
      
      this.logger.debug(JSON.stringify(logEntry));
    } catch (scrubError) {
      this.logger.debug('DEBUG: Failed to scrub PII from log message', {
        originalDebug: message,
        scrubError: scrubError.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Log trace message with PII scrubbing
   */
  async trace(message, meta = {}) {
    if (this.currentLevel < this.logLevels.trace) return;
    
    try {
      const scrubbedData = await this.scrubPII(message, meta);
      const logEntry = this.formatLog('trace', scrubbedData.message, scrubbedData.meta);
      
      this.logger.log(JSON.stringify(logEntry));
    } catch (scrubError) {
      this.logger.log('TRACE: Failed to scrub PII from log message', {
        originalTrace: message,
        scrubError: scrubError.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Track user action with privacy-safe logging
   */
  async trackUserAction(action, userId, metadata = {}) {
    try {
      // Sanitize metadata to ensure no PII leakage
      const sanitizedMetadata = await this.sanitizeMetadata(metadata);
      
      const trackingData = {
        category: this.trackingCategories.user_action,
        action,
        userId: this.hashUserId(userId),
        metadata: sanitizedMetadata,
        timestamp: new Date().toISOString(),
        sessionId: metadata.sessionId ? this.hashSessionId(metadata.sessionId) : null
      };
      
      await this.info(`User action tracked: ${action}`, trackingData);
      
      // Send to analytics if configured
      if (process.env.ANALYTICS_ENABLED === 'true') {
        await this.sendToAnalytics(trackingData);
      }
    } catch (error) {
      await this.error('Failed to track user action', {
        action,
        error: error.message,
        userId: this.hashUserId(userId)
      });
    }
  }
  
  /**
   * Track privacy operation
   */
  async trackPrivacyOperation(operation, userId, metadata = {}) {
    try {
      const sanitizedMetadata = await this.sanitizeMetadata(metadata);
      
      const trackingData = {
        category: this.trackingCategories.privacy_operation,
        operation,
        userId: userId ? this.hashUserId(userId) : 'system',
        metadata: sanitizedMetadata,
        timestamp: new Date().toISOString(),
        compliance: true
      };
      
      await this.info(`Privacy operation: ${operation}`, trackingData);
      
      // Log to privacy audit trail
      await this.logToPrivacyAudit(trackingData);
    } catch (error) {
      await this.error('Failed to track privacy operation', {
        operation,
        error: error.message,
        userId: userId ? this.hashUserId(userId) : 'system'
      });
    }
  }
  
  /**
   * Track accessibility usage
   */
  async trackAccessibilityUsage(feature, userId, metadata = {}) {
    try {
      const sanitizedMetadata = await this.sanitizeMetadata(metadata);
      
      const trackingData = {
        category: this.trackingCategories.accessibility_usage,
        feature,
        userId: userId ? this.hashUserId(userId) : 'anonymous',
        metadata: sanitizedMetadata,
        timestamp: new Date().toISOString(),
        accessibility: true
      };
      
      await this.info(`Accessibility feature used: ${feature}`, trackingData);
    } catch (error) {
      await this.error('Failed to track accessibility usage', {
        feature,
        error: error.message,
        userId: userId ? this.hashUserId(userId) : 'anonymous'
      });
    }
  }
  
  /**
   * Track AI generation activities
   */
  async trackAIGeneration(type, userId, metadata = {}) {
    try {
      const sanitizedMetadata = await this.sanitizeMetadata(metadata);
      
      // Special handling for AI generation to avoid logging training data
      const trackingData = {
        category: this.trackingCategories.ai_generation,
        type,
        userId: this.hashUserId(userId),
        metadata: {
          ...sanitizedMetadata,
          inputSize: metadata.inputSize || 0,
          outputSize: metadata.outputSize || 0,
          processingTime: metadata.processingTime || 0,
          model: metadata.model || 'unknown',
          success: metadata.success !== false
        },
        timestamp: new Date().toISOString()
      };
      
      // Remove actual AI inputs/outputs from logs
      delete trackingData.metadata.input;
      delete trackingData.metadata.output;
      delete trackingData.metadata.prompt;
      delete trackingData.metadata.response;
      
      await this.info(`AI generation: ${type}`, trackingData);
    } catch (error) {
      await this.error('Failed to track AI generation', {
        type,
        error: error.message,
        userId: this.hashUserId(userId)
      });
    }
  }
  
  /**
   * Track MCP operations
   */
  async trackMCPOperation(operation, serverName, metadata = {}) {
    try {
      const sanitizedMetadata = await this.sanitizeMetadata(metadata);
      
      const trackingData = {
        category: this.trackingCategories.mcp_operation,
        operation,
        serverName,
        metadata: sanitizedMetadata,
        timestamp: new Date().toISOString(),
        system: 'mcp'
      };
      
      await this.info(`MCP operation: ${operation} on ${serverName}`, trackingData);
    } catch (error) {
      await this.error('Failed to track MCP operation', {
        operation,
        serverName,
        error: error.message
      });
    }
  }
  
  /**
   * Track gamification engagement
   */
  async trackGamificationEngagement(activity, userId, metadata = {}) {
    try {
      const sanitizedMetadata = await this.sanitizeMetadata(metadata);
      
      const trackingData = {
        category: this.trackingCategories.gamification_engagement,
        activity,
        userId: this.hashUserId(userId),
        metadata: sanitizedMetadata,
        timestamp: new Date().toISOString(),
        ethical: true
      };
      
      await this.info(`Gamification activity: ${activity}`, trackingData);
    } catch (error) {
      await this.error('Failed to track gamification engagement', {
        activity,
        error: error.message,
        userId: this.hashUserId(userId)
      });
    }
  }
  
  /**
   * Track security events
   */
  async trackSecurityEvent(event, userId, metadata = {}) {
    try {
      const sanitizedMetadata = await this.sanitizeMetadata(metadata);
      
      const trackingData = {
        category: this.trackingCategories.security_event,
        event,
        userId: userId ? this.hashUserId(userId) : 'system',
        metadata: {
          ...sanitizedMetadata,
          severity: metadata.severity || 'medium',
          ip: metadata.ip ? this.hashIP(metadata.ip) : null,
          userAgent: metadata.userAgent ? this.hashUserAgent(metadata.userAgent) : null
        },
        timestamp: new Date().toISOString(),
        security: true
      };
      
      await this.warn(`Security event: ${event}`, trackingData);
      
      // Send to security monitoring
      if (process.env.SECURITY_MONITORING_ENABLED === 'true') {
        await this.sendToSecurityMonitoring(trackingData);
      }
    } catch (error) {
      await this.error('Failed to track security event', {
        event,
        error: error.message,
        userId: userId ? this.hashUserId(userId) : 'system'
      });
    }
  }
  
  /**
   * Scrub PII from message and metadata
   */
  async scrubPII(message, meta = {}) {
    if (!this.scrubConfig.enabled) {
      return { message, meta };
    }
    
    try {
      // Scrub message
      const scrubbedMessage = await this.scrubText(message);
      
      // Scrub metadata
      const scrubbedMeta = await this.scrubObject(meta);
      
      return {
        message: scrubbedMessage,
        meta: scrubbedMeta
      };
    } catch (error) {
      // If scrubbing fails, either log safely or throw based on strict mode
      if (this.scrubConfig.strictMode) {
        throw new Error(`PII scrubbing failed in strict mode: ${error.message}`);
      }
      
      // In non-strict mode, return original data with warning
      return {
        message: '[PII_SCRUB_FAILED] ' + message,
        meta: {
          ...meta,
          piiScrubError: error.message,
          piiScrubWarning: 'Original data may contain PII'
        }
      };
    }
  }
  
  /**
   * Scrub PII from text
   */
  async scrubText(text) {
    if (typeof text !== 'string') {
      return text;
    }
    
    try {
      const sanitizationResult = await piiManager.sanitizeContent(text, {
        method: this.scrubConfig.defaultMethod,
        preserveFormat: this.scrubConfig.preserveFormat,
        context: 'logging'
      });
      
      return sanitizationResult.sanitizedContent;
    } catch (error) {
      // Fallback to basic scrubbing if PII manager fails
      return this.basicPIIScrub(text);
    }
  }
  
  /**
   * Scrub PII from objects recursively
   */
  async scrubObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => this.scrubObject(item)));
    }
    
    const scrubbedObj = {};
    
    for (const [key, value] of Object.entries(obj)) {
      // Skip certain metadata fields that shouldn't contain PII
      if (this.isSafeField(key)) {
        scrubbedObj[key] = value;
        continue;
      }
      
      if (typeof value === 'string') {
        scrubbedObj[key] = await this.scrubText(value);
      } else if (typeof value === 'object' && value !== null) {
        scrubbedObj[key] = await this.scrubObject(value);
      } else {
        scrubbedObj[key] = value;
      }
    }
    
    return scrubbedObj;
  }
  
  /**
   * Basic PII scrubbing fallback
   */
  basicPIIScrub(text) {
    // Basic regex patterns for common PII
    const patterns = [
      { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
      { pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g, replacement: '[SSN]' },
      { pattern: /\b\d{3}-?\d{3}-?\d{4}\b/g, replacement: '[PHONE]' },
      { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD]' }
    ];
    
    let scrubbedText = text;
    
    for (const { pattern, replacement } of patterns) {
      scrubbedText = scrubbedText.replace(pattern, replacement);
    }
    
    return scrubbedText;
  }
  
  /**
   * Check if field is safe from PII
   */
  isSafeField(fieldName) {
    const safeFields = [
      'timestamp',
      'level',
      'pid',
      'hostname',
      'success',
      'count',
      'duration',
      'status',
      'method',
      'statusCode',
      'responseTime',
      'category',
      'type',
      'severity'
    ];
    
    return safeFields.includes(fieldName.toLowerCase());
  }
  
  /**
   * Sanitize metadata for tracking
   */
  async sanitizeMetadata(metadata) {
    const sanitized = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Hash certain identifiers
      if (key === 'userId') {
        sanitized[key] = this.hashUserId(value);
      } else if (key === 'sessionId') {
        sanitized[key] = this.hashSessionId(value);
      } else if (key === 'ip') {
        sanitized[key] = this.hashIP(value);
      } else if (key === 'userAgent') {
        sanitized[key] = this.hashUserAgent(value);
      } else if (typeof value === 'string' && await this.mightContainPII(value)) {
        sanitized[key] = await this.scrubText(value);
      } else if (this.isSafeField(key) || this.isSafeValue(value)) {
        sanitized[key] = value;
      } else {
        // For complex objects, recursively sanitize
        sanitized[key] = await this.scrubObject(value);
      }
    }
    
    return sanitized;
  }
  
  /**
   * Quick check if text might contain PII
   */
  async mightContainPII(text) {
    if (typeof text !== 'string' || text.length < 3) {
      return false;
    }
    
    // Quick regex check for common PII patterns
    const quickPatterns = [
      /@.*\./,  // Email-like
      /\d{3}-\d{2}-\d{4}/, // SSN-like
      /\d{3}-\d{3}-\d{4}/, // Phone-like
      /\d{4}.*\d{4}.*\d{4}.*\d{4}/ // Card-like
    ];
    
    return quickPatterns.some(pattern => pattern.test(text));
  }
  
  /**
   * Check if value is safe (non-PII)
   */
  isSafeValue(value) {
    if (typeof value === 'number' || typeof value === 'boolean') {
      return true;
    }
    
    if (typeof value === 'string') {
      // Very short strings are likely safe
      if (value.length <= 3) {
        return true;
      }
      
      // Common safe values
      const safeValues = ['true', 'false', 'success', 'error', 'pending', 'completed'];
      return safeValues.includes(value.toLowerCase());
    }
    
    return false;
  }
  
  /**
   * Hash user ID for privacy
   */
  hashUserId(userId) {
    if (!userId) return null;
    return `user_${this.simpleHash(userId.toString())}`;
  }
  
  /**
   * Hash session ID for privacy
   */
  hashSessionId(sessionId) {
    if (!sessionId) return null;
    return `session_${this.simpleHash(sessionId.toString())}`;
  }
  
  /**
   * Hash IP address for privacy
   */
  hashIP(ip) {
    if (!ip) return null;
    return `ip_${this.simpleHash(ip)}`;
  }
  
  /**
   * Hash user agent for privacy
   */
  hashUserAgent(userAgent) {
    if (!userAgent) return null;
    return `ua_${this.simpleHash(userAgent)}`;
  }
  
  /**
   * Simple hash function for identifiers
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }
  
  /**
   * Set log level
   */
  setLogLevel(level) {
    const normalizedLevel = level.toLowerCase();
    if (this.logLevels[normalizedLevel] !== undefined) {
      this.currentLevel = this.logLevels[normalizedLevel];
    } else {
      throw new Error(`Invalid log level: ${level}`);
    }
  }
  
  /**
   * Get current log level
   */
  getLogLevel() {
    return Object.keys(this.logLevels).find(
      key => this.logLevels[key] === this.currentLevel
    );
  }
  
  /**
   * Configure PII scrubbing
   */
  configurePIIScrubbing(config) {
    this.scrubConfig = {
      ...this.scrubConfig,
      ...config
    };
  }
  
  // Integration methods for external services
  
  async sendToErrorTracking(logEntry) {
    // Placeholder for error tracking service integration
    // e.g., Sentry, Bugsnag, etc.
    if (process.env.ERROR_TRACKING_URL) {
      // Implementation would send to error tracking service
    }
  }
  
  async sendToAnalytics(trackingData) {
    // Placeholder for analytics service integration
    // e.g., Google Analytics, Mixpanel, etc.
    if (process.env.ANALYTICS_URL) {
      // Implementation would send to analytics service
    }
  }
  
  async sendToSecurityMonitoring(trackingData) {
    // Placeholder for security monitoring integration
    // e.g., Splunk, DataDog, etc.
    if (process.env.SECURITY_MONITORING_URL) {
      // Implementation would send to security monitoring
    }
  }
  
  async logToPrivacyAudit(trackingData) {
    // Placeholder for privacy audit log
    // This would typically go to a separate, secured audit database
    await this.info('Privacy audit log', {
      auditType: 'privacy_operation',
      data: trackingData,
      compliance: 'gdpr_ccpa'
    });
  }
}

// Export singleton instance
export const piiSafeLogger = new PIISafeLogger();