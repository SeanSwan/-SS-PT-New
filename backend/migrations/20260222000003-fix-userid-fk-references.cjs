'use strict';

/**
 * Fix FK constraints that reference "users" (lowercase) instead of "Users" (actual table name).
 *
 * Root cause: migrations created FK constraints with `references: { model: 'users' }`
 * but the actual Users table is `"Users"` (capital U, case-sensitive in PostgreSQL).
 * INSERT operations fail because PostgreSQL checks the FK against the wrong table.
 *
 * Fix: drop the broken FK constraints and re-add them pointing to "Users".
 */
module.exports = {
  async up(queryInterface) {
    const fixFk = async (table, column, constraintName, refTable) => {
      try {
        await queryInterface.removeConstraint(table, constraintName);
        console.log(`[Migration] Dropped FK ${constraintName}`);
      } catch (err) {
        console.log(`[Migration] FK ${constraintName} not found or already removed: ${err.message}`);
      }

      try {
        await queryInterface.addConstraint(table, {
          fields: [column],
          type: 'foreign key',
          name: constraintName,
          references: { table: refTable, field: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        });
        console.log(`[Migration] Re-created FK ${constraintName} -> ${refTable}.id`);
      } catch (err) {
        console.log(`[Migration] Could not add FK ${constraintName}: ${err.message}`);
      }
    };

    // Determine the actual Users table name
    const [tables] = await queryInterface.sequelize.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('Users', 'users')
       ORDER BY table_name;`
    );
    const actualTable = tables.map(t => t.table_name);
    const usersTable = actualTable.includes('Users') ? 'Users' : 'users';
    console.log(`[Migration] Detected Users table name: "${usersTable}" (found: ${JSON.stringify(actualTable)})`);

    // Fix client_onboarding_questionnaires
    await fixFk('client_onboarding_questionnaires', 'userId',
      'client_onboarding_questionnaires_userId_fkey', usersTable);
    await fixFk('client_onboarding_questionnaires', 'createdBy',
      'client_onboarding_questionnaires_createdBy_fkey', usersTable);

    // Fix workout_sessions
    await fixFk('workout_sessions', 'userId',
      'workout_sessions_userId_fkey', usersTable);

    console.log('[Migration] FK reference fix complete');
  },

  async down() {
    // No-op: reverting would restore the broken FK references
    console.log('[Migration] No-op down — broken FK references not restored');
  },
};
