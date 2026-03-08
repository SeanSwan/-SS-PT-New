'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column already exists (Sequelize sync may have added it)
    const tableDesc = await queryInterface.describeTable('admin_specials').catch(() => null);
    if (tableDesc && tableDesc.assignedClientIds) {
      console.log('Column assignedClientIds already exists on admin_specials, skipping.');
      return;
    }
    await queryInterface.addColumn('admin_specials', 'assignedClientIds', {
      type: Sequelize.ARRAY(Sequelize.INTEGER),
      allowNull: true,
      defaultValue: [],
      comment: 'Client IDs this special is assigned to. Empty = all clients.',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('admin_specials', 'assignedClientIds');
  },
};
