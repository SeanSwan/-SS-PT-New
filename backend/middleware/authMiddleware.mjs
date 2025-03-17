/**
 * authMiddleware.mjs
 * Provides authentication and authorization middleware for API routes
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';
import logger from '../utils/logger.mjs';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Rate limiting middleware
 * Simple in-memory implementation - consider using Redis for production
 * @param {Object} options - Options for rate limiting
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum number of requests in the time window
 * @param {string} options.message - Error message to return when rate limited
 * @param {Function} options.keyGenerator - Function to generate a unique key for the request
 * @returns {Function} Express middleware function
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000, // 1 minute default
    max = 60, // 60 requests per minute default
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => req.ip || 'unknown'
  } = options;
  
  // Store for rate limiting
  const requests = new Map();
  
  // Clean up old entries periodically
  const cleanup = setInterval(() => {
    const now = Date.now();
    
    requests.forEach((timestamps, key) => {
      // Filter out timestamps older than the window
      const fresh = timestamps.filter(time => now - time < windowMs);
      
      if (fresh.length === 0) {
        // Remove empty entries
        requests.delete(key);
      } else {
        // Update with only fresh timestamps
        requests.set(key, fresh);
      }
    });
  }, windowMs);
  
  // Ensure cleanup interval is cleared on process exit
  process.on('exit', () => {
    clearInterval(cleanup);
  });
  
  return (req, res, next) => {
    const key = keyGenerator(req);
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
      
      // Attach user to request
      req.user = {
        id: user.id,
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
 * Trainer-only access middleware
 * Must be used after the protect middleware
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
 * Must be used after the protect middleware
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
 * Must be used after the protect middleware
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
    
    // Trainer accessing client data
    if (req.user.role === 'trainer') {
      // Assuming you have a TrainerClient model or similar to manage relationships
      const relationship = await TrainerClient.findOne({
        where: {
          trainerId: req.user.id,
          clientId: clientId
        }
      });
      
      if (relationship) {
        return next();
      }
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