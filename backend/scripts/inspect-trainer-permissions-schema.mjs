#!/usr/bin/env node
/**
 * Inspect the real schema of trainer_permissions table.
 * Diagnostic helper — read-only.
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();
  const [columns] = await sequelize.query(
    `SELECT column_name, data_type, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'trainer_permissions'
     ORDER BY ordinal_position`
  );
  console.log('\ntrainer_permissions columns:');
  for (const c of columns) {
    console.log(`  ${c.column_name.padEnd(30)} ${c.data_type.padEnd(15)} nullable=${c.is_nullable}`);
  }

  const [rows] = await sequelize.query(
    `SELECT COUNT(*) as count FROM trainer_permissions`
  );
  console.log(`\nrow count: ${rows[0].count}`);

  // Sample first 3 rows to see the data shape
  const [sample] = await sequelize.query(
    `SELECT * FROM trainer_permissions LIMIT 3`
  );
  console.log(`\nsample (up to 3 rows):`);
  console.log(JSON.stringify(sample, null, 2));

  await sequelize.close();
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
