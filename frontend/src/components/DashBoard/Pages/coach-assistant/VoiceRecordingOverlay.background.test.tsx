/**
 * G06/T31 — backgrounding during recorder capture must stop the mic tracks
 * and tear the overlay down WITHOUT transcribing: nothing auto-sends, no
 * track keeps recording, and an audio stop is never an action cancel.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const recorderMock = vi.hoisted(() => ({
  state: 'recording' as string,
  audioBlob: null as Blob | null,
  duration: 3,
  error: null as string | null,
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  reset: vi.fn(),
  getAudioLevel: vi.fn(() => 0),
}));

const transcriptionMock = vi.hoisted(() => ({
  state: 'idle' as string,
  text: '',
  error: null as string | null,
  transcribe: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('./hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => recorderMock,
}));

vi.mock('./hooks/useGeminiTranscription', () => ({
  useGeminiTranscription: () => transcriptionMock,
}));

import VoiceRecordingOverlay from './VoiceRecordingOverlay';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

function fireVisibilityChange() {
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('VoiceRecordingOverlay background stop (G06/T31)', () => {
  beforeEach(() => {
    recorderMock.state = 'recording';
    recorderMock.start.mockReset();
    recorderMock.stop.mockReset();
    recorderMock.abort.mockReset();
    recorderMock.reset.mockReset();
    transcriptionMock.state = 'idle';
    transcriptionMock.text = '';
    transcriptionMock.transcribe.mockReset();
    transcriptionMock.reset.mockReset();
    setHidden(false);
  });

  afterEach(() => {
    setHidden(false);
  });

  it('stops mic tracks and closes without transcribing when the tab is hidden mid-recording', () => {
    const onClose = vi.fn();
    const onTranscribed = vi.fn();

    render(
      <VoiceRecordingOverlay
        isOpen
        onClose={onClose}
        onTranscribed={onTranscribed}
      />,
    );

    expect(screen.getByRole('dialog', { name: /voice recording/i })).toBeInTheDocument();

    setHidden(true);
    fireVisibilityChange();

    // abort() = tracks stopped with no blob published, so transcription can
    // never fire from a background teardown. The overlay itself requests the
    // parent close (onClose); unmounting is the parent's move.
    expect(recorderMock.abort).toHaveBeenCalledTimes(1);
    expect(transcriptionMock.reset).toHaveBeenCalledTimes(1);
    expect(transcriptionMock.transcribe).not.toHaveBeenCalled();
    expect(onTranscribed).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('leaves a reviewed transcript preview alone when the tab is hidden after capture', () => {
    recorderMock.state = 'idle';
    transcriptionMock.state = 'done';
    transcriptionMock.text = 'Log squats three by ten';
    const onClose = vi.fn();
    const onTranscribed = vi.fn();

    render(
      <VoiceRecordingOverlay
        isOpen
        onClose={onClose}
        onTranscribed={onTranscribed}
      />,
    );

    setHidden(true);
    fireVisibilityChange();

    expect(recorderMock.abort).not.toHaveBeenCalled();
    expect(recorderMock.stop).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onTranscribed).not.toHaveBeenCalled();
    expect(transcriptionMock.transcribe).not.toHaveBeenCalled();
  });
});
