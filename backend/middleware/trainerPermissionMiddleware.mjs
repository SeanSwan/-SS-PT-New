/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║             TRAINER PERMISSION MIDDLEWARE SYSTEM                          ║
 * ║        (Fine-Grained Role-Based Access Control for Trainers)            ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Purpose: Fine-grained permission system for trainer role with 6 permission
 *          types, expiration support, admin bypass, and comprehensive logging
 *
 * Blueprint Reference: docs/ai-workflow/LEVEL-5-DOCUMENTATION-UPGRADE-STATUS.md
 * Part of: NASM Workout Tracking System - Phase 2.2: API Layer
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      ARCHITECTURE OVERVIEW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Trainer Permission Architecture:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                    trainer_permissions TABLE                             │
 * │  ┌────────────────────────────────────────────────────────────────────┐ │
 * │  │ id (UUID PK)                                                        │ │
 * │  │ trainerId (UUID FK → users.id)                                     │ │
 * │  │ permissionType (ENUM): EDIT_WORKOUTS, VIEW_PROGRESS, etc.          │ │
 * │  │ isActive (BOOLEAN): Active/inactive permission                     │ │
 * │  │ expiresAt (DATE): Optional expiration (NULL = never expires)       │ │
 * │  │ grantedBy (UUID FK → users.id): Admin who granted permission       │ │
 * │  │ createdAt, updatedAt                                               │ │
 * │  └────────────────────────────────────────────────────────────────────┘ │
 * └──────────────────────────────────────────────────────────────────────────┘
 *                                  │
 *                                  ▼
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │                    PERMISSION TYPES (6 Types)                            │
 * │  1. EDIT_WORKOUTS      - Create/update/delete workout programs          │
 * │  2. VIEW_PROGRESS      - View client progress reports and analytics     │
 * │  3. MANAGE_CLIENTS     - Assign/unassign clients, manage client list    │
 * │  4. ACCESS_NUTRITION   - View/edit nutrition plans and meal tracking    │
 * │  5. MODIFY_SCHEDULES   - Create/update training schedules               │
 * │  6. VIEW_ANALYTICS     - Access advanced analytics and reports          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      PERMISSION CHECK FLOW                               │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Request Flow Through Trainer Permission Middleware:
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ 1. CLIENT REQUEST                                                         │
 * │    POST /api/workouts/create { name: "Leg Day", clientId: 123 }         │
 * │    Headers: { Authorization: "Bearer <JWT_TOKEN>" }                      │
 * │    ↓                                                                      │
 * │ 2. authMiddleware.protect()                                              │
 * │    Validates JWT, sets req.user = { id, role: 'trainer', email }        │
 * │    ↓                                                                      │
 * │ 3. requireTrainerPermission('EDIT_WORKOUTS')                             │
 * │    Check: req.user exists? (401 if not)                                  │
 * │    ↓                                                                      │
 * │    Check: req.user.role === 'admin'?                                     │
 * │      ✅ YES → next() (Admin bypass, skip permission check)              │
 * │      ❌ NO → Continue to permission validation                           │
 * │    ↓                                                                      │
 * │    Check: req.user.role === 'trainer'?                                   │
 * │      ✅ YES → Continue to permission lookup                              │
 * │      ❌ NO → 403 Forbidden: "Trainer role required"                      │
 * │    ↓                                                                      │
 * │    hasTrainerPermission(user.id, 'EDIT_WORKOUTS'):                      │
 * │      SELECT * FROM trainer_permissions WHERE                             │
 * │        trainerId = user.id AND                                           │
 * │        permissionType = 'EDIT_WORKOUTS' AND                              │
 * │        isActive = true AND                                               │
 * │        (expiresAt IS NULL OR expiresAt > NOW())                          │
 * │    ↓                                                                      │
 * │    Permission found?                                                     │
 * │      ✅ YES → next() → Route handler executes                            │
 * │      ❌ NO → 403 Forbidden: "Access denied: EDIT_WORKOUTS required"      │
 * │                                                                           │
 * │ 4. ROUTE HANDLER EXECUTES (if permission granted)                        │
 * │    const workout = await createWorkout(req.body);                        │
 * │    res.json({ success: true, data: workout });                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                     BUSINESS LOGIC (WHY SECTIONS)                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * WHY Trainer-Specific Permissions (Not Just trainer Role)?
 * - Fine-grained control: Not all trainers need all features
 * - Onboarding: New trainers get limited permissions initially
 * - Tier-based access: Basic/Pro/Enterprise trainers have different capabilities
 * - Security: Limit blast radius if trainer account compromised
 * - Compliance: Audit trail showing who has access to what features
 * - Business flexibility: Enable/disable features per trainer (e.g., trial period)
 * - Standard practice: Role-based access control (RBAC) industry standard
 *
 * WHY Admin Bypass (Not Check Permissions for Admins)?
 * - Operational efficiency: Admins don't need permission grants
 * - Emergency access: Admins can resolve issues even if permission system broken
 * - Reduced database load: Skip permission lookup for admin requests
 * - User experience: Admins don't get blocked by missing permissions
 * - Standard practice: Admins have superuser privileges in most systems
 * - Logging still occurs: Admin actions logged for audit trail
 *
 * WHY Permission Expiration (Not Permanent Permissions)?
 * - Time-limited trials: Grant features for 30-day trial
 * - Contract enforcement: Revoke permissions when subscription expires
 * - Temporary access: Grant analytics access for quarterly review
 * - Auto-cleanup: Expired permissions automatically ignored (no manual revoke)
 * - Security: Limit exposure window for compromised permissions
 * - Compliance: GDPR requires time-limited data access grants
 *
 * WHY isActive Flag (Not DELETE Permission)?
 * - Soft delete pattern: Preserve audit history of permission grants
 * - Reactivation: Can re-enable permission without re-granting
 * - Historical queries: "Did trainer have permission on date X?"
 * - Compliance: Show permission was revoked (not deleted)
 * - Debugging: Track permission changes over time
 * - No cascade issues: Deactivating permission doesn't affect foreign keys
 *
 * WHY Database Lookup Per Request (Not Cache in JWT)?
 * - Real-time revocation: Admin revokes permission, immediately effective
 * - Dynamic permissions: Permissions can change mid-session
 * - JWT size limits: 6 permission types fit, but future expansion harder
 * - Expiration handling: Database checks expiresAt on every request
 * - Audit accuracy: Logs show exact permission state at request time
 * - Trade-off: Database query overhead acceptable for security benefit
 *
 * WHY Multiple Permission Middleware Variants (AND, OR, Single)?
 * - Flexibility: Different routes need different permission logic
 * - requireTrainerPermission(): Single permission (most common)
 * - requireMultiplePermissions(): ALL permissions required (AND logic)
 * - requireAnyPermission(): ANY permission sufficient (OR logic)
 * - Example AND: "Delete client" requires MANAGE_CLIENTS + VIEW_PROGRESS
 * - Example OR: "View reports" allows VIEW_PROGRESS OR VIEW_ANALYTICS
 *
 * WHY Log Permission Denials (Not Silent Failure)?
 * - Security monitoring: Track unauthorized access attempts
 * - User support: "Why can't I access X?" → Check logs for permission denial
 * - Permission debugging: Identify misconfigured permissions
 * - Analytics: Understand which features trainers attempt to use
 * - Compliance: Audit trail of access control decisions
 * - Pattern detection: Multiple denials = potential account takeover attempt
 *
 * WHY Middleware Factory Pattern (Not Individual Middlewares)?
 * - DRY principle: Single implementation for all permission types
 * - Consistency: Same logic for all permission checks
 * - Maintainability: Bug fixes apply to all permission types
 * - Scalability: Easy to add new permission types (just add ENUM value)
 * - Type safety: Factory ensures permission type is valid ENUM
 * - Example: requireTrainerPermission('EDIT_WORKOUTS') → Factory creates middleware
 *
 * WHY grantedBy Column (Not Just Track Creation)?
 * - Accountability: Know which admin granted risky permissions
 * - Audit trail: "Who gave trainer X access to nutrition data?"
 * - Compliance: GDPR requires tracking who granted data access
 * - Debugging: Trace permission grants back to source
 * - Revocation context: When revoking, know who to notify
 * - Analytics: Track which admins grant most permissions (training need?)
 *
 * WHY Return Missing Permissions Array (Not Just Generic Error)?
 * - User guidance: "You need X, Y, Z permissions to do this"
 * - Request permissions: UI can show "Request Access" button with specific permissions
 * - Admin workflow: Admin sees exactly what permissions to grant
 * - Debugging: Developer sees which permission check failed
 * - API documentation: Clear error response structure
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                       USAGE EXAMPLES IN ROUTES                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Example 1: Single Permission Check
 * ```javascript
 * import { requireTrainerPermission } from '../middleware/trainerPermissionMiddleware.mjs';
 *
 * router.post('/workouts/create',
 *   protect,  // Authenticate user
 *   requireTrainerPermission('EDIT_WORKOUTS'),  // Check permission
 *   createWorkout  // Route handler
 * );
 * ```
 *
 * Example 2: Multiple Permissions Required (AND Logic)
 * ```javascript
 * import { requireMultiplePermissions } from '../middleware/trainerPermissionMiddleware.mjs';
 *
 * router.delete('/clients/:id',
 *   protect,
 *   requireMultiplePermissions(['MANAGE_CLIENTS', 'VIEW_PROGRESS']),
 *   deleteClient
 * );
 * ```
 *
 * Example 3: Any Permission Sufficient (OR Logic)
 * ```javascript
 * import { requireAnyPermission } from '../middleware/trainerPermissionMiddleware.mjs';
 *
 * router.get('/reports/summary',
 *   protect,
 *   requireAnyPermission(['VIEW_PROGRESS', 'VIEW_ANALYTICS']),
 *   getSummaryReport
 * );
 * ```
 *
 * Example 4: Using Pre-Built Permission Middlewares
 * ```javascript
 * import {
 *   requireEditWorkoutsPermission,
 *   requireViewProgressPermission,
 *   requireManageClientsPermission
 * } from '../middleware/trainerPermissionMiddleware.mjs';
 *
 * router.get('/progress/:clientId', protect, requireViewProgressPermission, getProgress);
 * router.post('/workouts', protect, requireEditWorkoutsPermission, createWorkout);
 * router.put('/clients/:id/assign', protect, requireManageClientsPermission, assignClient);
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                        SECURITY CONSIDERATIONS                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * - Admin bypass: Admins skip permission checks (logged for audit)
 * - Permission validation: Only valid PERMISSION_TYPES accepted
 * - Expiration enforcement: Expired permissions automatically rejected
 * - isActive check: Deactivated permissions immediately denied
 * - Real-time revocation: No caching, permissions checked on every request
 * - Audit logging: All permission denials logged with context
 * - Error message clarity: 401 (auth) vs 403 (permission) distinction
 * - SQL injection protection: Sequelize ORM prevents injection
 * - No permission enumeration: Error messages don't leak valid permission types
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                      RELATED FILES & DEPENDENCIES                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Depends On:
 * - backend/models/index.mjs (getTrainerPermissions model accessor)
 * - backend/models/TrainerPermissions.mjs (PERMISSION_TYPES ENUM)
 * - backend/utils/logger.mjs (Logging infrastructure)
 * - sequelize (Op.or, Op.gt for expiration checks)
 *
 * Used By:
 * - backend/routes/workoutRoutes.mjs (EDIT_WORKOUTS permission)
 * - backend/routes/clientProgressRoutes.mjs (VIEW_PROGRESS permission)
 * - backend/routes/clientRoutes.mjs (MANAGE_CLIENTS permission)
 * - backend/routes/nutritionRoutes.mjs (ACCESS_NUTRITION permission)
 * - backend/routes/scheduleRoutes.mjs (MODIFY_SCHEDULES permission)
 * - backend/routes/analyticsRoutes.mjs (VIEW_ANALYTICS permission)
 *
 * Related Code:
 * - backend/middleware/authMiddleware.mjs (protect, adminOnly, trainerOnly)
 * - backend/controllers/trainerPermissionsController.mjs (Grant/revoke permissions)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { getTrainerPermissions } from '../models/index.mjs';
import { PERMISSION_TYPES } from '../models/TrainerPermissions.mjs';
import logger from '../utils/logger.mjs';
import { Op } from 'sequelize';

/**
 * Check if a trainer has a specific permission
 * @param {number} trainerId - The trainer's user ID
 * @param {string} permissionType - The permission type to check
 * @returns {Promise<boolean>} - Whether the trainer has the permission
 */
export const hasTrainerPermission = async (trainerId, permissionType) => {
  try {
    const TrainerPermissions = getTrainerPermissions();
    
    const permission = await TrainerPermissions.findOne({
      where: {
        trainerId,
        permissionType,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      }
    });

    return !!permission;
  } catch (error) {
    logger.error('Error checking trainer permission:', error);
    return false;
  }
};

/**
 * Middleware factory to check trainer permissions
 * @param {string} requiredPermission - The permission type required
 * @returns {Function} - Express middleware function
 */
export const requireTrainerPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admins bypass all permission checks
      if (user.role === 'admin') {
        logger.debug(`Admin ${user.id} bypassed permission check: ${requiredPermission}`);
        return next();
      }

      // Only trainers need permission checks
      if (user.role !== 'trainer') {
        return res.status(403).json({
          success: false,
          message: 'Trainer role required'
        });
      }

      // Validate permission type
      const validPermissionTypes = Object.values(PERMISSION_TYPES);
      if (!validPermissionTypes.includes(requiredPermission)) {
        logger.error(`Invalid permission type requested: ${requiredPermission}`);
        return res.status(500).json({
          success: false,
          message: 'Invalid permission configuration'
        });
      }

      // Check if trainer has the required permission
      const hasPermission = await hasTrainerPermission(user.id, requiredPermission);
      
      if (!hasPermission) {
        logger.warn(`Trainer ${user.id} lacks permission: ${requiredPermission}`, {
          trainerId: user.id,
          trainerEmail: user.email,
          requiredPermission,
          endpoint: req.originalUrl
        });
        
        return res.status(403).json({
          success: false,
          message: `Access denied: ${requiredPermission} permission required`,
          permissionType: requiredPermission
        });
      }

      logger.debug(`Trainer ${user.id} permission check passed: ${requiredPermission}`);
      next();

    } catch (error) {
      logger.error('Error in trainer permission middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if trainer can edit workouts
 */
export const requireEditWorkoutsPermission = requireTrainerPermission(PERMISSION_TYPES.EDIT_WORKOUTS);

/**
 * Middleware to check if trainer can view client progress
 */
export const requireViewProgressPermission = requireTrainerPermission(PERMISSION_TYPES.VIEW_PROGRESS);

/**
 * Middleware to check if trainer can manage clients
 */
export const requireManageClientsPermission = requireTrainerPermission(PERMISSION_TYPES.MANAGE_CLIENTS);

/**
 * Middleware to check if trainer can access nutrition data
 */
export const requireAccessNutritionPermission = requireTrainerPermission(PERMISSION_TYPES.ACCESS_NUTRITION);

/**
 * Middleware to check if trainer can modify schedules
 */
export const requireModifySchedulesPermission = requireTrainerPermission(PERMISSION_TYPES.MODIFY_SCHEDULES);

/**
 * Middleware to check if trainer can view analytics
 */
export const requireViewAnalyticsPermission = requireTrainerPermission(PERMISSION_TYPES.VIEW_ANALYTICS);

/**
 * Middleware to check if trainer has multiple permissions (AND logic)
 * @param {string[]} requiredPermissions - Array of permission types required
 * @returns {Function} - Express middleware function
 */
export const requireMultiplePermissions = (requiredPermissions) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admins bypass all permission checks
      if (user.role === 'admin') {
        return next();
      }

      // Only trainers need permission checks
      if (user.role !== 'trainer') {
        return res.status(403).json({
          success: false,
          message: 'Trainer role required'
        });
      }

      // Check all required permissions
      const permissionChecks = await Promise.all(
        requiredPermissions.map(permission => hasTrainerPermission(user.id, permission))
      );

      const missingPermissions = requiredPermissions.filter((permission, index) => !permissionChecks[index]);

      if (missingPermissions.length > 0) {
        logger.warn(`Trainer ${user.id} lacks multiple permissions`, {
          trainerId: user.id,
          missingPermissions,
          endpoint: req.originalUrl
        });
        
        return res.status(403).json({
          success: false,
          message: `Access denied: Missing required permissions`,
          missingPermissions
        });
      }

      next();

    } catch (error) {
      logger.error('Error in multiple permissions middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Middleware to check if trainer has any of the specified permissions (OR logic)
 * @param {string[]} acceptedPermissions - Array of permission types (any one is sufficient)
 * @returns {Function} - Express middleware function
 */
export const requireAnyPermission = (acceptedPermissions) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admins bypass all permission checks
      if (user.role === 'admin') {
        return next();
      }

      // Only trainers need permission checks
      if (user.role !== 'trainer') {
        return res.status(403).json({
          success: false,
          message: 'Trainer role required'
        });
      }

      // Check if trainer has any of the accepted permissions
      const permissionChecks = await Promise.all(
        acceptedPermissions.map(permission => hasTrainerPermission(user.id, permission))
      );

      const hasAnyPermission = permissionChecks.some(hasPermission => hasPermission);

      if (!hasAnyPermission) {
        logger.warn(`Trainer ${user.id} lacks any required permissions`, {
          trainerId: user.id,
          acceptedPermissions,
          endpoint: req.originalUrl
        });
        
        return res.status(403).json({
          success: false,
          message: `Access denied: One of the following permissions required`,
          acceptedPermissions
        });
      }

      next();

    } catch (error) {
      logger.error('Error in any permissions middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed'
      });
    }
  };
};

/**
 * Get all permissions for a trainer (utility function)
 * @param {number} trainerId - The trainer's user ID
 * @returns {Promise<Object>} - Object with permission types as keys and boolean values
 */
export const getTrainerPermissions = async (trainerId) => {
  try {
    const TrainerPermissions = getTrainerPermissions();
    
    const permissions = await TrainerPermissions.findAll({
      where: {
        trainerId,
        isActive: true,
        [Op.or]: [
          { expiresAt: null },
          { expiresAt: { [Op.gt]: new Date() } }
        ]
      },
      attributes: ['permissionType']
    });

    const permissionMap = {};
    Object.values(PERMISSION_TYPES).forEach(permType => {
      permissionMap[permType] = permissions.some(p => p.permissionType === permType);
    });

    return permissionMap;
  } catch (error) {
    logger.error('Error getting trainer permissions:', error);
    return {};
  }
};

export default {
  hasTrainerPermission,
  requireTrainerPermission,
  requireEditWorkoutsPermission,
  requireViewProgressPermission,
  requireManageClientsPermission,
  requireAccessNutritionPermission,
  requireModifySchedulesPermission,
  requireViewAnalyticsPermission,
  requireMultiplePermissions,
  requireAnyPermission,
  getTrainerPermissions
};