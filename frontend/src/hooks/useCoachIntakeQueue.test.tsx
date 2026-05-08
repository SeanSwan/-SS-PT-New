import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { listCoachIntakeItems, type CoachIntakeItem } from '../services/coachIntakeService';
import { dispatchCoachProposalAction } from '../services/coachProposalActionEvents';
import { useCoachIntakeQueue } from './useCoachIntakeQueue';

vi.mock('../services/coachIntakeService', () => ({
  listCoachIntakeItems: vi.fn(),
}));

const summary = {
  total: 1,
  actionable: 1,
  today: 1,
  unprocessed: 0,
  processing: 0,
  readyReview: 1,
  failed: 0,
  needsClient: 0,
};

function makeItem(id: string): CoachIntakeItem {
  return {
    id,
    entityId: id,
    kind: 'coach_intake',
    source: 'chat_narrative',
    sourceLabel: 'Coach narrative',
    queueStatus: 'ready_review',
    title: `Draft ${id}`,
    clientId: 42,
    clientName: 'Client 42',
    needsClient: false,
    clipCount: 1,
    parsedExerciseCount: 3,
    canReview: true,
    errorCode: null,
    status: 'READY_FOR_REVIEW',
    createdAt: '2026-05-05T12:00:00.000Z',
    completedAt: null,
    expiresAt: null,
  } as CoachIntakeItem;
}

describe('useCoachIntakeQueue proposal action bridge', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('refreshes the queue when a proposal action event is published', async () => {
    vi.mocked(listCoachIntakeItems)
      .mockResolvedValueOnce({
        items: [makeItem('intake-before-action')],
        summary,
        scope: 'actionable',
        limit: 6,
      })
      .mockResolvedValueOnce({
        items: [makeItem('intake-after-action')],
        summary,
        scope: 'actionable',
        limit: 6,
      });

    const { result } = renderHook(() => useCoachIntakeQueue({ limit: 6 }));

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('intake-before-action');
    });

    act(() => {
      dispatchCoachProposalAction({
        id: 'proposal-1',
        type: 'workout_log',
        status: 'APPLIED',
        title: 'Applied workout',
      });
    });

    await waitFor(() => {
      expect(result.current.items[0]?.id).toBe('intake-after-action');
    });
    expect(listCoachIntakeItems).toHaveBeenCalledTimes(2);
  });
});
