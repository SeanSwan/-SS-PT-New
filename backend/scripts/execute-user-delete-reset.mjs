/**
 * execute-user-delete-reset.mjs — DESTRUCTIVE (prod data reset, packet §5 step 6)
 * ===============================================================================
 * ⚠️ HARD-DELETES the 24 approved test/QA/duplicate accounts from "Users" and
 *    everything that cascades from them. Sean-gated; runs ONLY with an explicit
 *    flag; commits ONLY if post-delete verification passes; otherwise rolls back.
 *
 * SAFETY LAYERS (all must hold or it aborts without committing):
 *  1. DRY-RUN BY DEFAULT — bare `node execute-user-delete-reset.mjs` previews the
 *     plan and exits. Pass `--confirm-delete` to actually run.
 *  2. ROSTER HALT — the live "Users" roster must partition exactly into the
 *     approved keep + delete lists; any unclassified account aborts.
 *  3. ORDERED PRE-DELETES — the two NON-cascade blockers found in the preview
 *     (workout_plans.userId NO ACTION, video_catalog.creator_id RESTRICT) are
 *     deleted first, inside the same transaction, so the "Users" delete cascades.
 *  4. VERIFY-BEFORE-COMMIT — after the deletes (still uncommitted) it asserts:
 *     surviving "Users" == the keep-list exactly, AND immigration_documents 41 /
 *     immigration_tasks 53 UNCHANGED. Mismatch → ROLLBACK. Only a clean verify
 *     commits.
 *  5. SNAPSHOT — the packet requires a fresh Render PG snapshot immediately
 *     before running this (the FK-re-point snapshot predates it).
 *
 *   PREVIEW:  cd backend && node scripts/execute-user-delete-reset.mjs
 *   EXECUTE:  cd backend && node scripts/execute-user-delete-reset.mjs --confirm-delete
 */
import sequelize from '../database.mjs';
import { KEEP, DELETE_IDS } from './userResetLists.mjs';

const CONFIRMED = process.argv.includes('--confirm-delete');
const IMMIGRATION_DOCS_EXPECTED = 41;
const IMMIGRATION_TASKS_EXPECTED = 53;

// The two blockers the preview surfaced (non-CASCADE FKs to "Users"): delete
// the delete-owned child rows first so the "Users" delete can cascade the rest.
const PRE_DELETES = [
  { sql: 'DELETE FROM workout_plans WHERE "userId" IN (:ids)', label: 'workout_plans.userId (NO ACTION blocker)' },
  { sql: 'DELETE FROM video_catalog WHERE creator_id IN (:ids)', label: 'video_catalog.creator_id (RESTRICT blocker)' },
];

async function main() {
  sequelize.options.logging = false;
  console.log('=== USER DELETE RESET — EXECUTOR ===');
  console.log(CONFIRMED ? '⚠️  --confirm-delete SET: will COMMIT if verification passes.\n'
    : 'DRY RUN (no --confirm-delete): planning only, no writes.\n');

  // Roster halt (identical gate to the preview).
  const [roster] = await sequelize.query('SELECT id FROM "Users" ORDER BY id');
  const keepSet = new Set(KEEP);
  const delSet = new Set(DELETE_IDS);
  const unclassified = roster.filter((u) => !keepSet.has(u.id) && !delSet.has(u.id));
  if (unclassified.length > 0) {
    console.log(`⛔ HALT — ${unclassified.length} unclassified account(s): [${unclassified.map((u) => u.id).join(',')}]. Aborting.`);
    await sequelize.close();
    process.exit(2);
  }
  const delPresent = roster.filter((u) => delSet.has(u.id)).map((u) => u.id);
  const keepPresent = roster.filter((u) => keepSet.has(u.id)).map((u) => u.id);
  console.log(`Roster ${roster.length}: keep ${keepPresent.length}/${KEEP.length}, delete ${delPresent.length} present — all classified.`);
  console.log(`Delete targets present: [${delPresent.join(',')}]\n`);

  if (!CONFIRMED) {
    console.log('DRY RUN complete. Re-run with --confirm-delete (after a fresh PG snapshot) to execute.');
    await sequelize.close();
    return;
  }

  const t = await sequelize.transaction();
  try {
    for (const step of PRE_DELETES) {
      const [, meta] = await sequelize.query(step.sql, { replacements: { ids: DELETE_IDS }, transaction: t });
      console.log(`  pre-delete ${step.label}: removed ${meta?.rowCount ?? '?'} rows`);
    }
    const [, delMeta] = await sequelize.query('DELETE FROM "Users" WHERE id IN (:ids)', {
      replacements: { ids: DELETE_IDS }, transaction: t,
    });
    console.log(`  DELETE "Users": removed ${delMeta?.rowCount ?? '?'} rows (+ cascades)\n`);

    // ── VERIFY (uncommitted) ──
    const [survivors] = await sequelize.query('SELECT id FROM "Users" ORDER BY id', { transaction: t });
    const survivorIds = survivors.map((s) => s.id);
    const survivorsAreKeepOnly = survivorIds.length === keepPresent.length
      && survivorIds.every((id) => keepSet.has(id));

    const [[docs]] = await sequelize.query('SELECT COUNT(*)::int AS n FROM immigration_documents', { transaction: t });
    const [[tasks]] = await sequelize.query('SELECT COUNT(*)::int AS n FROM immigration_tasks', { transaction: t });
    const immigrationIntact = docs.n === IMMIGRATION_DOCS_EXPECTED && tasks.n === IMMIGRATION_TASKS_EXPECTED;

    console.log(`  verify · survivors=[${survivorIds.join(',')}] keep-only=${survivorsAreKeepOnly}`);
    console.log(`  verify · immigration docs=${docs.n}/${IMMIGRATION_DOCS_EXPECTED} tasks=${tasks.n}/${IMMIGRATION_TASKS_EXPECTED} intact=${immigrationIntact}`);

    if (survivorsAreKeepOnly && immigrationIntact) {
      await t.commit();
      console.log('\n✅ COMMITTED — roster is the keep-list only; immigration data intact.');
    } else {
      await t.rollback();
      console.log('\n⛔ VERIFY FAILED — ROLLED BACK, nothing changed. Investigate before retrying.');
      process.exitCode = 3;
    }
  } catch (e) {
    await t.rollback();
    console.log(`\n⛔ ERROR — ROLLED BACK, nothing changed: ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  }

  await sequelize.close();
}

main().catch(async (err) => {
  console.error('executor failed:', err.message);
  try { await sequelize.close(); } catch { /* already closed */ }
  process.exit(1);
});
