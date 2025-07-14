/**
 * Migration: Create Client-Trainer Assignments Table
 * =================================================
 * 
 * Creates the client_trainer_assignments table for managing formal
 * relationships between clients and trainers with admin oversight.
 * 
 * Part of the NASM Workout Tracking System - Phase 2.1: Database Foundation
 * Designed for SwanStudios Platform - Production Ready
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Create client_trainer_assignments table
      await queryInterface.createTable('client_trainer_assignments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
          comment: 'Unique identifier for the client-trainer assignment'
        },
        clientId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key reference to the client user'
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
        assignedBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'Foreign key reference to the admin who created this assignment'
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'pending'),
          allowNull: false,
          defaultValue: 'active',
          comment: 'Current status of the assignment'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Optional notes about the assignment context or requirements'
        },
        assignedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Timestamp when the assignment was created'
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
        comment: 'Manages formal client-trainer relationships with admin oversight'
      });

      // Create optimized indexes for query performance
      await queryInterface.addIndex('client_trainer_assignments', ['clientId'], {
        name: 'idx_client_trainer_assignments_client_id',
        transaction
      });

      await queryInterface.addIndex('client_trainer_assignments', ['trainerId'], {
        name: 'idx_client_trainer_assignments_trainer_id',
        transaction
      });

      await queryInterface.addIndex('client_trainer_assignments', ['status'], {
        name: 'idx_client_trainer_assignments_status',
        transaction
      });

      await queryInterface.addIndex('client_trainer_assignments', ['assignedBy'], {
        name: 'idx_client_trainer_assignments_assigned_by',
        transaction
      });

      // Composite index for checking active assignments efficiently
      await queryInterface.addIndex('client_trainer_assignments', ['clientId', 'trainerId', 'status'], {
        name: 'idx_client_trainer_active_assignments',
        transaction
      });

      // Index for date-based queries
      await queryInterface.addIndex('client_trainer_assignments', ['assignedAt'], {
        name: 'idx_client_trainer_assignments_assigned_at',
        transaction
      });

      await transaction.commit();
      console.log('✅ Successfully created client_trainer_assignments table with indexes');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating client_trainer_assignments table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes first (if they exist)
      const indexes = [
        'idx_client_trainer_assignments_client_id',
        'idx_client_trainer_assignments_trainer_id', 
        'idx_client_trainer_assignments_status',
        'idx_client_trainer_assignments_assigned_by',
        'idx_client_trainer_active_assignments',
        'idx_client_trainer_assignments_assigned_at'
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex('client_trainer_assignments', indexName, { transaction });
        } catch (error) {
          console.warn(`Index ${indexName} might not exist, continuing...`);
        }
      }

      // Drop the table
      await queryInterface.dropTable('client_trainer_assignments', { transaction });
      
      await transaction.commit();
      console.log('✅ Successfully dropped client_trainer_assignments table');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping client_trainer_assignments table:', error);
      throw error;
    }
  }
};