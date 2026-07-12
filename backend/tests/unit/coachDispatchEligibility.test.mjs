/**
 * Cortex P0 Safety Truth — chat-bypass closure regression tests.
 *
 * Directive: docs/ai-workflow/AI-HANDOFF/SWAN-CORTEX-UNIFIED-BRAIN-MASTER-DIRECTIVE-2026-07-12.md §5.4
 * Eval-suite test 5: a chat AI_ADD_EXERCISE for a pain-excluded exercise is
 * refused server-side with an eligible alternative.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/logger.mjs', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const {
  filterEligibleFrontendActions,
  resolveExerciseFromRegistry,
} = await import('../../services/ai/coachDispatchEligibilityService.mjs');

const REGISTRY = [
  { key: 'barbell_bench_press', name: 'Barbell Bench Press', muscles: ['chest', 'shoulders', 'triceps'], category: 'push' },
  { key: 'standing_band_press', name: 'Standing Band Press', muscles: ['chest', 'shoulders', 'triceps'], category: 'push' },
  { key: 'goblet_squat', name: 'Goblet Squat', muscles: ['quads', 'glutes'], category: 'squat' },
  { key: 'mystery_custom', name: 'Mystery Custom', muscles: [], category: 'push' },
];

const cleanContext = (excludedMuscles = []) => ({
  criticalDataUnavailable: false,
  pain: { status: excludedMuscles.length ? 'loaded_active_issue' : 'loaded_no_active_issue', excludedMuscles },
  constraints: { excludedMuscles },
});

const run = (actions, { excluded = [], context, registry = REGISTRY } = {}) =>
  filterEligibleFrontendActions({
    actions,
    targetUserId: 42,
    requestingUserId: 7,
    loadRegistry: async () => registry,
    loadClientContext: async () => context ?? cleanContext(excluded),
  });

const addExercise = (exerciseName) => ({ event: 'AI_ADD_EXERCISE', payload: { exerciseName, sets: 3 } });

describe('resolveExerciseFromRegistry', () => {
  it('resolves exact names, keys, and unique substrings; rejects unknowns and ambiguity', () => {
    expect(resolveExerciseFromRegistry('Barbell Bench Press', REGISTRY)?.key).toBe('barbell_bench_press');
    expect(resolveExerciseFromRegistry('goblet_squat', REGISTRY)?.key).toBe('goblet_squat');
    expect(resolveExerciseFromRegistry('Goblet', REGISTRY)?.key).toBe('goblet_squat');
    expect(resolveExerciseFromRegistry('Invented Superflip Slam 9000', REGISTRY)).toBeNull();
    // 'press' matches two registry entries → ambiguous → refuse
    expect(resolveExerciseFromRegistry('press', REGISTRY)).toBeNull();
  });
});

describe('filterEligibleFrontendActions (Cortex P0 §5.4)', () => {
  it('test 5: a pain-excluded exercise is refused with eligible alternatives', async () => {
    const { allowed, refusals } = await run(
      [addExercise('Barbell Bench Press')],
      { excluded: ['chest', 'shoulders'] },
    );
    expect(allowed).toEqual([]);
    expect(refusals[0]).toEqual(expect.objectContaining({
      code: 'PAIN_EXCLUDED',
      exerciseName: 'Barbell Bench Press',
    }));
    // Alternative must itself be pain-eligible (goblet squat is different
    // category; same-category push entries all hit chest → none eligible here)
    for (const alt of refusals[0].alternatives) {
      const entry = REGISTRY.find(e => (e.name || e.key) === alt);
      expect(entry.muscles.some(m => ['chest', 'shoulders'].includes(m))).toBe(false);
    }
  });

  it('an LLM-invented exercise cannot pass (registry membership)', async () => {
    const { allowed, refusals } = await run([addExercise('Quantum Burpee Slam')], { excluded: [] });
    expect(allowed).toEqual([]);
    expect(refusals[0].code).toBe('EXERCISE_NOT_IN_REGISTRY');
  });

  it('untagged-muscle exercise is refused under active exclusions (fail-safe parity with §5.6)', async () => {
    const { refusals } = await run([addExercise('Mystery Custom')], { excluded: ['chest'] });
    expect(refusals[0].code).toBe('PAIN_EXCLUDED');
    expect(refusals[0].reason).toMatch(/untagged/);
  });

  it('fail-closed: safety-context failure refuses the add instead of passing it', async () => {
    const { allowed, refusals } = await filterEligibleFrontendActions({
      actions: [addExercise('Goblet Squat')],
      targetUserId: 42,
      requestingUserId: 7,
      loadRegistry: async () => REGISTRY,
      loadClientContext: async () => { throw new Error('db down'); },
    });
    expect(allowed).toEqual([]);
    expect(refusals[0].code).toBe('SAFETY_DATA_UNAVAILABLE');
  });

  it('fail-closed: pain source unavailable in context refuses the add', async () => {
    const { refusals } = await run([addExercise('Goblet Squat')], {
      context: { criticalDataUnavailable: true, pain: { status: 'unavailable', excludedMuscles: [] } },
    });
    expect(refusals[0].code).toBe('SAFETY_DATA_UNAVAILABLE');
  });

  it('eligible add passes with the CANONICAL registry name (no LLM spelling)', async () => {
    const { allowed, refusals } = await run([addExercise('goblet squat')], { excluded: ['chest'] });
    expect(refusals).toEqual([]);
    expect(allowed[0].payload.exerciseName).toBe('Goblet Squat');
    expect(allowed[0].payload.sets).toBe(3);
  });

  it('non-add events pass through unchanged (disclosed slice scope)', async () => {
    const toggle = { event: 'AI_TOGGLE_NASM_ITEM', payload: { section: 'warmup' } };
    const { allowed } = await run([toggle], { excluded: ['chest'] });
    expect(allowed).toEqual([toggle]);
  });
});

describe('blocking-tier parity (review-queue REVISE item, 2026-07-12)', () => {
  // A client whose deterministic gate is BLOCKING (active pain under review,
  // no excluded muscles yet — e.g. severity-8 entry outside the 72h auto-
  // exclusion window) 409s in the workout builder. Chat must not be a side
  // door: AI_ADD_EXERCISE is refused until the safety review happens in the
  // builder. Pain-excluded exercises keep their more specific refusal.
  const blockingNoExclusions = () => ({
    criticalDataUnavailable: false,
    pain: {
      status: 'loaded_active_issue',
      excludedMuscles: [],
      warnings: [{ region: 'shoulder', severity: 8 }],
    },
    constraints: { excludedMuscles: [] },
  });

  it('refuses AI_ADD_EXERCISE when the safety gate is blocking even with no excluded muscles', async () => {
    const { allowed, refusals } = await run(
      [addExercise('Goblet Squat')],
      { context: blockingNoExclusions() },
    );
    expect(allowed).toEqual([]);
    expect(refusals[0]).toEqual(expect.objectContaining({
      code: 'SAFETY_REVIEW_REQUIRED',
      exerciseName: 'Goblet Squat',
    }));
    expect(refusals[0].reviewRequiredSignals).toContain('active_pain_review_required');
  });

  it('keeps the specific PAIN_EXCLUDED refusal for pain-excluded exercises', async () => {
    const { refusals } = await run(
      [addExercise('Barbell Bench Press')],
      { excluded: ['chest', 'shoulders'] },
    );
    expect(refusals[0].code).toBe('PAIN_EXCLUDED');
  });

  it('leaves non-gated events untouched under a blocking gate (disclosed scope)', async () => {
    const { allowed } = await run(
      [{ event: 'AI_UPDATE_SET', payload: { index: 0, reps: 8 } }],
      { context: blockingNoExclusions() },
    );
    expect(allowed).toHaveLength(1);
  });

  it('still allows a clean add when the gate is not blocking', async () => {
    const { allowed, refusals } = await run([addExercise('Goblet Squat')], { excluded: [] });
    expect(refusals).toEqual([]);
    expect(allowed[0].payload.exerciseName).toBe('Goblet Squat');
  });
});
