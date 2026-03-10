'use strict';

/**
 * Migration: Add tier column to Achievements table
 * =================================================
 * The Achievement model defines a `tier` field (bronze/silver/gold/platinum)
 * but no migration ever created it. This adds it as VARCHAR for flexibility.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const [cols] = await queryInterface.sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'Achievements' AND column_name = 'tier';`
    );

    if (cols.length > 0) {
      console.log('Migration 20260310000100: Achievements.tier already exists — skipping');
      return;
    }

    await queryInterface.addColumn('Achievements', 'tier', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'bronze',
    });

    console.log('Migration 20260310000100: Added Achievements.tier column (VARCHAR 50)');
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Achievements', 'tier');
  }
};
