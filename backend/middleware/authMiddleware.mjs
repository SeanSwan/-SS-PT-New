/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║           CORE AUTHENTICATION & AUTHORIZATION MIDDLEWARE                  ║
 * ║      (JWT Token Validation + Role-Based Access Control + Rate Limiting)  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Core authentication infrastructure providing JWT validation, role-based
 *          authorization, resource ownership checks, and rate limiting for all
 *          SwanStudios API routes
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Authentication & Authorization Stack:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                          CLIENT REQUEST                                   │
 * │  POST /api/workouts { name: "Leg Day" }                                  │
 * │  Headers: { Authorization: "Bearer <JWT_TOKEN>" }                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. protect() Middleware - JWT Validation                                │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ Extract Bearer token from Authorization header                      │ │
 * │  │ ↓                                                                    │ │
 * │  │ Verify JWT_SECRET is configured (production safety check)           │ │
 * │  │ ↓                                                                    │ │
 * │  │ jwt.verify(token, getJwtSecret()) → decoded payload                 │ │
 * │  │ ↓                                                                    │ │
 * │  │ Check tokenType === 'access' (not refresh token)                    │ │
 * │  │ ↓                                                                    │ │
 * │  │ User.findByPk(decoded.id) → Fetch user from database                │ │
 * │  │ ↓                                                                    │ │
 * │  │ Check user.isActive === true (account not disabled)                 │ │
 * │  │ ↓                                                                    │ │
 * │  │ req.user = { id, role, username, email } → Attach to request        │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 2. Authorization Middleware (One of Many Options)                        │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ adminOnly() → Check req.user.role === 'admin'                       │ │
 * │  │ trainerOnly() → Check req.user.role === 'trainer'                   │ │
 * │  │ clientOnly() → Check req.user.role === 'client'                     │ │
 * │  │ authorize(['trainer', 'admin']) → Check role in array               │ │
 * │  │ ownerOrAdminOnly(getOwnerId) → Check ownership or admin             │ │
 * │  │ checkTrainerClientRelationship() → Verify trainer-client link       │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 3. Route Handler Executes (Protected & Authorized)                       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         JWT TOKEN STRUCTURE                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * JWT Payload (Access Token):
 * {
 *   "id": "user-uuid-here",              // User UUID from users.id
 *   "tokenType": "access",               // Distinguish access vs refresh tokens
 *   "iat": 1234567890,                   // Issued at (Unix timestamp)
 *   "exp": 1234567900                    // Expires at (Unix timestamp)
 * }
 *
 * Token Lifecycle:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. LOGIN → Generate access token (15min) + refresh token (7 days)        │
 * │ 2. REQUEST → Client sends access token in Authorization header           │
 * │ 3. VALIDATION → protect() verifies token signature + expiration          │
 * │ 4. REFRESH → When access token expires, use refresh token to get new pair│
 * │ 5. LOGOUT → Client discards tokens (server stateless, no revocation)     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY JWT (Not Session Cookies)?
 * - Stateless: No session store needed (Redis/Memcached)
 * - Scalability: Horizontally scale without sticky sessions
 * - Mobile-friendly: Easy to send tokens from iOS/Android apps
 * - API-first: RESTful APIs traditionally use token auth
 * - CORS-friendly: No cookie CORS complexity
 * - Microservices: Pass token between services for authentication
 * - Trade-off: Cannot revoke tokens (mitigated with short expiration + refresh tokens)
 *
 * WHY Verify JWT_SECRET Exists (Not Assume Configured)?
 * - Production safety: Prevent app startup with placeholder secret
 * - Security: Missing secret = authentication bypass vulnerability
 * - Clear error: "Server configuration error" vs cryptic JWT error
 * - Environment validation: Catch .env misconfiguration early
 * - OWASP recommendation: Fail securely on config errors
 *
 * WHY Check tokenType (Not Accept Any JWT)?
 * - Token purpose separation: Access tokens for API, refresh for token renewal
 * - Security: Prevent refresh token reuse for API access
 * - Expiration enforcement: Access tokens short-lived (15min), refresh long-lived (7d)
 * - Attack surface reduction: Stolen refresh token can't be used for API requests
 * - Standard practice: OAuth 2.0 pattern
 *
 * WHY Database User Lookup (Not Trust JWT Payload)?
 * - Real-time status: Check user.isActive (account disabled mid-session)
 * - Data integrity: User data may have changed since token issued
 * - Role updates: Admin revokes trainer role, immediately effective
 * - Deleted users: Catch deleted users even with valid token
 * - Security: JWT signature valid but user no longer exists
 * - Trade-off: Database query overhead acceptable for security
 *
 * WHY isActive Check (Not Just Existence)?
 * - Account suspension: Disabled users can't access system
 * - GDPR compliance: Soft-deleted users marked inactive
 * - Security: Admin disables compromised accounts
 * - Billing: Inactive accounts (expired subscription) blocked
 * - Immediate enforcement: isActive = false → access denied
 *
 * WHY toStringId Conversion (Not Use Raw ID)?
 * - Consistency: UUIDs stored as strings vs integers
 * - Comparison safety: req.user.id === params.userId works correctly
 * - Type coercion issues: Prevent 123 == "123" edge cases
 * - Standard practice: Normalize IDs to strings for API layer
 *
 * WHY Token Error Handling (Not Generic "Invalid Token")?
 * - User experience: "Token expired" vs "Invalid token" guides action
 * - Client handling: Frontend can auto-refresh on TOKEN_EXPIRED
 * - Debugging: Clear error codes (TOKEN_INVALID, TOKEN_NOT_ACTIVE)
 * - Logging: Track different JWT failure modes
 * - Error codes: TOKEN_EXPIRED, TOKEN_INVALID, TOKEN_NOT_ACTIVE, TOKEN_VALIDATION_FAILED
 *
 * WHY Role-Based Middleware Variants (Not Single authorize())?
 * - Code clarity: adminOnly() self-documenting vs authorize(['admin'])
 * - Common patterns: Most routes need single-role check
 * - Performance: No array iteration for single role check
 * - Backwards compatibility: Existing routes use adminOnly(), trainerOnly()
 * - Convenience: Pre-built middlewares reduce boilerplate
 *
 * WHY ownerOrAdminOnly Pattern (Not Just adminOnly)?
 * - User privacy: Users can access their own data
 * - Admin override: Admins can access any user's data (support, troubleshooting)
 * - Common pattern: GET /users/:id (user can view self, admin can view all)
 * - Flexible ownership: getOwnerId function extracts owner from request context
 * - Example: User can update own profile, admin can update any profile
 *
 * WHY Trainer-Client Relationship Check (Not Just Role)?
 * - Data isolation: Trainers only see assigned clients
 * - Privacy: Client A's data hidden from Client B's trainer
 * - Business logic: Trainer-client assignments managed by admins
 * - Implemented: ClientTrainerAssignment junction table enforces trainer-client scope
 * - Current: Trainers can only access their assigned clients (checkTrainerClientRelationship)
 *
 * WHY Simple Rate Limiter (Not External Library)?
 * - Zero dependencies: No express-rate-limit or rate-limiter-flexible
 * - In-memory: Fast, no Redis dependency
 * - Customizable: windowMs, max, message configurable
 * - Sliding window: Old timestamps filtered out automatically
 * - Trade-off: Memory-based, doesn't persist across restarts
 * - Use case: Basic DoS protection, not production-grade rate limiting
 *
 * WHY Lazy Model Loading (Not Import at Top)?
 * - Circular dependency prevention: Models import middleware, middleware imports models
 * - Initialization race condition: Sequelize models not ready at module load time
 * - getUser() pattern: Deferred import ensures models initialized
 * - Production fix: Prevents "User model not initialized" errors
 * - P0 enhancement: Coordinated model imports via backend/models/index.mjs
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       USAGE EXAMPLES                                     │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Example 1: Basic Authentication (All Logged-In Users)
 * ```javascript
 * import { protect } from '../middleware/authMiddleware.mjs';
 *
 * router.get('/profile', protect, getProfile);
 * // Any authenticated user (client, trainer, admin) can access
 * ```
 *
 * Example 2: Admin-Only Route
 * ```javascript
 * import { protect, adminOnly } from '../middleware/authMiddleware.mjs';
 *
 * router.delete('/users/:id', protect, adminOnly, deleteUser);
 * // Only admins can delete users
 * ```
 *
 * Example 3: Multi-Role Authorization
 * ```javascript
 * import { protect, authorize } from '../middleware/authMiddleware.mjs';
 *
 * router.post('/workouts', protect, authorize(['trainer', 'admin']), createWorkout);
 * // Trainers and admins can create workouts, clients cannot
 * ```
 *
 * Example 4: Owner or Admin Pattern
 * ```javascript
 * import { protect, ownerOrAdminOnly } from '../middleware/authMiddleware.mjs';
 *
 * router.put('/users/:id',
 *   protect,
 *   ownerOrAdminOnly((req) => req.params.id),  // getOwnerId function
 *   updateUser
 * );
 * // User can update own profile, admin can update any profile
 * ```
 *
 * Example 5: Rate Limiting
 * ```javascript
 * import { rateLimiter } from '../middleware/authMiddleware.mjs';
 *
 * router.post('/login', rateLimiter({ windowMs: 60000, max: 5 }), login);
 * // Max 5 login attempts per minute per IP
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - JWT secret validation: Prevents startup with insecure/default secrets
 * - Token type enforcement: Access tokens only (no refresh token reuse)
 * - User active check: Disabled accounts immediately blocked
 * - Real-time user lookup: Latest user data, not stale JWT claims
 * - Token expiration: Short-lived access tokens (15min)
 * - Error message clarity: 401 (auth) vs 403 (permission) distinction
 * - Logging: All auth failures logged with context
 * - Rate limiting: Basic DoS protection on sensitive endpoints
 * - ID normalization: toStringId prevents type coercion bugs
 * - Stack trace logging: Full error context for debugging
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      RELATED FILES & DEPENDENCIES                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - jsonwebtoken (JWT signing and verification)
 * - backend/models/index.mjs (getUser model accessor)
 * - backend/utils/logger.mjs (Logging infrastructure)
 * - backend/utils/idUtils.mjs (toStringId UUID/INT normalization)
 *
 * Used By:
 * - backend/routes/* (All protected API routes)
 * - backend/middleware/nasmAuthMiddleware.mjs (NASM-specific auth layer)
 * - backend/middleware/trainerPermissionMiddleware.mjs (Permission checks)
 *
 * Related Code:
 * - backend/controllers/authController.mjs (Login, register, token refresh)
 * - backend/middleware/errorMiddleware.mjs (Error handling)
 * - backend/middleware/p0Monitoring.mjs (Security monitoring)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
import jwt from 'jsonwebtoken';
// 🚀 ENHANCED: Coordinated model imports for consistent associations
import { getUser } from '../models/index.mjs';
import logger from '../utils/logger.mjs';
import { toStringId } from '../utils/idUtils.mjs';
import { getJwtSecret, isJwtSecretConfigurationError } from '../utils/jwtSecretGuard.mjs';
import { requireLinkedWaiver } from './waiverGate.mjs';
import { AdminOwnerGateError, requireOwnerAdmin } from '../services/admin/adminOwnerGate.mjs';

// 🎯 ENHANCED P0 FIX: Lazy loading User model to prevent initialization race condition
// User model will be retrieved via getUser() inside each function when needed

/**
 * PRODUCTION-FIXED Authentication middleware to protect routes
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
      logger.warn('No token provided', { path: req.path, method: req.method, origin: req.headers.origin });
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, getJwtSecret());
      
      // PRODUCTION FIX: Enhanced token validation with logging
      logger.info('Token decoded successfully', {
        userId: decoded.id,
        tokenType: decoded.tokenType,
        path: req.path,
        timeToExpiry: decoded.exp ? (decoded.exp * 1000 - Date.now()) : 'unknown'
      });
      
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
      
      // 🚀 ENHANCED: Simplified database lookup with better error handling
      const User = getUser(); // 🎯 ENHANCED: Lazy load User model
      const user = await User.findByPk(decoded.id).catch(dbError => {
        logger.error('Database error during user lookup', {
          error: dbError.message,
          userId: decoded.id,
          path: req.path
        });
        throw new Error('Database error during authentication');
      });
      
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

      // Check if user is locked so admin account blocks stop live access tokens too.
      if (user.isLocked) {
        logger.warn('Locked user attempted access', { userId: user.id });
        return res.status(403).json({
          success: false,
          message: 'Account is locked. Please contact support.'
        });
      }
      
      // Attach user to request - ensure ID is a string for consistent comparison
      req.user = {
        id: toStringId(user.id),
        role: user.role,
        username: user.username,
        email: user.email,
        subscriptionTier: user.subscriptionTier || 'free',
      };

      if (
        decoded.impersonation === true &&
        decoded.impersonatedBy &&
        decoded.impersonationActorRole === 'admin'
      ) {
        req.impersonation = {
          actorId: toStringId(decoded.impersonatedBy),
          targetUserId: toStringId(user.id),
          targetRole: user.role,
        };
      }
      
      // Log successful authentication
      logger.info('User authenticated', { 
        userId: user.id, 
        role: user.role,
        impersonatedBy: req.impersonation?.actorId,
        path: req.path,
        method: req.method
      });
      
      await requireLinkedWaiver(req, res, next);
    } catch (tokenError) {
      // 🚀 ENHANCED: Simplified token error handling with efficient mapping
      logger.error('Token verification error', { 
        error: tokenError.message,
        name: tokenError.name,
        path: req.path, 
        method: req.method
      });

      if (isJwtSecretConfigurationError(tokenError)) {
        return res.status(500).json({
          success: false,
          message: 'Server configuration error'
        });
      }
      
      const tokenErrors = {
        TokenExpiredError: { message: 'Token expired', code: 'TOKEN_EXPIRED' },
        JsonWebTokenError: { message: 'Invalid token', code: 'TOKEN_INVALID' },
        NotBeforeError: { message: 'Token not active', code: 'TOKEN_NOT_ACTIVE' }
      };
      
      const errorInfo = tokenErrors[tokenError.name] || 
        { message: 'Token validation failed', code: 'TOKEN_VALIDATION_FAILED' };
      
      return res.status(401).json({
        success: false,
        message: errorInfo.message,
        errorCode: errorInfo.code
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
 * Owner-admin access middleware for destructive or account-control actions.
 * Must be used after protect; normal admins keep broad staff access but cannot
 * run high-blast-radius operations unless explicitly allowlisted.
 */
export const ownerAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated'
    });
  }

  try {
    requireOwnerAdmin(req.user);
    return next();
  } catch (error) {
    const statusCode = error instanceof AdminOwnerGateError ? error.statusCode : 403;
    logger.warn('Owner-admin action denied', {
      userId: req.user?.id,
      role: req.user?.role,
      ownerGateCode: error?.code || 'OWNER_GATE_DENIED',
      path: req.path,
      method: req.method
    });

    return res.status(statusCode).json({
      success: false,
      message: statusCode === 503
        ? 'Owner admin gate is not configured'
        : 'Access denied: Owner admin only',
      code: error?.code || 'OWNER_GATE_DENIED'
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
    
    // Admin role always has access (universal override)
    if (req.user.role === 'admin') {
      return next();
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
  if (req.user && (req.user.role === 'client' || req.user.role === 'admin')) {
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

// Flexible role check — any authenticated user with one of the specified roles
export const requireAnyRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ success: false, message: 'Insufficient permissions' });
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

const WORKOUT_SELF_ACCESS_ROLES = new Set(['client', 'user']);
const isWorkoutSelfAccessRole = (role) =>
  typeof role === 'string' && WORKOUT_SELF_ACCESS_ROLES.has(role.toLowerCase());

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
    
    // Client/member accessing their own data
    //
    // 2026-04-18 Phase 16.2 round 5 fix — req.user.id is stored as a string
    // by `protect` (authMiddleware.mjs:359 via toStringId), while clientId
    // from params/body is parseInt'd to a number. `string === number` is
    // always false, so the old `req.user.id === clientId` strict-equality
    // gate silently 403'd every legitimate client self-access, including
    // the canonical /dashboard/client/log-workout save path.
    //
    // Fix: parse req.user.id to a number on the comparison side. Both sides
    // are now compared as numbers. NaN === NaN is false, so malformed
    // inputs still fall through to the deny branch safely.
    const clientId = parseInt(req.params.clientId || req.body.clientId, 10);
    const userNumericId = parseInt(req.user.id, 10);
    if (isWorkoutSelfAccessRole(req.user.role) && userNumericId === clientId) {
      return next();
    }
    
    // Trainer accessing client data - check actual assignment
    if (req.user.role === 'trainer') {
      // Import ClientTrainerAssignment model dynamically to avoid circular dependencies
      const { default: ClientTrainerAssignment } = await import('../models/ClientTrainerAssignment.mjs');

      // Check if this trainer is assigned to this client
      // Use userNumericId (parseInt from req.user.id) so Sequelize sees a
      // numeric trainerId against the INT column, matching clientId shape.
      const assignment = await ClientTrainerAssignment.findOne({
        where: {
          trainerId: userNumericId,
          clientId: clientId,
          status: 'active'
        }
      });

      if (assignment) {
        // Trainer has active assignment to this client
        return next();
      }

      // No active assignment found - deny access
      logger.warn('Trainer attempting to access unassigned client', {
        trainerId: req.user.id,
        requestedClientId: clientId,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not assigned to this client'
      });
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

/**
 * Flexible resource access authorization middleware.
 * Checks that the authenticated user is allowed to access a resource
 * identified by a userId-style route param. Admins always pass.
 * Trainers must have an active ClientTrainerAssignment. Clients may
 * only access their own data.
 *
 * @param {string} paramName - Route parameter that holds the target user ID (default: 'userId')
 * @returns Express middleware
 */
export const authorizeResourceAccess = (paramName = 'userId') => {
  return async (req, res, next) => {
    try {
      const targetId = parseInt(req.params[paramName] || req.body[paramName], 10);

      if (!targetId || isNaN(targetId)) {
        return res.status(400).json({ success: false, message: 'Invalid or missing user ID' });
      }

      // Own data - always allowed; protect stores req.user.id as a string.
      if (Number(req.user.id) === targetId) {
        return next();
      }

      // Admins — always allowed
      if (req.user.role === 'admin') {
        return next();
      }

      // Trainers — only if assigned to this client
      if (req.user.role === 'trainer') {
        const { default: ClientTrainerAssignment } = await import('../models/ClientTrainerAssignment.mjs');
        const assignment = await ClientTrainerAssignment.findOne({
          where: { trainerId: req.user.id, clientId: targetId, status: 'active' }
        });
        if (assignment) {
          return next();
        }

        logger.warn('Trainer IDOR blocked — not assigned to client', {
          trainerId: req.user.id,
          targetUserId: targetId,
          path: req.path,
          method: req.method
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this user\'s data'
      });
    } catch (error) {
      logger.error('authorizeResourceAccess error', { error: error.message, path: req.path });
      return res.status(500).json({ success: false, message: 'Authorization check failed' });
    }
  };
};

// Rate limiting middleware - simplified in-memory version
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 60 * 1000,
    max = 100,
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

// ─────────────────────────────────────────────────────────────
// SECTION: Analytics Ownership Middleware
// PURPOSE: IDOR prevention for /api/analytics/:userId/* endpoints
// WHY: AI Village CRITICAL finding — users could access other users' data
//      by changing :userId in the URL. This middleware enforces:
//      - Owner can access own data
//      - Trainers can access assigned clients' data
//      - Admins can access any data
// ─────────────────────────────────────────────────────────────
export const requireOwnershipOrTrainer = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const targetUserId = req.params.userId;

    // Admins always have access
    if (req.user.role === 'admin') {
      return next();
    }

    // Owner can access own data (string comparison — both are strings via toStringId)
    if (String(req.user.id) === String(targetUserId)) {
      return next();
    }

    // Trainers can access their assigned clients.
    //
    // 2026-05-01 schema fix: prior raw SQL queried "ClientTrainerAssignments"
    // (PascalCase), which doesn't exist. Real table is client_trainer_assignments
    // (snake_case, see ClientTrainerAssignment.mjs:115). The PascalCase query
    // threw, the catch silently logged a warning, and every legitimate trainer
    // access to /api/analytics/:userId/* fell through to 403. Same bug class
    // as the workoutBuilderRoutes mismatch fixed earlier — switch to the model
    // contract so future schema changes touch ONE place.
    if (req.user.role === 'trainer') {
      try {
        const { default: ClientTrainerAssignment } = await import('../models/ClientTrainerAssignment.mjs');
        const assignment = await ClientTrainerAssignment.findOne({
          where: {
            trainerId: parseInt(req.user.id, 10),
            clientId: parseInt(targetUserId, 10),
            status: 'active',
          },
        });
        if (assignment) {
          return next();
        }
      } catch (assignmentError) {
        logger.warn('Trainer assignment check failed', {
          error: assignmentError.message,
          trainerId: req.user.id,
          clientId: targetUserId,
        });
      }
    }

    // Deny access
    logger.warn('IDOR attempt blocked on analytics endpoint', {
      userId: req.user.id,
      role: req.user.role,
      targetUserId,
      path: req.path,
      method: req.method
    });

    return res.status(403).json({
      success: false,
      message: 'Access denied: You do not have permission to view this data'
    });
  } catch (error) {
    logger.error('Ownership check error', {
      error: error.message,
      path: req.path
    });
    return res.status(500).json({
      success: false,
      message: 'Server error checking data ownership'
    });
  }
};

// ─────────────────────────────────────────────────────────────
// SECTION: AI Action Authorization Matrix
// PURPOSE: Role-based action whitelist for AI assistant actions
// WHY: AI Village CRITICAL — prevents AI prompt injection from escalating privileges
// ─────────────────────────────────────────────────────────────
export const AI_ACTION_PERMISSIONS = {
  user: ['fill_own_forms', 'read_own_data', 'read_own_charts'],
  client: ['fill_own_forms', 'read_own_data', 'read_own_charts'],
  trainer: ['fill_own_forms', 'fill_client_forms', 'read_client_data', 'read_client_charts', 'draft_email', 'draft_sms'],
  admin: ['fill_own_forms', 'fill_any_forms', 'read_all_data', 'read_all_charts', 'draft_email', 'draft_sms']
};

/**
 * Check if a user role is authorized for a specific AI action.
 * @param {string} role - User role (user, client, trainer, admin)
 * @param {string} action - AI action to check
 * @returns {boolean}
 */
export const isAIActionAllowed = (role, action) => {
  const allowed = AI_ACTION_PERMISSIONS[role] || AI_ACTION_PERMISSIONS.user;
  return allowed.includes(action);
};
