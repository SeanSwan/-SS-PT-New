/**
 * Migration: Create Daily Workout Forms Table
 * ===========================================
 * 
 * Creates the daily_workout_forms table for storing comprehensive
 * NASM workout form data with MCP integration and gamification tracking.
 * 
 * Part of the NASM Workout Tracking System - Phase 2.1: Database Foundation
 * Designed for SwanStudios Platform - Production Ready
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Create daily_workout_forms table
      await queryInterface.createTable('daily_workout_forms', {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false,
          comment: 'Unique identifier for the daily workout form'
        },
        sessionId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'workout_sessions',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Optional reference to the associated workout session'
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
          comment: 'Foreign key reference to the client who performed the workout'
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
          comment: 'Foreign key reference to the trainer who logged the workout'
        },
        date: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_DATE'),
          comment: 'Date when the workout was performed'
        },
        sessionDeducted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether a session was deducted from client available sessions'
        },
        formData: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Complete NASM form data including exercises, sets, ratings, and notes'
        },
        totalPointsEarned: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Total gamification points earned from this workout'
        },
        mcpProcessed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether this form has been processed by MCP servers'
        },
        submittedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Timestamp when the form was originally submitted'
        },
        mcpProcessedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when MCP processing was completed'
        },
        processingErrors: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Any errors that occurred during MCP processing'
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
        comment: 'Stores comprehensive NASM workout form data with MCP integration'
      });

      // Create optimized indexes for query performance
      await queryInterface.addIndex('daily_workout_forms', ['clientId'], {
        name: 'idx_daily_workout_forms_client_id',
        transaction
      });

      await queryInterface.addIndex('daily_workout_forms', ['trainerId'], {
        name: 'idx_daily_workout_forms_trainer_id',
        transaction
      });

      await queryInterface.addIndex('daily_workout_forms', ['date'], {
        name: 'idx_daily_workout_forms_date',
        transaction
      });

      await queryInterface.addIndex('daily_workout_forms', ['sessionId'], {
        name: 'idx_daily_workout_forms_session_id',
        transaction
      });

      await queryInterface.addIndex('daily_workout_forms', ['mcpProcessed'], {
        name: 'idx_daily_workout_forms_mcp_processed',
        transaction
      });

      await queryInterface.addIndex('daily_workout_forms', ['submittedAt'], {
        name: 'idx_daily_workout_forms_submitted_at',
        transaction
      });

      // Composite indexes for common query patterns
      await queryInterface.addIndex('daily_workout_forms', ['clientId', 'date'], {
        name: 'idx_daily_workout_forms_client_date',
        transaction
      });

      await queryInterface.addIndex('daily_workout_forms', ['trainerId', 'date'], {
        name: 'idx_daily_workout_forms_trainer_date',
        transaction
      });

      // Index for MCP processing queue
      await queryInterface.addIndex('daily_workout_forms', ['mcpProcessed', 'submittedAt'], {
        name: 'idx_daily_workout_forms_mcp_queue',
        transaction
      });

      // Index for date range queries
      await queryInterface.addIndex('daily_workout_forms', ['clientId', 'submittedAt'], {
        name: 'idx_daily_workout_forms_client_timeline',
        transaction
      });

      // GIN index for JSONB form data queries (PostgreSQL specific)
      await queryInterface.addIndex('daily_workout_forms', ['formData'], {
        name: 'idx_daily_workout_forms_form_data_gin',
        using: 'gin',
        transaction
      });

      await transaction.commit();
      console.log('✅ Successfully created daily_workout_forms table with optimized indexes');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating daily_workout_forms table:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Remove indexes first
      const indexes = [
        'idx_daily_workout_forms_client_id',
        'idx_daily_workout_forms_trainer_id',
        'idx_daily_workout_forms_date',
        'idx_daily_workout_forms_session_id',
        'idx_daily_workout_forms_mcp_processed',
        'idx_daily_workout_forms_submitted_at',
        'idx_daily_workout_forms_client_date',
        'idx_daily_workout_forms_trainer_date',
        'idx_daily_workout_forms_mcp_queue',
        'idx_daily_workout_forms_client_timeline',
        'idx_daily_workout_forms_form_data_gin'
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex('daily_workout_forms', indexName, { transaction });
        } catch (error) {
          console.warn(`Index ${indexName} might not exist, continuing...`);
        }
      }

      // Drop the table
      await queryInterface.dropTable('daily_workout_forms', { transaction });
      
      await transaction.commit();
      console.log('✅ Successfully dropped daily_workout_forms table');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping daily_workout_forms table:', error);
      throw error;
    }
  }
};