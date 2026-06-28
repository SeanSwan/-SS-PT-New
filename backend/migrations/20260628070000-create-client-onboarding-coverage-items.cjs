'use strict';

const COVERAGE_STATUSES = [
  'known',
  'unknown',
  'trainer_pending',
  'client_requested',
  'not_applicable',
  'blocked',
];

/**
 * Create client_onboarding_coverage_items.
 * This is a non-gating ledger for missing onboarding data; workout logging
 * remains available when a coverage row is unknown, requested, or blocked.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    let exists = true;
    try {
      await queryInterface.describeTable('client_onboarding_coverage_items');
    } catch (err) {
      exists = false;
    }
    if (exists) return;

    await queryInterface.createTable('client_onboarding_coverage_items', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      clientId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      coverageKey: {
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      label: {
        type: Sequelize.STRING(160),
        allowNull: false,
      },
      category: {
        type: Sequelize.STRING(80),
        allowNull: false,
        defaultValue: 'general',
      },
      status: {
        type: Sequelize.ENUM(...COVERAGE_STATUSES),
        allowNull: false,
        defaultValue: 'unknown',
      },
      value: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      requestedFromClient: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      blockerReason: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      lastMarkedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      lastMarkedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
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

    await queryInterface.addIndex('client_onboarding_coverage_items', ['clientId']);
    await queryInterface.addIndex('client_onboarding_coverage_items', ['status']);
    await queryInterface.addIndex('client_onboarding_coverage_items', ['category']);
    await queryInterface.addIndex('client_onboarding_coverage_items', ['clientId', 'coverageKey'], {
      unique: true,
      name: 'idx_client_onboarding_coverage_unique',
    });
  },

  down: async (queryInterface) => {
    let exists = true;
    try {
      await queryInterface.describeTable('client_onboarding_coverage_items');
    } catch (err) {
      exists = false;
    }
    if (exists) await queryInterface.dropTable('client_onboarding_coverage_items');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_client_onboarding_coverage_items_status";');
  },
};
