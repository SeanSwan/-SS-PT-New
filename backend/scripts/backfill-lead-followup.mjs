#!/usr/bin/env node
/**
 * backfill-lead-followup.mjs — P0-1 (SWA-29) one-time, IDEMPOTENT backfill.
 *
 * WHY: leads captured before the model `beforeCreate` hook (Lead.mjs) have
 * `next_follow_up_at = NULL` forever, so the "leads needing follow-up" dashboard
 * (leadRoutes.mjs:54 filter + :120 KPI) under-reports the historical backlog.
 * This sets `next_follow_up_at = created_at + 24h` for OPEN leads (not converted/lost,
 * not soft-deleted) where it is currently NULL — matching the flat-24h backfill the
 * work order specifies (new leads get the tiered 2h/24h via the hook; historicals get 24h).
 *
 * IDEMPOTENT: the WHERE clause only touches rows where next_follow_up_at IS NULL, so a
 * second run updates 0 rows. Read-only-safe to dry-run with SWAN_BACKFILL_DRYRUN=1.
 *
 * Usage:  node backend/scripts/backfill-lead-followup.mjs
 *         SWAN_BACKFILL_DRYRUN=1 node backend/scripts/backfill-lead-followup.mjs   (count only)
 */
import 'dotenv/config';
import sequelize from '../database.mjs';

const DRY_RUN = process.env.SWAN_BACKFILL_DRYRUN === '1';

async function main() {
  await sequelize.authenticate();

  // sequelize.query(SELECT) returns [rows, metadata]; rows is [{ count }]. Destructure the
  // FIRST row's count (the earlier `[[{count}]] = [await ...]` form pulled `count` off the
  // rows-array itself → undefined; caught in the P0-2 hostile review 2026-07-22).
  const [countRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS count FROM leads
     WHERE next_follow_up_at IS NULL
       AND status NOT IN ('converted','lost')
       AND deleted_at IS NULL`
  );
  const eligible = Number(countRows?.[0]?.count ?? 0);
  console.log(`Eligible open leads with NULL next_follow_up_at: ${eligible}`);

  if (DRY_RUN) {
    console.log('DRY RUN — no rows written.');
    return;
  }
  if (eligible === 0) {
    console.log('Nothing to backfill (idempotent no-op).');
    return;
  }

  const [, updated] = await sequelize.query(
    `UPDATE leads
     SET next_follow_up_at = created_at + INTERVAL '24 hours', updated_at = NOW()
     WHERE next_follow_up_at IS NULL
       AND status NOT IN ('converted','lost')
       AND deleted_at IS NULL`
  );
  console.log(`Backfilled next_follow_up_at on ${updated?.rowCount ?? eligible} lead(s).`);
}

main()
  .then(() => sequelize.close())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('backfill-lead-followup FAILED:', err.message);
    sequelize.close().finally(() => process.exit(1));
  });
