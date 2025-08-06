/**
 * Migration: Create client_trainer_assignments table
 * ==================================================
 * 
 * Creates the missing client_trainer_assignments table that's required
 * for the admin dashboard client-trainer assignment functionality.
 * 
 * This table tracks the formal relationships between clients and trainers.
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('client_trainer_assignments')) {
        console.log('✅ client_trainer_assignments table already exists, skipping creation');
        return;
      }

      console.log('🔧 Creating client_trainer_assignments table...');
      
      await queryInterface.createTable('client_trainer_assignments', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
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
          field: 'client_id'
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
          field: 'trainer_id'
        },
        assignedBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          field: 'assigned_by'
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'pending'),
          defaultValue: 'active',
          allowNull: false
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        lastModifiedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          field: 'last_modified_by'
        },
        deactivatedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: 'deactivated_at'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'created_at'
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'updated_at'
        }
      });

      // Create indexes for performance
      await queryInterface.addIndex('client_trainer_assignments', ['client_id'], {
        name: 'idx_client_trainer_assignments_client_id'
      });

      await queryInterface.addIndex('client_trainer_assignments', ['trainer_id'], {
        name: 'idx_client_trainer_assignments_trainer_id'
      });

      await queryInterface.addIndex('client_trainer_assignments', ['status'], {
        name: 'idx_client_trainer_assignments_status'
      });

      // Create unique constraint to prevent duplicate active assignments
      await queryInterface.addIndex('client_trainer_assignments', ['client_id', 'trainer_id'], {
        name: 'idx_unique_active_client_trainer',
        unique: true,
        where: {
          status: 'active'
        }
      });

      console.log('✅ client_trainer_assignments table created successfully');
      
    } catch (error) {
      console.error('❌ Error creating client_trainer_assignments table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🗑️ Dropping client_trainer_assignments table...');
      await queryInterface.dropTable('client_trainer_assignments');
      console.log('✅ client_trainer_assignments table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping client_trainer_assignments table:', error);
      throw error;
    }
  }
};
