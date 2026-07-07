'use strict';

/**
 * Charter v3 H.3 — create history_backfill_runs (attestation + undo map).
 * Additive + idempotent (§4.3); FKs PascalCase "Users" (house gotcha).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."history_backfill_runs"') AS reg`
    );
    if (existing?.[0]?.reg) {
      console.log('⚠️ history_backfill_runs already exists, skipping createTable');
      return;
    }

    await queryInterface.createTable('history_backfill_runs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      trainerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      startDate: { type: Sequelize.DATEONLY, allowNull: true },
      endDate: { type: Sequelize.DATEONLY, allowNull: true },
      attestation: { type: Sequelize.TEXT, allowNull: false },
      grounding: { type: Sequelize.JSONB, allowNull: true },
      created: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      skipped: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      undoneAt: { type: Sequelize.DATE, allowNull: true },
      undoneBy: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('history_backfill_runs', ['userId'], {
      name: 'idx_history_backfill_runs_user',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('history_backfill_runs');
  },
};
