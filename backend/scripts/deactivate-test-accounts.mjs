#!/usr/bin/env node
/**
 * deactivate-test-accounts.mjs
 * ============================
 * Finds and deactivates test/demo user accounts.
 * Dry-run by default; pass --execute to apply changes.
 *
 * Matches emails containing: test, fake, demo, example
 * Excludes admin accounts.
 *
 * Usage:
 *   node backend/scripts/deactivate-test-accounts.mjs           # dry-run
 *   node backend/scripts/deactivate-test-accounts.mjs --execute  # apply
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import sequelize from '../database.mjs';
import User from '../models/User.mjs';

const EXECUTE = process.argv.includes('--execute');

const TEST_EMAIL_PATTERNS = ['test', 'fake', 'demo', 'example'];

async function main() {
  console.log('=== Deactivate Test Accounts ===');
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (changes will be applied)' : 'DRY-RUN (no changes)'}\n`);

  try {
    await sequelize.authenticate();
    console.log('Database connected.\n');

    // Build OR conditions for email patterns
    const emailConditions = TEST_EMAIL_PATTERNS.map(pattern => ({
      email: { [Op.iLike]: `%${pattern}%` }
    }));

    // Find test accounts (exclude admins, already inactive)
    const testAccounts = await User.findAll({
      where: {
        [Op.or]: emailConditions,
        role: { [Op.ne]: 'admin' },
        isActive: true,
      },
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt'],
    });

    if (testAccounts.length === 0) {
      console.log('No active test accounts found.');
      return;
    }

    console.log(`Found ${testAccounts.length} active test account(s):\n`);

    for (const account of testAccounts) {
      console.log(`  [${account.role}] ${account.email} (id: ${account.id}, name: ${account.firstName} ${account.lastName})`);

      if (EXECUTE) {
        await account.update({ isActive: false });
        console.log(`    -> DEACTIVATED`);
      } else {
        console.log(`    -> Would deactivate (dry-run)`);
      }
    }

    console.log(`\nSummary: ${testAccounts.length} account(s) ${EXECUTE ? 'deactivated' : 'would be deactivated'}.`);

    if (!EXECUTE) {
      console.log('\nRun with --execute to apply changes.');
    }
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
