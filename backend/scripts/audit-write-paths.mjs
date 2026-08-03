#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: audit-write-paths.mjs
 * PURPOSE: Find models that can never INSERT, even though reading them works.
 * ADDED: 2026-07-29 (continuous-cleanup loop; SWA-87)
 * ============================================================================
 *
 * WHAT THIS DOES: for every model whose table exists, compares the table's REQUIRED columns
 * (NOT NULL with no default) against the columns the model actually declares. A required column the
 * model does not declare can never be supplied, so every INSERT through that model fails.
 *
 * WHY IT EXISTS — `audit-model-health.mjs` proves a model can be READ. That is a different question
 * from whether it can be WRITTEN, and a read check cannot answer it:
 *
 *   - A SELECT lists the model's declared attributes. A column the model never declares is simply
 *     absent from the query, so the read succeeds and the model is reported HEALTHY.
 *   - An INSERT must satisfy the TABLE's constraints. A NOT NULL column with no default that the
 *     model cannot supply fails every time, with `violates not-null constraint`.
 *
 * So a model can be permanently write-broken while every read check reports green. Verified
 * 2026-07-29: `FoodScanHistory` reads fine and has 0 rows, because `food_scan_history.productName`
 * is NOT NULL and the model does not declare it. That blocker is INDEPENDENT of the separate bug
 * where the caller writes `productId`/`barcode`/`wasConsumed` (columns that do not exist) — fixing
 * the caller alone would still not produce a working write. Two blockers, one silent symptom.
 *
 * These failures are usually invisible in production because write paths are often wrapped in a
 * catch that deliberately swallows the error so the user-facing action still succeeds.
 *
 * WHAT IT DOES NOT CATCH: type mismatches, ENUM value drift, FK targets pointing at the wrong table
 * (the `users` vs `"Users"` class), or CHECK constraints. It answers exactly one question —
 * "can this model supply every column the table demands?"
 *
 * SAFETY: strictly read-only. Queries `information_schema` and inspects model metadata. Issues no
 * INSERT, UPDATE, or DELETE, and opens no transaction.
 *
 * USAGE:
 *   node backend/scripts/audit-write-paths.mjs
 *   node backend/scripts/audit-write-paths.mjs --verbose   # also list models that pass
 *   node backend/scripts/audit-write-paths.mjs --help      # usage only; does NOT touch the DB
 *
 * EXIT CODES: 0 = every model can supply its required columns · 1 = at least one cannot ·
 *             2 = the audit itself failed (including examining zero models).
 */

// `sequelize` is imported LAZILY inside main(), never at the top level. A top-level import runs
// before the `--help` guard below, so `--help` died with ERR_MODULE_NOT_FOUND whenever node_modules
// was absent — which is exactly when someone is most likely to be asking a script what it does.
// audit-model-health.mjs already deferred its DB import this way; this file did not, and the
// inconsistency was invisible until the two were run side by side.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { collectModelFiles } from './lib/model-files.mjs';
import { divergedModelFiles, divergenceCaveat } from './lib/diverged-from-main.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.resolve(HERE, '..');
const MODELS_DIR = path.join(BACKEND, 'models');
const verbose = process.argv.includes('--verbose');

// `--help` must NOT run the audit. Without this, asking for documentation opened a connection and
// fired a schema-wide query against PRODUCTION — surprising, and the opposite of what the flag
// promises. Exit 0: asking for help is not a failure.
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('usage: node backend/scripts/audit-write-paths.mjs [--verbose]');
  console.log('  Finds models that can never INSERT: a NOT NULL column with no default that the');
  console.log('  model does not declare. Read-only. Exit 0 = all can insert, 1 = some cannot,');
  console.log('  2 = the audit itself failed (including examining zero models).');
  process.exit(0);
}

async function main() {
  const { QueryTypes } = await import('sequelize');
  const { default: sequelize } = await import(pathToFileURL(path.join(BACKEND, 'database.mjs')).href);

  // Every column the database will refuse to default for us.
  const rows = await sequelize.query(
    `SELECT table_name::text AS t, column_name::text AS c
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND is_nullable = 'NO'
        AND column_default IS NULL`,
    { type: QueryTypes.SELECT, logging: false },
  );

  const required = new Map();
  for (const r of rows) {
    if (!required.has(r.t)) required.set(r.t, new Set());
    required.get(r.t).add(r.c);
  }

  // The required-columns query alone cannot tell "table missing" from "table has no required
  // columns" — both produce no map entry, and they mean OPPOSITE things: the first is
  // audit-model-health's finding, the second means every INSERT is satisfiable and the model
  // passes. Conflating them parked passing models in the skip bucket, understating the pass count
  // and burying the real skips in noise.
  const tableRows = await sequelize.query(
    `SELECT table_name::text AS t
       FROM information_schema.tables
      WHERE table_schema = 'public'`,
    { type: QueryTypes.SELECT, logging: false },
  );
  const allTables = new Set(tableRows.map((r) => r.t));

  const broken = [];
  const ok = [];
  const skipped = [];

  // The subject list is SHARED with audit-model-health (lib/model-files.mjs) so the two audits can
  // never examine different universes again — that drift is exactly how `contact.mjs` was audited
  // here but invisible to model-health. The walk's hard-won rules (recurse into subdirectories, no
  // case filter, wiring files excluded by exact name) live with the shared function.
  const modelFiles = collectModelFiles(MODELS_DIR);

  for (const fullPath of modelFiles) {
    const shortName = path.relative(MODELS_DIR, fullPath).replace(/\\/g, '/');
    let mod;
    try {
      mod = await import(pathToFileURL(fullPath).href);
    } catch {
      skipped.push({ file: shortName, why: 'import failed' });
      continue;
    }

    // Scan EVERY export, not just `default`. Several files under models/social/enhanced/ define
    // multiple models and have NO default export — reading only `.default` hid 32 model classes
    // behind a confident-looking total. Same dead-coverage class as the missing recursion above.
    const models = Object.entries(mod)
      .filter(([, v]) => typeof v?.getTableName === 'function' && v?.rawAttributes);

    if (!models.length) {
      skipped.push({ file: shortName, why: 'not a Sequelize model' });
      continue;
    }

    for (const [exportName, Model] of models) {
      const file = models.length > 1 ? `${shortName}:${exportName}` : shortName;

      const raw = Model.getTableName();
      const table = typeof raw === 'string' ? raw : raw.tableName;

      // No table -> that is audit-model-health's finding, not ours. Do not double-report.
      if (!allTables.has(table)) {
        skipped.push({ file, why: `table "${table}" absent — audit-model-health's finding` });
        continue;
      }

      // Table exists but demands nothing: every INSERT is satisfiable. A pass, not a skip.
      const req = required.get(table);
      if (!req) {
        ok.push({ file, table });
        continue;
      }

      // `field` is the real column name when it differs from the attribute name.
      const declared = new Set(
        Object.values(Model.rawAttributes).map((a) => a.field || a.fieldName).filter(Boolean),
      );
      const missing = [...req].filter((c) => !declared.has(c));

      if (missing.length) broken.push({ file, table, missing });
      else ok.push({ file, table });
    }
  }

  const examined = broken.length + ok.length;

  console.log('\n=== Write-path audit (can each model supply its table\'s required columns?) ===');
  console.log(`  models examined  : ${examined}`);
  console.log(`  can INSERT       : ${ok.length}`);
  console.log(`  CANNOT INSERT    : ${broken.length}`);
  console.log(`  skipped          : ${skipped.length} (listed below)`);

  // Same caveat as audit-model-health (lib/diverged-from-main.mjs). This audit reads models from
  // DISK too, so it is equally capable of reporting an uncommitted local fix as production truth —
  // measured 2026-07-29: CANNOT INSERT fell 2 -> 0 purely because a parallel agent had uncommitted
  // edits to FoodScanHistory and TrainerPermissions, reading SWA-98's finding as solved.
  for (const line of divergenceCaveat(
    divergedModelFiles(MODELS_DIR),
    [...ok.map((o) => o.file), ...broken.map((b) => b.file)],
    broken.map((b) => b.file),
  )) console.log(line);

  for (const b of broken) {
    console.log(`\n  x ${b.file}  ->  ${b.table}`);
    console.log(`      required by the table but not declared by the model: ${b.missing.join(', ')}`);
    console.log('      every INSERT through this model fails: violates not-null constraint');
  }

  // Always list skips, never just count them — audit-model-health's own rule, and it applies here
  // for the same reason: these are the models this audit could NOT speak for, and a bare count
  // reads as noise. A named list can be challenged; a number cannot.
  if (skipped.length) {
    console.log('\n  --- SKIPPED (not covered by this audit) ---');
    for (const { file, why } of skipped) console.log(`    ${file.padEnd(34)} ${why}`);
  }

  if (verbose) {
    console.log('\n  --- can INSERT ---');
    for (const o of ok) console.log(`    ${o.file} -> ${o.table}`);
  }

  // A check that examined NOTHING must never report success — same guard as the sibling audits,
  // added after audit-model-health.mjs v1 reported "ALL HEALTHY" having queried zero models.
  if (examined === 0) {
    console.log('\n  AUDIT FAILED: zero models were examined.');
    console.log('  That is a fault in this audit (bad path, or no tables matched), not a clean bill of health.\n');
    await sequelize.close();
    process.exit(2);
  }

  console.log(broken.length === 0
    ? '\n  EVERY MODEL CAN SUPPLY ITS REQUIRED COLUMNS\n'
    : `\n  ${broken.length} model(s) can never INSERT. Reads may still succeed — see SWA-87.\n`);

  await sequelize.close();
  process.exit(broken.length === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('audit-write-paths failed:', error);
  process.exit(2);
});
