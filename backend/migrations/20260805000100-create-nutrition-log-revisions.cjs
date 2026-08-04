'use strict';

/**
 * S0.5 (nutrition blueprint 2026-08-04): append-only audit trail for macro-log
 * mutations. PATCH/DELETE /api/macros/:id and the reviewer verify flip were
 * hard mutations with zero history — no way to prove what a client originally
 * logged. Deliberately NO FK to daily_macro_logs (the audit row must survive
 * the log's deletion) and no updatedAt (rows are append-only).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('nutrition_log_revisions')) {
      await queryInterface.createTable('nutrition_log_revisions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        macroLogId: { type: Sequelize.INTEGER, allowNull: false },
        ownerUserId: { type: Sequelize.INTEGER, allowNull: false },
        actorUserId: { type: Sequelize.INTEGER, allowNull: false },
        actorRole: { type: Sequelize.STRING(20), allowNull: true },
        action: { type: Sequelize.STRING(20), allowNull: false },
        snapshot: { type: Sequelize.JSONB, allowNull: false },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
      await queryInterface.addIndex('nutrition_log_revisions', ['macroLogId']);
      await queryInterface.addIndex('nutrition_log_revisions', ['ownerUserId', 'createdAt']);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('nutrition_log_revisions');
  },
};
