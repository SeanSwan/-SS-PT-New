'use strict';

/**
 * Persist user-dashboard banner presentation options.
 *
 * Adds selectable collage/carousel layouts, the optional sticky mini-carousel
 * toggle, and saved banner presets.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.bannerCollageLayout) {
      await queryInterface.addColumn('Users', 'bannerCollageLayout', {
        type: Sequelize.DataTypes.STRING(24),
        allowNull: false,
        defaultValue: 'stream',
        comment: 'Dashboard collage presentation layout, including grid and carousel variants.',
      });
    }

    if (!table.bannerStickyCarousel) {
      await queryInterface.addColumn('Users', 'bannerStickyCarousel', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether carousel banner layouts render a compact sticky strip while scrolling.',
      });
    }

    if (!table.bannerPresets) {
      await queryInterface.addColumn('Users', 'bannerPresets', {
        type: Sequelize.DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment: 'Saved dashboard banner composition presets.',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.bannerPresets) {
      await queryInterface.removeColumn('Users', 'bannerPresets');
    }

    if (table.bannerStickyCarousel) {
      await queryInterface.removeColumn('Users', 'bannerStickyCarousel');
    }

    if (table.bannerCollageLayout) {
      await queryInterface.removeColumn('Users', 'bannerCollageLayout');
    }
  },
};
