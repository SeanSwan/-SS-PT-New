'use strict';

/**
 * Migration: Create Immigration Tracking Tables
 * ==============================================
 * Creates three tables for the Canada Immigration admin mini-app:
 * - immigration_tasks: Checklist items organized by phase
 * - immigration_documents: Document tracking with status pipeline
 * - study_progress: Test score and certification progress tracking
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ===================== immigration_tasks =====================
    await queryInterface.createTable('immigration_tasks', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      phase: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      title: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      owner: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'both'
      },
      priority: {
        type: Sequelize.STRING(5),
        allowNull: false,
        defaultValue: 'P1'
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'not_started'
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      cost: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      resource_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('immigration_tasks', ['user_id'], {
      name: 'idx_immigration_tasks_user_id'
    });

    // ===================== immigration_documents =====================
    await queryInterface.createTable('immigration_documents', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      name: {
        type: Sequelize.STRING(300),
        allowNull: false
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'not_started'
      },
      score: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      due_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('immigration_documents', ['user_id'], {
      name: 'idx_immigration_documents_user_id'
    });

    // ===================== study_progress =====================
    await queryInterface.createTable('study_progress', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      max_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      session_date: {
        type: Sequelize.DATE,
        allowNull: false
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('study_progress', ['user_id'], {
      name: 'idx_study_progress_user_id'
    });
  },

  down: async (queryInterface, _Sequelize) => {
    await queryInterface.dropTable('study_progress');
    await queryInterface.dropTable('immigration_documents');
    await queryInterface.dropTable('immigration_tasks');
  }
};
