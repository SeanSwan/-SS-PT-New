/**
 * audit-schema-drift.mjs — READ-ONLY live-DB vs Sequelize-model drift auditor
 * ===========================================================================
 * Loads every model's runtime shape (tableName + rawAttributes) via
 * models/associations.mjs and diffs it against the live database's
 * information_schema. Zero writes: only SELECTs against information_schema.
 *
 * Drift classes detected (CLAUDE.md Rule 58):
 *   1. table-missing      — model's table does not exist in DB
 *   2. column-missing     — model attribute's column does not exist in DB
 *   3. type-conflict      — glaring type mismatch (int vs text, uuid vs int, ...)
 *   4. fk-to-dead-users   — FK constraint referencing lowercase `users` table
 *   5. db-extra-column    — DB column with no model attribute (informational)
 *
 * Usage:
 *   node --env-file=<path-to-.env> scripts/audit-schema-drift.mjs --out <report.json>
 *
 * Output: JSON report at --out (schema metadata only — no data rows, no secrets).
 */
import fs from 'fs';
import path from 'path';

const outIdx = process.argv.indexOf('--out');
const outPath = outIdx > -1 ? process.argv[outIdx + 1] : 'schema-drift-report.json';

if (!process.env.DATABASE_URL) {
  console.error('FATAL: DATABASE_URL not set. Pass --env-file to node.');
  process.exit(2);
}

const { default: sequelize } = await import('../database.mjs');
const { default: getModels } = await import('../models/associations.mjs');

const models = await getModels();

// ---- live DB: columns ----
const [dbCols] = await sequelize.query(`
  SELECT table_name, column_name, data_type, udt_name, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
  ORDER BY table_name, ordinal_position
`);
const dbTables = new Map(); // table_name -> Map(column_name -> {data_type, udt_name})
for (const c of dbCols) {
  if (!dbTables.has(c.table_name)) dbTables.set(c.table_name, new Map());
  dbTables.get(c.table_name).set(c.column_name, c);
}

// ---- live DB: FK constraints ----
const [dbFks] = await sequelize.query(`
  SELECT tc.constraint_name, tc.table_name, kcu.column_name,
         ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
`);

// ---- conservative type compatibility ----
// map pg data_type/udt_name into coarse families
function pgFamily(col) {
  const dt = (col.data_type || '').toLowerCase();
  const udt = (col.udt_name || '').toLowerCase();
  if (dt.includes('int') || udt.startsWith('int')) return 'int';
  if (udt === 'uuid') return 'uuid';
  if (dt === 'boolean') return 'bool';
  if (dt.includes('timestamp') || dt === 'date') return 'time';
  if (dt === 'numeric' || dt === 'real' || dt === 'double precision') return 'num';
  if (udt === 'json' || udt === 'jsonb') return 'json';
  if (dt === 'array') return 'array';
  if (dt === 'user-defined') return 'enum';
  return 'text'; // varchar, text, char, citext...
}
function seqFamily(attr) {
  const key = attr.type?.constructor?.name || String(attr.type);
  const k = key.toUpperCase();
  if (k.includes('UUID')) return 'uuid';
  if (k.includes('INTEGER') || k.includes('BIGINT') || k.includes('SMALLINT')) return 'int';
  if (k.includes('BOOLEAN')) return 'bool';
  if (k.includes('DATE')) return 'time'; // DATE + DATEONLY
  if (k.includes('FLOAT') || k.includes('DOUBLE') || k.includes('DECIMAL') || k.includes('REAL') || k.includes('NUMERIC')) return 'num';
  if (k.includes('JSON')) return 'json';
  if (k.includes('ARRAY') || k.includes('RANGE')) return 'array';
  if (k.includes('ENUM')) return 'enum';
  if (k.includes('VIRTUAL')) return 'virtual';
  return 'text';
}
// families considered interchangeable enough to NOT flag.
// NOTE: 'time|text' deliberately NOT soft-ok'd (Kimi review 2026-08-03) — a STRING attribute
// over a timestamp column (or vice versa) is a real drift class and must surface.
const softOk = new Set(['enum|text', 'text|enum', 'json|text', 'text|json',
  'num|int', 'int|num', 'array|text', 'text|array']);

const findings = [];
const info = [];
const modelSummaries = [];

for (const [name, model] of Object.entries(models)) {
  if (!model || typeof model.getTableName !== 'function' || !model.rawAttributes) continue;
  let tn = model.getTableName();
  if (typeof tn === 'object') tn = tn.tableName;
  // User.mjs declares tableName: '"Users"' (quotes INSIDE the string — a legacy hack that
  // works because Sequelize's quoteIdentifier short-circuits on pre-quoted input). Strip
  // embedded quotes so the name matches information_schema, which stores it unquoted.
  tn = tn.replace(/"/g, '');
  const dbColsForTable = dbTables.get(tn);
  const attrs = Object.entries(model.rawAttributes);

  if (!dbColsForTable) {
    findings.push({ class: 'table-missing', severity: 'CRITICAL', model: name, table: tn,
      note: 'Model table not found in live DB (model dormant/never-migrated, or table name drift)' });
    modelSummaries.push({ model: name, table: tn, status: 'TABLE-MISSING', attrs: attrs.length });
    continue;
  }

  let missing = 0, typeConf = 0;
  const seen = new Set();
  for (const [attrName, attr] of attrs) {
    const sf = seqFamily(attr);
    if (sf === 'virtual') continue;
    const col = attr.field || attrName;
    seen.add(col);
    const dbCol = dbColsForTable.get(col);
    if (!dbCol) {
      missing++;
      findings.push({ class: 'column-missing', severity: 'CRITICAL', model: name, table: tn,
        attribute: attrName, column: col,
        note: 'Model attribute maps to a column that does not exist in live DB' });
      continue;
    }
    const pf = pgFamily(dbCol);
    if (sf !== pf && !softOk.has(sf + '|' + pf)) {
      typeConf++;
      findings.push({ class: 'type-conflict', severity: 'HIGH', model: name, table: tn,
        attribute: attrName, column: col, modelFamily: sf, dbFamily: pf,
        dbType: dbCol.data_type + '/' + dbCol.udt_name });
    }
  }
  for (const col of dbColsForTable.keys()) {
    if (!seen.has(col)) info.push({ class: 'db-extra-column', model: name, table: tn, column: col });
  }
  modelSummaries.push({ model: name, table: tn, status: missing || typeConf ? 'DRIFT' : 'CLEAN',
    attrs: attrs.length, missing, typeConf });
}

// FK constraints referencing the dead lowercase `users` table
for (const fk of dbFks) {
  if (fk.foreign_table === 'users') {
    findings.push({ class: 'fk-to-dead-users', severity: 'CRITICAL',
      table: fk.table_name, column: fk.column_name, constraint: fk.constraint_name,
      note: 'Live FK constraint targets lowercase `users` (dead table) instead of "Users"' });
  }
}

// tables in DB not covered by any model (informational)
const modelTables = new Set(modelSummaries.map(m => m.table));
const orphanTables = [...dbTables.keys()].filter(t => !modelTables.has(t));

const report = {
  generatedAt: new Date().toISOString(),
  db: { tables: dbTables.size, fks: dbFks.length },
  models: { total: modelSummaries.length,
    clean: modelSummaries.filter(m => m.status === 'CLEAN').length,
    drift: modelSummaries.filter(m => m.status === 'DRIFT').length,
    tableMissing: modelSummaries.filter(m => m.status === 'TABLE-MISSING').length },
  findings, modelSummaries, orphanTables, dbExtraColumns: info,
};
fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

const classCounts = {};
for (const f of findings) classCounts[f.class] = (classCounts[f.class] || 0) + 1;

console.log(`\n=== SCHEMA DRIFT AUDIT ===`);
console.log(`DB tables: ${dbTables.size} | models checked: ${modelSummaries.length}`);
console.log(`CLEAN: ${report.models.clean} | DRIFT: ${report.models.drift} | TABLE-MISSING: ${report.models.tableMissing}`);
// fk-to-dead-users is a LIVE-CONSTRAINT class, not a model class — it never moves the
// model summary above, so it gets its own headline (Kimi review 2026-08-03: a packet
// quoting only "N clean / 0 drift" must not be able to elide live FK poison).
console.log(`FK-TO-DEAD-USERS (live constraints): ${classCounts['fk-to-dead-users'] || 0}`);
console.log(`Findings by class: ${JSON.stringify(classCounts)} (report: ${outPath})`);
for (const f of findings.slice(0, 60)) {
  console.log(`  [${f.severity}] ${f.class} ${f.model || f.table}${f.column ? '.' + f.column : ''}${f.dbType ? ' db=' + f.dbType + ' model=' + f.modelFamily : ''}`);
}
if (findings.length > 60) console.log(`  ... +${findings.length - 60} more (see JSON)`);
await sequelize.close();
process.exit(0);
