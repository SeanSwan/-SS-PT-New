'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('notifications');

    if (!tableInfo.persistent) {
      await queryInterface.addColumn('notifications', 'persistent', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false,
        comment: 'Persistent notifications survive "mark all read"',
      });
    }

    if (!tableInfo.relatedEntityType) {
      await queryInterface.addColumn('notifications', 'relatedEntityType', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Entity type for related entity (e.g., measurement, weighin)',
      });
    }

    if (!tableInfo.relatedEntityId) {
      await queryInterface.addColumn('notifications', 'relatedEntityId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Entity ID for related entity (e.g., client userId for overdue item)',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('notifications', 'persistent');
    await queryInterface.removeColumn('notifications', 'relatedEntityType');
    await queryInterface.removeColumn('notifications', 'relatedEntityId');
  },
};
