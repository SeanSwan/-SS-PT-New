'use strict';

/**
 * Add forcePasswordChange column to Users table
 * ===============================================
 * Supports admin-created client accounts that must change
 * their password on first login.
 *
 * Default false — no impact on existing users.
 *
 * CREATED: 2026-02-12
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.forcePasswordChange) {
      await queryInterface.addColumn('Users', 'forcePasswordChange', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Requires password change on next login (admin-created accounts)'
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('Users');

    if (table.forcePasswordChange) {
      await queryInterface.removeColumn('Users', 'forcePasswordChange');
    }
  }
};
