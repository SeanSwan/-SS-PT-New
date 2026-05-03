/**
 * shared/sectionPatterns.mjs
 * ===========================
 * V3b.3 MEDIUM 2 fix (2026-05-03): single source of truth for the
 * workout-logger Rolodex section filter. Both the frontend
 * NASMExerciseRolodex.sectionFilter.ts and the backend
 * v3b3-verify-prod.mjs / v3b3-validate-rows-locally.mjs scripts
 * consume this file. Editing one no longer drifts from the other.
 *
 * Format choice: ESM .mjs over .json for cross-stack portability.
 * Vite handles both natively; Node 22+ ESM requires the `with {
 * type: 'json' }` import attribute for raw JSON imports, which TS
 * tooling support is uneven for. Plain ESM module export sidesteps
 * the entire attribute-syntax compatibility surface.
 *
 * Regex strings are stored as standard JS regex literal source (no
 * leading/trailing slash) so both consumers compile them via
 * `new RegExp(source, flags)`. Section context names match the
 * SectionContext type union in NASMExerciseRolodex.sectionFilter.ts.
 */

export default {
  warmup: {
    categories: ['recovery', 'corrective'],
    types: ['flexibility', 'injury_prevention', 'corrective'],
    nameKeywords: 'foam roll|stretch|dynamic|warmup|warm up|corrective|activation|mobility',
    nameKeywordsFlags: 'i',
  },
  balance_core: {
    // V3b.1.1 (Codex 2026-05-03 F.1): 'recovery' removed from
    // categories — was causing cooldown/recovery exercises to bleed
    // into the balance/core/stability display. exerciseType-based
    // match is the correct narrowing.
    categories: ['core', 'corrective'],
    types: ['core', 'balance', 'stability', 'stabilizers'],
    nameKeywords: 'balance|plank|stability|bird dog|dead bug|pallof|single.?leg|bosu|wall slide',
    nameKeywordsFlags: 'i',
  },
  cooldown: {
    categories: ['recovery', 'corrective'],
    types: ['flexibility', 'injury_recovery'],
    nameKeywords: 'stretch|foam roll|breathing|cool down|cooldown|recovery|child.?s pose|90.?90',
    nameKeywordsFlags: 'i',
  },
};
