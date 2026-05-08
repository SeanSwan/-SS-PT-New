import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCoachIntakeHealth,
  getCoachIntakeRetention,
  listCoachIntakeItems,
  type CoachIntakeItem,
} from '../services/coachIntakeService';
import { dispatchCoachProposalAction } from '../services/coachProposalActionEvents';
import { useCoachIntakeQueue } from './useCoachIntakeQueue';

vi.mock('../services/coachIntakeService', () => ({
  getCoachIntakeHealth: vi.fn(),
  getCoachIntakeRetention: vi.fn(),
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
    vi.mocked(getCoachIntakeHealth).mockResolvedValue({
      schemaReady: true,
      status: 'healthy',
      counts: { ...summary, stuckProcessing: 0 },
      nextOperatorAction: { key: 'review_ready_drafts', label: 'Review ready drafts' },
    });
    vi.mocked(getCoachIntakeRetention).mockResolvedValue({
      schemaReady: true,
      status: 'attention',
      summary: {
        totalWithRawArtifacts: 3,
        purgeReady: 1,
        reviewRequired: 1,
        retained: 1,
      },
      nextOperatorAction: {
        key: 'review_purge_candidates',
        label: 'Review raw artifact purge candidates',
      },
    });
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
    expect(result.current.health?.status).toBe('healthy');
    expect(result.current.retention?.summary.purgeReady).toBe(1);

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
    expect(getCoachIntakeHealth).toHaveBeenCalledTimes(2);
    expect(getCoachIntakeRetention).toHaveBeenCalledTimes(2);
  });
});
