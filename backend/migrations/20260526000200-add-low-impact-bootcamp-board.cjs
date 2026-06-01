'use strict';

/**
 * Add Board 3 persistence for Boot Camp low-impact alternatives.
 *
 * PostgreSQL enum values cannot be safely removed in a down migration without
 * rebuilding dependent columns, so down is intentionally a no-op.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_bootcamp_exercises_board"
      ADD VALUE IF NOT EXISTS 'lowImpact';
    `);
  },

  async down() {
    // Intentionally irreversible: removing a PostgreSQL enum value requires
    // a table rewrite and can break existing saved templates.
  },
};
