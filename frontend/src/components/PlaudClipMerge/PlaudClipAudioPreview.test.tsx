import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlaudClipAudioPreview } from './PlaudClipAudioPreview';
import { fetchClipAudioBlob, type PlaudClip } from '../../services/plaudClipService';

vi.mock('../../services/plaudClipService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/plaudClipService')>();
  return {
    ...actual,
    fetchClipAudioBlob: vi.fn(),
  };
});

const fetchClipAudioBlobMock = vi.mocked(fetchClipAudioBlob);
const createObjectURL = vi.fn(() => 'blob:plaud-audio');
const revokeObjectURL = vi.fn();

const playableClip: PlaudClip = {
  clipId: '11111111-1111-4111-8111-111111111111',
  filename: 'workout-audio.mp3',
  mimetype: 'audio/mpeg',
  size: 1024,
  durationSec: 45,
  status: 'pending_merge',
  uploadedAt: '2026-05-04T10:00:00.000Z',
  expiresAt: '2026-05-05T10:00:00.000Z',
  playbackReady: true,
  playbackPath: '/api/plaud/clips/11111111-1111-4111-8111-111111111111/audio',
};

describe('PlaudClipAudioPreview', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
    fetchClipAudioBlobMock.mockReset();
    createObjectURL.mockClear();
    revokeObjectURL.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads authenticated clip audio on demand and renders native playback controls', async () => {
    fetchClipAudioBlobMock.mockResolvedValue(new Blob(['audio-bytes'], { type: 'audio/mpeg' }));

    render(<PlaudClipAudioPreview clip={playableClip} label="Audio clip 1" />);

    expect(screen.getByText(/Playable recording/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /load audio preview for audio clip 1/i }));

    await waitFor(() => expect(fetchClipAudioBlobMock).toHaveBeenCalledWith(playableClip.clipId));
    const audio = screen.getByLabelText(/audio preview for audio clip 1/i);
    expect(audio.tagName.toLowerCase()).toBe('audio');
    expect(audio).toHaveAttribute('src', 'blob:plaud-audio');
  });

  it('does not request audio when the backend says the clip is not ready', () => {
    render(
      <PlaudClipAudioPreview
        clip={{ ...playableClip, status: 'uploading', playbackReady: false }}
        label="Audio clip 1"
      />,
    );

    expect(screen.getByText(/Audio is still processing/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /load audio preview/i })).toBeNull();
    expect(fetchClipAudioBlobMock).not.toHaveBeenCalled();
  });

  it('does not request audio for terminal mirror failures', () => {
    render(
      <PlaudClipAudioPreview
        clip={{ ...playableClip, playbackReady: false, r2MirrorStatus: 'failed_terminal' }}
        label="Audio clip 1"
      />,
    );

    expect(screen.getByText(/Audio mirror failed. Re-upload this recording./i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /load audio preview/i })).toBeNull();
    expect(fetchClipAudioBlobMock).not.toHaveBeenCalled();
  });

  it('fails clearly for unsupported audio formats without breaking the row', () => {
    render(
      <PlaudClipAudioPreview
        clip={{ ...playableClip, mimetype: 'application/octet-stream' }}
        label="Audio clip 1"
      />,
    );

    expect(screen.getByText(/Playback unavailable for this format/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /load audio preview/i })).toBeNull();
    expect(fetchClipAudioBlobMock).not.toHaveBeenCalled();
  });

  it('keeps the row usable when audio fetch fails', async () => {
    fetchClipAudioBlobMock.mockRejectedValue(new Error('network failed'));

    render(<PlaudClipAudioPreview clip={playableClip} label="Audio clip 1" />);
    fireEvent.click(screen.getByRole('button', { name: /load audio preview for audio clip 1/i }));

    await waitFor(() => expect(screen.getByText(/Audio could not be loaded/i)).toBeTruthy());
  });
});
