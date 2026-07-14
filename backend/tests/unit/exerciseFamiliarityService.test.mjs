/**
 * Exercise Familiarity Service — unit tests (2026-07-14)
 * ======================================================
 * Locks the familiarity-aware generation contract:
 *   1. familiarity map building + free-text name normalization
 *   2. novel-cap enforcement per generated day (soft cap + backfill)
 *   3. no-history (new client) exemption
 *   4. barbell-averse novel preference when history is machine-only
 *   5. fail-open on DB error (generation proceeds as before)
 * Plus an end-to-end generateWorkout check that the day-level cap holds.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const machineHistoryRows = [
  { exerciseName: '  Seated Leg  Press ' },
  { exerciseName: 'CHEST press (machine)' },
  { exerciseName: 'Lat Pulldown' },
];

function mockModels({ sessions, logs, sessionError, logError } = {}) {
  vi.doMock('../../models/index.mjs', () => ({
    getExercise: () => null,
    getWorkoutSession: () => ({
      findAll: vi.fn(async () => {
        if (sessionError) throw new Error(sessionError);
        return sessions ?? [{ id: 'sess-1' }, { id: 'sess-2' }];
      }),
    }),
    getWorkoutLog: () => ({
      findAll: vi.fn(async () => {
        if (logError) throw new Error(logError);
        return logs ?? machineHistoryRows;
      }),
    }),
  }));
}

const warnSpy = vi.fn();
function mockLogger() {
  vi.doMock('../../utils/logger.mjs', () => ({
    default: { warn: warnSpy, error: vi.fn(), info: vi.fn() },
  }));
}

async function loadService(modelOptions) {
  vi.resetModules();
  warnSpy.mockClear();
  mockLogger();
  mockModels(modelOptions);
  return import('../../services/exerciseFamiliarityService.mjs');
}

const registry = [
  { key: 'seated_leg_press', name: 'Seated Leg Press', muscles: ['quads', 'glutes'], category: 'squat', equipment: ['machine'], nasmLevel: 2, movementPattern: 'squat' },
  { key: 'chest_press_machine', name: 'Chest Press (Machine)', muscles: ['chest', 'triceps'], category: 'push', equipment: ['machine'], nasmLevel: 2, movementPattern: 'push' },
  { key: 'lat_pulldown', name: 'Lat Pulldown', muscles: ['back', 'lats'], category: 'pull', equipment: ['cable'], nasmLevel: 2, movementPattern: 'pull' },
  { key: 'barbell_back_squat', name: 'Barbell Back Squat', muscles: ['quads', 'glutes'], category: 'squat', equipment: ['barbell'], nasmLevel: 3, movementPattern: 'squat' },
  { key: 'goblet_squat', name: 'Goblet Squat', muscles: ['quads', 'glutes'], category: 'squat', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'squat' },
  { key: 'cable_row', name: 'Cable Row', muscles: ['back', 'lats'], category: 'pull', equipment: ['cable'], nasmLevel: 2, movementPattern: 'pull' },
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('buildExerciseFamiliarity — map building + normalization', () => {
  it('normalizes free-text log names (case/whitespace/punctuation) and enriches from the registry', async () => {
    const svc = await loadService();
    const familiarity = await svc.buildExerciseFamiliarity(42, registry);

    expect(familiarity.hasHistory).toBe(true);
    expect(familiarity.familiarNames.has('seated leg press')).toBe(true);
    expect(familiarity.familiarNames.has('chest press machine')).toBe(true);
    expect(familiarity.familiarNames.has('lat pulldown')).toBe(true);
    // Registry enrichment: muscles + patterns of familiar movements
    expect(familiarity.familiarMuscles.has('quads')).toBe(true);
    expect(familiarity.familiarPatterns.has('pull')).toBe(true);
    // Machine-only history → no barbell familiarity
    expect(familiarity.usesBarbell).toBe(false);

    expect(svc.isFamiliarExercise(registry[0], familiarity)).toBe(true);
    expect(svc.isFamiliarExercise(registry[3], familiarity)).toBe(false);
  });

  it('returns hasHistory:false for a client with sessions but no logged exercises', async () => {
    const svc = await loadService({ logs: [] });
    const familiarity = await svc.buildExerciseFamiliarity(42, registry);
    expect(familiarity).toEqual(expect.objectContaining({ hasHistory: false }));
  });
});

describe('no-history exemption (new client)', () => {
  it('scores 0 and creates no budget so selection behaves exactly as today', async () => {
    const svc = await loadService({ sessions: [] });
    const familiarity = await svc.buildExerciseFamiliarity(7, registry);

    expect(familiarity.hasHistory).toBe(false);
    expect(svc.scoreExerciseFamiliarity(registry[3], familiarity)).toBe(0);
    expect(svc.createNoveltyBudget(familiarity)).toBeNull();
    // Null familiarity (fail-open path) is also exempt
    expect(svc.scoreExerciseFamiliarity(registry[3], null)).toBe(0);
    expect(svc.selectWithNoveltyCap(registry, 4, null, null)).toEqual(registry.slice(0, 4));
  });
});

describe('novel-cap enforcement per day', () => {
  it('caps novel picks at the budget, prefers familiar, and shares the budget across categories', async () => {
    const svc = await loadService();
    const familiarity = await svc.buildExerciseFamiliarity(42, registry);
    const budget = svc.createNoveltyBudget(familiarity); // remaining: 2

    const novels = [
      { key: 'novel_a', name: 'Novel A' }, { key: 'novel_b', name: 'Novel B' },
      { key: 'novel_c', name: 'Novel C' }, { key: 'novel_d', name: 'Novel D' },
    ];
    // Category 1: 1 familiar + novels ranked below it
    const pick1 = svc.selectWithNoveltyCap([registry[0], ...novels], 2, familiarity, budget);
    expect(pick1.map(e => e.key)).toEqual(['seated_leg_press', 'novel_a']);
    expect(budget.remaining).toBe(1);

    // Category 2 (same day): only 1 novel slot left; familiar backfills
    const pick2 = svc.selectWithNoveltyCap([novels[1], novels[2], registry[2]], 2, familiarity, budget);
    expect(pick2.map(e => e.key)).toEqual(['novel_b', 'lat_pulldown']);
    expect(budget.remaining).toBe(0);

    // Category 3: budget exhausted → familiar only while available
    const pick3 = svc.selectWithNoveltyCap([novels[3], registry[1]], 1, familiarity, budget);
    expect(pick3.map(e => e.key)).toEqual(['chest_press_machine']);
  });

  it('soft cap: backfills with novel exercises rather than returning a short day', async () => {
    const svc = await loadService();
    const familiarity = await svc.buildExerciseFamiliarity(42, registry);
    const budget = { remaining: 1 };
    const novels = [{ key: 'n1' }, { key: 'n2' }, { key: 'n3' }];
    const picked = svc.selectWithNoveltyCap(novels, 3, familiarity, budget);
    expect(picked).toHaveLength(3); // never short a day because of the cap
  });
});

describe('barbell-averse novel preference (machine-only history)', () => {
  it('ranks a novel barbell lift below a novel machine/cable progression of familiar work', async () => {
    const svc = await loadService();
    const familiarity = await svc.buildExerciseFamiliarity(42, registry);

    const barbell = svc.scoreExerciseFamiliarity(registry[3], familiarity); // barbell back squat, level 3
    const goblet = svc.scoreExerciseFamiliarity(registry[4], familiarity);  // dumbbell squat progression
    const cableRow = svc.scoreExerciseFamiliarity(registry[5], familiarity); // cable pull progression
    const familiar = svc.scoreExerciseFamiliarity(registry[0], familiarity);

    expect(familiar).toBe(svc.FAMILIAR_EXERCISE_BOOST);
    expect(barbell).toBeLessThan(goblet);
    expect(barbell).toBeLessThan(cableRow);
    expect(cableRow).toBeGreaterThan(0); // kinship + friendly equipment
    expect(barbell).toBeLessThan(0);     // barbell penalty + difficulty penalty outweigh kinship
  });

  it('does not penalize barbell work when history includes barbell lifts', async () => {
    const svc = await loadService({ logs: [{ exerciseName: 'Barbell Back Squat' }] });
    const familiarity = await svc.buildExerciseFamiliarity(42, registry);
    expect(familiarity.usesBarbell).toBe(true);
    // A novel barbell lift sharing a familiar pattern is a normal progression
    const novelBarbell = svc.scoreExerciseFamiliarity(
      { key: 'barbell_front_squat', name: 'Barbell Front Squat', muscles: ['quads'], equipment: ['barbell'], nasmLevel: 2, movementPattern: 'squat' },
      familiarity,
    );
    expect(novelBarbell).toBe(svc.PROGRESSION_KINSHIP_BONUS);
  });
});

describe('fail-open on DB error', () => {
  it('returns null and logs a warning when the session query fails', async () => {
    const svc = await loadService({ sessionError: 'db down' });
    const familiarity = await svc.buildExerciseFamiliarity(42, registry);
    expect(familiarity).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('history lookup failed'),
      expect.objectContaining({ clientId: 42, error: 'db down' }),
    );
  });

  it('returns null when the log query fails', async () => {
    const svc = await loadService({ logError: 'timeout' });
    expect(await svc.buildExerciseFamiliarity(42, registry)).toBeNull();
  });

  it('returns null when workout models are unavailable (mocked harness safety)', async () => {
    vi.resetModules();
    warnSpy.mockClear();
    mockLogger();
    vi.doMock('../../models/index.mjs', () => ({ getExercise: () => null }));
    const svc = await import('../../services/exerciseFamiliarityService.mjs');
    expect(await svc.buildExerciseFamiliarity(42, registry)).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe('generateWorkout integration — day-level novel cap', () => {
  it('holds the per-day novel cap in a full generateWorkout run with logged history', async () => {
    vi.resetModules();
    warnSpy.mockClear();
    mockLogger();

    // One familiar (logged) + one novel exercise per movement category.
    const familiarPerCategory = [
      { key: 'chest_press_machine', name: 'Chest Press (Machine)', muscles: ['chest'], category: 'push', equipment: ['machine'], nasmLevel: 2, movementPattern: 'push' },
      { key: 'lat_pulldown', name: 'Lat Pulldown', muscles: ['back'], category: 'pull', equipment: ['cable'], nasmLevel: 2, movementPattern: 'pull' },
      { key: 'seated_leg_press', name: 'Seated Leg Press', muscles: ['quads'], category: 'squat', equipment: ['machine'], nasmLevel: 2, movementPattern: 'squat' },
      { key: 'machine_back_extension', name: 'Machine Back Extension', muscles: ['hamstrings'], category: 'hinge', equipment: ['machine'], nasmLevel: 2, movementPattern: 'hinge' },
      { key: 'machine_lunge', name: 'Machine Lunge', muscles: ['quads'], category: 'lunge', equipment: ['machine'], nasmLevel: 2, movementPattern: 'lunge' },
      { key: 'cable_crunch', name: 'Cable Crunch', muscles: ['core'], category: 'core', equipment: ['cable'], nasmLevel: 2, movementPattern: 'core' },
    ];
    const bigRegistry = [
      ...familiarPerCategory,
      { key: 'novel_push_1', name: 'Novel Push 1', muscles: ['chest'], category: 'push', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'push' },
      { key: 'novel_pull_1', name: 'Novel Pull 1', muscles: ['back'], category: 'pull', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'pull' },
      { key: 'novel_squat_1', name: 'Novel Squat 1', muscles: ['quads'], category: 'squat', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'squat' },
      { key: 'novel_hinge_1', name: 'Novel Hinge 1', muscles: ['hamstrings'], category: 'hinge', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'hinge' },
      { key: 'novel_lunge_1', name: 'Novel Lunge 1', muscles: ['quads'], category: 'lunge', equipment: ['dumbbell'], nasmLevel: 2, movementPattern: 'lunge' },
      { key: 'novel_core_1', name: 'Novel Core 1', muscles: ['core'], category: 'core', equipment: ['bodyweight'], nasmLevel: 2, movementPattern: 'core' },
    ];
    const familiarKeys = new Set(familiarPerCategory.map(ex => ex.key));

    // Machine-only history covering every category.
    mockModels({ logs: familiarPerCategory.map(ex => ({ exerciseName: ex.name })) });
    vi.doMock('../../services/clientIntelligenceService.mjs', () => ({
      getClientContext: vi.fn(async () => ({
        clientName: 'Client #42',
        criticalDataUnavailable: false,
        criticalFailures: [],
        // Familiar movements marked recently-used so the rotation sort key
        // ranks NOVEL exercises first in every category — without the cap,
        // all 6 picks would be novel. The cap must hold it to 2.
        constraints: { nasmPhase: 2, recentlyUsedExercises: [...familiarKeys], compensationTypes: [], excludedMuscles: [], estimated1RMs: null },
        equipment: [],
        pain: { exclusions: [], warnings: [] },
        movement: { compensations: [] },
        variation: { lastSessionType: null, currentPattern: 'standard' },
        workouts: { sessionsLast2Weeks: 5, avgFormRating: 3.2 },
        goals: { primaryGoal: 'general_fitness' },
        body: null, baseline: null, nutrition: null, progressLevels: null,
        streak: null, activeProgram: null, trainingVault: null, sourcePolicy: null,
        safety: null, health: null, specialPopulation: null,
      })),
    }));
    vi.doMock('../../services/variationEngine.mjs', () => ({
      getExerciseRegistry: vi.fn(() => bigRegistry),
      getExerciseRegistryFromDB: vi.fn(async () => bigRegistry),
      generateSwapSuggestions: vi.fn(() => []),
      getNextSessionType: vi.fn(() => 'build'),
      recordVariation: vi.fn(async () => {}),
    }));

    const { generateWorkout } = await import('../../services/workoutBuilderService.mjs');
    const workout = await generateWorkout({
      clientId: 42, trainerId: 7, category: 'full_body', exerciseCount: 6,
      // Deterministic safety gate is review_required for this minimal mock
      // context — acknowledge it; familiarity is what's under test here.
      planningReviewAcknowledged: true,
      planningReviewActorRole: 'trainer',
      planningReviewReason: 'Familiarity cap test — context reviewed',
    });

    const novelCount = workout.exercises.filter(ex => !familiarKeys.has(ex.exerciseKey)).length;
    expect(workout.exercises.length).toBeGreaterThan(0);
    expect(novelCount).toBeLessThanOrEqual(2); // MAX_NOVEL_EXERCISES_PER_DAY
    // familiar movements actually made the plan
    expect(workout.exercises.some(ex => familiarKeys.has(ex.exerciseKey))).toBe(true);
  });
});
