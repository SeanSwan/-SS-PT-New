/**
 * Swan Studios - Request Validation Middleware
 * =======================================
 * Provides request validation for various API endpoints.
 */

import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger.mjs';
import { ValidationError } from './errorMiddleware.mjs';

// Validation schemas for different request types
const validationSchemas = {
  // Auth validation schemas
  login: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username or email is required'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  
  refreshToken: [
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required')
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty().withMessage('Current password is required'),
    
    body('newPassword')
      .notEmpty().withMessage('New password is required')
      .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
      .matches(/[A-Z]/).withMessage('New password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('New password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('New password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('New password must contain at least one special character')
  ],
  
  register: [
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
    
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
    
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character')
  ],
  
  // Other validation schemas remain the same...
};

/**
 * Middleware to validate request data based on the validation type
 * @param {string} validationType - The validation schema to use
 * @returns {Array} Array of middleware functions
 */
export const validate = (validationType) => {
  if (!validationSchemas[validationType]) {
    throw new Error(`Validation schema for "${validationType}" not found`);
  }
  
  return [
    // Apply all validators from the schema
    ...validationSchemas[validationType],
    
    // Check for validation errors
    (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        // Log validation errors
        logger.warn('Validation error:', { 
          path: req.path, 
          method: req.method,
          errors: errors.array() 
        });
        
        // Return validation errors
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }
      
      next();
    }
  ];
};

/**
 * Middleware for Zod schema validation
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

export default validate;
