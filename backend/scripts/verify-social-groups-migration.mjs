#!/usr/bin/env node
/**
 * Verify the social-groups migration applies cleanly against the REAL prod DB
 * — inside a ROLLED-BACK transaction, so nothing persists. Proves the live
 * Render-boot migration won't crash. Read-only in effect (always rolls back).
 */
import 'dotenv/config';
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();

  // Preconditions: what exists in prod now?
  const [pre] = await sequelize.query(`
    SELECT
      to_regclass('public."SocialGroups"')        AS groups_tbl,
      to_regclass('public."SocialGroupMembers"')  AS members_tbl,
      (SELECT data_type FROM information_schema.columns
        WHERE table_name='SocialPosts' AND column_name='id')       AS socialposts_id_type,
      (SELECT data_type FROM information_schema.columns
        WHERE table_name='SocialPosts' AND column_name='groupId')  AS groupid_col,
      (SELECT data_type FROM information_schema.columns
        WHERE table_name='Users' AND column_name='id')             AS users_id_type
  `);
  console.log('PRECONDITIONS:', JSON.stringify(pre[0], null, 2));

  const migration = await import('../migrations/20260715000001-create-social-groups.cjs');
  const qi = sequelize.getQueryInterface();

  const t = await sequelize.transaction();
  // Monkey-patch the query interface's sequelize.query to run inside the tx.
  const originalQuery = qi.sequelize.query.bind(qi.sequelize);
  qi.sequelize.query = (sql, opts = {}) => originalQuery(sql, { ...opts, transaction: t });

  try {
    await migration.default.up(qi);
    console.log('up() applied without error inside tx.');

    // Verify the objects now exist within the tx.
    const [post] = await qi.sequelize.query(`
      SELECT
        to_regclass('public."SocialGroups"')        AS groups_tbl,
        to_regclass('public."SocialGroupMembers"')  AS members_tbl,
        (SELECT data_type FROM information_schema.columns
          WHERE table_name='SocialPosts' AND column_name='groupId') AS groupid_col
    `, { transaction: t });
    console.log('POST-UP (in tx):', JSON.stringify(post[0], null, 2));

    // Verify the FK on SocialPosts.groupId targets SocialGroups, and the
    // group FKs target "Users" (capital) — the dual-table gotcha.
    const [fks] = await qi.sequelize.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS ref_table
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type='FOREIGN KEY'
        AND tc.table_name IN ('SocialGroups','SocialGroupMembers')
      ORDER BY tc.table_name, kcu.column_name
    `, { transaction: t });
    console.log('FKs (in tx):');
    for (const fk of fks) console.log(`  ${fk.table_name}.${fk.column_name} -> ${fk.ref_table}`);

    // Re-run up() to confirm idempotency (safe-migrate may re-stamp).
    await migration.default.up(qi);
    console.log('up() is idempotent (second run clean).');
  } finally {
    await t.rollback();
    qi.sequelize.query = originalQuery;
    console.log('Transaction ROLLED BACK — nothing persisted.');
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('verify-social-groups-migration FAILED:', err.message);
  process.exit(1);
});
