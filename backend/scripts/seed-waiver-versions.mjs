#!/usr/bin/env node
/**
 * Seed Waiver Versions — CLI runner
 * ==================================
 * Thin wrapper around the canonical boot-time seeder
 * (backend/seeders/seed-waiver-versions.mjs). The legal text lives in exactly
 * ONE file — this script used to carry a byte-identical copy, which meant a
 * lawyer's redline applied here was a silent no-op in production (SWA-140 W2).
 *
 * Usage: node backend/scripts/seed-waiver-versions.mjs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../database.mjs';
import { initializeModelsCache, getModel } from '../models/index.mjs';
import seedWaiverVersions from '../seeders/seed-waiver-versions.mjs';

async function main() {
  console.log('🔑 Seeding waiver versions (canonical seeder)...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await initializeModelsCache();
    console.log('✅ Models initialized\n');

    const result = await seedWaiverVersions(getModel);
    console.log(`\nResult: created=${result.created} existing=${result.existing} reason=${result.reason}`);

    if (!result.seeded && result.reason !== 'all_exist') {
      console.error('❌ Seeder did not complete cleanly — see reason above.');
      process.exit(1);
    }
    console.log('✅ Waiver version seeding complete.');
  } catch (err) {
    console.error('❌ Seeder error:', err.message || err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
