/**
 * FILE: VoiceRecordingOverlay.hotMic.test.tsx
 * PURPOSE: End-to-end proof that the hot-microphone defect is closed in the real
 *          component, not merely in the hook.
 *
 * The hook's own suite proves useCoachCapture releases the microphone on
 * visibilitychange / pagehide / unmount. That is worthless to a user until the
 * overlay actually consumes it — the overlay previously used the raw
 * useVoiceRecorder + useGeminiTranscription pair, neither of which has any
 * lifecycle handling (useVoiceRecorder contains no useEffect at all).
 *
 * These tests mock only the LEAF hooks, so the real useCoachCapture and the real
 * overlay both run. If someone reverts the overlay to the raw hooks, these fail.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState, useCallback } from 'react';
import { render, act, screen } from '@testing-library/react';

const recorderStop = vi.fn();
const recorderReset = vi.fn();
const transcribeSpy = vi.fn(async () => 'hello world');
const transcriptionReset = vi.fn();

let grantPermission: (() => void) | null = null;
let audioBlob: Blob | null = null;

vi.mock('./hooks/useVoiceRecorder', () => ({
  useVoiceRecorder: () => {
    const [state, setState] = useState('idle');
    const start = useCallback(async () => {
      setState('requesting');
      grantPermission = () => setState('recording');
    }, []);
    const stop = useCallback(() => { recorderStop(); setState('stopped'); }, []);
    return { state, audioBlob, duration: 0, error: null, start, stop, reset: recorderReset };
  },
}));

vi.mock('./hooks/useGeminiTranscription', () => ({
  useGeminiTranscription: () => ({
    state: 'idle',
    text: '',
    error: null,
    transcribe: transcribeSpy,
    reset: transcriptionReset,
  }),
}));

import VoiceRecordingOverlay from './VoiceRecordingOverlay';

const setVisibility = (value: 'visible' | 'hidden') => {
  Object.defineProperty(document, 'visibilityState', { value, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
};

const renderOverlay = () =>
  render(
    <VoiceRecordingOverlay
      isOpen
      onClose={vi.fn()}
      onTranscribed={vi.fn()}
      onEditTranscript={vi.fn()}
    />,
  );

beforeEach(() => {
  vi.clearAllMocks();
  grantPermission = null;
  audioBlob = null;
  setVisibility('visible');
  // The overlay skips auto-start on iOS; keep the UA on the desktop path.
  Object.defineProperty(navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    configurable: true,
  });
});

describe('VoiceRecordingOverlay — hot microphone', () => {
  it('releases the microphone when the tab is hidden while recording', async () => {
    renderOverlay();
    await act(async () => {});          // auto-start effect
    act(() => { grantPermission?.(); });

    expect(recorderStop).not.toHaveBeenCalled();
    act(() => { setVisibility('hidden'); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  it('releases the microphone on pagehide', async () => {
    renderOverlay();
    await act(async () => {});
    act(() => { grantPermission?.(); });

    act(() => { window.dispatchEvent(new Event('pagehide')); });

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  it('releases the microphone when the overlay unmounts mid-recording', async () => {
    const { unmount } = renderOverlay();
    await act(async () => {});
    act(() => { grantPermission?.(); });

    unmount();

    expect(recorderStop).toHaveBeenCalledTimes(1);
  });

  it('tells the user why recording stopped instead of failing silently', async () => {
    renderOverlay();
    await act(async () => {});
    act(() => { grantPermission?.(); });
    act(() => { setVisibility('hidden'); });

    expect(screen.getByText(/left this screen/i)).toBeInTheDocument();
  });

  /**
   * After an automatic stop the user has walked away, so shipping their audio off
   * to be transcribed anyway would contradict the "Nothing was saved" notice they
   * are being shown.
   */
  it('does not transcribe audio captured before an automatic stop', async () => {
    audioBlob = new Blob(['x'], { type: 'audio/webm' });
    renderOverlay();
    await act(async () => {});
    act(() => { grantPermission?.(); });

    act(() => { setVisibility('hidden'); });
    await act(async () => {});

    expect(transcribeSpy).not.toHaveBeenCalled();
  });
});
