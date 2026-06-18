'use strict';

const resolveUsersTable = require('./helpers/resolveUsersTable.cjs');

const TABLE_NAME = 'subscriptions';
const USER_ID_COLUMN = 'userId';
const CONSTRAINT_NAME = 'subscriptions_userId_fkey';

module.exports = {
  async up(queryInterface) {
    const seq = queryInterface.sequelize;
    const usersTable = await resolveUsersTable(queryInterface);

    const [tables] = await seq.query(
      `SELECT to_regclass('public."${TABLE_NAME}"') AS exists;`
    );
    if (!tables?.[0]?.exists) {
      console.log(`[Subscription FK] ${TABLE_NAME} table missing; skipping`);
      return;
    }

    const [columns] = await seq.query(`
      SELECT 1
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = '${TABLE_NAME}'
         AND column_name = '${USER_ID_COLUMN}';
    `);
    if (!columns?.length) {
      console.log(`[Subscription FK] ${TABLE_NAME}.${USER_ID_COLUMN} missing; skipping`);
      return;
    }

    const [orphans] = await seq.query(`
      SELECT DISTINCT s."${USER_ID_COLUMN}" AS user_id
        FROM "${TABLE_NAME}" s
       WHERE s."${USER_ID_COLUMN}" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "${usersTable}" u WHERE u.id = s."${USER_ID_COLUMN}")
       LIMIT 20;
    `);
    if (orphans?.length) {
      const ids = orphans.map((row) => row.user_id).join(', ');
      throw new Error(
        `[Subscription FK] Refusing FK retarget; subscriptions.userId values missing from "${usersTable}": ${ids}`
      );
    }

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
        AND cls.relname = '${TABLE_NAME}'
        AND att.attname = '${USER_ID_COLUMN}'
        AND con.contype = 'f';
    `);

    let hasCorrectFk = false;
    for (const fk of fks || []) {
      if (fk.referenced_table === usersTable) {
        hasCorrectFk = true;
        console.log(`[Subscription FK] ${fk.constraint_name} already targets "${usersTable}"`);
        continue;
      }

      console.log(
        `[Subscription FK] Dropping ${fk.constraint_name}; it targets "${fk.referenced_table}"`
      );
      await seq.query(`ALTER TABLE "${TABLE_NAME}" DROP CONSTRAINT IF EXISTS "${fk.constraint_name}";`);
    }

    if (hasCorrectFk) return;

    console.log(`[Subscription FK] Creating ${CONSTRAINT_NAME} -> "${usersTable}".id`);
    await seq.query(`
      ALTER TABLE "${TABLE_NAME}"
      ADD CONSTRAINT "${CONSTRAINT_NAME}"
      FOREIGN KEY ("${USER_ID_COLUMN}")
      REFERENCES "${usersTable}" ("id")
      ON UPDATE CASCADE
      ON DELETE CASCADE;
    `);
  },

  async down() {
    console.log('[Subscription FK] Down migration is a no-op; FK remains on the resolved Users table');
  },
};
