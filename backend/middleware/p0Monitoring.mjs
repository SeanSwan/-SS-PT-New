/**
 * P0 Monitoring Middleware
 * Critical monitoring and permission middleware for Master Prompt v26
 */

import { piiSafeLogger } from '../utils/monitoring/piiSafeLogging.mjs';
import { accessibilityAwareAuth } from '../utils/monitoring/accessibilityAuth.mjs';

/**
 * Middleware to require permission with accessibility awareness
 */
export const requirePermissionWithAccessibility = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        const accessibilityError = accessibilityAwareAuth.generateAccessibilityError(
          requiredPermission,
          { preferredLanguage: req.headers['accept-language'] }
        );
        
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'authentication_required',
          accessibility: accessibilityError
        });
      }
      
      // Get user role and accessibility preferences
      const userRole = req.user.role || 'user';
      const accessibilityPreferences = req.user.accessibilityPreferences || {};
      
      // Check permission with accessibility context
      const hasPermission = accessibilityAwareAuth.checkPermission(
        requiredPermission,
        userRole,
        {
          userId: req.user.id,
          accessibility: accessibilityPreferences
        }
      );
      
      if (!hasPermission) {
        const accessibilityError = accessibilityAwareAuth.generateAccessibilityError(
          requiredPermission,
          {
            userId: req.user.id,
            userRole,
            preferredLanguage: req.user.preferredLanguage || 'en',
            accessibilityPreferences
          }
        );
        
        // Log permission denial
        piiSafeLogger.trackAccessibilityUsage('permission_denied', req.user.id, {
          requiredPermission,
          userRole,
          path: req.path,
          method: req.method
        });
        
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
          error: 'permission_denied',
          accessibility: accessibilityError,
          requiredPermission,
          userRole
        });
      }
      
      // Log successful permission check
      piiSafeLogger.trackAccessibilityUsage('permission_granted', req.user.id, {
        requiredPermission,
        userRole,
        path: req.path,
        method: req.method
      });
      
      // Add permission info to request for downstream use
      req.permissionContext = {
        requiredPermission,
        userRole,
        hasPermission: true,
        accessibilityPreferences
      };
      
      next();
    } catch (error) {
      piiSafeLogger.error('Permission middleware error', {
        error: error.message,
        requiredPermission,
        userId: req.user?.id,
        path: req.path
      });
      
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: 'permission_check_error'
      });
    }
  };
};

/**
 * P0 Security monitoring middleware
 */
export const p0SecurityMonitoring = () => {
  return async (req, res, next) => {
    try {
      const startTime = Date.now();
      
      // Track critical security events
      const securityContext = {
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      };
      
      // Monitor for suspicious patterns
      const suspiciousPatterns = [
        // SQL injection attempts
        /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i,
        // XSS attempts
        /<script|javascript:|onload=|onerror=/i,
        // Path traversal
        /\.\.[\/\\]/,
        // Command injection
        /[;&|`$()]/
      ];
      
      const bodyString = JSON.stringify(req.body || {});
      const queryString = JSON.stringify(req.query || {});
      const suspicious = suspiciousPatterns.some(pattern => 
        pattern.test(req.path) || 
        pattern.test(bodyString) || 
        pattern.test(queryString)
      );
      
      if (suspicious) {
        piiSafeLogger.trackSecurityEvent('suspicious_request', req.user?.id, {
          ...securityContext,
          severity: 'high',
          reason: 'Pattern match detected'
        });
      }
      
      // Monitor for rapid requests (rate limiting indicator)
      if (req.session) {
        req.session.requestCount = (req.session.requestCount || 0) + 1;
        req.session.lastRequest = Date.now();
        
        if (req.session.requestCount > 100) { // 100 requests per session
          piiSafeLogger.trackSecurityEvent('high_request_volume', req.user?.id, {
            ...securityContext,
            requestCount: req.session.requestCount,
            severity: 'medium'
          });
        }
      }
      
      // Add response time monitoring
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        
        // Log slow responses
        if (responseTime > 5000) { // 5 seconds
          piiSafeLogger.trackAccessibilityUsage('slow_response', req.user?.id, {
            path: req.path,
            method: req.method,
            responseTime,
            statusCode: res.statusCode
          });
        }
        
        // Log failed authentication attempts
        if (res.statusCode === 401) {
          piiSafeLogger.trackSecurityEvent('authentication_failure', req.user?.id, {
            ...securityContext,
            statusCode: res.statusCode,
            severity: 'medium'
          });
        }
        
        // Log permission denials
        if (res.statusCode === 403) {
          piiSafeLogger.trackSecurityEvent('permission_denial', req.user?.id, {
            ...securityContext,
            statusCode: res.statusCode,
            severity: 'low'
          });
        }
      });
      
      next();
    } catch (error) {
      piiSafeLogger.error('Security monitoring middleware error', {
        error: error.message,
        path: req.path,
        method: req.method
      });
      next();
    }
  };
};

/**
 * P0 Privacy compliance middleware
 */
export const p0PrivacyCompliance = () => {
  return async (req, res, next) => {
    try {
      // Check for PII in request
      if (req.body && typeof req.body === 'object') {
        const bodyString = JSON.stringify(req.body);
        
        // Basic PII detection patterns
        const piiPatterns = [
          { name: 'email', pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
          { name: 'ssn', pattern: /\b\d{3}-?\d{2}-?\d{4}\b/g },
          { name: 'phone', pattern: /\b\d{3}-?\d{3}-?\d{4}\b/g },
          { name: 'creditCard', pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g }
        ];
        
        for (const { name, pattern } of piiPatterns) {
          if (pattern.test(bodyString)) {
            piiSafeLogger.trackPrivacyOperation('pii_detected_in_request', req.user?.id, {
              piiType: name,
              path: req.path,
              method: req.method,
              hasConsent: req.headers['x-pii-consent'] === 'true'
            });
          }
        }
      }
      
      // Add privacy headers to response
      res.setHeader('X-Privacy-Policy', '/privacy-policy');
      res.setHeader('X-Data-Protection', 'GDPR-CCPA-Compliant');
      res.setHeader('X-PII-Protection', 'Enabled');
      
      next();
    } catch (error) {
      piiSafeLogger.error('Privacy compliance middleware error', {
        error: error.message,
        path: req.path
      });
      next();
    }
  };
};

/**
 * P0 Accessibility compliance middleware
 */
export const p0AccessibilityCompliance = () => {
  return async (req, res, next) => {
    try {
      // Extract accessibility information from request
      const accessibilityHeaders = {
        screenReader: req.headers['x-screen-reader'] === 'true',
        highContrast: req.headers['x-high-contrast'] === 'true',
        reducedMotion: req.headers['x-reduced-motion'] === 'true',
        largeText: req.headers['x-large-text'] === 'true'
      };
      
      // Add accessibility context to request
      req.accessibilityContext = {
        ...accessibilityHeaders,
        userAgent: req.headers['user-agent'],
        acceptLanguage: req.headers['accept-language'],
        preferences: req.user?.accessibilityPreferences || {}
      };
      
      // Set accessibility response headers
      res.setHeader('X-Accessibility-Support', 'WCAG-2.1-AA');
      res.setHeader('X-Screen-Reader-Support', 'Enabled');
      res.setHeader('X-Keyboard-Navigation', 'Enabled');
      
      // Track accessibility usage
      if (Object.values(accessibilityHeaders).some(Boolean)) {
        piiSafeLogger.trackAccessibilityUsage('accessibility_headers_detected', req.user?.id, {
          headers: accessibilityHeaders,
          path: req.path,
          method: req.method
        });
      }
      
      next();
    } catch (error) {
      piiSafeLogger.error('Accessibility compliance middleware error', {
        error: error.message,
        path: req.path
      });
      next();
    }
  };
};

/**
 * P0 Performance monitoring middleware
 */
export const p0PerformanceMonitoring = () => {
  return async (req, res, next) => {
    try {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      // Add performance tracking to request
      req.performance = {
        startTime,
        startMemory
      };
      
      res.on('finish', () => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        const responseTime = endTime - startTime;
        
        const performanceMetrics = {
          responseTime,
          memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
          path: req.path,
          method: req.method,
          statusCode: res.statusCode,
          contentLength: res.get('content-length') || 0
        };
        
        // Log performance metrics
        piiSafeLogger.trackUserAction('request_performance', req.user?.id, performanceMetrics);
        
        // Alert on poor performance
        if (responseTime > 3000) { // 3 seconds
          piiSafeLogger.warn('Slow request detected', {
            ...performanceMetrics,
            severity: responseTime > 10000 ? 'high' : 'medium'
          });
        }
        
        // Alert on high memory usage
        if (performanceMetrics.memoryUsed > 50 * 1024 * 1024) { // 50MB
          piiSafeLogger.warn('High memory usage detected', {
            ...performanceMetrics,
            severity: 'medium'
          });
        }
      });
      
      next();
    } catch (error) {
      piiSafeLogger.error('Performance monitoring middleware error', {
        error: error.message,
        path: req.path
      });
      next();
    }
  };
};

/**
 * P0 Error handling middleware
 */
export const p0ErrorHandling = () => {
  return (error, req, res, next) => {
    try {
      // Log error with accessibility context
      piiSafeLogger.error('Request error', {
        error: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        userId: req.user?.id,
        statusCode: error.statusCode || 500
      });
      
      // Generate accessibility-aware error response
      const accessibilityError = accessibilityAwareAuth.generateAccessibilityError(
        req.path,
        {
          userId: req.user?.id,
          userRole: req.user?.role,
          preferredLanguage: req.user?.preferredLanguage,
          accessibilityPreferences: req.user?.accessibilityPreferences
        }
      );
      
      // Send error response
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Internal server error',
        error: error.code || 'INTERNAL_ERROR',
        accessibility: accessibilityError,
        timestamp: new Date().toISOString()
      });
    } catch (handlingError) {
      // Fallback error handling
      piiSafeLogger.error('Error handling middleware failed', {
        originalError: error.message,
        handlingError: handlingError.message
      });
      
      res.status(500).json({
        success: false,
        message: 'A server error occurred',
        error: 'ERROR_HANDLING_FAILED'
      });
    }
  };
};

/**
 * P0 Request correlation middleware
 */
export const p0RequestCorrelation = () => {
  return (req, res, next) => {
    try {
      // Generate correlation ID for request tracking
      const correlationId = req.headers['x-correlation-id'] || 
                           `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      
      // Add correlation ID to request and response
      req.correlationId = correlationId;
      res.setHeader('X-Correlation-ID', correlationId);
      
      // Add correlation context for logging
      req.logContext = {
        correlationId,
        userId: req.user?.id,
        sessionId: req.session?.id,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      };
      
      next();
    } catch (error) {
      piiSafeLogger.error('Request correlation middleware error', {
        error: error.message,
        path: req.path
      });
      next();
    }
  };
};

/**
 * P0 Master Prompt integration middleware
 */
export const p0MasterPromptIntegration = () => {
  return (req, res, next) => {
    try {
      // Add Master Prompt v26 context
      req.masterPrompt = {
        version: '26',
        features: {
          ethicalAI: true,
          accessibility: true,
          gamification: true,
          mcpCentric: true,
          privacyFirst: true
        },
        compliance: {
          gdpr: true,
          ccpa: true,
          wcag: 'AA'
        }
      };
      
      // Set Master Prompt headers
      res.setHeader('X-Master-Prompt-Version', '26');
      res.setHeader('X-Ethical-AI', 'Enabled');
      res.setHeader('X-Privacy-First', 'Enabled');
      
      next();
    } catch (error) {
      piiSafeLogger.error('Master Prompt integration middleware error', {
        error: error.message,
        path: req.path
      });
      next();
    }
  };
};

// Combined P0 middleware stack
export const p0MiddlewareStack = () => {
  return [
    p0RequestCorrelation(),
    p0SecurityMonitoring(),
    p0PrivacyCompliance(),
    p0AccessibilityCompliance(),
    p0PerformanceMonitoring(),
    p0MasterPromptIntegration()
  ];
};

export default {
  requirePermissionWithAccessibility,
  p0SecurityMonitoring,
  p0PrivacyCompliance,
  p0AccessibilityCompliance,
  p0PerformanceMonitoring,
  p0ErrorHandling,
  p0RequestCorrelation,
  p0MasterPromptIntegration,
  p0MiddlewareStack
};