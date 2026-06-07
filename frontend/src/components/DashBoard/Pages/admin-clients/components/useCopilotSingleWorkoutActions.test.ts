import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  ApproveSuccessResponse,
  SwanCoachPlanningFingerprint,
} from '../../../../../services/aiWorkoutService';
import type {
  DraftSuccessResponse,
  PainEntry,
  WorkoutPlan,
} from './copilot-types';
import { useCopilotSingleWorkoutActions } from './useCopilotSingleWorkoutActions';

const panelSource = readFileSync(
  resolve(process.cwd(), 'src/components/DashBoard/Pages/admin-clients/components/WorkoutCopilotPanel.tsx'),
  'utf8',
);

const PLAN: WorkoutPlan = {
  planName: 'Strength Plan',
  durationWeeks: 4,
  summary: 'Build strength safely',
  days: [
    {
      dayNumber: 1,
      name: 'Upper Body',
      focus: 'Push strength',
      exercises: [{ name: 'Bench Press', setScheme: '4x8', restPeriod: 90 }],
    },
  ],
};

const PLANNING_FINGERPRINT: SwanCoachPlanningFingerprint = {
  createdBy: 'swan_coach_planning',
  identityMode: 'client_id_only',
  horizonWeeks: 4,
  sessionsPerWeek: 3,
  primaryGoal: 'strength',
  nasmPhase: 'hypertrophy',
  nasmDomainsApplied: ['OPT', 'Corrective Exercise', 'Performance Enhancement'],
  planInputsUsed: {
    workoutHistory: true,
    painInjury: true,
    movementCompensations: true,
  },
  dataCategoriesUsed: ['workout history', 'pain/injury entries', 'movement analysis'],
  missingDataCategories: ['nutrition/macros'],
  rules: ['Use Client # only', 'Never deduct or change paid-session balances'],
};

const DRAFT_RESPONSE: DraftSuccessResponse = {
  success: true,
  draft: true,
  planningSystem: 'swan_coach_planning',
  swanCoachPlanning: PLANNING_FINGERPRINT,
  plan: PLAN,
  generationMode: 'ai_full',
  explainability: {
    dataSources: ['training_history'],
    phaseRationale: 'Client is ready for progressive loading.',
    progressFlags: [],
    safetyFlags: [],
    dataQuality: 'high',
  },
  safetyConstraints: {
    medicalClearanceRequired: false,
    maxIntensityPct: 85,
    movementRestrictions: ['Avoid painful overhead ranges'],
  },
  exerciseRecommendations: [],
  warnings: ['Monitor shoulder fatigue'],
  missingInputs: ['body composition'],
  provider: 'openai',
  auditLogId: 42,
};

const PAIN_ENTRY: PainEntry = {
  id: 7,
  userId: 56,
  createdById: 1,
  bodyRegion: 'shoulder',
  side: 'left',
  painLevel: 4,
  painType: 'aching',
  description: 'Shoulder discomfort',
  onsetDate: null,
  isActive: true,
  resolvedAt: null,
  aggravatingMovements: null,
  relievingFactors: null,
  trainerNotes: null,
  aiNotes: null,
  posturalSyndrome: 'none',
  assessmentFindings: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

const APPROVE_RESPONSE: ApproveSuccessResponse = {
  success: true,
  planId: 101,
  sourceType: 'ai_full',
  summary: 'Saved',
  unmatchedExercises: [],
  validationWarnings: [],
};

const createSetters = () => ({
  setState: vi.fn(),
  setEditedPlan: vi.fn(),
  setExplainability: vi.fn(),
  setSafetyConstraints: vi.fn(),
  setExerciseRecs: vi.fn(),
  setWarnings: vi.fn(),
  setMissingInputs: vi.fn(),
  setGenerationMode: vi.fn(),
  setSwanCoachPlanning: vi.fn(),
  setPlanningReviewAcknowledged: vi.fn(),
  setAuditLogId: vi.fn(),
  setOverrideReasonRequired: vi.fn(),
  setDegradedData: vi.fn(),
  setSavedPlanId: vi.fn(),
  setUnmatchedExercises: vi.fn(),
  setValidationWarnings: vi.fn(),
  setErrorMessage: vi.fn(),
  setErrorCode: vi.fn(),
  setApproveErrors: vi.fn(),
  setActivePainEntries: vi.fn(),
  setPainAcknowledged: vi.fn(),
  setExpandedDays: vi.fn(),
  setIsSubmitting: vi.fn(),
});

const createOptions = (overrides = {}) => {
  const setters = createSetters();
  const service = {
    generateDraft: vi.fn().mockResolvedValue(DRAFT_RESPONSE),
    approveDraft: vi.fn().mockResolvedValue(APPROVE_RESPONSE),
  };
  const painService = {
    getActive: vi.fn().mockResolvedValue({ success: true, entries: [], count: 0 }),
  };
  const toast = vi.fn();
  const onSuccess = vi.fn();

  const values = {
    open: true,
    autoGenerate: false,
    state: 'idle' as const,
    isSubmitting: false,
    clientId: 56,
    clientName: 'Test Client',
    editedPlan: null,
    auditLogId: 42,
    overrideReason: '  approved override  ',
    overrideReasonRequired: false,
    trainerNotes: '  strong session  ',
    planningReviewAcknowledged: false,
    painAcknowledged: false,
    service,
    painService,
    toast,
    onSuccess,
    ...setters,
    ...overrides,
  };

  return {
    values,
    setters,
    service: values.service,
    painService: values.painService,
    toast: values.toast,
    onSuccess: values.onSuccess,
  };
};

describe('useCopilotSingleWorkoutActions', () => {
  it('keeps single-workout action orchestration outside the panel shell', () => {
    expect(panelSource).toContain("from './useCopilotSingleWorkoutActions'");
    expect(panelSource).not.toContain('const doGenerate =');
    expect(panelSource).not.toContain('const checkPainEntries =');
    expect(panelSource).not.toContain('service.approveDraft({');
  });

  it('checks pain, generates a draft, and stores review data', async () => {
    const { values, setters, service, painService } = createOptions();
    const { result } = renderHook(() => useCopilotSingleWorkoutActions(values));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(painService.getActive).toHaveBeenCalledWith(56);
    expect(service.generateDraft).toHaveBeenCalledWith(56, 'approved override');
    expect(setters.setEditedPlan).toHaveBeenCalledWith(PLAN);
    expect(setters.setExplainability).toHaveBeenCalledWith(DRAFT_RESPONSE.explainability);
    expect(setters.setSafetyConstraints).toHaveBeenCalledWith(DRAFT_RESPONSE.safetyConstraints);
    expect(setters.setSwanCoachPlanning).toHaveBeenCalledWith(PLANNING_FINGERPRINT);
    expect(setters.setPlanningReviewAcknowledged).toHaveBeenCalledWith(false);
    expect(setters.setExpandedDays).toHaveBeenCalledWith(new Set([0]));
    expect(setters.setState).toHaveBeenCalledWith('draft_review');
  });

  it('shows the pain-check state before generation when active pain exists', async () => {
    const { values, setters, service, painService } = createOptions({
      painService: {
        getActive: vi.fn().mockResolvedValue({ success: true, entries: [PAIN_ENTRY], count: 1 }),
      },
    });
    const { result } = renderHook(() => useCopilotSingleWorkoutActions(values));

    await act(async () => {
      await result.current.handleGenerate();
    });

    expect(painService.getActive).toHaveBeenCalledWith(56);
    expect(setters.setActivePainEntries).toHaveBeenCalledWith([PAIN_ENTRY]);
    expect(setters.setState).toHaveBeenCalledWith('pain_check');
    expect(service.generateDraft).not.toHaveBeenCalled();
  });

  it('approves edited drafts with trimmed override and trainer notes', async () => {
    const { values, setters, service, toast, onSuccess } = createOptions({
      editedPlan: PLAN,
    });
    const { result } = renderHook(() => useCopilotSingleWorkoutActions(values));

    await act(async () => {
      await result.current.handleApprove();
    });

    expect(service.approveDraft).toHaveBeenCalledWith({
      userId: 56,
      plan: PLAN,
      auditLogId: 42,
      overrideReason: 'approved override',
      trainerNotes: 'strong session',
      planningReviewAcknowledged: false,
    });
    expect(setters.setSavedPlanId).toHaveBeenCalledWith(101);
    expect(setters.setState).toHaveBeenCalledWith('saved');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Workout Plan Approved' }));
    expect(onSuccess).toHaveBeenCalled();
  });
});
