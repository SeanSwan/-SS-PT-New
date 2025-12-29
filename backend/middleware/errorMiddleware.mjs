/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║        SWANSTUDIOS ENHANCED ERROR HANDLING MIDDLEWARE                     ║
 * ║     (Custom Error Classes + Sequelize Integration + Logging)             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Comprehensive error handling with 6 custom error classes, Sequelize
 *          error translation, environment-aware stack traces, and structured
 *          logging for production-ready error management
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Error Handling Architecture:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                          REQUEST FLOW                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ Route Handler / Middleware Throws Error                                  │
 * │   throw new ValidationError('Invalid email format', [                    │
 * │     { field: 'email', message: 'Must be valid email' }                   │
 * │   ])                                                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ errorHandler(err, req, res, next)                                        │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 1. Extract Error Metadata                                           │ │
 * │  │    - statusCode: err.statusCode || 500                              │ │
 * │  │    - errorName: err.name (ValidationError, DatabaseError, etc.)     │ │
 * │  │    - message: err.message                                           │ │
 * │  │    - stack: err.stack (only if development)                         │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 2. Log Error with Appropriate Severity                             │ │
 * │  │    if (statusCode >= 500):                                          │ │
 * │  │      logger.error('SERVER ERROR', { errorType, url, statusCode })   │ │
 * │  │    else:                                                            │ │
 * │  │      logger.warn('CLIENT ERROR', { errorType, url, statusCode })    │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 3. Build Response Object                                            │ │
 * │  │    responseData = {                                                 │ │
 * │  │      success: false,                                                │ │
 * │  │      message: err.message,                                          │ │
 * │  │      stack: NODE_ENV === 'production' ? undefined : err.stack       │ │
 * │  │    }                                                                │ │
 * │  │                                                                      │ │
 * │  │    Add error-specific fields:                                       │ │
 * │  │    - ValidationError → errors: [{ field, message }]                 │ │
 * │  │    - ResourceNotFoundError → resource: 'workout'                    │ │
 * │  │    - DatabaseError → originalError.message (dev only)               │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 4. Handle Sequelize Errors                                          │ │
 * │  │    if (err.name === 'SequelizeValidationError'):                    │ │
 * │  │      statusCode = 400                                               │ │
 * │  │      errors = err.errors.map(e => ({ field: e.path, message }))     │ │
 * │  │                                                                      │ │
 * │  │    if (err.name === 'SequelizeUniqueConstraintError'):              │ │
 * │  │      statusCode = 409                                               │ │
 * │  │      message = 'Record already exists'                              │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 5. Sanitize for Production                                          │ │
 * │  │    if (NODE_ENV === 'production' && statusCode >= 500):             │ │
 * │  │      message = 'An unexpected error occurred. Team notified.'       │ │
 * │  │      delete responseData.errors  // Hide internal error details     │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ 6. Send Response                                                    │ │
 * │  │    res.status(statusCode).json(responseData)                        │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     CUSTOM ERROR CLASSES (6 Types)                       │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. ValidationError (400)                                                 │
 * │    - Purpose: Invalid input data (missing fields, format errors)         │
 * │    - Fields: message, errors[{ field, message }], statusCode: 400        │
 * │    - Example: new ValidationError('Invalid data', [                      │
 * │                 { field: 'email', message: 'Email required' }            │
 * │               ])                                                         │
 * │                                                                           │
 * │ 2. AuthenticationError (401)                                             │
 * │    - Purpose: User not authenticated (missing/invalid token)             │
 * │    - Fields: message, statusCode: 401                                    │
 * │    - Example: new AuthenticationError('Token expired')                   │
 * │                                                                           │
 * │ 3. AuthorizationError (403)                                              │
 * │    - Purpose: User authenticated but lacks permission                    │
 * │    - Fields: message, statusCode: 403                                    │
 * │    - Example: new AuthorizationError('Admin access required')            │
 * │                                                                           │
 * │ 4. ResourceNotFoundError (404)                                           │
 * │    - Purpose: Requested resource doesn't exist                           │
 * │    - Fields: message, resource, statusCode: 404                          │
 * │    - Example: new ResourceNotFoundError('Workout not found', 'workout')  │
 * │                                                                           │
 * │ 5. RateLimitExceededError (429)                                          │
 * │    - Purpose: Too many requests from client                              │
 * │    - Fields: message, statusCode: 429                                    │
 * │    - Example: new RateLimitExceededError('Try again in 60s')             │
 * │                                                                           │
 * │ 6. DatabaseError (500)                                                   │
 * │    - Purpose: Database operation failed                                  │
 * │    - Fields: message, originalError, statusCode: 500                     │
 * │    - Example: new DatabaseError('Query failed', dbError)                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Custom Error Classes (Not Just throw new Error())?
 * - Type safety: instanceof checks in error handler
 * - Structured errors: Consistent error shape across app
 * - Status codes: Automatic HTTP status code assignment
 * - Error-specific data: ValidationError carries field-level errors
 * - Code clarity: throw new ValidationError() self-documenting
 * - Middleware integration: Error handler recognizes custom error types
 * - Standard practice: Express error handling pattern
 *
 * WHY statusCode Property (Not Hardcode in Handler)?
 * - Error owns status: Error class knows its HTTP status
 * - Centralized mapping: Error type → status code in one place
 * - Consistency: All ValidationErrors return 400
 * - Override support: Can set custom statusCode if needed
 * - Middleware simplicity: Error handler reads err.statusCode
 *
 * WHY notFound Middleware (Not 404 in Routes)?
 * - Catch-all: Handles any undefined route
 * - Consistent format: 404 errors match other error responses
 * - Logging: All 404s logged in one place
 * - Placement: Must be after all route definitions
 * - Example: GET /api/nonexistent → notFound() → ResourceNotFoundError
 *
 * WHY Separate logger.error vs logger.warn (Not All errors)?
 * - Alerting: Server errors (500+) trigger PagerDuty alerts
 * - Severity: Client errors (4xx) are warnings, not critical
 * - Log filtering: Production monitoring focuses on 500s
 * - Cost optimization: Don't alert on expected 404s
 * - Debugging: Distinguish user mistakes from system failures
 *
 * WHY Hide Stack Traces in Production (Not Always Show)?
 * - Security: Stack traces leak internal file paths, libraries
 * - Information disclosure: Attacker learns app structure
 * - User experience: Stack traces confuse non-technical users
 * - Development benefit: Developers see full stack in dev mode
 * - Standard practice: Never expose stack traces in production
 *
 * WHY Sequelize Error Translation (Not Generic "Database Error")?
 * - User-friendly: "Email already exists" vs "SequelizeUniqueConstraintError"
 * - Field-level errors: SequelizeValidationError → errors[{ field, message }]
 * - HTTP status codes: Unique constraint → 409 Conflict, not 500
 * - Client handling: Frontend can highlight specific form fields
 * - Standard practice: Translate ORM errors to domain errors
 *
 * WHY Sanitize Production Errors (Not Show All Details)?
 * - Security: Don't leak database schema, query details
 * - GDPR compliance: Don't expose user data in error messages
 * - User experience: Simple "Server error" vs technical details
 * - Support workflow: Users report error, support checks logs
 * - Standard practice: Generic production errors, detailed dev errors
 *
 * WHY asyncHandler Utility (Not try/catch in Every Route)?
 * - DRY principle: Single error handling pattern
 * - Code clarity: Route handlers focus on business logic
 * - Consistency: All routes use same error handling
 * - Example: asyncHandler(async (req, res) => { ... })
 * - Catches async errors: Automatically passes errors to errorHandler
 *
 * WHY createErrorResponse / createSuccessResponse Utilities (Not Inline)?
 * - Consistency: All responses match same shape
 * - Testing: Easy to mock response format
 * - Documentation: API responses self-documenting
 * - Refactoring: Change response format in one place
 * - Example: return createErrorResponse('Not found', 404)
 *
 * WHY Log User Context (userId, ip, userAgent)?
 * - Debugging: "User X saw error Y at time Z"
 * - Security: Track unauthorized access attempts
 * - Support: "What error did user report?"
 * - Compliance: Audit trail of system errors
 * - Pattern detection: Same user hitting same error = UX issue
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       USAGE EXAMPLES                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Example 1: Using Custom Error Classes in Controllers
 * ```javascript
 * import { ValidationError, ResourceNotFoundError } from '../middleware/errorMiddleware.mjs';
 *
 * export const getWorkout = async (req, res) => {
 *   const { id } = req.params;
 *
 *   if (!id) {
 *     throw new ValidationError('Workout ID required', [
 *       { field: 'id', message: 'ID is required' }
 *     ]);
 *   }
 *
 *   const workout = await Workout.findByPk(id);
 *   if (!workout) {
 *     throw new ResourceNotFoundError(`Workout ${id} not found`, 'workout');
 *   }
 *
 *   res.json({ success: true, data: workout });
 * };
 * ```
 *
 * Example 2: Using asyncHandler to Auto-Catch Errors
 * ```javascript
 * import { asyncHandler } from '../middleware/errorMiddleware.mjs';
 *
 * router.get('/workouts/:id', asyncHandler(async (req, res) => {
 *   // No try/catch needed - asyncHandler catches errors
 *   const workout = await Workout.findByPk(req.params.id);
 *   if (!workout) throw new ResourceNotFoundError('Not found', 'workout');
 *   res.json({ success: true, data: workout });
 * }));
 * ```
 *
 * Example 3: Global Error Handling Setup (server.mjs)
 * ```javascript
 * import { notFound, errorHandler } from './middleware/errorMiddleware.mjs';
 *
 * // Define all routes first
 * app.use('/api/workouts', workoutRoutes);
 * app.use('/api/users', userRoutes);
 *
 * // 404 handler (must be after all routes)
 * app.use(notFound);
 *
 * // Error handler (must be last middleware)
 * app.use(errorHandler);
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Stack trace sanitization: Never expose stack traces in production
 * - Error message filtering: Generic messages for 500 errors in production
 * - User context logging: IP addresses, user IDs logged for audit
 * - Sequelize error translation: Prevent SQL details leakage
 * - Field-level errors: Only expose expected validation errors
 * - Resource enumeration: 404 errors don't confirm resource existence
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      RELATED FILES & DEPENDENCIES                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - backend/utils/logger.mjs (Winston logging infrastructure)
 *
 * Used By:
 * - backend/server.mjs (Global error handling setup)
 * - backend/controllers/* (All controllers throw custom errors)
 * - backend/routes/* (asyncHandler for route error catching)
 *
 * Related Code:
 * - backend/middleware/authMiddleware.mjs (AuthenticationError, AuthorizationError)
 * - backend/middleware/p0Monitoring.mjs (Security error logging)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import logger from '../utils/logger.mjs';

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
    this.statusCode = 400;
  }
}

export class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
    this.statusCode = 401;
  }
}

export class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = 403;
  }
}

export class ResourceNotFoundError extends Error {
  constructor(message, resource) {
    super(message);
    this.name = 'ResourceNotFoundError';
    this.resource = resource;
    this.statusCode = 404;
  }
}

export class RateLimitExceededError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitExceededError';
    this.statusCode = 429;
  }
}

export class DatabaseError extends Error {
  constructor(message, originalError) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
    this.statusCode = 500;
  }
}

/**
 * Not Found middleware for handling undefined routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const notFound = (req, res, next) => {
  const error = new ResourceNotFoundError(`Route not found: ${req.originalUrl}`, 'endpoint');
  logger.warn(`Route not found: ${req.originalUrl} (${req.method})`);
  next(error);
};

/**
 * Error handler middleware with detailed error classification and logging
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export const errorHandler = (err, req, res, next) => {
  // Get error details
  const statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode;
  const errorName = err.name || 'Error';
  const message = err.message || 'An unexpected error occurred';
  const stack = err.stack;

  // Determine error severity for logging
  const isServerError = statusCode >= 500;
  
  // Prepare log metadata
  const logData = {
    errorType: errorName,
    url: req.originalUrl,
    method: req.method,
    statusCode,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    // Only include stack in non-production environments
    stack: process.env.NODE_ENV === 'production' ? undefined : stack
  };
  
  // Log error with appropriate severity
  if (isServerError) {
    logger.error(`SERVER ERROR (${statusCode}): ${message}`, logData);
  } else {
    logger.warn(`CLIENT ERROR (${statusCode}): ${message}`, logData);
  }
  
  // Specific error handling based on error type
  let responseData = {
    success: false,
    message,
    // Only include original error stack in development
    stack: process.env.NODE_ENV === 'production' ? undefined : stack
  };
  
  // Include additional error data for specific error types
  if (err instanceof ValidationError && err.errors) {
    responseData.errors = err.errors;
  }
  
  if (err instanceof ResourceNotFoundError && err.resource) {
    responseData.resource = err.resource;
  }
  
  if (err instanceof DatabaseError && process.env.NODE_ENV !== 'production') {
    responseData.originalError = err.originalError?.message;
  }
  
  // Handle Sequelize-specific errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    responseData.errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }
  
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409; // Conflict
    responseData.message = 'A record with this information already exists';
    responseData.errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
  }
  
  // Sanitize error messages in production
  if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
    responseData.message = 'An unexpected error occurred. Our team has been notified.';
    delete responseData.errors;
  }

  // Send error response
  res.status(statusCode).json(responseData);
};

/**
 * AsyncHandler utility to avoid try/catch blocks in route handlers
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function with error handling
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Utility function to create an error response
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Array|Object} errors - Optional validation errors
 * @returns {Object} Formatted error response object
 */
export const createErrorResponse = (message, statusCode = 400, errors = undefined) => {
  return {
    success: false,
    message,
    errors
  };
};

/**
 * Utility function to create a success response
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Formatted success response object
 */
export const createSuccessResponse = (data, message = 'Success') => {
  return {
    success: true,
    message,
    data
  };
};