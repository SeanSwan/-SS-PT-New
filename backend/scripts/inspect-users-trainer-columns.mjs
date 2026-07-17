#!/usr/bin/env node
/**
 * Verify the admin finance /trainers query against the real database.
 * Diagnostic helper — read-only. Prints column names + row COUNTS only (no PII, no row data).
 *
 * Covers:
 *  1. Drift table: every attribute /trainers selects vs the real "Users" columns.
 *  2. Live execution of the actual route query (proves the caller path, not just the model).
 */

import 'dotenv/config';
import sequelize from '../database.mjs';
import User from '../models/User.mjs';
import { TRAINER_LIST_ATTRIBUTES } from '../routes/admin/adminFinanceRoutes.mjs';
import { Op } from 'sequelize';

async function main() {
  await sequelize.authenticate();

  const [columns] = await sequelize.query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Users'
     ORDER BY ordinal_position`
  );
  const real = new Set(columns.map(c => c.column_name));

  console.log(`\n"Users" real column count: ${real.size}`);
  console.log('\nDRIFT TABLE — route attribute -> real "Users" column');
  console.log('-'.repeat(52));
  const drifted = TRAINER_LIST_ATTRIBUTES.filter(a => !real.has(a));
  for (const attr of TRAINER_LIST_ATTRIBUTES) {
    console.log(`  ${attr.padEnd(26)} ${real.has(attr) ? 'match' : 'DRIFT — no such column'}`);
  }
  console.log('-'.repeat(52));
  console.log(`drift count: ${drifted.length}`);

  console.log('\nExecuting the actual /trainers query...');
  const trainers = await User.findAll({
    where: { role: { [Op.in]: ['trainer', 'admin'] } },
    attributes: TRAINER_LIST_ATTRIBUTES,
    order: [['createdAt', 'DESC']]
  });
  console.log(`  QUERY OK — ${trainers.length} trainer/admin rows returned`);
  console.log(`  rows with a real lastLogin value: ${trainers.filter(t => t.lastLogin).length}/${trainers.length}`);

  await sequelize.close();
}

main().catch(err => {
  console.error('inspect failed:', err.message);
  process.exit(1);
});
