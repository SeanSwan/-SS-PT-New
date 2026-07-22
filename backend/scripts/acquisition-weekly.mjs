#!/usr/bin/env node
/**
 * acquisition-weekly.mjs — P0-4 (SWA-29) the ONE weekly number Sean can say out loud.
 *
 * Rolls up the last 7 days of the funnel event stream (acquisition_events) into
 * captures → bookings → joins, per MEASUREMENT-CHARTER.md. Read-only.
 *
 * Usage:  node backend/scripts/acquisition-weekly.mjs
 */
import 'dotenv/config';
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();

  const [rows] = await sequelize.query(
    `SELECT event, COUNT(*)::int AS n
     FROM acquisition_events
     WHERE ts >= NOW() - INTERVAL '7 days'
     GROUP BY event
     ORDER BY event`
  );
  const by = Object.fromEntries(rows.map((r) => [r.event, r.n]));
  const n = (e) => by[e] ?? 0;

  console.log('\n=== Acquisition funnel — last 7 days ===');
  for (const r of rows) console.log(`  ${r.event.padEnd(22)} ${r.n}`);
  console.log('\nWeekly line: '
    + `visits ${n('visit')} → captures ${n('lead_captured')} → bookings ${n('booking_started') + n('scheduled')} → joins ${n('converted')}`);
  console.log(`Referral: shared ${n('ref_shared')} → landed ${n('ref_landed')} → converted ${n('ref_converted')}\n`);
}

main()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('acquisition-weekly FAILED:', err.message);
    sequelize.close().finally(() => process.exit(1));
  });
