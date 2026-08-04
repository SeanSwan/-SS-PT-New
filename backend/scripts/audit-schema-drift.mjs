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

// COVERAGE (round-2 depth, 2026-08-04): getModels() registers 163 models, but 9 more were
// db.define'd without registration (Hashtag/Faction/Party/SocialGroup families) and were
// therefore INVISIBLE to this auditor. Sweep sequelize.models too — anything defined
// anywhere gets audited, keyed with an unregistered:: prefix so provenance is obvious.
const registeredInstances = new Set(Object.values(models));
for (const m of Object.values(sequelize.models)) {
  if (!registeredInstances.has(m)) models['unregistered::' + m.name] = m;
}

// ---- live DB: columns ----
const [dbCols] = await sequelize.query(`
  SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
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

// ---- live DB: enum types with labels (round-2 depth: enum-VALUE drift) ----
const [dbEnums] = await sequelize.query(`
  SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE n.nspname = 'public'
  GROUP BY t.typname
`);
// pg may deliver array_agg as a native array OR as a '{a,b,c}' string depending on the
// query path — normalize both (the string form silently made EVERY label "missing" in
// the first v2 run: 136 false positives).
const pgArray = (v) => Array.isArray(v)
  ? v
  : String(v ?? '').replace(/^\{|\}$/g, '').split(',').map(s => s.replace(/^"|"$/g, '')).filter(Boolean);
const enumLabels = new Map(dbEnums.map(e => [e.typname, new Set(pgArray(e.labels))]));

// ---- live DB: unique constraints + unique indexes per table (round-2 depth) ----
// Every findOrCreate / upsert / ON CONFLICT silently depends on one of these existing.
const [dbUniques] = await sequelize.query(`
  SELECT c.relname AS table_name, i.relname AS index_name,
         array_agg(a.attname ORDER BY x.ordinality) AS columns
  FROM pg_index ix
  JOIN pg_class c ON c.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS x(attnum, ordinality)
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = x.attnum
  WHERE n.nspname = 'public' AND ix.indisunique AND c.relkind = 'r'
  GROUP BY c.relname, i.relname
`);
const uniquesByTable = new Map();
for (const u of dbUniques) {
  if (!uniquesByTable.has(u.table_name)) uniquesByTable.set(u.table_name, []);
  uniquesByTable.get(u.table_name).push(new Set(pgArray(u.columns)));
}
const hasUniqueOn = (table, cols) => {
  const sets = uniquesByTable.get(table) || [];
  return sets.some(s => s.size === cols.length && cols.every(c => s.has(c)));
};

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

  let missing = 0, typeConf = 0, deepConf = 0;
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

    // ---- ROUND-2 DEPTH (2026-08-04) ----
    // (a) allowNull drift, dangerous direction only: model permits omitting the value
    //     (allowNull !== false), but the DB requires it (NOT NULL, no default, not PK/serial).
    //     Every create() that omits it 500s at runtime while the model happily validates.
    const modelAllowsNull = attr.allowNull !== false && !attr.primaryKey;
    if (modelAllowsNull && dbCol.is_nullable === 'NO' && dbCol.column_default == null && !attr.autoIncrement) {
      deepConf++;
      findings.push({ class: 'nullability-drift', severity: 'HIGH', model: name, table: tn,
        attribute: attrName, column: col,
        note: 'Model allows null/omission but DB column is NOT NULL with no default — inserts omitting it will fail' });
    }
    // Lax direction (model stricter than DB) is informational only — the model still
    // enforces its own writes; raw SQL could sneak nulls in, but that is not a 500 class.
    if (attr.allowNull === false && !attr.primaryKey && dbCol.is_nullable === 'YES') {
      info.push({ class: 'nullability-lax-db', model: name, table: tn, attribute: attrName, column: col });
    }

    // (b) enum-VALUE drift: model enum labels the DB type lacks → inserts of those values
    //     throw 22P02. (DB-extra labels are informational: readable, never emitted.)
    const modelEnumValues = attr.values || attr.type?.values;
    if (sf === 'enum' && Array.isArray(modelEnumValues) && (dbCol.udt_name || '').startsWith('enum_')) {
      const live = enumLabels.get(dbCol.udt_name);
      if (live) {
        const missingLabels = modelEnumValues.filter(v => !live.has(v));
        if (missingLabels.length > 0) {
          deepConf++;
          findings.push({ class: 'enum-value-drift', severity: 'HIGH', model: name, table: tn,
            attribute: attrName, column: col, enumType: dbCol.udt_name,
            missingInDb: missingLabels,
            note: 'Model enum allows value(s) the live DB type lacks — inserting them fails' });
        }
        const extraInDb = [...live].filter(v => !modelEnumValues.includes(v));
        if (extraInDb.length > 0) {
          info.push({ class: 'enum-extra-in-db', model: name, table: tn, column: col,
            enumType: dbCol.udt_name, extraInDb });
        }
      }
    }

    // (c) single-column unique drift: model declares unique but no DB unique constraint/
    //     index exists → findOrCreate/upsert are not race-safe and ON CONFLICT targets fail.
    //     NOTE: `unique: '<groupName>'` (string form) declares a COMPOSITE group across all
    //     attributes sharing that string — collected below, NOT a single-column requirement
    //     (treating it as one produced 6 false positives in v2 round 2).
    if (attr.unique === true && !attr.primaryKey && !hasUniqueOn(tn, [col])) {
      deepConf++;
      findings.push({ class: 'unique-missing-in-db', severity: 'HIGH', model: name, table: tn,
        attribute: attrName, column: col,
        note: 'Model declares unique but live DB has no unique constraint/index on this column' });
    }
  }

  // (c1) string-named unique groups: attributes sharing unique:'name' form one composite.
  const uniqueGroups = new Map();
  for (const [attrName, attr] of attrs) {
    const u = attr.unique;
    const groupName = typeof u === 'string' ? u : (u && typeof u === 'object' && u.name ? u.name : null);
    if (groupName) {
      if (!uniqueGroups.has(groupName)) uniqueGroups.set(groupName, []);
      uniqueGroups.get(groupName).push(attr.field || attrName);
    }
  }
  for (const [groupName, cols] of uniqueGroups) {
    if (!hasUniqueOn(tn, cols)) {
      deepConf++;
      findings.push({ class: 'unique-missing-in-db', severity: 'HIGH', model: name, table: tn,
        columns: cols, group: groupName,
        note: 'Model declares a named composite unique the live DB does not have' });
    }
  }

  // (c2) composite uniques declared in model options.indexes — same hazard class.
  const attrToCol = new Map(attrs.map(([a, def]) => [a, def.field || a]));
  for (const idx of (model.options?.indexes || [])) {
    if (!idx?.unique || !Array.isArray(idx.fields) || idx.fields.length === 0) continue;
    const cols = idx.fields
      .map(f => (typeof f === 'string' ? f : f?.attribute || f?.name))
      .filter(Boolean)
      .map(f => attrToCol.get(f) || f);
    if (cols.length > 0 && !hasUniqueOn(tn, cols)) {
      deepConf++;
      findings.push({ class: 'unique-missing-in-db', severity: 'HIGH', model: name, table: tn,
        columns: cols,
        note: 'Model declares a composite unique index the live DB does not have' });
    }
  }

  for (const col of dbColsForTable.keys()) {
    if (!seen.has(col)) info.push({ class: 'db-extra-column', model: name, table: tn, column: col });
  }
  modelSummaries.push({ model: name, table: tn,
    status: missing || typeConf || deepConf ? 'DRIFT' : 'CLEAN',
    attrs: attrs.length, missing, typeConf, deepConf });
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
