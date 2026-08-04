#!/usr/bin/env node
/**
 * Grant trainer permissions via raw SQL.
 *
 * ORIGINAL REASON (historical): `TrainerPermissions.mjs` mapped every attribute to snake_case
 * column names (trainer_id, permission_type, …) while the real DB has camelCase columns, and it
 * declared audit fields (deactivatedBy, deactivatedAt, reason) that do not exist — the DB has
 * revokedAt and notes. Every query through the model threw, so this script bypassed it.
 *
 * THAT DRIFT IS NOW FIXED (SWA-87): the model matches the real columns and
 * `TrainerPermissions.create(...)` works. Prefer the model or the
 * `/api/trainer-permissions/grant` route for normal grants.
 *
 * This script is kept as a direct-SQL utility for when you need to grant permissions without
 * booting the app or loading model/association wiring. Its SQL was independently correct about
 * the schema and still is — it names the same real columns the fixed model does.
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
