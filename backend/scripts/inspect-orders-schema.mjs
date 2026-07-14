#!/usr/bin/env node
/**
 * Inspect the real schema of the orders / order_items / print_orders tables.
 * Diagnostic helper — read-only. Structural metadata only, no row data.
 * Sean-approved probe 2026-07-13 (Order-model reconcile slice).
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();

  const [tables] = await sequelize.query(
    `SELECT table_name AS tname FROM information_schema.tables
     WHERE table_schema='public' AND lower(table_name) LIKE '%order%'
     ORDER BY table_name`
  );
  console.log('ORDER-LIKE TABLES:', tables.map((t) => t.tname).join(', ') || '(none)');

  for (const t of tables) {
    const [cols] = await sequelize.query(
      `SELECT column_name AS cname, data_type AS dtype, is_nullable AS nullable,
              (column_default IS NOT NULL) AS has_default
       FROM information_schema.columns
       WHERE table_schema='public' AND table_name = :t
       ORDER BY ordinal_position`,
      { replacements: { t: t.tname } }
    );
    console.log(`\n== ${t.tname} (${cols.length} columns) ==`);
    for (const c of cols) {
      console.log(`  ${c.cname.padEnd(30)} ${c.dtype.padEnd(28)} nullable=${c.nullable} default=${c.has_default}`);
    }
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('inspect-orders-schema failed:', err.message);
  process.exit(1);
});
