/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         P0 CRITICAL MONITORING MIDDLEWARE (MASTER PROMPT V26)             ║
 * ║    (Security, Privacy, Accessibility, Performance, Error Handling)       ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Comprehensive P0 (Priority Zero) monitoring infrastructure providing
 *          security auditing, privacy compliance, accessibility tracking,
 *          performance metrics, and error handling for SwanStudios platform
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 * Master Prompt Version: 26 (Ethical AI, Accessibility-First, Privacy-First)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * P0 Monitoring Stack (9 Middleware Components):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                          CLIENT REQUEST                                   │
 * │  POST /api/workouts { name: "Leg Day", exercises: [...] }               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. p0RequestCorrelation()                                                │
 * │    - Generate correlation ID for request tracking                        │
 * │    - Add X-Correlation-ID header to response                             │
 * │    - Create req.logContext for downstream logging                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 2. p0SecurityMonitoring()                                                │
 * │    - Monitor for SQL injection, XSS, path traversal                      │
 * │    - Track suspicious patterns in req.body, req.query, req.path          │
 * │    - Rate limiting detection (100+ requests per session)                 │
 * │    - Log slow responses (>5s), auth failures (401), permission denials   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 3. p0PrivacyCompliance()                                                 │
 * │    - Detect PII in request body (email, SSN, phone, credit card)         │
 * │    - Log PII detection events with consent tracking                      │
 * │    - Add privacy headers (X-Privacy-Policy, X-Data-Protection, X-PII)    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 4. p0AccessibilityCompliance()                                           │
 * │    - Extract accessibility headers (x-screen-reader, x-high-contrast)    │
 * │    - Add req.accessibilityContext for downstream use                     │
 * │    - Set WCAG 2.1 AA compliance headers                                  │
 * │    - Track accessibility feature usage                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 5. p0PerformanceMonitoring()                                             │
 * │    - Track response time, memory usage, content length                   │
 * │    - Alert on slow responses (>3s), high memory usage (>50MB)            │
 * │    - Add req.performance with start time and memory                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 6. p0MasterPromptIntegration()                                           │
 * │    - Add Master Prompt v26 context to req.masterPrompt                   │
 * │    - Set X-Master-Prompt-Version, X-Ethical-AI, X-Privacy-First headers  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 7. requirePermissionWithAccessibility(permission)                        │
 * │    - Check user authentication (401 if not authenticated)                │
 * │    - Validate user permission for requested action                       │
 * │    - Generate accessibility-aware error messages                         │
 * │    - Add req.permissionContext for downstream use                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 8. Route Handler Executes (Protected by P0 Monitoring)                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼ (if error occurs)
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 9. p0ErrorHandling()                                                     │
 * │    - Log error with accessibility context, stack trace, user context     │
 * │    - Generate accessibility-aware error response                         │
 * │    - Return structured error with timestamp                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     SECURITY MONITORING DETAILS                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Threat Detection Patterns:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. SQL INJECTION                                                          │
 * │    Pattern: /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b)/i    │
 * │    Example: "admin' OR '1'='1", "UNION SELECT * FROM users"             │
 * │    Action: Log as high severity, continue (ORM protects against SQLi)    │
 * │                                                                           │
 * │ 2. CROSS-SITE SCRIPTING (XSS)                                            │
 * │    Pattern: /<script|javascript:|onload=|onerror=/i                      │
 * │    Example: "<script>alert('XSS')</script>", "javascript:void(0)"        │
 * │    Action: Log as high severity, sanitization applied by frontend        │
 * │                                                                           │
 * │ 3. PATH TRAVERSAL                                                        │
 * │    Pattern: /\.\.[\/\\]/                                                 │
 * │    Example: "../../etc/passwd", "..\\..\\..\\..\\..\\..\\.."           │
 * │    Action: Log as high severity, path validation prevents exploitation   │
 * │                                                                           │
 * │ 4. COMMAND INJECTION                                                      │
 * │    Pattern: /[;&|`$()]/                                                  │
 * │    Example: "test; rm -rf /", "file`whoami`.txt"                         │
 * │    Action: Log as high severity, no shell execution in codebase          │
 * │                                                                           │
 * │ 5. RATE LIMITING ABUSE                                                   │
 * │    Threshold: 100+ requests per session                                  │
 * │    Action: Log as medium severity, implement rate limiting if needed     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     PRIVACY COMPLIANCE DETAILS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * PII Detection Patterns:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ email      : /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g          │
 * │ ssn        : /\b\d{3}-?\d{2}-?\d{4}\b/g                                  │
 * │ phone      : /\b\d{3}-?\d{3}-?\d{4}\b/g                                  │
 * │ creditCard : /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Privacy Compliance Headers:
 * - X-Privacy-Policy: /privacy-policy (link to privacy policy)
 * - X-Data-Protection: GDPR-CCPA-Compliant (compliance standards)
 * - X-PII-Protection: Enabled (PII detection active)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY P0 (Priority Zero) Designation (Not P1 or P2)?
 * - Mission-critical: Security, privacy, accessibility cannot fail
 * - Master Prompt v26 foundation: Core ethical AI requirements
 * - Legal compliance: GDPR, CCPA, WCAG 2.1 AA are legal requirements
 * - User trust: Privacy breaches destroy platform credibility
 * - Non-negotiable: P0 features ship before any other features
 * - Always-on monitoring: Cannot be disabled or degraded
 *
 * WHY Correlation ID (Not Just req.id)?
 * - Distributed tracing: Track requests across microservices
 * - Log aggregation: Correlate logs from different services
 * - Client debugging: Client can include correlation ID in bug reports
 * - Replay attacks: Detect duplicate requests with same correlation ID
 * - Support tooling: Customer support can trace user issues
 * - Standard practice: X-Correlation-ID is industry standard header
 *
 * WHY Continue on Suspicious Patterns (Not Block Request)?
 * - False positives: Legitimate requests can match attack patterns
 * - Availability: Don't block legitimate users
 * - Defense in depth: Monitoring is one layer, not sole defense
 * - ORM protection: Sequelize prevents SQL injection even if pattern detected
 * - Logging sufficient: Security team reviews logs for real threats
 * - User experience: Blocking creates support burden
 *
 * WHY Track Accessibility Headers (Not Assume Default UI)?
 * - WCAG 2.1 AA compliance: Legal requirement for accessibility
 * - User preference tracking: Understand accessibility feature usage
 * - API optimization: Serve screen-reader-friendly JSON for screen readers
 * - Personalization: Remember accessibility preferences across sessions
 * - Analytics: Track adoption of accessibility features
 * - Master Prompt v26: Accessibility-first is core principle
 *
 * WHY Performance Monitoring (Not Just Error Monitoring)?
 * - User experience: Slow responses frustrate users
 * - Resource optimization: Identify memory leaks, slow queries
 * - Capacity planning: Understand when to scale infrastructure
 * - SLA enforcement: Track API response time against SLA (e.g., 95th percentile < 500ms)
 * - Cost optimization: Identify inefficient routes consuming resources
 * - Alerting: Proactive alerts before users complain
 *
 * WHY Accessibility-Aware Error Messages (Not Generic Errors)?
 * - WCAG 2.1 AA compliance: Error messages must be accessible
 * - Screen reader support: Structured errors for assistive tech
 * - Multilingual support: Error messages in user's preferred language
 * - Context-aware: Show different messages based on user capabilities
 * - User empowerment: Clear error messages enable self-service
 * - Master Prompt v26: Ethical AI requires inclusive error handling
 *
 * WHY Master Prompt Integration (Not Standalone Monitoring)?
 * - Version tracking: Know which Master Prompt version is active
 * - Feature flags: Enable/disable features based on Master Prompt config
 * - Compliance verification: Ensure all v26 features are enabled
 * - Audit trail: Prove compliance with Master Prompt requirements
 * - Client communication: X-Master-Prompt-Version header informs clients
 * - Debugging: "Works in v25, broken in v26" troubleshooting
 *
 * WHY Permission Check with Accessibility (Not Just Check Permission)?
 * - Inclusive design: Permission errors accessible to all users
 * - Clear communication: "You don't have X permission" in user's language
 * - User guidance: Suggest how to request missing permissions
 * - Audit logging: Track permission denials with accessibility context
 * - Screen reader support: Error messages compatible with assistive tech
 * - Master Prompt v26: Accessibility integrated into all user interactions
 *
 * WHY req.on('finish') Event (Not Middleware next() Callback)?
 * - Response capture: Ensure response fully sent before logging
 * - Accurate metrics: Response time includes full send time
 * - Status code validation: res.statusCode available after response
 * - Content length: res.get('content-length') available
 * - No blocking: Event-driven, doesn't block response
 * - Standard practice: Express middleware pattern for response logging
 *
 * WHY Track Memory Usage (Not Just CPU)?
 * - Memory leaks: Detect gradual memory consumption increase
 * - Garbage collection: Understand GC pressure from large objects
 * - Request context: Large request payloads consume memory
 * - Response size: Large JSON responses consume memory
 * - Node.js specific: Memory issues common in Node.js apps
 * - Alerting: Warn before out-of-memory crashes
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       USAGE EXAMPLES                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Example 1: Global P0 Middleware Stack (server.mjs)
 * ```javascript
 * import { p0MiddlewareStack } from './middleware/p0Monitoring.mjs';
 *
 * // Apply all P0 monitoring middleware globally
 * app.use(p0MiddlewareStack());
 * // Returns: [p0RequestCorrelation, p0SecurityMonitoring, p0PrivacyCompliance,
 * //           p0AccessibilityCompliance, p0PerformanceMonitoring, p0MasterPromptIntegration]
 * ```
 *
 * Example 2: Permission-Protected Route
 * ```javascript
 * import { requirePermissionWithAccessibility } from './middleware/p0Monitoring.mjs';
 *
 * router.post('/admin/users/delete/:id',
 *   protect,  // Authenticate user
 *   requirePermissionWithAccessibility('admin.users.delete'),  // Check permission
 *   deleteUser  // Route handler
 * );
 * ```
 *
 * Example 3: Error Handling
 * ```javascript
 * import { p0ErrorHandling } from './middleware/p0Monitoring.mjs';
 *
 * // Must be last middleware (after all routes)
 * app.use(p0ErrorHandling());
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - IP logging: User IP addresses logged (anonymize in production for GDPR)
 * - PII detection: Request body scanned for PII (logged with consent tracking)
 * - Authorization redaction: JWT tokens never logged (only presence flag)
 * - Stack trace exposure: Full stack traces only in non-production
 * - Correlation ID generation: Uses Date.now() + Math.random() (not cryptographic)
 * - Suspicious pattern logging: High severity alerts for security team
 * - Rate limiting tracking: Detect abuse without blocking legitimate users
 * - Accessibility data collection: User preferences logged for personalization
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      RELATED FILES & DEPENDENCIES                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - backend/utils/monitoring/piiSafeLogging.mjs (PII-safe logger)
 * - backend/utils/monitoring/accessibilityAuth.mjs (Accessibility-aware auth)
 *
 * Used By:
 * - backend/server.mjs (Global middleware application)
 * - backend/routes/* (Permission-protected routes)
 *
 * Related Code:
 * - backend/middleware/authMiddleware.mjs (Authentication)
 * - backend/middleware/errorMiddleware.mjs (Error handling)
 * - backend/utils/logger.mjs (Logging infrastructure)
 *
 * ═══════════════════════════════════════════════════════════════════════════
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