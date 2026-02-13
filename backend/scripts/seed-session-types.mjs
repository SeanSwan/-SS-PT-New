#!/usr/bin/env node
/**
 * seed-session-types.mjs
 * ======================
 * Seeds the 5 approved session types into the session_types table.
 * Idempotent: uses findOrCreate by name, updates existing if found.
 *
 * Usage:
 *   node backend/scripts/seed-session-types.mjs
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../database.mjs';
import SessionType from '../models/SessionType.mjs';

const SESSION_TYPES = [
  {
    name: 'Personal Training (60 min)',
    description: 'Standard 1-on-1 personal training session',
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    creditsRequired: 1,
    color: '#00FFFF',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Extended Training (90 min)',
    description: 'Extended 1-on-1 training session for advanced clients',
    duration: 90,
    bufferBefore: 0,
    bufferAfter: 15,
    creditsRequired: 2,
    color: '#7851A9',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Partner Training (60 min)',
    description: '2-person training session (each client uses 1 credit)',
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 15,
    creditsRequired: 1,
    color: '#FF6B6B',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Assessment / Movement Screen',
    description: 'Initial or periodic NASM movement screen and assessment',
    duration: 60,
    bufferBefore: 0,
    bufferAfter: 30,
    creditsRequired: 0,
    color: '#FFD700',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Orientation / Onboarding',
    description: 'New client orientation — facility tour, PAR-Q review, goal setting',
    duration: 30,
    bufferBefore: 0,
    bufferAfter: 0,
    creditsRequired: 0,
    color: '#4CAF50',
    sortOrder: 5,
    isActive: true,
  },
];

async function main() {
  console.log('=== Seed Session Types ===\n');

  try {
    await sequelize.authenticate();
    console.log('Database connected.');

    // Verify table exists (migrations must have run first — no DDL here)
    await sequelize.query('SELECT 1 FROM "session_types" LIMIT 1');

    let created = 0;
    let updated = 0;

    for (const typeData of SESSION_TYPES) {
      const [instance, wasCreated] = await SessionType.findOrCreate({
        where: { name: typeData.name },
        defaults: typeData,
      });

      if (wasCreated) {
        created++;
        console.log(`  [CREATED] ${typeData.name}`);
      } else {
        // Update existing to match policy
        await instance.update(typeData);
        updated++;
        console.log(`  [UPDATED] ${typeData.name}`);
      }
    }

    console.log(`\nDone: ${created} created, ${updated} updated.`);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
