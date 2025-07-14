/**
 * Trainer Permission Middleware
 * ============================
 * 
 * Provides reusable middleware for checking trainer permissions across the system.
 * Enables fine-grained permission control for trainer access to various features.
 * 
 * Core Features:
 * - Permission checking middleware factory
 * - Integration with existing auth middleware
 * - Comprehensive error handling and logging
 * - Admin bypass functionality
 * 
 * Part of the NASM Workout Tracking System - Phase 2.2: API Layer
 * Designed for SwanStudios Platform - Production Ready
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