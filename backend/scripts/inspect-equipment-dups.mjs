#!/usr/bin/env node
/**
 * Inspect duplicate (profileId, lower(name)) equipment_items rows BEFORE the
 * P0.3 partial-unique-index migration.
 * ============================================================================
 * A UNIQUE INDEX cannot be created if violating rows already exist — CREATE
 * UNIQUE INDEX would fail and crash the Render deploy (migrations auto-run at
 * boot). This probe reports, per candidate index scope, how many duplicate
 * groups exist and which ones, so we know whether the migration is safe to ship
 * as-is or whether the offending rows must be deduped/merged first.
 *
 * READ-ONLY. SELECT statements only — no INSERT/UPDATE/DELETE/DDL. Connects via
 * the app's own DATABASE_URL (same connection `npm run dev` uses); the URL is
 * loaded inside database.mjs and never printed.
 */
import 'dotenv/config';
import sequelize from '../database.mjs';

// Candidate partial-index scopes, tightest → widest. We pick the scope whose
// duplicate count is 0 (or reconcile down to 0 before shipping the index).
const SCOPES = [
  { label: 'active only', where: `"isActive" = true` },
  { label: 'active + approved/manual', where: `"isActive" = true AND "approvalStatus" IN ('approved','manual')` },
  { label: 'ALL rows (widest)', where: `1=1` },
];

async function main() {
  await sequelize.authenticate();

  // Rule 58 schema-drift check: the EquipmentItem model DECLARES a unique index
  // idx_equipment_item_profile_name on (profileId, name). Confirm whether the
  // PROD DB actually has it — if present, P0.3 is already satisfied; if absent,
  // the model/DB have drifted and the migration must create it.
  const [indexes] = await sequelize.query(
    `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'equipment_items' ORDER BY indexname`
  );
  console.log(`\nexisting indexes on equipment_items (${indexes.length}):`);
  for (const ix of indexes) console.log(`  ${ix.indexname}\n      ${ix.indexdef}`);

  const [totals] = await sequelize.query(
    `SELECT CAST(count(*) AS integer) AS total,
            CAST(count(*) FILTER (WHERE "isActive" = true) AS integer) AS active
     FROM equipment_items`
  );
  console.log(`\nequipment_items: total=${totals[0].total}  active=${totals[0].active}`);

  for (const scope of SCOPES) {
    const [groups] = await sequelize.query(
      `SELECT "profileId", lower(name) AS name_key, CAST(count(*) AS integer) AS n
       FROM equipment_items
       WHERE ${scope.where}
       GROUP BY "profileId", lower(name)
       HAVING count(*) > 1
       ORDER BY n DESC, "profileId"`
    );
    const offending = groups.reduce((s, g) => s + Number(g.n), 0);
    console.log(`\n[${scope.label}] duplicate (profileId, lower(name)) groups: ${groups.length}; offending rows: ${offending}`);
    for (const g of groups.slice(0, 25)) {
      // Redact 8+ digit numeric ids per the read-only launcher rule (equipment
      // profile ids are normally small ints; guard anyway).
      const pid = String(g.profileId);
      const pidShown = pid.replace(/[^0-9]/g, '').length >= 8 ? '<REDACTED-NUM>' : pid;
      console.log(`   profileId=${pidShown}  name="${g.name_key}"  count=${g.n}`);
    }
    if (groups.length > 25) console.log(`   ... +${groups.length - 25} more groups`);
  }

  console.log(`\nVERDICT GUIDE:`);
  console.log(`  0 groups in the scope we choose  => that partial UNIQUE INDEX is safe to auto-run on deploy.`);
  console.log(`  >0 groups                        => dedupe/merge those rows FIRST, else CREATE UNIQUE INDEX crashes the Render boot.`);
}

main()
  .then(async () => { await sequelize.close(); process.exit(0); })
  .catch(async (e) => {
    console.error('\ninspect-equipment-dups FAILED:', e.message);
    try { await sequelize.close(); } catch { /* already closed */ }
    process.exit(1);
  });
