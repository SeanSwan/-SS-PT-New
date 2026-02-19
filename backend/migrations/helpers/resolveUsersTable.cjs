'use strict';

/**
 * resolveUsersTable.cjs
 * ====================
 * Shared helper for video catalog migrations.
 * Resolves the correct Users table name at migration runtime.
 *
 * Production uses "Users" (capital U, quoted identifier).
 * This helper queries information_schema to confirm, with collation-safe ordering.
 *
 * Usage in migrations:
 *   const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');
 *   module.exports = {
 *     async up(queryInterface, Sequelize) {
 *       const usersTable = await resolveUsersTable(queryInterface);
 *       // use usersTable in references: { model: usersTable, key: 'id' }
 *     }
 *   };
 */
module.exports = async function resolveUsersTable(queryInterface) {
  // Direct table existence test — avoids Sequelize raw query result format issues.
  // Try "Users" first (production table name), fall back to "users" (lowercase).
  try {
    await queryInterface.sequelize.query('SELECT 1 FROM "Users" LIMIT 1');
    return 'Users';
  } catch (_e1) {
    try {
      await queryInterface.sequelize.query('SELECT 1 FROM "users" LIMIT 1');
      return 'users';
    } catch (_e2) {
      throw new Error('Users table not found in public schema (tried "Users" and "users"). Cannot create foreign key references.');
    }
  }
};
