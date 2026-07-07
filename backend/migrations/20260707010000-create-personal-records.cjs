'use strict';

/**
 * Launch charter Phase 4a — create personal_records.
 * One row per (user, exerciseName, metric) current-best; anchors idempotent PR
 * awards + the save-moment celebration. Additive + idempotent (§4.3 migration
 * contract): no-op if the table already exists; matches PersonalRecord.mjs 1:1.
 * FK targets PascalCase "Users" (house gotcha — never lowercase users).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT to_regclass('public."personal_records"') AS reg`
    );
    if (existing?.[0]?.reg) {
      console.log('⚠️ personal_records already exists, skipping createTable');
      return;
    }

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_personal_records_metric"');

    await queryInterface.createTable('personal_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      exerciseName: { type: Sequelize.STRING(255), allowNull: false },
      metric: { type: Sequelize.ENUM('weight', 'est1rm'), allowNull: false },
      value: { type: Sequelize.FLOAT, allowNull: false },
      weight: { type: Sequelize.FLOAT, allowNull: true },
      reps: { type: Sequelize.INTEGER, allowNull: true },
      sessionId: { type: Sequelize.UUID, allowNull: true },
      formId: { type: Sequelize.STRING(64), allowNull: true },
      achievedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('personal_records', ['userId', 'exerciseName', 'metric'], {
      unique: true,
      name: 'personal_records_user_exercise_metric_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('personal_records');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_personal_records_metric"');
  },
};
