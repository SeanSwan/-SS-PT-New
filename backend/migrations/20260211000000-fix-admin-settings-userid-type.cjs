'use strict';

/**
 * FILE: 20260211000000-fix-admin-settings-userid-type.cjs
 * SYSTEM: Admin Settings
 *
 * PURPOSE:
 * - Change admin_settings.userId column from UUID to VARCHAR(255)
 * - Controller uses string keys ('system', 'notifications', 'security') not UUIDs
 * - UUID type causes cast errors on findOne queries with string literals
 *
 * SAFETY:
 * - Alters column type only; preserves existing data
 * - VARCHAR(255) accepts both UUIDs and category keys
 *
 * CREATED: 2026-02-11
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Changing admin_settings.userId from UUID to VARCHAR(255)...');

    try {
      // Check if the table exists first
      const [tables] = await queryInterface.sequelize.query(
        `SELECT tablename FROM pg_tables WHERE tablename = 'admin_settings';`
      );

      if (!tables || tables.length === 0) {
        console.log('admin_settings table does not exist yet, skipping migration.');
        return;
      }

      await queryInterface.changeColumn('admin_settings', 'userId', {
        type: Sequelize.STRING(255),
        allowNull: false
      });

      console.log('Successfully changed admin_settings.userId to VARCHAR(255)');
    } catch (error) {
      console.error('Failed to change admin_settings.userId type:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Reverting admin_settings.userId back to UUID...');

    await queryInterface.changeColumn('admin_settings', 'userId', {
      type: Sequelize.UUID,
      allowNull: false
    });
  }
};
