/**
 * ClientTrainerAssignment Model - NASM Workout Tracking System
 * ============================================================
 * Master Prompt v43 aligned - Client-Trainer relationship management
 * 
 * This model represents the formal assignment relationship between clients
 * and trainers, controlled by admin users. Essential for NASM workflow
 * where trainers can only work with their assigned clients.
 * 
 * Core Features:
 * ✅ Admin-controlled assignment system
 * ✅ Status tracking (active, inactive, pending)
 * ✅ Assignment audit trail
 * ✅ Note-taking capability for assignment context
 * ✅ Multiple assignment prevention (business rule enforcement)
 * 
 * Database Integration:
 * - Links to Users table for client, trainer, and assigning admin
 * - Supports drag-and-drop admin interface
 * - Enables trainer permission validation
 * - Provides foundation for NASM workflow restrictions
 */

import { DataTypes, Model } from 'sequelize';
import sequelize from '../database.mjs';

/**
 * ClientTrainerAssignment Model Class
 * Manages formal relationships between clients and trainers
 */
class ClientTrainerAssignment extends Model {
  /**
   * Check if assignment is currently active
   * @returns {boolean} True if assignment is active and not expired
   */
  isActive() {
    return this.status === 'active';
  }

  /**
   * Get assignment summary for admin dashboard
   * @returns {Object} Assignment summary data
   */
  getSummary() {
    return {
      id: this.id,
      clientId: this.clientId,
      trainerId: this.trainerId,
      status: this.status,
      assignedAt: this.createdAt,
      notes: this.notes
    };
  }
}

ClientTrainerAssignment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'client_id', // Map camelCase to snake_case
      references: { 
        model: 'users', // Table name in snake_case
        key: 'id' 
      },
      comment: 'ID of the client being assigned'
    },
    trainerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'trainer_id', // Map camelCase to snake_case
      references: { 
        model: 'users', // Table name in snake_case
        key: 'id' 
      },
      comment: 'ID of the trainer receiving the assignment'
    },
    assignedBy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'assigned_by', // Map camelCase to snake_case
      references: { 
        model: 'users', // Table name in snake_case
        key: 'id' 
      },
      comment: 'ID of the admin who created this assignment'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending'),
      defaultValue: 'active',
      allowNull: false,
      comment: 'Current status of the assignment relationship'
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Optional notes about the assignment context or special instructions'
    },
    // Audit fields for tracking changes
    lastModifiedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'last_modified_by', // Map camelCase to snake_case
      references: { 
        model: 'users',
        key: 'id' 
      },
      comment: 'ID of the last admin to modify this assignment'
    },
    deactivatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deactivated_at', // Map camelCase to snake_case
      comment: 'Timestamp when assignment was deactivated (if applicable)'
    }
  },
  {
    sequelize,
    modelName: 'ClientTrainerAssignment',
    tableName: 'client_trainer_assignments',
    timestamps: true, // Enables createdAt and updatedAt
    paranoid: false, // We use status instead of soft deletes for this model
    indexes: [
      // Optimize for common queries - using DB column names (snake_case)
      {
        name: 'idx_client_trainer_assignments_client_id',
        fields: ['client_id']
      },
      {
        name: 'idx_client_trainer_assignments_trainer_id',
        fields: ['trainer_id']
      },
      {
        name: 'idx_client_trainer_assignments_status',
        fields: ['status']
      },
      // Ensure no duplicate active assignments - using DB column names
      {
        name: 'idx_unique_active_client_trainer',
        fields: ['client_id', 'trainer_id'],
        unique: true,
        where: {
          status: 'active'
        }
      }
    ],
    // Model-level validations
    validate: {
      // Ensure client and trainer are different users
      clientTrainerDifferent() {
        // Normalize to integers to avoid type coercion issues
        const clientIdNum = Number(this.clientId);
        const trainerIdNum = Number(this.trainerId);

        // Only validate if both are valid numbers
        if (Number.isFinite(clientIdNum) && Number.isFinite(trainerIdNum)) {
          if (clientIdNum === trainerIdNum) {
            throw new Error('Client and trainer must be different users');
          }
        }
      }
    }
  }
);

export default ClientTrainerAssignment;
