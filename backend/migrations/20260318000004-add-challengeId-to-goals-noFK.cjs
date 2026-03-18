'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add challengeId column to goals table WITHOUT FK constraint
    // (challenges table may not exist in production)
    const tableInfo = await queryInterface.describeTable('goals').catch(() => null);
    if (!tableInfo) {
      console.log('[Migration] goals table does not exist, skipping');
      return;
    }
    if (tableInfo.challengeId) {
      console.log('[Migration] challengeId already exists in goals, skipping');
      return;
    }
    await queryInterface.addColumn('goals', 'challengeId', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
    });
    console.log('[Migration] Added challengeId (no FK) to goals table');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('goals', 'challengeId').catch(() => {});
  },
};
