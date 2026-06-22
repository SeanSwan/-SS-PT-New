#!/usr/bin/env node

/**
 * NASM Comprehensive Seeder Runner
 * ================================
 *
 * sequelize-cli 6.6.2 does not reliably resolve `--seed` for `.mjs` seeders
 * and reports "Unable to find migration" even when the file exists. Import the
 * seeder directly and call up() with the live queryInterface instead.
 */
import sequelize from '../database.mjs';
import { up } from '../seeders/20260228-seed-nasm-comprehensive-exercises.mjs';

const start = Date.now();

try {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  await up(queryInterface);

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`NASM comprehensive seeder completed in ${seconds}s`);
  process.exitCode = 0;
} catch (err) {
  console.error('NASM comprehensive seeder failed:', err?.message || err);
  if (err?.parent?.message) {
    console.error('Parent error:', err.parent.message);
  }
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
