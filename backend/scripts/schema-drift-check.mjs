#!/usr/bin/env node
/**
 * schema-drift-check.mjs — deterministic Sequelize-vs-live-DB drift detector.
 *
 * WHY: schema drift is a documented recurring bug class in this repo (CLAUDE.md rule 58).
 * The model file declares one shape, the live database has another, and the mismatch only
 * surfaces at runtime when a code path actually executes — in production, on a real user.
 * A single session in 2026-05 shipped five separate drift fixes of this exact family.
 *
 * WHY THIS SCRIPT AND NOT A MODEL: every drift class below is deterministically detectable
 * by comparing two authoritative sources. No language model is needed, none is wanted, and
 * a regex-grade check that runs in CI beats a smart check that runs when someone remembers.
 *
 * WHAT IT DETECTS (rule 58's classes 1-5):
 *   MISSING_COLUMN  — the model declares an attribute the live table does not have.
 *                     This is the one that throws `column "x" does not exist` in production.
 *   MISSING_TABLE   — the model's tableName does not exist at all (often PascalCase vs
 *                     snake_case drift: "ClientTrainerAssignments" vs client_trainer_assignments).
 *   TYPE_DRIFT      — declared type family and live type family disagree (INTEGER vs STRING
 *                     is the one that silently breaks `req.user.id === row.userId`).
 *   FK_TARGET_DRIFT — a foreign key points at lowercase `users` instead of the canonical
 *                     `"Users"`. This repo has BOTH tables; pointing at the wrong one throws
 *                     a constraint violation for a user that demonstrably exists.
 *
 * NOT reported as failures (informational only): columns the DB has that no model declares.
 * Those are usually legitimate — audit columns, other services' tables, or intentional.
 *
 * READ-ONLY. It runs SELECTs against information_schema and nothing else. It cannot write,
 * migrate, or repair. Exit 0 = clean, 1 = drift found, 2 = could not run.
 *
 * Usage:
 *   node backend/scripts/schema-drift-check.mjs              # all models
 *   node backend/scripts/schema-drift-check.mjs --model User # one model
 *   node backend/scripts/schema-drift-check.mjs --json       # machine-readable
 */
import 'dotenv/config';
import sequelize from '../database.mjs';
import getModels from '../models/associations.mjs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const onlyModel = args.includes('--model') ? args[args.indexOf('--model') + 1] : null;
const outPath = args.includes('--out') ? args[args.indexOf('--out') + 1] : null;

/** Sequelize type strings vary in shape; collapse to a comparable family. */
function typeFamily(raw) {
  const t = String(raw || '').toUpperCase();
  if (/\b(INTEGER|BIGINT|SMALLINT|SERIAL)\b/.test(t)) return 'INT';
  if (/\b(DECIMAL|NUMERIC|REAL|DOUBLE|FLOAT)\b/.test(t)) return 'FLOAT';
  if (/\b(VARCHAR|CHARACTER|TEXT|STRING|CHAR|UUID|CITEXT)\b/.test(t)) return 'TEXT';
  if (/\b(BOOLEAN|BOOL)\b/.test(t)) return 'BOOL';
  // DATEONLY is Sequelize's name for postgres `date`, and BLOB is `bytea`. Both are
  // CORRECT mappings — flagging them was a false positive in the first live run, and a
  // checker that cries wolf gets muted, which is worse than having no checker at all.
  if (/\b(TIMESTAMP|DATE|TIME)\b/.test(t) || t.startsWith('DATEONLY')) return 'DATE';
  if (/\b(BLOB|BYTEA)\b/.test(t)) return 'BINARY';
  if (/\b(JSON|JSONB)\b/.test(t)) return 'JSON';
  if (/\b(ARRAY)\b/.test(t) || t.endsWith('[]')) return 'ARRAY';
  if (/\b(ENUM|USER-DEFINED)\b/.test(t)) return 'ENUM';
  return t.split('(')[0].trim() || 'UNKNOWN';
}

async function liveColumns() {
  const [rows] = await sequelize.query(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'`,
  );
  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, new Map());
    byTable.get(r.table_name).set(r.column_name, r.data_type);
  }
  return byTable;
}

async function foreignKeys() {
  const [rows] = await sequelize.query(
    `SELECT tc.table_name, kcu.column_name, ccu.table_name AS target_table
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'`,
  );
  return rows;
}

async function main() {
  await sequelize.authenticate();
  const models = await getModels();
  const live = await liveColumns();
  const fks = await foreignKeys();

  const findings = [];
  let modelsChecked = 0;
  let attributesChecked = 0;

  for (const [name, model] of Object.entries(models)) {
    if (!model?.getTableName || !model?.rawAttributes) continue;
    if (onlyModel && name !== onlyModel) continue;
    modelsChecked += 1;

    const tableRaw = model.getTableName();
    // Some models declare tableName as '"Users"' — quoted to force Postgres case
    // sensitivity. information_schema reports the name UNQUOTED, so comparing the raw
    // string invents a MISSING_TABLE for a table that plainly exists. Strip the quotes.
    const table = String(typeof tableRaw === 'string' ? tableRaw : tableRaw?.tableName ?? '')
      .replace(/^"(.*)"$/, '$1');
    const cols = live.get(table);

    if (!cols) {
      findings.push({
        severity: 'CRITICAL',
        kind: 'MISSING_TABLE',
        model: name,
        table,
        detail: `model targets table "${table}" which does not exist in public schema`,
      });
      continue;
    }

    for (const [attr, def] of Object.entries(model.rawAttributes)) {
      // VIRTUAL attributes are computed, never persisted — they appear in rawAttributes but
      // have no column, so checking them would manufacture a MISSING_COLUMN. Zero models use
      // VIRTUAL today (verified 2026-08-18); this is a defensive guard against the first one.
      // Raised by Qwen in hostile round H1.
      const typeKey = String(def.type?.key || def.type || '').toUpperCase();
      if (typeKey.includes('VIRTUAL')) continue;

      // `field` is the real column name when it differs from the JS attribute name.
      // NOTE: `underscored: true` models get `field` auto-populated by Sequelize with the
      // snake_case name (verified: submittedByUserId -> submitted_by_user_id), so this line
      // already handles them. Qwen flagged them as a false-positive risk in H1; DISPROVEN.
      const column = def.field || attr;
      attributesChecked += 1;

      if (!cols.has(column)) {
        findings.push({
          severity: 'CRITICAL',
          kind: 'MISSING_COLUMN',
          model: name,
          table,
          detail: `attribute "${attr}" maps to column "${column}" which does not exist`,
        });
        continue;
      }

      const declared = typeFamily(def.type?.key || def.type?.toString?.() || def.type);
      const actual = typeFamily(cols.get(column));
      // UNKNOWN on either side means we could not classify — do not manufacture a finding.
      // ENUM is legitimately backed by either a native pg enum or a varchar+CHECK; a model
      // declaring STRING against either is a valid, deliberate configuration, not drift.
      // Treating them as incompatible was noise (Qwen H1, accepted).
      const compatible = (a, b) => (a === b)
        || ([a, b].every((x) => x === 'ENUM' || x === 'TEXT'));

      if (declared !== 'UNKNOWN' && actual !== 'UNKNOWN' && !compatible(declared, actual)) {
        findings.push({
          severity: 'WARN',
          kind: 'TYPE_DRIFT',
          model: name,
          table,
          detail: `column "${column}": model says ${declared}, database says ${actual}`,
        });
      }
    }
  }

  // FK target drift — this repo has BOTH `users` and `"Users"`; only "Users" is canonical.
  for (const fk of fks) {
    if (fk.target_table === 'users') {
      findings.push({
        severity: 'CRITICAL',
        kind: 'FK_TARGET_DRIFT',
        model: '(constraint)',
        table: fk.table_name,
        detail: `${fk.table_name}.${fk.column_name} references lowercase "users"; canonical is "Users"`,
      });
    }
  }

  const critical = findings.filter((f) => f.severity === 'CRITICAL');

  const payload = JSON.stringify({ modelsChecked, attributesChecked, findings }, null, 2);

  // --out writes JSON to a file. Necessary because model/dotenv startup logs to stdout,
  // so piping --json is not reliably parseable (it wasn't, on the first live run).
  if (outPath) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outPath, payload);
    console.log(`schema-drift-check: JSON written to ${outPath}`);
  } else if (asJson) {
    console.log(payload);
  } else {
    console.log(`\nschema-drift-check — ${modelsChecked} models, ${attributesChecked} attributes\n`);
    if (findings.length === 0) {
      console.log('  CLEAN — no drift detected.\n');
    } else {
      for (const f of findings) {
        console.log(`  [${f.severity}] ${f.kind}  ${f.model} (${f.table})`);
        console.log(`           ${f.detail}`);
      }
      console.log(`\n  ${critical.length} critical, ${findings.length - critical.length} warning\n`);
    }
  }

  await sequelize.close();
  process.exit(critical.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('schema-drift-check could not run:', err.message);
  try { await sequelize.close(); } catch { /* already closed */ }
  process.exit(2);
});
