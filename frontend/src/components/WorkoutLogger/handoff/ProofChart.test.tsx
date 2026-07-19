import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProofChart from './ProofChart';
import type { ProofPoint } from './workoutHandoff.types';

// Victory's SVG internals are fragile in jsdom — mock to lightweight stubs and test ProofChart's
// OWN rendering logic (which marks it draws for 0 / 1 / >1 points).
vi.mock('victory', () => ({
  VictoryChart: ({ children }: any) => <div data-testid="chart">{children}</div>,
  VictoryAxis: () => <div data-testid="axis" />,
  VictoryArea: () => <div data-testid="area" />,
  VictoryLine: () => <div data-testid="line" />,
  VictoryScatter: ({ data }: any) => <div data-testid="scatter" data-count={data?.length ?? 0} />,
}));

const pt = (e1rm: number, over: Partial<ProofPoint> = {}): ProofPoint => ({
  sessionId: `s-${e1rm}`, dateISO: '2026-07-11T10:00:00Z', e1rm, ...over,
});

describe('ProofChart', () => {
  it('renders nothing when there are no points', () => {
    const { container } = render(<ProofChart points={[]} pr={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('always plots a single point (even when it is not "today") — never a blank chart', () => {
    render(<ProofChart points={[pt(245, { isToday: false })]} pr={false} />);
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(screen.queryByTestId('line')).not.toBeInTheDocument(); // no line for 1 point
    expect(screen.queryByTestId('area')).not.toBeInTheDocument();
    expect(screen.getByTestId('scatter')).toHaveAttribute('data-count', '1'); // the lone dot IS drawn
  });

  it('draws area + line + today scatter for a multi-point series', () => {
    render(<ProofChart points={[pt(240), pt(250), pt(263, { isToday: true })]} pr />);
    expect(screen.getByTestId('area')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('scatter')).toHaveAttribute('data-count', '1');
  });

  it('exposes an accessible label for the trend', () => {
    render(<ProofChart points={[pt(263, { isToday: true })]} pr ariaLabel="Squat e1RM, 263 lbs today" />);
    expect(screen.getByRole('img', { name: 'Squat e1RM, 263 lbs today' })).toBeInTheDocument();
  });
});
