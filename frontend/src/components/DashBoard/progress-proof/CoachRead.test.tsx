/**
 * TEST: Coach Read (G3a) — local next-best-action line
 * PURPOSE: The pulse emits a plain-language coachAction from tone + gravity, and the
 *   insight bar renders it as the "what to do next" beat. Fully local (no backend).
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProgressChartInsightBar from './ProgressChartInsightBar';
import { buildProgressChartPulse } from './progressChartPulse';

const pulseFor = (points: { x: string; y: number }[]) =>
  buildProgressChartPulse(points, { unit: 'lb', higherIsBetter: true });

describe('pulse coachAction', () => {
  it('gives a record-lock action at a new best', () => {
    expect(pulseFor([{ x: 'W1', y: 100 }, { x: 'W2', y: 200 }]).coachAction)
      .toBe('New personal best - keep this stimulus to lock it in.');
  });

  it('names the gap for a rising trend', () => {
    expect(pulseFor([{ x: 'W1', y: 200 }, { x: 'W2', y: 100 }, { x: 'W3', y: 150 }]).coachAction)
      .toBe('Trending up - 50 lb from your best. One more quality session closes the gap.');
  });

  it('prescribes overload when steady (plateau)', () => {
    expect(pulseFor([{ x: 'W1', y: 100 }, { x: 'W2', y: 100 }]).coachAction)
      .toBe('Holding steady - add a small progressive overload to break the plateau.');
  });

  it('flags recovery when falling', () => {
    expect(pulseFor([{ x: 'W1', y: 200 }, { x: 'W2', y: 100 }]).coachAction)
      .toBe('Dipped from your best - check recovery, sleep, and volume this week.');
  });
});

describe('ProgressChartInsightBar Coach Read render', () => {
  it('renders the coachAction line on the momentum strip', () => {
    render(<ProgressChartInsightBar pulse={pulseFor([{ x: 'W1', y: 200 }, { x: 'W2', y: 100 }, { x: 'W3', y: 150 }])} />);
    expect(screen.getByText(/from your best\. One more quality session/i)).toBeInTheDocument();
  });

  it('does not repeat the redundant "Next target" text (gravity + coach read cover it)', () => {
    render(<ProgressChartInsightBar pulse={pulseFor([{ x: 'W1', y: 200 }, { x: 'W2', y: 100 }, { x: 'W3', y: 150 }])} />);
    expect(screen.queryByText(/Next target:/)).not.toBeInTheDocument();
  });
});