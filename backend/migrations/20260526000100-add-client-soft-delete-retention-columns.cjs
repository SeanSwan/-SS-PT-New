'use strict';

/**
 * Persist admin client soft-delete retention timestamps.
 *
 * Deactivated client accounts retain workout history, billing records, and
 * session credits for six months before any final cleanup review.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('Users');

    if (!table.accountDeactivatedAt) {
      await queryInterface.addColumn('Users', 'accountDeactivatedAt', {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        comment: 'When the account was admin-deactivated for soft-delete retention.',
      });
    }

    if (!table.accountRetentionUntil) {
      await queryInterface.addColumn('Users', 'accountRetentionUntil', {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
        comment: 'When the soft-deleted account becomes eligible for final cleanup review.',
      });
    }

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_account_retention_until
      ON "Users" ("accountRetentionUntil")
      WHERE "accountRetentionUntil" IS NOT NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS idx_users_account_retention_until;'
    );

    const table = await queryInterface.describeTable('Users');

    if (table.accountRetentionUntil) {
      await queryInterface.removeColumn('Users', 'accountRetentionUntil');
    }

    if (table.accountDeactivatedAt) {
      await queryInterface.removeColumn('Users', 'accountDeactivatedAt');
    }
  },
};
