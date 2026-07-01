import { describe, expect, it } from 'vitest';
import {
  commandConfirmationResultBody,
  confirmedCommandLogResult,
  shouldRouteToCommandLane,
} from './CoachCommandCenter.commandLane';
import type { CommandLogConfirmation } from './CoachCommandCenter.data';
import type { ConfirmResult } from '../../../../hooks/useCoachCommand';

describe('CoachCommandCenter command lane routing', () => {
  it('routes recall-style trainer commands into the deterministic command lane', () => {
    expect(shouldRouteToCommandLane('what did we do last time')).toBe(true);
    expect(shouldRouteToCommandLane('what did Ava Stone do last workout')).toBe(true);
    expect(shouldRouteToCommandLane('where is Ava Stone in onboarding')).toBe(true);
  });

  it('keeps normal conversation in chat', () => {
    expect(shouldRouteToCommandLane('thanks, that makes sense')).toBe(false);
  });
});

const confirmation: CommandLogConfirmation = {
  operationId: 'op-debate',
  command: 'build_workout_plan',
  params: { clientId: 42 },
  client: { id: 42, firstName: 'Ava', lastName: 'Stone' },
  details: null,
  isDestructive: false,
};

describe('CoachCommandCenter workout-plan command result', () => {
  it('renders confirmed workout-plan debates as started without recording a completed write', () => {
    const result: ConfirmResult = {
      success: true,
      type: 'debate_started',
      command: 'build_workout_plan',
      message: 'Workout plan debate started. Track progress at /api/ai/debate/debate_job_42/status.',
      result: { jobId: 'debate_job_42', debateType: 'workout_plan' },
    };

    expect(commandConfirmationResultBody(confirmation, result)).toBe(
      'Workout plan debate started for Ava. Track progress at /api/ai/debate/debate_job_42/status. No workout plan has been saved yet.',
    );
    expect(confirmedCommandLogResult(confirmation, result)).toMatchObject({
      command: 'build_workout_plan',
      result: {
        jobId: 'debate_job_42',
        debateType: 'workout_plan',
      },
      message: 'Workout plan debate started for Ava. Track progress at /api/ai/debate/debate_job_42/status. No workout plan has been saved yet.',
    });
  });

  it('carries a safe Build Plan route into confirmed workout-plan debate result cards', () => {
    const result: ConfirmResult = {
      success: true,
      type: 'debate_started',
      command: 'build_workout_plan',
      message: 'Workout plan debate started. Track progress at /api/ai/debate/debate_job_42/status.',
      result: { jobId: 'debate_job_42', debateType: 'workout_plan' },
    };

    expect(confirmedCommandLogResult(confirmation, result, {
      workoutPlannerRoute: '/dashboard/admin/workout-planner?clientId=42&source=swan-coach',
    })).toMatchObject({
      command: 'build_workout_plan',
      client: { id: 42, firstName: 'Ava' },
      result: {
        jobId: 'debate_job_42',
        debateType: 'workout_plan',
        targetRoute: '/dashboard/admin/workout-planner?clientId=42&source=swan-coach&debateJobId=debate_job_42',
      },
      message: 'Workout plan debate started for Ava. Track progress at /api/ai/debate/debate_job_42/status. No workout plan has been saved yet.',
    });
  });
});