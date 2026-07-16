/**
 * ============================================================================
 * FILE: TrainingPlanProjectionLayer.logic.test.ts
 * PURPOSE: Lock bounded windows, client scope, and appointment coexistence.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it } from 'vitest';
import type { TrainingPlanProjection } from '../../services/training-plan-projection-service';
import {
  buildAppointmentCoexistenceKeys,
  buildProjectionRange,
  filterProjectionItemsByTrainer,
  groupProjectionItemsByDate,
  normalizeProjectionClientScope,
} from './TrainingPlanProjectionLayer.logic';

const item = (overrides: Partial<TrainingPlanProjection> = {}): TrainingPlanProjection => ({
  projectionId: 'plan-1:w1:d1:2026-07-15:o1:r1',
  kind: 'training_plan_projection',
  source: 'training_plan',
  billingImpact: 'none',
  readOnly: true,
  planId: 'plan-1',
  clientId: 42,
  trainerId: 7,
  planStatus: 'active',
  scheduledDate: '2026-07-15',
  dateBasis: 'plan_start',
  timeZone: 'America/Los_Angeles',
  weekNumber: 1,
  dayNumber: 1,
  title: 'Plan',
  dayLabel: 'Day One',
  focus: null,
  assignmentType: 'homework',
  exerciseCount: 0,
  exercisePreview: [],
  prescribedRevision: 1,
  prescribedHash: null,
  completionState: 'planned',
  completedAt: null,
  coexistenceKey: '42:2026-07-15',
  ...overrides,
});

describe('buildProjectionRange', () => {
  const selected = new Date(2026, 6, 15, 14, 30);

  it.each([
    ['month', { startDate: '2026-07-01', endDate: '2026-07-31' }],
    ['week', { startDate: '2026-07-13', endDate: '2026-07-19' }],
    ['day', { startDate: '2026-07-15', endDate: '2026-07-15' }],
    ['agenda', { startDate: '2026-07-15', endDate: '2026-08-13' }],
  ] as const)('builds a bounded %s query window', (view, expected) => {
    expect(buildProjectionRange(view, selected)).toEqual(expected);
  });

  it('keeps date-only truth across a US DST week', () => {
    expect(buildProjectionRange('week', new Date(2026, 2, 8, 12, 0))).toEqual({
      startDate: '2026-03-02',
      endDate: '2026-03-08',
    });
  });
});

describe('normalizeProjectionClientScope', () => {
  it('deduplicates strict IDs and caps staff scope at 50 with visible truth', () => {
    const clients = [
      { id: '42' },
      { id: 42 },
      { id: '42junk' },
      ...Array.from({ length: 55 }, (_, index) => ({ id: index + 100 })),
    ];
    const result = normalizeProjectionClientScope(clients);

    expect(result.clientIds).toHaveLength(50);
    expect(result.clientIds[0]).toBe(42);
    expect(result.clientIds).not.toContain(0);
    expect(result.limited).toBe(true);
    expect(result.totalValidClients).toBe(56);
  });
});

describe('projection and appointment separation', () => {
  it('builds coexistence keys without converting appointments into projections', () => {
    const keys = buildAppointmentCoexistenceKeys([
      { id: 1, userId: 42, sessionDate: '2026-07-15T10:00:00' },
      { id: 2, clientId: '43', start: '2026-07-16T12:00:00' },
      { id: 3, clientId: 'bad', sessionDate: '2026-07-15T12:00:00' },
    ]);

    expect(keys).toEqual(new Set(['42:2026-07-15', '43:2026-07-16']));
  });

  it('filters by trainer and groups by date while preserving projection identity', () => {
    const items = [
      item(),
      item({
        projectionId: 'plan-2:w1:d1:2026-07-16:o1:r1',
        planId: 'plan-2',
        trainerId: 8,
        scheduledDate: '2026-07-16',
        coexistenceKey: '43:2026-07-16',
      }),
      item({
        projectionId: 'plan-3:w1:d1:2026-07-15:o1:r1',
        planId: 'plan-3',
        trainerId: 7,
      }),
    ];

    const filtered = filterProjectionItemsByTrainer(items, 7);
    expect(filtered.map(({ projectionId }) => projectionId)).toEqual([
      'plan-1:w1:d1:2026-07-15:o1:r1',
      'plan-3:w1:d1:2026-07-15:o1:r1',
    ]);
    expect(groupProjectionItemsByDate(filtered)).toEqual([
      { date: '2026-07-15', items: filtered },
    ]);
  });
});