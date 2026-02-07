/**
 * Test User Cleanup Script
 * =========================
 * Removes excess test users while keeping:
 * - 2 test clients
 * - 2 test trainers
 * - 1 admin user (your real admin account)
 *
 * Run: node backend/scripts/cleanup-test-users.mjs [--dry-run]
 *
 * Options:
 *   --dry-run    Preview what would be deleted without actually deleting
 *   --force      Skip confirmation prompt
 */

import sequelize from '../database.mjs';
import { initializeModelsCache, getAllModels } from '../models/index.mjs';
import readline from 'readline';

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// Configuration: How many of each role to keep
const KEEP_CONFIG = {
  client: 2,
  trainer: 2,
  admin: 999, // Keep all admins
  user: 1
};

// IDs to always preserve (never delete these)
const PRESERVE_IDS = [1]; // Usually ID 1 is the main admin

async function confirm(message) {
  if (FORCE || DRY_RUN) return true;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(`${message} (y/N): `, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('\n='.repeat(60));
  console.log('  TEST USER CLEANUP SCRIPT');
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n[DRY RUN MODE] No changes will be made.\n');
  }

  try {
    // Initialize models
    await initializeModelsCache();
    const { User, Session, Order, WorkoutSession, ClientProgress } = getAllModels();

    // Get all users grouped by role
    const users = await User.findAll({
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'email', 'firstName', 'lastName', 'role', 'isActive', 'createdAt']
    });

    console.log(`\nTotal users in database: ${users.length}\n`);

    // Group users by role
    const byRole = {};
    for (const user of users) {
      const role = user.role || 'user';
      if (!byRole[role]) byRole[role] = [];
      byRole[role].push(user);
    }

    // Display current counts
    console.log('Current user counts by role:');
    for (const [role, roleUsers] of Object.entries(byRole)) {
      console.log(`  ${role}: ${roleUsers.length}`);
    }
    console.log('');

    // Determine which users to keep and delete
    const toKeep = [];
    const toDelete = [];

    for (const [role, roleUsers] of Object.entries(byRole)) {
      const keepCount = KEEP_CONFIG[role] || 1;

      // Sort by createdAt to keep oldest (usually the real users)
      const sorted = roleUsers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      for (let i = 0; i < sorted.length; i++) {
        const user = sorted[i];
        const shouldPreserve = PRESERVE_IDS.includes(user.id);
        const withinLimit = i < keepCount;

        if (shouldPreserve || withinLimit) {
          toKeep.push(user);
        } else {
          toDelete.push(user);
        }
      }
    }

    // Display keep list
    console.log('Users to KEEP:');
    for (const user of toKeep) {
      console.log(`  [${user.role}] ID ${user.id}: ${user.firstName} ${user.lastName} <${user.email}>`);
    }
    console.log('');

    // Display delete list
    if (toDelete.length === 0) {
      console.log('No users to delete. Database is already clean.');
      process.exit(0);
    }

    console.log('Users to DELETE:');
    for (const user of toDelete) {
      console.log(`  [${user.role}] ID ${user.id}: ${user.firstName} ${user.lastName} <${user.email}>`);
    }
    console.log('');

    // Summary
    console.log(`Summary: Keep ${toKeep.length}, Delete ${toDelete.length}`);
    console.log('');

    if (DRY_RUN) {
      console.log('[DRY RUN] Would delete the users listed above.');
      console.log('Run without --dry-run to actually delete.');
      process.exit(0);
    }

    // Confirm deletion
    const proceed = await confirm(`Are you sure you want to delete ${toDelete.length} users?`);
    if (!proceed) {
      console.log('Cancelled. No changes made.');
      process.exit(0);
    }

    // Delete users and their related data
    console.log('\nDeleting users...');

    const deleteIds = toDelete.map(u => u.id);

    // Delete related data first (foreign key constraints)
    console.log('  Deleting related sessions...');
    await Session.destroy({ where: { userId: deleteIds } });

    console.log('  Deleting related orders...');
    await Order.destroy({ where: { userId: deleteIds } });

    console.log('  Deleting related workout sessions...');
    await WorkoutSession.destroy({ where: { userId: deleteIds } });

    console.log('  Deleting related client progress...');
    await ClientProgress.destroy({ where: { userId: deleteIds } });

    console.log('  Deleting users...');
    await User.destroy({ where: { id: deleteIds } });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`  CLEANUP COMPLETE: Deleted ${toDelete.length} users`);
    console.log('='.repeat(60));

    // Show final counts
    const finalUsers = await User.findAll({
      attributes: ['role']
    });

    const finalByRole = {};
    for (const user of finalUsers) {
      const role = user.role || 'user';
      finalByRole[role] = (finalByRole[role] || 0) + 1;
    }

    console.log('\nFinal user counts:');
    for (const [role, count] of Object.entries(finalByRole)) {
      console.log(`  ${role}: ${count}`);
    }

  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
