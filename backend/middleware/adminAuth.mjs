/**
 * Admin Authorization Middleware
 *
 * Purpose: Enforce admin-only access to protected API endpoints
 * Used by: Video Library APIs, User Management, System Settings
 *
 * Security Features:
 * - JWT token validation
 * - Role-based access control (admin role required)
 * - Token expiration checking
 * - Comprehensive error logging
 *
 * Usage:
 *   import { requireAdmin } from './middleware/adminAuth.mjs';
 *   app.post('/api/admin/video-library', requireAdmin, createExerciseVideo);
 *
 * Created: 2025-11-13
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.mjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Middleware to require admin role for route access
 *
 * Validates:
 * 1. Authorization header exists and is properly formatted
 * 2. JWT token is valid and not expired
 * 3. User exists in database
 * 4. User has 'admin' role
 *
 * On success: Adds req.user with full user object
 * On failure: Returns 401 (unauthorized) or 403 (forbidden)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function requireAdmin(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authorization header required',
        message: 'Please provide a valid admin token in Authorization header',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Authorization header must be in format: Bearer <token>',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
        });
      }

      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'The provided token is invalid or malformed.',
        });
      }

      throw jwtError; // Re-throw unexpected errors
    }

    // Validate token payload
    if (!decoded.id || !decoded.role) {
      return res.status(401).json({
        error: 'Invalid token payload',
        message: 'Token does not contain required user information.',
      });
    }

    // Fetch user from database
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists.',
      });
    }

    // Check if user account is active (assuming you have a status field)
    if (user.status === 'suspended' || user.status === 'deleted') {
      return res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    // Verify admin role
    if (user.role !== 'admin') {
      console.warn(`[SECURITY] Non-admin user ${user.id} (${user.email}) attempted to access admin endpoint: ${req.method} ${req.path}`);

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required. Your role does not have permission to access this resource.',
        requiredRole: 'admin',
        yourRole: user.role,
      });
    }

    // Success: Attach user to request object for downstream use
    req.user = user;

    // Log successful admin access (for security audit trail)
    console.info(`[ADMIN ACCESS] User ${user.id} (${user.email}) accessed: ${req.method} ${req.path}`);

    next();
  } catch (error) {
    console.error('[ADMIN AUTH ERROR]', error);

    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying your credentials. Please try again.',
    });
  }
}

/**
 * Middleware to require trainer or admin role
 *
 * Less restrictive than requireAdmin - allows both trainers and admins.
 * Use for endpoints that trainers should be able to access (e.g., viewing video library)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function requireTrainerOrAdmin(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authorization required',
        message: 'Please provide a valid token in Authorization header',
      });
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.',
        });
      }

      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid.',
      });
    }

    // Fetch user from database
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'The user associated with this token no longer exists.',
      });
    }

    // Verify trainer or admin role
    if (user.role !== 'admin' && user.role !== 'trainer') {
      console.warn(`[SECURITY] Non-trainer/admin user ${user.id} (${user.email}) attempted to access trainer endpoint: ${req.method} ${req.path}`);

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Trainer or admin access required.',
        requiredRoles: ['trainer', 'admin'],
        yourRole: user.role,
      });
    }

    // Success: Attach user to request object
    req.user = user;

    next();
  } catch (error) {
    console.error('[TRAINER AUTH ERROR]', error);

    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying your credentials.',
    });
  }
}

/**
 * Optional authentication middleware
 *
 * Attaches user to req.user if valid token provided, but doesn't fail if missing.
 * Use for endpoints that change behavior based on authentication (e.g., public video library)
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
export async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // No token provided - continue without authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    // Try to verify token
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (user && user.status !== 'suspended' && user.status !== 'deleted') {
        req.user = user;
      } else {
        req.user = null;
      }
    } catch (jwtError) {
      // Invalid/expired token - continue as unauthenticated
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('[OPTIONAL AUTH ERROR]', error);
    req.user = null;
    next();
  }
}

export default {
  requireAdmin,
  requireTrainerOrAdmin,
  optionalAuth,
};
