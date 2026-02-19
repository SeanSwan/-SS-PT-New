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
  const [results] = await queryInterface.sequelize.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('Users', 'users')
     ORDER BY CASE table_name WHEN 'Users' THEN 0 ELSE 1 END
     LIMIT 1`
  );
  if (!results || results.length === 0) {
    throw new Error('Users table not found in public schema. Cannot create foreign key references.');
  }
  // Sequelize raw query may return column keys in varying case depending on
  // pg driver version and dialect options. Handle all known variants.
  const row = results[0];
  const tableName = row.table_name ?? row.TABLE_NAME ?? row.tableName ?? Object.values(row)[0];
  if (!tableName) {
    console.error('resolveUsersTable: unexpected row format:', JSON.stringify(row));
    throw new Error('Could not extract table_name from information_schema query result.');
  }
  return tableName;
};
