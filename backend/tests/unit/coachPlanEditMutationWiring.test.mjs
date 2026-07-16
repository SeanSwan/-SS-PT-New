/**
 * ============================================================================
 * FILE: coachPlanEditMutationWiring.test.mjs
 * PURPOSE: Lock trainer-approved plan edits to prescription revision control.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 *
 * WHAT THIS FILE DOES: Proves a trainer-approved plan_edit proposal writes only
 * through the canonical transactional WorkoutPlan mutation boundary.
 * HOW IT FITS IN THE APP: Proposal approval -> deterministic subset apply ->
 * locked revision-aware persistence.
 * KEY DECISIONS: The ownership pre-read supplies the expected content revision;
 * mutation conflicts propagate so the proposal cannot falsely report APPLIED.
 * NASM PROTOCOL CONTEXT: Approved acute-variable edits change prescribed
 * training content and therefore must create a new deterministic revision.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  mutateWorkoutPlanRecord: vi.fn(),
  sequelize: { transaction: vi.fn() },
}));

vi.mock('../../database.mjs', () => ({
  default: fixtures.sequelize,
}));

vi.mock('../../services/workoutPlanMutationService.mjs', async (importOriginal) => ({
  ...(await importOriginal()),
  mutateWorkoutPlanRecord: (...args) => fixtures.mutateWorkoutPlanRecord(...args),
}));

const { applyPlanEditProposal } = await import(
  '../../services/ai/coachPlanEditApprovalService.mjs'
);

const item = {
  id: 'sets-1',
  weekNumber: 1,
  dayNumber: 1,
  exerciseName: 'Goblet Squat',
  field: 'sets',
  fromValue: 3,
  toValue: 4,
};

const buildPlan = () => ({
  id: 71,
  userId: 42,
  contentRevision: 6,
  contentHash: 'a'.repeat(64),
  planData: {
    weeks: [{
      weekNumber: 1,
      days: [{
        dayNumber: 1,
        exercises: [{ exerciseName: 'Goblet Squat', sets: 3 }],
      }],
    }],
  },
  update: vi.fn(),
});

const buildInput = (plan) => {
  const WorkoutPlan = {
    findOne: vi.fn().mockResolvedValue(plan),
  };
  return {
    WorkoutPlan,
    input: {
      proposal: {
        payload: {
          planId: 71,
          clientId: 42,
          items: [item],
        },
      },
      req: { body: { approvedItemIds: [item.id] } },
      models: { WorkoutPlan },
    },
  };
};

describe('coach plan edit mutation wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists the approved subset through the expected prescription revision', async () => {
    const plan = buildPlan();
    const { WorkoutPlan, input } = buildInput(plan);
    fixtures.mutateWorkoutPlanRecord.mockResolvedValue({ plan });

    const result = await applyPlanEditProposal(input);

    expect(result).toMatchObject({
      ok: true,
      result: { planId: 71, clientId: 42, appliedCount: 1 },
    });
    expect(WorkoutPlan.findOne).toHaveBeenCalledWith({
      where: { id: 71, userId: 42 },
    });
    expect(fixtures.mutateWorkoutPlanRecord).toHaveBeenCalledWith(expect.objectContaining({
      sequelize: fixtures.sequelize,
      WorkoutPlan,
      planId: 71,
      expectedRevision: 6,
      updates: expect.objectContaining({
        planData: expect.any(Object),
      }),
    }));
    const nextData = fixtures.mutateWorkoutPlanRecord.mock.calls[0][0].updates.planData;
    expect(nextData.weeks[0].days[0].exercises[0].sets).toBe(4);
    expect(plan.update).not.toHaveBeenCalled();
  });

  it('propagates a stale-revision conflict instead of reporting an applied proposal', async () => {
    const plan = buildPlan();
    const { input } = buildInput(plan);
    const conflict = Object.assign(new Error('reload before saving'), {
      code: 'WORKOUT_PLAN_REVISION_CONFLICT',
      statusCode: 409,
      currentRevision: 7,
    });
    fixtures.mutateWorkoutPlanRecord.mockRejectedValue(conflict);

    await expect(applyPlanEditProposal(input)).rejects.toBe(conflict);
  });

  it('does not call the mutation boundary when the trainer approves no items', async () => {
    const plan = buildPlan();
    const { input } = buildInput(plan);
    input.req.body.approvedItemIds = [];

    const result = await applyPlanEditProposal(input);

    expect(result).toMatchObject({
      ok: true,
      result: { appliedCount: 0, skippedCount: 1 },
    });
    expect(fixtures.mutateWorkoutPlanRecord).not.toHaveBeenCalled();
  });
});
