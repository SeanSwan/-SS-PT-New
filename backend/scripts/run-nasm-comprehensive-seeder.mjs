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
const originalWarn = console.warn;
let suppressedValidationSkipCount = 0;

console.warn = (...args) => {
  const message = args.map((arg) => String(arg)).join(' ');
  if (message.includes('Skipped "') && message.includes(': Validation error')) {
    suppressedValidationSkipCount++;
    return;
  }
  originalWarn(...args);
};

try {
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  await up(queryInterface);

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  if (suppressedValidationSkipCount > 0) {
    console.log(`NASM comprehensive seeder skipped ${suppressedValidationSkipCount} invalid seed rows; seed data cleanup needed.`);
  }
  console.log(`NASM comprehensive seeder completed in ${seconds}s`);
  process.exitCode = 0;
} catch (err) {
  console.error('NASM comprehensive seeder failed:', err?.message || err);
  if (err?.parent?.message) {
    console.error('Parent error:', err.parent.message);
  }
  process.exitCode = 1;
} finally {
  console.warn = originalWarn;
  await sequelize.close().catch(() => {});
}
