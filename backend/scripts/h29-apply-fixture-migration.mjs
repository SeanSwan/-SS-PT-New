/**
 * ============================================================================
 * FILE: backend/scripts/h29-apply-fixture-migration.mjs
 *
 * PURPOSE: apply the H29 migration to the OWNED FIXTURE ONLY and prove the unique
 *   index actually exists in that database — contract §5 line 306 requires exactly
 *   that ("Schema inspection must prove the unique index actually exists in that
 *   fixture").
 *
 * It runs the REAL migration file through a real Sequelize queryInterface, so the
 * fixture sees the same DDL the production runner would produce. No hand-written
 * SQL here that could drift from the migration.
 *
 * OWNED FIXTURE: 127.0.0.1:55089, database rolodex_s06_test, role rolodex_s06_client.
 * This script REFUSES to run against anything else, and touches no other database.
 *
 * RUN: node scripts/h29-apply-fixture-migration.mjs
 * ============================================================================
 */

import { Sequelize } from 'sequelize';
import migration from '../migrations/20260913000001-add-bootcamp-class-log-operation-key.cjs';

const DB = { host: '127.0.0.1', port: 55089, database: 'rolodex_s06_test', user: 'rolodex_s06_client' };
const TABLE = 'bootcamp_class_log';
const UNIQUE_INDEX = 'uniq_bootcamp_log_trainer_operation_key';

const sequelize = new Sequelize(DB.database, DB.user, null, {
  host: DB.host,
  port: DB.port,
  dialect: 'postgres',
  logging: false,
});

const queryInterface = sequelize.getQueryInterface();

try {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((entry) => (typeof entry === 'string' ? entry : entry?.tableName));
  console.log('fixture tables:', names.length);
  console.log(`${TABLE} present:`, names.includes(TABLE));

  if (!names.includes(TABLE)) {
    // The fixture is scoped to the S06 template-persistence slice (9 tables) and does
    // NOT include bootcamp_class_log. Contract §5 line 306 nevertheless requires the
    // unique index to be PROVEN in this fixture, so the PRE-MIGRATION table is built
    // here first — deliberately WITHOUT the three new columns — and the real migration
    // is then applied on top of it. That is what makes this a test of the migration
    // rather than a test of `sync()`.
    console.log(`\n${TABLE} absent -> building the PRE-MIGRATION shape, then applying the migration.`);
    await queryInterface.createTable(TABLE, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      templateId: { type: Sequelize.INTEGER, allowNull: true },
      trainerId: { type: Sequelize.INTEGER, allowNull: false },
      classDate: { type: Sequelize.DATEONLY, allowNull: false },
      dayType: { type: Sequelize.STRING(30), allowNull: true },
      actualParticipants: { type: Sequelize.INTEGER, allowNull: true },
      overflowActivated: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
      exercisesUsed: { type: Sequelize.JSONB, allowNull: false },
      modificationsMade: { type: Sequelize.JSONB, allowNull: true },
      trainerNotes: { type: Sequelize.TEXT, allowNull: true },
      classRating: { type: Sequelize.INTEGER, allowNull: true },
      energyLevel: { type: Sequelize.STRING(20), allowNull: true },
      attendance: { type: Sequelize.JSONB, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('now') },
    });
  }

  {
    const before = await queryInterface.describeTable(TABLE);
    console.log('before — operationKey:', 'operationKey' in before,
      '| payloadHash:', 'payloadHash' in before,
      '| executionSummary:', 'executionSummary' in before);

    await migration.up(queryInterface, Sequelize);

    const after = await queryInterface.describeTable(TABLE);
    const indexes = await queryInterface.showIndex(TABLE);
    const unique = indexes.find((entry) => entry.name === UNIQUE_INDEX);

    console.log('after  — operationKey:', 'operationKey' in after,
      '->', after.operationKey?.type,
      '| allowNull:', after.operationKey?.allowNull);
    console.log('after  — payloadHash:', 'payloadHash' in after, '| executionSummary:', 'executionSummary' in after);
    console.log('unique index present:', Boolean(unique), unique ? `fields=${unique.fields.map((f) => f.attribute).join(',')}` : '');

    // ── BEHAVIOURAL proof, not just introspection ──────────────────────────────
    // Two rows sharing (trainerId, operationKey) MUST be rejected: that is the whole
    // mechanism by which a retried taught log collapses onto one row.
    //
    // The proof WRITES to the owned fixture, so it also has to clean up after itself:
    // without the id capture below, a second run would die on the unique index (the
    // first `insert('run:fixed-key')` would collide with the row the previous run left
    // behind) and the fixture would keep four rows this script invented. The migration's
    // own `up` is idempotent — it checks for each column and the index before adding —
    // so the script can be re-run, and now it leaves nothing behind.
    const insertedIds = [];
    const insert = async (operationKey) => {
      const rows = await sequelize.query(
        `insert into ${TABLE} ("trainerId", "classDate", "exercisesUsed", "operationKey") values (7, '2026-08-03', '[]'::jsonb, :key) returning id`,
        { replacements: { key: operationKey }, type: Sequelize.QueryTypes.SELECT },
      );
      const id = Array.isArray(rows) ? rows[0]?.id : undefined;
      if (id !== undefined) insertedIds.push(id);
      return rows;
    };
    let duplicateRejected = false;
    let legacyRowsOk = 0;
    try {
      await insert('run:fixed-key');
      try {
        await insert('run:fixed-key');
      } catch (err) {
        duplicateRejected = err.name === 'SequelizeUniqueConstraintError';
      }
      console.log('duplicate (trainerId, operationKey) rejected:', duplicateRejected);

      // "Old rows remain null and readable": Postgres treats NULLs as DISTINCT, so many
      // legacy rows without a key must coexist.
      try {
        await insert(null);
        await insert(null);
        await insert(null);
        legacyRowsOk = 3;
      } catch {
        legacyRowsOk = -1;
      }
      console.log('legacy NULL-key rows coexist:', legacyRowsOk === 3);
    } finally {
      if (insertedIds.length > 0) {
        await sequelize.query(`delete from ${TABLE} where id in (:ids)`, {
          replacements: { ids: insertedIds },
        });
      }
      const remaining = await sequelize.query(`select count(*)::int as n from ${TABLE}`, {
        type: Sequelize.QueryTypes.SELECT,
      });
      console.log(`cleanup: removed ${insertedIds.length} probe row(s); ${TABLE} now holds ${remaining?.[0]?.n} row(s)`);
    }

    const proven = Boolean(unique) && duplicateRejected && legacyRowsOk === 3;
    console.log('RESULT:', proven
      ? 'MIGRATION APPLIED AND PROVEN IN FIXTURE (index enforces, legacy rows readable)'
      : 'MIGRATION INCOMPLETE — inspect above');
    // A proof tool that exits 0 when its proof FAILS is worse than no tool: the first
    // version of this script ended with exit 0 on the INCOMPLETE branch.
    if (!proven) process.exitCode = 1;
    else console.log('FIXTURE_LEFT_AS_FOUND');
  }
} finally {
  await sequelize.close();
}
