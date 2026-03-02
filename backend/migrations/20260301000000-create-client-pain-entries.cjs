'use strict';

/**
 * Migration: Create client_pain_entries table
 * ============================================
 * Stores pain/injury reports per client for NASM CES + Squat University
 * protocol integration with AI workout generation.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('client_pain_entries', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      createdById: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      bodyRegion: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      side: {
        type: Sequelize.ENUM('left', 'right', 'center', 'bilateral'),
        allowNull: false,
        defaultValue: 'center',
      },
      painLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      painType: {
        type: Sequelize.ENUM('sharp', 'dull', 'aching', 'burning', 'tingling', 'numbness', 'stiffness', 'throbbing'),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      onsetDate: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      aggravatingMovements: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      relievingFactors: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      trainerNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      aiNotes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      posturalSyndrome: {
        type: Sequelize.ENUM('upper_crossed', 'lower_crossed', 'none'),
        allowNull: false,
        defaultValue: 'none',
      },
      assessmentFindings: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Indexes
    await queryInterface.addIndex('client_pain_entries', ['userId', 'isActive'], {
      name: 'idx_pain_user_active',
    });
    await queryInterface.addIndex('client_pain_entries', ['bodyRegion'], {
      name: 'idx_pain_body_region',
    });

    // CHECK constraint for painLevel range
    await queryInterface.sequelize.query(
      'ALTER TABLE client_pain_entries ADD CONSTRAINT chk_pain_level_range CHECK ("painLevel" >= 1 AND "painLevel" <= 10)'
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('client_pain_entries');
  },
};
