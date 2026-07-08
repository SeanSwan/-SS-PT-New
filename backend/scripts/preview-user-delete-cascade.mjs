/**
 * preview-user-delete-cascade.mjs — READ-ONLY (prod data reset, packet §5 step 5)
 * ===============================================================================
 * Dry-run preview of the approved "Users" test-account deletion. Prints exactly
 * which rows in which tables would be removed / nulled / would BLOCK — counts and
 * table names only, ZERO PII (Rules 8/59). NOTHING is committed: the ground-truth
 * pass runs the delete inside a transaction and ALWAYS rolls back (there is no
 * .commit() anywhere in this file — grep it).
 *
 * SAFETY HALT: the live "Users" roster is partitioned into keep / delete /
 * UNCLASSIFIED. If any account is unclassified (e.g. a signup since the
 * 2026-07-07 inventory), the script HALTS — a destructive plan must never run
 * against a roster it doesn't fully recognize.
 *
 *   cd backend && node scripts/preview-user-delete-cascade.mjs
 */
import sequelize from '../database.mjs';
import { KEEP, DELETE_IDS } from './userResetLists.mjs';

const DELETE_RULE = {
  a: 'NO ACTION', r: 'RESTRICT', c: 'CASCADE', n: 'SET NULL', d: 'SET DEFAULT',
};

async function baseTables() {
  const [rows] = await sequelize.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return rows.map((r) => r.table_name);
}

async function countAll(tables, transaction) {
  const counts = {};
  for (const t of tables) {
    if (!t) continue;
    try {
      const [[row]] = await sequelize.query(`SELECT COUNT(*)::int AS n FROM "${t}"`, { transaction });
      counts[t] = row.n;
    } catch (e) {
      // A view/partition/unselectable relation must not abort the whole preview.
      console.log(`  (skip count for "${t}": ${e.message.slice(0, 60)})`);
    }
  }
  return counts;
}

async function main() {
  sequelize.options.logging = false; // keep the receipt clean — counts, not SQL
  console.log('=== USER DELETE CASCADE PREVIEW (read-only, rollback-only) ===');
  console.log(`keep=${KEEP.length} ids [${KEEP.join(',')}]  delete=${DELETE_IDS.length} ids [${DELETE_IDS.join(',')}]\n`);

  // ── SAFETY HALT: partition the live canonical roster ──────────────────────
  const [roster] = await sequelize.query('SELECT id, role FROM "Users" ORDER BY id');
  const keepSet = new Set(KEEP);
  const delSet = new Set(DELETE_IDS);
  const unclassified = roster.filter((u) => !keepSet.has(u.id) && !delSet.has(u.id));
  const keepPresent = roster.filter((u) => keepSet.has(u.id)).map((u) => u.id);
  const delPresent = roster.filter((u) => delSet.has(u.id)).map((u) => u.id);

  console.log(`Live "Users" roster: ${roster.length} rows`);
  console.log(`  keep present:   ${keepPresent.length}/${KEEP.length} [${keepPresent.join(',')}]`);
  console.log(`  delete present: ${delPresent.length}/${DELETE_IDS.length} [${delPresent.join(',')}]`);
  if (unclassified.length > 0) {
    console.log(`\n⛔ HALT — ${unclassified.length} UNCLASSIFIED account(s) in the live roster:`);
    for (const u of unclassified) console.log(`     id=${u.id} role=${u.role} — classify (keep or delete) before any delete runs`);
    console.log('   Not previewing a delete against an unrecognized roster. Update the lists, re-run.');
    await sequelize.close();
    process.exit(2);
  }
  const missingKeep = KEEP.filter((id) => !keepPresent.includes(id));
  if (missingKeep.length) console.log(`  ⚠️ keep ids not found live (already gone?): [${missingKeep.join(',')}]`);
  console.log('  ✓ every live account is classified — safe to preview.\n');

  // ── Direct FK-child scope (read-only): rows each delete-id owns ────────────
  const [fks] = await sequelize.query(`
    SELECT rel.relname AS child_table, att.attname AS child_col,
           con.confdeltype AS del, con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class confrel ON confrel.oid = con.confrelid
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
    WHERE con.contype = 'f' AND confrel.relname = 'Users'
    ORDER BY rel.relname, att.attname
  `);

  console.log(`── Direct children of "Users" (${fks.length} FK columns) — rows owned by delete-ids ──`);
  const blockers = [];
  let directDeleteRows = 0;
  let directNullRows = 0;
  for (const fk of fks) {
    const [[row]] = await sequelize.query(
      `SELECT COUNT(*)::int AS n FROM "${fk.child_table}" WHERE "${fk.child_col}" IN (:ids)`,
      { replacements: { ids: DELETE_IDS } },
    );
    if (row.n === 0) continue;
    const rule = DELETE_RULE[fk.del] || fk.del;
    const effect = rule === 'CASCADE' ? 'deleted'
      : rule === 'SET NULL' || rule === 'SET DEFAULT' ? 'orphaned-field-cleared'
        : 'BLOCKS (needs explicit pre-delete)';
    console.log(`  ${fk.child_table}.${fk.child_col}: ${row.n} rows · ${rule} → ${effect}`);
    if (rule === 'CASCADE') directDeleteRows += row.n;
    else if (rule.startsWith('SET')) directNullRows += row.n;
    else blockers.push({ table: fk.child_table, col: fk.child_col, rows: row.n, rule });
  }
  console.log(`  Σ direct: ${directDeleteRows} cascade-deleted · ${directNullRows} field-cleared · ${blockers.length} blocking FK(s)\n`);

  // ── Shared-data flags: conversations/messages spanning keep + delete ──────
  console.log('── Shared-data flags (keep⇄delete co-occurrence) ──');
  try {
    const [[conv]] = await sequelize.query(`
      SELECT COUNT(*)::int AS n FROM (
        SELECT conversation_id FROM conversation_participants WHERE user_id IN (:del)
        INTERSECT
        SELECT conversation_id FROM conversation_participants WHERE user_id IN (:keep)
      ) shared
    `, { replacements: { del: DELETE_IDS, keep: KEEP } });
    console.log(`  conversations shared between a keep and a delete user: ${conv.n}` +
      (conv.n > 0 ? ' — deleting the delete-user\'s participant row is fine; flag for Sean that the thread stays with the keep user' : ''));
  } catch (e) {
    console.log(`  conversation_participants check skipped: ${e.message.slice(0, 80)}`);
  }
  console.log('');

  // ── Ground-truth pass: DELETE inside a transaction, ALWAYS rollback ───────
  console.log('── Ground-truth cascade (transaction → ROLLBACK, never committed) ──');
  const tables = await baseTables();
  const t = await sequelize.transaction();
  try {
    const before = await countAll(tables, t);
    await sequelize.query('DELETE FROM "Users" WHERE id IN (:ids)', { replacements: { ids: DELETE_IDS }, transaction: t });
    const after = await countAll(tables, t);
    await t.rollback();
    let total = 0;
    const deltas = tables
      .map((tb) => ({ tb, d: before[tb] - after[tb] }))
      .filter((x) => x.d > 0)
      .sort((a, b) => b.d - a.d);
    for (const { tb, d } of deltas) { console.log(`  ${tb}: -${d}`); total += d; }
    console.log(`  ✅ delete succeeds (all cascades resolve) — ${total} total rows removed across ${deltas.length} tables. ROLLED BACK.`);
  } catch (e) {
    await t.rollback();
    const m = e.message.match(/on table "([^"]+)"/);
    console.log(`  ⛔ delete would BLOCK: ${e.message.split('\n')[0]}`);
    if (m) console.log(`     → child table "${m[1]}" needs an explicit ordered pre-delete in the real step-6 script.`);
    console.log('  (transaction rolled back — nothing changed)');
  }

  console.log('\n=== PREVIEW COMPLETE — read-only, nothing changed. Step 6 (real deletes) awaits Sean\'s go on this receipt. ===');
  await sequelize.close();
}

main().catch(async (err) => {
  console.error('preview failed:', err.message);
  try { await sequelize.close(); } catch { /* already closed */ }
  process.exit(1);
});
