import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SelectedClientTrainingHeader from './SelectedClientTrainingHeader';

const handlers = {
  onLogToday: vi.fn(),
  onPlanNext: vi.fn(),
  onViewProgress: vi.fn(),
  onDictateAI: vi.fn(),
};

describe('SelectedClientTrainingHeader', () => {
  it('uses fallback identity in the daily action strip when names are blank', () => {
    render(
      <SelectedClientTrainingHeader
        client={{
          id: 7,
          firstName: '',
          lastName: '',
          email: 'fallback.client@example.test',
          clientSource: 'swanstudios',
          availableSessions: 2,
          workoutCount: 5,
        }}
        {...handlers}
      />
    );

    expect(screen.getByLabelText(/fallback.client@example.test daily training actions/i)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: /fallback.client@example.test/i })).toHaveLength(2);
  });
});
