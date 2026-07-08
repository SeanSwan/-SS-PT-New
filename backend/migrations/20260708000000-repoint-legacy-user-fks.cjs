'use strict';

/**
 * PROD DATA RESET — packet §5 step 4: re-point the six FK constraints that
 * still validate against the LEGACY lowercase `users` table onto canonical
 * `"Users"` (house gotcha: FKs must reference "Users").
 * ===========================================================================
 * WHY (packet §0, [VERIFIED] 2026-07-07 probe): immigration_documents(41) +
 * immigration_tasks(53) carry Sean's canonical "Users" id, but their FKs
 * validate against lowercase `users` — where the same id is a TEST ACCOUNT —
 * with ON DELETE CASCADE. Deleting that "obvious test account" would
 * cascade-destroy the family immigration data. Same class on four more
 * tables. Probe (scripts/inspect-legacy-user-fks.mjs) confirms all six
 * constraints exist with standard names and ZERO orphan rows vs "Users",
 * so this re-point needs no data updates.
 *
 * DELETE-RULE CHOICES: the immigration tables get RESTRICT — deleting the
 * owning user must HARD-FAIL rather than silently remove this data class.
 * The other four keep CASCADE (disposable per-user data), now correctly
 * bound to the canonical row.
 *
 * ⚠️ STAGED DARK — lives in scripts/proposed-migrations/ ON PURPOSE.
 * Render runs backend/migrations/ at build, so moving this file is the
 * ARMING act. Gates before moving it (packet §5): (1) Sean's explicit go,
 * (2) Render PG backup/snapshot taken, (3) probe re-run clean. After deploy:
 * re-run the probe — expect "Users" targets, RESTRICT×2 + CASCADE×4, 0 orphans.
 *
 * Idempotent: skips pairs already targeting "Users"; discovers constraint
 * names from pg_constraint instead of hardcoding. All six re-points run in
 * ONE transaction — all or nothing.
 */

const REPOINTS = [
  { table: 'immigration_documents', column: 'user_id', onDelete: 'RESTRICT' },
  { table: 'immigration_tasks', column: 'user_id', onDelete: 'RESTRICT' },
  { table: 'notifications', column: 'userId', onDelete: 'CASCADE' },
  { table: 'ai_interaction_logs', column: 'userId', onDelete: 'CASCADE' },
  { table: 'equipment_profiles', column: 'trainerId', onDelete: 'CASCADE' },
  { table: 'measurement_milestones', column: 'userId', onDelete: 'CASCADE' },
];

const IDENT = /^[A-Za-z0-9_]+$/;

async function findFkConstraints(sequelize, table, column, transaction) {
  const [rows] = await sequelize.query(`
    SELECT con.conname, confrel.relname AS referenced_table
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class confrel ON confrel.oid = con.confrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f' AND rel.relname = :table AND att.attname = :column
  `, { replacements: { table, column }, transaction });
  return rows;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      for (const { table, column, onDelete } of REPOINTS) {
        if (!IDENT.test(table) || !IDENT.test(column)) {
          throw new Error(`Unsafe identifier in REPOINTS: ${table}.${column}`);
        }

        // Pre-flight: a single orphan row would make the new FK fail mid-
        // transaction anyway — fail loudly and early with the count instead.
        const [[orphans]] = await sequelize.query(`
          SELECT COUNT(*)::int AS n FROM "${table}" t
          WHERE t."${column}" IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = t."${column}")
        `, { transaction });
        if (orphans.n > 0) {
          throw new Error(`${table}.${column}: ${orphans.n} rows have no "Users" match — aborting (whole transaction rolls back)`);
        }

        const constraints = await findFkConstraints(sequelize, table, column, transaction);
        const alreadyCanonical = constraints.some((c) => c.referenced_table === 'Users');
        const legacy = constraints.filter((c) => c.referenced_table === 'users');

        for (const c of legacy) {
          if (!IDENT.test(c.conname)) throw new Error(`Unsafe constraint name: ${c.conname}`);
          await sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${c.conname}"`, { transaction });
          console.log(`↺ ${table}.${column}: dropped legacy FK ${c.conname} (-> users)`);
        }

        if (alreadyCanonical) {
          console.log(`✓ ${table}.${column}: already references "Users", skipping add`);
          continue;
        }

        await sequelize.query(`
          ALTER TABLE "${table}"
          ADD CONSTRAINT "${table}_${column}_Users_fkey"
          FOREIGN KEY ("${column}") REFERENCES "Users"(id) ON DELETE ${onDelete}
        `, { transaction });
        console.log(`✅ ${table}.${column}: now references "Users"(id) ON DELETE ${onDelete}`);
      }
    });
  },

  // Down re-arms the §0 landmine (FKs back to the legacy table) — provided
  // for completeness, but the correct rollback for a bad deploy is the
  // Render PG snapshot taken at gate (2), not this.
  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    await sequelize.transaction(async (transaction) => {
      for (const { table, column } of REPOINTS) {
        const constraints = await findFkConstraints(sequelize, table, column, transaction);
        for (const c of constraints.filter((x) => x.referenced_table === 'Users')) {
          if (!IDENT.test(c.conname)) throw new Error(`Unsafe constraint name: ${c.conname}`);
          await sequelize.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${c.conname}"`, { transaction });
        }
        await sequelize.query(`
          ALTER TABLE "${table}"
          ADD CONSTRAINT "${table}_${column}_fkey"
          FOREIGN KEY ("${column}") REFERENCES users(id) ON DELETE CASCADE
        `, { transaction });
      }
    });
  },
};
