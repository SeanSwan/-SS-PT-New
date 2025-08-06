/**
 * TrainerPermissions Model - NASM Permission Management System
 * ===========================================================
 * Master Prompt v43 aligned - Granular trainer permission control
 * 
 * This model provides fine-grained permission control for trainer actions
 * within the SwanStudios platform. Essential for admin oversight and
 * liability management in professional training environments.
 * 
 * Core Features:
 * ✅ Granular permission types for different trainer capabilities
 * ✅ Admin-controlled permission granting and revocation
 * ✅ Time-based permission expiration support
 * ✅ Audit trail for permission changes
 * ✅ Active/inactive status management
 * ✅ Critical vs non-critical permission classification
 * 
 * Permission Types:
 * - edit_workouts: Core NASM form logging capability
 * - view_progress: Client progress chart access
 * - manage_clients: Client information editing
 * - access_nutrition: Nutrition data viewing/editing
 * - modify_schedules: Session booking and rescheduling
 * - view_analytics: Trainer performance analytics
 * 
 * Database Integration:
 * - Links to Users table for trainer and granting admin
 * - Supports expiration-based automatic deactivation
 * - Enables middleware permission checking
 * - Provides foundation for role-based access control
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * Permission types enum for type safety and validation
 */
export const PERMISSION_TYPES = {
  EDIT_WORKOUTS: 'edit_workouts',
  VIEW_PROGRESS: 'view_progress',
  MANAGE_CLIENTS: 'manage_clients', 
  ACCESS_NUTRITION: 'access_nutrition',
  MODIFY_SCHEDULES: 'modify_schedules',
  VIEW_ANALYTICS: 'view_analytics'
};

/**
 * Critical permissions that affect client safety and session billing
 */
export const CRITICAL_PERMISSIONS = [
  PERMISSION_TYPES.EDIT_WORKOUTS,
  PERMISSION_TYPES.MODIFY_SCHEDULES
];

/**
 * TrainerPermissions Model Class
 * Manages individual permissions granted to trainers by admins
 */
class TrainerPermissions extends Model {
  /**
   * Check if permission is currently valid and active
   * @returns {boolean} True if permission is active and not expired
   */
  isValid() {
    if (!this.isActive) return false;
    if (this.expiresAt && new Date() > new Date(this.expiresAt)) {
      return false;
    }
    return true;
  }

  /**
   * Check if this is a critical permission type
   * @returns {boolean} True if permission affects safety or billing
   */
  isCritical() {
    return CRITICAL_PERMISSIONS.includes(this.permissionType);
  }

  /**
   * Get permission summary for admin dashboard
   * @returns {Object} Permission summary data
   */
  getSummary() {
    return {
      id: this.id,
      trainerId: this.trainerId,
      permissionType: this.permissionType,
      isActive: this.isActive,
      isValid: this.isValid(),
      isCritical: this.isCritical(),
      grantedAt: this.createdAt,
      expiresAt: this.expiresAt
    };
  }

  /**
   * Deactivate this permission (soft disable)
   * @param {number} deactivatedBy - ID of admin deactivating permission
   * @returns {Promise<TrainerPermissions>} Updated permission instance
   */
  async deactivate(deactivatedBy) {
    return await this.update({
      isActive: false,
      deactivatedAt: new Date(),
      deactivatedBy: deactivatedBy
    });
  }
}

TrainerPermissions.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'trainer_id', // Map camelCase to snake_case
      references: { 
        model: 'users', // Table name in snake_case
        key: 'id' 
      },
      comment: 'ID of the trainer receiving this permission'
    },
    permissionType: {
      type: DataTypes.ENUM(
        'edit_workouts',
        'view_progress', 
        'manage_clients',
        'access_nutrition',
        'modify_schedules',
        'view_analytics'
      ),
      allowNull: false,
      field: 'permission_type', // Map camelCase to snake_case
      comment: 'Type of permission being granted'
    },
    grantedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'granted_by', // Map camelCase to snake_case
      references: { 
        model: 'users', // Table name in snake_case
        key: 'id' 
      },
      comment: 'ID of the admin who granted this permission'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: 'is_active', // Map camelCase to snake_case
      comment: 'Whether this permission is currently active'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at', // Map camelCase to snake_case
      comment: 'Optional expiration date for time-limited permissions'
    },
    // Audit fields for tracking permission lifecycle
    deactivatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'deactivated_by', // Map camelCase to snake_case
      references: { 
        model: 'users',
        key: 'id' 
      },
      comment: 'ID of the admin who deactivated this permission'
    },
    deactivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deactivated_at', // Map camelCase to snake_case
      comment: 'Timestamp when permission was deactivated'
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional reason for granting or revoking permission'
    }
  },
  {
    sequelize,
    modelName: 'TrainerPermissions',
    tableName: 'trainer_permissions',
    timestamps: true, // Enables createdAt and updatedAt
    paranoid: false, // We use isActive instead of soft deletes
    indexes: [
      // Optimize for permission checking queries
      {
        name: 'idx_trainer_permissions_trainer_id',
        fields: ['trainerId']
      },
      {
        name: 'idx_trainer_permissions_type',
        fields: ['permissionType']
      },
      {
        name: 'idx_trainer_permissions_active',
        fields: ['isActive']
      },
      // Ensure no duplicate active permissions of same type for same trainer
      {
        name: 'idx_unique_active_trainer_permission',
        fields: ['trainerId', 'permissionType'],
        unique: true,
        where: {
          isActive: true
        }
      },
      // Index for expiration cleanup jobs
      {
        name: 'idx_trainer_permissions_expires_at',
        fields: ['expiresAt']
      }
    ],
    // Model-level validations
    validate: {
      // Ensure expiration date is in the future if provided
      expirationInFuture() {
        if (this.expiresAt && new Date(this.expiresAt) <= new Date()) {
          throw new Error('Expiration date must be in the future');
        }
      }
    },
    // Instance methods available on each permission record
    instanceMethods: {
      // Additional utility methods can be added here
    },
    // Class methods available on the model itself
    classMethods: {
      // Additional static methods can be added here
    }
  }
);

export default TrainerPermissions;
