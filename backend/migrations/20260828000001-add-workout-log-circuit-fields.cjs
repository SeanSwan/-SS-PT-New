'use strict';

const COLUMNS = {
  circuitName: (Sequelize) => ({ type: Sequelize.STRING(100), allowNull: true }),
  circuitOrder: (Sequelize) => ({ type: Sequelize.INTEGER, allowNull: true }),
  exerciseRole: (Sequelize) => ({ type: Sequelize.STRING(32), allowNull: true }),
  setType: (Sequelize) => ({ type: Sequelize.STRING(32), allowNull: false, defaultValue: 'working' }),
  isometricHoldSeconds: (Sequelize) => ({ type: Sequelize.INTEGER, allowNull: true }),
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const hasWorkoutLogs = tables.some((entry) => (typeof entry === 'string' ? entry : entry?.tableName) === 'workout_logs');
    if (!hasWorkoutLogs) return;
    const existing = await queryInterface.describeTable('workout_logs');
    for (const [name, definition] of Object.entries(COLUMNS)) {
      if (!existing[name]) await queryInterface.addColumn('workout_logs', name, definition(Sequelize));
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const hasWorkoutLogs = tables.some((entry) => (typeof entry === 'string' ? entry : entry?.tableName) === 'workout_logs');
    if (!hasWorkoutLogs) return;
    const existing = await queryInterface.describeTable('workout_logs');
    for (const name of Object.keys(COLUMNS).reverse()) {
      if (existing[name]) await queryInterface.removeColumn('workout_logs', name);
    }
  },
};
