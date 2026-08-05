/**
 * dump-live-enums.mjs — regenerate tests/fixtures/live-enum-labels.json
 * =====================================================================
 * READ-ONLY. Snapshots every pg_enum type + its labels from the live database so
 * `tests/unit/enumLabelDrift.test.mjs` can verify model enums against database truth
 * without a DB connection in CI.
 *
 * Usage:  node --env-file=.env scripts/dump-live-enums.mjs
 *
 * Run this after ANY migration that creates an enum type or adds a label. The drift test
 * unions this snapshot with labels added by migration files, so a new migration will not
 * false-alarm before you regenerate — but a stale snapshot weakens the guard, so refresh it.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outPath = path.join(backend, 'tests', 'fixtures', 'live-enum-labels.json');

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL not set. Pass --env-file.');
  process.exit(2);
}

const { default: sequelize } = await import('../database.mjs');
const [rows] = await sequelize.query(`
  SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
  FROM pg_type t
  JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  GROUP BY t.typname
  ORDER BY t.typname
`);

// pg may hand back array_agg as a native array or as a '{a,b}' string — normalize both.
const pgArray = (v) => Array.isArray(v)
  ? v
  : String(v ?? '').replace(/^\{|\}$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).filter(Boolean);

const labels = {};
for (const r of rows) labels[r.typname] = pgArray(r.labels);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({
  _note: 'GENERATED SNAPSHOT of live production pg_enum labels. Regenerate with: '
    + 'node --env-file=.env scripts/dump-live-enums.mjs. Do NOT hand-edit — if a label is '
    + 'missing here, add it to the DB with a migration, do not add it to this file.',
  capturedAt: new Date().toISOString().slice(0, 10),
  typeCount: Object.keys(labels).length,
  labels,
}, null, 1));

console.log(`Wrote ${Object.keys(labels).length} enum types -> ${outPath}`);
await sequelize.close();
