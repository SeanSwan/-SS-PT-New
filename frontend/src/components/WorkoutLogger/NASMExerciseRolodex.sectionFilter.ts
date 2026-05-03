/**
 * NASMExerciseRolodex.sectionFilter.ts
 * =====================================
 *
 * V3b.1 (2026-05-03) — extracted SECTION_PATTERNS filter logic from
 * NASMExerciseRolodex.tsx so the matching rules can be regression-
 * tested directly without mounting the full virtualized rolodex.
 *
 * The export `matchesSectionContextForTesting` mirrors the in-component
 * `matchesSectionContext` logic; the in-component function imports
 * these patterns so there's a single source of truth.
 *
 * Sean's complaint 2026-05-03 (V3 §L5-L7): only ~5 exercises appeared
 * per protocol section in the live UI, even though the seeded NASM DB
 * has 183+ exercises across these categories. The pre-V3b.1 filter was
 * too narrow — it excluded the seeded exerciseTypes
 * `balance/stability/stabilizers/injury_prevention/injury_recovery`
 * because those values were never in the per-section types[] lists.
 */

export type SectionContext = 'warmup' | 'balance_core' | 'cooldown' | 'main';

/**
 * Subset of ExerciseSlim that the section filter actually reads. Kept
 * separate from the full ExerciseSlim type so the filter module is
 * dependency-light and the test fixtures are tiny.
 */
export interface ExerciseSlimSubset {
  id: string;
  name: string;
  exerciseType?: string;
  bodyPartCategory?: string;
}

/**
 * V3b.1 expanded section patterns. Each section now matches:
 *   - bodyPartCategory across multiple values (case-insensitive)
 *   - exerciseType across multiple values (case-insensitive)
 *   - nameKeywords as a fallback regex
 *
 * Why each value is here:
 *
 * WARMUP / CORRECTIVE:
 *   categories: 'recovery' (existing), 'corrective' (NEW — production
 *     registry maps NASM CES exercises to bodyPartCategory='recovery'
 *     which the variationEngine categoryMap then routes to category
 *     'corrective'; the rolodex reads bodyPartCategory directly so we
 *     match on both labels).
 *   types: 'flexibility' (existing — stretches are warmup),
 *     'injury_prevention' (NEW — the 24 NASM CES corrective drills
 *     in the seeder, e.g. foam-roll work, glute activation, scapular
 *     retraction, all tagged exerciseType='injury_prevention'),
 *     'corrective' (NEW — generic catch-all for future taggings).
 *
 * BALANCE / CORE / STABILITY:
 *   categories: 'core' (existing), 'corrective' (NEW — production
 *     registry uses 'corrective' for balance/stabilization work).
 *   types: 'balance' / 'stability' / 'stabilizers' / 'core' (ALL NEW —
 *     pre-V3b.1 had types=[] for balance_core, silently excluding all
 *     30+ seeded balance/stability/stabilizers exercises).
 *
 *   V3b.1.1 (Codex 2026-05-03 F.1): REMOVED 'recovery' from categories
 *   because the live production smoke showed 216 → 423 jump and the
 *   delta was largely cooldown/recovery exercises bleeding into the
 *   balance/core display, not actual balance/stability work. The
 *   exerciseType-based match (balance/stability/stabilizers/core) is
 *   the correct narrowing.
 *
 * COOLDOWN / RECOVERY:
 *   categories: 'recovery' (existing), 'corrective' (NEW).
 *   types: 'flexibility' (NEW — was only on warmup; cooldown is also
 *     stretching), 'injury_recovery' (NEW — the 25 seeded recovery
 *     entries, e.g. 90/90 hip stretch, child's pose, breathing drills).
 */
export const SECTION_PATTERNS: Record<Exclude<SectionContext, 'main'>, {
  categories: string[];
  types: string[];
  nameKeywords: RegExp;
}> = {
  warmup: {
    categories: ['recovery', 'corrective'],
    types: ['flexibility', 'injury_prevention', 'corrective'],
    nameKeywords: /foam roll|stretch|dynamic|warmup|warm up|corrective|activation|mobility/i,
  },
  balance_core: {
    // V3b.1.1 (Codex 2026-05-03 F.1): 'recovery' removed — was causing
    // cooldown/recovery exercises to bleed into the balance/core/stability
    // display. exerciseType-based match is the correct narrowing.
    categories: ['core', 'corrective'],
    types: ['core', 'balance', 'stability', 'stabilizers'],
    nameKeywords: /balance|plank|stability|bird dog|dead bug|pallof|single.?leg|bosu|wall slide/i,
  },
  cooldown: {
    categories: ['recovery', 'corrective'],
    types: ['flexibility', 'injury_recovery'],
    nameKeywords: /stretch|foam roll|breathing|cool down|cooldown|recovery|child.?s pose|90.?90/i,
  },
};

/**
 * Public filter helper. Returns true if the exercise belongs in the
 * given section. `'main'` and missing context return true (no filter).
 */
export function matchesSectionContextForTesting(
  ex: ExerciseSlimSubset,
  ctx?: SectionContext,
): boolean {
  if (!ctx || ctx === 'main') return true;
  const pattern = SECTION_PATTERNS[ctx];
  if (!pattern) return true;
  const cat = (ex.bodyPartCategory || '').toLowerCase();
  const type = (ex.exerciseType || '').toLowerCase();
  if (pattern.categories.some(c => cat === c)) return true;
  if (pattern.types.some(t => type === t)) return true;
  if (pattern.nameKeywords.test(ex.name)) return true;
  return false;
}
