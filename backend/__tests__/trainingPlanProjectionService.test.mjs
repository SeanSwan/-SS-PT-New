/**
 * ============================================================================
 * FILE: trainingPlanProjectionService.test.mjs
 * PURPOSE: Lock deterministic, read-only training-plan schedule projections.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  TrainingPlanProjectionError,
  buildTrainingPlanProjectionItems,
  parseTrainingPlanProjectionQuery,
} from '../services/trainingPlanProjectionService.mjs';

const planId = '6ea7806d-36c8-4307-bd5d-6b04b68be849';
const plan = {
  id: planId,
  userId: 42,
  trainerId: 7,
  title: 'Foundation Arc',
  status: 'active',
  startDate: '2026-07-14',
  endDate: '2026-08-31',
  durationWeeks: 2,
  currentWeek: 1,
  currentDay: 1,
  contentRevision: 3,
  contentHash: 'a'.repeat(64),
  planData: {
    weeks: [{
      weekNumber: 1,
      focus: 'Movement quality',
      days: [
        {
          dayNumber: 1,
          name: 'Stability Base',
          assignmentType: 'homework',
          exercises: [
            { exerciseName: 'Goblet Squat' },
            { name: 'Pallof Press' },
            { exerciseName: 'Dead Bug' },
            { exerciseName: 'Hidden Fourth Exercise' },
          ],
        },
        {
          dayNumber: 2,
          name: 'Coach Strength',
          assignmentType: 'trainer_session',
          exercises: [{ exerciseName: 'Cable Row' }],
        },
      ],
    }],
  },
};

const build = (overrides = {}) => buildTrainingPlanProjectionItems({
  plans: [plan],
  receipts: [],
  clientDateContexts: new Map([[42, {
    localDate: '2026-07-15',
    timeZone: 'America/Los_Angeles',
    source: 'user',
  }]]),
  startDate: '2026-07-14',
  endDate: '2026-07-31',
  ...overrides,
});

describe('parseTrainingPlanProjectionQuery', () => {
  it('accepts a bounded inclusive 90-day window and pagination', () => {
    expect(parseTrainingPlanProjectionQuery({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      clientIds: '42,43,42',
      page: '2',
      limit: '25',
    })).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      clientIds: [42, 43],
      page: 2,
      limit: 25,
    });
  });

  it.each([
    [{ startDate: '2026-02-30', endDate: '2026-03-01' }, 'TRAINING_PLAN_PROJECTION_DATE_INVALID'],
    [{ startDate: '2026-03-02', endDate: '2026-03-01' }, 'TRAINING_PLAN_PROJECTION_RANGE_INVALID'],
    [{ startDate: '2026-01-01', endDate: '2026-04-01' }, 'TRAINING_PLAN_PROJECTION_RANGE_TOO_LARGE'],
    [{ startDate: '2026-01-01', endDate: '2026-01-02', clientIds: '42junk' }, 'TRAINING_PLAN_PROJECTION_CLIENT_IDS_INVALID'],
    [{ startDate: '2026-01-01', endDate: '2026-01-02', limit: '251' }, 'TRAINING_PLAN_PROJECTION_PAGINATION_INVALID'],
  ])('rejects malformed or unbounded query truth', (query, code) => {
    expect(() => parseTrainingPlanProjectionQuery(query)).toThrowError(
      expect.objectContaining({ code }),
    );
  });

  it('supports from/to aliases without allowing split alias pairs', () => {
    expect(parseTrainingPlanProjectionQuery({ from: '2026-07-01', to: '2026-07-07' }))
      .toMatchObject({ startDate: '2026-07-01', endDate: '2026-07-07' });
    expect(() => parseTrainingPlanProjectionQuery({ startDate: '2026-07-01', to: '2026-07-07' }))
      .toThrow(TrainingPlanProjectionError);
  });
});

describe('buildTrainingPlanProjectionItems', () => {
  it('builds deterministic plan-start projections without creating session semantics', () => {
    const [first, second] = build();

    expect(first).toMatchObject({
      kind: 'training_plan_projection',
      source: 'training_plan',
      billingImpact: 'none',
      readOnly: true,
      planId,
      clientId: 42,
      scheduledDate: '2026-07-14',
      dateBasis: 'plan_start',
      weekNumber: 1,
      dayNumber: 1,
      title: 'Foundation Arc',
      dayLabel: 'Stability Base',
      focus: 'Movement quality',
      assignmentType: 'homework',
      exerciseCount: 4,
      exercisePreview: ['Goblet Squat', 'Pallof Press', 'Dead Bug'],
      prescribedRevision: 3,
      prescribedHash: 'a'.repeat(64),
      completionState: 'planned',
      completedAt: null,
      coexistenceKey: '42:2026-07-14',
    });
    expect(first.projectionId).toBe(`${planId}:w1:d1:2026-07-14:o1:r3`);
    expect(second.scheduledDate).toBe('2026-07-15');
    expect(first).not.toHaveProperty('sessionId');
    expect(first).not.toHaveProperty('credits');
    expect(first).not.toHaveProperty('planData');
    expect(first).not.toHaveProperty('metadata');
    expect(first).not.toHaveProperty('clientName');
  });

  it('uses the immutable receipt identity as completion truth', () => {
    const projectionId = `${planId}:w1:d1:2026-07-14:o1:r3`;
    const [first] = build({
      receipts: [{
        assignmentId: projectionId,
        workoutPlanId: planId,
        clientId: 42,
        scheduledDate: '2026-07-14',
        prescribedRevision: 3,
        prescribedHash: 'a'.repeat(64),
        completedAt: '2026-07-14T18:30:00.000Z',
      }],
    });

    expect(first).toMatchObject({
      completionState: 'completed',
      completedAt: '2026-07-14T18:30:00.000Z',
      prescribedRevision: 3,
      prescribedHash: 'a'.repeat(64),
    });
  });

  it('labels cursor-anchored dates when a legacy active plan has no start date', () => {
    const [item] = build({
      plans: [{
        ...plan,
        startDate: null,
        currentWeek: 2,
        currentDay: 2,
        planData: {
          weeks: [{
            weekNumber: 2,
            days: [{ dayNumber: 2, name: 'Current Day', exercises: [] }],
          }],
        },
      }],
      startDate: '2026-07-15',
    });

    expect(item).toMatchObject({
      scheduledDate: '2026-07-15',
      dateBasis: 'current_cursor',
      weekNumber: 2,
      dayNumber: 2,
    });
  });

  it('honors an explicit day date over inferred plan dates', () => {
    const [item] = build({
      plans: [{
        ...plan,
        planData: {
          weeks: [{
            weekNumber: 1,
            days: [{
              dayNumber: 1,
              scheduledDate: '2026-07-20',
              name: 'Explicit Date',
              exercises: [],
            }],
          }],
        },
      }],
    });

    expect(item).toMatchObject({ scheduledDate: '2026-07-20', dateBasis: 'explicit' });
  });
});
describe('buildTrainingPlanProjectionItems hostile date audit', () => {
  it('maps sparse explicit week numbers from the plan start, not array position', () => {
    const items = build({
      plans: [{
        ...plan,
        planData: {
          weeks: [{
            weekNumber: 3,
            days: [{ dayNumber: 1, name: 'Week Three', exercises: [] }],
          }],
        },
      }],
      startDate: '2026-07-27',
      endDate: '2026-07-31',
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      scheduledDate: '2026-07-28',
      weekNumber: 3,
      dateBasis: 'plan_start',
    });
  });

  it('does not repeat a top-level explicitly dated assignment across duration weeks', () => {
    const items = build({
      plans: [{
        ...plan,
        durationWeeks: 4,
        planData: {
          days: [{
            dayNumber: 1,
            scheduledDate: '2026-07-20',
            name: 'One Exact Assignment',
            exercises: [],
          }],
        },
      }],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      scheduledDate: '2026-07-20',
      dateBasis: 'explicit',
      weekNumber: 1,
    });
  });
});
describe('S2: overdueDays — honest drift on planned-but-past days', () => {
  it('stamps positive drift for planned days behind local today, never on completed', async () => {
    const { buildTrainingPlanProjectionItems } = await import('../services/trainingPlanProjectionContract.mjs');
    const plan = {
      id: 'p-drift', userId: 7, trainerId: 3, status: 'active', title: 'Drift Plan',
      currentWeek: 1, currentDay: 1, durationWeeks: 1, contentRevision: 2,
      startDate: '2026-08-01',
      planData: { weeks: [{ weekNumber: 1, days: [
        { dayNumber: 1, name: 'D1', exercises: [{ exerciseName: 'Row' }] },
        { dayNumber: 2, name: 'D2', exercises: [{ exerciseName: 'Press' }] },
      ] }] },
    };
    const items = buildTrainingPlanProjectionItems({
      plans: [plan],
      receipts: [],
      clientDateContexts: new Map([[7, { localDate: '2026-08-04', timeZone: 'UTC' }]]),
      startDate: '2026-08-01',
      endDate: '2026-08-10',
    });
    const d1 = items.find((item) => item.dayNumber === 1); // scheduled 08-01 → 3 behind
    const d2 = items.find((item) => item.dayNumber === 2); // scheduled 08-02 → 2 behind
    expect(d1.overdueDays).toBe(3);
    expect(d2.overdueDays).toBe(2);
    expect(items.every((item) => item.completionState === 'planned')).toBe(true);
  });
});
