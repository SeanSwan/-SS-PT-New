import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWorkoutPlannerGenerationActions } from './useWorkoutPlannerGenerationActions';
import type { GeneratedPlan } from './WorkoutPlannerTypes';

const generatedPlan: GeneratedPlan = {
  clientId: 91,
  clientName: 'Client 91',
  planningSystem: 'swan_coach_planning',
  swanCoachPlanning: { createdBy: 'swan_coach_planning', identityMode: 'client_id_only' },
  planSummary: {
    durationWeeks: 4,
    sessionsPerWeek: 3,
    totalSessions: 12,
    primaryGoal: 'general_fitness',
    startingPhase: 2,
  },
  mesocycles: [],
  weeklySchedule: [],
  recommendations: [],
  weeks: [],
};

const renderGenerationHook = (overrides: Record<string, unknown> = {}) => {
  const authAxios = {
    post: vi.fn().mockResolvedValue({ data: { success: true, plan: generatedPlan } }),
  };
  const setters = {
    setPlanExercises: vi.fn(),
    setGeneratedPlan: vi.fn(),
    setPhaseNumber: vi.fn(),
    setStatusMsg: vi.fn(),
    resetLoadedPlanState: vi.fn(),
  };

  const hook = renderHook(() => useWorkoutPlannerGenerationActions({
    authAxios,
    category: 'full_body',
    goal: 'general_fitness',
    phaseNumber: 2,
    planDuration: 'single',
    sessionsPerWeek: 3,
    trainingIntensityMode: 'base',
    hardcoreMethod: 'standard',
    generationMode: 'auto',
    selectedEquipmentProfileId: null,
    ...setters,
    ...overrides,
  } as Parameters<typeof useWorkoutPlannerGenerationActions>[0]));

  return { hook, authAxios, setters };
};

const guidedCandidate = {
  exerciseKey: 'supported_dumbbell_row',
  exerciseName: 'Supported Dumbbell Row',
  sets: 3,
  reps: 10,
  tempo: '2/0/2',
  restSeconds: 60,
  intensityPercent: 70,
  readinessNote: 'Use release/rolling as needed, controlled range of motion, and stop if symptoms escalate.',
  selectionReason: 'Back option matches goal and readiness.',
  media: {
    videoUrl: 'https://cdn.swan.test/row.mp4',
    previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
    imageUrl: null,
    thumbnailUrl: 'https://cdn.swan.test/row.jpg',
  },
  exerciseSlim: {
    id: 'supported_dumbbell_row',
    name: 'Supported Dumbbell Row',
    exerciseKey: 'supported_dumbbell_row',
    exerciseType: 'pull',
    bodyPartCategory: 'Back',
    primaryMuscles: ['back', 'forearms'],
    difficulty: 280,
    equipment: ['dumbbell', 'bench'],
    videoUrl: 'https://cdn.swan.test/row.mp4',
    previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
    imageUrl: null,
    thumbnailUrl: 'https://cdn.swan.test/row.jpg',
    defaultTempo: '2/0/2',
    defaultRestSeconds: 60,
  },
};

const guidedCandidatesResponse = {
  planningSystem: 'swan_coach_planning',
  candidateSystem: 'swan_coach_guided_candidates',
  generationMode: 'guide_me',
  category: 'back',
  primaryGoal: 'strength',
  slots: [{
    slotId: 'back-primary',
    focus: 'Back',
    instruction: 'Pick one option for this workout slot.',
    candidates: [guidedCandidate],
  }],
};

describe('useWorkoutPlannerGenerationActions guided candidates', () => {
  it('requests Guide Me candidates instead of auto-generating a single workout', async () => {
    const authAxios = {
      post: vi.fn().mockResolvedValue({ data: { success: true, candidates: guidedCandidatesResponse } }),
    };
    const { hook } = renderGenerationHook({
      authAxios,
      category: 'back',
      goal: 'strength',
      generationMode: 'guide_me',
      selectedEquipmentProfileId: 77,
    });

    await act(async () => { await hook.result.current.handleSwanCoachWorkoutGenerate(91); });

    expect(authAxios.post).toHaveBeenCalledWith('/api/workout-builder/candidates', expect.objectContaining({
      clientId: 91,
      category: 'back',
      primaryGoal: 'strength',
      generationMode: 'guide_me',
      candidateCount: 4,
      equipmentProfileId: 77,
    }));
    expect(hook.result.current.guidedCandidates).toEqual(guidedCandidatesResponse);
  });

  it('requests six options for Deep Grill mode', async () => {
    const authAxios = {
      post: vi.fn().mockResolvedValue({ data: { success: true, candidates: guidedCandidatesResponse } }),
    };
    const { hook } = renderGenerationHook({ authAxios, generationMode: 'deep_grill' });

    await act(async () => { await hook.result.current.handleSwanCoachWorkoutGenerate(91); });

    expect(authAxios.post).toHaveBeenCalledWith('/api/workout-builder/candidates', expect.objectContaining({
      generationMode: 'deep_grill',
      candidateCount: 6,
    }));
  });

  it('adds a selected guided candidate to the builder with media and readiness notes', () => {
    const { hook, setters } = renderGenerationHook({ generationMode: 'guide_me' });

    act(() => { hook.result.current.handleSelectGuidedCandidate(guidedCandidate); });

    expect(setters.setPlanExercises).toHaveBeenCalledWith(expect.any(Function));
    const updater = setters.setPlanExercises.mock.calls[0][0] as (items: unknown[]) => unknown[];
    expect(updater([])[0]).toEqual(expect.objectContaining({
      exerciseSlim: expect.objectContaining({
        exerciseKey: 'supported_dumbbell_row',
        previewVideoUrl: 'https://cdn.swan.test/row-preview.webm',
        thumbnailUrl: 'https://cdn.swan.test/row.jpg',
      }),
      sets: 3,
      reps: '10',
      tempo: '2/0/2',
      restSeconds: 60,
      notes: expect.stringMatching(/controlled range|Back option/i),
    }));
  });
});