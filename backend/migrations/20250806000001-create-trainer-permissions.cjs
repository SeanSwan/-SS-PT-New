/**
 * Migration: Create trainer_permissions table
 * ===========================================
 * 
 * Creates the trainer_permissions table for managing trainer access rights
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('trainer_permissions')) {
        console.log('✅ trainer_permissions table already exists, skipping creation');
        return;
      }

      console.log('🔧 Creating trainer_permissions table...');
      
      await queryInterface.createTable('trainer_permissions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
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
        permissions: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: {}
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          allowNull: false,
          field: 'is_active'
        },
        grantor: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
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

      // Create indexes
      await queryInterface.addIndex('trainer_permissions', ['trainer_id'], {
        name: 'idx_trainer_permissions_trainer_id'
      });

      await queryInterface.addIndex('trainer_permissions', ['is_active'], {
        name: 'idx_trainer_permissions_is_active'
      });

      console.log('✅ trainer_permissions table created successfully');
      
    } catch (error) {
      console.error('❌ Error creating trainer_permissions table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🗑️ Dropping trainer_permissions table...');
      await queryInterface.dropTable('trainer_permissions');
      console.log('✅ trainer_permissions table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping trainer_permissions table:', error);
      throw error;
    }
  }
};
