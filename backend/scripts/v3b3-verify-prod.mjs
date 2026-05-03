/**
 * V3b.3.3 Production Verification (DB-Level Smoke)
 * =================================================
 *
 * Direct DB-level smoke equivalent of the Playwright spec
 * (frontend/e2e/api/v3b3-corrective-smoke.spec.ts). Use this when
 * Playwright auth env vars (TEST_PASSWORD / E2E_ADMIN_PASSWORD)
 * aren't available in the shell, or when you want a 2-second
 * verification instead of a Playwright spawn.
 *
 * Pass criteria (mirrors the Playwright spec):
 *   1. Exactly 32 rows with exercise_key starting `ces-` exist.
 *   2. Every CES row has all three V3b.3 fields populated:
 *        - nasmCorrectiveCategory (non-null, non-empty array)
 *        - cesProtocolStep (one of inhibit | lengthen | activate | integrate)
 *        - sourceCitation (non-null)
 *   3. Every CES row's (exerciseType, bodyPartCategory) routes to at
 *      least one of warmup/balance_core/cooldown via SECTION_PATTERNS.
 *
 * Connects via DATABASE_URL (production per CLAUDE.md gotcha).
 *
 * Run:  cd backend && node scripts/v3b3-verify-prod.mjs
 * Exit: 0 on pass, 1 on fail.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sequelize from '../database.mjs';

// V3b.3 MEDIUM 2 fix (2026-05-03): SECTION_PATTERNS is now sourced
// from shared/sectionPatterns.json — same source the frontend
// sectionFilter.ts compiles. Previously this script kept a hand-
// copied mirror that could drift silently, producing false-positive
// PASS even after the canonical filter changed.
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

function matchesSection(row, ctx) {
  const pattern = SECTION_PATTERNS[ctx];
  if (!pattern) return true;
  const cat = (row.bodyPartCategory || '').toLowerCase();
  const type = (row.exerciseType || '').toLowerCase();
  if (pattern.categories.some((c) => cat === c)) return true;
  if (pattern.types.some((t) => type === t)) return true;
  if (pattern.nameKeywords.test(row.name)) return true;
  return false;
}

const FAIL = (msg) => {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
};
const OK = (msg) => console.log(`✓ ${msg}`);

try {
  await sequelize.authenticate();

  const [rows] = await sequelize.query(`
    SELECT id, name, exercise_key, "exerciseType", "bodyPartCategory",
           "nasmCorrectiveCategory", "cesProtocolStep", "sourceCitation"
      FROM "Exercises"
     WHERE exercise_key LIKE 'ces-%'
     ORDER BY exercise_key
  `);

  console.log('\n=== V3b.3.3 Production Verification ===');
  console.log(`CES rows in production: ${rows.length}`);

  // ─── Check 1: exactly 32 ces-* rows ────────────────────────
  if (rows.length !== 32) {
    FAIL(`expected 32 CES rows, found ${rows.length}`);
  } else {
    OK('32 CES rows present');
  }

  // ─── Check 2: every row has full V3b.3 metadata ────────────
  const validProtocolSteps = new Set(['inhibit', 'lengthen', 'activate', 'integrate']);
  const missingMeta = rows.filter((r) => {
    let cesArr = r.nasmCorrectiveCategory;
    if (typeof cesArr === 'string') {
      try { cesArr = JSON.parse(cesArr); } catch { cesArr = null; }
    }
    if (!Array.isArray(cesArr) || cesArr.length === 0) return true;
    if (!validProtocolSteps.has((r.cesProtocolStep || '').toLowerCase())) return true;
    if (!r.sourceCitation || r.sourceCitation.trim() === '') return true;
    return false;
  });
  if (missingMeta.length > 0) {
    FAIL(`${missingMeta.length} CES rows missing V3b.3 metadata`);
    for (const r of missingMeta.slice(0, 10)) {
      console.error(`   - ${r.name} [${r.exercise_key}] step=${r.cesProtocolStep} citation=${r.sourceCitation ? '✓' : 'MISSING'}`);
    }
  } else {
    OK('All 32 CES rows have nasmCorrectiveCategory + cesProtocolStep + sourceCitation populated');
  }

  // ─── Check 3: every row routes to a non-`main` Rolodex section ─
  const breakdown = { warmup: 0, balance_core: 0, cooldown: 0 };
  const orphans = [];
  for (const r of rows) {
    const matched = ['warmup', 'balance_core', 'cooldown'].filter((s) => matchesSection(r, s));
    if (matched.length === 0) {
      orphans.push(r);
    } else {
      for (const s of matched) breakdown[s] += 1;
    }
  }

  console.log(`\nSection eligibility (counts include rows that match multiple sections):`);
  console.log(`  warmup-eligible:       ${breakdown.warmup}`);
  console.log(`  balance_core-eligible: ${breakdown.balance_core}`);
  console.log(`  cooldown-eligible:     ${breakdown.cooldown}`);

  if (orphans.length > 0) {
    FAIL(`${orphans.length} CES rows are ORPHANS (would only appear in 'main')`);
    for (const r of orphans) {
      console.error(`   - ${r.name} [type=${r.exerciseType}, cat=${r.bodyPartCategory}, key=${r.exercise_key}]`);
    }
  } else {
    OK('Every CES row routes to at least one of warmup/balance_core/cooldown');
  }

  // ─── Distribution sanity (matches Playwright spec assertions) ──
  if (breakdown.warmup < 8) {
    FAIL(`warmup eligibility ${breakdown.warmup} < 8 (regression — UCS/LCS inhibit+lengthen rows should land here)`);
  } else {
    OK(`warmup eligibility ≥ 8 (got ${breakdown.warmup})`);
  }
  if (breakdown.cooldown < 4) {
    FAIL(`cooldown eligibility ${breakdown.cooldown} < 4 (regression)`);
  } else {
    OK(`cooldown eligibility ≥ 4 (got ${breakdown.cooldown})`);
  }

  if (process.exitCode === 1) {
    console.error('\n❌ V3b.3.3 production verification FAILED');
  } else {
    console.log('\n✅ V3b.3.3 production verification PASSED — all 32 CES rows live and section-routable');
  }
} catch (err) {
  console.error('❌ Verification crashed:', err?.message || err);
  process.exitCode = 1;
} finally {
  await sequelize.close().catch(() => {});
}
