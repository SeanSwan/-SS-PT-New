/**
 * V3b.3 Local Section-Pattern Validator
 * ======================================
 *
 * Imports the V3b.3.3 starter seeder rows and replays the frontend's
 * SECTION_PATTERNS classifier against each row in-process. Reports any
 * row that would be an orphan (matches none of warmup/balance_core/
 * cooldown — would only appear in `main`, which means a Rolodex section
 * misclassification).
 *
 * Why a separate validator: the Playwright smoke can only run AFTER
 * the seeder lands in production, but we want to catch orphans BEFORE
 * pushing. This runs in <500ms.
 *
 * Run:  cd backend && node scripts/v3b3-validate-rows-locally.mjs
 * Exit: 0 if all rows are routable, 1 if any orphan exists.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import seederModule from '../seeders/20260504-seed-nasm-corrective-starter.mjs';

// V3b.3 MEDIUM 2 fix (2026-05-03): SECTION_PATTERNS sourced from
// shared/sectionPatterns.json so this validator can never silently
// drift from the frontend filter. The previous "Kept inline ... if
// the frontend file changes, update this constant in lockstep"
// approach was the exact failure mode Codex flagged.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const sharedPatternsPath = resolve(__dirname, '../../shared/sectionPatterns.json');
const sharedPatterns = JSON.parse(readFileSync(sharedPatternsPath, 'utf-8'));

function compileSectionPattern(entry) {
  return {
    categories: entry.categories,
    types: entry.types,
    nameKeywords: new RegExp(entry.nameKeywords, entry.nameKeywordsFlags || 'i'),
  };
}

const SECTION_PATTERNS = {
  warmup: compileSectionPattern(sharedPatterns.warmup),
  balance_core: compileSectionPattern(sharedPatterns.balance_core),
  cooldown: compileSectionPattern(sharedPatterns.cooldown),
};

function matchesSection(ex, ctx) {
  const pattern = SECTION_PATTERNS[ctx];
  if (!pattern) return true;
  const cat = (ex.bodyPartCategory || '').toLowerCase();
  const type = (ex.exerciseType || '').toLowerCase();
  if (pattern.categories.some((c) => cat === c)) return true;
  if (pattern.types.some((t) => type === t)) return true;
  if (pattern.nameKeywords.test(ex.name)) return true;
  return false;
}

const rows = seederModule.rows;
if (!Array.isArray(rows)) {
  console.error('❌ seeder.rows is not an array — seeder export shape changed?');
  process.exit(2);
}

const breakdown = { warmup: [], balance_core: [], cooldown: [] };
const orphans = [];

for (const row of rows) {
  const matched = ['warmup', 'balance_core', 'cooldown'].filter((s) => matchesSection(row, s));
  if (matched.length === 0) {
    orphans.push(row);
  } else {
    for (const s of matched) breakdown[s].push(row);
  }
}

console.log('=== V3b.3.3 Local Section-Pattern Validator ===');
console.log(`Total rows: ${rows.length}`);
console.log(`  warmup-eligible:       ${breakdown.warmup.length}`);
console.log(`  balance_core-eligible: ${breakdown.balance_core.length}`);
console.log(`  cooldown-eligible:     ${breakdown.cooldown.length}`);
console.log(`  ORPHANS (main-only):   ${orphans.length}`);

if (orphans.length > 0) {
  console.log('\n❌ Orphan rows (would NOT appear in any protocol section):');
  for (const o of orphans) {
    console.log(`   - ${o.name}  [type=${o.exerciseType}, cat=${o.bodyPartCategory}, key=${o.exercise_key}]`);
  }
  process.exit(1);
}

console.log('\n✅ All rows route to at least one protocol section.');
process.exit(0);
