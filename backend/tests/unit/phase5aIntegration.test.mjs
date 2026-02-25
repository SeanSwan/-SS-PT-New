/**
 * Phase 5A Integration Tests
 * ==========================
 * End-to-end tests for the Smart Workout Logger MVP pipeline:
 *   - De-identification → Progress Context → Unified Context → Explainability
 *   - Privacy regression: no PII leaks across the full pipeline
 *   - Safety constraints are correctly propagated
 *   - Draft mode response shape matches API contract
 *
 * Phase 5A — Smart Workout Logger MVP Coach Copilot
 */
import { describe, it, expect } from 'vitest';
import { deIdentify } from '../../services/deIdentificationService.mjs';
import { buildProgressContext } from '../../services/ai/progressContextBuilder.mjs';
import { buildTemplateContext } from '../../services/ai/templateContextBuilder.mjs';
import { buildUnifiedContext } from '../../services/ai/contextBuilder.mjs';
import { estimate1RM, recommendLoad } from '../../services/ai/oneRepMax.mjs';

// ─── Realistic Fixtures ──────────────────────────────────────

const createMasterPrompt = () => ({
  client: {
    name: 'John Smith',
    preferredName: 'Johnny',
    alias: 'Thunder Phoenix',
    age: 28,
    gender: 'male',
    bloodType: 'A+',
    contact: {
      email: 'john.smith@example.com',
      phone: '555-987-6543',
    },
    goals: {
      primary: 'hypertrophy',
      secondary: 'strength',
      timeline: '16_weeks',
    },
  },
  health: {
    medicalConditions: ['mild asthma'],
    medications: ['albuterol'],
    supplements: ['creatine', 'protein'],
    injuries: [],
    currentPain: [],
    surgeries: ['wisdom teeth removal'],
  },
  measurements: {
    height: 178,
    currentWeight: 82,
    targetWeight: 85,
    bodyFatPercentage: 15,
  },
  baseline: {
    cardiovascular: { restingHeartRate: 62 },
    strength: { benchPress: 100, squat: 140, deadlift: 160 },
  },
  training: {
    fitnessLevel: 'advanced',
    workoutTypes: ['resistance'],
    frequency: 5,
    experience: '5_years',
  },
  lifestyle: {
    sleepHours: 7.5,
    sleepQuality: 'good',
    stressLevel: 'moderate',
    activityLevel: 'active',
    occupation: 'Software Engineer',
    stressSources: ['work deadlines'],
  },
  nutrition: {
    dailyCalories: 2800,
    proteinGrams: 180,
  },
});

const createSessions = () => [
  {
    id: 'sess-uuid-001',
    userId: 42,
    date: new Date('2026-02-24'),
    duration: 65,
    intensity: 8,
    totalWeight: 7200,
    totalReps: 140,
    totalSets: 20,
    avgRPE: 7.5,
    status: 'completed',
    workoutLogs: [
      { exerciseName: 'Bench Press', setNumber: 1, reps: 8, weight: 185, rpe: 7 },
      { exerciseName: 'Bench Press', setNumber: 2, reps: 8, weight: 185, rpe: 7.5 },
      { exerciseName: 'Bench Press', setNumber: 3, reps: 6, weight: 195, rpe: 8 },
      { exerciseName: 'Squat', setNumber: 1, reps: 8, weight: 225, rpe: 7 },
      { exerciseName: 'Squat', setNumber: 2, reps: 8, weight: 225, rpe: 7.5 },
      { exerciseName: 'Squat', setNumber: 3, reps: 6, weight: 245, rpe: 8.5 },
    ],
  },
  {
    id: 'sess-uuid-002',
    userId: 42,
    date: new Date('2026-02-22'),
    duration: 55,
    intensity: 7,
    totalWeight: 6800,
    totalReps: 130,
    totalSets: 18,
    avgRPE: 7,
    status: 'completed',
    workoutLogs: [
      { exerciseName: 'Deadlift', setNumber: 1, reps: 5, weight: 275, rpe: 8 },
      { exerciseName: 'Deadlift', setNumber: 2, reps: 5, weight: 275, rpe: 8.5 },
      { exerciseName: 'Overhead Press', setNumber: 1, reps: 10, weight: 95, rpe: 6 },
    ],
  },
  {
    id: 'sess-uuid-003',
    userId: 42,
    date: new Date('2026-02-20'),
    duration: 60,
    intensity: 7,
    totalWeight: 6500,
    totalReps: 135,
    totalSets: 18,
    avgRPE: 7,
    status: 'completed',
    workoutLogs: [
      { exerciseName: 'Bench Press', setNumber: 1, reps: 8, weight: 175, rpe: 7 },
      { exerciseName: 'Squat', setNumber: 1, reps: 8, weight: 215, rpe: 7 },
    ],
  },
  {
    id: 'sess-uuid-004',
    userId: 42,
    date: new Date('2026-02-18'),
    duration: 50,
    intensity: 6,
    totalWeight: 5500,
    totalReps: 120,
    totalSets: 16,
    avgRPE: 6.5,
    status: 'completed',
    workoutLogs: [
      { exerciseName: 'Deadlift', setNumber: 1, reps: 5, weight: 265, rpe: 7.5 },
    ],
  },
  {
    id: 'sess-uuid-005',
    userId: 42,
    date: new Date('2026-02-10'),
    duration: 45,
    intensity: 5,
    totalWeight: 4000,
    totalReps: 100,
    totalSets: 14,
    avgRPE: 6,
    status: 'skipped',  // should be filtered out
    workoutLogs: [],
  },
];

// ─── Full Pipeline Integration ────────────────────────────────
describe('Phase 5A — full pipeline integration', () => {
  it('1 — de-identify → progress → unified context produces valid output', () => {
    const masterPrompt = createMasterPrompt();

    // Step 1: De-identify
    const deIdResult = deIdentify(masterPrompt, { spiritName: 'Thunder Phoenix' });
    expect(deIdResult).not.toBeNull();
    expect(deIdResult.strippedFields).toContain('client.name');
    expect(deIdResult.strippedFields).toContain('client.contact.email');

    // Step 2: Build progress context
    const sessions = createSessions();
    const progress = buildProgressContext(sessions, { referenceDate: new Date('2026-02-25') });
    expect(progress.recentSessionCount).toBe(4); // skipped session excluded

    // Step 3: Build unified context (no templateContext in this test)
    const unified = buildUnifiedContext({
      deIdentifiedPayload: deIdResult.deIdentified,
      progressContext: progress,
    });

    expect(unified.generationReady).toBe(true);
    expect(unified.generationMode).toBe('progress_aware');
    expect(unified.clientProfile).toBeTruthy();
    expect(unified.progressSummary).toBeTruthy();
    expect(unified.exerciseRecommendations.length).toBeGreaterThan(0);
    expect(unified.explainability.dataSources).toContain('client_profile');
    expect(unified.explainability.dataSources).toContain('workout_history');
  });

  it('2 — 1RM estimates integrate correctly with exercise history', () => {
    const sessions = createSessions();
    const progress = buildProgressContext(sessions, { referenceDate: new Date('2026-02-25') });

    const benchHistory = progress.exerciseHistory.find(e => e.exerciseName === 'Bench Press');
    expect(benchHistory).toBeTruthy();
    expect(benchHistory.bestWeight).toBe(195);
    expect(benchHistory.bestReps).toBe(8);

    // Epley: 195 × (1 + 8/30) = 195 × 1.267 = 247
    const oneRM = estimate1RM(benchHistory.bestWeight, benchHistory.bestReps);
    expect(oneRM).toBeCloseTo(247, 0);

    // Hypertrophy phase (3): 75-85% → 185-210
    const rec = recommendLoad(oneRM, 3);
    expect(rec.minLoad).toBeGreaterThanOrEqual(180);
    expect(rec.maxLoad).toBeLessThanOrEqual(215);
  });
});

// ─── Privacy Regression ──────────────────────────────────────
describe('Phase 5A — privacy regression', () => {
  it('3 — no PII leaks through the full pipeline', () => {
    const masterPrompt = createMasterPrompt();

    const deIdResult = deIdentify(masterPrompt, { spiritName: 'Thunder Phoenix' });
    const sessions = createSessions();
    const progress = buildProgressContext(sessions, { referenceDate: new Date('2026-02-25') });

    const unified = buildUnifiedContext({
      deIdentifiedPayload: deIdResult.deIdentified,
      progressContext: progress,
    });

    const serialized = JSON.stringify(unified);

    // Real name must not appear
    expect(serialized).not.toContain('John Smith');
    expect(serialized).not.toContain('Johnny');

    // Contact info must not appear
    expect(serialized).not.toContain('john.smith@example.com');
    expect(serialized).not.toContain('555-987-6543');

    // Medical details that were stripped must not appear
    expect(serialized).not.toContain('albuterol');
    expect(serialized).not.toContain('wisdom teeth');

    // Occupation and stress sources (lifestyle PII) must not appear
    expect(serialized).not.toContain('Software Engineer');
    expect(serialized).not.toContain('work deadlines');

    // Session IDs must not appear
    expect(serialized).not.toContain('sess-uuid-001');
    expect(serialized).not.toContain('sess-uuid-002');

    // User ID must not appear
    expect(serialized).not.toContain('"userId"');

    // Safe fields SHOULD appear (spirit name, age, training data)
    expect(serialized).toContain('Thunder Phoenix');
    expect(serialized).toContain('28'); // age
    expect(serialized).toContain('hypertrophy'); // goal
  });

  it('4 — progress context alone contains no PII', () => {
    const sessions = createSessions();
    const progress = buildProgressContext(sessions, { referenceDate: new Date('2026-02-25') });
    const serialized = JSON.stringify(progress);

    expect(serialized).not.toContain('sess-uuid');
    expect(serialized).not.toContain('userId');
    expect(serialized).not.toContain('42');
  });

  it('5 — unified context with null/empty data does not crash', () => {
    const unified = buildUnifiedContext({});
    expect(unified.generationReady).toBe(false);
    expect(unified.missingInputs).toContain('client_profile');
    expect(unified.generationMode).toBe('unavailable');
  });
});

// ─── Safety Constraint Propagation ───────────────────────────
describe('Phase 5A — safety constraint propagation', () => {
  it('6 — medical clearance caps intensity in unified context', () => {
    const masterPrompt = createMasterPrompt();
    const deIdResult = deIdentify(masterPrompt, { spiritName: 'Phoenix' });

    const unified = buildUnifiedContext({
      deIdentifiedPayload: deIdResult.deIdentified,
      nasmConstraints: {
        parqClearance: false,
        medicalClearanceRequired: true,
        nasmAssessmentScore: 8,
        ohsaCompensations: ['moderate knee valgus'],
        posturalDeviations: [],
        optPhase: 'stabilization_endurance',
        primaryGoal: 'weight_loss',
      },
    });

    expect(unified.safetyConstraints.medicalClearanceRequired).toBe(true);
    expect(unified.safetyConstraints.maxIntensityPct).toBe(70);
    expect(unified.safetyConstraints.movementRestrictions).toContain('moderate knee valgus');
    expect(unified.explainability.safetyFlags.length).toBeGreaterThanOrEqual(2); // medical + parq
  });

  it('7 — no safety restrictions when fully cleared', () => {
    const masterPrompt = createMasterPrompt();
    const deIdResult = deIdentify(masterPrompt, { spiritName: 'Phoenix' });

    const unified = buildUnifiedContext({
      deIdentifiedPayload: deIdResult.deIdentified,
      nasmConstraints: {
        parqClearance: true,
        medicalClearanceRequired: false,
        nasmAssessmentScore: 14,
        ohsaCompensations: [],
        posturalDeviations: [],
        optPhase: 'hypertrophy',
        primaryGoal: 'hypertrophy',
      },
    });

    expect(unified.safetyConstraints.medicalClearanceRequired).toBe(false);
    expect(unified.safetyConstraints.maxIntensityPct).toBe(100);
    expect(unified.safetyConstraints.movementRestrictions).toEqual([]);
    expect(unified.explainability.safetyFlags).toEqual([]);
  });
});

// ─── Draft Response Contract ─────────────────────────────────
describe('Phase 5A — draft response contract', () => {
  it('8 — unified context matches expected API response shape', () => {
    const masterPrompt = createMasterPrompt();
    const deIdResult = deIdentify(masterPrompt, { spiritName: 'Phoenix' });
    const sessions = createSessions();
    const progress = buildProgressContext(sessions, { referenceDate: new Date('2026-02-25') });

    const unified = buildUnifiedContext({
      deIdentifiedPayload: deIdResult.deIdentified,
      nasmConstraints: {
        parqClearance: true,
        medicalClearanceRequired: false,
        nasmAssessmentScore: 14,
        ohsaCompensations: [],
        posturalDeviations: [],
        optPhase: 'hypertrophy',
        optPhaseConfig: { phase: 3, phaseName: 'Hypertrophy' },
        primaryGoal: 'hypertrophy',
      },
      progressContext: progress,
    });

    // Simulate draft response shape
    const draftResponse = {
      success: true,
      draft: true,
      plan: { planName: 'Test Plan', days: [] },
      generationMode: unified.generationMode,
      explainability: unified.explainability,
      safetyConstraints: unified.safetyConstraints,
      exerciseRecommendations: unified.exerciseRecommendations,
      warnings: [
        ...(unified.explainability?.progressFlags || []),
        ...(unified.explainability?.safetyFlags || []),
      ],
      missingInputs: unified.missingInputs,
      provider: 'openai',
      auditLogId: null,
    };

    expect(draftResponse.success).toBe(true);
    expect(draftResponse.draft).toBe(true);
    expect(draftResponse.generationMode).toBe('progress_aware');
    expect(draftResponse.explainability).toBeTruthy();
    expect(draftResponse.explainability.dataSources).toContain('client_profile');
    expect(draftResponse.exerciseRecommendations.length).toBeGreaterThan(0);
    expect(draftResponse.missingInputs).toEqual([]);

    // Verify a bench press recommendation exists with 1RM
    const bench = draftResponse.exerciseRecommendations.find(e => e.exerciseName === 'Bench Press');
    expect(bench).toBeTruthy();
    expect(bench.estimated1RM).toBeGreaterThan(0);
    expect(bench.loadRecommendation).toBeTruthy();
    expect(bench.loadRecommendation.targetReps).toBe('6-12');
  });
});
