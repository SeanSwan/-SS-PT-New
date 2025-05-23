/**
 * Response utility functions for consistent API responses
 * Used by controllers to format responses and error handling
 */

/**
 * Send a successful response with data
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Success message (default: Success)
 */
export const successResponse = (res, data = null, statusCode = 200, message = 'Success') => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error response
 * @param {object} res - Express response object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {string} message - Error message
 * @param {object} error - Error details (optional)
 */
export const errorResponse = (res, statusCode = 500, message = 'Server Error', error = null) => {
  // Log the error (consider implementing a proper logger)
  console.error(`[ERROR] ${message}`, error);
  
  const response = {
    success: false,
    message
  };

  // Only include error details in development mode
  if (process.env.NODE_ENV !== 'production' && error) {
    response.error = error.toString();
    if (error.stack) {
      response.stack = error.stack;
    }
  }

  return res.status(statusCode).json(response);
};

/**
 * Send a validation error response
 * @param {object} res - Express response object
 * @param {string} message - Validation error message
 * @param {object} errors - Validation errors
 */
export const validationErrorResponse = (res, message = 'Validation Error', errors = {}) => {
  return res.status(400).json({
    success: false,
    message,
    errors
  });
};

/**
 * Send a not found response
 * @param {object} res - Express response object
 * @param {string} message - Not found message
 */
export const notFoundResponse = (res, message = 'Resource not found') => {
  return res.status(404).json({
    success: false,
    message
  });
};

/**
 * Send an unauthorized response
 * @param {object} res - Express response object
 * @param {string} message - Unauthorized message
 */
export const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return res.status(401).json({
    success: false,
    message
  });
};

/**
 * Send a forbidden response
 * @param {object} res - Express response object
 * @param {string} message - Forbidden message
 */
export const forbiddenResponse = (res, message = 'Access forbidden') => {
  return res.status(403).json({
    success: false,
    message
  });
};
