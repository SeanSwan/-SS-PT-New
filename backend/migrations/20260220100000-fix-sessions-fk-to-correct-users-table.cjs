'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

/**
 * Fix sessions FK constraints to reference the correct Users table.
 *
 * Problem: All prior migrations created FK constraints with `model: 'users'`
 * (lowercase), which generates `REFERENCES "users" ("id")`. But the production
 * User model uses `tableName: '"Users"'` (uppercase). In PostgreSQL, quoted
 * identifiers are case-sensitive, so "users" ≠ "Users". This causes FK
 * violations for any user that exists only in "Users" but not "users".
 *
 * Fix: Drop existing FK constraints on sessions.trainerId, sessions.userId,
 * and sessions.cancelledBy, then recreate them pointing to the resolved
 * Users table (whichever actually exists in the DB).
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔧 Fixing sessions FK constraints to reference correct Users table...');

    const usersTable = await resolveUsersTable(queryInterface);
    console.log(`   Resolved Users table name: "${usersTable}"`);

    const fkColumns = ['trainerId', 'userId', 'cancelledBy'];

    for (const col of fkColumns) {
      // 1. Find all FK constraints on this column
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_attribute att ON att.attnum = ANY(con.conkey) AND att.attrelid = con.conrelid
        WHERE con.conrelid = 'sessions'::regclass
          AND con.contype = 'f'
          AND att.attname = '${col}';
      `);

      // 2. Drop each FK constraint found
      for (const { constraint_name } of constraints) {
        console.log(`   Dropping FK constraint: ${constraint_name} (column: ${col})`);
        await queryInterface.sequelize.query(
          `ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "${constraint_name}";`
        );
      }

      // 3. Verify column exists before recreating FK
      const [colExists] = await queryInterface.sequelize.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'sessions'
          AND column_name = '${col}';
      `);

      if (colExists.length === 0) {
        console.log(`   Column sessions.${col} does not exist — skipping FK recreation`);
        continue;
      }

      // 4. Recreate FK referencing the correct table
      const constraintName = `sessions_${col}_fkey`;
      console.log(`   Creating FK: ${constraintName} → "${usersTable}".id`);
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE "sessions"
          ADD CONSTRAINT "${constraintName}"
          FOREIGN KEY ("${col}")
          REFERENCES "${usersTable}" ("id")
          ON UPDATE CASCADE
          ON DELETE SET NULL;
        `);
        console.log(`   ✅ ${constraintName} created successfully`);
      } catch (err) {
        console.warn(`   ⚠️ Could not create ${constraintName}: ${err.message}`);
        console.warn(`   Sessions.${col} will operate without FK constraint`);
      }
    }

    console.log('🎉 Sessions FK constraint fix completed');
  },

  async down(queryInterface, Sequelize) {
    // Reverting to the old (broken) lowercase references is not useful.
    // This is a data-integrity repair migration.
    console.log('Down migration is a no-op — FK constraints remain on resolved Users table');
  }
};
