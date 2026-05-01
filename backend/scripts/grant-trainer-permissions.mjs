#!/usr/bin/env node
/**
 * Grant all trainer permission types to a trainer.
 *
 * Usage:
 *   node backend/scripts/grant-trainer-permissions.mjs <trainerId> [--granted-by=<adminId>]
 *
 * Example:
 *   node backend/scripts/grant-trainer-permissions.mjs 98 --granted-by=2
 *
 * Why this exists:
 *   The dailyWorkoutFormRoutes /client/:clientId/info endpoint (and others)
 *   gate trainer access on explicit `trainer_permissions` rows. Test trainers
 *   created via fixtures don't get permissions granted automatically, so they
 *   trip the 403 check at line 158:
 *     "You do not have permission to edit workouts for this client"
 *   Granting all 6 permission types unblocks the full smoke.
 *
 * Idempotent: re-running on a trainer that already has rows will skip
 * (or reactivate isActive=false rows where expiresAt is in the past).
 */

import 'dotenv/config';
import { initializeModelsCache, getModel } from '../models/index.mjs';

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help')) {
  console.log('Usage: node backend/scripts/grant-trainer-permissions.mjs <trainerId> [--granted-by=<adminId>]');
  process.exit(1);
}

const trainerId = parseInt(args[0], 10);
const grantedByArg = args.find((a) => a.startsWith('--granted-by='));
const grantedBy = grantedByArg ? parseInt(grantedByArg.replace('--granted-by=', ''), 10) : 2;

if (!Number.isInteger(trainerId) || trainerId < 1) {
  console.error('ERROR: trainerId must be a positive integer');
  process.exit(2);
}

const ALL_PERMISSIONS = [
  'edit_workouts',
  'view_progress',
  'manage_clients',
  'access_nutrition',
  'modify_schedules',
  'view_analytics',
];

async function main() {
  console.log(`\n[grant-trainer-permissions] trainerId=${trainerId} grantedBy=${grantedBy}\n`);

  await initializeModelsCache();
  const TrainerPermissions = getModel('TrainerPermissions');
  const User = getModel('User');

  const trainer = await User.findByPk(trainerId, { attributes: ['id', 'role'] });
  if (!trainer) {
    console.error(`ERROR: trainer id=${trainerId} not found`);
    process.exit(3);
  }
  if (trainer.role !== 'trainer' && trainer.role !== 'admin') {
    console.warn(`  [!] WARNING: user ${trainerId} has role='${trainer.role}', not 'trainer' or 'admin'`);
  }

  let created = 0;
  let reactivated = 0;
  let skipped = 0;
  for (const permissionType of ALL_PERMISSIONS) {
    const existing = await TrainerPermissions.findOne({
      where: { trainerId, permissionType },
    });

    if (existing) {
      if (existing.isActive && (!existing.expiresAt || new Date(existing.expiresAt) > new Date())) {
        console.log(`  [skip] ${permissionType} already active`);
        skipped++;
      } else {
        await existing.update({ isActive: true, expiresAt: null });
        console.log(`  [reactivated] ${permissionType}`);
        reactivated++;
      }
    } else {
      const row = await TrainerPermissions.create({
        trainerId,
        permissionType,
        grantedBy,
        isActive: true,
        expiresAt: null,
      });
      console.log(`  [created] ${permissionType} (id=${row.id})`);
      created++;
    }
  }

  console.log(`\n[VERIFIED] permissions granted: created=${created} reactivated=${reactivated} skipped=${skipped}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n[ERROR] ${err?.message || err}`);
  if (err?.stack) console.error(err.stack);
  process.exit(99);
});
