import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlaudIntelligenceWorkspacePage } from './PlaudIntelligenceWorkspacePage';
import { usePlaudIntakeQueue } from '../../hooks/usePlaudIntakeQueue';

vi.mock('../../components/PlaudClipMerge/PlaudMergeWorkspace', () => ({
  PlaudMergeWorkspace: () => <div data-testid="mock-plaud-merge-workspace" />,
}));

vi.mock('../../hooks/usePlaudIntakeQueue', () => ({
  usePlaudIntakeQueue: vi.fn(),
}));

const baseSummary = {
  total: 1,
  actionable: 1,
  today: 1,
  unprocessed: 1,
  processing: 0,
  readyReview: 0,
  failed: 0,
  needsClient: 1,
};

const refresh = vi.fn(async () => undefined);
const usePlaudIntakeQueueMock = vi.mocked(usePlaudIntakeQueue);

describe('PlaudIntelligenceWorkspacePage render safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render arbitrary preview labels or raw client names from intake metadata', () => {
    usePlaudIntakeQueueMock.mockReturnValue({
      items: [
        {
          id: 'item-1',
          entityId: 'merge-1',
          kind: 'merge_request',
          source: 'manual_upload',
          sourceLabel: 'private@example.com',
          queueStatus: 'private@example.com' as any,
          title: 'private@example.com',
          clientId: 42,
          clientName: 'Marcus private@example.com',
          needsClient: false,
          clipCount: 1,
          parsedExerciseCount: null,
          canReview: true,
          errorCode: null,
          status: 'completed',
          createdAt: '2026-05-06T16:30:00.000Z',
          completedAt: null,
          expiresAt: null,
        },
      ],
      summary: baseSummary,
      isLoading: false,
      error: null,
      refresh,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/trainer/plaud']}>
        <PlaudIntelligenceWorkspacePage />
      </MemoryRouter>,
    );

    expect(screen.getByText(/selected client/i)).toBeInTheDocument();
    expect(screen.getByText(/status pending/i)).toBeInTheDocument();
    expect(screen.getByText(/manual upload/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('private@example.com');
  });

  it('shows stable queue-load failure copy instead of raw error messages', () => {
    usePlaudIntakeQueueMock.mockReturnValue({
      items: [],
      summary: { ...baseSummary, total: 0, actionable: 0, today: 0, unprocessed: 0, needsClient: 0 },
      isLoading: false,
      error: { message: 'private@example.com token detail', code: 'UNKNOWN', status: 500 } as any,
      refresh,
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/dashboard/trainer/plaud']}>
        <PlaudIntelligenceWorkspacePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load PLAUD intake queue.');
    expect(container.innerHTML).not.toContain('private@example.com');
  });

  it('promotes one next-best intake action before the dense queue details', () => {
    usePlaudIntakeQueueMock.mockReturnValue({
      items: [
        {
          id: 'item-ready',
          entityId: 'merge-ready',
          kind: 'merge_request',
          source: 'manual_upload',
          sourceLabel: 'Manual upload',
          queueStatus: 'ready_review',
          title: 'Ready review',
          clientId: 42,
          clientName: 'Hidden Name',
          needsClient: false,
          clipCount: 2,
          parsedExerciseCount: 6,
          canReview: true,
          errorCode: null,
          status: 'completed',
          createdAt: '2026-05-06T16:30:00.000Z',
          completedAt: null,
          expiresAt: null,
        },
      ],
      summary: { ...baseSummary, readyReview: 2, needsClient: 0 },
      isLoading: false,
      error: null,
      refresh,
    });

    render(
      <MemoryRouter initialEntries={['/dashboard/trainer/plaud']}>
        <PlaudIntelligenceWorkspacePage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('region', { name: /plaud next best move/i })).toHaveTextContent('Review next intake');
    expect(screen.getByRole('link', { name: /review next intake/i }))
      .toHaveAttribute('href', '/dashboard/trainer/plaud?review=next');
  });
});
