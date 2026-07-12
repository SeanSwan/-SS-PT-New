/**
 * L1 REV 2 round-4 — schedule→movement category expansion (Codex final HIGH)
 * ===========================================================================
 *
 * Codex 2026-05-02 final review caught that the long-horizon plan
 * populator was passing schedule labels (`'upper'` / `'lower'` /
 * `'legs'`) directly into `selectExercises`, which exact-matched
 * `ex.category`. The production registry maps client-facing labels
 * via `variationEngine.mjs` (e.g. `legs → 'squat'`), so:
 *
 *   sessionsPerWeek=3 → rotation `['full_body', 'upper', 'lower']`
 *     → days 2 + 3 of every week were EMPTY (upper/lower not in
 *       production registry)
 *
 *   sessionsPerWeek=4 → rotation `['push', 'pull', 'legs', 'push']`
 *     → day 3 of every week was EMPTY (legs → squat in registry,
 *       not 'legs')
 *
 * The fix expands schedule labels to a list that includes both the
 * legacy label (so the existing `longHorizonRegistryFixture` with
 * `category: 'legs'` still works) AND the production movement
 * categories (`squat`, `hinge`, `lunge`, `push`, `pull`).
 *
 * These tests use a SEPARATE fixture that mirrors the production
 * category mapping — every leg exercise is `category: 'squat'` /
 * `'hinge'` / `'lunge'` (NOT `'legs'`). This proves the fix works
 * against the real production shape, not just against the legacy
 * fixture.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Production-shape fixture: leg exercises tagged squat/hinge/lunge
// (not 'legs'); push/pull exercises tagged push/pull. Mirrors what
// variationEngine.mjs's categoryMap emits for the live DB rows.
const productionShapeRegistry = [
  // PUSH (n=8, strict no-repeat passes the 7-distinct threshold)
  { key: 'p1', name: 'Bench Press',         muscles: ['Chest'],     category: 'push', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'p2', name: 'Push-Up',             muscles: ['Chest'],     category: 'push', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'p3', name: 'Overhead Press',      muscles: ['Shoulders'], category: 'push', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'p4', name: 'Dip',                 muscles: ['Chest'],     category: 'push', equipment: ['bodyweight'], nasmLevel: 3 },
  { key: 'p5', name: 'Pike Push-Up',        muscles: ['Shoulders'], category: 'push', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'p6', name: 'Decline Push-Up',     muscles: ['Chest'],     category: 'push', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'p7', name: 'Diamond Push-Up',     muscles: ['Triceps'],   category: 'push', equipment: ['bodyweight'], nasmLevel: 3 },
  { key: 'p8', name: 'Pseudo Planche',      muscles: ['Shoulders'], category: 'push', equipment: ['bodyweight'], nasmLevel: 4 },

  // PULL (n=8)
  { key: 'l1', name: 'Pull-Up',             muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 3 },
  { key: 'l2', name: 'Inverted Row',        muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'l3', name: 'Chin-Up',             muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 3 },
  { key: 'l4', name: 'Australian Pull-Up',  muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'l5', name: 'Towel Row',           muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'l6', name: 'Reverse Fly',         muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'l7', name: 'Scapular Pull',       muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'l8', name: 'Archer Row',          muscles: ['Back'],      category: 'pull', equipment: ['bodyweight'], nasmLevel: 4 },

  // SQUAT (n=4) — production category for leg exercises per categoryMap
  { key: 's1', name: 'Bodyweight Squat',    muscles: ['Quads'],     category: 'squat', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 's2', name: 'Goblet Squat',        muscles: ['Quads'],     category: 'squat', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 's3', name: 'Pistol Squat',        muscles: ['Quads'],     category: 'squat', equipment: ['bodyweight'], nasmLevel: 4 },
  { key: 's4', name: 'Jump Squat',          muscles: ['Quads'],     category: 'squat', equipment: ['bodyweight'], nasmLevel: 3 },

  // HINGE (n=3)
  { key: 'h1', name: 'Glute Bridge',        muscles: ['Glutes'],    category: 'hinge', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'h2', name: 'Single-Leg Bridge',   muscles: ['Glutes'],    category: 'hinge', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'h3', name: 'Good Morning',        muscles: ['Hamstrings'],category: 'hinge', equipment: ['bodyweight'], nasmLevel: 2 },

  // LUNGE (n=3)
  { key: 'g1', name: 'Reverse Lunge',       muscles: ['Quads'],     category: 'lunge', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'g2', name: 'Walking Lunge',       muscles: ['Quads'],     category: 'lunge', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'g3', name: 'Bulgarian Split',     muscles: ['Quads'],     category: 'lunge', equipment: ['bodyweight'], nasmLevel: 3 },

  // CORE (n=4)
  { key: 'c1', name: 'Plank',               muscles: ['Core'],      category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'c2', name: 'Side Plank',          muscles: ['Core'],      category: 'core', equipment: ['bodyweight'], nasmLevel: 2 },
  { key: 'c3', name: 'Dead Bug',            muscles: ['Core'],      category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
  { key: 'c4', name: 'Bird Dog',            muscles: ['Core'],      category: 'core', equipment: ['bodyweight'], nasmLevel: 1 },
];

// Default mock context — bodyweight-equipment client, no pain.
const buildContext = (overrides = {}) => ({
  clientId: 99,
  clientName: 'Test Client',
  constraints: {
    nasmPhase: 2,
    recentlyUsedExercises: [],
    compensationTypes: [],
    ...(overrides.constraints || {}),
  },
  pain: { status: 'loaded_no_active_issue', exclusions: [], warnings: [], activeEntries: [] },
  movement: { compensations: [] },
  variation: { currentPattern: 'standard', lastSessionType: null },
  equipment: [{ id: 1, name: 'Bodyweight', items: [{ name: 'bodyweight', category: 'bodyweight', resistanceType: 'load' }] }],
  baseline: {}, nutrition: {}, goals: {}, body: {}, progressLevels: {}, streak: {},
});

let currentMockContext = buildContext();

vi.mock('../services/clientIntelligenceService.mjs', () => ({
  getClientContext: () => Promise.resolve(currentMockContext),
}));

vi.mock('../models/index.mjs', () => ({
  getModel: () => null,
  default: { sequelize: null },
}));

vi.mock('../services/exerciseRegistryService.mjs', () => ({
  getExerciseRegistryFromDB: () => Promise.resolve([]),
}), { virtual: true });

let generatePlan;
beforeEach(async () => {
  vi.clearAllMocks();
  currentMockContext = buildContext();
  ({ generatePlan } = await import('../services/workoutBuilderService.mjs'));
});

const baseOpts = (overrides = {}) => ({
  clientId: 99,
  trainerId: 98,
  durationWeeks: 2,
  sessionsPerWeek: 3,
  primaryGoal: 'general_fitness',
  registryOverride: productionShapeRegistry,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────
// Schedule→movement category expansion regression
// ─────────────────────────────────────────────────────────────

describe('generatePlan — schedule→movement category expansion (round-4)', () => {
  it('sessionsPerWeek=3 populates ALL 3 days (full_body / upper / lower) on a production-shape registry', async () => {
    const plan = await generatePlan(baseOpts({ durationWeeks: 2, sessionsPerWeek: 3 }));
    expect(Array.isArray(plan.weeks)).toBe(true);
    expect(plan.weeks).toHaveLength(2);

    // Every day of every week MUST have non-empty exercises.
    plan.weeks.forEach((week, wIdx) => {
      expect(week.days).toHaveLength(3);
      week.days.forEach((day, dIdx) => {
        expect(day.exercises.length).toBeGreaterThan(0);
        // Without the round-4 fix, days 1 (upper) + 2 (lower) would be [].
        // With the fix, both pull exercises from push/pull (upper) and
        // squat/hinge/lunge (lower) categories in the production registry.
      });
    });

    // Aggregate sanity: 2 weeks × 3 days = 6 sessions, 6 exercises each.
    const totalSlots = plan.weeks.flatMap(w => w.days).reduce((s, d) => s + d.exercises.length, 0);
    expect(totalSlots).toBeGreaterThanOrEqual(6 * 4); // at least 4 exercises per day on a small fixture
  });

  it('sessionsPerWeek=4 populates ALL 4 days (push / pull / legs / push) on a production-shape registry', async () => {
    const plan = await generatePlan(baseOpts({ durationWeeks: 2, sessionsPerWeek: 4 }));
    expect(plan.weeks).toHaveLength(2);
    plan.weeks.forEach((week) => {
      expect(week.days).toHaveLength(4);
      week.days.forEach((day) => {
        expect(day.exercises.length).toBeGreaterThan(0);
      });
    });
    // Day 2 (index 2) is the `legs` slot - this is the day the prior
    // bug masked. After the fix, it pulls from squat/hinge/lunge in
    // the production-shape registry.
    plan.weeks.forEach((week) => {
      const legsDay = week.days[2];
      expect(legsDay.focus.toLowerCase()).toMatch(/quads|hamstrings|glutes/);
      // At least one exercise must come from squat/hinge/lunge - verify
      // by looking up the keys in the registry.
      const usedKeys = legsDay.exercises.map(e => e.exerciseId);
      const usedExercises = usedKeys.map(k => productionShapeRegistry.find(r => r.key === k)).filter(Boolean);
      const usedCats = new Set(usedExercises.map(e => e.category));
      const legsCats = ['squat', 'hinge', 'lunge'];
      const hit = legsCats.some(c => usedCats.has(c));
      expect(hit).toBe(true);
    });
  });

  it('legacy fixture with category="legs" still works (backwards compat)', async () => {
    // The longHorizonRegistryFixture uses `category: 'legs'` directly.
    // The expansion list includes `'legs'` itself, so legacy fixtures
    // keep working alongside the production-shape categories.
    const legacyShapeRegistry = [
      ...productionShapeRegistry.filter(ex => ex.category !== 'squat' && ex.category !== 'hinge' && ex.category !== 'lunge'),
      // Re-add leg exercises tagged with the LEGACY 'legs' category.
      { key: 'lg1', name: 'Squat',         muscles: ['Quads'],     category: 'legs', equipment: ['bodyweight'], nasmLevel: 1 },
      { key: 'lg2', name: 'Lunge',         muscles: ['Quads'],     category: 'legs', equipment: ['bodyweight'], nasmLevel: 2 },
      { key: 'lg3', name: 'Glute Bridge',  muscles: ['Glutes'],    category: 'legs', equipment: ['bodyweight'], nasmLevel: 1 },
      { key: 'lg4', name: 'Step-Up',       muscles: ['Quads'],     category: 'legs', equipment: ['bodyweight'], nasmLevel: 2 },
    ];
    const plan = await generatePlan(baseOpts({
      durationWeeks: 1, sessionsPerWeek: 4, registryOverride: legacyShapeRegistry,
    }));
    plan.weeks[0].days.forEach((day) => {
      expect(day.exercises.length).toBeGreaterThan(0);
    });
  });
});

describe('generatePlan — eligible-pool count uses the same expansion (rotation fallback parity)', () => {
  it('does NOT mark rotationFallback=true on a legs day when the production-shape registry has 10 leg exercises', async () => {
    // Pool size = 4 (squat) + 3 (hinge) + 3 (lunge) = 10 distinct keys, well above the 7-distinct threshold.
    // Without the round-4 fix, the eligible-pool calc filtered by
    // `ex.category === 'legs'` (zero hits in production-shape) and
    // would have flagged rotationFallback=true on every legs day.
    const plan = await generatePlan(baseOpts({ durationWeeks: 4, sessionsPerWeek: 4 }));
    let fallbackCount = 0;
    plan.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.exercises.forEach((ex) => {
          if (ex.rotationFallback) fallbackCount += 1;
        });
      });
    });
    // Pool of 10 leg exercises easily covers the 7-distinct strict
    // rotation requirement, so no fallback flags expected.
    expect(fallbackCount).toBe(0);
  });
});
