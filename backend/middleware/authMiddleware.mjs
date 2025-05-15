/**
 * authMiddleware.mjs
 * Provides authentication and authorization middleware for API routes
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';
import { toStringId } from '../utils/idUtils.mjs';

/**
 * Authentication middleware to protect routes
 * Verifies JWT token and attaches user to request
 */
export const protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      logger.warn('No token provided', { path: req.path, method: req.method });
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check token type
      if (decoded.tokenType !== 'access') {
        logger.warn('Invalid token type', { 
          tokenType: decoded.tokenType,
          path: req.path, 
          method: req.method 
        });
        
        return res.status(401).json({
          success: false,
          message: 'Invalid token type'
        });
      }
      
      // Get user from database
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        logger.warn('User not found for token', { userId: decoded.id });
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        logger.warn('Inactive user attempted access', { userId: user.id });
        return res.status(403).json({
          success: false,
          message: 'Account is inactive. Please contact support.'
        });
      }
      
      // Attach user to request - ensure ID is a string for consistent comparison
      req.user = {
        id: toStringId(user.id),
        role: user.role,
        username: user.username,
        email: user.email
      };
      
      // Log successful authentication
      logger.info('User authenticated', { 
        userId: user.id, 
        role: user.role, 
        path: req.path,
        method: req.method
      });
      
      next();
    } catch (error) {
      logger.error('Token verification error', { 
        error: error.message, 
        path: req.path, 
        method: req.method 
      });
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Not authorized, invalid token'
      });
    }
  } catch (error) {
    logger.error('Authentication middleware error', { 
      error: error.message, 
      stack: error.stack,
      path: req.path, 
      method: req.method 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

/**
 * Admin-only access middleware
 * Must be used after the protect middleware
 */
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    logger.warn('Non-admin attempted admin action', { 
      userId: req.user?.id, 
      role: req.user?.role,
      path: req.path, 
      method: req.method 
    });
    
    res.status(403).json({
      success: false,
      message: 'Access denied: Admin only'
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of allowed roles
 * @returns {Function} Express middleware function
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    // Must be used after protect middleware
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

/**
 * Trainer-only access middleware
 */
export const trainerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'trainer') {
    next();
  } else {
    logger.warn('Non-trainer attempted trainer action', { 
      userId: req.user?.id, 
      role: req.user?.role,
      path: req.path, 
      method: req.method 
    });
    
    res.status(403).json({
      success: false,
      message: 'Access denied: Trainer only'
    });
  }
};

/**
 * Client-only access middleware
 */
export const clientOnly = (req, res, next) => {
  if (req.user && req.user.role === 'client') {
    next();
  } else {
    logger.warn('Non-client attempted client action', { 
      userId: req.user?.id, 
      role: req.user?.role,
      path: req.path, 
      method: req.method 
    });
    
    res.status(403).json({
      success: false,
      message: 'Access denied: Client only'
    });
  }
};

/**
 * Trainer or admin access middleware
 */
export const trainerOrAdminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'trainer' || req.user.role === 'admin')) {
    next();
  } else {
    logger.warn('Unauthorized user attempted trainer/admin action', { 
      userId: req.user?.id, 
      role: req.user?.role,
      path: req.path, 
      method: req.method 
    });
    
    res.status(403).json({
      success: false,
      message: 'Access denied: Trainer or Admin only'
    });
  }
};

// Aliases for backwards compatibility
export const admin = adminOnly;
export const isAdmin = adminOnly;

/**
 * Resource owner or admin access middleware
 * For protecting resources that should only be accessed by the owner or an admin
 * @param {Function} getOwnerId - Function to extract owner ID from request
 */
export const ownerOrAdminOnly = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      // Must be used after protect middleware
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated'
        });
      }
      
      // Admins always have access
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Get owner ID from request
      const ownerId = await getOwnerId(req);
      
      // Check if user is the owner
      if (req.user.id === ownerId) {
        return next();
      }
      
      // If we get here, user is not authorized
      logger.warn('Unauthorized access attempt to resource', { 
        userId: req.user.id, 
        resourceOwnerId: ownerId,
        path: req.path, 
        method: req.method 
      });
      
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this resource'
      });
    } catch (error) {
      logger.error('Owner/admin check error', { 
        error: error.message, 
        stack: error.stack,
        path: req.path, 
        method: req.method 
      });
      
      return res.status(500).json({
        success: false,
        message: 'Server error checking resource ownership'
      });
    }
  };
};

/**
 * Middleware to check trainer-client relationship
 * For routes where a trainer should only access their clients' data
 */
export const checkTrainerClientRelationship = async (req, res, next) => {
  try {
    // Must be used after protect middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    // Admins always have access
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Client accessing their own data
    const clientId = parseInt(req.params.clientId || req.body.clientId);
    if (req.user.role === 'client' && req.user.id === clientId) {
      return next();
    }
    
    // Trainer accessing client data - simple check for now
    // In a full implementation, this would check a TrainerClient relationship table
    if (req.user.role === 'trainer') {
      // For now, just allow trainers to access any client data
      // TODO: Implement proper trainer-client relationship checking
      return next();
    }
    
    // If we get here, access is denied
    logger.warn('Unauthorized trainer-client access attempt', { 
      userId: req.user.id, 
      role: req.user.role,
      requestedClientId: clientId,
      path: req.path, 
      method: req.method 
    });
    
    return res.status(403).json({
      success: false,
      message: 'Access denied: Not authorized to access this client data'
    });
  } catch (error) {
    logger.error('Trainer-client relationship check error', { 
      error: error.message, 
      stack: error.stack,
      path: req.path, 
      method: req.method 
    });
    
    return res.status(500).json({
      success: false,
      message: 'Server error checking trainer-client relationship'
    });
  }
};

// Rate limiting middleware - simplified version
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,
    max = 60,
    message = 'Too many requests, please try again later.'
  } = options;
  
  const requests = new Map();
  
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    // Get existing timestamps or create new array
    const timestamps = requests.get(key) || [];
    
    // Filter out timestamps older than the window
    const freshTimestamps = timestamps.filter(time => now - time < windowMs);
    
    // Check if rate limited
    if (freshTimestamps.length >= max) {
      logger.warn('Rate limit exceeded', { 
        ip: req.ip, 
        path: req.path, 
        method: req.method 
      });
      
      return res.status(429).json({
        success: false,
        message
      });
    }
    
    // Add current timestamp and update store
    freshTimestamps.push(now);
    requests.set(key, freshTimestamps);
    
    next();
  };
};
