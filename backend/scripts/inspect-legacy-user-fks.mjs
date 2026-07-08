/**
 * inspect-legacy-user-fks.mjs — READ-ONLY probe (prod data reset, packet §0)
 * ===========================================================================
 * Prints the live state of the six FK constraints that (as of the 2026-07-07
 * inventory) still validate against the LEGACY lowercase `users` table, plus
 * an orphan count against canonical "Users" for each — the exact preconditions
 * the staged re-point migration needs. Zero PII: constraint metadata and
 * counts only. Run BEFORE arming the migration (expect: users + CASCADE ×6,
 * orphans 0) and AFTER it deploys (expect: "Users" with the chosen rules).
 *
 *   cd backend && node scripts/inspect-legacy-user-fks.mjs
 */
import sequelize from '../database.mjs';

const PAIRS = [
  { table: 'immigration_documents', column: 'user_id' },
  { table: 'immigration_tasks', column: 'user_id' },
  { table: 'notifications', column: 'userId' },
  { table: 'ai_interaction_logs', column: 'userId' },
  { table: 'equipment_profiles', column: 'trainerId' },
  { table: 'measurement_milestones', column: 'userId' },
];

const main = async () => {
  console.log('=== Legacy-user FK probe (read-only) ===');
  for (const { table, column } of PAIRS) {
    const [cons] = await sequelize.query(`
      SELECT con.conname,
             confrel.relname AS referenced_table,
             CASE con.confdeltype
               WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
               WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
               WHEN 'd' THEN 'SET DEFAULT' ELSE con.confdeltype::text
             END AS delete_rule
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_class confrel ON confrel.oid = con.confrelid
      JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
      WHERE con.contype = 'f' AND rel.relname = :table AND att.attname = :column
    `, { replacements: { table, column } });

    const [[orphans]] = await sequelize.query(`
      SELECT COUNT(*)::int AS n
      FROM "${table}" t
      WHERE t."${column}" IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM "Users" u WHERE u.id = t."${column}")
    `);

    if (cons.length === 0) {
      console.log(`${table}.${column}: NO FK CONSTRAINT FOUND · orphans-vs-"Users"=${orphans.n}`);
      continue;
    }
    for (const c of cons) {
      console.log(`${table}.${column}: ${c.conname} -> ${c.referenced_table} | ${c.delete_rule} · orphans-vs-"Users"=${orphans.n}`);
    }
  }
  await sequelize.close();
};

main().catch((err) => { console.error('probe failed:', err.message); process.exit(1); });
