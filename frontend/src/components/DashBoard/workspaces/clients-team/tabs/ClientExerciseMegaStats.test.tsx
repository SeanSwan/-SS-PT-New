import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ClientExerciseMegaStats from './ClientExerciseMegaStats';

describe('ClientExerciseMegaStats', () => {
  it('renders every exercise ranked by most performed first', () => {
    render(
      <ClientExerciseMegaStats
        exercises={[
          { x: 'Pull Up', y: 4, sets: 12 },
          { x: 'Push Up', y: 18, sets: 54 },
          { x: 'Goblet Squat', y: 9, sets: 27 },
          { x: 'Pallof Press', y: 2, sets: 6 },
        ]}
      />
    );

    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText('Push Up')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Goblet Squat')).toBeInTheDocument();
    expect(within(rows[2]).getByText('Pull Up')).toBeInTheDocument();
    expect(within(rows[3]).getByText('Pallof Press')).toBeInTheDocument();
    expect(screen.getByText(/4 exercises tracked/i)).toBeInTheDocument();
  });

  it('renders an empty state when no exercise history exists', () => {
    render(<ClientExerciseMegaStats exercises={[]} />);

    expect(screen.getByText(/no exercise history yet/i)).toBeInTheDocument();
  });
});
