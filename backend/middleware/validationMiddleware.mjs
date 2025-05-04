/**
 * Swan Studios - Request Validation Middleware
 * =======================================
 * Provides request validation for various API endpoints using express-validator.
 */

import { body, param, query, validationResult } from 'express-validator';
import logger from '../utils/logger.mjs';
import { ValidationError } from './errorMiddleware.mjs';

// Validation schemas for different request types
const validationSchemas = {
  // Auth validation schemas
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
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain at least one special character'),
    
    // Optional fields with validation
    body('phone')
      .optional()
      .trim()
      .isMobilePhone().withMessage('Please provide a valid phone number'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601().withMessage('Please provide a valid date in ISO format (YYYY-MM-DD)'),
    
    body('gender')
      .optional()
      .isIn(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'])
      .withMessage('Gender must be one of: male, female, non-binary, prefer-not-to-say, other'),
    
    body('weight')
      .optional()
      .isFloat({ min: 20, max: 500 }).withMessage('Please provide a valid weight (20-500)'),
    
    body('height')
      .optional()
      .isFloat({ min: 50, max: 300 }).withMessage('Please provide a valid height (50-300)'),
    
    body('fitnessGoal')
      .optional()
      .isIn(['weight-loss', 'muscle-gain', 'endurance', 'flexibility', 'general-fitness', 'sports-specific', 'other'])
      .withMessage('Invalid fitness goal'),
    
    body('trainingExperience')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
      .withMessage('Invalid training experience level'),
    
    body('healthConcerns')
      .optional()
      .isString().withMessage('Health concerns must be a string'),
    
    body('emergencyContact')
      .optional()
      .isString().withMessage('Emergency contact must be a string')
  ],
  
  login: [
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required'),
    
    body('password')
      .notEmpty().withMessage('Password is required')
  ],
  
  refreshToken: [
    body('refreshToken')
      .notEmpty().withMessage('Refresh token is required')
  ],
  
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters'),
    
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters'),
    
    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Please provide a valid email address')
      .normalizeEmail(),
    
    body('phone')
      .optional()
      .trim()
      .isMobilePhone().withMessage('Please provide a valid phone number'),
    
    body('dateOfBirth')
      .optional()
      .isISO8601().withMessage('Please provide a valid date in ISO format (YYYY-MM-DD)'),
    
    body('gender')
      .optional()
      .isIn(['male', 'female', 'non-binary', 'prefer-not-to-say', 'other'])
      .withMessage('Gender must be one of: male, female, non-binary, prefer-not-to-say, other'),
    
    body('weight')
      .optional()
      .isFloat({ min: 20, max: 500 }).withMessage('Please provide a valid weight (20-500)'),
    
    body('height')
      .optional()
      .isFloat({ min: 50, max: 300 }).withMessage('Please provide a valid height (50-300)'),
    
    body('fitnessGoal')
      .optional()
      .isIn(['weight-loss', 'muscle-gain', 'endurance', 'flexibility', 'general-fitness', 'sports-specific', 'other'])
      .withMessage('Invalid fitness goal'),
    
    body('trainingExperience')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced', 'professional'])
      .withMessage('Invalid training experience level'),
    
    body('healthConcerns')
      .optional()
      .isString().withMessage('Health concerns must be a string'),
    
    body('emergencyContact')
      .optional()
      .isString().withMessage('Emergency contact must be a string')
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
      .custom((value, { req }) => {
        if (value === req.body.currentPassword) {
          throw new Error('New password must be different from current password');
        }
        return true;
      })
  ],
  
  // Session validation
  createSession: [
    body('clientId')
      .notEmpty().withMessage('Client ID is required')
      .isInt().withMessage('Client ID must be an integer'),
    
    body('trainerId')
      .notEmpty().withMessage('Trainer ID is required')
      .isInt().withMessage('Trainer ID must be an integer'),
    
    body('startTime')
      .notEmpty().withMessage('Start time is required')
      .isISO8601().withMessage('Start time must be a valid ISO date'),
    
    body('endTime')
      .notEmpty().withMessage('End time is required')
      .isISO8601().withMessage('End time must be a valid ISO date')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startTime)) {
          throw new Error('End time must be after start time');
        }
        return true;
      }),
    
    body('sessionType')
      .notEmpty().withMessage('Session type is required')
      .isIn(['one-on-one', 'group', 'assessment', 'virtual'])
      .withMessage('Invalid session type'),
    
    body('status')
      .optional()
      .isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'])
      .withMessage('Invalid session status'),
    
    body('notes')
      .optional()
      .isString().withMessage('Notes must be a string')
  ],
  
  updateSession: [
    body('startTime')
      .optional()
      .isISO8601().withMessage('Start time must be a valid ISO date'),
    
    body('endTime')
      .optional()
      .isISO8601().withMessage('End time must be a valid ISO date')
      .custom((value, { req }) => {
        if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
          throw new Error('End time must be after start time');
        }
        return true;
      }),
    
    body('sessionType')
      .optional()
      .isIn(['one-on-one', 'group', 'assessment', 'virtual'])
      .withMessage('Invalid session type'),
    
    body('status')
      .optional()
      .isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'])
      .withMessage('Invalid session status'),
    
    body('notes')
      .optional()
      .isString().withMessage('Notes must be a string')
  ],
  
  // Exercise validation
  createExercise: [
    body('name')
      .trim()
      .notEmpty().withMessage('Exercise name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Exercise name must be between 2 and 100 characters'),
    
    body('description')
      .optional()
      .isString().withMessage('Description must be a string'),
    
    body('muscleGroups')
      .optional()
      .isArray().withMessage('Muscle groups must be an array'),
    
    body('muscleGroups.*')
      .optional()
      .isIn([
        'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
        'quadriceps', 'hamstrings', 'glutes', 'calves', 'abdominals',
        'obliques', 'lower_back', 'trapezius', 'full_body', 'other'
      ])
      .withMessage('Invalid muscle group'),
    
    body('difficulty')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced', 'all_levels'])
      .withMessage('Invalid difficulty level'),
    
    body('equipment')
      .optional()
      .isArray().withMessage('Equipment must be an array'),
    
    body('equipment.*')
      .optional()
      .isString().withMessage('Equipment items must be strings'),
    
    body('imageUrl')
      .optional()
      .isURL().withMessage('Image URL must be a valid URL'),
    
    body('videoUrl')
      .optional()
      .isURL().withMessage('Video URL must be a valid URL')
  ]
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
          body: process.env.NODE_ENV === 'development' ? req.body : undefined,
          errors: errors.array() 
        });
        
        // Create a ValidationError instance
        const validationError = new ValidationError(
          'Validation error', 
          errors.array()
        );
        
        // Pass error to the error handler middleware
        return next(validationError);
      }
      
      next();
    }
  ];
};

/**
 * Sanitize user data to ensure sensitive information is not sent to the client
 * @param {Object} user - User object from database
 * @returns {Object} Sanitized user object
 */
export const sanitizeUser = (user) => {
  if (!user) return null;
  
  // Create a new object with only the fields we want to expose
  const sanitized = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    phone: user.phone,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
  
  // Add optional fields if they exist
  if (user.photo) sanitized.photo = user.photo;
  if (user.dateOfBirth) sanitized.dateOfBirth = user.dateOfBirth;
  if (user.gender) sanitized.gender = user.gender;
  if (user.weight) sanitized.weight = user.weight;
  if (user.height) sanitized.height = user.height;
  if (user.fitnessGoal) sanitized.fitnessGoal = user.fitnessGoal;
  if (user.trainingExperience) sanitized.trainingExperience = user.trainingExperience;
  if (user.healthConcerns) sanitized.healthConcerns = user.healthConcerns;
  if (user.emergencyContact) sanitized.emergencyContact = user.emergencyContact;
  
  // Add trainer-specific fields if applicable
  if (user.role === 'trainer') {
    if (user.specialties) sanitized.specialties = user.specialties;
    if (user.certifications) sanitized.certifications = user.certifications;
    if (user.bio) sanitized.bio = user.bio;
    if (user.yearsOfExperience) sanitized.yearsOfExperience = user.yearsOfExperience;
    if (user.averageRating) sanitized.averageRating = user.averageRating;
    if (user.totalSessions) sanitized.totalSessions = user.totalSessions;
  }
  
  return sanitized;
};

export default validate;