/**
 * Authentication Middleware Re-export Module (Backwards Compatibility Layer)
 * ===========================================================================
 *
 * Purpose: Centralized import/export point for authentication middleware - maintains backwards compatibility
 *
 * Blueprint Reference: SwanStudios Personal Training Platform - Auth System
 *
 * Architecture Overview:
 * ┌─────────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
 * │  Route Files        │─────▶│  auth.mjs        │─────▶│  authMiddleware.mjs │
 * │  (Legacy Imports)   │      │  (this file)     │      │  (Implementation)   │
 * └─────────────────────┘      └──────────────────┘      └─────────────────────┘
 *                                      │
 *                                      │ (re-exports)
 *                                      ▼
 *                              ┌──────────────────┐
 *                              │  9 Middleware    │
 *                              │  Functions       │
 *                              └──────────────────┘
 *
 * Import Patterns (Supported):
 *
 * ┌───────────────────────────────────────────────────────────────────┐
 * │ IMPORT STYLE                          COMPATIBILITY               │
 * ├───────────────────────────────────────────────────────────────────┤
 * │ import { protect } from './auth.mjs'  ✅ Named import (modern)     │
 * │ import auth from './auth.mjs'         ✅ Default import (legacy)   │
 * │ auth.protect(req, res, next)          ✅ Object destructuring      │
 * │ const { protect } = auth              ✅ Legacy destructuring      │
 * └───────────────────────────────────────────────────────────────────┘
 *
 * Re-exported Middleware Functions (9 total):
 *
 * ┌────────────────────────────────────────────────────────────────────────────────────┐
 * │ FUNCTION                          ALIAS                   PURPOSE                  │
 * ├────────────────────────────────────────────────────────────────────────────────────┤
 * │ protect                           authenticateToken       JWT verification         │
 * │ adminOnly                         authorizeAdmin          Admin-only access        │
 * │ trainerOnly                       (none)                  Trainer-only access      │
 * │ clientOnly                        (none)                  Client-only access       │
 * │ trainerOrAdminOnly                (none)                  Trainer + admin access   │
 * │ ownerOrAdminOnly                  (none)                  Resource owner + admin   │
 * │ checkTrainerClientRelationship    (none)                  Trainer-client check     │
 * │ rateLimiter                       (none)                  IP-based rate limiting   │
 * │ authorize                         (none)                  Role-based auth factory  │
 * └────────────────────────────────────────────────────────────────────────────────────┘
 *
 * Module Architecture (Layer Separation):
 *
 *   Route Layer (authRoutes.mjs)
 *         │
 *         │ import { protect, adminOnly } from './middleware/auth.mjs'
 *         │
 *         ▼
 *   ┌─────────────────────────────────┐
 *   │ auth.mjs (THIS FILE)            │
 *   │ - Re-export layer               │
 *   │ - Backwards compatibility       │
 *   │ - Alias definitions             │
 *   └─────────────────────────────────┘
 *         │
 *         │ import { protect, adminOnly } from './authMiddleware.mjs'
 *         │
 *         ▼
 *   ┌─────────────────────────────────┐
 *   │ authMiddleware.mjs              │
 *   │ - Implementation layer          │
 *   │ - JWT verification logic        │
 *   │ - Role checks                   │
 *   │ - Database lookups              │
 *   └─────────────────────────────────┘
 *
 * Why This File Exists:
 *
 * WHY Separate Re-export File?
 * - Legacy codebase compatibility: Some files import from './auth.mjs'
 * - Migration path: Allows gradual migration to './authMiddleware.mjs'
 * - Centralized export: Single source of truth for all auth middleware
 * - Easier refactoring: Can swap implementations without updating all imports
 * - Alias support: Provides backwards-compatible function names (authenticateToken → protect)
 *
 * WHY Alias Functions (authenticateToken, authorizeAdmin)?
 * - Backwards compatibility with older route files
 * - Different naming conventions evolved over time
 * - authenticateToken (old name) → protect (new name)
 * - authorizeAdmin (old name) → adminOnly (new name)
 * - Prevents breaking existing code during refactor
 *
 * WHY Default Export AND Named Exports?
 * - Named exports: Modern ES6 pattern (import { protect })
 * - Default export: Legacy pattern (import auth from './auth.mjs'; auth.protect())
 * - Supports both import styles for maximum compatibility
 * - Enables tree-shaking in modern bundlers (named exports)
 * - Maintains backwards compatibility with CommonJS-style usage
 *
 * Usage Examples:
 *
 * // Modern named import (recommended)
 * import { protect, adminOnly } from './middleware/auth.mjs';
 * router.get('/profile', protect, getProfile);
 * router.get('/users', protect, adminOnly, listUsers);
 *
 * // Legacy default import (backwards compatible)
 * import auth from './middleware/auth.mjs';
 * router.get('/profile', auth.protect, getProfile);
 *
 * // Legacy alias usage
 * import { authenticateToken, authorizeAdmin } from './middleware/auth.mjs';
 * router.get('/profile', authenticateToken, getProfile); // Old name for protect
 *
 * // Role-based factory
 * import { authorize } from './middleware/auth.mjs';
 * router.get('/trainer-dashboard', protect, authorize(['trainer', 'admin']), getDashboard);
 *
 * Migration Path:
 *
 * OLD CODE (Pre-Refactor):
 * import auth from './middleware/auth.mjs';
 * router.post('/login', auth.authenticateToken, loginController);
 *
 * CURRENT CODE (This File):
 * import { protect } from './middleware/auth.mjs';
 * router.post('/login', protect, loginController);
 *
 * FUTURE CODE (Direct Import):
 * import { protect } from './middleware/authMiddleware.mjs';
 * router.post('/login', protect, loginController);
 *
 * Security Model:
 * - This file contains NO security logic (pure re-export)
 * - All security implementation in authMiddleware.mjs
 * - No JWT verification, role checks, or database lookups here
 * - Acts as transparent proxy to actual middleware functions
 *
 * Performance Considerations:
 * - Zero overhead: Direct function re-export (no wrapping)
 * - Tree-shaking compatible: Named exports allow dead code elimination
 * - No runtime performance impact (compile-time linking)
 * - Alias functions are simple references (no function call overhead)
 *
 * Dependencies:
 * - authMiddleware.mjs: Source of all middleware implementations
 *
 * Testing:
 * - No unit tests needed (pure re-export)
 * - All tests in authMiddleware.test.mjs
 * - Integration tests verify both import styles work
 *
 * Future Deprecation Plan:
 * - Phase 1: Add deprecation warnings to alias functions (authenticateToken, authorizeAdmin)
 * - Phase 2: Update all route files to import from authMiddleware.mjs directly
 * - Phase 3: Mark this file as deprecated
 * - Phase 4: Remove this file entirely (breaking change - major version bump)
 *
 * Created: 2024-XX-XX (Legacy codebase)
 * Enhanced: 2025-11-14 (Level 5/5 Documentation - Blueprint-First Standard)
 */

import { 
  protect, 
  adminOnly,
  trainerOnly,
  clientOnly,
  trainerOrAdminOnly,
  ownerOrAdminOnly,
  checkTrainerClientRelationship,
  rateLimiter,
  authorize
} from './authMiddleware.mjs';

// Export authenticateToken as an alias for protect
export const authenticateToken = protect;

// Export authorizeAdmin as an alias for adminOnly
export const authorizeAdmin = adminOnly;

// Export other middleware functions
export {
  protect,
  adminOnly,
  trainerOnly,
  clientOnly,
  trainerOrAdminOnly,
  ownerOrAdminOnly,
  checkTrainerClientRelationship,
  rateLimiter,
  authorize
};

// Default export with all functions
export default {
  authenticateToken,
  authorizeAdmin,
  protect,
  adminOnly,
  trainerOnly,
  clientOnly,
  trainerOrAdminOnly,
  ownerOrAdminOnly,
  checkTrainerClientRelationship,
  rateLimiter,
  authorize
};
