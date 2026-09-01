#!/usr/bin/env node
/**
 * inspect-plaud-approval-state.mjs
 * =================================
 * Slice 0 probe P1 for the PLAUD approval-seam fix (F1/F2).
 * Read-only diagnostic — no writes, no PII output (counts + schema only).
 *
 * Answers:
 *   1. Does plaud_merge_requests.approved_workout_form_id still carry its
 *      FK to daily_workout_forms in the REAL database? (F1 runtime truth)
 *   2. Has any row ever been written to approved_workout_form_id?
 *   3. Merge-request status distribution (how much live data the fix touches).
 *   4. Clip counts by source (has official sync ever landed clips?).
 *
 * See: docs/ai-workflow/AI-HANDOFF/PLAUD-AUTO-INGEST-REBUILD-BLUEPRINT-2026-09-01.md
 */

import 'dotenv/config';
import sequelize from '../database.mjs';

async function main() {
  await sequelize.authenticate();

  const [columns] = await sequelize.query(
    `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
      WHERE table_name = 'plaud_merge_requests'
      ORDER BY ordinal_position`
  );
  console.log('\nplaud_merge_requests columns:');
  for (const c of columns) {
    console.log(`  ${c.column_name.padEnd(30)} ${c.data_type.padEnd(28)} nullable=${c.is_nullable}`);
  }

  const [fks] = await sequelize.query(
    `SELECT tc.constraint_name, kcu.column_name, ccu.table_name AS fk_target_table, ccu.column_name AS fk_target_column
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
      WHERE tc.table_name = 'plaud_merge_requests' AND tc.constraint_type = 'FOREIGN KEY'`
  );
  console.log('\nplaud_merge_requests foreign keys:');
  for (const fk of fks) {
    console.log(`  ${fk.column_name} -> ${fk.fk_target_table}(${fk.fk_target_column})   [${fk.constraint_name}]`);
  }

  const [statusCounts] = await sequelize.query(
    `SELECT status, COUNT(*)::int AS n FROM plaud_merge_requests GROUP BY status ORDER BY n DESC`
  );
  console.log('\nmerge-request status distribution:');
  for (const r of statusCounts) console.log(`  ${String(r.status).padEnd(12)} ${r.n}`);

  const [[formIdRow]] = await sequelize.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(approved_workout_form_id)::int AS with_form_id
       FROM plaud_merge_requests`
  );
  console.log(`\ntotal merge requests: ${formIdRow.total}; approved_workout_form_id NOT NULL: ${formIdRow.with_form_id}`);

  const [clipCounts] = await sequelize.query(
    `SELECT clip_source, COUNT(*)::int AS n, MAX(uploaded_at) AS latest
       FROM plaud_clips GROUP BY clip_source ORDER BY n DESC`
  );
  console.log('\nplaud_clips by source:');
  for (const r of clipCounts) console.log(`  ${String(r.clip_source).padEnd(22)} ${String(r.n).padEnd(6)} latest=${r.latest ? new Date(r.latest).toISOString() : 'n/a'}`);

  await sequelize.close();
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
