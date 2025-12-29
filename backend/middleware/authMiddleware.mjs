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
 * │  │ jwt.verify(token, JWT_SECRET) → decoded payload                     │ │
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
 * - TODO noted: Full implementation needs TrainerClient junction table
 * - Current: Trainers can access all clients (permissive, needs refinement)
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

    // PRODUCTION FIX: Validate JWT_SECRET exists and is not placeholder
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET || JWT_SECRET === 'your-production-jwt-secret-key-here-change-this') {
      logger.error('CRITICAL: JWT_SECRET not properly configured for production!', {
        hasSecret: !!JWT_SECRET,
        isPlaceholder: JWT_SECRET === 'your-production-jwt-secret-key-here-change-this'
      });
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
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
    } catch (tokenError) {
      // 🚀 ENHANCED: Simplified token error handling with efficient mapping
      logger.error('Token verification error', { 
        error: tokenError.message,
        name: tokenError.name,
        path: req.path, 
        method: req.method
      });
      
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
