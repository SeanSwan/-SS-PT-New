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
      grantedAt: this.grantedAt || this.createdAt,
      expiresAt: this.expiresAt
    };
  }

  /**
   * Deactivate this permission (soft disable). The table has no revoked-by column, so the
   * revoking admin is preserved in the notes audit text alongside revokedAt.
   * @param {number} revokedBy - ID of admin revoking the permission
   * @returns {Promise<TrainerPermissions>} Updated permission instance
   */
  async deactivate(revokedBy) {
    return await this.update({
      isActive: false,
      revokedAt: new Date(),
      notes: this.notes
        ? `${this.notes} (revoked by admin ${revokedBy})`
        : `Revoked by admin ${revokedBy}`
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
    // SCHEMA TRUTH (verified against information_schema 2026-07-29, rule 58): the real
    // trainer_permissions table uses camelCase columns — trainerId, permissionType, grantedBy,
    // isActive, expiresAt, grantedAt, revokedAt, notes. The previous snake_case `field:` mappings
    // (trainer_id, permission_type, …) targeted columns that DO NOT EXIST, so every query through
    // this model threw "column trainer_id does not exist" — this was CLAUDE.md rule 58's own
    // worked example, still live. The model also declared deactivatedBy/deactivatedAt/reason,
    // which have no columns; the table's audit columns are revokedAt and notes.
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users', // Canonical user table — FKs must reference "Users", not "users"
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
      comment: 'Type of permission being granted'
    },
    grantedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      comment: 'ID of the admin who granted this permission'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      comment: 'Whether this permission is currently active'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Optional expiration date for time-limited permissions'
    },
    grantedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'When the permission was granted (DB default now())'
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Timestamp when permission was revoked (null while active)'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Free-text audit note: grant reason, revoke reason, revoking admin'
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
