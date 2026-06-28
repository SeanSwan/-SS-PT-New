'use strict';

/**
 * Expand user-dashboard cover crop controls.
 *
 * Converts the old 9-preset bannerObjectPosition enum into percentage
 * coordinates and adds fit/scale controls for manual drag framing.
 */

const legacyPositionSql = `
  CASE "bannerObjectPosition"
    WHEN 'left top' THEN '0% 0%'
    WHEN 'center top' THEN '50% 0%'
    WHEN 'right top' THEN '100% 0%'
    WHEN 'left center' THEN '0% 50%'
    WHEN 'center center' THEN '50% 50%'
    WHEN 'right center' THEN '100% 50%'
    WHEN 'left bottom' THEN '0% 100%'
    WHEN 'center bottom' THEN '50% 100%'
    WHEN 'right bottom' THEN '100% 100%'
    ELSE '50% 50%'
  END
`;

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (table.bannerObjectPosition) {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users"
        ALTER COLUMN "bannerObjectPosition" DROP DEFAULT
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users" ALTER COLUMN "bannerObjectPosition" TYPE VARCHAR(32)
        USING (${legacyPositionSql})
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users"
        ALTER COLUMN "bannerObjectPosition" SET DEFAULT '50% 50%'
      `);
      await queryInterface.sequelize.query(`
        UPDATE "Users"
        SET "bannerObjectPosition" = '50% 50%'
        WHERE "bannerObjectPosition" IS NULL
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users"
        ALTER COLUMN "bannerObjectPosition" SET NOT NULL
      `);
    } else {
      await queryInterface.addColumn('Users', 'bannerObjectPosition', {
        type: Sequelize.DataTypes.STRING(32),
        allowNull: false,
        defaultValue: '50% 50%',
        comment: 'CSS object-position percentage coordinates for manual banner crop alignment.',
      });
    }

    if (!table.bannerObjectFit) {
      await queryInterface.addColumn('Users', 'bannerObjectFit', {
        type: Sequelize.DataTypes.STRING(12),
        allowNull: false,
        defaultValue: 'smart',
        comment: 'CSS object-fit mode for banner photo: cover, contain, or fill.',
      });
    }

    if (!table.bannerImageScale) {
      await queryInterface.addColumn('Users', 'bannerImageScale', {
        type: Sequelize.DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1,
        comment: 'Manual banner photo zoom multiplier for the dashboard cover image.',
      });
    }

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_bannerObjectPosition"');
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.bannerImageScale) {
      await queryInterface.removeColumn('Users', 'bannerImageScale');
    }

    if (table.bannerObjectFit) {
      await queryInterface.removeColumn('Users', 'bannerObjectFit');
    }
  },
};
