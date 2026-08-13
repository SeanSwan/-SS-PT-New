#!/usr/bin/env node
/**
 * SCRIPT: generate-index-remediation.mjs — build (never run) the missing-index fix.
 * PURPOSE: Emit a reviewed, hand-executed SQL script that adds every index the
 *          models declare but the live database lacks.
 * SAFETY:  READ-ONLY against the database. Writes one .sql file for HUMAN review
 *          and deliberate off-peak execution. It never executes DDL itself.
 *
 * WHY THIS SHAPE (2026-08-12, SWA-157):
 * The drift audit found 112 declared-but-absent indexes in production — including
 * all 9 on daily_workout_forms, the trainer-logs-workout table. They are absent
 * because several models declare index `fields` by ATTRIBUTE name while the
 * columns are snake_case, so CREATE INDEX failed silently at creation time.
 *
 * Design decisions, each load-bearing:
 * - Every field is mapped attribute → column via rawAttributes[..].field, then
 *   VALIDATED against the live table's actual columns. An index whose columns
 *   cannot all be resolved is SKIPPED WITH A REASON, never guessed (fail-closed
 *   per index — a wrong guess here is a broken statement against production).
 * - `CREATE INDEX CONCURRENTLY IF NOT EXISTS` — CONCURRENTLY takes no
 *   write-blocking lock, which is the difference between remediation and an
 *   outage. It cannot run inside a transaction, so the output is plain
 *   statements with NO BEGIN/COMMIT, and the header documents the INVALID-index
 *   retry procedure for interrupted builds.
 * - Includes the waiver idempotency partial unique index
 *   (WHERE "idempotencyKey" IS NOT NULL): publicWaiverController:656 catches
 *   SequelizeUniqueConstraintError, but no such constraint exists anywhere —
 *   that recovery branch is dead code until this ships.
 *
 * USAGE:
 *   Rehearse (QA container):  PG_HOST=127.0.0.1 PG_PORT=15433 ... node scripts/generate-index-remediation.mjs --out c:/tmp/qa-indexes.sql
 *   Production (read-only):   node --env-file=<main-tree .env> scripts/generate-index-remediation.mjs --out c:/tmp/prod-indexes.sql
 */

import fs from 'node:fs';

if (!process.env.DATABASE_URL && !process.env.PG_HOST) {
  console.error('FATAL: set DATABASE_URL (production, via --env-file) or PG_HOST (QA container).');
  process.exit(2);
}

const outIdx = process.argv.indexOf('--out');
const outPath = outIdx > -1 ? process.argv[outIdx + 1] : 'index-remediation.sql';

const { default: sequelize } = await import('file:///C:/tmp/ss-qa-harness-slice0/backend/database.mjs');
const { default: getModels } = await import('file:///C:/tmp/ss-qa-harness-slice0/backend/models/associations.mjs');

const models = await getModels();

const [liveIndexRows] = await sequelize.query(
  `SELECT tablename AS table_name, indexname AS index_name FROM pg_indexes WHERE schemaname = 'public'`,
);
const liveIndexes = new Map();
for (const row of liveIndexRows) {
  if (!liveIndexes.has(row.table_name)) liveIndexes.set(row.table_name, new Set());
  liveIndexes.get(row.table_name).add(row.index_name);
}

const [liveColumnRows] = await sequelize.query(
  `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
);
const liveColumns = new Map();
for (const row of liveColumnRows) {
  if (!liveColumns.has(row.table_name)) liveColumns.set(row.table_name, new Set());
  liveColumns.get(row.table_name).add(row.column_name);
}

const statements = [];
const skipped = [];

for (const [name, model] of Object.entries(models)) {
  if (!model?.getTableName || !model.rawAttributes || !Array.isArray(model.options?.indexes)) continue;
  const table = String(model.getTableName()).replace(/"/g, '');
  const tableColumns = liveColumns.get(table);
  if (!tableColumns) continue; // table absent from this DB — separate finding, not an index problem

  // attribute name -> column name; also accept already-column-named fields.
  const toColumn = new Map();
  for (const [attr, def] of Object.entries(model.rawAttributes)) {
    const column = def.field || attr;
    toColumn.set(attr, column);
    toColumn.set(column, column);
  }

  for (const idx of model.options.indexes) {
    if (!idx?.name || !Array.isArray(idx.fields) || idx.fields.length === 0) continue;
    if (liveIndexes.get(table)?.has(idx.name)) continue; // already present

    const resolved = [];
    let unresolvable = null;
    for (const field of idx.fields) {
      const fieldName = typeof field === 'string' ? field : field?.name;
      const column = toColumn.get(fieldName);
      if (!column || !tableColumns.has(column)) {
        unresolvable = `field "${fieldName}" -> column "${column ?? '?'}" not in live ${table}`;
        break;
      }
      resolved.push(column);
    }
    if (unresolvable) {
      skipped.push({ model: name, table, index: idx.name, reason: unresolvable });
      continue;
    }

    const unique = idx.unique ? 'UNIQUE ' : '';
    const using = idx.using ? ` USING ${idx.using}` : '';
    const cols = resolved.map((c) => `"${c}"`).join(', ');
    statements.push(
      `CREATE ${unique}INDEX CONCURRENTLY IF NOT EXISTS "${idx.name}" ON "${table}"${using} (${cols});`,
    );
  }
}

// The waiver idempotency promise (model comment: "unique when present so a
// double-tap replays") — enforced nowhere today; the app's recovery catch for it
// is dead code. Partial unique matches "when present".
if (liveColumns.get('waiver_records')?.has('idempotencyKey')
  && !liveIndexes.get('waiver_records')?.has('waiver_records_idempotency_key_unique')) {
  statements.push(
    `CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "waiver_records_idempotency_key_unique" `
    + `ON "waiver_records" ("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;`,
  );
}

const header = `-- Index remediation, generated ${new Date().toISOString()}
-- READ FIRST — this file is reviewed and executed BY A HUMAN, off-peak, never by boot:
--   * CONCURRENTLY cannot run inside a transaction: run statements as-is, no BEGIN/COMMIT.
--   * Each statement briefly uses two table scans but takes NO write-blocking lock.
--   * If a build is interrupted it leaves an INVALID index: find with
--       SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
--     then DROP INDEX <name>; and re-run its statement.
--   * IF NOT EXISTS makes re-runs safe.
-- ${statements.length} statement(s); ${skipped.length} declared index(es) skipped as unresolvable (listed at end).

${statements.join('\n')}

-- SKIPPED (unresolvable against the live schema — fix the model declaration first):
${skipped.map((s) => `--   ${s.table} :: ${s.index} — ${s.reason}`).join('\n') || '--   (none)'}
`;

fs.writeFileSync(outPath, header, 'utf8');
console.log(`wrote ${outPath}: ${statements.length} statement(s), ${skipped.length} skipped`);
for (const s of skipped.slice(0, 10)) console.log(`  SKIP ${s.table} :: ${s.index} — ${s.reason}`);
if (skipped.length > 10) console.log(`  ... +${skipped.length - 10} more (see file)`);

await sequelize.close();
