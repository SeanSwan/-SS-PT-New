/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         NASM AUTHENTICATION MIDDLEWARE (COMPATIBILITY LAYER)              ║
 * ║          (JWT Token Validation + Role-Based Authorization)               ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: NASM-specific authentication layer providing naming compatibility
 *          for client progress routes while delegating to core auth system
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * NASM Auth Layer Architecture:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                          NASM ROUTES                                      │
 * │  /api/nasm/client-progress/:clientId                                     │
 * │  /api/nasm/workout-tracker/...                                           │
 * │  /api/nasm/assessments/...                                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                    nasmAuthMiddleware.mjs                                │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ authenticateUser()                                                  │ │
 * │  │   → Alias for protect() from authMiddleware.mjs                    │ │
 * │  │   → Validates JWT token                                            │ │
 * │  │   → Attaches user to req.user                                      │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ authorizeRoles(roles)                                               │ │
 * │  │   → Checks req.user.role against allowed roles                     │ │
 * │  │   → Returns 403 if role not in allowed list                        │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                    authMiddleware.mjs (Core Auth)                        │
 * │  - protect() - JWT validation + user lookup                             │
 * │  - adminOnly(), trainerOnly(), clientOnly() - Role guards               │
 * │  - authorize(roles) - Multi-role authorization                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                         AUTHENTICATION FLOW                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Request Flow Through NASM Auth Middleware:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. CLIENT REQUEST                                                         │
 * │    GET /api/nasm/client-progress/123                                     │
 * │    Headers: { Authorization: "Bearer <JWT_TOKEN>" }                      │
 * │    ↓                                                                      │
 * │ 2. authenticateUser() [ALIAS FOR protect()]                              │
 * │    Extract token from Authorization header                               │
 * │    ↓                                                                      │
 * │    jwt.verify(token, JWT_SECRET)                                         │
 * │    ↓                                                                      │
 * │    decoded = { id: "user-uuid", tokenType: "access", exp: 1234567890 }  │
 * │    ↓                                                                      │
 * │    User.findByPk(decoded.id)                                             │
 * │    ↓                                                                      │
 * │    Check: user.isActive === true                                         │
 * │    ↓                                                                      │
 * │    req.user = { id, role, username, email }                              │
 * │    ↓                                                                      │
 * │    next() → Continue to authorizeRoles()                                 │
 * │                                                                           │
 * │ 3. authorizeRoles(['trainer', 'admin'])                                  │
 * │    Check: req.user exists? (Authentication required)                     │
 * │    ↓                                                                      │
 * │    Check: req.user.role in ['trainer', 'admin']?                         │
 * │      ✅ YES → next() → Route handler executes                            │
 * │      ❌ NO → 403 Forbidden: "Access denied: Must have one of..."         │
 * │                                                                           │
 * │ 4. ROUTE HANDLER EXECUTES                                                │
 * │    const clientProgress = await fetchProgressData(req.params.clientId)   │
 * │    res.json({ success: true, data: clientProgress })                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Separate NASM Auth Middleware (Not Use authMiddleware.mjs Directly)?
 * - API consistency: NASM routes imported authenticateUser() before refactor
 * - Naming convention: authenticateUser() more explicit than protect()
 * - Backwards compatibility: Existing NASM routes use this naming
 * - Centralized refactor point: Change implementation without touching routes
 * - Future extensibility: Can add NASM-specific auth logic (e.g., NASM API key validation)
 * - Code clarity: NASM routes clearly import from nasmAuthMiddleware
 * - Migration path: Gradual migration from custom auth to core auth system
 *
 * WHY authenticateUser Alias (Not Duplicate Implementation)?
 * - DRY principle: Single source of truth for JWT validation
 * - Maintenance: Bug fixes in authMiddleware.mjs automatically apply
 * - Consistency: Same authentication behavior across all routes
 * - Testing: Test core auth middleware, NASM auth inherits guarantees
 * - Security: No risk of divergent security implementations
 * - Performance: No overhead, direct function reference (not wrapper)
 *
 * WHY authorizeRoles Custom Implementation (Not Use authorize() from authMiddleware)?
 * - Enhanced error messages: Logs userId, userRole, requiredRoles for debugging
 * - NASM-specific logging: Tracks which NASM routes are accessed by which roles
 * - Custom response format: Matches NASM API response structure
 * - Future extensibility: Can add NASM-specific role logic (e.g., tier-based access)
 * - Clear separation: NASM auth concerns isolated from core auth
 *
 * WHY Check req.user Existence (Not Assume Always Present)?
 * - Middleware order safety: Catches misconfiguration where authorizeRoles() used without authenticateUser()
 * - Error clarity: Clear 401 "Not authenticated" vs 403 "Wrong role"
 * - Defense in depth: Redundant check prevents authorization without authentication
 * - Development experience: Helpful error message during route setup
 *
 * WHY Log Access Denials (Not Silent Failure)?
 * - Security auditing: Track unauthorized access attempts
 * - Debugging: Identify misconfigured permissions or client errors
 * - Analytics: Understand which users attempt to access restricted features
 * - Compliance: GDPR/CCPA audit trails for access control
 * - Pattern detection: Identify brute force or privilege escalation attempts
 *
 * WHY Array of Roles (Not Single Role Parameter)?
 * - Flexibility: Same route accessible by multiple roles (trainer + admin)
 * - Common pattern: Most NASM routes allow both trainers and admins
 * - Clear intent: authorizeRoles(['trainer', 'admin']) self-documenting
 * - Standard practice: Express middleware pattern (req, res, next)
 * - Future-proof: Easy to add new roles (e.g., 'supervisor')
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       USAGE EXAMPLES IN ROUTES                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Example 1: Client Progress Route (Trainer or Admin Only)
 * ```javascript
 * import { authenticateUser, authorizeRoles } from '../middleware/nasmAuthMiddleware.mjs';
 *
 * router.get('/client-progress/:clientId',
 *   authenticateUser,                      // Step 1: Validate JWT, set req.user
 *   authorizeRoles(['trainer', 'admin']),  // Step 2: Check role
 *   getClientProgress                       // Step 3: Route handler
 * );
 * ```
 *
 * Example 2: Admin-Only NASM Configuration Route
 * ```javascript
 * router.post('/nasm/config/update',
 *   authenticateUser,
 *   authorizeRoles(['admin']),  // Only admins
 *   updateNASMConfig
 * );
 * ```
 *
 * Example 3: Multi-Role Access (Trainer, Admin, Client - for viewing own data)
 * ```javascript
 * router.get('/nasm/my-workouts',
 *   authenticateUser,
 *   authorizeRoles(['client', 'trainer', 'admin']),  // All logged-in users
 *   getMyWorkouts
 * );
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - JWT validation: Delegates to authMiddleware.mjs (uses jwt.verify with JWT_SECRET)
 * - Token expiration: Automatic rejection of expired tokens (exp claim)
 * - User active check: Inactive users (isActive=false) rejected
 * - Role validation: Only allows explicitly listed roles
 * - Audit logging: All access denials logged with user context
 * - No role privilege escalation: Client cannot access trainer routes
 * - Middleware order enforcement: authorizeRoles() checks for req.user
 * - Clear error messages: 401 vs 403 distinction for debugging
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      RELATED FILES & DEPENDENCIES                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - backend/middleware/authMiddleware.mjs (protect, adminOnly, trainerOnly, clientOnly)
 * - backend/utils/logger.mjs (Logging infrastructure)
 *
 * Used By:
 * - backend/routes/nasmClientProgressRoutes.mjs (NASM client progress tracking)
 * - backend/routes/nasmWorkoutRoutes.mjs (NASM workout management)
 * - backend/routes/nasmAssessmentRoutes.mjs (NASM fitness assessments)
 *
 * Related Code:
 * - backend/controllers/nasmClientProgressController.mjs (Route handlers)
 * - backend/models/ClientProgress.mjs (Data model)
 *
 * ═══════════════════════════════════════════════════════════════════════════
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
