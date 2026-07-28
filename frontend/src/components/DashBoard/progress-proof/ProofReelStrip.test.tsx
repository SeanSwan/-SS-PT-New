/**
 * TEST: ProofReelStrip (visual + share)
 * PURPOSE: Renders real proof-moment slides; renders NOTHING when the reel is empty; the
 *   share button hands the slide's truthful caption to the Web Share API.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ProofReelStrip from './ProofReelStrip';
import type { CanonicalProgressCharts } from '../../../hooks/analytics/useClientProgressCharts.types';

const pts = (ys: number[]) => ys.map((y, i) => ({ x: `W${i + 1}`, y }));
const bundle = (p: Partial<Record<string, unknown>>) => p as unknown as CanonicalProgressCharts;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ProofReelStrip', () => {
  it('renders real proof-moment slides with an honest moment count', () => {
    render(<ProofReelStrip nonEmptyChartCount={6} charts={bundle({
      prTimeline: [{ x: 'W3', y: 225, exercise: 'Back Squat', reps: 3 }],
      workoutFrequency: pts([3, 5]),
    })} />);
    expect(screen.getByTestId('proof-reel-strip')).toBeInTheDocument();
    expect(screen.getByText('Personal record')).toBeInTheDocument();
    expect(screen.getByText('3 moments')).toBeInTheDocument();
  });

  it('renders NOTHING when there is nothing real to celebrate', () => {
    render(<ProofReelStrip nonEmptyChartCount={0} charts={bundle({})} />);
    expect(screen.queryByTestId('proof-reel-strip')).not.toBeInTheDocument();
  });

  it('shares a slide via the Web Share API with the truthful caption', async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { ...navigator, share: shareSpy });
    // nonEmptyChartCount 0 -> the reel is just the PR slide, so button[0] IS the PR slide
    render(<ProofReelStrip nonEmptyChartCount={0} charts={bundle({
      prTimeline: [{ x: 'W3', y: 225, exercise: 'Back Squat', reps: 3 }],
    })} />);
    fireEvent.click(screen.getAllByRole('button', { name: /share/i })[0]);
    await waitFor(() => expect(shareSpy).toHaveBeenCalledTimes(1));
    expect(shareSpy.mock.calls[0][0].text).toContain('Personal record');
    expect(await screen.findByText('Shared')).toBeInTheDocument();
  });
});
