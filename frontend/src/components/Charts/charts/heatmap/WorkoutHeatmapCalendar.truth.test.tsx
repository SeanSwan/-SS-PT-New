import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import WorkoutHeatmapCalendar from './WorkoutHeatmapCalendar';

describe('WorkoutHeatmapCalendar production truth guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('does not render demo preview cells in production when no real data is provided', () => {
    vi.stubEnv('DEV', '');

    render(<WorkoutHeatmapCalendar />);

    expect(screen.queryByText(/preview/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/sessions/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no workout calendar data yet/i)).toBeInTheDocument();
  });
});
