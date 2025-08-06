/**
 * Migration: Create daily_workout_forms table
 * ============================================
 * 
 * Creates the daily_workout_forms table for NASM workout tracking
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if table already exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('daily_workout_forms')) {
        console.log('✅ daily_workout_forms table already exists, skipping creation');
        return;
      }

      console.log('🔧 Creating daily_workout_forms table...');
      
      await queryInterface.createTable('daily_workout_forms', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          field: 'user_id'
        },
        trainerId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          field: 'trainer_id'
        },
        workoutDate: {
          type: Sequelize.DATE,
          allowNull: false,
          field: 'workout_date'
        },
        formData: {
          type: Sequelize.JSON,
          allowNull: false,
          field: 'form_data'
        },
        status: {
          type: Sequelize.ENUM('draft', 'submitted', 'reviewed'),
          defaultValue: 'draft',
          allowNull: false
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        trainerNotes: {
          type: Sequelize.TEXT,
          allowNull: true,
          field: 'trainer_notes'
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
      await queryInterface.addIndex('daily_workout_forms', ['user_id'], {
        name: 'idx_daily_workout_forms_user_id'
      });

      await queryInterface.addIndex('daily_workout_forms', ['trainer_id'], {
        name: 'idx_daily_workout_forms_trainer_id'
      });

      await queryInterface.addIndex('daily_workout_forms', ['workout_date'], {
        name: 'idx_daily_workout_forms_workout_date'
      });

      await queryInterface.addIndex('daily_workout_forms', ['status'], {
        name: 'idx_daily_workout_forms_status'
      });

      console.log('✅ daily_workout_forms table created successfully');
      
    } catch (error) {
      console.error('❌ Error creating daily_workout_forms table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      console.log('🗑️ Dropping daily_workout_forms table...');
      await queryInterface.dropTable('daily_workout_forms');
      console.log('✅ daily_workout_forms table dropped successfully');
    } catch (error) {
      console.error('❌ Error dropping daily_workout_forms table:', error);
      throw error;
    }
  }
};
