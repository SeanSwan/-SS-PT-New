'use strict';

/**
 * Gamification Recovery Column Repair
 * ===================================
 * Adds the recovery-tracking columns that exist in the model but are missing
 * from some production databases. The migration is idempotent and safe to run
 * on environments where the columns already exist.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const [tables] = await queryInterface.sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'Gamifications';
    `);

    if (!tables.length) {
      return;
    }

    const columns = await queryInterface.describeTable('Gamifications');

    if (!columns.wisdomXP) {
      await queryInterface.addColumn('Gamifications', 'wisdomXP', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'XP earned from recovery days, rest decisions, form improvements',
      });
    }

    if (!columns.recoveryDaysCompleted) {
      await queryInterface.addColumn('Gamifications', 'recoveryDaysCompleted', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total recovery routine completions - drives Wisdom stat',
      });
    }
  },

  async down(queryInterface) {
    const [tables] = await queryInterface.sequelize.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'Gamifications';
    `);

    if (!tables.length) {
      return;
    }

    const columns = await queryInterface.describeTable('Gamifications');

    if (columns.recoveryDaysCompleted) {
      await queryInterface.removeColumn('Gamifications', 'recoveryDaysCompleted');
    }

    if (columns.wisdomXP) {
      await queryInterface.removeColumn('Gamifications', 'wisdomXP');
    }
  },
};
