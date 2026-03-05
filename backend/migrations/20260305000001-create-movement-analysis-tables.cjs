'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── Create movement_analyses table ──────────────────────────────
    await queryInterface.createTable('movement_analyses', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      // Identity
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      fullName: {
        type: Sequelize.STRING(200),
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      phone: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      dateOfBirth: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // Status & metadata
      status: {
        type: Sequelize.ENUM('draft', 'completed', 'linked', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
      source: {
        type: Sequelize.ENUM('orientation', 'admin_dashboard', 'in_session'),
        allowNull: false,
        defaultValue: 'admin_dashboard',
      },
      conductedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      assessmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },

      // Step 2: PAR-Q+
      parqScreening: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      medicalClearanceRequired: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      medicalClearanceDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      medicalClearanceProvider: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      // Step 3: Postural Assessment
      posturalAssessment: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      // Step 4: NASM OHSA
      overheadSquatAssessment: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      nasmAssessmentScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },

      // Step 5: Squat University
      squatUniversityAssessment: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      // Step 6: Movement Quality
      movementQualityAssessments: {
        type: Sequelize.JSONB,
        allowNull: true,
      },

      // Step 7: Summary
      correctiveExerciseStrategy: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      optPhaseRecommendation: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      overallMovementQualityScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      trainerNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Indexes
    await queryInterface.addIndex('movement_analyses', ['userId'], { name: 'movement_analyses_userId' });
    await queryInterface.addIndex('movement_analyses', ['email'], { name: 'movement_analyses_email' });
    await queryInterface.addIndex('movement_analyses', ['phone'], { name: 'movement_analyses_phone' });
    await queryInterface.addIndex('movement_analyses', ['status'], { name: 'movement_analyses_status' });
    await queryInterface.addIndex('movement_analyses', ['conductedBy'], { name: 'movement_analyses_conductedBy' });
    await queryInterface.addIndex('movement_analyses', ['assessmentDate'], { name: 'movement_analyses_assessmentDate' });

    // ── Create pending_movement_analysis_matches table ──────────────
    await queryInterface.createTable('pending_movement_analysis_matches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      movementAnalysisId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'movement_analyses', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      candidateUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      confidenceScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      matchMethod: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('pending_review', 'auto_linked', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending_review',
      },
      reviewedByUserId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      reviewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    await queryInterface.addIndex('pending_movement_analysis_matches', ['movementAnalysisId'], { name: 'pma_matches_movementAnalysisId' });
    await queryInterface.addIndex('pending_movement_analysis_matches', ['candidateUserId'], { name: 'pma_matches_candidateUserId' });
    await queryInterface.addIndex('pending_movement_analysis_matches', ['status'], { name: 'pma_matches_status' });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('pending_movement_analysis_matches');
    await queryInterface.dropTable('movement_analyses');
  },
};
