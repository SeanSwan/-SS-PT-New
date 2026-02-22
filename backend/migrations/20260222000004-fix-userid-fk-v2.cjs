'use strict';

/**
 * Fix FK constraints v2 — query actual constraint names from pg_constraint.
 *
 * The v1 migration (20260222000003) used guessed constraint names which may
 * not match the actual names PostgreSQL assigned. This migration:
 *   1. Queries pg_constraint for all FK constraints on the target columns
 *   2. Checks if any reference "users" (lowercase) instead of "Users"
 *   3. Drops the broken ones and re-creates them correctly
 *
 * Also fixes the model definition (references: 'Users') so sync() won't re-break.
 */
module.exports = {
  async up(queryInterface) {
    const seq = queryInterface.sequelize;

    // Determine the actual Users table name
    const [tables] = await seq.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name IN ('Users', 'users')
       ORDER BY table_name;`
    );
    const tableNames = tables.map(t => t.table_name);
    const usersTable = tableNames.includes('Users') ? 'Users' : 'users';
    console.log(`[Migration v2] Detected Users table: "${usersTable}" (found: ${JSON.stringify(tableNames)})`);

    // Helper: find all FK constraints on a given table+column, drop any that
    // reference the wrong Users table, then ensure a correct one exists.
    const fixColumnFk = async (tableName, columnName, onDelete) => {
      // Query all FK constraints on this column
      const [fks] = await seq.query(`
        SELECT
          con.conname AS constraint_name,
          ref_cls.relname AS referenced_table
        FROM pg_constraint con
        JOIN pg_class cls ON cls.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = cls.relnamespace
        JOIN pg_class ref_cls ON ref_cls.oid = con.confrelid
        JOIN pg_attribute att ON att.attrelid = con.conrelid
          AND att.attnum = ANY(con.conkey)
        WHERE ns.nspname = 'public'
          AND cls.relname = '${tableName}'
          AND att.attname = '${columnName}'
          AND con.contype = 'f'
      `);

      console.log(`[Migration v2] ${tableName}.${columnName}: found ${fks.length} FK(s): ${JSON.stringify(fks)}`);

      let hasCorrectFk = false;

      for (const fk of fks) {
        if (fk.referenced_table === usersTable) {
          hasCorrectFk = true;
          console.log(`[Migration v2]   ✓ ${fk.constraint_name} -> "${fk.referenced_table}" (correct)`);
        } else {
          // Drop the broken FK
          try {
            await seq.query(`ALTER TABLE "${tableName}" DROP CONSTRAINT "${fk.constraint_name}"`);
            console.log(`[Migration v2]   ✗ Dropped ${fk.constraint_name} -> "${fk.referenced_table}" (wrong table)`);
          } catch (err) {
            console.log(`[Migration v2]   ✗ Failed to drop ${fk.constraint_name}: ${err.message}`);
          }
        }
      }

      // If no correct FK exists, create one
      if (!hasCorrectFk) {
        const constraintName = `${tableName}_${columnName}_${usersTable}_fk`;
        try {
          await queryInterface.addConstraint(tableName, {
            fields: [columnName],
            type: 'foreign key',
            name: constraintName,
            references: { table: usersTable, field: 'id' },
            onUpdate: 'CASCADE',
            onDelete: onDelete || 'CASCADE',
          });
          console.log(`[Migration v2]   + Created ${constraintName} -> "${usersTable}".id`);
        } catch (err) {
          console.log(`[Migration v2]   ! Could not create FK: ${err.message}`);
        }
      }
    };

    // Fix all known columns that reference Users
    await fixColumnFk('client_onboarding_questionnaires', 'userId', 'CASCADE');
    await fixColumnFk('client_onboarding_questionnaires', 'createdBy', 'SET NULL');
    await fixColumnFk('workout_sessions', 'userId', 'CASCADE');
    await fixColumnFk('workout_sessions', 'trainerId', 'CASCADE');

    console.log('[Migration v2] FK reference fix complete');
  },

  async down() {
    console.log('[Migration v2] No-op down');
  },
};
