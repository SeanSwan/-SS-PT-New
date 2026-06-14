'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable('bootcamp_exercises');

    if (!columns.videoUrl) {
      await queryInterface.addColumn('bootcamp_exercises', 'videoUrl', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }

    if (!columns.imageUrl) {
      await queryInterface.addColumn('bootcamp_exercises', 'imageUrl', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }

    if (!columns.thumbnailUrl) {
      await queryInterface.addColumn('bootcamp_exercises', 'thumbnailUrl', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable('bootcamp_exercises');

    for (const column of ['thumbnailUrl', 'imageUrl', 'videoUrl']) {
      if (columns[column]) {
        await queryInterface.removeColumn('bootcamp_exercises', column);
      }
    }
  },
};
