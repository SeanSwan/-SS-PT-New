#!/usr/bin/env node
/**
 * ============================================================================
 * FILE: audit-model-health.mjs
 * PURPOSE: Prove which Sequelize models can actually query the real database.
 * ADDED: 2026-07-28 (continuous-cleanup loop; SWA-86 / SWA-87)
 * ============================================================================
 *
 * WHAT THIS DOES: imports every model and runs a real `findOne()` against the live DB, then
 * classifies each failure. Ground truth, not static analysis.
 *
 * WHY IT EXISTS: schema drift is this repo's most repeated defect class (CLAUDE.md rule 58), and it
 * is invisible to every other check. The model file reads correctly, `node --check` passes, tsc
 * passes, the import succeeds — and the query throws only when a code path finally reaches it.
 * Rule 58's own worked example (`TrainerPermissions` mapping `field: 'trainer_id'` while the DB has
 * `trainerId`) was still live on main months after being documented, because nothing re-checked it.
 *
 * WHY A REAL QUERY, NOT A SCHEMA DIFF: comparing model attributes to `information_schema` by hand
 * is what produced five false positives while this was being built — row-shape assumptions, case
 * mismatches, `field:` mappings, and partial-index predicates all trip it up. Letting Postgres
 * answer removes the guesswork: if `findOne()` succeeds, the model works.
 *
 * SAFETY: read-only. Runs `SELECT ... LIMIT 1` per model. Writes nothing.
 *
 * USAGE:
 *   node backend/scripts/audit-model-health.mjs           # summary + failures
 *   node backend/scripts/audit-model-health.mjs --verbose # also list healthy models
 *
 * EXIT CODES: 0 = every model healthy · 1 = at least one broken · 2 = could not connect.
 * The non-zero exit makes it usable as a CI gate once the known failures are resolved.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODELS_DIR = path.join(HERE, '..', 'models');
const verbose = process.argv.includes('--verbose');

/** Classify a Sequelize error into an actionable bucket. */
function classify(message) {
  const first = String(message).split('\n')[0];
  if (/relation .* does not exist/i.test(first)) return { bucket: 'MISSING_TABLE', detail: first };
  if (/column .* does not exist/i.test(first)) return { bucket: 'BROKEN_COLUMN', detail: first };
  return { bucket: 'OTHER', detail: first };
}

async function main() {
  let sequelize;
  try {
    sequelize = (await import('../database.mjs')).default;
    await sequelize.authenticate();
  } catch (error) {
    console.error('Could not connect to the database:', error.message);
    process.exit(2);
  }

  // Model files are PascalCase; skip helpers, index, and association wiring.
  //
  // MUST RECURSE. `models/` has subdirectories — `models/social/` and `models/financial/` hold 34
  // model files. A flat readdirSync silently examined only the top level and reported a clean
  // sweep having never opened them. An audit that misses 17% of its subjects while reporting
  // completeness is the same failure class as reporting HEALTHY having queried nothing.
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.mjs') && /^[A-Z]/.test(entry.name)) files.push(full);
    }
  };
  walk(MODELS_DIR);
  files.sort();

  const healthy = [];
  const broken = { MISSING_TABLE: [], BROKEN_COLUMN: [], OTHER: [] };
  let skipped = 0;

  for (const fullPath of files) {
    // Display name stays relative to models/ so subdirectory models read as `social/SocialPost.mjs`
    // rather than an absolute path that blows out the column alignment below.
    const shortName = path.relative(MODELS_DIR, fullPath).replace(/\\/g, '/');
    let mod;
    try {
      // MUST be a file:// URL. A raw Windows path (C:\...\Foo.mjs) is not a valid ESM specifier,
      // so `import(path.join(...))` throws for EVERY file — which silently routed all 159 models
      // into the skip branch and made this script report "ALL MODELS HEALTHY" having queried none.
      mod = await import(pathToFileURL(fullPath).href);
    } catch {
      skipped += 1; // could not be imported at all
      continue;
    }

    // Scan EVERY export, not just `default`. Several files under models/social/enhanced/ define
    // multiple models and have NO default export at all — AIRecommendations.mjs alone exports 5.
    // Reading only `.default` sent those files to the skip bucket, hiding 32 model classes while
    // the summary line printed a confident total. Same dead-coverage class as the missing recursion.
    const models = Object.entries(mod)
      .filter(([, v]) => typeof v?.findOne === 'function' && typeof v?.getTableName === 'function');

    if (!models.length) { skipped += 1; continue; }

    for (const [exportName, Model] of models) {
      // Disambiguate only when a file holds more than one model, so single-model files read cleanly.
      const file = models.length > 1 ? `${shortName}:${exportName}` : shortName;
      try {
        await Model.findOne({ limit: 1 });
        healthy.push(file);
      } catch (error) {
        const { bucket, detail } = classify(error.message);
        broken[bucket].push({ file, detail });
      }
    }
  }

  const total = healthy.length + broken.MISSING_TABLE.length
    + broken.BROKEN_COLUMN.length + broken.OTHER.length;

  console.log('\n=== Sequelize model health (live DB) ===');
  console.log(`  models queried : ${total}   (skipped ${skipped} non-model files)`);
  console.log(`  HEALTHY        : ${healthy.length}`);
  console.log(`  MISSING TABLE  : ${broken.MISSING_TABLE.length}`);
  console.log(`  BROKEN COLUMN  : ${broken.BROKEN_COLUMN.length}`);
  console.log(`  OTHER          : ${broken.OTHER.length}`);

  for (const bucket of ['MISSING_TABLE', 'BROKEN_COLUMN', 'OTHER']) {
    if (!broken[bucket].length) continue;
    console.log(`\n  --- ${bucket} ---`);
    for (const { file, detail } of broken[bucket]) {
      console.log(`    ${file.padEnd(34)} ${detail}`);
    }
  }

  if (verbose && healthy.length) {
    console.log('\n  --- HEALTHY ---');
    for (const f of healthy) console.log(`    ${f}`);
  }

  const failed = total - healthy.length;

  // A health check that checked NOTHING must never report health. The first version of this script
  // skipped all 159 files (bad import specifier) and printed "ALL MODELS HEALTHY" with exit 0 — a
  // green light backed by zero evidence. Treat an empty run as a failure of the audit itself.
  if (total === 0) {
    console.log('\n  AUDIT FAILED: zero models were queried.');
    console.log('  This is a fault in the audit, not a clean bill of health.');
    console.log(`  (${skipped} files skipped — check the import specifier and MODELS_DIR.)\n`);
    await sequelize.close();
    process.exit(2);
  }

  console.log(failed === 0
    ? '\n  ALL MODELS HEALTHY\n'
    : `\n  ${failed} model(s) cannot query. See SWA-86 (missing tables) / SWA-87 (column drift).\n`);

  await sequelize.close();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('audit-model-health failed:', error);
  process.exit(2);
});
