import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import CoachVoiceLevelMeter from './CoachVoiceLevelMeter';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CoachVoiceLevelMeter — unmistakable recording state (W3 D2)', () => {
  it('renders nothing while dictation is off', () => {
    render(<CoachVoiceLevelMeter active={false} />);
    expect(screen.queryByTestId('coach-voice-strip')).toBeNull();
  });

  it('shows the listening strip with a truthful label while armed', () => {
    render(<CoachVoiceLevelMeter active />);
    expect(screen.getByTestId('coach-voice-strip')).toBeInTheDocument();
    expect(screen.getByText(/Listening — tap the mic when you finish/i)).toBeInTheDocument();
  });

  it('degrades to the pulse indicator when no parallel mic capture is available (dictation never breaks)', async () => {
    // jsdom has no mediaDevices — the component must fall back, not throw.
    render(<CoachVoiceLevelMeter active />);
    await waitFor(() => expect(screen.getByTestId('coach-voice-strip').className).toContain('is-pulse'));
  });

  it('degrades to pulse when getUserMedia is denied', async () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<CoachVoiceLevelMeter active />);
    await waitFor(() => expect(screen.getByTestId('coach-voice-strip').className).toContain('is-pulse'));
  });

  it('stops the parallel stream tracks the moment dictation stops', async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
    vi.stubGlobal('navigator', {
      ...navigator,
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });
    const { rerender } = render(<CoachVoiceLevelMeter active />);
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());
    rerender(<CoachVoiceLevelMeter active={false} />);
    await waitFor(() => expect(stop).toHaveBeenCalled());
  });
});
