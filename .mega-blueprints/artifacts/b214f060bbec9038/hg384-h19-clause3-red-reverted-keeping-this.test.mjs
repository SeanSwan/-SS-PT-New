/**
 * ============================================================================
 * FILE: workoutBuilderRecentWindow.test.mjs — R-H19 clause 3.
 *
 * THE REGISTER'S CRITERION (server contract `13-server-repair-contract.md:297`, S-H19 → R-H19):
 *   "Six requested movement families cannot vanish due to ceil/slice; stored pattern beats
 *    category; recent window contains SESSIONS, not last seven individual exercises"
 *
 * THE DEFECT THIS PINS, read from `workoutBuilderService.mjs` before anything was written:
 *   :1220  `const recentExerciseKeys = []` — its own comment says "sliding window of last 7
 *          sessions' exercises (flattened)"
 *   :1348  each generated day PUSHES its ~6 keys onto that ONE flat array
 *   :1287  `recentExerciseKeys.slice(-7)` then takes the last seven *KEYS*, not seven sessions
 *   :1308  the same slice feeds the rotation-fallback detection
 * Seven keys is barely one session, so the window silently covers only the immediately previous
 * day while the comment, the contract and the fallback arithmetic all assume seven sessions.
 *
 * HOW THE WINDOW IS OBSERVABLE: `selectExercises:376-382` builds a set from the window and sorts
 * recently-used exercises to the END of the candidate ranking. It is a sort key, not a filter —
 * which is exactly why the truncation is quiet: nothing errors, recently-used work is merely no
 * longer deprioritised, so an exercise from two to seven sessions ago can come back ahead of
 * genuinely fresh alternatives. This test therefore asserts the contract's semantics directly:
 * across a plan, an exercise must not reappear inside a seven-session window.
 *
 * WHY A NEW FILE rather than the file the contract names: `backend/__tests__/
 * workoutBuilderLongHorizon.test.mjs` is 342 lines, already over the rule-4 cap of 300, so the
 * evidence lives here instead of growing a capped file. This harness installs the same three mocks
 * that file uses, reuses its committed fixture registry, and passes `registryOverride`, so no
 * database is touched.
 * ============================================================================
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fixtureRegistry, fixturePoolSizes } from './fixtures/longHorizonRegistryFixture.mjs';

// Same shape as the known-good fixture in `workoutBuilderLongHorizon.test.mjs:23-52`. The shape is
// load-bearing: the builder reads `context.constraints.nasmPhase` and `context.movement.compensations`,
// and an absent branch is a SETUP error, which is not valid RED proof.
const buildContext = () => ({
  clientId: 99,
  clientName: 'Recent Window Client',
  constraints: { nasmPhase: 2, recentlyUsedExercises: [], compensationTypes: [] },
  pain: { status: 'loaded_no_active_issue', exclusions: [], warnings: [], activeEntries: [] },
  movement: { compensations: [] },
  variation: { currentPattern: 'standard', lastSessionType: null },
  workouts: { sessionsLast2Weeks: 0 },
  equipment: [],
  baseline: {},
  nutrition: {},
  goals: {},
  body: {},
  progressLevels: {},
  streak: {},
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
  currentMockContext = buildContext();
  vi.clearAllMocks();
  ({ generatePlan } = await import('../services/workoutBuilderService.mjs'));
});

const buildPlan = (overrides = {}) => generatePlan({
  clientId: 99,
  trainerId: 98,
  durationWeeks: 4,
  // 4 sessions/week selects the production push/pull/legs/push rotation, which is the pool the
  // committed fixture populates (see the fixture comment in the long-horizon test).
  sessionsPerWeek: 4,
  primaryGoal: 'general_fitness',
  registryOverride: fixtureRegistry,
  ...overrides,
});

/** Every session's exercise keys, in generation order. */
const sessionsOf = (plan) => (plan?.weeks ?? [])
  .flatMap((week) => week.days ?? [])
  .map((day) => (day.exercises ?? []).map((exercise) => exercise.exerciseId));

/** Which category each fixture exercise belongs to, so a violation can be attributed. */
const categoryOf = new Map(fixtureRegistry.map((exercise) => [exercise.key, exercise.category]));

/**
 * Categories whose pool is too thin for a seven-session window to be honoured.
 *
 * This exclusion is ARITHMETIC, not convenience. `core` has four exercises; a window of seven
 * sessions cannot avoid repeating them, and the service is explicit that a pool smaller than the
 * window falls back rather than failing (`eligiblePoolSize < 7` marks `rotationFallback`). Blaming
 * the window for those repeats would make this test assert something no correct implementation can
 * satisfy — so the first test below pins the exclusion instead of hiding it.
 */
const WINDOW = 7;
const thinCategories = new Set(
  Object.entries(fixturePoolSizes)
    .filter(([, size]) => size < WINDOW + 1)
    .map(([category]) => category),
);

/** Every repeat inside one window, for exercises whose category has a pool large enough to rotate. */
const repeatsInsideWindow = (sessions) => {
  const lastSeen = new Map();
  const violations = [];
  sessions.forEach((keys, index) => {
    for (const key of keys) {
      if (thinCategories.has(categoryOf.get(key))) continue;
      if (lastSeen.has(key) && index - lastSeen.get(key) <= WINDOW) {
        violations.push({ key, category: categoryOf.get(key), sessionsApart: index - lastSeen.get(key) });
      }
      lastSeen.set(key, index);
    }
  });
  return violations;
};

describe('R-H19 clause 3 — the recent window contains sessions, not the last seven exercises', () => {
  it('pins WHICH categories this window can be held to, and why', () => {
    // The fixture commits to these numbers; the assertion below is only meaningful for the
    // categories that can actually rotate, so the exclusion is stated rather than implied.
    expect(fixturePoolSizes).toEqual({ push: 8, pull: 8, legs: 11, core: 4 });
    expect([...thinCategories]).toEqual(['core']);
    const rotatable = Object.keys(fixturePoolSizes).filter((category) => !thinCategories.has(category));
    expect(rotatable.length).toBeGreaterThanOrEqual(3);
  });

  it('never repeats a rotatable exercise inside a seven-session window', async () => {
    const plan = await buildPlan();
    const sessions = sessionsOf(plan);

    // The plan must be long enough for the window to matter at all.
    expect(sessions.length).toBeGreaterThan(8);

    const violations = repeatsInsideWindow(sessions);

    // Named so a failure says WHICH exercise came back, from which category, and how soon — not
    // merely that two sets differed.
    expect(violations).toEqual([]);
  });
});
