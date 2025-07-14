/**
 * Migration: Create Trainer Permissions Table
 * ===========================================
 * 
 * Creates the trainer_permissions table for managing granular
 * permissions for trainer users with admin oversight and expiration support.
 * 
 * Part of the NASM Workout Tracking System - Phase 2.1: Database Foundation
 * Designed for SwanStudios Platform - Production Ready
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Create trainer_permissions table
      await queryInterface.createTable('trainer_permissions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          comment: 'Unique identifier for the trainer permission'
        },
        trainerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key reference to the trainer user'
        },
        permissionType: {
          type: Sequelize.ENUM(
            'edit_workouts',
            'view_progress', 
            'manage_clients',
            'access_nutrition',
            'modify_schedules',
            'view_analytics'
          ),
          allowNull: false,
          comment: 'Type of permission granted to the trainer'
        },
        grantedBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'Foreign key reference to the admin who granted this permission'
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Whether the permission is currently active'
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Optional expiration date for the permission'
        },
        grantedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Timestamp when the permission was granted'
        },
        revokedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when the permission was revoked (if applicable)'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Optional notes about why this permission was granted or revoked'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      }, {
        transaction,
        comment: 'Manages granular permissions for trainer users'
      });

      // Create optimized indexes for query performance
      await queryInterface.addIndex('trainer_permissions', ['trainerId'], {
        name: 'idx_trainer_permissions_trainer_id',
        transaction
      });

      await queryInterface.addIndex('trainer_permissions', ['permissionType'], {
        name: 'idx_trainer_permissions_permission_type',
        transaction
      });

      await queryInterface.addIndex('trainer_permissions', ['grantedBy'], {
        name: 'idx_trainer_permissions_granted_by',
        transaction
      });

      await queryInterface.addIndex('trainer_permissions', ['isActive'], {
        name: 'idx_trainer_permissions_is_active',
        transaction
      });

      await queryInterface.addIndex('trainer_permissions', ['expiresAt'], {
        name: 'idx_trainer_permissions_expires_at',
        transaction
      });

      // Composite index for checking active permissions efficiently
      await queryInterface.addIndex('trainer_permissions', ['trainerId', 'permissionType', 'isActive'], {
        name: 'idx_trainer_active_permissions',
        transaction
      });

      // Index for expiration monitoring
      await queryInterface.addIndex('trainer_permissions', ['isActive', 'expiresAt'], {
        name: 'idx_trainer_permissions_active_expiration',
        transaction
      });

      // Add unique constraint to prevent duplicate active permissions
      await queryInterface.addConstraint('trainer_permissions', {
        fields: ['trainerId', 'permissionType'],
        type: 'unique',
        name: 'unique_trainer_permission_active',
        where: {
          isActive: true
        },
        transaction
      });

      await transaction.commit();
      console.log('✅ Successfully created trainer_permissions table with indexes and constraints');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating trainer_permissions table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove constraints first
      try {
        await queryInterface.removeConstraint('trainer_permissions', 'unique_trainer_permission_active', { transaction });
      } catch (error) {
        console.warn('Unique constraint might not exist, continuing...');
      }

      // Remove indexes
      const indexes = [
        'idx_trainer_permissions_trainer_id',
        'idx_trainer_permissions_permission_type',
        'idx_trainer_permissions_granted_by',
        'idx_trainer_permissions_is_active',
        'idx_trainer_permissions_expires_at',
        'idx_trainer_active_permissions',
        'idx_trainer_permissions_active_expiration'
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex('trainer_permissions', indexName, { transaction });
        } catch (error) {
          console.warn(`Index ${indexName} might not exist, continuing...`);
        }
      }

      // Drop the table
      await queryInterface.dropTable('trainer_permissions', { transaction });
      
      await transaction.commit();
      console.log('✅ Successfully dropped trainer_permissions table');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping trainer_permissions table:', error);
      throw error;
    }
  }
};