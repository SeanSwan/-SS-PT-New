/**
 * contextBuilder — Unit Tests (TDD-first)
 *
 * Unified AI context builder that merges de-identified payload,
 * NASM constraints, template context, progress context, and 1RM data
 * into a single generation context + explainability metadata.
 *
 * Phase 5A — Smart Workout Logger MVP Coach Copilot
 */
import { describe, it, expect } from 'vitest';
import { buildUnifiedContext } from '../../services/ai/contextBuilder.mjs';

// ─── Fixture Helpers ──────────────────────────────────────────
const makeDeIdPayload = (overrides = {}) => ({
  client: { alias: 'Phoenix', age: 32, gender: 'male', goals: { primary: 'hypertrophy' } },
  training: { experience: '2_years', frequency: 4 },
  measurements: { weight: 180, height: 72 },
  ...overrides,
});

const makeNasmConstraints = (overrides = {}) => ({
  parqClearance: true,
  medicalClearanceRequired: false,
  nasmAssessmentScore: 14,
  ohsaCompensations: [],
  posturalDeviations: [],
  optPhase: 'hypertrophy',
  optPhaseConfig: { phase: 3, phaseName: 'Hypertrophy' },
  primaryGoal: 'hypertrophy',
  trainingTier: 'gold',
  performanceData: null,
  ...overrides,
});

const makeTemplateContext = (overrides = {}) => ({
  primaryTemplateId: 'opt-phase-3-hypertrophy',
  templateRefs: [{ id: 'opt-phase-3-hypertrophy', role: 'programming' }],
  registryVersion: '4.0.0',
  programmingTemplate: {
    id: 'opt-phase-3-hypertrophy',
    phase: 3,
    phaseName: 'Hypertrophy',
    programming: { repRange: '6-12', sets: '3-5', tempo: '2/0/2', restPeriod: '0-60s', intensity: '75-85% 1RM' },
  },
  correctiveTemplate: null,
  assessmentStatus: { parqComplete: true, medicalClearanceRequired: false, parqClearance: true },
  ...overrides,
});

const makeProgressContext = (overrides = {}) => ({
  recentSessionCount: 12,
  avgSessionsPerWeek: 3.5,
  avgVolumePerSession: 5500,
  avgRepsPerSession: 110,
  avgSetsPerSession: 16,
  avgDurationMin: 55,
  avgIntensity: 7,
  rpeTrend: 'stable',
  volumeTrend: 'increasing',
  adherenceTrend: 'consistent',
  exerciseHistory: [
    { exerciseName: 'Bench Press', totalSets: 24, bestWeight: 185, bestReps: 10, avgRpe: 7.5 },
    { exerciseName: 'Squat', totalSets: 20, bestWeight: 225, bestReps: 8, avgRpe: 8 },
  ],
  warnings: [],
  missingInputs: [],
  ...overrides,
});

// ─── Empty / Missing Data ─────────────────────────────────────
describe('contextBuilder — empty/missing data', () => {
  it('1 — returns context with missingInputs when no payload provided', () => {
    const ctx = buildUnifiedContext({ deIdentifiedPayload: null });
    expect(ctx).toBeTruthy();
    expect(ctx.missingInputs).toContain('client_profile');
    expect(ctx.generationReady).toBe(false);
  });

  it('2 — returns context with missing progress when sessions not provided', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
    });
    expect(ctx.missingInputs).toContain('workout_history');
    // Still generation-ready because progress is optional
    expect(ctx.generationReady).toBe(true);
  });

  it('3 — returns context with missing NASM when no baseline', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
    });
    expect(ctx.missingInputs).toContain('nasm_baseline');
    expect(ctx.generationReady).toBe(true);
  });
});

// ─── Full Context Assembly ────────────────────────────────────
describe('contextBuilder — full assembly', () => {
  it('4 — merges all inputs into unified context', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
      templateContext: makeTemplateContext(),
      progressContext: makeProgressContext(),
    });

    expect(ctx.generationReady).toBe(true);
    expect(ctx.missingInputs).toEqual([]);
    expect(ctx.clientProfile).toBeTruthy();
    expect(ctx.nasmGuidance).toBeTruthy();
    expect(ctx.progressSummary).toBeTruthy();
    expect(ctx.templateGuidance).toBeTruthy();
  });

  it('5 — clientProfile contains de-identified fields only', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
    });

    expect(ctx.clientProfile.alias).toBe('Phoenix');
    expect(ctx.clientProfile.age).toBe(32);
    expect(ctx.clientProfile.goals).toBeTruthy();
    // No PII fields
    expect(ctx.clientProfile.email).toBeUndefined();
    expect(ctx.clientProfile.phone).toBeUndefined();
  });

  it('6 — nasmGuidance reflects OPT phase and safety', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
    });

    expect(ctx.nasmGuidance.optPhase).toBe('hypertrophy');
    expect(ctx.nasmGuidance.parqClearance).toBe(true);
    expect(ctx.nasmGuidance.medicalClearanceRequired).toBe(false);
  });

  it('7 — progressSummary passes through progress context', () => {
    const progress = makeProgressContext();
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      progressContext: progress,
    });

    expect(ctx.progressSummary.recentSessionCount).toBe(12);
    expect(ctx.progressSummary.volumeTrend).toBe('increasing');
    expect(ctx.progressSummary.adherenceTrend).toBe('consistent');
  });
});

// ─── 1RM Integration ─────────────────────────────────────────
describe('contextBuilder — 1RM integration', () => {
  it('8 — computes estimated 1RM for exercises in history', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
      progressContext: makeProgressContext({
        exerciseHistory: [
          { exerciseName: 'Bench Press', totalSets: 24, bestWeight: 185, bestReps: 8, avgRpe: 7.5 },
        ],
      }),
    });

    const benchRec = ctx.exerciseRecommendations?.find(e => e.exerciseName === 'Bench Press');
    expect(benchRec).toBeTruthy();
    expect(benchRec.estimated1RM).toBeGreaterThan(185);
    expect(benchRec.loadRecommendation).toBeTruthy();
  });

  it('9 — skips 1RM for exercises with no weight data', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      progressContext: makeProgressContext({
        exerciseHistory: [
          { exerciseName: 'Plank', totalSets: 10, bestWeight: 0, bestReps: 1, avgRpe: 6 },
        ],
      }),
    });

    const plank = ctx.exerciseRecommendations?.find(e => e.exerciseName === 'Plank');
    expect(plank).toBeTruthy();
    expect(plank.estimated1RM).toBeNull();
    expect(plank.loadRecommendation).toBeNull();
  });
});

// ─── Explainability ──────────────────────────────────────────
describe('contextBuilder — explainability', () => {
  it('10 — provides reasoning for OPT phase selection', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints({ optPhase: 'hypertrophy', nasmAssessmentScore: 14 }),
      templateContext: makeTemplateContext(),
    });

    expect(ctx.explainability).toBeTruthy();
    expect(ctx.explainability.phaseRationale).toBeTruthy();
    expect(ctx.explainability.phaseRationale).toContain('hypertrophy');
  });

  it('11 — provides reasoning when medical clearance is required', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints({ medicalClearanceRequired: true }),
    });

    expect(ctx.explainability.safetyFlags).toBeTruthy();
    expect(ctx.explainability.safetyFlags.length).toBeGreaterThan(0);
    expect(ctx.explainability.safetyFlags[0].toLowerCase()).toContain('medical');
  });

  it('12 — provides reasoning when progress shows high RPE', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      progressContext: makeProgressContext({
        rpeTrend: 'increasing',
        warnings: ['RPE trending high (≥9) — consider deload or recovery session'],
      }),
    });

    expect(ctx.explainability.progressFlags).toBeTruthy();
    expect(ctx.explainability.progressFlags.length).toBeGreaterThan(0);
  });

  it('13 — provides reasoning when no history available', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
    });

    expect(ctx.explainability.dataQuality).toBeTruthy();
    expect(ctx.explainability.dataQuality).toContain('no workout history');
  });

  it('14 — lists data sources used for generation', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
      templateContext: makeTemplateContext(),
      progressContext: makeProgressContext(),
    });

    expect(ctx.explainability.dataSources).toBeTruthy();
    expect(ctx.explainability.dataSources).toContain('client_profile');
    expect(ctx.explainability.dataSources).toContain('nasm_baseline');
    expect(ctx.explainability.dataSources).toContain('template_registry');
    expect(ctx.explainability.dataSources).toContain('workout_history');
  });
});

// ─── Safety Constraints ──────────────────────────────────────
describe('contextBuilder — safety constraints', () => {
  it('15 — flags medical clearance constraint', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints({ medicalClearanceRequired: true }),
    });

    expect(ctx.safetyConstraints).toBeTruthy();
    expect(ctx.safetyConstraints.medicalClearanceRequired).toBe(true);
    expect(ctx.safetyConstraints.maxIntensityPct).toBeLessThanOrEqual(70);
  });

  it('16 — no intensity cap when PAR-Q cleared', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints({ parqClearance: true, medicalClearanceRequired: false }),
    });

    expect(ctx.safetyConstraints.medicalClearanceRequired).toBe(false);
    expect(ctx.safetyConstraints.maxIntensityPct).toBe(100);
  });

  it('17 — includes compensations as movement restrictions', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints({
        ohsaCompensations: ['moderate knee valgus', 'minor feet turnout'],
      }),
    });

    expect(ctx.safetyConstraints.movementRestrictions).toBeTruthy();
    expect(ctx.safetyConstraints.movementRestrictions.length).toBe(2);
  });
});

// ─── PII Safety ──────────────────────────────────────────────
describe('contextBuilder — PII safety', () => {
  it('18 — output contains no user IDs or real names', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
      progressContext: makeProgressContext(),
      userId: 42,
      userName: 'John Smith',
    });

    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain('John');
    expect(serialized).not.toContain('Smith');
    // userId should NOT appear in the context object
    expect(serialized).not.toContain('"userId"');
  });
});

// ─── Output Shape ────────────────────────────────────────────
describe('contextBuilder — output shape', () => {
  it('19 — returns all expected top-level fields', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
      templateContext: makeTemplateContext(),
      progressContext: makeProgressContext(),
    });

    expect(ctx).toHaveProperty('generationReady');
    expect(ctx).toHaveProperty('missingInputs');
    expect(ctx).toHaveProperty('clientProfile');
    expect(ctx).toHaveProperty('nasmGuidance');
    expect(ctx).toHaveProperty('templateGuidance');
    expect(ctx).toHaveProperty('progressSummary');
    expect(ctx).toHaveProperty('exerciseRecommendations');
    expect(ctx).toHaveProperty('safetyConstraints');
    expect(ctx).toHaveProperty('explainability');
    expect(ctx).toHaveProperty('generationMode');
  });

  it('20 — generationMode defaults to "full" when all data present', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
      templateContext: makeTemplateContext(),
      progressContext: makeProgressContext(),
    });

    expect(ctx.generationMode).toBe('full');
  });

  it('21 — generationMode is "basic" when only client profile available', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
    });

    expect(ctx.generationMode).toBe('basic');
  });

  it('22 — generationMode is "template_guided" when template but no progress', () => {
    const ctx = buildUnifiedContext({
      deIdentifiedPayload: makeDeIdPayload(),
      nasmConstraints: makeNasmConstraints(),
      templateContext: makeTemplateContext(),
    });

    expect(ctx.generationMode).toBe('template_guided');
  });
});
