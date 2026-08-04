/**
 * ============================================================================
 * FILE: training-plan-projection-service.test.ts
 * PURPOSE: Lock the UI-safe projection response and exact read endpoint.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { describe, expect, it, vi } from 'vitest';
import {
  createTrainingPlanProjectionService,
  normalizeTrainingPlanProjectionResponse,
} from './training-plan-projection-service';

const projection = {
  projectionId: 'plan-1:w1:d1:2026-07-15:o1:r3',
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
  title: 'Foundation Arc',
  dayLabel: 'Stability Base',
  focus: 'Movement quality',
  assignmentType: 'homework',
  exerciseCount: 2,
  exercisePreview: ['Goblet Squat', 'Pallof Press'],
  prescribedRevision: 3,
  prescribedHash: 'a'.repeat(64),
  completionState: 'planned',
  completedAt: null,
  coexistenceKey: '42:2026-07-15',
};

const payload = (items: unknown[] = [projection]) => ({
  success: true,
  items,
  page: 1,
  limit: 100,
  total: items.length,
  hasMore: false,
  range: { startDate: '2026-07-01', endDate: '2026-07-31' },
});

describe('normalizeTrainingPlanProjectionResponse', () => {
  it('accepts the read-only non-billing projection contract', () => {
    const result = normalizeTrainingPlanProjectionResponse(payload());

    expect(result.items[0]).toEqual(projection);
    expect(result).toMatchObject({ page: 1, limit: 100, total: 1, hasMore: false });
  });

  it.each([
    { ...projection, sessionId: 99 },
    { ...projection, billingImpact: 'deduct_credit' },
    { ...projection, readOnly: false },
    { ...projection, scheduledDate: '2026-02-30' },
    { ...projection, source: 'appointment' },
    { ...projection, exercisePreview: ['Safe', 42] },
  ])('rejects appointment, billing, or malformed item leakage', (unsafeItem) => {
    expect(() => normalizeTrainingPlanProjectionResponse(payload([unsafeItem])))
      .toThrow('Invalid training plan projection response');
  });

  it('rejects duplicate identities and dishonest pagination metadata', () => {
    expect(() => normalizeTrainingPlanProjectionResponse(payload([projection, projection])))
      .toThrow('Invalid training plan projection response');
    expect(() => normalizeTrainingPlanProjectionResponse({ ...payload(), total: 0 }))
      .toThrow('Invalid training plan projection response');
    expect(() => normalizeTrainingPlanProjectionResponse({ success: false, items: [] }))
      .toThrow('Invalid training plan projection response');
  });
  it('rejects contradictory completion and pagination truth', () => {
    expect(() => normalizeTrainingPlanProjectionResponse(payload([{
      ...projection,
      completionState: 'planned',
      completedAt: '2026-07-15T18:00:00.000Z',
    }])))
      .toThrow('Invalid training plan projection response');
    expect(() => normalizeTrainingPlanProjectionResponse({
      ...payload(),
      total: 101,
      hasMore: false,
    }))
      .toThrow('Invalid training plan projection response');
  });
});

describe('createTrainingPlanProjectionService', () => {
  it('calls the exact top-level GET path with bounded plural client scope', async () => {
    const get = vi.fn().mockResolvedValue({ data: payload() });
    const service = createTrainingPlanProjectionService({ get });

    const result = await service.getProjections({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      clientIds: [42, 43],
      page: 1,
      limit: 100,
      timeZone: 'America/New_York',
    });

    expect(result.items).toHaveLength(1);
    expect(get).toHaveBeenCalledWith('/api/training-plan-projections', {
      params: {
        startDate: '2026-07-01',
        endDate: '2026-07-31',
        clientIds: '42,43',
        page: 1,
        limit: 100,
      },
      headers: { 'X-Client-Timezone': 'America/New_York' },
    });
  });

  it('omits optional client and timezone parameters instead of inventing values', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        ...payload([]),
        page: 2,
        limit: 25,
        range: { startDate: '2026-07-15', endDate: '2026-07-15' },
      },
    });
    const service = createTrainingPlanProjectionService({ get });

    await service.getProjections({
      startDate: '2026-07-15',
      endDate: '2026-07-15',
      page: 2,
      limit: 25,
      timeZone: 'Not/A_Zone',
    });

    expect(get).toHaveBeenCalledWith('/api/training-plan-projections', {
      params: {
        startDate: '2026-07-15',
        endDate: '2026-07-15',
        page: 2,
        limit: 25,
      },
      headers: undefined,
    });
  });
  it('fails closed when the server echoes a different request window or page', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        ...payload(),
        page: 2,
        range: { startDate: '2026-08-01', endDate: '2026-08-31' },
      },
    });
    const service = createTrainingPlanProjectionService({ get });

    await expect(service.getProjections({
      startDate: '2026-07-01',
      endDate: '2026-07-31',
      page: 1,
      limit: 100,
    })).rejects.toThrow('Invalid training plan projection response');
  });
});
describe('S2: overdueDays tolerant-optional validation', () => {
  it('accepts absent (older server), null, and positive integers', () => {
    for (const item of [
      projection, // absent — rolling-deploy tolerance
      { ...projection, overdueDays: null },
      { ...projection, overdueDays: 3 },
    ]) {
      expect(() => normalizeTrainingPlanProjectionResponse(payload([item]))).not.toThrow();
    }
  });

  it('fails closed on garbage drift and on drift stamped onto a completed day', () => {
    for (const item of [
      { ...projection, overdueDays: -1 },
      { ...projection, overdueDays: 'three' },
      { ...projection, completionState: 'completed', completedAt: '2026-07-15T18:00:00.000Z', overdueDays: 2 },
    ]) {
      expect(() => normalizeTrainingPlanProjectionResponse(payload([item]))).toThrow();
    }
  });
});
