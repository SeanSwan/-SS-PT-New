/**
 * CoachIntakeWorkspacePlaudPlayback.test.tsx
 * ==========================================
 * Regression coverage for authenticated PLAUD clip playback inside the
 * canonical Coach Command Center intake workspace.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CoachIntakeWorkspace from './CoachIntakeWorkspace';
import { fetchClipAudioBlob } from '../../../../services/plaudClipService';

vi.mock('../../../../services/coachIntakeService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../services/coachIntakeService')>();
  return {
    ...actual,
    confirmCoachIntakeAudioOrder: vi.fn(),
  };
});

vi.mock('../../../../services/plaudClipService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../services/plaudClipService')>();
  return {
    ...actual,
    fetchClipAudioBlob: vi.fn(),
  };
});

const fetchClipAudioBlobMock = vi.mocked(fetchClipAudioBlob);
const createObjectURL = vi.fn(() => 'blob:coach-plaud-audio');
const revokeObjectURL = vi.fn();

function makeQueue() {
  return {
    items: [
      {
        id: 'clip:11111111-1111-4111-8111-111111111111',
        entityId: '11111111-1111-4111-8111-111111111111',
        kind: 'clip',
        source: 'applaud_webhook',
        sourceLabel: 'Applaud',
        queueStatus: 'unprocessed',
        title: 'PLAUD clip',
        clientName: null,
        clientId: null,
        clipCount: 1,
        canReview: false,
        needsClient: true,
        status: 'pending_merge',
        mimetype: 'audio/mpeg',
        sizeBytes: 4096,
        durationSec: 63,
        r2MirrorStatus: 'mirrored',
        playbackReady: true,
        playbackPath: '/api/plaud/clips/11111111-1111-4111-8111-111111111111/audio',
        timelineAt: '2026-05-06T16:30:00.000Z',
        createdAt: '2026-05-06T16:30:00.000Z',
        uploadedAt: '2026-05-06T16:30:00.000Z',
        expiresAt: '2026-05-07T16:30:00.000Z',
      },
    ],
    summary: {
      total: 1,
      actionable: 1,
      today: 1,
      unprocessed: 1,
      processing: 0,
      readyReview: 0,
      failed: 0,
      needsClient: 1,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  };
}

describe('CoachIntakeWorkspace PLAUD playback', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    fetchClipAudioBlobMock.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  it('renders authenticated playback controls for the active PLAUD clip intake item', async () => {
    fetchClipAudioBlobMock.mockResolvedValue(new Blob(['audio-bytes'], { type: 'audio/mpeg' }));

    render(
      <MemoryRouter>
        <CoachIntakeWorkspace
          userRole="admin"
          selectedClientName={null}
          onCommandPrompt={vi.fn()}
          queue={makeQueue()}
          activeIntakeId="11111111-1111-4111-8111-111111111111"
        />
      </MemoryRouter>,
    );

    const target = screen.getByLabelText(/Active review target/i);
    expect(within(target).getByText(/Audio playback/i)).toBeInTheDocument();
    fireEvent.click(within(target).getByRole('button', { name: /load audio preview for active plaud intake clip/i }));

    await waitFor(() => {
      expect(fetchClipAudioBlobMock).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
    });
    const audio = within(target).getByLabelText(/audio preview for active plaud intake clip/i);
    expect(audio.tagName.toLowerCase()).toBe('audio');
    expect(audio).toHaveAttribute('src', 'blob:coach-plaud-audio');
  });
});
