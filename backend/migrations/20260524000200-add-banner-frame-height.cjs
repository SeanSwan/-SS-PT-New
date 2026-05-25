'use strict';

/**
 * Persist creative dashboard cover composition controls.
 *
 * Adds adjustable banner height plus collage photo URL storage after the
 * initial crop/fit/scale migration shipped.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.bannerFrameHeight) {
      await queryInterface.addColumn('Users', 'bannerFrameHeight', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 320,
        comment: 'Manual dashboard cover frame height in pixels.',
      });
    }

    if (!table.bannerCollagePhotos) {
      await queryInterface.addColumn('Users', 'bannerCollagePhotos', {
        type: Sequelize.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Safe uploaded image URLs used by collage banner mode.',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.bannerCollagePhotos) {
      await queryInterface.removeColumn('Users', 'bannerCollagePhotos');
    }

    if (table.bannerFrameHeight) {
      await queryInterface.removeColumn('Users', 'bannerFrameHeight');
    }
  },
};
