/**
 * Swan Studios - Enhanced Error Handling Middleware
 * =======================================
 * Comprehensive error handling with detailed error classification,
 * client-friendly messages, and advanced logging.
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