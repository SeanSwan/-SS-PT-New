/**
 * nasmAuthMiddleware.mjs
 * Authentication middleware specifically for NASM protocol routes
 * Provides compatible naming with the client progress routes
 */
import { protect, adminOnly, trainerOnly, clientOnly } from './authMiddleware.mjs';
import logger from '../utils/logger.mjs';

/**
 * Authentication middleware to protect routes
 * This is an alias for the protect middleware to maintain
 * compatibility with the client progress routes
 */
export const authenticateUser = protect;

/**
 * Authorization middleware to restrict routes to specific roles
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    // Must be used after authenticateUser middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Check if user's role is included in the allowed roles
    if (roles.includes(req.user.role)) {
      return next();
    }
    
    // If we get here, user is not authorized
    logger.warn('Role-based access denied', { 
      userId: req.user.id, 
      userRole: req.user.role,
      requiredRoles: roles,
      path: req.path, 
      method: req.method 
    });
    
    return res.status(403).json({
      success: false,
      message: `Access denied: Must have one of these roles: ${roles.join(', ')}`
    });
  };
};
