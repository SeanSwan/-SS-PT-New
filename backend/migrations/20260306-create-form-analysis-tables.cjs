'use strict';

/**
 * Migration: Create form_analyses and movement_profiles tables
 * Phase 2 of AI Form Analysis system
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Idempotency check
      const tables = await queryInterface.showAllTables({ transaction });

      if (!tables.includes('form_analyses')) {
        await queryInterface.createTable('form_analyses', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          trainerId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          sessionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          exerciseName: {
            type: Sequelize.STRING(100),
            allowNull: false,
          },
          mediaUrl: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          mediaType: {
            type: Sequelize.STRING(10),
            allowNull: false,
          },
          analysisStatus: {
            type: Sequelize.STRING(20),
            allowNull: false,
            defaultValue: 'pending',
          },
          overallScore: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          repCount: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          findings: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          recommendations: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          coachingFeedback: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          landmarkDataUrl: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          processingDurationMs: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          errorMessage: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          metadata: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
          },
        }, { transaction });

        await queryInterface.addIndex('form_analyses', ['userId', 'analysisStatus'], {
          name: 'idx_form_analysis_user_status',
          transaction,
        });
        await queryInterface.addIndex('form_analyses', ['userId', 'exerciseName'], {
          name: 'idx_form_analysis_user_exercise',
          transaction,
        });
        await queryInterface.addIndex('form_analyses', ['analysisStatus'], {
          name: 'idx_form_analysis_status',
          transaction,
        });
        await queryInterface.addIndex('form_analyses', ['createdAt'], {
          name: 'idx_form_analysis_created',
          transaction,
        });
      }

      if (!tables.includes('movement_profiles')) {
        await queryInterface.createTable('movement_profiles', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          mobilityScores: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          strengthBalance: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          commonCompensations: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: [],
          },
          improvementTrend: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: [],
          },
          exerciseScores: {
            type: Sequelize.JSONB,
            allowNull: true,
            defaultValue: {},
          },
          nasmPhaseRecommendation: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          totalAnalyses: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          lastAnalysisAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          lastAnalysisId: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          createdAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('NOW()'),
          },
        }, { transaction });

        await queryInterface.addIndex('movement_profiles', ['userId'], {
          name: 'idx_movement_profile_user',
          unique: true,
          transaction,
        });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('movement_profiles', { transaction });
      await queryInterface.dropTable('form_analyses', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },
};
