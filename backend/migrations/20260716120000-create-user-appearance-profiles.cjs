/**
 * ============================================================================
 * FILE: 20260716120000-create-user-appearance-profiles.cjs
 * PURPOSE: FUSION F1 — durable per-user Smart Lens appearance storage so a
 * member's committed look (and later their Style Studio overlay) follows
 * them across devices.
 * ============================================================================
 * WHAT THIS FILE DOES: Creates `user_appearance_profiles` (one row per user,
 * unique userId FK -> resolved Users table, JSONB profile + nullable overlay).
 * KEY DECISIONS: additive-only; NO separate schemaVersion column (the version
 * lives INSIDE the profile JSON as number 1); rollback drops only this table.
 * ============================================================================
 */

'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

module.exports = {
  async up(queryInterface, Sequelize) {
    const usersTable = await resolveUsersTable(queryInterface);
    return queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.createTable(
        'user_appearance_profiles',
        {
          id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            unique: true,
            references: { model: usersTable, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          profile: { type: Sequelize.JSONB, allowNull: false },
          overlay: { type: Sequelize.JSONB, allowNull: true },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        },
        { transaction },
      );
      await queryInterface.addIndex('user_appearance_profiles', ['userId'], {
        unique: true,
        name: 'user_appearance_profiles_user_unique',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    return queryInterface.dropTable('user_appearance_profiles');
  },
};
