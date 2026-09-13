#!/usr/bin/env node
/**
 * Inspect client-schedule truth: user role census + session ownership counts.
 * Diagnostic helper — READ-ONLY. Prints aggregate counts only, no PII.
 *
 * Context 2026-09-12: client dashboard schedule (client mode) shows
 * "No Upcoming Sessions" while admin/trainer schedules render. Hypothesis:
 * unified GET /api/sessions RBAC returns [] for role 'user'
 * (session.service.mjs "social-only accounts" branch) — probe decides.
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();

  const [roles] = await sequelize.query(
    `SELECT role, COUNT(*)::int AS count
     FROM "Users"
     GROUP BY role
     ORDER BY count DESC`
  );
  console.log('\nUser role census:');
  for (const r of roles) {
    console.log(`  ${String(r.role).padEnd(10)} ${r.count}`);
  }

  const [sessionStatus] = await sequelize.query(
    `SELECT status, COUNT(*)::int AS count,
            COUNT("userId")::int AS owned_by_client
     FROM sessions
     GROUP BY status
     ORDER BY count DESC`
  );
  console.log('\nSession status census (owned_by_client = rows with a userId):');
  for (const s of sessionStatus) {
    console.log(`  ${String(s.status).padEnd(12)} total=${String(s.count).padEnd(6)} owned=${s.owned_by_client}`);
  }

  const [ownershipByRole] = await sequelize.query(
    `SELECT u.role, COUNT(*)::int AS session_count
     FROM sessions s
     JOIN "Users" u ON s."userId" = u.id
     GROUP BY u.role
     ORDER BY session_count DESC`
  );
  console.log('\nSessions joined to owning user, by user role:');
  for (const o of ownershipByRole) {
    console.log(`  ${String(o.role).padEnd(10)} ${o.session_count}`);
  }

  const [upcomingByRole] = await sequelize.query(
    `SELECT u.role, COUNT(*)::int AS upcoming_count
     FROM sessions s
     JOIN "Users" u ON s."userId" = u.id
     WHERE s."sessionDate" >= NOW()
       AND s.status IN ('scheduled', 'confirmed')
     GROUP BY u.role
     ORDER BY upcoming_count DESC`
  );
  console.log('\nUpcoming scheduled/confirmed sessions by owning user role:');
  for (const o of upcomingByRole) {
    console.log(`  ${String(o.role).padEnd(10)} ${o.upcoming_count}`);
  }

  const [availableSlots] = await sequelize.query(
    `SELECT COUNT(*)::int AS count
     FROM sessions
     WHERE status = 'available' AND "userId" IS NULL`
  );
  console.log(`\nBookable available slots (status='available', userId IS NULL): ${availableSlots[0].count}`);

  const [waiverByRole] = await sequelize.query(
    `SELECT u.role,
            COUNT(*)::int AS users,
            COUNT(wr.id)::int AS with_linked_waiver
     FROM "Users" u
     LEFT JOIN waiver_records wr
       ON wr."userId" = u.id AND wr.status = 'linked'
     WHERE u.role IN ('client', 'user')
     GROUP BY u.role`
  );
  console.log('\nWaiver linkage for gated roles (client/user must have a linked waiver):');
  for (const w of waiverByRole) {
    console.log(`  ${String(w.role).padEnd(10)} users=${w.users} with_linked_waiver=${w.with_linked_waiver}`);
  }

  await sequelize.close();
  console.log('\nDONE (read-only)');
}

main().catch((err) => {
  console.error('PROBE FAILED:', err.message);
  process.exit(1);
});
