/**
 * Zod-based Validation Middleware for Express
 * ==========================================
 * This middleware validates request data using Zod schemas.
 */

import logger from '../utils/logger.mjs';

/**
 * Middleware factory that creates validation middleware for Express using Zod schemas
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware function
 */
export const validationMiddleware = (schema) => {
  return (req, res, next) => {
    try {
      // Validate request body against schema
      const validatedData = schema.parse(req.body);
      
      // Replace request body with validated data
      req.body = validatedData;
      
      next();
    } catch (error) {
      // Log validation errors
      logger.warn('Zod validation error:', { 
        path: req.path, 
        method: req.method,
        errors: error.errors 
      });
      
      // Return validation errors to client
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
  };
};

export default validationMiddleware;
