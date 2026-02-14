'use strict';

/**
 * Add password reset fields to Users table
 * ==========================================
 * Supports forgot-password flow: HMAC-SHA256 hashed token + expiry.
 * Includes partial index on resetPasswordToken for O(1) token lookup.
 *
 * CREATED: 2026-02-14
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Table name resolver: try 'Users' (production), fall back to 'users' (some dev envs)
    let TABLE;
    try {
      await queryInterface.describeTable('Users');
      TABLE = 'Users';
    } catch (err) {
      if (err.message && (err.message.includes('No description found') || err.message.includes('does not exist') || err.message.includes('no such table'))) {
        await queryInterface.describeTable('users');
        TABLE = 'users';
      } else {
        throw err;
      }
    }

    const tableInfo = await queryInterface.describeTable(TABLE);

    if (!tableInfo.resetPasswordToken) {
      await queryInterface.addColumn(TABLE, 'resetPasswordToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
    if (!tableInfo.resetPasswordExpires) {
      await queryInterface.addColumn(TABLE, 'resetPasswordExpires', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    // Partial index for O(1) token lookup — dialect-agnostic existence check
    const existingIndexes = await queryInterface.showIndex(TABLE);
    const hasIndex = existingIndexes.some(idx => idx.name === 'idx_users_reset_password_token');
    if (!hasIndex) {
      await queryInterface.addIndex(TABLE, ['resetPasswordToken'], {
        name: 'idx_users_reset_password_token',
        where: { resetPasswordToken: { [Sequelize.Op.ne]: null } },
      });
    }
  },

  async down(queryInterface) {
    let TABLE;
    try {
      await queryInterface.describeTable('Users');
      TABLE = 'Users';
    } catch (err) {
      if (err.message && (err.message.includes('No description found') || err.message.includes('does not exist') || err.message.includes('no such table'))) {
        await queryInterface.describeTable('users');
        TABLE = 'users';
      } else {
        throw err;
      }
    }

    const existingIndexes = await queryInterface.showIndex(TABLE);
    const hasIndex = existingIndexes.some(idx => idx.name === 'idx_users_reset_password_token');
    if (hasIndex) {
      await queryInterface.removeIndex(TABLE, 'idx_users_reset_password_token');
    }

    const tableInfo = await queryInterface.describeTable(TABLE);
    if (tableInfo.resetPasswordExpires) {
      await queryInterface.removeColumn(TABLE, 'resetPasswordExpires');
    }
    if (tableInfo.resetPasswordToken) {
      await queryInterface.removeColumn(TABLE, 'resetPasswordToken');
    }
  }
};
