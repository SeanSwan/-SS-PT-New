import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SetsRepsTrendCard, WeeklyVolumeCard } from './CanonicalProgressChartsGrid.interactiveCards';

describe('Canonical progress interactive cards', () => {
  it('renders weekly volume range controls and a verified-data drilldown', () => {
    render(<WeeklyVolumeCard data={[
      { x: 'W1', y: 1200, workouts: 1 },
      { x: 'W2', y: 2400, workouts: 2 },
    ]} />);

    expect(screen.getByText('Weekly Training Volume')).toBeTruthy();
    expect(screen.getByText('Volume Pulse')).toBeTruthy();
    expect(screen.getByText('+100% vs prior')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Recent' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'CSV' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('2 logged workouts in this point.')).toBeTruthy();
  });

  it('renders sets/reps legend toggles that can isolate a series', () => {
    render(<SetsRepsTrendCard bundle={{
      sets: [{ x: 'W1', y: 10 }, { x: 'W2', y: 12 }],
      reps: [{ x: 'W1', y: 80 }, { x: 'W2', y: 96 }],
    }} />);

    const repsToggle = screen.getByRole('button', { name: 'Reps' });
    expect(screen.getByText('Rep Pulse')).toBeTruthy();
    expect(screen.getByText('+20% vs prior')).toBeTruthy();
    expect(repsToggle.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(repsToggle);
    expect(repsToggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText(/toggle sets and reps/i)).toBeTruthy();
  });
});
