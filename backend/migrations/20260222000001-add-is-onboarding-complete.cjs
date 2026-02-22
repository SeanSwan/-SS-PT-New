'use strict';

/**
 * Add isOnboardingComplete column to Users
 * ----------------------------------------
 * Supports onboarding glow state and completion checks.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.isOnboardingComplete) {
      await queryInterface.addColumn('Users', 'isOnboardingComplete', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether client has completed onboarding flow'
      });
      console.log('[Migration] Added Users.isOnboardingComplete');
    } else {
      console.log('[Migration] Users.isOnboardingComplete already exists, skipping');
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.isOnboardingComplete) {
      await queryInterface.removeColumn('Users', 'isOnboardingComplete');
      console.log('[Migration] Removed Users.isOnboardingComplete');
    }
  }
};
