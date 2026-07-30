/**
 * Suggested-workouts composer contract (Workout-OS C6).
 * Deterministic, zero-LLM. Uses the REAL shared eligibility spine
 * (painVerdictForExercise + resolveClientPainExclusions) — only the context,
 * cortex, gate, and registry loaders are mocked. Locks: plan-wins stand-down,
 * fail-closed holds (unknown pain / review-required / missing policy vault /
 * empty registry), shared-verdict pain filtering incl. the untagged fail-safe,
 * cold-start conservatism, and rationale truth.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetClientContext = vi.fn();
vi.mock('../../services/clientIntelligenceService.mjs', () => ({
  getClientContext: (...args) => mockGetClientContext(...args),
}));

const mockGate = vi.fn(() => ({ status: 'clear', reviewRequiredSignals: [] }));
vi.mock('../../services/swanCoachPlanningFingerprintService.mjs', () => ({
  buildSwanCoachPlanningSafetyGateFromContext: (...args) => mockGate(...args),
}));

const mockReadiness = vi.fn(async () => ({ level: 'green', constraints: {} }));
vi.mock('../../services/swanCoachCortexService.mjs', () => ({
  buildSwanCoachReadinessContext: (...args) => mockReadiness(...args),
  scoreExerciseForSwanCoachReadiness: vi.fn(() => 0),
  applySwanCoachReadinessToExercises: vi.fn((exercises) => exercises),
}));

const mockRegistry = vi.fn();
vi.mock('../../services/variationEngine.mjs', () => ({
  getExerciseRegistryFromDB: (...args) => mockRegistry(...args),
}));

vi.mock('../../utils/logger.mjs', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const { buildSuggestedWorkouts } = await import('../../services/suggestedWorkoutService.mjs');

const exercise = (key, category, muscles, nasmLevel = 2) => ({
  key, name: key.replace(/_/g, ' '), category, muscles, nasmLevel,
});

const FULL_REGISTRY = [
  exercise('goblet_squat', 'squat', ['quads', 'glutes']),
  exercise('leg_press', 'squat', ['quads', 'glutes'], 3),
  exercise('pushup', 'push', ['chest', 'triceps']),
  exercise('overhead_press', 'push', ['anterior_deltoid', 'triceps'], 3),
  exercise('band_row', 'pull', ['lats', 'biceps']),
  exercise('lat_pulldown', 'pull', ['lats', 'biceps'], 2),
  exercise('plank', 'core', ['abs']),
  exercise('dead_bug', 'core', ['abs']),
  exercise('bird_dog', 'core', ['abs', 'glutes']),
];

const baseContext = (overrides = {}) => ({
  activeProgram: null,
  criticalDataUnavailable: false,
  pain: { status: 'loaded_no_active_issue', excludedMuscles: [], warnings: [] },
  constraints: { excludedMuscles: [] },
  workouts: { sessionsLast2Weeks: 4, recentExercises: ['pushup'] },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGate.mockReturnValue({ status: 'clear', reviewRequiredSignals: [] });
  mockReadiness.mockResolvedValue({ level: 'green', constraints: {} });
  mockRegistry.mockResolvedValue(FULL_REGISTRY);
});

describe('buildSuggestedWorkouts', () => {
  it('stands down entirely when an active plan exists (plan wins)', async () => {
    mockGetClientContext.mockResolvedValue(baseContext({ activeProgram: { title: 'Six Month Arc' } }));
    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });
    expect(result.hold).toBe('plan_active');
    expect(result.suggestions).toEqual([]);
    expect(result.planPointer.title).toBe('Six Month Arc');
  });

  it('holds fail-closed on UNKNOWN pain state — never treats it as no pain', async () => {
    mockGetClientContext.mockResolvedValue(baseContext({ pain: { status: 'unavailable' } }));
    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });
    expect(result.hold).toBe('pain_data_unavailable');
  });

  it('holds when the blocking safety gate is review_required, carrying the signals', async () => {
    mockGetClientContext.mockResolvedValue(baseContext());
    mockGate.mockReturnValue({ status: 'review_required', reviewRequiredSignals: ['active_pain_review_required'] });
    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });
    expect(result.hold).toBe('safety_review_required');
    expect(result.safetyFlags).toEqual(['active_pain_review_required']);
  });

  it('holds when the readiness policy vault is unavailable (throw = hold, not green)', async () => {
    mockGetClientContext.mockResolvedValue(baseContext());
    mockReadiness.mockRejectedValue(new Error('no approved vault note'));
    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });
    expect(result.hold).toBe('safety_context_unavailable');
  });

  it('holds when the registry is empty', async () => {
    mockGetClientContext.mockResolvedValue(baseContext());
    mockRegistry.mockResolvedValue([]);
    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });
    expect(result.hold).toBe('registry_unavailable');
  });

  it('filters pain-excluded muscles AND untagged exercises through the shared verdict', async () => {
    mockGetClientContext.mockResolvedValue(baseContext({
      pain: { status: 'loaded_active_issue', excludedMuscles: ['chest'], warnings: [] },
    }));
    mockRegistry.mockResolvedValue([
      ...FULL_REGISTRY,
      exercise('mystery_machine', 'push', []), // untagged → fail-safe reject
    ]);

    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });

    expect(result.suggestions.length).toBeGreaterThan(0);
    const allNames = result.suggestions.flatMap((s) => s.exercises.map((e) => e.key));
    expect(allNames).not.toContain('pushup');           // chest excluded
    expect(allNames).not.toContain('mystery_machine');  // untagged fail-safe
    const rationale = result.suggestions[0].whyRationale.join(' ');
    expect(rationale).toMatch(/pain chart is respected/);
  });

  it('cold start composes conservatively and labels for coach refinement', async () => {
    mockGetClientContext.mockResolvedValue(baseContext({
      workouts: { sessionsLast2Weeks: 0, recentExercises: [] },
    }));

    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });

    expect(result.coldStart).toBe(true);
    expect(result.suggestions[0].coldStart).toBe(true);
    expect(result.suggestions[0].whyRationale[0]).toMatch(/coach will refine/);
    // Conservative bias: nothing above nasmLevel 3 should out-rank level ≤2 picks.
    const levels = result.suggestions.flatMap((s) => s.exercises.map((e) => e.nasmLevel));
    expect(Math.min(...levels)).toBeLessThanOrEqual(2);
  });

  it('returns at most 3 ranked suggestions with readiness rationale when not green', async () => {
    mockGetClientContext.mockResolvedValue(baseContext());
    mockReadiness.mockResolvedValue({ level: 'yellow', constraints: { avoidAggressiveIntensity: true } });

    const result = await buildSuggestedWorkouts({ clientId: 11, trainerId: 99 });

    expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
    expect(result.readinessLevel).toBe('yellow');
    expect(result.suggestions[0].whyRationale.join(' ')).toMatch(/Readiness is yellow/);
  });
});
