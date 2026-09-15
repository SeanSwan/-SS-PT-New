'use strict';

/**
 * U3: generation_runs — an auditable LEDGER of sprint generation claims.
 *
 * DESIGN DECISION (receipt 32): session-level pg_try_advisory_locks were
 * evaluated and REJECTED for now. A session lock held for a minutes-long
 * generation requires a dedicated pooled connection per concurrent run —
 * on Render's connection cap that trades a lease race for pool exhaustion.
 * The metadata lease (generationClaimV1) stays the mutual-exclusion source
 * of truth; this table adds what the old design lacked: ops visibility.
 * Every claim lands here as 'running'; finish() closes it 'completed' or
 * 'failed'; an unreclaimable cleanup failure marks it 'orphaned'; a later
 * reclaim of the same sprint marks superseded runs 'orphaned'. If
 * cross-process contention ever outgrows one node, session advisory locks
 * on a dedicated connection are the documented next step.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('generation_runs', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      sprint_id: { type: Sequelize.INTEGER, allowNull: false },
      operation_id: { type: Sequelize.UUID, allowNull: false },
      version: { type: Sequelize.INTEGER, allowNull: false },
      status: {
        type: Sequelize.ENUM('running', 'completed', 'failed', 'orphaned'),
        allowNull: false,
        defaultValue: 'running',
      },
      claimed_at: { type: Sequelize.DATE(3), allowNull: false },
      heartbeat_at: { type: Sequelize.DATE(3) },
      finished_at: { type: Sequelize.DATE(3) },
      error_message: { type: Sequelize.TEXT },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('generation_runs', ['sprint_id', 'status']);
    await queryInterface.addIndex('generation_runs', ['operation_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('generation_runs');
  },
};
