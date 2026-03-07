'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('sessions');
    if (!tableInfo.remindersSent) {
      await queryInterface.addColumn('sessions', 'remindersSent', {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: 'Tracks which reminders have been sent (e.g. {"24h":"2026-03-06T12:00:00Z","1h":"2026-03-06T23:00:00Z"})',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('sessions', 'remindersSent');
  },
};
