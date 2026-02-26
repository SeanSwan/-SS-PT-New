'use strict';

/**
 * Fix FK constraint on ai_privacy_profiles.userId
 *
 * Root cause: migration 20260225000001 created the FK with
 * `references: { model: 'users' }` (lowercase) but the actual
 * Users table is "Users" (capital U, case-sensitive in PostgreSQL).
 *
 * Same pattern as 20260222000003-fix-userid-fk-references.cjs.
 */
const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

module.exports = {
  async up(queryInterface) {
    const usersTable = await resolveUsersTable(queryInterface);
    console.log(`[Migration] Resolved Users table: "${usersTable}"`);

    // Drop the broken FK constraint
    try {
      await queryInterface.removeConstraint(
        'ai_privacy_profiles',
        'ai_privacy_profiles_userId_fkey'
      );
      console.log('[Migration] Dropped broken FK ai_privacy_profiles_userId_fkey');
    } catch (err) {
      console.log(`[Migration] FK not found or already removed: ${err.message}`);
    }

    // Re-add with correct table reference
    try {
      await queryInterface.addConstraint('ai_privacy_profiles', {
        fields: ['userId'],
        type: 'foreign key',
        name: 'ai_privacy_profiles_userId_fkey',
        references: { table: usersTable, field: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
      console.log(`[Migration] Re-created FK ai_privacy_profiles_userId_fkey -> ${usersTable}.id`);
    } catch (err) {
      console.log(`[Migration] Could not add FK: ${err.message}`);
    }
  },

  async down() {
    // No-op: reverting would restore the broken FK
    console.log('[Migration] No-op down — broken FK not restored');
  },
};
