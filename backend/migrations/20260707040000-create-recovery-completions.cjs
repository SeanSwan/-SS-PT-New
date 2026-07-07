'use strict';

/**
 * Launch charter 4B.3 — create recovery_completions.
 * The Recovery Board's "done" log: unique per (user, exerciseKey, date), FK to
 * PascalCase "Users" (NEVER legacy lowercase users — the dormant
 * corrective_homework_logs table was rejected for that exact landmine).
 * Additive + idempotent per the §4.3 migration contract.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."recovery_completions"') AS reg`
    );
    if (existing?.[0]?.reg) {
      console.log('⚠️ recovery_completions already exists, skipping createTable');
      return;
    }

    await queryInterface.createTable('recovery_completions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      exerciseKey: { type: Sequelize.STRING(255), allowNull: false },
      exerciseName: { type: Sequelize.STRING(255), allowNull: true },
      completedDate: { type: Sequelize.DATEONLY, allowNull: false },
      source: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'board' },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex(
      'recovery_completions',
      ['userId', 'exerciseKey', 'completedDate'],
      { unique: true, name: 'recovery_completions_user_exercise_date_unique' }
    );
    await queryInterface.addIndex('recovery_completions', ['userId', 'completedDate'], {
      name: 'idx_recovery_completions_user_date',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recovery_completions');
  },
};
