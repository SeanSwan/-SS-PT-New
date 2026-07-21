'use strict';

/**
 * Migration: create recovery_activity_logs
 * =========================================
 * Restore (off-day recovery) completion ledger — one row per client/local-day/
 * exercise. Additive + idempotent. FK targets "Users" (PascalCase — the
 * canonical user table; never lowercase users) and "Exercises".
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const normalized = tables.map((t) => (typeof t === 'object' ? t.tableName : t));
    if (normalized.includes('recovery_activity_logs')) return;

    await queryInterface.createTable('recovery_activity_logs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      exerciseId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Exercises', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      localDate: { type: Sequelize.DATEONLY, allowNull: false },
      blockKey: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'inhibit' },
      xpAwarded: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      dataSources: { type: Sequelize.STRING(120), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
    });

    await queryInterface.addIndex('recovery_activity_logs', {
      unique: true,
      fields: ['userId', 'localDate', 'exerciseId'],
      name: 'uq_recovery_user_day_exercise',
    });
    await queryInterface.addIndex('recovery_activity_logs', {
      fields: ['userId', 'localDate'],
      name: 'idx_recovery_user_day',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('recovery_activity_logs');
  },
};
