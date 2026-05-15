import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaudApiError } from '../../services/plaudClipService';
import { listPlaudClipGroups } from '../../services/plaudClipGroupService';
import { submitMerge } from '../../services/plaudMergeService';
import { usePlaudClipQueue, type PlaudClipQueueState } from '../../hooks/usePlaudClipQueue';
import { PlaudClipMergePanel } from './PlaudClipMergePanel';

vi.mock('../../hooks/usePlaudClipQueue', () => ({
  usePlaudClipQueue: vi.fn(),
}));

vi.mock('../../services/plaudMergeService', () => ({
  submitMerge: vi.fn(),
}));

vi.mock('../../services/plaudClipGroupService', () => ({
  listPlaudClipGroups: vi.fn(),
}));

vi.mock('./PlaudClipUploader', () => ({
  PlaudClipUploader: () => <div data-testid="mock-uploader" />,
}));

vi.mock('./PlaudClipQueue', () => ({
  PlaudClipQueue: () => <div data-testid="mock-queue" />,
}));

vi.mock('./PlaudClientResolver', () => ({
  PlaudClientResolver: ({ onClientResolved }: { onClientResolved: (client: { id: number; fullName: string }) => void }) => {
    useEffect(() => {
      onClientResolved({ id: 42, fullName: 'Client 42' });
    }, [onClientResolved]);
    return <div data-testid="mock-client-resolver" />;
  },
}));

const refresh = vi.fn(async () => undefined);
const upload = vi.fn(async () => undefined);
const removeClip = vi.fn(async () => undefined);
const toggleSelect = vi.fn();
const selectClipIds = vi.fn();
const selectAll = vi.fn();
const clearSelection = vi.fn();
const usePlaudClipQueueMock = vi.mocked(usePlaudClipQueue);
const submitMergeMock = vi.mocked(submitMerge);
const listPlaudClipGroupsMock = vi.mocked(listPlaudClipGroups);

function queueState(overrides: Partial<PlaudClipQueueState> = {}): PlaudClipQueueState {
  return {
    clips: [],
    isLoading: false,
    isUploading: false,
    uploadError: null,
    rejectedClips: [],
    selectedIds: new Set(['clip-1']),
    selectedCount: 1,
    canMerge: true,
    timeline: {
      selectedClipsInTimelineOrder: [],
      selectedClipIdsInTimelineOrder: ['clip-1'],
      spanMinutes: 0,
      maxGapMinutes: 0,
      hasLargeGap: false,
    },
    selectedClipIdsInTimelineOrder: ['clip-1'],
    refresh,
    upload,
    removeClip,
    toggleSelect,
    selectClipIds,
    selectAll,
    clearSelection,
    ...overrides,
  };
}

describe('PlaudClipMergePanel render safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitMergeMock.mockResolvedValue({ mergeRequestId: 'merge-1' } as any);
    listPlaudClipGroupsMock.mockResolvedValue({ groups: [], limit: 8, maxGapMinutes: 90 });
  });

  it('does not render arbitrary upload error detail text', async () => {
    usePlaudClipQueueMock.mockReturnValue(queueState({
      uploadError: new PlaudApiError('UNSAFE_BACKEND_DETAIL', 'do-not-render-private-detail', 500),
    }));

    const { container } = render(<PlaudClipMergePanel onMergeReady={() => {}} />);

    await waitFor(() => expect(listPlaudClipGroupsMock).toHaveBeenCalled());
    expect(screen.getByRole('alert')).toHaveTextContent('PLAUD_ERROR');
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed. Check the file and try again.');
    expect(container.innerHTML).not.toContain('do-not-render-private-detail');
  });

  it('does not render arbitrary rejected-file messages', async () => {
    usePlaudClipQueueMock.mockReturnValue(queueState({
      rejectedClips: [
        {
          filename: 'Marcus-private@example.com.mp3',
          code: 'UNSUPPORTED_MIMETYPE',
          message: 'do-not-render-private-detail',
        },
      ],
    }));

    const { container } = render(<PlaudClipMergePanel onMergeReady={() => {}} />);

    await waitFor(() => expect(listPlaudClipGroupsMock).toHaveBeenCalled());
    expect(screen.getByText(/Rejected file 1/i)).toBeInTheDocument();
    expect(screen.getByText(/UNSUPPORTED_MIMETYPE/i)).toBeInTheDocument();
    expect(screen.getByText(/File type is not supported/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('private@example.com');
    expect(container.innerHTML).not.toContain('Marcus');
    expect(container.innerHTML).not.toContain('do-not-render-private-detail');
  });

  it('does not render arbitrary merge error detail text', async () => {
    usePlaudClipQueueMock.mockReturnValue(queueState());
    submitMergeMock.mockRejectedValue(new PlaudApiError('UNSAFE_BACKEND_DETAIL', 'do-not-render-private-detail', 500));

    const { container } = render(<PlaudClipMergePanel onMergeReady={() => {}} />);
    await waitFor(() => expect(listPlaudClipGroupsMock).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /process 1 selected clips/i }));

    await waitFor(() => {
      expect(screen.getByText(/Processing failed. Refresh the queue and retry./i)).toBeInTheDocument();
    });
    expect(container.innerHTML).not.toContain('do-not-render-private-detail');
  });

  it('renders suggested groups and selects all group clips with one click', async () => {
    usePlaudClipQueueMock.mockReturnValue(queueState({
      clips: [
        { clipId: 'clip-1', filename: 'a.m4a', mimetype: 'audio/m4a', size: 1, durationSec: 60, status: 'pending_merge', uploadedAt: '2026-05-14T16:00:00.000Z', expiresAt: '2026-05-15T16:00:00.000Z' },
        { clipId: 'clip-2', filename: 'b.m4a', mimetype: 'audio/m4a', size: 1, durationSec: 60, status: 'pending_merge', uploadedAt: '2026-05-14T16:10:00.000Z', expiresAt: '2026-05-15T16:00:00.000Z' },
      ],
    }));
    listPlaudClipGroupsMock.mockResolvedValue({
      limit: 8,
      maxGapMinutes: 90,
      groups: [{
        groupId: 'group-1',
        title: 'APPLAUD sync group 1',
        clipIds: ['clip-1', 'clip-2'],
        clipCount: 2,
        startedAt: '2026-05-14T16:00:00.000Z',
        endedAt: '2026-05-14T16:10:00.000Z',
        spanMinutes: 10,
        maxGapMinutes: 10,
        timelineAtSource: 'recorded_at',
        confidence: 'high',
        sourceMix: ['applaud_local_sync'],
        clips: [],
      }],
    });

    render(<PlaudClipMergePanel onMergeReady={() => {}} />);

    const groupButton = await screen.findByRole('button', { name: /APPLAUD sync group 1/i });
    fireEvent.click(groupButton);

    expect(selectClipIds).toHaveBeenCalledWith(['clip-1', 'clip-2']);
  });
});
