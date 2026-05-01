#!/usr/bin/env node
/**
 * Grant trainer permissions via raw SQL (bypasses broken model schema-drift).
 *
 * The TrainerPermissions.mjs model has `field:` mappings to snake_case
 * column names (trainer_id, permission_type, etc.) but the real production
 * DB has camelCase columns (trainerId, permissionType). The model also
 * references audit fields (deactivatedBy, deactivatedAt, reason) that don't
 * exist in the DB (DB has revokedAt, notes instead). Using raw SQL to
 * bypass the drift while a separate slice fixes the model.
 *
 * Usage:
 *   node backend/scripts/grant-trainer-permissions-raw.mjs <trainerId> [--granted-by=<adminId>]
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node backend/scripts/grant-trainer-permissions-raw.mjs <trainerId> [--granted-by=<adminId>]');
  process.exit(1);
}

const trainerId = parseInt(args[0], 10);
const grantedByArg = args.find((a) => a.startsWith('--granted-by='));
const grantedBy = grantedByArg ? parseInt(grantedByArg.replace('--granted-by=', ''), 10) : 2;

const ALL_PERMISSIONS = [
  'edit_workouts',
  'view_progress',
  'manage_clients',
  'access_nutrition',
  'modify_schedules',
  'view_analytics',
];

async function main() {
  console.log(`\n[grant-trainer-permissions-raw] trainerId=${trainerId} grantedBy=${grantedBy}\n`);

  await sequelize.authenticate();

  let created = 0;
  let skipped = 0;
  for (const permissionType of ALL_PERMISSIONS) {
    const [existing] = await sequelize.query(
      `SELECT id FROM trainer_permissions
       WHERE "trainerId" = :trainerId AND "permissionType" = :permissionType
       LIMIT 1`,
      { replacements: { trainerId, permissionType } }
    );

    if (existing.length > 0) {
      // Reactivate if needed
      await sequelize.query(
        `UPDATE trainer_permissions
         SET "isActive" = true, "expiresAt" = NULL, "revokedAt" = NULL, "updatedAt" = NOW()
         WHERE id = :id`,
        { replacements: { id: existing[0].id } }
      );
      console.log(`  [reactivated] ${permissionType} (id=${existing[0].id})`);
      skipped++;
    } else {
      const [rows] = await sequelize.query(
        `INSERT INTO trainer_permissions
           ("trainerId", "permissionType", "grantedBy", "isActive", "grantedAt", "createdAt", "updatedAt")
         VALUES (:trainerId, :permissionType, :grantedBy, true, NOW(), NOW(), NOW())
         RETURNING id`,
        { replacements: { trainerId, permissionType, grantedBy } }
      );
      console.log(`  [created] ${permissionType} (id=${rows[0].id})`);
      created++;
    }
  }

  console.log(`\n[VERIFIED] permissions granted: created=${created} reactivated=${skipped}`);
  await sequelize.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n[ERROR] ${err?.message || err}`);
  process.exit(99);
});
