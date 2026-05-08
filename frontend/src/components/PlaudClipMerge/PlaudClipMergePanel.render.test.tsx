import React, { useEffect } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaudApiError } from '../../services/plaudClipService';
import { submitMerge } from '../../services/plaudMergeService';
import { usePlaudClipQueue, type PlaudClipQueueState } from '../../hooks/usePlaudClipQueue';
import { PlaudClipMergePanel } from './PlaudClipMergePanel';

vi.mock('../../hooks/usePlaudClipQueue', () => ({
  usePlaudClipQueue: vi.fn(),
}));

vi.mock('../../services/plaudMergeService', () => ({
  submitMerge: vi.fn(),
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
const selectAll = vi.fn();
const clearSelection = vi.fn();
const usePlaudClipQueueMock = vi.mocked(usePlaudClipQueue);
const submitMergeMock = vi.mocked(submitMerge);

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
    timeline: { selectedClipIdsInTimelineOrder: ['clip-1'], maxGapMinutes: 0, hasLargeGap: false },
    selectedClipIdsInTimelineOrder: ['clip-1'],
    refresh,
    upload,
    removeClip,
    toggleSelect,
    selectAll,
    clearSelection,
    ...overrides,
  };
}

describe('PlaudClipMergePanel render safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    submitMergeMock.mockResolvedValue({ mergeRequestId: 'merge-1' } as any);
  });

  it('does not render arbitrary upload error detail text', () => {
    usePlaudClipQueueMock.mockReturnValue(queueState({
      uploadError: new PlaudApiError('UNSAFE_BACKEND_DETAIL', 'do-not-render-private-detail', 500),
    }));

    const { container } = render(<PlaudClipMergePanel onMergeReady={() => {}} />);

    expect(screen.getByRole('alert')).toHaveTextContent('PLAUD_ERROR');
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed. Check the file and try again.');
    expect(container.innerHTML).not.toContain('do-not-render-private-detail');
  });

  it('does not render arbitrary rejected-file messages', () => {
    usePlaudClipQueueMock.mockReturnValue(queueState({
      rejectedClips: [
        {
          filename: 'clip-one.mp3',
          code: 'UNSUPPORTED_MIMETYPE',
          message: 'do-not-render-private-detail',
        },
      ],
    }));

    const { container } = render(<PlaudClipMergePanel onMergeReady={() => {}} />);

    expect(screen.getByText(/clip-one\.mp3/i)).toBeInTheDocument();
    expect(screen.getByText(/UNSUPPORTED_MIMETYPE/i)).toBeInTheDocument();
    expect(screen.getByText(/File type is not supported/i)).toBeInTheDocument();
    expect(container.innerHTML).not.toContain('do-not-render-private-detail');
  });

  it('does not render arbitrary merge error detail text', async () => {
    usePlaudClipQueueMock.mockReturnValue(queueState());
    submitMergeMock.mockRejectedValue(new PlaudApiError('UNSAFE_BACKEND_DETAIL', 'do-not-render-private-detail', 500));

    const { container } = render(<PlaudClipMergePanel onMergeReady={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /process 1 selected clips/i }));

    await waitFor(() => {
      expect(screen.getByText(/Processing failed. Refresh the queue and retry./i)).toBeInTheDocument();
    });
    expect(container.innerHTML).not.toContain('do-not-render-private-detail');
  });
});
