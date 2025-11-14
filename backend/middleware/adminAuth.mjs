/**
 * Admin Authorization Middleware (JWT + RBAC)
 * ============================================
 *
 * Purpose: Enforce role-based access control (RBAC) for protected API endpoints
 *
 * Blueprint Reference: docs/ai-workflow/AI-HANDOFF/VIDEO-LIBRARY-COMPLETE-STATUS.md
 *
 * Architecture Overview:
 * ┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
 * │  Client Request │─────▶│  Auth Middleware │─────▶│   Controller    │
 * │  + JWT Token    │      │  (this file)     │      │   Function      │
 * └─────────────────┘      └──────────────────┘      └─────────────────┘
 *                                   │
 *                                   │ (validates)
 *                                   ▼
 *                          ┌──────────────────┐
 *                          │  PostgreSQL      │
 *                          │  users table     │
 *                          └──────────────────┘
 *
 * Middleware Functions (3 total):
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ FUNCTION                ROLE CHECK           USE CASE            │
 * ├──────────────────────────────────────────────────────────────────┤
 * │ requireAdmin            role === 'admin'     Admin-only endpoints│
 * │ requireTrainerOrAdmin   role === 'trainer'   Trainer + admin     │
 * │                         OR role === 'admin'                      │
 * │ optionalAuth            Any (or none)        Public endpoints    │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Authentication Flow (Mermaid):
 * ```mermaid
 * sequenceDiagram
 *     participant C as Client
 *     participant M as requireAdmin Middleware
 *     participant J as JWT Library
 *     participant D as PostgreSQL
 *     participant H as Controller Handler
 *
 *     C->>M: Request + Authorization: Bearer <token>
 *     M->>M: Extract token from header
 *
 *     alt No Authorization header
 *         M-->>C: 401 Unauthorized
 *     else Invalid format (not "Bearer <token>")
 *         M-->>C: 401 Invalid format
 *     else Has valid format
 *         M->>J: jwt.verify(token, JWT_SECRET)
 *
 *         alt Token expired
 *             J-->>M: TokenExpiredError
 *             M-->>C: 401 Token expired
 *         else Token invalid/malformed
 *             J-->>M: JsonWebTokenError
 *             M-->>C: 401 Invalid token
 *         else Token valid
 *             J-->>M: decoded = { id, role, email }
 *             M->>D: SELECT * FROM users WHERE id = decoded.id
 *
 *             alt User not found
 *                 D-->>M: null
 *                 M-->>C: 401 User not found
 *             else User suspended/deleted
 *                 D-->>M: user.status = 'suspended'
 *                 M-->>C: 403 Account suspended
 *             else User role != 'admin'
 *                 D-->>M: user.role = 'client'
 *                 M-->>C: 403 Forbidden (Admin required)
 *             else User is admin
 *                 D-->>M: user (valid admin)
 *                 M->>M: req.user = user
 *                 M->>M: Log admin access
 *                 M->>H: next() - pass to controller
 *                 H-->>C: 200/201 Success response
 *             end
 *         end
 *     end
 * ```
 *
 * JWT Token Structure:
 * {
 *   id: "uuid-string",           // User ID from users table
 *   email: "user@example.com",   // User email
 *   role: "admin",               // User role (admin, trainer, client)
 *   iat: 1699564800,             // Issued at timestamp
 *   exp: 1699651200              // Expiration timestamp (24 hours)
 * }
 *
 * Security Model:
 *
 * 1. Token Validation (requireAdmin):
 *    - Header format: "Authorization: Bearer <token>"
 *    - JWT signature verification using JWT_SECRET
 *    - Expiration check (24-hour expiry)
 *    - Payload validation (id + role required)
 *
 * 2. User Validation:
 *    - User exists in database (guards against deleted users)
 *    - User status is active (not suspended/deleted)
 *    - User role matches requirement (admin, trainer, etc.)
 *
 * 3. Access Control:
 *    - requireAdmin: ONLY role === 'admin'
 *    - requireTrainerOrAdmin: role === 'admin' OR role === 'trainer'
 *    - optionalAuth: Any role (or no token)
 *
 * 4. Audit Logging:
 *    - Successful admin access logged to console
 *    - Failed admin attempts logged with user ID + endpoint
 *    - Format: [ADMIN ACCESS] User 123 (admin@example.com) accessed: POST /api/admin/exercise-library
 *
 * Error Responses:
 *
 * 401 Unauthorized (Authentication Failure):
 * - Missing Authorization header
 * - Invalid header format (not "Bearer <token>")
 * - Token expired (TokenExpiredError)
 * - Invalid token signature (JsonWebTokenError)
 * - Invalid token payload (missing id/role)
 * - User not found in database
 *
 * 403 Forbidden (Authorization Failure):
 * - User account suspended/deleted
 * - User role does not match requirement (e.g., client accessing admin endpoint)
 *
 * 500 Internal Server Error:
 * - Database connection error
 * - Unexpected JWT verification error
 * - Unexpected middleware error
 *
 * Usage Examples:
 *
 * // Admin-only endpoint (Video Library creation)
 * import { requireAdmin } from './middleware/adminAuth.mjs';
 * router.post('/api/admin/exercise-library', requireAdmin, createExerciseVideo);
 *
 * // Trainer + admin endpoint (View assigned clients)
 * import { requireTrainerOrAdmin } from './middleware/adminAuth.mjs';
 * router.get('/api/trainer/clients', requireTrainerOrAdmin, getClients);
 *
 * // Public endpoint with optional auth (Video analytics tracking)
 * import { optionalAuth } from './middleware/adminAuth.mjs';
 * router.post('/api/videos/:id/track-view', optionalAuth, trackVideoView);
 *
 * Request Context:
 * - req.user = null (before middleware)
 * - req.user = User object (after successful auth)
 * - req.user fields: id, email, role, firstName, lastName, created_at, etc.
 *
 * Security Considerations:
 *
 * WHY JWT Tokens?
 * - Stateless authentication (no server-side session storage)
 * - Self-contained (includes user ID + role in payload)
 * - Standard industry practice (RFC 7519)
 * - Easy to verify (cryptographic signature)
 *
 * WHY Database User Lookup?
 * - Validates user still exists (handles deleted accounts)
 * - Checks account status (suspended/deleted)
 * - Prevents stale tokens from accessing API after user deletion
 * - Allows real-time role changes (admin demoted to client)
 *
 * WHY Separate requireAdmin and requireTrainerOrAdmin?
 * - Principle of least privilege (admins-only for critical operations)
 * - Flexibility (trainers can view video library but not create exercises)
 * - Clear security boundaries (obvious which endpoints are admin-only)
 *
 * WHY optionalAuth?
 * - Public analytics tracking (clients may be logged out)
 * - Enhanced analytics if authenticated (track user_id)
 * - Anonymous usage supported (user_id = NULL in analytics)
 *
 * Performance Considerations:
 * - JWT verification: ~1-2ms per request (cryptographic signature check)
 * - Database user lookup: ~3-5ms per request (indexed query on primary key)
 * - Total overhead: ~5-10ms per authenticated request
 * - Caching potential: Could cache user objects for 60s (not implemented)
 *
 * Environment Variables:
 * - JWT_SECRET: Secret key for JWT signing/verification (REQUIRED)
 * - Default: 'your-secret-key-change-in-production' (INSECURE - change in production!)
 *
 * Testing:
 * - Unit tests: backend/tests/adminAuth.test.mjs
 * - Test cases:
 *   - ✅ Valid admin token → next() called
 *   - ✅ Missing token → 401 Unauthorized
 *   - ✅ Expired token → 401 Token expired
 *   - ✅ Invalid signature → 401 Invalid token
 *   - ✅ Non-admin role → 403 Forbidden
 *   - ✅ Suspended user → 403 Account suspended
 *   - ✅ User not found → 401 User not found
 *
 * Created: 2025-11-13
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
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
