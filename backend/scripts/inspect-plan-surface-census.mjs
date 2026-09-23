#!/usr/bin/env node
/**
 * FILE: inspect-plan-surface-census.mjs
 * PURPOSE: Answer "where do workout plans actually live, and is the planner the real surface?"
 *
 * READ-ONLY. SELECT + information_schema only. No writes. PII-free: table names and counts only.
 *
 * Context: workout_plans holds only 4 rows since March in a product with paying clients.
 * Either the planner flow is barely used, or plans live somewhere else too. This decides
 * whether the plan-PDF overhaul is even targeting the right surface.
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

const { QueryTypes } = sequelize.Sequelize ?? {};

async function main() {
  await sequelize.authenticate();

  const tables = await sequelize.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND (table_name ILIKE '%plan%' OR table_name ILIKE '%workout%' OR table_name ILIKE '%session%')
     ORDER BY table_name`,
    { type: QueryTypes.SELECT },
  );

  console.log('\nPLAN / WORKOUT / SESSION TABLES — ROW COUNTS\n');
  const rows = [];
  for (const t of tables) {
    const name = t.table_name;
    try {
      const [c] = await sequelize.query(
        `SELECT COUNT(*)::int AS n FROM "${name}"`,
        { type: QueryTypes.SELECT },
      );
      rows.push({ name, n: c.n });
    } catch {
      rows.push({ name, n: -1 });
    }
  }

  rows.sort((a, b) => b.n - a.n);
  for (const r of rows) {
    const count = r.n < 0 ? 'ERR' : String(r.n);
    const flag = r.n > 20 ? '  <-- populated' : '';
    console.log(`  ${r.name.padEnd(44)}${count.padStart(8)}${flag}`);
  }

  console.log('\nTOTAL tables inspected:', rows.length);
  await sequelize.close();
}

main().catch(async (error) => {
  console.error('census failed:', error.message);
  try { await sequelize.close(); } catch { /* noop */ }
  process.exit(1);
});
