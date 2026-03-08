'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('gallery_visitors', 'enhancement_credits', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('gallery_visitors', 'is_vip', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('gallery_visitors', 'free_enhancements_used', {
      type: Sequelize.JSONB,
      allowNull: false,
      defaultValue: '{}',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('gallery_visitors', 'free_enhancements_used');
    await queryInterface.removeColumn('gallery_visitors', 'is_vip');
    await queryInterface.removeColumn('gallery_visitors', 'enhancement_credits');
  },
};
