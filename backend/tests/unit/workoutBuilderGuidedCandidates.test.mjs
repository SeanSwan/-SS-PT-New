import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockContext = {
  clientName: 'Client #42',
  criticalDataUnavailable: false,
  criticalFailures: [],
  constraints: {
    nasmPhase: 2,
    recentlyUsedExercises: [],
    compensationTypes: [],
    estimated1RMs: null,
  },
  equipment: [],
  pain: {
    // Mechanics fixture: truly pain-free. ANY warning/exclusion is
    // blocking-tier (pain_or_injury_context_present) — the builder 409s such
    // a context and candidates now HOLD it identically (blocking-tier
    // parity, 2026-07-13). Readiness notes in these tests come from the
    // explicit readinessCheck param, not from pain warnings.
    status: 'loaded_no_active_issue',
    excludedMuscles: [],
    exclusions: [],
    warnings: [],
  },
  movement: { compensations: [] },
  variation: { lastSessionType: null, currentPattern: 'standard' },
  workouts: { sessionsLast2Weeks: 5, avgFormRating: 3.2 },
  goals: { primaryGoal: 'strength' },
};

let contextForTest = mockContext;

const registry = [
  {
    key: 'supported_dumbbell_row',
    name: 'Supported Dumbbell Row',
    muscles: ['back', 'forearms'],
    category: 'pull',
    equipment: ['dumbbell', 'bench'],
    nasmLevel: 2,
    movementPattern: 'pull',
    source: 'swanstudios',
    videoUrl: 'https://cdn.swan.test/row.mp4',
    previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
    thumbnailUrl: 'https://cdn.swan.test/row.jpg',
    imageUrl: null,
    exerciseType: 'strength',
    bodyPartCategory: 'Back',
    difficulty: 280,
    recommendedSets: 3,
    recommendedReps: 10,
    defaultTempo: '2/0/2',
    defaultRestSeconds: 60,
  },
  {
    key: 'lat_pulldown',
    name: 'Lat Pulldown',
    muscles: ['lats', 'biceps'],
    category: 'pull',
    equipment: ['cable_machine'],
    nasmLevel: 2,
    movementPattern: 'pull',
    source: 'swanstudios',
    videoUrl: 'https://cdn.swan.test/pulldown.mp4',
    previewVideoUrl: null,
    thumbnailUrl: 'https://cdn.swan.test/pulldown.jpg',
    imageUrl: null,
  },
  {
    key: 'face_pulls',
    name: 'Face Pulls',
    muscles: ['rear_deltoid', 'rotator_cuff'],
    category: 'pull',
    equipment: ['cable_machine'],
    nasmLevel: 1,
    movementPattern: 'pull',
    source: 'swanstudios',
    videoUrl: null,
    previewVideoUrl: null,
    thumbnailUrl: null,
    imageUrl: 'https://cdn.swan.test/face-pulls.jpg',
  },
  {
    key: 'inverted_row',
    name: 'Inverted Row',
    muscles: ['lats', 'rhomboids', 'biceps'],
    category: 'pull',
    equipment: ['bodyweight', 'rack'],
    nasmLevel: 2,
    movementPattern: 'pull',
    source: 'swanstudios',
  },
  {
    key: 'straight_arm_pulldown',
    name: 'Straight Arm Pulldown',
    muscles: ['lats', 'core'],
    category: 'pull',
    equipment: ['cable_machine'],
    nasmLevel: 2,
    movementPattern: 'pull',
    source: 'swanstudios',
  },
  {
    key: 'band_pull_aparts',
    name: 'Band Pull Aparts',
    muscles: ['rear_deltoid', 'rhomboids'],
    category: 'corrective',
    equipment: ['resistance_band'],
    nasmLevel: 1,
    movementPattern: 'pull',
    source: 'swanstudios',
  },
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

beforeEach(() => {
  contextForTest = mockContext;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('workoutBuilder guided candidates', () => {
  it('returns selectable candidate options with Rolodex media and readiness notes', async () => {
    const { generateWorkoutCandidates } = await loadCandidateService();

    const result = await generateWorkoutCandidates({
      clientId: 42,
      trainerId: 7,
      category: 'back',
      primaryGoal: 'strength',
      nasmPhase: 2,
      generationMode: 'deep_grill',
      candidateCount: 6,
      readinessCheck: {
        tightness: 'forearms',
        soreness: 'elbow',
        rangeOfMotion: 'limited',
        recentHeavyTraining: true,
        focusAreas: ['forearms', 'elbow'],
        notes: 'Do not preserve this private free text',
      },
    });

    expect(result).toEqual(expect.objectContaining({
      planningSystem: 'swan_coach_planning',
      candidateSystem: 'swan_coach_guided_candidates',
      generationMode: 'deep_grill',
      category: 'back',
      primaryGoal: 'strength',
    }));
    expect(result.swanCoachReadiness).toEqual(expect.objectContaining({
      source: 'swan_coach_cortex',
      level: 'yellow',
    }));
    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].candidates.length).toBeGreaterThanOrEqual(4);
    expect(result.slots[0].candidates.length).toBeLessThanOrEqual(6);

    const supportedRow = result.slots[0].candidates.find(candidate => candidate.exerciseKey === 'supported_dumbbell_row');
    expect(supportedRow).toEqual(expect.objectContaining({
      exerciseName: 'Supported Dumbbell Row',
      readinessNote: expect.stringMatching(/release|controlled range|stop/i),
      selectionReason: expect.stringMatching(/Back|readiness|goal/i),
      score: expect.any(Number),
      media: expect.objectContaining({
        videoUrl: 'https://cdn.swan.test/row.mp4',
        previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
        thumbnailUrl: 'https://cdn.swan.test/row.jpg',
      }),
      exerciseSlim: expect.objectContaining({
        name: 'Supported Dumbbell Row',
        exerciseKey: 'supported_dumbbell_row',
        previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
        thumbnailUrl: 'https://cdn.swan.test/row.jpg',
        defaultTempo: '2/0/2',
        defaultRestSeconds: 60,
      }),
    }));
    expect(JSON.stringify(result)).not.toMatch(/private free text|Marcus|surgery|diagnosis/i);
  });

  it('normalizes Guide Me mode to four trainer-choice options', async () => {
    const { generateWorkoutCandidates } = await loadCandidateService();

    const result = await generateWorkoutCandidates({
      clientId: 42,
      trainerId: 7,
      category: 'back',
      primaryGoal: 'general_fitness',
      nasmPhase: 2,
      generationMode: 'guide_me',
    });

    expect(result.generationMode).toBe('guide_me');
    expect(result.slots[0].candidates).toHaveLength(4);
    expect(result.slots[0].instruction).toMatch(/pick one/i);
  });

  it('filters guided options to the selected equipment profile', async () => {
    contextForTest = {
      ...mockContext,
      equipment: [{
        id: 77,
        name: 'Dumbbell Station',
        items: [
          { category: 'dumbbell', name: 'Dumbbells' },
          { category: 'bench', name: 'Flat Bench' },
        ],
      }],
    };
    const { generateWorkoutCandidates } = await loadCandidateService();

    const result = await generateWorkoutCandidates({
      clientId: 42,
      trainerId: 7,
      category: 'back',
      primaryGoal: 'strength',
      nasmPhase: 2,
      generationMode: 'deep_grill',
      candidateCount: 6,
      equipmentProfileId: 77,
    });

    const keys = result.slots[0].candidates.map(candidate => candidate.exerciseKey);
    expect(result.equipmentProfileId).toBe(77);
    expect(result.availableEquipmentCategories).toEqual(expect.arrayContaining(['bench', 'bodyweight', 'dumbbell']));
    expect(keys).toContain('supported_dumbbell_row');
    expect(keys).not.toEqual(expect.arrayContaining(['lat_pulldown', 'face_pulls', 'straight_arm_pulldown', 'band_pull_aparts']));
  });
});