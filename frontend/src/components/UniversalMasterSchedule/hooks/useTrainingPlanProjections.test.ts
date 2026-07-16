/**
 * ============================================================================
 * FILE: useTrainingPlanProjections.test.ts
 * PURPOSE: Lock flag, roster, pagination, retry, and stale-request behavior.
 * AUTHOR: Codex GPT-5 | LAST MODIFIED: 2026-07-15
 * AI VILLAGE VALIDATED: 2026-07-15
 * ============================================================================
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type {
  TrainingPlanProjection,
  TrainingPlanProjectionResponse,
} from '../../../services/training-plan-projection-service';
import { useTrainingPlanProjections } from './useTrainingPlanProjections';

const projection = (id: string, date = '2026-07-15'): TrainingPlanProjection => ({
  projectionId: id,
  kind: 'training_plan_projection',
  source: 'training_plan',
  billingImpact: 'none',
  readOnly: true,
  planId: `plan-${id}`,
  clientId: 42,
  trainerId: 7,
  planStatus: 'active',
  scheduledDate: date,
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
  coexistenceKey: `42:${date}`,
});

const response = (
  items: TrainingPlanProjection[],
  overrides: Partial<TrainingPlanProjectionResponse> = {},
): TrainingPlanProjectionResponse => ({
  items,
  page: 1,
  limit: 100,
  total: items.length,
  hasMore: false,
  range: { startDate: '2026-07-13', endDate: '2026-07-19' },
  ...overrides,
});

const baseInput = {
  enabled: true,
  mode: 'client' as const,
  activeView: 'week' as const,
  currentDate: new Date(2026, 6, 15, 12),
  clients: [],
  clientRosterLoading: false,
};

describe('useTrainingPlanProjections', () => {
  it('does not call the network when the feature flag is off', () => {
    const reader = { getProjections: vi.fn() };
    const { result } = renderHook(() => useTrainingPlanProjections({
      ...baseInput,
      enabled: false,
    }, reader));

    expect(result.current.enabled).toBe(false);
    expect(result.current.status).toBe('disabled');
    expect(reader.getProjections).not.toHaveBeenCalled();
  });

  it('loads a bounded self scope for the client role', async () => {
    const reader = { getProjections: vi.fn().mockResolvedValue(response([projection('p1')])) };
    const { result } = renderHook(() => useTrainingPlanProjections(baseInput, reader));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(reader.getProjections).toHaveBeenCalledWith({
      startDate: '2026-07-13',
      endDate: '2026-07-19',
      page: 1,
      limit: 100,
      clientIds: undefined,
    });
    expect(result.current.items.map(({ projectionId }) => projectionId)).toEqual(['p1']);
  });

  it('waits for staff roster truth, then requests one plural client scope', async () => {
    const reader = { getProjections: vi.fn().mockResolvedValue(response([])) };
    const { result, rerender } = renderHook((props: {
      loading: boolean;
      clients: Array<{ id: string | number }>;
    }) => useTrainingPlanProjections({
      ...baseInput,
      mode: 'trainer',
      clientRosterLoading: props.loading,
      clients: props.clients,
    }, reader), { initialProps: { loading: true, clients: [] } });

    expect(result.current.status).toBe('waiting');
    expect(reader.getProjections).not.toHaveBeenCalled();

    rerender({ loading: false, clients: [{ id: '42' }, { id: 43 }] });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(reader.getProjections).toHaveBeenCalledWith(expect.objectContaining({ clientIds: [42, 43] }));
  });

  it('appends later pages without duplicating projection identities', async () => {
    const first = projection('p1');
    const second = projection('p2', '2026-07-16');
    const reader = {
      getProjections: vi.fn()
        .mockResolvedValueOnce(response([first], { total: 2, hasMore: true }))
        .mockResolvedValueOnce(response([first, second], { page: 2, total: 2, hasMore: false })),
    };
    const { result } = renderHook(() => useTrainingPlanProjections(baseInput, reader));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => { await result.current.loadMore(); });

    expect(result.current.items.map(({ projectionId }) => projectionId)).toEqual(['p1', 'p2']);
    expect(result.current.hasMore).toBe(false);
    expect(reader.getProjections).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
  });

  it('shows a safe error and can retry the current window', async () => {
    const reader = {
      getProjections: vi.fn()
        .mockRejectedValueOnce(new Error('private server detail'))
        .mockResolvedValueOnce(response([projection('retry-success')])),
    };
    const { result } = renderHook(() => useTrainingPlanProjections(baseInput, reader));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Could not load planned training.');

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.items[0].projectionId).toBe('retry-success');
    expect(reader.getProjections).toHaveBeenCalledTimes(2);
  });
  it('coalesces rapid load-more activation into one page request', async () => {
    let resolvePage!: (value: TrainingPlanProjectionResponse) => void;
    const pendingPage = new Promise<TrainingPlanProjectionResponse>((resolve) => {
      resolvePage = resolve;
    });
    const reader = {
      getProjections: vi.fn()
        .mockResolvedValueOnce(response([projection('p1')], { total: 2, hasMore: true }))
        .mockReturnValue(pendingPage),
    };
    const { result } = renderHook(() => useTrainingPlanProjections(baseInput, reader));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let requests: Array<Promise<void>> = [];
    act(() => {
      requests = [result.current.loadMore(), result.current.loadMore()];
    });
    expect(reader.getProjections).toHaveBeenCalledTimes(2);

    resolvePage(response([projection('p2')], { page: 2, total: 2, hasMore: false }));
    await act(async () => { await Promise.all(requests); });
    expect(result.current.items.map(({ projectionId }) => projectionId)).toEqual(['p1', 'p2']);
  });
  it('ignores a stale page-one response after the visible date lens changes', async () => {
    let resolveOld!: (value: TrainingPlanProjectionResponse) => void;
    const oldRequest = new Promise<TrainingPlanProjectionResponse>((resolve) => {
      resolveOld = resolve;
    });
    const reader = {
      getProjections: vi.fn()
        .mockReturnValueOnce(oldRequest)
        .mockResolvedValueOnce(response([projection('new-lens', '2026-07-22')])),
    };
    const { result, rerender } = renderHook((date: Date) => useTrainingPlanProjections({
      ...baseInput,
      currentDate: date,
    }, reader), { initialProps: new Date(2026, 6, 15, 12) });

    rerender(new Date(2026, 6, 22, 12));
    await waitFor(() => expect(result.current.items[0]?.projectionId).toBe('new-lens'));

    resolveOld(response([projection('stale-lens')]));
    await act(async () => { await oldRequest; });
    expect(result.current.items[0]?.projectionId).toBe('new-lens');
  });
});