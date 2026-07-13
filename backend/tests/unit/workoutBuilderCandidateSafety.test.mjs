/**
 * Guided-candidates pain safety — regression tests
 * ================================================
 * The candidates surface (`POST /api/workout-builder/candidates`, "Guide Me")
 * recommended exercises for a specific client with NO pain filtering at all:
 * a client with severity-9 knee pain whose quads were auto-excluded would be
 * blocked in /generate, while "Guide Me" happily listed a barbell squat as a
 * top pick — the trainer could assemble the whole session from candidates and
 * never see a gate. Flagged in the 2026-07-12 independent Cortex P0 review
 * and disclosed by its builder as a residual; this closes it.
 *
 * Contract (same semantics as the builder + the chat gate, one shared
 * verdict helper):
 *  1. Exercises hitting the client's excluded muscles never appear.
 *  2. Untagged-muscle fail-safe: under active exclusions, an exercise with
 *     no muscle tags is excluded (unknown never passes as safe).
 *  3. Unknown pain state (source unavailable / critical data failure) holds
 *     ALL candidates fail-visibly instead of recommending blind.
 *  4. A clear client is unchanged.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const cleanContext = (overrides = {}) => ({
  clientName: 'Client #42',
  criticalDataUnavailable: false,
  criticalFailures: [],
  constraints: { nasmPhase: 2, recentlyUsedExercises: [], compensationTypes: [], estimated1RMs: null, excludedMuscles: [] },
  equipment: [],
  pain: { status: 'loaded_no_active_issue', excludedMuscles: [], exclusions: [], warnings: [] },
  movement: { compensations: [] },
  workouts: { sessionsLast2Weeks: 5, avgFormRating: 3.2 },
  goals: { primaryGoal: 'strength' },
  ...overrides,
});

let contextForTest = cleanContext();

const registry = [
  { key: 'barbell_back_squat', name: 'Barbell Back Squat', muscles: ['quads', 'glutes'], category: 'squat', equipment: ['barbell'], nasmLevel: 3, movementPattern: 'squat', source: 'swanstudios' },
  { key: 'glute_bridge', name: 'Glute Bridge', muscles: ['glutes', 'hamstrings'], category: 'hinge', equipment: ['bodyweight'], nasmLevel: 1, movementPattern: 'hinge', source: 'swanstudios' },
  { key: 'seated_hamstring_curl', name: 'Seated Hamstring Curl', muscles: ['hamstrings'], category: 'lunge', equipment: ['machine'], nasmLevel: 2, movementPattern: 'lunge', source: 'swanstudios' },
  { key: 'mystery_move', name: 'Mystery Move', muscles: [], category: 'squat', equipment: ['bodyweight'], nasmLevel: 2, movementPattern: 'squat', source: 'custom' },
];

async function loadCandidateService() {
  vi.resetModules();
  vi.doMock('../../services/clientIntelligenceService.mjs', () => ({
    getClientContext: vi.fn(async () => contextForTest),
  }));
  vi.doMock('../../services/variationEngine.mjs', () => ({
    getExerciseRegistryFromDB: vi.fn(async () => registry),
  }));
  vi.doMock('../../utils/logger.mjs', () => ({
    default: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
  }));
  return import('../../services/workoutBuilderCandidateService.mjs');
}

const run = async (overrides = {}) => {
  const { generateWorkoutCandidates } = await loadCandidateService();
  return generateWorkoutCandidates({
    clientId: 42,
    trainerId: 7,
    category: 'legs',
    primaryGoal: 'strength',
    nasmPhase: 2,
    ...overrides,
  });
};

const candidateKeys = (result) => result.slots[0].candidates.map(c => c.exerciseKey);

beforeEach(() => {
  contextForTest = cleanContext();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('guided candidates × pain safety', () => {
  it('never recommends an exercise that targets pain-excluded muscles', async () => {
    contextForTest = cleanContext({
      pain: { status: 'loaded_active_issue', excludedMuscles: ['quads'], exclusions: [], warnings: [] },
      constraints: { ...cleanContext().constraints, excludedMuscles: ['quads'] },
    });

    const result = await run();
    const keys = candidateKeys(result);
    expect(keys).not.toContain('barbell_back_squat');
    expect(keys).toContain('glute_bridge');
    expect(result.painExclusionsApplied).toEqual(['quads']);
  });

  it('excludes untagged-muscle exercises while exclusions are active (fail-safe)', async () => {
    contextForTest = cleanContext({
      pain: { status: 'loaded_active_issue', excludedMuscles: ['quads'], exclusions: [], warnings: [] },
    });

    const keys = candidateKeys(await run());
    expect(keys).not.toContain('mystery_move');
  });

  it('holds ALL candidates fail-visibly when pain data is unavailable', async () => {
    contextForTest = cleanContext({
      pain: { status: 'unavailable' },
    });

    const result = await run();
    expect(result.slots[0].candidates).toEqual([]);
    expect(result.safetyHold).toBe('pain_data_unavailable');
    expect(result.slots[0].instruction).toMatch(/safety|pain/i);
  });

  it('holds ALL candidates when critical client data failed to load', async () => {
    contextForTest = cleanContext({ criticalDataUnavailable: true });

    const result = await run();
    expect(result.slots[0].candidates).toEqual([]);
    expect(result.safetyHold).toBe('pain_data_unavailable');
  });

  it('leaves a clear client unchanged (untagged move allowed when no exclusions)', async () => {
    const result = await run();
    const keys = candidateKeys(result);
    expect(keys).toContain('barbell_back_squat');
    expect(keys).toContain('mystery_move');
    expect(result.safetyHold).toBeUndefined();
    expect(result.painExclusionsApplied).toEqual([]);
  });
});

describe('guided candidates × blocking review gate (hostile-review HIGH-1, 2026-07-13)', () => {
  it('holds ALL candidates when the client\'s deterministic gate is review_required — even with no excluded muscles', async () => {
    // Severity-8 entry outside the 72h auto-exclusion window: excludedMuscles
    // is empty but the gate blocks. Builder 409s, chat refuses — candidates
    // must not be the remaining side door.
    contextForTest = cleanContext({
      pain: {
        status: 'loaded_active_issue',
        excludedMuscles: [],
        exclusions: [],
        warnings: [{ region: 'left_shoulder', severity: 8 }],
      },
    });

    const result = await run();
    expect(result.slots[0].candidates).toEqual([]);
    expect(result.safetyHold).toBe('safety_review_required');
    expect(result.reviewRequiredSignals).toContain('active_pain_review_required');
    expect(result.slots[0].instruction).toMatch(/review/i);
  });
});
