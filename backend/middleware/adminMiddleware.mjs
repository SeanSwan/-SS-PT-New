/**
 * Admin Authorization Middleware
 * ==============================
 * 
 * Middleware to verify admin access for enterprise admin dashboard routes
 * Provides role-based access control with logging and security
 */

import logger from '../utils/logger.mjs';

/**
 * Require admin role middleware
 * Checks if authenticated user has admin privileges
 */
export const requireAdmin = (req, res, next) => {
  try {
    // Check if user is authenticated (should be handled by authMiddleware first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errorCode: 'AUTH_REQUIRED'
      });
    }

    // Check if user has admin role
    const isAdmin = req.user.role === 'admin' || req.user.email === 'ogpswan@gmail.com';
    
    if (!isAdmin) {
      logger.warn(`Unauthorized admin access attempt by user ${req.user.id} (${req.user.email})`);
      
      return res.status(403).json({
        success: false,
        message: 'Administrator access required',
        errorCode: 'ADMIN_ACCESS_REQUIRED'
      });
    }

    // Log admin access for security monitoring
    logger.info(`Admin access granted to ${req.user.email} for ${req.method} ${req.originalUrl}`);
    
    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      errorCode: 'AUTH_CHECK_ERROR'
    });
  }
};

/**
 * Super admin middleware for critical operations
 * Only allows the primary admin account
 */
export const requireSuperAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        errorCode: 'AUTH_REQUIRED'
      });
    }

    // Only allow the primary admin account for super admin operations
    const isSuperAdmin = req.user.email === 'ogpswan@gmail.com';
    
    if (!isSuperAdmin) {
      logger.warn(`Unauthorized super admin access attempt by user ${req.user.id} (${req.user.email})`);
      
      return res.status(403).json({
        success: false,
        message: 'Super administrator access required',
        errorCode: 'SUPER_ADMIN_ACCESS_REQUIRED'
      });
    }

    logger.info(`Super admin access granted to ${req.user.email} for ${req.method} ${req.originalUrl}`);
    
    next();
  } catch (error) {
    logger.error('Super admin middleware error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Authorization check failed',
      errorCode: 'AUTH_CHECK_ERROR'
    });
  }
};

/**
 * Admin rate limiting middleware
 * Applies stricter rate limits for admin operations
 */
export const adminRateLimit = (req, res, next) => {
  // TODO: Implement admin-specific rate limiting
  // For now, just log the admin operation
  logger.info(`Admin operation: ${req.method} ${req.originalUrl} by ${req.user?.email}`);
  next();
};

/**
 * Admin audit logging middleware
 * Logs all admin operations for compliance and security
 */
export const adminAuditLog = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the admin operation result
    const logData = {
      adminUser: req.user?.email,
      userId: req.user?.id,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      success: res.statusCode >= 200 && res.statusCode < 400
    };
    
    // Include request body for write operations (but filter sensitive data)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      logData.requestBody = filterSensitiveData(req.body);
    }
    
    logger.info('Admin operation audit:', logData);
    
    return originalSend.call(this, data);
  };
  
  next();
};

/**
 * Filter sensitive data from request bodies for logging
 */
function filterSensitiveData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const filtered = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  
  for (const field of sensitiveFields) {
    if (field in filtered) {
      filtered[field] = '[REDACTED]';
    }
  }
  
  return filtered;
}

export default {
  requireAdmin,
  requireSuperAdmin,
  adminRateLimit,
  adminAuditLog
};
