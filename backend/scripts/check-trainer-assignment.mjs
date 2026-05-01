#!/usr/bin/env node
/**
 * Diagnostic helper for verifying trainer<->client active assignment.
 *
 * Usage:
 *   node backend/scripts/check-trainer-assignment.mjs <trainerId> <clientId>
 *
 * Examples:
 *   # Check if trainer 98 is actively assigned to client 99
 *   node backend/scripts/check-trainer-assignment.mjs 98 99
 *
 *   # Create the assignment if missing (only with explicit --create flag)
 *   node backend/scripts/check-trainer-assignment.mjs 98 99 --create
 *
 * Why this exists:
 *   The Phase A authenticated smoke (Phase A audit record §8 steps 1-5)
 *   requires a trainer with an active ClientTrainerAssignment to a client,
 *   OR an admin session. Sean's first attempted smoke landed trainer 98
 *   logged in but `/api/workout-plans/client/99` returned 404, suggesting
 *   the assignment is either missing or status != 'active'. This script
 *   resolves the ambiguity in 5 seconds.
 *
 * Reads DATABASE_URL from .env (production DB per CLAUDE.md "Local dev
 * uses production DB via DATABASE_URL — if it works locally, it works
 * in production").
 */

import 'dotenv/config';
import { initializeModelsCache } from '../models/index.mjs';
import { getModel } from '../models/index.mjs';

const args = process.argv.slice(2);
if (args.length < 2 || args.includes('--help')) {
  console.log('Usage: node backend/scripts/check-trainer-assignment.mjs <trainerId> <clientId> [--create]');
  process.exit(1);
}

const trainerId = parseInt(args[0], 10);
const clientId = parseInt(args[1], 10);
const shouldCreate = args.includes('--create');

if (!Number.isInteger(trainerId) || !Number.isInteger(clientId)) {
  console.error('ERROR: trainerId and clientId must be integers');
  process.exit(2);
}

async function main() {
  console.log(`\n[check-trainer-assignment] trainer=${trainerId}, client=${clientId}\n`);

  await initializeModelsCache();
  const ClientTrainerAssignment = getModel('ClientTrainerAssignment');
  const User = getModel('User');

  // First: do both users exist?
  const [trainer, client] = await Promise.all([
    User.findByPk(trainerId, { attributes: ['id', 'role', 'email'] }),
    User.findByPk(clientId, { attributes: ['id', 'role', 'email'] }),
  ]);

  if (!trainer) {
    console.error(`ERROR: trainer id=${trainerId} not found`);
    process.exit(3);
  }
  if (!client) {
    console.error(`ERROR: client id=${clientId} not found`);
    process.exit(3);
  }
  console.log(`  trainer: id=${trainer.id} role=${trainer.role} email=${trainer.email ? '<present>' : '<missing>'}`);
  console.log(`  client:  id=${client.id} role=${client.role} email=${client.email ? '<present>' : '<missing>'}`);

  if (trainer.role !== 'trainer' && trainer.role !== 'admin') {
    console.warn(`  [!] WARNING: trainer ${trainerId} has role='${trainer.role}', not 'trainer' or 'admin'`);
  }
  if (client.role !== 'client') {
    console.warn(`  [!] WARNING: client ${clientId} has role='${client.role}', not 'client'`);
  }

  // Look up ALL assignment rows (any status) for diagnostic clarity
  const all = await ClientTrainerAssignment.findAll({
    where: { trainerId, clientId },
    order: [['updatedAt', 'DESC']],
  });

  if (all.length === 0) {
    console.log(`\n[FINDING] No assignment row exists for trainer=${trainerId} client=${clientId}.`);
    if (shouldCreate) {
      console.log(`\n[create] --create flag passed. Creating active assignment...`);
      const created = await ClientTrainerAssignment.create({
        trainerId,
        clientId,
        status: 'active',
        assignedBy: trainerId, // self-assigned for diagnostic; admin would normally do this
      });
      console.log(`  [OK] Created assignment id=${created.id} status=active`);
      console.log(`\n[VERIFIED] trainer ${trainerId} is now actively assigned to client ${clientId}.`);
      process.exit(0);
    } else {
      console.log(`\nTo create one, re-run with --create flag.`);
      console.log(`OR create via the admin UI at /dashboard/admin/client-management.`);
      process.exit(4);
    }
  }

  console.log(`\n[diagnostic] Found ${all.length} assignment row(s):`);
  for (const row of all) {
    console.log(`  id=${row.id} status='${row.status}' assignedAt=${row.assignedAt} updatedAt=${row.updatedAt}`);
  }

  const active = all.find((r) => r.status === 'active');
  if (active) {
    console.log(`\n[VERIFIED] Active assignment exists. Phase A smoke and trainer-flow probes should now succeed.`);
    process.exit(0);
  } else {
    const latest = all[0];
    console.log(`\n[FINDING] Assignment exists but status='${latest.status}', not 'active'.`);
    if (shouldCreate) {
      console.log(`\n[create] --create flag passed. Updating status -> 'active'...`);
      await latest.update({ status: 'active' });
      console.log(`  [OK] Updated assignment id=${latest.id} status=active`);
      console.log(`\n[VERIFIED] trainer ${trainerId} is now actively assigned to client ${clientId}.`);
      process.exit(0);
    } else {
      console.log(`\nTo flip status -> 'active', re-run with --create flag.`);
      process.exit(5);
    }
  }
}

main().catch((err) => {
  console.error(`\n[ERROR] ${err?.message || err}`);
  if (err?.stack) console.error(err.stack);
  process.exit(99);
});
