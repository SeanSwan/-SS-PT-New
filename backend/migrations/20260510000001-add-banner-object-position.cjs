'use strict';

/**
 * Add bannerObjectPosition column to Users table
 * ===============================================
 * 9-preset CSS object-position value for banner photo crop alignment.
 * Lets a user reframe a banner (e.g. portrait photo cropped at the chest)
 * without re-uploading.
 *
 * Strict enum guards against poisoned writes — frontend / backend route
 * validation gives defense in depth, but the column type itself rejects
 * anything outside the 9-preset 3x3 grid before it can land in
 * styled-component CSS.
 *
 * CREATED: 2026-05-10 (SLICE 2)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (table.bannerObjectPosition) return;

    // Use the PG ENUM creation pattern — Sequelize's addColumn with ENUM
    // type creates the underlying type via a side-effect that some PG
    // versions don't replay idempotently, so we create the type first.
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      try {
        await queryInterface.sequelize.query(`
          CREATE TYPE "enum_Users_bannerObjectPosition" AS ENUM (
            'left top', 'center top', 'right top',
            'left center', 'center center', 'right center',
            'left bottom', 'center bottom', 'right bottom'
          )
        `);
      } catch (err) {
        if (!/already exists/i.test(err.message)) throw err;
      }
    }

    await queryInterface.addColumn('Users', 'bannerObjectPosition', {
      type: Sequelize.DataTypes.ENUM(
        'left top', 'center top', 'right top',
        'left center', 'center center', 'right center',
        'left bottom', 'center bottom', 'right bottom',
      ),
      allowNull: false,
      defaultValue: 'center center',
      comment: 'CSS object-position preset for banner photo crop alignment (9-preset 3x3 grid).',
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.bannerObjectPosition) {
      await queryInterface.removeColumn('Users', 'bannerObjectPosition');
    }

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      try {
        await queryInterface.sequelize.query(
          'DROP TYPE IF EXISTS "enum_Users_bannerObjectPosition"',
        );
      } catch {
        // best-effort cleanup
      }
    }
  },
};
