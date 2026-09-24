// Migration to add new fields to Orientation table
//
// H-01 fix (hostile review of the review, 2026-09-18).
//
// This is the lexicographically earliest migration in the repo
// (timestamp 20240115000000), so it is ALWAYS first in the pending chain.
// It alters a table named `orientations` that no migration in the repository
// ever creates — the table only ever existed because `sequelize.sync({alter})`
// built it from models/Orientation.mjs. On a genuinely empty database the
// chain therefore died on migration #1 with
//   ERROR: relation "orientations" does not exist
// which broke fresh onboarding, CI shadow gates and disaster recovery
// simultaneously.
//
// The guard below is `queryInterface.tableExists(...)`, deliberately NOT the
// `SELECT EXISTS`-against-information_schema pattern that has silently no-oped
// four times in this repo (it returns a wrapped row object, not a boolean, so
// `if (!result)` is always false).
//
// The file is NOT deleted: production already has it recorded in
// SequelizeMeta, and deleting it would rewrite history for no benefit.
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // No `orientations` table => nothing to alter. Skipping keeps a fresh
    // database bootstrappable instead of wedging the entire chain at #1.
    if (!(await queryInterface.tableExists('orientations'))) {
      console.log('  [20240115000000] orientations table absent — skipping (H-01 guard)');
      return;
    }

    return queryInterface.sequelize.transaction(async (transaction) => {
      // Make userId nullable
      await queryInterface.changeColumn('orientations', 'userId', {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      }, { transaction });

      // Add new columns
      await queryInterface.addColumn('orientations', 'status', {
        type: Sequelize.ENUM('pending', 'scheduled', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending'
      }, { transaction });

      await queryInterface.addColumn('orientations', 'assignedTrainer', {
        type: Sequelize.STRING,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orientations', 'scheduledDate', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orientations', 'completedDate', {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn('orientations', 'source', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'website'
      }, { transaction });
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Symmetric guard — rolling back a table that was never created must be a
    // no-op, not a second failure.
    if (!(await queryInterface.tableExists('orientations'))) {
      console.log('  [20240115000000] orientations table absent — nothing to roll back (H-01 guard)');
      return;
    }

    return queryInterface.sequelize.transaction(async (transaction) => {
      // Remove added columns
      await queryInterface.removeColumn('orientations', 'status', { transaction });
      await queryInterface.removeColumn('orientations', 'assignedTrainer', { transaction });
      await queryInterface.removeColumn('orientations', 'scheduledDate', { transaction });
      await queryInterface.removeColumn('orientations', 'completedDate', { transaction });
      await queryInterface.removeColumn('orientations', 'source', { transaction });

      // Revert userId to not nullable
      await queryInterface.changeColumn('orientations', 'userId', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      }, { transaction });
    });
  }
};